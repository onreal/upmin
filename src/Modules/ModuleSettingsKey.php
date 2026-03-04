<?php

declare(strict_types=1);

namespace Manage\Modules;

use Manage\Domain\Document\DocumentWrapper;

final class ModuleSettingsKey
{
    public static function forDocument(DocumentWrapper $wrapper, string $moduleName): string
    {
        $module = self::slug($moduleName) ?: 'module';
        if ($wrapper->isSection()) {
            $section = self::slug($wrapper->name()) ?: 'section';
            return $section . '-' . $module;
        }

        $page = self::slug($wrapper->page()) ?: 'page';
        return $page . '-' . $module;
    }

    public static function slug(string $value): string
    {
        $value = strtolower(trim($value));
        if ($value === '') {
            return '';
        }
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }

    public static function legacyModuleKey(string $moduleName): string
    {
        return self::slug($moduleName) ?: 'module';
    }
}
