<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class EnsureApiKeysPage
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    public function handle(): void
    {
        $id = DocumentId::fromParts('private', 'system/api-keys.json');
        if ($this->documents->get($id) !== null) {
            return;
        }

        $wrapper = DocumentWrapper::fromArray([
            'type' => 'page',
            'page' => 'api-keys',
            'name' => 'API Keys',
            'order' => 5,
            'section' => false,
            'position' => 'system',
            'data' => [],
        ]);

        $this->documents->save(new Document($id, $wrapper, 'private', 'system/api-keys.json'));
    }
}
