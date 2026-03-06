<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsKey;
use Manage\Modules\ModuleSettingsStore;

final class EnsureFormPages
{
    private const MODULE_NAME = 'form';
    private const FORMS_ROOT = 'system/forms';

    private DocumentRepository $documents;
    private ModuleRegistry $modules;
    private ModuleSettingsStore $settings;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(
        DocumentRepository $documents,
        ModuleRegistry $modules,
        ModuleSettingsStore $settings,
        EnsureDocumentId $ensureDocumentId
    )
    {
        $this->documents = $documents;
        $this->modules = $modules;
        $this->settings = $settings;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    public function handle(Document $document): void
    {
        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'page') {
            return;
        }
        $moduleNames = $wrapper->modules();
        if (!in_array(self::MODULE_NAME, $moduleNames, true)) {
            return;
        }

        if ($this->modules->definition(self::MODULE_NAME) === null) {
            return;
        }

        $settingsKey = ModuleSettingsKey::forDocument($wrapper, self::MODULE_NAME);
        if ($settingsKey === '') {
            return;
        }
        $settings = $this->settings->read($settingsKey);
        if (!is_array($settings)) {
            $settings = [];
        }

        $label = $this->resolveLabel($wrapper, $settings);
        $normalizedSettings = $this->normalizeSettings($settings, $label);

        $path = self::FORMS_ROOT . '/' . $settingsKey . '.json';
        $id = DocumentId::fromParts('private', $path);
        $existing = $this->documents->get($id);

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        if ($existing === null) {
            $payload = [
                'type' => 'page',
                'page' => 'system',
                'name' => 'Form: ' . $label,
                'order' => 0,
                'section' => false,
                'position' => 'system',
                'data' => [
                    'formId' => $settingsKey,
                    'label' => $label,
                    'settingsKey' => $settingsKey,
                    'settings' => $normalizedSettings,
                    'source' => $this->sourcePayload($document),
                    'entries' => [],
                    'createdAt' => $now,
                    'updatedAt' => $now,
                ],
            ];

            $wrapper = DocumentWrapper::fromArray($payload);
            $saved = new Document($id, $wrapper, 'private', $path);
            $this->documents->save($saved);
            $this->ensureDocumentId->handle($saved);
            return;
        }

        $existingWrapper = $existing->wrapper();
        $existingData = $existingWrapper->data();
        if (!is_array($existingData)) {
            $existingData = [];
        }

        $entries = $existingData['entries'] ?? [];
        if (!is_array($entries)) {
            $entries = [];
        }

        $createdAt = is_string($existingData['createdAt'] ?? null) ? $existingData['createdAt'] : $now;
        $updatedAt = is_string($existingData['updatedAt'] ?? null) ? $existingData['updatedAt'] : $now;

        $nextData = $existingData;
        $nextData['formId'] = $settingsKey;
        $nextData['label'] = $label;
        $nextData['settingsKey'] = $settingsKey;
        $nextData['settings'] = $normalizedSettings;
        $nextData['source'] = $this->sourcePayload($document);
        $nextData['entries'] = $entries;
        $nextData['createdAt'] = $createdAt;
        $nextData['updatedAt'] = $updatedAt;

        $nextWrapper = $existingWrapper;
        $desiredName = 'Form: ' . $label;
        if ($existingWrapper->name() !== $desiredName) {
            $nextWrapper = DocumentWrapper::fromArray([
                'id' => $existingWrapper->id(),
                'type' => $existingWrapper->type(),
                'page' => $existingWrapper->page(),
                'name' => $desiredName,
                'language' => $existingWrapper->language(),
                'order' => $existingWrapper->order(),
                'section' => $existingWrapper->isSection(),
                'modules' => $existingWrapper->modules(),
                'position' => $existingWrapper->position(),
                'data' => $nextData,
            ]);
        } else {
            $nextWrapper = $existingWrapper->withData($nextData);
        }

        $saved = $existing->withWrapper($nextWrapper);
        $this->documents->save($saved);
        $this->ensureDocumentId->handle($saved);
    }

    private function resolveLabel(DocumentWrapper $wrapper, array $settings): string
    {
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
