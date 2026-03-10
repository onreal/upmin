<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class FindDocumentByWrapperId
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    public function handle(string $wrapperId): ?Document
    {
        $wrapperId = trim($wrapperId);
        if ($wrapperId === '') {
            return null;
        }

        foreach ($this->documents->listAll() as $document) {
            $document = $this->ensureDocumentId->handle($document);
            if ($document->wrapper()->id() === $wrapperId) {
                return $document;
            }
        }

        return null;
    }
}
