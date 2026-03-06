<?php

declare(strict_types=1);

namespace Manage\Application\PublicArea;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleSettingsKey;
use Manage\Application\UseCases\EnsureDocumentId;

final class SubmitFormEntry
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;
    private const MAX_FIELD_CHARS = 2000;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    /** @return array{document:array,entry:array} */
    public function handle(string $formId, array $payload, array $actor): array
    {
        $formId = trim($formId);
        if ($formId === '') {
            throw new \InvalidArgumentException('Form id is required.');
        }

        $key = $this->normalizeFormKey($formId);
        if ($key === null) {
            throw new \InvalidArgumentException('Form id is invalid.');
        }

        $entryData = $payload['entry'] ?? null;
        if (!is_array($entryData)) {
            throw new \InvalidArgumentException('Entry payload is required.');
        }
        $this->assertEntrySize($entryData);

        $properties = $payload['properties'] ?? null;
        if ($properties !== null && !is_array($properties)) {
            throw new \InvalidArgumentException('Properties must be an object.');
        }

        $name = $payload['name'] ?? null;
        if ($name !== null && !is_string($name)) {
            throw new \InvalidArgumentException('Name must be a string.');
        }

        $path = 'system/forms/' . $key . '.json';
        $id = DocumentId::fromParts('private', $path);
        $document = $this->documents->get($id);
        $now = (new \DateTimeImmutable())->format(DATE_ATOM);
        $entry = [
            'id' => bin2hex(random_bytes(16)),
            'submittedAt' => $now,
            'actor' => $actor,
            'data' => $entryData,
        ];

        if ($document === null) {
            if ($properties === null) {
                throw new \InvalidArgumentException('Properties are required for the first submission.');
            }

            $wrapper = DocumentWrapper::fromArray([
                'type' => 'page',
                'page' => 'system',
                'name' => $name && trim($name) !== '' ? trim($name) : ('Form: ' . $formId),
                'order' => 0,
                'section' => false,
                'position' => 'system',
                'data' => [
                    'formId' => $key,
                    'properties' => $properties,
                    'entries' => [$entry],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ]);

            $document = new Document($id, $wrapper, 'private', $path);
            $this->documents->save($document);
            $document = $this->ensureDocumentId->handle($document);

            return [
                'document' => $this->present($document),
                'entry' => $entry,
            ];
        }

        $wrapper = $document->wrapper();
        $data = $wrapper->data();
        if (!is_array($data)) {
            $data = [];
        }

        if (!isset($data['formId'])) {
            $data['formId'] = $key;
        }
        if (!isset($data['properties']) && $properties !== null) {
            $data['properties'] = $properties;
        }

        $entries = $data['entries'] ?? [];
        if (!is_array($entries)) {
            $entries = [];
        }
        $entries[] = $entry;
        $data['entries'] = $entries;
        $data['updatedAt'] = $now;

        $wrapper = $wrapper->withData($data);
        $document = $document->withWrapper($wrapper);
        $this->documents->save($document);
        $document = $this->ensureDocumentId->handle($document);

        return [
            'document' => $this->present($document),
            'entry' => $entry,
        ];
    }

    private function present(Document $document): array
    {
        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }

    private function assertEntrySize(array $entry): void
    {
        $stack = [$entry];
        while ($stack !== []) {
            $value = array_pop($stack);
            if (is_string($value)) {
                $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
                if ($length > self::MAX_FIELD_CHARS) {
                    throw new \InvalidArgumentException(
                        'Entry fields must be at most ' . self::MAX_FIELD_CHARS . ' characters.'
                    );
                }
                continue;
            }
            if (is_array($value)) {
                foreach ($value as $child) {
                    $stack[] = $child;
                }
            }
        }
    }

    private function normalizeFormKey(string $value): ?string
    {
        $normalized = ModuleSettingsKey::normalizeKey($value);
        if ($normalized === null) {
            return null;
        }
        if (!preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-z0-9-]+$/i',
            $normalized
        )) {
            return null;
        }

        return $normalized;
    }
}
