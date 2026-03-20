<?php

declare(strict_types=1);

namespace Manage\Domain\Auth;

final class AuthUsersDocument
{
    /** @var ManagedUser[] */
    private array $users;
    /** @var array<string, mixed> */
    private array $extraData;

    /**
     * @param ManagedUser[] $users
     * @param array<string, mixed> $extraData
     */
    public function __construct(array $users, array $extraData = [])
    {
        $this->users = $users;
        $this->extraData = $extraData;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $users = [];
        foreach (($data['users'] ?? []) as $userData) {
            if (!is_array($userData)) {
                continue;
            }
            $users[] = ManagedUser::fromArray($userData);
        }

        $extraData = $data;
        unset($extraData['users']);

        return new self($users, $extraData);
    }

    /** @return ManagedUser[] */
    public function users(): array
    {
        return $this->users;
    }

    public function findUserById(string $userId): ?ManagedUser
    {
        foreach ($this->users as $user) {
            if ($user->id()->value() === trim($userId)) {
                return $user;
            }
        }

        return null;
    }

    public function withUser(ManagedUser $nextUser): self
    {
        $users = $this->users;
        foreach ($users as $index => $user) {
            if ($user->id()->value() !== $nextUser->id()->value()) {
                continue;
            }
            $users[$index] = $nextUser;
            return new self($users, $this->extraData);
        }

        throw new \InvalidArgumentException('User not found in auth document.');
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            ...$this->extraData,
            'users' => array_map(
                static fn (ManagedUser $user): array => $user->toArray(),
                $this->users
            ),
        ];
    }
}
