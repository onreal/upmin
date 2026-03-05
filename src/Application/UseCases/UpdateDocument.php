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
        if (
            $document->store() === 'private'
            && str_starts_with($document->path(), 'logs/')
            && $document->path() !== 'logs/logger-settings.json'
        ) {
            throw new \InvalidArgumentException('Logs are read-only.');
        }

        if ($document->wrapper()->position() === 'system') {
            if (!array_key_exists('data', $payload)) {
                throw new \InvalidArgumentException('Document.data is required.');
            }
            $wrapper = $document->wrapper()->withData($payload['data']);
            $updated = $document->withWrapper($wrapper);
            $this->documents->save($updated);
            $this->ensureModuleSettings->handle($updated->wrapper());

            return [
                'id' => $updated->id()->encoded(),
                'store' => $updated->store(),
                'path' => $updated->path(),
                'payload' => $updated->wrapper()->toArray(),
            ];
        }

        $wrapper = DocumentWrapper::fromArray($payload);
        if ($wrapper->position() === 'system') {
            throw new \InvalidArgumentException('System pages cannot be created via the admin.');
        }
        if (
            $document->store() === 'private'
            && $wrapper->page() === 'logs'
            && $document->path() !== 'logs/logger-settings.json'
        ) {
            throw new \InvalidArgumentException('Logs are read-only.');
        }
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
