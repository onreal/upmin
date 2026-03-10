<?php

declare(strict_types=1);

namespace Manage\Application\PublicArea;

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\EnsureFormPages;
use Manage\Application\UseCases\EnsureModuleSettings;
use Manage\Application\UseCases\FindDocumentByWrapperId;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Domain\Exceptions\NotFoundException;
use Manage\Modules\ModuleSettingsKey;
use Manage\Application\UseCases\EnsureDocumentId;

final class SubmitFormEntry
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;
    private EnsureModuleSettings $ensureModuleSettings;
    private EnsureFormPages $ensureFormPages;
    private FindDocumentByWrapperId $findDocument;
    private const MAX_FIELD_CHARS = 2000;

    public function __construct(
        DocumentRepository $documents,
        EnsureDocumentId $ensureDocumentId,
        EnsureModuleSettings $ensureModuleSettings,
        EnsureFormPages $ensureFormPages,
        FindDocumentByWrapperId $findDocument
    )
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
        $this->ensureModuleSettings = $ensureModuleSettings;
        $this->ensureFormPages = $ensureFormPages;
        $this->findDocument = $findDocument;
    }

    /** @return array{document:array,entry:array} */
    public function handle(string $pageId, array $payload, array $actor): array
    {
        $pageId = $this->normalizePageId($pageId);
        if ($pageId === null) {
            throw new \InvalidArgumentException('Page id is invalid.');
        }

        $pageDocument = $this->findDocument->handle($pageId);
        if ($pageDocument === null) {
            throw new NotFoundException('Page not found.');
        }

        $pageDocument = $this->ensureDocumentId->handle($pageDocument);
        $wrapper = $pageDocument->wrapper();
        if ($wrapper->type() !== 'page') {
            throw new NotFoundException('Page not found.');
        }

        $moduleNames = $wrapper->modules();
        if (!in_array('form', $moduleNames, true)) {
            throw new NotFoundException('Form module not found.');
        }

        $this->ensureModuleSettings->handle($wrapper);
        $this->ensureFormPages->handle($pageDocument);

        $settingsKey = ModuleSettingsKey::forDocument($wrapper, 'form');
        if ($settingsKey === '') {
            throw new NotFoundException('Form settings not found.');
        }

        $settingsDocument = $this->loadSettingsDocument($settingsKey);
        if ($settingsDocument === null) {
            throw new NotFoundException('Form settings not found.');
        }
        $settingsDocument = $this->ensureDocumentId->handle($settingsDocument);
        $settingsWrapper = $settingsDocument->wrapper();
        $settingsId = $settingsWrapper->id();
        if (!is_string($settingsId) || trim($settingsId) === '') {
            throw new NotFoundException('Form settings not found.');
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

        $settingsData = $settingsWrapper->data();
        if (!is_array($settingsData)) {
            $settingsData = [];
        }

        $label = $this->resolveLabel($wrapper, $settingsData, $name);
        $normalizedSettings = $this->normalizeSettings($settingsData, $label);

        $path = 'system/forms/submissions/' . $settingsId . '-' . $pageId . '.json';
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
                'name' => 'Form: ' . $label,
                'order' => 0,
                'section' => false,
                'position' => 'system',
                'data' => [
                    'formSettingsId' => $settingsId,
                    'pageId' => $pageId,
                    'settingsKey' => $settingsKey,
                    'label' => $label,
                    'settings' => $normalizedSettings,
                    'source' => $this->sourcePayload($pageDocument),
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

        $data['formSettingsId'] = $settingsId;
        $data['pageId'] = $pageId;
        $data['settingsKey'] = $settingsKey;
        $data['label'] = $label;
        $data['settings'] = $normalizedSettings;
        $data['source'] = $this->sourcePayload($pageDocument);
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

    private function normalizePageId(string $value): ?string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }
        if (!preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $normalized
        )) {
            return null;
        }

        return $normalized;
    }

    private function resolveLabel(DocumentWrapper $wrapper, array $settings, ?string $override): string
    {
        if (is_string($override) && trim($override) !== '') {
            return trim($override);
        }
        $name = $settings['name'] ?? null;
        if (is_string($name) && trim($name) !== '') {
            return trim($name);
        }

        return $wrapper->name() . ' - form';
    }

    /** @return array{name: string, sendadminemail: bool, senduseremail: bool, captcha: bool} */
    private function normalizeSettings(array $settings, string $label): array
    {
        return [
            'name' => $label,
            'sendadminemail' => ($settings['sendadminemail'] ?? false) === true,
            'senduseremail' => ($settings['senduseremail'] ?? false) === true,
            'captcha' => ($settings['captcha'] ?? false) === true,
        ];
    }

    private function loadSettingsDocument(string $settingsKey): ?Document
    {
        $path = 'modules/' . $settingsKey . '.json';
        $id = DocumentId::fromParts('private', $path);
        return $this->documents->get($id);
    }

    /** @return array<string, mixed> */
    private function sourcePayload(Document $document): array
    {
        $wrapper = $document->wrapper();

        return [
            'documentUid' => $wrapper->id(),
            'documentId' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'page' => $wrapper->page(),
            'name' => $wrapper->name(),
            'section' => $wrapper->isSection(),
        ];
    }
}
