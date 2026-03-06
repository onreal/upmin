<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Security;

use Manage\Infrastructure\Config\Env;

final class PublicTokenService
{
    private string $secret;
    private int $ttlSeconds;

    public function __construct(Env $env, string $secretKey = 'PUBLIC_TOKEN_SECRET', int $ttlSeconds = 3600)
    {
        $secret = $env->get($secretKey);
        if ($secret === null || $secret === '') {
            throw new \RuntimeException('PUBLIC_TOKEN_SECRET is required.');
        }
        $this->secret = $secret;

        $ttl = $env->get('PUBLIC_TOKEN_TTL');
        if (is_string($ttl) && trim($ttl) !== '' && ctype_digit(trim($ttl))) {
            $ttlSeconds = (int) $ttl;
        }
        $this->ttlSeconds = $ttlSeconds;
    }

    public function issue(string $subject, ?string $role = null, ?int $ttlSeconds = null): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = [
            'sub' => $subject,
            'exp' => time() + ($ttlSeconds ?? $this->ttlSeconds),
        ];
        if ($role !== null && trim($role) !== '') {
            $payload['role'] = trim($role);
        }

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $this->secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /** @return array{sub:string,role?:string,exp:int}|null */
    public function verify(string $token): ?array
    {
        $parts = explode('.', $token);
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
        if (!is_array($payload) || !isset($payload['sub'], $payload['exp'])) {
            return null;
        }

        if ((int) $payload['exp'] < time()) {
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
