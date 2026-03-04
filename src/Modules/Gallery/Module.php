<?php

declare(strict_types=1);

namespace Manage\Modules\Gallery;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\Contracts\ModuleHandler;
use Manage\Modules\Gallery\Application\ListMedia;
use Manage\Modules\Gallery\Infrastructure\MediaLibrary;
use Manage\Modules\Gallery\Interface\ModuleController as GalleryController;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleSettingsStore;

final class Module implements ModuleHandler
{
    private ModuleDefinition $definition;
    private object $controller;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $settingsStore = new ModuleSettingsStore($context);
        $listMedia = new ListMedia(new MediaLibrary($definition, $context));
        $this->controller = new GalleryController($definition, $listMedia, $settingsStore);
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
