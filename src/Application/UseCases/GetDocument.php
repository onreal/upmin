<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;

final class GetDocument
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    public function handle(DocumentId $id): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
