<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Security;

use Manage\Application\Ports\TokenService;
use Manage\Domain\Auth\User;
use Manage\Infrastructure\Config\Env;

final class HmacTokenService implements TokenService
{
    private string $secret;
    private int $ttlSeconds;

    public function __construct(Env $env, string $secretKey = 'TOKEN_SECRET', int $ttlSeconds = 43200)
    {
        $secret = $env->get($secretKey);
        if ($secret === null || $secret === '') {
            throw new \RuntimeException('TOKEN_SECRET is required.');
        }
        $this->secret = $secret;
        $this->ttlSeconds = $ttlSeconds;
    }

    public function issue(User $user): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = [
            'sub' => $user->id()->value(),
            'email' => $user->email(),
            'exp' => time() + $this->ttlSeconds,
        ];

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $this->secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

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
        if (!is_array($payload) || !isset($payload['sub'], $payload['email'], $payload['exp'])) {
            return null;
        }

        if ((int) $payload['exp'] < time()) {
            return null;
        }

        return [
            'userId' => (string) $payload['sub'],
            'email' => (string) $payload['email'],
        ];
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
