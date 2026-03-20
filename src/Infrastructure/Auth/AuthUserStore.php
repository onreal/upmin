<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Auth;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Auth\AuthUsersDocument;
use Manage\Domain\Auth\ManagedUser;
use Manage\Domain\Auth\UserApiKey;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;

final class AuthUserStore
{
    private DocumentRepository $documents;
    private UserApiKeyHasher $hasher;

    public function __construct(DocumentRepository $documents, UserApiKeyHasher $hasher)
    {
        $this->documents = $documents;
        $this->hasher = $hasher;
    }

    public function findUserById(string $userId): ?ManagedUser
    {
        [, $authUsers] = $this->load();
        return $authUsers->findUserById($userId);
    }

    /** @return UserApiKey[] */
    public function listApiKeys(string $userId): array
    {
        $user = $this->findUserById($userId);
        if ($user === null) {
            throw new \InvalidArgumentException('User not found.');
        }

        return $user->apiKeys();
    }

    public function createApiKey(string $userId, UserApiKey $apiKey): void
    {
        [$document, $authUsers] = $this->load();
        $user = $authUsers->findUserById($userId);
        if ($user === null) {
            throw new \InvalidArgumentException('User not found.');
        }

        $updatedUser = $user->withApiKeys([...$user->apiKeys(), $apiKey]);
        $this->save($document, $authUsers->withUser($updatedUser));
    }

    public function deleteApiKey(string $userId, string $apiKeyId): void
    {
        [$document, $authUsers] = $this->load();
        $user = $authUsers->findUserById($userId);
        if ($user === null) {
            throw new \InvalidArgumentException('User not found.');
        }

        $remaining = array_values(array_filter(
            $user->apiKeys(),
            static fn (UserApiKey $apiKey): bool => $apiKey->id() !== trim($apiKeyId)
        ));

        if (count($remaining) === count($user->apiKeys())) {
            throw new \InvalidArgumentException('API key not found.');
        }

        $this->save($document, $authUsers->withUser($user->withApiKeys($remaining)));
    }

    /** @return array{user: ManagedUser, apiKey: UserApiKey}|null */
    public function findUserByApiKey(string $rawKey): ?array
    {
        [, $authUsers] = $this->load();
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        foreach ($authUsers->users() as $user) {
            foreach ($user->apiKeys() as $apiKey) {
                if ($apiKey->isExpired($now)) {
                    continue;
                }
                if ($this->hasher->verify($rawKey, $apiKey->keyHash())) {
                    return ['user' => $user, 'apiKey' => $apiKey];
                }
            }
        }

        return null;
    }

    public function touchApiKey(string $userId, string $apiKeyId, string $lastUsedAt): void
    {
        [$document, $authUsers] = $this->load();
        $user = $authUsers->findUserById($userId);
        if ($user === null) {
            throw new \InvalidArgumentException('User not found.');
        }

        $updated = [];
        $matched = false;
        foreach ($user->apiKeys() as $apiKey) {
            if ($apiKey->id() === trim($apiKeyId)) {
                $updated[] = $apiKey->withLastUsedAt($lastUsedAt);
                $matched = true;
                continue;
            }
            $updated[] = $apiKey;
        }

        if (!$matched) {
            throw new \InvalidArgumentException('API key not found.');
        }

        $this->save($document, $authUsers->withUser($user->withApiKeys($updated)));
    }

    /** @return array{0: Document, 1: AuthUsersDocument} */
    private function load(): array
    {
        $document = $this->documents->get(DocumentId::fromParts('private', 'auth.json'));
        if ($document === null) {
            throw new \RuntimeException('auth.json was not found.');
        }

        $data = $document->wrapper()->data();
        if (!is_array($data)) {
            throw new \RuntimeException('auth.json does not contain users.');
        }

        return [$document, AuthUsersDocument::fromArray($data)];
    }

    private function save(Document $document, AuthUsersDocument $authUsers): void
    {
        $this->documents->save(
            $document->withWrapper(
                $document->wrapper()->withData($authUsers->toArray())
            )
        );
    }
}
