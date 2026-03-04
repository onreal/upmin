<?php

declare(strict_types=1);

namespace Manage\Modules\Uploader;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\Contracts\ModuleHandler;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleSettingsStore;
use Manage\Modules\Uploader\Application\UploadImage;
use Manage\Modules\Uploader\Interface\ModuleController as UploaderController;
use Manage\Modules\Uploader\Infrastructure\FileStorage;

final class Module implements ModuleHandler
{
    private ModuleDefinition $definition;
    private object $controller;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $settingsStore = new ModuleSettingsStore($context);
        $uploadImage = new UploadImage(new FileStorage($definition, $context), $settingsStore);
        $this->controller = new UploaderController($this->definition, $uploadImage);
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
