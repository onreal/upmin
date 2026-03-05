<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Realtime;

final class RealtimeTicketService
{
    private string $secret;

    public function __construct(string $secret)
    {
        if (trim($secret) === '') {
            throw new \InvalidArgumentException('Realtime secret is required.');
        }

        $this->secret = $secret;
    }

    /** @param array<string, mixed> $claims */
    public function issue(array $claims, int $ttlSeconds): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'RTK'];
        $payload = $claims;
        $payload['type'] = 'realtime-ticket';
        $payload['exp'] = time() + max(1, $ttlSeconds);

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $this->secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /** @return array<string, mixed>|null */
    public function verify(string $ticket): ?array
    {
        $parts = explode('.', $ticket);
        if (count($parts) !== 3) {
            return null;
        }

        [$header64, $payload64, $signature64] = $parts;
        $expected = self::base64UrlEncode(hash_hmac('sha256', $header64 . '.' . $payload64, $this->secret, true));
        if (!hash_equals($expected, $signature64)) {
            return null;
        }

        $payloadJson = self::base64UrlDecode($payload64);
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            return null;
        }
        if (($payload['type'] ?? null) !== 'realtime-ticket') {
            return null;
        }
        if (!isset($payload['sub']) || !is_string($payload['sub']) || trim($payload['sub']) === '') {
            return null;
        }
        if (!isset($payload['exp']) || (int) $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        return (string) base64_decode(strtr($value, '-_', '+/'));
    }
}
