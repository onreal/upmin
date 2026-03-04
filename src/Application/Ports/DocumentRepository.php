<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;

interface DocumentRepository
{
    /** @return Document[] */
    public function listAll(): array;

    public function get(DocumentId $id): ?Document;

    public function save(Document $document): void;
}
