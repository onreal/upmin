<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\ReorderDocuments;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class ReorderDocumentsTest extends TestCase
{
    public function testInsertsAndShiftsOrders(): void
    {
        $documents = [
            new Document(
                DocumentId::fromParts('public', 'a.json'),
                DocumentWrapper::fromArray([
                    'page' => 'content',
                    'name' => 'A',
                    'order' => 1,
                    'section' => false,
                    'data' => [],
                ]),
                'public',
                'a.json'
            ),
            new Document(
                DocumentId::fromParts('public', 'b.json'),
                DocumentWrapper::fromArray([
                    'page' => 'content',
                    'name' => 'B',
                    'order' => 2,
                    'section' => false,
                    'data' => [],
                ]),
                'public',
                'b.json'
            ),
            new Document(
                DocumentId::fromParts('public', 'c.json'),
                DocumentWrapper::fromArray([
                    'page' => 'content',
                    'name' => 'C',
                    'order' => 3,
                    'section' => false,
                    'data' => [],
                ]),
                'public',
                'c.json'
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
                foreach ($this->documents as $document) {
                    if ($document->store() === $id->store() && $document->path() === $id->path()) {
                        return $document;
                    }
                }
                return null;
            }

            public function save(Document $document): void
            {
                foreach ($this->documents as $index => $existing) {
                    if ($existing->store() === $document->store() && $existing->path() === $document->path()) {
                        $this->documents[$index] = $document;
                        return;
                    }
                }
                $this->documents[] = $document;
            }

            /** @return Document[] */
            public function all(): array
            {
                return $this->documents;
            }
        };

        $target = new Document(
            DocumentId::fromParts('public', 'new.json'),
            DocumentWrapper::fromArray([
                'page' => 'content',
                'name' => 'New',
                'order' => 1,
                'section' => false,
                'data' => [],
            ]),
            'public',
            'new.json'
        );

        $useCase = new ReorderDocuments($repository);
        $useCase->handle($target);

        $orders = [];
        foreach ($repository->all() as $document) {
            $orders[$document->path()] = $document->wrapper()->order();
        }

        $this->assertSame(1, $orders['new.json']);
        $this->assertSame(2, $orders['a.json']);
        $this->assertSame(3, $orders['b.json']);
        $this->assertSame(4, $orders['c.json']);
    }
}
