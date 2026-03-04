<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Security;

use Manage\Application\Ports\PasswordHasher;

final class BcryptPasswordHasher implements PasswordHasher
{
    public function verify(string $plain, string $hash): bool
    {
        if (str_starts_with($hash, '$2') || str_starts_with($hash, '$argon2')) {
            return password_verify($plain, $hash);
        }

        return hash_equals($hash, $plain);
    }
}
