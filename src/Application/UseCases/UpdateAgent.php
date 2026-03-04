<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class UpdateAgent
{
    private DocumentRepository $documents;
    private IntegrationCatalog $integrations;
    private IntegrationSettingsStore $settings;

    public function __construct(
        DocumentRepository $documents,
        IntegrationCatalog $integrations,
        IntegrationSettingsStore $settings
    )
    {
        $this->documents = $documents;
        $this->integrations = $integrations;
        $this->settings = $settings;
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>|null
     */
    public function handle(DocumentId $id, array $payload): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
            return null;
        }

        $name = $this->requireString($payload, 'name', 'Agent.name is required.');
        $provider = strtolower($this->requireString($payload, 'provider', 'Agent.provider is required.'));
        $model = $this->requireString($payload, 'model', 'Agent.model is required.');
        $systemPrompt = $this->requireString($payload, 'systemPrompt', 'Agent.systemPrompt is required.');
        $adminPrompt = $this->requireString($payload, 'adminPrompt', 'Agent.adminPrompt is required.');

        $this->validateProviderModel($provider, $model);

        $language = $wrapper->language();
        if (array_key_exists('language', $payload)) {
            if (!is_string($payload['language'])) {
                throw new \InvalidArgumentException('Agent.language must be a string.');
            }
            $language = trim($payload['language']);
            if ($language === '') {
                $language = null;
            }
        }

        $order = $wrapper->order();
        if (array_key_exists('order', $payload)) {
            if (!is_int($payload['order'])) {
                throw new \InvalidArgumentException('Agent.order must be an integer.');
            }
            $order = $payload['order'];
        }

        $updatedWrapper = DocumentWrapper::fromArray([
            'type' => 'agent',
            'page' => 'agents',
            'name' => $name,
            'language' => $language,
            'order' => $order,
            'section' => false,
            'data' => [
                'provider' => $provider,
                'model' => $model,
                'systemPrompt' => $systemPrompt,
                'adminPrompt' => $adminPrompt,
            ],
        ]);

        $document = $document->withWrapper($updatedWrapper);
        $this->documents->save($document);

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }

    private function requireString(array $payload, string $key, string $message): string
    {
        $value = $payload[$key] ?? null;
        if (!is_string($value) || trim($value) === '') {
            throw new \InvalidArgumentException($message);
        }
        return trim($value);
    }

    private function validateProviderModel(string $provider, string $model): void
    {
        $definition = $this->integrations->definition($provider);
        if ($definition === null) {
            throw new \InvalidArgumentException('Agent.provider is invalid.');
        }
        if (!$definition->supportsModels()) {
            throw new \InvalidArgumentException('Agent.provider does not support models.');
        }

        $settings = $this->settings->read($definition->name());
        if (!is_array($settings)) {
            throw new \InvalidArgumentException('Agent.provider is not enabled.');
        }

        $models = $settings['models'] ?? null;
        if (!is_array($models) || $models === []) {
            throw new \InvalidArgumentException('Agent.model is not available. Sync models first.');
        }

        $models = array_values(array_filter($models, 'is_string'));
        if (!in_array($model, $models, true)) {
            throw new \InvalidArgumentException('Agent.model is not available for this provider.');
        }
    }
}
