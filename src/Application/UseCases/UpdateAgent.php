<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class UpdateAgent
{
    private DocumentRepository $documents;
    private IntegrationCatalog $integrations;
    private IntegrationSettingsStore $settings;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(
        DocumentRepository $documents,
        IntegrationCatalog $integrations,
        IntegrationSettingsStore $settings,
        EnsureDocumentId $ensureDocumentId
    )
    {
        $this->documents = $documents;
        $this->integrations = $integrations;
        $this->settings = $settings;
        $this->ensureDocumentId = $ensureDocumentId;
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

        $existingData = $wrapper->data();
        $existingPosition = null;
        if (is_array($existingData) && isset($existingData['position']) && is_string($existingData['position'])) {
            $existingPosition = strtolower(trim($existingData['position']));
        }
        if ($existingPosition === 'system') {
            throw new \InvalidArgumentException('System agents are read-only.');
        }

        $name = $this->requireString($payload, 'name', 'Agent.name is required.');
        $providerInput = $payload['provider'] ?? null;
        $providerIdInput = $payload['providerId'] ?? null;
        $definition = $this->resolveProvider($providerIdInput, $providerInput);
        $provider = $definition->name();
        $providerId = $definition->id();
        $model = $this->requireString($payload, 'model', 'Agent.model is required.');
        $systemPrompt = $this->requireString($payload, 'systemPrompt', 'Agent.systemPrompt is required.');
        $adminPrompt = $this->requireString($payload, 'adminPrompt', 'Agent.adminPrompt is required.');
        $position = $this->normalizePosition($payload, $existingPosition);

        $this->validateProviderModel($definition, $model);

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

        $data = [
            'provider' => $provider,
            'providerId' => $providerId,
            'model' => $model,
            'systemPrompt' => $systemPrompt,
            'adminPrompt' => $adminPrompt,
        ];
        if ($position !== null) {
            $data['position'] = $position;
        }

        $updatedWrapper = DocumentWrapper::fromArray([
            'type' => 'agent',
            'page' => 'agents',
            'name' => $name,
            'language' => $language,
            'order' => $order,
            'data' => $data,
        ]);

        $document = $document->withWrapper($updatedWrapper);
        $this->documents->save($document);
        $existingId = $wrapper->id();
        $forceId = !$this->ensureDocumentId->isValid($existingId);
        $document = $this->ensureDocumentId->handle($document, $existingId, $forceId);

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

    private function validateProviderModel(IntegrationDefinition $definition, string $model): void
    {
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

    private function normalizePosition(array $payload, ?string $existing): ?string
    {
        if (!array_key_exists('position', $payload)) {
            return $existing;
        }
        $value = $payload['position'];
        if ($value === null) {
            return null;
        }
        if (!is_string($value)) {
            throw new \InvalidArgumentException('Agent.position must be a string.');
        }
        $value = strtolower(trim($value));
        if ($value === '') {
            return null;
        }
        if (!in_array($value, ['system', 'module', 'page'], true)) {
            throw new \InvalidArgumentException('Agent.position must be system, module, or page.');
        }
        if ($value === 'system') {
            throw new \InvalidArgumentException('Agent.position cannot be system.');
        }
        return $value;
    }

    private function resolveProvider(mixed $providerId, mixed $provider): IntegrationDefinition
    {
        if (is_string($providerId) && trim($providerId) !== '') {
            $normalized = strtolower(trim($providerId));
            foreach ($this->integrations->list() as $definition) {
                if ($definition->id() === $normalized) {
                    return $definition;
                }
            }
            throw new \InvalidArgumentException('Agent.providerId is invalid.');
        }

        if (!is_string($provider) || trim($provider) === '') {
            throw new \InvalidArgumentException('Agent.provider is required.');
        }

        $definition = $this->integrations->definition(strtolower(trim($provider)));
        if ($definition === null) {
            throw new \InvalidArgumentException('Agent.provider is invalid.');
        }

        return $definition;
    }
}
