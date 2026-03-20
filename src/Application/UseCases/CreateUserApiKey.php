<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Domain\Auth\UserApiKey;
use Manage\Infrastructure\Auth\AuthUserStore;
use Manage\Infrastructure\Auth\UserApiKeyHasher;

final class CreateUserApiKey
{
    private AuthUserStore $users;
    private UserApiKeyHasher $hasher;

    public function __construct(AuthUserStore $users, UserApiKeyHasher $hasher)
    {
        $this->users = $users;
        $this->hasher = $hasher;
    }

    /** @return array<string, mixed> */
    public function handle(string $userId, string $name, string $expiry): array
    {
        $trimmedName = trim($name);
        $trimmedExpiry = trim($expiry);
        if ($trimmedName === '') {
            throw new \InvalidArgumentException('API key name is required.');
        }
        if ($trimmedExpiry === '') {
            throw new \InvalidArgumentException('API key expiry is required.');
        }

        try {
            $expiresAt = new \DateTimeImmutable($trimmedExpiry);
        } catch (\Exception $exception) {
            throw new \InvalidArgumentException('API key expiry is invalid.');
        }

        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        if ($expiresAt <= $now) {
            throw new \InvalidArgumentException('API key expiry must be in the future.');
        }

        $rawKey = 'uak_' . bin2hex(random_bytes(24));
        $prefix = substr($rawKey, 0, 12);
        $apiKey = new UserApiKey(
            $this->uuidV4(),
            $trimmedName,
            $this->hasher->hash($rawKey),
            $prefix,
            $expiresAt->format(DATE_ATOM),
            $now->format(DATE_ATOM)
        );

        $this->users->createApiKey($userId, $apiKey);

        return [
            'id' => $apiKey->id(),
            'name' => $apiKey->name(),
            'keyPrefix' => $apiKey->keyPrefix(),
            'expiry' => $apiKey->expiry(),
            'createdAt' => $apiKey->createdAt(),
            'lastUsedAt' => null,
            'key' => $rawKey,
        ];
    }

    private function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
