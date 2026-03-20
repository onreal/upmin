<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\TokenService;
use Manage\Infrastructure\Auth\AuthUserStore;
use Manage\Infrastructure\Auth\DelegatedLoginGrantStore;

final class ExchangeDelegatedLoginGrant
{
    private DelegatedLoginGrantStore $grants;
    private AuthUserStore $users;
    private TokenService $tokens;

    public function __construct(DelegatedLoginGrantStore $grants, AuthUserStore $users, TokenService $tokens)
    {
        $this->grants = $grants;
        $this->users = $users;
        $this->tokens = $tokens;
    }

    /** @return array<string, mixed>|null */
    public function handle(string $grant): ?array
    {
        $payload = $this->grants->consume($grant);
        if ($payload === null) {
            return null;
        }

        $user = $this->users->findUserById($payload['userId']);
        if ($user === null || strcasecmp($user->email(), $payload['email']) !== 0) {
            return null;
        }

        $tokenUser = $user->toUser();

        return [
            'token' => $this->tokens->issue($tokenUser),
            'user' => [
                'id' => $tokenUser->id()->value(),
                'firstname' => $tokenUser->firstname(),
                'lastname' => $tokenUser->lastname(),
                'email' => $tokenUser->email(),
                'attributes' => $tokenUser->attributes(),
            ],
        ];
    }
}
