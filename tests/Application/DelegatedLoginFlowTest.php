<?php

declare(strict_types=1);

use Manage\Application\UseCases\CreateUserApiKey;
use Manage\Application\UseCases\ExchangeDelegatedLoginGrant;
use Manage\Application\UseCases\RequestDelegatedLoginGrant;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Infrastructure\Auth\AuthUserStore;
use Manage\Infrastructure\Auth\DelegatedLoginGrantStore;
use Manage\Infrastructure\Auth\UserApiKeyHasher;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\Security\HmacTokenService;
use PHPUnit\Framework\TestCase;

final class DelegatedLoginFlowTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = rtrim(sys_get_temp_dir(), '/') . '/delegated-login-test-' . bin2hex(random_bytes(6));
        mkdir($this->root . '/manage/store/system', 0755, true);
        mkdir($this->root . '/public-store', 0755, true);
        file_put_contents($this->root . '/manage/.env', "TOKEN_SECRET=test-token-secret\nUSER_API_KEY_SECRET=test-user-api-key-secret\n");
        $this->seedAuthDocument();
    }

    protected function tearDown(): void
    {
        $this->deletePath($this->root);
        parent::tearDown();
    }

    public function testCreateApiKeyStoresHashInsteadOfRawValue(): void
    {
        $create = new CreateUserApiKey($this->authUserStore(), $this->hasher());

        $created = $create->handle('user-1', 'External SSO', '2030-01-01T00:00:00+00:00');

        $this->assertArrayHasKey('key', $created);
        $this->assertStringStartsWith('uak_', $created['key']);

        $saved = json_decode((string) file_get_contents($this->root . '/manage/store/auth.json'), true, 512, JSON_THROW_ON_ERROR);
        $apiKeys = $saved['data']['users'][0]['apiKeys'] ?? [];

        $this->assertCount(1, $apiKeys);
        $this->assertNotSame($created['key'], $apiKeys[0]['keyHash']);
        $this->assertSame(substr($created['key'], 0, 12), $apiKeys[0]['keyPrefix']);
    }

    public function testDelegatedLoginGrantExchangesOnlyOnce(): void
    {
        $store = $this->authUserStore();
        $create = new CreateUserApiKey($store, $this->hasher());
        $created = $create->handle('user-1', 'External SSO', '2030-01-01T00:00:00+00:00');

        $grants = new DelegatedLoginGrantStore($this->root . '/manage', $this->hasher(), 120);
        $request = new RequestDelegatedLoginGrant($store, $grants);
        $exchange = new ExchangeDelegatedLoginGrant($grants, $store, $this->tokenService());

        $grant = $request->handle($created['key']);

        $this->assertNotNull($grant);
        $this->assertArrayHasKey('grant', $grant);

        $result = $exchange->handle($grant['grant']);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('token', $result);
        $this->assertSame('user-1', $result['user']['id']);
        $this->assertNull($exchange->handle($grant['grant']));

        $saved = json_decode((string) file_get_contents($this->root . '/manage/store/auth.json'), true, 512, JSON_THROW_ON_ERROR);
        $lastUsedAt = $saved['data']['users'][0]['apiKeys'][0]['lastUsedAt'] ?? null;
        $this->assertIsString($lastUsedAt);
        $this->assertNotSame('', trim((string) $lastUsedAt));
    }

    private function seedAuthDocument(): void
    {
        $repository = $this->repository();
        $document = new Document(
            DocumentId::fromParts('private', 'auth.json'),
            DocumentWrapper::fromArray([
                'type' => 'page',
                'id' => 'f11b7437-72c8-4461-935c-d1ce34ceb7d2',
                'page' => 'auth',
                'name' => 'Auth',
                'order' => 1,
                'section' => false,
                'position' => 'system',
                'data' => [
                    'users' => [[
                        'uuid' => 'user-1',
                        'firstname' => 'Test',
                        'lastname' => 'User',
                        'email' => 'test@example.com',
                        'password' => '$2y$10$abcdefghijklmnopqrstuv',
                        'roles' => ['admin'],
                    ]],
                ],
            ]),
            'private',
            'auth.json'
        );

        $repository->save($document);
    }

    private function repository(): JsonDocumentRepository
    {
        return new JsonDocumentRepository([
            'private' => $this->root . '/manage/store',
            'public' => $this->root . '/public-store',
        ]);
    }

    private function env(): Env
    {
        return Env::load($this->root . '/manage/.env');
    }

    private function hasher(): UserApiKeyHasher
    {
        return new UserApiKeyHasher($this->env());
    }

    private function authUserStore(): AuthUserStore
    {
        return new AuthUserStore($this->repository(), $this->hasher());
    }

    private function tokenService(): HmacTokenService
    {
        return new HmacTokenService($this->env());
    }

    private function deletePath(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);
            return;
        }
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if (is_array($items)) {
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->deletePath($path . '/' . $item);
            }
        }

        @rmdir($path);
    }
}
