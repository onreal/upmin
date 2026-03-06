<?php

declare(strict_types=1);

use Manage\Application\UseCases\SyncIntegrationModels;
use Manage\Application\UseCases\UpsertIntegrationSettings;
use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationSettingsStore;
use PHPUnit\Framework\TestCase;

final class IntegrationSettingsTest extends TestCase
{
    public function testUpsertStoresRequiredFields(): void
    {
        $definition = $this->definition('openai');
        $catalog = $this->catalog($definition, null);
        $settings = $this->settingsStore();

        $useCase = new UpsertIntegrationSettings($catalog, $settings);
        $result = $useCase->handle('openai', ['apiKey' => 'secret']);

        $this->assertSame('secret', $result['apiKey']);
        $this->assertSame([], $result['models']);
        $this->assertTrue($settings->exists('openai'));
    }

    public function testSyncModelsReplacesExistingList(): void
    {
        $definition = $this->definition('openai');
        $handler = new class($definition) implements IntegrationHandler {
            private IntegrationDefinition $definition;

            public function __construct(IntegrationDefinition $definition)
            {
                $this->definition = $definition;
            }

            public function definition(): IntegrationDefinition
            {
                return $this->definition;
            }

            public function fetchModels(array $settings): array
            {
                return ['gpt-4.1', 'gpt-4o', 'gpt-4.1'];
            }
        };

        $catalog = $this->catalog($definition, $handler);
        $settings = $this->settingsStore();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => ['old-model']], 'Integration: openai');

        $useCase = new SyncIntegrationModels($catalog, $settings);
        $result = $useCase->handle('openai');

        $this->assertSame(['gpt-4.1', 'gpt-4o'], $result['models']);
    }

    public function testUpsertKeepsExistingRequiredSecretsWhenMissing(): void
    {
        $definition = $this->definition('openai');
        $catalog = $this->catalog($definition, null);
        $settings = $this->settingsStore();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => []], 'Integration: openai');

        $useCase = new UpsertIntegrationSettings($catalog, $settings);
        $result = $useCase->handle('openai', []);

        $this->assertSame('secret', $result['apiKey']);
    }

    public function testUpsertAllowsCodexCliAuthModeWithoutApiKey(): void
    {
        $definition = $this->codexDefinition();
        $catalog = $this->catalog($definition, null);
        $settings = $this->settingsStore();

        $useCase = new UpsertIntegrationSettings($catalog, $settings);
        $result = $useCase->handle('codex-cli', [
            'authMode' => 'cliAuth',
            'binary' => 'codex',
            'workingDir' => '/app',
        ]);

        $this->assertSame('cliAuth', $result['authMode']);
        $this->assertNull($result['apiKey']);
    }

    public function testUpsertRejectsInvalidSelectOption(): void
    {
        $definition = $this->codexDefinition();
        $catalog = $this->catalog($definition, null);
        $settings = $this->settingsStore();

        $useCase = new UpsertIntegrationSettings($catalog, $settings);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Integration.authMode must be one of: cliAuth, apiKey.');

        $useCase->handle('codex-cli', [
            'authMode' => 'bad-mode',
            'binary' => 'codex',
        ]);
    }

    private function definition(string $name): IntegrationDefinition
    {
        return IntegrationDefinition::fromArray(
            [
                'name' => $name,
                'description' => 'Test integration',
                'supportsModels' => true,
                'fields' => [
                    ['key' => 'apiKey', 'label' => 'API key', 'type' => 'password', 'required' => true],
                ],
            ],
            __FILE__
        );
    }

    private function codexDefinition(): IntegrationDefinition
    {
        return IntegrationDefinition::fromArray(
            [
                'name' => 'codex-cli',
                'description' => 'Codex CLI',
                'supportsModels' => true,
                'fields' => [
                    [
                        'key' => 'authMode',
                        'label' => 'Authentication mode',
                        'type' => 'select',
                        'required' => true,
                        'options' => [
                            ['value' => 'cliAuth', 'label' => 'CLI authentication'],
                            ['value' => 'apiKey', 'label' => 'API key'],
                        ],
                    ],
                    ['key' => 'binary', 'label' => 'CLI binary', 'type' => 'text', 'required' => true],
                    ['key' => 'workingDir', 'label' => 'Working directory', 'type' => 'text', 'required' => false],
                    ['key' => 'apiKey', 'label' => 'API key', 'type' => 'password', 'required' => false],
                ],
            ],
            __FILE__
        );
    }

    private function catalog(IntegrationDefinition $definition, ?IntegrationHandler $handler): IntegrationCatalog
    {
        return new class($definition, $handler) implements IntegrationCatalog {
            private IntegrationDefinition $definition;
            private ?IntegrationHandler $handler;

            public function __construct(IntegrationDefinition $definition, ?IntegrationHandler $handler)
            {
                $this->definition = $definition;
                $this->handler = $handler;
            }

            public function list(): array
            {
                return [$this->definition];
            }

            public function definition(string $name): ?IntegrationDefinition
            {
                return $name === $this->definition->name() ? $this->definition : null;
            }

            public function handler(string $name): ?IntegrationHandler
            {
                return $name === $this->definition->name() ? $this->handler : null;
            }
        };
    }

    private function settingsStore(): IntegrationSettingsStore
    {
        $root = sys_get_temp_dir() . '/upmin-test-' . uniqid('', true);
        $manageRoot = $root . '/manage';
        if (!is_dir($manageRoot) && !mkdir($manageRoot, 0755, true) && !is_dir($manageRoot)) {
            throw new RuntimeException('Failed to create temp manage root.');
        }
        $context = new IntegrationContext($root, $manageRoot);
        return new IntegrationSettingsStore($context);
    }
}
