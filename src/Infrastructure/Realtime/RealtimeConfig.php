<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Realtime;

use Manage\Infrastructure\Config\Env;

final class RealtimeConfig
{
    private Env $env;

    public function __construct(Env $env)
    {
        $this->env = $env;
    }

    public function publicUrl(?string $host = null, bool $secure = false): string
    {
        $configured = trim((string) ($this->env->get('REALTIME_PUBLIC_URL') ?? ''));
        if ($configured !== '') {
            return $configured;
        }

        $resolvedHost = trim((string) $host);
        if ($resolvedHost === '') {
            $resolvedHost = 'localhost';
        }

        $scheme = $secure ? 'wss' : 'ws';

        return sprintf('%s://%s:%d/ws', $scheme, $resolvedHost, $this->publicPort());
    }

    public function publicPort(): int
    {
        return $this->intValue('REALTIME_PORT', 8384);
    }

    public function internalHost(): string
    {
        $host = trim((string) ($this->env->get('REALTIME_INTERNAL_HOST') ?? ''));

        return $host !== '' ? $host : '127.0.0.1';
    }

    public function internalPort(): int
    {
        return $this->intValue('REALTIME_INTERNAL_PORT', 8385);
    }

    public function secret(): string
    {
        $secret = trim((string) ($this->env->get('REALTIME_SECRET') ?? ''));
        if ($secret !== '') {
            return $secret;
        }

        $fallback = trim((string) ($this->env->get('TOKEN_SECRET') ?? ''));
        if ($fallback === '') {
            throw new \RuntimeException('REALTIME_SECRET or TOKEN_SECRET is required.');
        }

        return $fallback;
    }

    /** @return string[] */
    public function allowedOrigins(): array
    {
        $configured = trim((string) ($this->env->get('REALTIME_ALLOWED_ORIGINS') ?? ''));
        if ($configured === '') {
            return ['http://localhost:8383', 'http://127.0.0.1:8383'];
        }

        $origins = array_filter(array_map(
            static fn (string $origin): string => rtrim(trim($origin), '/'),
            explode(',', $configured)
        ));

        return array_values(array_unique($origins));
    }

    public function ticketTtl(): int
    {
        return $this->intValue('REALTIME_TICKET_TTL', 300);
    }

    private function intValue(string $key, int $default): int
    {
        $raw = $this->env->get($key);
        if ($raw === null || trim($raw) === '') {
            return $default;
        }

        $value = (int) $raw;

        return $value > 0 ? $value : $default;
    }
}
