<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\CreateDocument;
use Manage\Application\UseCases\EnsureModuleSettings;
use Manage\Application\UseCases\ReorderDocuments;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsStore;
use PHPUnit\Framework\TestCase;

final class CreateDocumentTest extends TestCase
{
    public function testCreatesDocument(): void
    {
        $repository = new class() implements DocumentRepository {
            public ?Document $saved = null;

            public function listAll(): array
            {
                return [];
            }

            public function get(DocumentId $id): ?Document
            {
                return null;
            }

            public function save(Document $document): void
            {
                $this->saved = $document;
            }
        };

        $context = new ModuleContext(sys_get_temp_dir(), sys_get_temp_dir());
        $registry = new ModuleRegistry(sys_get_temp_dir() . '/modules', $context);
        $settingsStore = new ModuleSettingsStore($context);
        $ensureModuleSettings = new EnsureModuleSettings($registry, $settingsStore);
        $useCase = new CreateDocument($repository, new ReorderDocuments($repository), $ensureModuleSettings);
        $payload = [
            'page' => 'content',
            'name' => 'Content',
            'order' => 1,
            'section' => false,
            'data' => [],
        ];

        $result = $useCase->handle('public', 'content.json', $payload);

        $this->assertNotNull($result);
        $this->assertSame('public', $result['store']);
        $this->assertSame('content.json', $result['path']);
        $this->assertSame('content', $result['payload']['page']);
        $this->assertInstanceOf(Document::class, $repository->saved);
    }

    public function testRejectsInvalidPath(): void
    {
        $repository = new class() implements DocumentRepository {
            public function listAll(): array
            {
                return [];
            }

            public function get(DocumentId $id): ?Document
            {
                return null;
            }

            public function save(Document $document): void
            {
            }
        };

        $context = new ModuleContext(sys_get_temp_dir(), sys_get_temp_dir());
        $registry = new ModuleRegistry(sys_get_temp_dir() . '/modules', $context);
        $settingsStore = new ModuleSettingsStore($context);
        $ensureModuleSettings = new EnsureModuleSettings($registry, $settingsStore);
        $useCase = new CreateDocument($repository, new ReorderDocuments($repository), $ensureModuleSettings);

        $this->expectException(\InvalidArgumentException::class);
        $useCase->handle('public', 'invalid', [
            'page' => 'content',
            'name' => 'Content',
            'order' => 1,
            'section' => false,
            'data' => [],
        ]);
    }

    public function testReturnsNullWhenDocumentExists(): void
    {
        $existing = new Document(
            DocumentId::fromParts('private', 'exists.json'),
            DocumentWrapper::fromArray([
                'page' => 'settings',
                'name' => 'Settings',
                'order' => 1,
                'section' => false,
                'data' => [],
            ]),
            'private',
            'exists.json'
        );

        $repository = new class($existing) implements DocumentRepository {
            private Document $existing;

            public function __construct(Document $existing)
            {
                $this->existing = $existing;
            }

            public function listAll(): array
            {
                return [];
            }

            public function get(DocumentId $id): ?Document
            {
                return $this->existing;
            }

            public function save(Document $document): void
            {
            }
        };

        $context = new ModuleContext(sys_get_temp_dir(), sys_get_temp_dir());
        $registry = new ModuleRegistry(sys_get_temp_dir() . '/modules', $context);
        $settingsStore = new ModuleSettingsStore($context);
        $ensureModuleSettings = new EnsureModuleSettings($registry, $settingsStore);
        $useCase = new CreateDocument($repository, new ReorderDocuments($repository), $ensureModuleSettings);
        $result = $useCase->handle('private', 'exists.json', [
            'page' => 'settings',
            'name' => 'Settings',
            'order' => 1,
            'section' => false,
            'data' => [],
        ]);

        $this->assertNull($result);
    }
}
