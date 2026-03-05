<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Realtime;

use Psr\Http\Message\RequestInterface;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;

final class WebSocketHub implements MessageComponentInterface
{
    private const SOCKET_PATH = '/ws';

    private RealtimeTicketService $tickets;
    /** @var string[] */
    private array $allowedOrigins;
    /** @var array<string, \SplObjectStorage<int, ConnectionInterface>> */
    private array $connectionsByIdentity = [];

    public function __construct(RealtimeTicketService $tickets, array $allowedOrigins)
    {
        $this->tickets = $tickets;
        $this->allowedOrigins = array_values(array_unique(array_filter(array_map(
            static fn (string $origin): string => rtrim(trim($origin), '/'),
            $allowedOrigins
        ))));
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $request = $conn->httpRequest ?? null;
        if (!$request instanceof RequestInterface) {
            $conn->close();
            return;
        }

        if (!$this->pathAllowed($request)) {
            $conn->close();
            return;
        }

        if (!$this->originAllowed($request)) {
            $conn->close();
            return;
        }

        parse_str($request->getUri()->getQuery(), $query);
        $ticket = isset($query['ticket']) && is_string($query['ticket']) ? trim($query['ticket']) : '';
        $claims = $ticket !== '' ? $this->tickets->verify($ticket) : null;
        if ($claims === null) {
            $conn->close();
            return;
        }

        $identity = trim((string) $claims['sub']);
        if ($identity === '') {
            $conn->close();
            return;
        }

        $conn->realtimeIdentity = $identity;

        if (!isset($this->connectionsByIdentity[$identity])) {
            $this->connectionsByIdentity[$identity] = new \SplObjectStorage();
        }

        $this->connectionsByIdentity[$identity]->attach($conn);
        $conn->send(json_encode(['type' => 'realtime.ready'], JSON_THROW_ON_ERROR));
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        unset($msg);
        $from->close();
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $identity = isset($conn->realtimeIdentity) && is_string($conn->realtimeIdentity)
            ? $conn->realtimeIdentity
            : null;

        if ($identity === null || !isset($this->connectionsByIdentity[$identity])) {
            return;
        }

        $this->connectionsByIdentity[$identity]->detach($conn);
        if (count($this->connectionsByIdentity[$identity]) === 0) {
            unset($this->connectionsByIdentity[$identity]);
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        unset($e);
        $this->onClose($conn);
        $conn->close();
    }

    /** @param array<string, mixed> $event */
    public function publishToIdentity(string $identity, array $event): void
    {
        $connections = $this->connectionsByIdentity[$identity] ?? null;
        if (!$connections instanceof \SplObjectStorage) {
            return;
        }

        $payload = json_encode($event, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        foreach ($connections as $connection) {
            try {
                $connection->send($payload);
            } catch (\Throwable) {
                $this->onClose($connection);
                $connection->close();
            }
        }
    }

    private function originAllowed(RequestInterface $request): bool
    {
        if ($this->allowedOrigins === []) {
            return true;
        }

        $origin = $request->getHeader('Origin')[0] ?? '';
        if (!is_string($origin) || trim($origin) === '') {
            return false;
        }

        return in_array(rtrim(trim($origin), '/'), $this->allowedOrigins, true);
    }

    private function pathAllowed(RequestInterface $request): bool
    {
        $path = trim($request->getUri()->getPath());

        return $path === self::SOCKET_PATH;
    }
}
