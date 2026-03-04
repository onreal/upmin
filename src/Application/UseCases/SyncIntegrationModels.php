<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class SyncIntegrationModels
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;

    public function __construct(IntegrationCatalog $catalog, IntegrationSettingsStore $settings)
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
    }

    /** @return array<string, mixed> */
    public function handle(string $name): array
    {
        $handler = $this->catalog->handler($name);
        $definition = $this->catalog->definition($name);
        if ($handler === null || $definition === null) {
            throw new \InvalidArgumentException('Integration not found.');
        }

        if (!$definition->supportsModels()) {
            throw new \InvalidArgumentException('Integration does not support model sync.');
        }

        $data = $this->settings->read($definition->name());
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Integration settings not found.');
        }

        $models = $handler->fetchModels($data);
        $models = array_values(array_filter(array_map(static fn($model) => is_string($model) ? trim($model) : '', $models)));
        $models = array_values(array_unique(array_filter($models, static fn($model) => $model !== '')));

        $data['models'] = $models;

        $label = 'Integration: ' . $definition->name();
        $this->settings->write($definition->name(), $data, $label);

        return $data;
    }
}
