<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Infrastructure\Auth\AuthUserStore;
use Manage\Infrastructure\Auth\DelegatedLoginGrantStore;

final class RequestDelegatedLoginGrant
{
    private AuthUserStore $users;
    private DelegatedLoginGrantStore $grants;

    public function __construct(AuthUserStore $users, DelegatedLoginGrantStore $grants)
    {
        $this->users = $users;
        $this->grants = $grants;
    }

    /** @return array<string, mixed>|null */
    public function handle(string $apiKey): ?array
    {
        $match = $this->users->findUserByApiKey($apiKey);
        if ($match === null) {
            return null;
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
        $this->users->touchApiKey($match['user']->id()->value(), $match['apiKey']->id(), $now);
        $grant = $this->grants->issue(
            $match['user']->id()->value(),
            $match['user']->email(),
            $match['apiKey']->id()
        );

        return [
            'grant' => $grant['grant'],
            'expiresAt' => $grant['expiresAt'],
        ];
    }
}
