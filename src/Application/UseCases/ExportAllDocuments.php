<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ExportAllDocuments
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<int, array{path: string, content: string}> */
    public function handle(?string $store = null): array
    {
        $exports = [];

        foreach ($this->documents->listAll() as $document) {
            if (is_string($store) && trim($store) !== '' && $document->store() !== trim($store)) {
                continue;
            }

            $content = json_encode(
                $document->wrapper()->toArray(),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
            );
            if ($content === false) {
                throw new \RuntimeException('Failed to encode JSON.');
            }

            $exports[] = [
                'path' => $this->zipPath($document),
                'content' => $content . PHP_EOL,
            ];
        }

        return $exports;
    }

    private function zipPath(Document $document): string
    {
        $relative = ltrim($document->path(), '/');
        return $document->store() . '/' . $relative;
    }
}
