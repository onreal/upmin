<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class UpdateDocument
{
    private DocumentRepository $documents;
    private ReorderDocuments $reorderDocuments;
    private EnsureModuleSettings $ensureModuleSettings;

    public function __construct(
        DocumentRepository $documents,
        ReorderDocuments $reorderDocuments,
        EnsureModuleSettings $ensureModuleSettings
    )
    {
        $this->documents = $documents;
        $this->reorderDocuments = $reorderDocuments;
        $this->ensureModuleSettings = $ensureModuleSettings;
    }

    public function handle(DocumentId $id, array $payload): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $wrapper = DocumentWrapper::fromArray($payload);
        $updated = $document->withWrapper($wrapper);
        $updated = $this->reorderDocuments->handle($updated);
        $this->ensureModuleSettings->handle($updated->wrapper());

        return [
            'id' => $updated->id()->encoded(),
            'store' => $updated->store(),
            'path' => $updated->path(),
            'payload' => $updated->wrapper()->toArray(),
        ];
    }
}
