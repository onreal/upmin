<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

interface PasswordHasher
{
    public function verify(string $plain, string $hash): bool;
}
