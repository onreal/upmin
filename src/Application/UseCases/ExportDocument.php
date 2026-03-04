<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;

final class ExportDocument
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array{filename: string, content: string}|null */
    public function handle(DocumentId $id): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $content = json_encode(
            $document->wrapper()->toArray(),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        );

        if ($content === false) {
            throw new \RuntimeException('Failed to encode JSON.');
        }

        $filename = basename($document->path());

        return [
            'filename' => $filename,
            'content' => $content . PHP_EOL,
        ];
    }
}
