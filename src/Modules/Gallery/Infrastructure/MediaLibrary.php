<?php

declare(strict_types=1);

namespace Manage\Modules\Gallery\Infrastructure;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\ModuleContext;

final class MediaLibrary
{
    private ModuleDefinition $definition;
    private ModuleContext $context;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $this->context = $context;
    }

    /** @return array<int, array<string, mixed>> */
    public function list(?array $settings = null, ?string $visibility = null): array
    {
        $source = $this->resolveSource($settings);
        $visibilityValue = $this->normalizeVisibility($visibility, $source['visibility']);

        $roots = $this->resolveRoots($source['roots'] ?? []);
        $folder = $this->normalizePath($this->stringOrDefault($source['folder'] ?? null, ''));
        $extensions = $this->resolveExtensions($source['extensions'] ?? null);

        $items = [];
        foreach ($roots as $rootConfig) {
            if ($visibilityValue !== 'all' && $rootConfig['visibility'] !== $visibilityValue) {
                continue;
            }
            $root = $rootConfig['root'];
            if ($root === '') {
                continue;
            }
            $basePath = $rootConfig['visibility'] === 'public'
                ? $this->context->projectRoot()
                : $this->context->manageRoot();

            $targetDir = $basePath . '/' . $root;
            if ($folder !== '') {
                $targetDir .= '/' . $folder;
            }
            if (!is_dir($targetDir)) {
                continue;
            }

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($targetDir, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if (!$file instanceof \SplFileInfo || !$file->isFile()) {
                    continue;
                }
                $extension = strtolower($file->getExtension());
                if ($extensions !== [] && !in_array($extension, $extensions, true)) {
                    continue;
                }

                $filename = $file->getFilename();
                $relative = ltrim(str_replace($targetDir, '', $file->getPathname()), '/');
                $relative = str_replace('\\', '/', $relative);

                $urlBase = $rootConfig['visibility'] === 'public'
                    ? '/' . ltrim($root, '/')
                    : '/manage-media/' . ltrim($root, '/');
                $url = rtrim($urlBase, '/');
                if ($folder !== '') {
                    $url .= '/' . ltrim($folder, '/');
                }
                $url .= '/' . $relative;

                $items[] = [
                    'url' => $url,
                    'path' => $this->relativePath($root, $folder, $relative),
                    'filename' => $filename,
                    'visibility' => $rootConfig['visibility'],
                ];
            }
        }

        usort($items, static fn(array $a, array $b) => strcmp($a['filename'], $b['filename']));

        return $items;
    }

    public function delete(string $path, ?array $settings = null, ?string $visibility = null): bool
    {
        $path = $this->normalizeRelativePath($path);
        if ($path === '') {
            return false;
        }

        $source = $this->resolveSource($settings);
        $visibilityValue = $this->normalizeVisibility($visibility, $source['visibility']);
        $roots = $this->resolveRoots($source['roots'] ?? []);
        $folder = $this->normalizePath($this->stringOrDefault($source['folder'] ?? null, ''));

        foreach ($roots as $rootConfig) {
            if ($visibilityValue !== 'all' && $rootConfig['visibility'] !== $visibilityValue) {
                continue;
            }
            $root = $rootConfig['root'];
            if ($root === '') {
                continue;
            }
            $expectedPrefix = $root;
            if ($folder !== '') {
                $expectedPrefix .= '/' . $folder;
            }
            if (!str_starts_with($path, $expectedPrefix . '/')) {
                continue;
            }

            $basePath = $rootConfig['visibility'] === 'public'
                ? $this->context->projectRoot()
                : $this->context->manageRoot();

            $candidate = $basePath . '/' . $path;
            $realBase = realpath($basePath) ?: $basePath;
            $realCandidate = realpath($candidate) ?: $candidate;
            if (strpos($realCandidate, $realBase) !== 0) {
                continue;
            }
            if (!is_file($candidate)) {
                continue;
            }
            return unlink($candidate);
        }

        return false;
    }

    private function stringOrDefault(mixed $value, string $default): string
    {
        if (!is_string($value)) {
            return $default;
        }
        $trimmed = trim($value);
        return $trimmed === '' ? $default : $trimmed;
    }

    private function normalizePath(string $value): string
    {
        $value = trim($value);
        $value = str_replace('\\', '/', $value);
        $value = trim($value, '/');
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^[a-zA-Z0-9_\\-\\/]+$/', $value)) {
            return '';
        }
        if (str_contains($value, '..')) {
            return '';
        }
        return $value;
    }

    private function normalizeRelativePath(string $value): string
    {
        $value = trim($value);
        $value = str_replace('\\', '/', $value);
        $value = ltrim($value, '/');
        if ($value === '' || str_contains($value, '..')) {
            return '';
        }
        if (!preg_match('/^[a-zA-Z0-9_\\-\\/\\.]+$/', $value)) {
            return '';
        }
        return $value;
    }

    private function resolveSource(?array $settings): array
    {
        $source = $this->definition->parameters()['source'] ?? [];
        if (is_array($settings) && array_key_exists('source', $settings)) {
            $source = $settings['source'] ?? [];
        }
        return is_array($source) ? $source : [];
    }

    private function normalizeVisibility(?string $requested, mixed $default): string
    {
        $visibility = $this->stringOrDefault($requested, $this->stringOrDefault($default, 'all'));
        if (!in_array($visibility, ['public', 'private', 'all'], true)) {
            return 'all';
        }
        return $visibility;
    }

    /** @return array<int, array{visibility: string, root: string}> */
    private function resolveRoots(mixed $roots): array
    {
        $defaults = [
            ['visibility' => 'public', 'root' => 'media'],
            ['visibility' => 'private', 'root' => 'media'],
        ];

        if (!is_array($roots)) {
            return $defaults;
        }

        if (array_key_exists('public', $roots) || array_key_exists('private', $roots)) {
            $publicRoot = $this->normalizePath($this->stringOrDefault($roots['public'] ?? null, 'media'));
            $privateRoot = $this->normalizePath($this->stringOrDefault($roots['private'] ?? null, 'media'));
            return [
                ['visibility' => 'public', 'root' => $publicRoot],
                ['visibility' => 'private', 'root' => $privateRoot],
            ];
        }

        $resolved = [];
        foreach ($roots as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $visibility = $this->stringOrDefault($entry['visibility'] ?? null, 'public');
            if (!in_array($visibility, ['public', 'private'], true)) {
                continue;
            }
            $root = $this->normalizePath($this->stringOrDefault($entry['root'] ?? null, 'media'));
            $resolved[] = ['visibility' => $visibility, 'root' => $root];
        }

        return $resolved !== [] ? $resolved : $defaults;
    }

    /** @return string[] */
    private function resolveExtensions(mixed $extensions): array
    {
        $defaults = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
        if (!is_array($extensions)) {
            return $defaults;
        }
        $cleaned = [];
        foreach ($extensions as $entry) {
            if (!is_string($entry)) {
                continue;
            }
            $ext = strtolower(trim($entry));
            $ext = ltrim($ext, '.');
            if ($ext !== '') {
                $cleaned[] = $ext;
            }
        }
        return $cleaned !== [] ? array_values(array_unique($cleaned)) : $defaults;
    }

    private function relativePath(string $root, string $folder, string $relative): string
    {
        $segments = [$root];
        if ($folder !== '') {
            $segments[] = $folder;
        }
        $segments[] = $relative;
        return implode('/', $segments);
    }
}
