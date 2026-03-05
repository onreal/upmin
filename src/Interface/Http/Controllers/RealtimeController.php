<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\Ports\TokenService;
use Manage\Application\UseCases\AuthenticateApiKey;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\RealtimeIdentity;
use Manage\Infrastructure\Realtime\RealtimeTicketService;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class RealtimeController
{
    private AuthenticateApiKey $apiKeys;
    private TokenService $tokens;
    private RealtimeTicketService $tickets;
    private RealtimeConfig $config;

    public function __construct(
        AuthenticateApiKey $apiKeys,
        TokenService $tokens,
        RealtimeTicketService $tickets,
        RealtimeConfig $config
    )
    {
        $this->apiKeys = $apiKeys;
        $this->tokens = $tokens;
        $this->tickets = $tickets;
        $this->config = $config;
    }

    public function ticket(Request $request): Response
    {
        $identity = $this->resolveIdentity($request);
        if ($identity === null) {
            return Response::json(['error' => 'Unauthorized'], 401);
        }

        $ttl = $this->config->ticketTtl();
        $ticket = $this->tickets->issue([
            'sub' => $identity,
        ], $ttl);

        return Response::json([
            'url' => $this->config->publicUrl($this->requestHost(), $this->requestIsSecure()),
            'ticket' => $ticket,
            'expiresAt' => (new \DateTimeImmutable('+' . $ttl . ' seconds'))->format(DATE_ATOM),
        ]);
    }

    private function resolveIdentity(Request $request): ?string
    {
        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            $payload = $this->tokens->verify($token);
            if (is_array($payload) && isset($payload['userId'])) {
                return RealtimeIdentity::fromUserId((string) $payload['userId']);
            }
        }

        $apiKey = $request->header('X-API-KEY');
        if ($this->apiKeys->handle($apiKey)) {
            return RealtimeIdentity::fromUserId('api-key');
        }

        return null;
    }

    private function requestHost(): string
    {
        $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
        if ($host === '') {
            return 'localhost';
        }

        $parts = explode(':', $host);

        return trim($parts[0]) !== '' ? trim($parts[0]) : 'localhost';
    }

    private function requestIsSecure(): bool
    {
        $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
        if ($https === 'on' || $https === '1') {
            return true;
        }

        $forwarded = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));

        return $forwarded === 'https';
    }
}
