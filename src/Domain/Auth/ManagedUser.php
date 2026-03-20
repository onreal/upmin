<?php

declare(strict_types=1);

namespace Manage\Domain\Auth;

final class ManagedUser
{
    private UserId $id;
    private string $firstname;
    private string $lastname;
    private string $email;
    private string $passwordHash;
    /** @var array<string, mixed> */
    private array $attributes;
    /** @var UserApiKey[] */
    private array $apiKeys;

    /**
     * @param array<string, mixed> $attributes
     * @param UserApiKey[] $apiKeys
     */
    public function __construct(
        UserId $id,
        string $firstname,
        string $lastname,
        string $email,
        string $passwordHash,
        array $attributes = [],
        array $apiKeys = []
    ) {
        $this->id = $id;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->email = $email;
        $this->passwordHash = $passwordHash;
        $this->attributes = $attributes;
        $this->apiKeys = $apiKeys;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $uuid = (string) ($data['uuid'] ?? $data['id'] ?? '');
        $email = (string) ($data['email'] ?? '');
        $password = (string) ($data['password'] ?? '');
        if ($uuid === '' || $email === '' || $password === '') {
            throw new \InvalidArgumentException('Managed user is invalid.');
        }

        $attributes = $data;
        unset($attributes['uuid'], $attributes['id'], $attributes['firstname'], $attributes['lastname'], $attributes['email'], $attributes['password'], $attributes['apiKeys']);

        $apiKeys = [];
        foreach (($data['apiKeys'] ?? []) as $keyData) {
            if (!is_array($keyData)) {
                continue;
            }
            $apiKeys[] = UserApiKey::fromArray($keyData);
        }

        return new self(
            UserId::fromString($uuid),
            (string) ($data['firstname'] ?? ''),
            (string) ($data['lastname'] ?? ''),
            $email,
            $password,
            $attributes,
            $apiKeys
        );
    }

    public function id(): UserId
    {
        return $this->id;
    }

    public function email(): string
    {
        return $this->email;
    }

    public function firstname(): string
    {
        return $this->firstname;
    }

    public function lastname(): string
    {
        return $this->lastname;
    }

    public function passwordHash(): string
    {
        return $this->passwordHash;
    }

    /** @return array<string, mixed> */
    public function attributes(): array
    {
        return $this->attributes;
    }

    /** @return UserApiKey[] */
    public function apiKeys(): array
    {
        return $this->apiKeys;
    }

    /** @param UserApiKey[] $apiKeys */
    public function withApiKeys(array $apiKeys): self
    {
        return new self(
            $this->id,
            $this->firstname,
            $this->lastname,
            $this->email,
            $this->passwordHash,
            $this->attributes,
            $apiKeys
        );
    }

    public function toUser(): User
    {
        return new User(
            $this->id,
            $this->firstname,
            $this->lastname,
            $this->email,
            $this->passwordHash,
            $this->attributes
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            ...$this->attributes,
            'uuid' => $this->id->value(),
            'firstname' => $this->firstname,
            'lastname' => $this->lastname,
            'email' => $this->email,
            'password' => $this->passwordHash,
            'apiKeys' => array_map(
                static fn (UserApiKey $apiKey): array => $apiKey->toArray(),
                $this->apiKeys
            ),
        ];
    }
}
