<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\ExportDocument;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class ExportDocumentTest extends TestCase
{
    public function testExportsDocument(): void
    {
        $document = new Document(
            DocumentId::fromParts('public', 'content.json'),
            DocumentWrapper::fromArray([
                'page' => 'content',
                'name' => 'Content',
                'order' => 1,
                'section' => false,
                'data' => ['title' => 'Hello'],
            ]),
            'public',
            'content.json'
        );

        $repository = new class($document) implements DocumentRepository {
            private Document $document;

            public function __construct(Document $document)
            {
                $this->document = $document;
            }

            public function listAll(): array
            {
                return [$this->document];
            }

            public function get(DocumentId $id): ?Document
            {
                return $this->document;
            }

            public function save(Document $document): void
            {
            }
        };

        $useCase = new ExportDocument($repository);
        $result = $useCase->handle(DocumentId::fromParts('public', 'content.json'));

        $this->assertNotNull($result);
        $this->assertSame('content.json', $result['filename']);
        $this->assertStringContainsString('"page": "content"', $result['content']);
    }

    public function testReturnsNullWhenMissing(): void
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

        $useCase = new ExportDocument($repository);
        $this->assertNull($useCase->handle(DocumentId::fromParts('public', 'missing.json')));
    }
}
