<?php

declare(strict_types=1);

namespace Manage\Modules\Uploader\Application;

use Manage\Modules\Uploader\Infrastructure\FileStorage;
use Manage\Modules\ModuleSettingsStore;

final class UploadImage
{
    private FileStorage $storage;
    private ModuleSettingsStore $settings;

    public function __construct(FileStorage $storage, ModuleSettingsStore $settings)
    {
        $this->storage = $storage;
        $this->settings = $settings;
    }

    /** @return array<string, mixed> */
    public function handle(array $file, ?string $settingsKey = null): array
    {
        $settings = null;
        if (is_string($settingsKey) && $settingsKey !== '') {
            $settings = $this->settings->read($settingsKey);
        }
        return $this->storage->store($file, $settings);
    }
}
