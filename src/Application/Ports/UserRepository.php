<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

use Manage\Domain\Auth\User;

interface UserRepository
{
    public function findByEmail(string $email): ?User;
}
