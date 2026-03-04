<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class CreateDocument
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

    public function handle(string $store, string $path, array $payload): ?array
    {
        $store = trim($store);
        if ($store !== 'public' && $store !== 'private') {
            throw new \InvalidArgumentException('Document.store must be public or private.');
        }

        $path = trim($path);
        if ($path === '') {
            throw new \InvalidArgumentException('Document.path is required.');
        }
        if (!str_ends_with($path, '.json')) {
            throw new \InvalidArgumentException('Document.path must end with .json.');
        }
        if (str_contains($path, '..') || str_starts_with($path, '/') || str_contains($path, '\\')) {
            throw new \InvalidArgumentException('Document.path is invalid.');
        }
        if ($store === 'private' && str_starts_with($path, 'logs/') && $path !== 'logs/logger-settings.json') {
            throw new \InvalidArgumentException('Logs are read-only.');
        }

        $id = DocumentId::fromParts($store, $path);
        if ($this->documents->get($id) !== null) {
            return null;
        }

        $wrapper = DocumentWrapper::fromArray($payload);
        if (
            $store === 'private'
            && $wrapper->page() === 'logs'
            && $path !== 'logs/logger-settings.json'
        ) {
            throw new \InvalidArgumentException('Logs are read-only.');
        }
        $document = new Document($id, $wrapper, $store, $path);
        $document = $this->reorderDocuments->handle($document);
        $this->ensureModuleSettings->handle($document->wrapper());

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
