<?php

declare(strict_types=1);

use Manage\Application\UseCases\ListIntegrations;
use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Integrations\IntegrationSyncStatusStore;
use PHPUnit\Framework\TestCase;

final class ListIntegrationsTest extends TestCase
{
    public function testListIncludesSyncStatusMetadata(): void
    {
        $definition = IntegrationDefinition::fromArray(
            [
                'name' => 'openai',
                'description' => 'OpenAI',
                'supportsModels' => true,
                'fields' => [
                    ['key' => 'apiKey', 'label' => 'API key', 'type' => 'password', 'required' => true],
                ],
            ],
            __FILE__
        );

        [$context, $settings, $statuses] = $this->stores();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => []], 'Integration: openai');
        $statuses->start('openai', 'user:test');

        $useCase = new ListIntegrations($this->catalog($definition), $settings, $statuses);
        $items = $useCase->handle();

        $this->assertCount(1, $items);
        $this->assertTrue($items[0]['enabled']);
        $this->assertTrue($items[0]['syncing']);
        $this->assertNull($items[0]['lastSyncError']);
        $this->assertNull($items[0]['lastSyncedAt']);
    }

    public function testListIncludesLastSyncFailureMetadata(): void
    {
        $definition = IntegrationDefinition::fromArray(
            [
                'name' => 'openai',
                'description' => 'OpenAI',
                'supportsModels' => true,
                'fields' => [
                    ['key' => 'apiKey', 'label' => 'API key', 'type' => 'password', 'required' => true],
                ],
            ],
            __FILE__
        );

        [, $settings, $statuses] = $this->stores();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => []], 'Integration: openai');
        $statuses->start('openai', 'user:test');
        $statuses->fail('openai', 'Boom');

        $useCase = new ListIntegrations($this->catalog($definition), $settings, $statuses);
        $items = $useCase->handle();

        $this->assertFalse($items[0]['syncing']);
        $this->assertSame('Boom', $items[0]['lastSyncError']);
        $this->assertNull($items[0]['lastSyncedAt']);
    }

    /** @return array{0: IntegrationContext, 1: IntegrationSettingsStore, 2: IntegrationSyncStatusStore} */
    private function stores(): array
    {
        $root = sys_get_temp_dir() . '/upmin-list-integrations-' . uniqid('', true);
        $manageRoot = $root . '/manage';
        if (!is_dir($manageRoot) && !mkdir($manageRoot, 0755, true) && !is_dir($manageRoot)) {
            throw new RuntimeException('Failed to create temp manage root.');
        }

        $context = new IntegrationContext($root, $manageRoot);

        return [
            $context,
            new IntegrationSettingsStore($context),
            new IntegrationSyncStatusStore($context),
        ];
    }

    private function catalog(IntegrationDefinition $definition): IntegrationCatalog
    {
        return new class($definition) implements IntegrationCatalog {
            private IntegrationDefinition $definition;

            public function __construct(IntegrationDefinition $definition)
            {
                $this->definition = $definition;
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
                return null;
            }
        };
    }
}
