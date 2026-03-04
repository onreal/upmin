<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsKey;
use Manage\Modules\ModuleSettingsStore;

final class EnsureModuleSettings
{
    private ModuleRegistry $modules;
    private ModuleSettingsStore $settings;

    public function __construct(ModuleRegistry $modules, ModuleSettingsStore $settings)
    {
        $this->modules = $modules;
        $this->settings = $settings;
    }

    public function handle(DocumentWrapper $wrapper): void
    {
        $moduleNames = $wrapper->modules();
        if ($moduleNames === []) {
            return;
        }

        foreach ($moduleNames as $moduleName) {
            $definition = $this->modules->definition($moduleName);
            if ($definition === null) {
                continue;
            }

            $key = ModuleSettingsKey::forDocument($wrapper, $moduleName);
            $label = $wrapper->name() . ' · ' . $definition->name();
            $legacyKey = null;
            if (!$wrapper->isSection()) {
                $legacyKey = ModuleSettingsKey::legacyModuleKey($moduleName);
            }
            $this->settings->ensureDefaults($key, $definition->parameters(), $label, $legacyKey);
        }
    }
}
