<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class GetIntegrationSettings
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;

    public function __construct(IntegrationCatalog $catalog, IntegrationSettingsStore $settings)
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
    }

    /** @return array<string, mixed>|null */
    public function handle(string $name): ?array
    {
        $definition = $this->catalog->definition($name);
        if ($definition === null) {
            return null;
        }

        $data = $this->settings->read($definition->name());
        if ($data === null) {
            return null;
        }

        return $data;
    }
}
