<?php

declare(strict_types=1);

use Manage\Application\Ports\PasswordHasher;
use Manage\Application\Ports\TokenService;
use Manage\Application\Ports\UserRepository;
use Manage\Application\UseCases\AuthenticateUser;
use Manage\Domain\Auth\User;
use Manage\Domain\Auth\UserId;
use PHPUnit\Framework\TestCase;

final class AuthenticateUserTest extends TestCase
{
    public function testRejectsInvalidPassword(): void
    {
        $user = new User(UserId::fromString('abc'), 'Test', 'User', 'test@example.com', 'secret');

        $repo = new class($user) implements UserRepository {
            private User $user;
            public function __construct(User $user) { $this->user = $user; }
            public function findByEmail(string $email): ?User { return $this->user; }
        };

        $hasher = new class() implements PasswordHasher {
            public function verify(string $plain, string $hash): bool { return $plain === $hash; }
        };

        $tokens = new class() implements TokenService {
            public function issue(User $user): string { return 'token'; }
            public function verify(string $token): ?array { return null; }
        };

        $useCase = new AuthenticateUser($repo, $hasher, $tokens);
        $this->assertNull($useCase->handle('test@example.com', 'wrong'));
        $this->assertSame('token', $useCase->handle('test@example.com', 'secret')['token']);
    }
}
