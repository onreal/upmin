<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\PasswordHasher;
use Manage\Application\Ports\TokenService;
use Manage\Application\Ports\UserRepository;

final class AuthenticateUser
{
    private UserRepository $users;
    private PasswordHasher $hasher;
    private TokenService $tokens;

    public function __construct(UserRepository $users, PasswordHasher $hasher, TokenService $tokens)
    {
        $this->users = $users;
        $this->hasher = $hasher;
        $this->tokens = $tokens;
    }

    public function handle(string $email, string $password): ?array
    {
        $user = $this->users->findByEmail($email);
        if ($user === null) {
            return null;
        }

        if (!$this->hasher->verify($password, $user->passwordHash())) {
            return null;
        }

        return [
            'token' => $this->tokens->issue($user),
            'user' => [
                'id' => $user->id()->value(),
                'firstname' => $user->firstname(),
                'lastname' => $user->lastname(),
                'email' => $user->email(),
                'attributes' => $user->attributes(),
            ],
        ];
    }
}
