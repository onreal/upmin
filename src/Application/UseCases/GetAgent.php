<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;

final class GetAgent
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    /** @return array<string, mixed>|null */
    public function handle(DocumentId $id): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $document = $this->ensureDocumentId->handle($document);
        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
            return null;
        }
        $data = $wrapper->data();
        if (is_array($data) && isset($data['position']) && is_string($data['position'])) {
            if (strtolower(trim($data['position'])) === 'system') {
                return null;
            }
        }

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $wrapper->toArray(),
        ];
    }
}
