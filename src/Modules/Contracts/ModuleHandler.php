<?php

declare(strict_types=1);

namespace Manage\Modules\Contracts;

use Manage\Domain\Module\ModuleDefinition;

interface ModuleHandler
{
    public function definition(): ModuleDefinition;

    public function controller(): object;
}
