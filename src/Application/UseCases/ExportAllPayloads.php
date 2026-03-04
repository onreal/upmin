<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ExportAllPayloads
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<int, array{path: string, payload: array}> */
    public function handle(): array
    {
        $exports = [];

        foreach ($this->documents->listAll() as $document) {
            $exports[] = [
                'path' => $this->exportPath($document),
                'payload' => $document->wrapper()->toArray(),
            ];
        }

        return $exports;
    }

    private function exportPath(Document $document): string
    {
        $relative = ltrim($document->path(), '/');
        return $document->store() . '/' . $relative;
    }
}
