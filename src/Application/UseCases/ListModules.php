<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Modules\ModuleRegistry;

final class ListModules
{
    private ModuleRegistry $modules;

    public function __construct(ModuleRegistry $modules)
    {
        $this->modules = $modules;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        return array_values(array_map(
            static fn($module) => $module->toArray(),
            $this->modules->list()
        ));
    }
}
