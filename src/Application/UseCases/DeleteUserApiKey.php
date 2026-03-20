<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Infrastructure\Auth\AuthUserStore;

final class DeleteUserApiKey
{
    private AuthUserStore $users;

    public function __construct(AuthUserStore $users)
    {
        $this->users = $users;
    }

    public function handle(string $userId, string $apiKeyId): void
    {
        $this->users->deleteApiKey($userId, $apiKeyId);
    }
}
