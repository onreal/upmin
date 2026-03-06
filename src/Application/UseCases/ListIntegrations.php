<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Integrations\IntegrationSyncStatusStore;

final class ListIntegrations
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;
    private IntegrationSyncStatusStore $statuses;

    public function __construct(
        IntegrationCatalog $catalog,
        IntegrationSettingsStore $settings,
        IntegrationSyncStatusStore $statuses
    )
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
        $this->statuses = $statuses;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $integrations = [];

        foreach ($this->catalog->list() as $definition) {
            $name = $definition->name();
            $status = $this->statuses->read($name);
            $integrations[] = [
                'id' => $definition->id(),
                'name' => $name,
                'description' => $definition->description(),
                'fields' => $definition->toArray()['fields'],
                'supportsModels' => $definition->supportsModels(),
                'enabled' => $this->settings->exists($name),
                'syncing' => ($status['syncing'] ?? false) === true,
                'lastSyncError' => $status['lastError'] ?? null,
                'lastSyncedAt' => $status['lastSyncedAt'] ?? null,
            ];
        }

        return $integrations;
    }
}
