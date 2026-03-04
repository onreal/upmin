<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\ExportAllDocuments;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class ExportAllDocumentsTest extends TestCase
{
    public function testExportsAllDocuments(): void
    {
        $documents = [
            new Document(
                DocumentId::fromParts('public', 'content.json'),
                DocumentWrapper::fromArray([
                    'page' => 'content',
                    'name' => 'Content',
                    'order' => 1,
                    'section' => false,
                    'data' => [],
                ]),
                'public',
                'content.json'
            ),
            new Document(
                DocumentId::fromParts('private', 'settings.json'),
                DocumentWrapper::fromArray([
                    'page' => 'settings',
                    'name' => 'Settings',
                    'order' => 1,
                    'section' => false,
                    'data' => [],
                ]),
                'private',
                'settings.json'
            ),
        ];

        $repository = new class($documents) implements DocumentRepository {
            /** @var Document[] */
            private array $documents;

            public function __construct(array $documents)
            {
                $this->documents = $documents;
            }

            public function listAll(): array
            {
                return $this->documents;
            }

            public function get(DocumentId $id): ?Document
            {
                return null;
            }

            public function save(Document $document): void
            {
            }
        };

        $useCase = new ExportAllDocuments($repository);
        $exports = $useCase->handle();

        $this->assertCount(2, $exports);
        $paths = array_column($exports, 'path');
        $this->assertContains('public/content.json', $paths);
        $this->assertContains('private/settings.json', $paths);
    }
}
