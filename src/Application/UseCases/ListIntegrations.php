<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class ListIntegrations
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;

    public function __construct(IntegrationCatalog $catalog, IntegrationSettingsStore $settings)
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $integrations = [];

        foreach ($this->catalog->list() as $definition) {
            $name = $definition->name();
            $integrations[] = [
                'name' => $name,
                'description' => $definition->description(),
                'fields' => $definition->toArray()['fields'],
                'supportsModels' => $definition->supportsModels(),
                'enabled' => $this->settings->exists($name),
            ];
        }

        return $integrations;
    }
}
