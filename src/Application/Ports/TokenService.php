<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

use Manage\Domain\Auth\User;

interface TokenService
{
    public function issue(User $user): string;

    /** @return array{userId:string,email:string}|null */
    public function verify(string $token): ?array;
}
