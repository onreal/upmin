<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class CreateAgent
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
     *  @return array<string, mixed>
     */
    public function handle(array $payload): array
    {
        $store = $payload['store'] ?? null;
        if (!is_string($store) || ($store !== 'public' && $store !== 'private')) {
            throw new \InvalidArgumentException('Agent.store must be public or private.');
        }

        $name = $this->requireString($payload, 'name', 'Agent.name is required.');
        $provider = strtolower($this->requireString($payload, 'provider', 'Agent.provider is required.'));
        $model = $this->requireString($payload, 'model', 'Agent.model is required.');
        $systemPrompt = $this->requireString($payload, 'systemPrompt', 'Agent.systemPrompt is required.');
        $adminPrompt = $this->requireString($payload, 'adminPrompt', 'Agent.adminPrompt is required.');
        $position = $this->normalizePosition($payload);

        $this->validateProviderModel($provider, $model);

        $language = null;
        if (array_key_exists('language', $payload)) {
            if (!is_string($payload['language'])) {
                throw new \InvalidArgumentException('Agent.language must be a string.');
            }
            $language = trim($payload['language']);
            if ($language === '') {
                $language = null;
            }
        }

        $order = null;
        if (array_key_exists('order', $payload)) {
            if (!is_int($payload['order'])) {
                throw new \InvalidArgumentException('Agent.order must be an integer.');
            }
            $order = $payload['order'];
        }
        if ($order === null) {
            $order = $this->nextOrder($store);
        }

        $path = $this->uniquePath($store, $name);

        $data = [
            'provider' => $provider,
            'model' => $model,
            'systemPrompt' => $systemPrompt,
            'adminPrompt' => $adminPrompt,
        ];

        if ($position !== null) {
            $data['position'] = $position;
        }

        $wrapper = DocumentWrapper::fromArray([
            'type' => 'agent',
            'page' => 'agents',
            'name' => $name,
            'language' => $language,
            'order' => $order,
            'data' => $data,
        ]);

        $document = new Document(DocumentId::fromParts($store, $path), $wrapper, $store, $path);
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

    private function nextOrder(string $store): int
    {
        $max = 0;
        foreach ($this->documents->listAll() as $document) {
            if ($document->store() !== $store) {
                continue;
            }
            $wrapper = $document->wrapper();
            if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents') {
                continue;
            }
            $max = max($max, $wrapper->order());
        }
        return $max + 1;
    }

    private function uniquePath(string $store, string $name): string
    {
        $slug = $this->slug($name);
        if ($slug === '') {
            $slug = 'agent';
        }

        $base = 'agents/' . $slug;
        $suffix = '';
        $counter = 1;

        while (true) {
            $path = $base . $suffix . '.json';
            $id = DocumentId::fromParts($store, $path);
            if ($this->documents->get($id) === null) {
                return $path;
            }
            $counter++;
            $suffix = '-' . $counter;
        }
    }

    private function normalizePosition(array $payload): ?string
    {
        if (!array_key_exists('position', $payload)) {
            return null;
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

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }
}
