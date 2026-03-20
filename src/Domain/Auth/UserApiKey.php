<?php

declare(strict_types=1);

namespace Manage\Domain\Auth;

final class UserApiKey
{
    private string $id;
    private string $name;
    private string $keyHash;
    private string $keyPrefix;
    private ?string $expiry;
    private string $createdAt;
    private ?string $lastUsedAt;

    public function __construct(
        string $id,
        string $name,
        string $keyHash,
        string $keyPrefix,
        ?string $expiry,
        string $createdAt,
        ?string $lastUsedAt = null
    ) {
        $this->id = trim($id);
        $this->name = trim($name);
        $this->keyHash = trim($keyHash);
        $this->keyPrefix = trim($keyPrefix);
        $this->expiry = $expiry !== null && trim($expiry) !== '' ? trim($expiry) : null;
        $this->createdAt = trim($createdAt);
        $this->lastUsedAt = $lastUsedAt !== null && trim($lastUsedAt) !== '' ? trim($lastUsedAt) : null;

        if ($this->id === '' || $this->name === '' || $this->keyHash === '' || $this->keyPrefix === '' || $this->createdAt === '') {
            throw new \InvalidArgumentException('User API key is invalid.');
        }
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $expiry = $data['expiry'] ?? $data['expiresAt'] ?? null;

        return new self(
            (string) ($data['id'] ?? ''),
            (string) ($data['name'] ?? ''),
            (string) ($data['keyHash'] ?? $data['key'] ?? ''),
            (string) ($data['keyPrefix'] ?? $data['prefix'] ?? ''),
            is_string($expiry) ? $expiry : null,
            (string) ($data['createdAt'] ?? ''),
            is_string($data['lastUsedAt'] ?? null) ? (string) $data['lastUsedAt'] : null
        );
    }

    public function id(): string
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function keyHash(): string
    {
        return $this->keyHash;
    }

    public function keyPrefix(): string
    {
        return $this->keyPrefix;
    }

    public function expiry(): ?string
    {
        return $this->expiry;
    }

    public function createdAt(): string
    {
        return $this->createdAt;
    }

    public function lastUsedAt(): ?string
    {
        return $this->lastUsedAt;
    }

    public function isExpired(?\DateTimeImmutable $now = null): bool
    {
        if ($this->expiry === null) {
            return false;
        }

        try {
            $expiry = new \DateTimeImmutable($this->expiry);
        } catch (\Exception $exception) {
            return true;
        }

        return $expiry < ($now ?? new \DateTimeImmutable('now', new \DateTimeZone('UTC')));
    }

    public function withLastUsedAt(?string $lastUsedAt): self
    {
        return new self(
            $this->id,
            $this->name,
            $this->keyHash,
            $this->keyPrefix,
            $this->expiry,
            $this->createdAt,
            $lastUsedAt
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'keyHash' => $this->keyHash,
            'keyPrefix' => $this->keyPrefix,
            'createdAt' => $this->createdAt,
        ];

        if ($this->expiry !== null) {
            $data['expiry'] = $this->expiry;
        }
        if ($this->lastUsedAt !== null) {
            $data['lastUsedAt'] = $this->lastUsedAt;
        }

        return $data;
    }
}
