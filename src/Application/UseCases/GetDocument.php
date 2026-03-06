<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;

final class GetDocument
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    public function handle(DocumentId $id): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $document = $this->ensureDocumentId->handle($document);

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
