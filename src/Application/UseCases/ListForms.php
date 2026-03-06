<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;

final class ListForms
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $forms = [];

        foreach ($this->documents->listAll() as $document) {
            if ($document->store() !== 'private') {
                continue;
            }
            if (!str_starts_with($document->path(), 'system/forms/')) {
                continue;
            }

            $wrapper = $document->wrapper();
            if ($wrapper->type() !== 'page') {
                continue;
            }

            $data = $wrapper->data();
            if (!is_array($data)) {
                continue;
            }

            $formId = $data['formId'] ?? null;
            if (!is_string($formId) || trim($formId) === '') {
                continue;
            }

            $entries = $data['entries'] ?? [];
            $entryCount = is_array($entries) ? count($entries) : 0;

            $forms[] = [
                'id' => $document->id()->encoded(),
                'formId' => trim($formId),
                'name' => $wrapper->name(),
                'label' => is_string($data['label'] ?? null) ? (string) $data['label'] : null,
                'store' => $document->store(),
                'path' => $document->path(),
                'createdAt' => is_string($data['createdAt'] ?? null) ? $data['createdAt'] : null,
                'updatedAt' => is_string($data['updatedAt'] ?? null) ? $data['updatedAt'] : null,
                'entries' => $entryCount,
                'source' => is_array($data['source'] ?? null) ? $data['source'] : null,
                'settingsKey' => is_string($data['settingsKey'] ?? null) ? (string) $data['settingsKey'] : null,
            ];
        }

        usort($forms, static function (array $a, array $b): int {
            $timeA = is_string($a['updatedAt'] ?? null) ? strtotime($a['updatedAt']) : false;
            $timeB = is_string($b['updatedAt'] ?? null) ? strtotime($b['updatedAt']) : false;
            $timeA = $timeA === false ? 0 : $timeA;
            $timeB = $timeB === false ? 0 : $timeB;
            if ($timeA !== $timeB) {
                return $timeB <=> $timeA;
            }
            return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
        });

        return $forms;
    }
}
