<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\UpdateAgent;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationSettingsStore;
use PHPUnit\Framework\TestCase;

final class UpdateAgentTest extends TestCase
{
    public function testRejectsInvalidModelOnUpdate(): void
    {
        $repository = $this->documentsRepository();
        $catalog = $this->integrationCatalog('openai');
        $settings = $this->settingsStore();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => ['gpt-4o']], 'Integration: openai');

        $useCase = new UpdateAgent($repository, $catalog, $settings);
        $id = DocumentId::fromParts('private', 'agents/assistant.json');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Agent.model is not available for this provider.');

        $useCase->handle($id, $this->payload('openai', 'gpt-4.1'));
    }

    public function testUpdatesAgentWithEnabledProviderAndModel(): void
    {
        $repository = $this->documentsRepository();
        $catalog = $this->integrationCatalog('openai');
        $settings = $this->settingsStore();
        $settings->write('openai', ['apiKey' => 'secret', 'models' => ['gpt-4.1']], 'Integration: openai');

        $useCase = new UpdateAgent($repository, $catalog, $settings);
        $id = DocumentId::fromParts('private', 'agents/assistant.json');
        $result = $useCase->handle($id, $this->payload('openai', 'gpt-4.1'));

        $this->assertNotNull($result);
        $this->assertSame('openai', $result['payload']['data']['provider']);
        $this->assertSame('gpt-4.1', $result['payload']['data']['model']);
    }

    private function documentsRepository(): DocumentRepository
    {
        return new class() implements DocumentRepository {
            /** @var array<string, Document> */
            private array $documents = [];

            public function __construct()
            {
                $id = DocumentId::fromParts('private', 'agents/assistant.json');
                $this->documents[$id->encoded()] = new Document(
                    $id,
                    DocumentWrapper::fromArray([
                        'type' => 'agent',
                        'page' => 'agents',
                        'name' => 'Assistant',
                        'order' => 1,
                        'section' => false,
                        'data' => [
                            'provider' => 'openai',
                            'model' => 'gpt-4.1',
                            'systemPrompt' => 'system',
                            'adminPrompt' => 'admin',
                        ],
                    ]),
                    'private',
                    'agents/assistant.json'
                );
            }

            public function listAll(): array
            {
                return array_values($this->documents);
            }

            public function get(DocumentId $id): ?Document
            {
                return $this->documents[$id->encoded()] ?? null;
            }

            public function save(Document $document): void
            {
                $this->documents[$document->id()->encoded()] = $document;
            }
        };
    }

    private function integrationCatalog(string $name): IntegrationCatalog
    {
        $definition = IntegrationDefinition::fromArray(
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

        return new class($definition) implements IntegrationCatalog {
            /** @var IntegrationDefinition */
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

    /** @return array<string, mixed> */
    private function payload(string $provider, string $model): array
    {
        return [
            'name' => 'Assistant',
            'provider' => $provider,
            'model' => $model,
            'systemPrompt' => 'system',
            'adminPrompt' => 'admin',
        ];
    }
}
