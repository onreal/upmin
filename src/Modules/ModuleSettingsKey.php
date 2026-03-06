<?php

declare(strict_types=1);

namespace Manage\Modules;

use Manage\Domain\Document\DocumentWrapper;

final class ModuleSettingsKey
{
    public static function forDocument(DocumentWrapper $wrapper, string $moduleName): string
    {
        $module = self::slug($moduleName) ?: 'module';
        $documentId = self::normalizeId($wrapper->id());
        if ($documentId === null) {
            return '';
        }

        return $documentId . '-' . $module;
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

    public static function normalizeKey(string $value): ?string
    {
        $value = strtolower(trim($value));
        if ($value === '') {
            return null;
        }
        if (!preg_match('/^[a-z0-9-]+$/', $value)) {
            return null;
        }

        return $value;
    }

    private static function normalizeId(?string $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (!preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        )) {
            return null;
        }

        return strtolower($value);
    }
}
