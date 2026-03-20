<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Auth;

use Manage\Infrastructure\Config\Env;

final class UserApiKeyHasher
{
    private string $secret;

    public function __construct(Env $env, string $primarySecret = 'USER_API_KEY_SECRET', string $fallbackSecret = 'TOKEN_SECRET')
    {
        $secret = $env->get($primarySecret);
        if ($secret === null || $secret === '') {
            $secret = $env->get($fallbackSecret);
        }
        if ($secret === null || $secret === '') {
            throw new \RuntimeException('USER_API_KEY_SECRET or TOKEN_SECRET is required.');
        }

        $this->secret = $secret;
    }

    public function hash(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            throw new \InvalidArgumentException('Secret value cannot be empty.');
        }

        return hash_hmac('sha256', $trimmed, $this->secret);
    }

    public function verify(string $plain, string $hash): bool
    {
        $trimmedHash = trim($hash);
        if ($trimmedHash === '') {
            return false;
        }

        return hash_equals($trimmedHash, $this->hash($plain));
    }
}
