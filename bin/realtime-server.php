<?php

declare(strict_types=1);

use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\RealtimeTicketService;
use Manage\Infrastructure\Realtime\WebSocketHub;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Factory;
use React\Socket\ConnectionInterface as ReactConnectionInterface;
use React\Socket\SocketServer;

require dirname(__DIR__) . '/bootstrap.php';

$manageRoot = dirname(__DIR__);
$env = Env::load($manageRoot . '/.env');
$config = new RealtimeConfig($env);
$tickets = new RealtimeTicketService($config->secret());
$hub = new WebSocketHub($tickets, $config->allowedOrigins());

$loop = Factory::create();
$webSocket = new SocketServer('0.0.0.0:' . $config->publicPort(), [], $loop);
$wsServer = new WsServer($hub);
$wsServer->enableKeepAlive($loop, 30);
new IoServer(new HttpServer($wsServer), $webSocket, $loop);

$publisherSocket = new SocketServer('0.0.0.0:' . $config->internalPort(), [], $loop);
$publisherSocket->on('connection', static function (ReactConnectionInterface $connection) use ($hub, $config): void {
    $buffer = '';

    $connection->on('data', static function (string $chunk) use (&$buffer, $connection, $hub, $config): void {
        $buffer .= $chunk;

        while (($position = strpos($buffer, "\n")) !== false) {
            $line = trim(substr($buffer, 0, $position));
            $buffer = substr($buffer, $position + 1);

            if ($line === '') {
                continue;
            }

            try {
                $payload = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                $connection->end();
                return;
            }

            if (!is_array($payload) || ($payload['secret'] ?? null) !== $config->secret()) {
                $connection->end();
                return;
            }

            $identity = $payload['identity'] ?? null;
            $event = $payload['event'] ?? null;
            if (!is_string($identity) || trim($identity) === '' || !is_array($event)) {
                $connection->end();
                return;
            }

            $hub->publishToIdentity(trim($identity), $event);
        }
    });
});

$loop->run();
