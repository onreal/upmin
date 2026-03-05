<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Realtime;

use Manage\Application\Ports\RealtimePublisher;

final class SocketRealtimePublisher implements RealtimePublisher
{
    private RealtimeConfig $config;

    public function __construct(RealtimeConfig $config)
    {
        $this->config = $config;
    }

    public function publishToIdentity(string $identity, array $event): void
    {
        $socket = @stream_socket_client(
            sprintf('tcp://%s:%d', $this->config->internalHost(), $this->config->internalPort()),
            $errno,
            $error,
            1.0
        );

        if (!is_resource($socket)) {
            throw new \RuntimeException('Unable to reach realtime server: ' . ($error ?: (string) $errno));
        }

        stream_set_timeout($socket, 1);

        $payload = json_encode([
            'secret' => $this->config->secret(),
            'identity' => $identity,
            'event' => $event,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        fwrite($socket, $payload . "\n");
        fclose($socket);
    }
}
