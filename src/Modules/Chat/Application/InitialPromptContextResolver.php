<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\ModuleSettingsKey;

final class InitialPromptContextResolver
{
    private DocumentRepository $documents;
    private ModuleDefinition $definition;

    public function __construct(DocumentRepository $documents, ModuleDefinition $definition)
    {
        $this->documents = $documents;
        $this->definition = $definition;
    }

    /** @return array{pageData: mixed, schema: array<string, mixed>}|null */
    public function resolve(string $settingsKey): ?array
    {
        $documentId = ModuleSettingsKey::documentIdFromKey($settingsKey, $this->definition->name());
        if ($documentId === null) {
            return null;
        }

        $moduleSlug = ModuleSettingsKey::slug($this->definition->name());

        foreach ($this->documents->listAll() as $document) {
            $wrapper = $document->wrapper();
            if ($wrapper->id() !== $documentId) {
                continue;
            }
            if ($wrapper->type() !== 'page') {
                return null;
            }

            $moduleNames = array_map(
                static fn (string $name): string => ModuleSettingsKey::slug($name),
                $wrapper->modules()
            );
            if (!in_array($moduleSlug, $moduleNames, true)) {
                return null;
            }

            return [
                'pageData' => $wrapper->data(),
                'schema' => $this->definition->schema(),
            ];
        }

        return null;
    }
}
