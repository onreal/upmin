<?php

declare(strict_types=1);

namespace Manage\Infrastructure\FileSystem;

use Manage\Application\Ports\UserRepository;
use Manage\Domain\Auth\User;
use Manage\Domain\Auth\UserId;
use Manage\Domain\Document\DocumentWrapper;

final class JsonUserRepository implements UserRepository
{
    private string $authFile;

    public function __construct(string $authFile)
    {
        $this->authFile = $authFile;
    }

    public function findByEmail(string $email): ?User
    {
        $users = $this->loadUsers();

        foreach ($users as $user) {
            if (strcasecmp($user->email(), $email) === 0) {
                return $user;
            }
        }

        return null;
    }

    /** @return User[] */
    private function loadUsers(): array
    {
        if (!is_file($this->authFile)) {
            return [];
        }

        $raw = file_get_contents($this->authFile);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        try {
            $wrapper = DocumentWrapper::fromArray($decoded);
        } catch (\InvalidArgumentException $exception) {
            return [];
        }

        $data = $wrapper->data();
        if (!is_array($data) || !isset($data['users']) || !is_array($data['users'])) {
            return [];
        }

        $users = [];
        foreach ($data['users'] as $userData) {
            if (!is_array($userData)) {
                continue;
            }
            $uuid = (string) ($userData['uuid'] ?? '');
            $email = (string) ($userData['email'] ?? '');
            $password = (string) ($userData['password'] ?? '');
            if ($uuid === '' || $email === '' || $password === '') {
                continue;
            }

            $users[] = new User(
                UserId::fromString($uuid),
                (string) ($userData['firstname'] ?? ''),
                (string) ($userData['lastname'] ?? ''),
                $email,
                $password,
                $this->extractAttributes($userData)
            );
        }

        return $users;
    }

    private function extractAttributes(array $userData): array
    {
        $attributes = $userData;
        unset($attributes['uuid'], $attributes['firstname'], $attributes['lastname'], $attributes['email'], $attributes['password']);
        return $attributes;
    }
}
