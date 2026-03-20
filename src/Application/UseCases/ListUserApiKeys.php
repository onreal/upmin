<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Domain\Auth\UserApiKey;
use Manage\Infrastructure\Auth\AuthUserStore;

final class ListUserApiKeys
{
    private AuthUserStore $users;

    public function __construct(AuthUserStore $users)
    {
        $this->users = $users;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(string $userId): array
    {
        return array_map(
            static fn (UserApiKey $apiKey): array => [
                'id' => $apiKey->id(),
                'name' => $apiKey->name(),
                'keyPrefix' => $apiKey->keyPrefix(),
                'expiry' => $apiKey->expiry(),
                'createdAt' => $apiKey->createdAt(),
                'lastUsedAt' => $apiKey->lastUsedAt(),
            ],
            $this->users->listApiKeys($userId)
        );
    }
}
