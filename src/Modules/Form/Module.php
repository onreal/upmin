<?php

declare(strict_types=1);

namespace Manage\Modules\Form;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\Contracts\ModuleHandler;
use Manage\Modules\Form\Interface\ModuleController as FormController;
use Manage\Modules\ModuleContext;

final class Module implements ModuleHandler
{
    private ModuleDefinition $definition;
    private object $controller;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $this->controller = new FormController($definition);
    }

    public function definition(): ModuleDefinition
    {
        return $this->definition;
    }

    public function controller(): object
    {
        return $this->controller;
    }
}
