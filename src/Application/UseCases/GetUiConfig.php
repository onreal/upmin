<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;

final class GetUiConfig
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<string, mixed>|null */
    public function handle(): ?array
    {
        $id = DocumentId::fromParts('private', 'ui.json');
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $data = $document->wrapper()->data();
        if (!is_array($data)) {
            return null;
        }

        return $data;
    }
}
