<?php

declare(strict_types=1);

namespace Manage\Infrastructure\WebsiteBuild;

final class WebsiteBuildStore
{
    private const BUILD_DIR = 'build';
    /** @var array<string, bool> */
    private const EXCLUDED_ROOT_ITEMS = [
        'AGENTS.md' => true,
        'manage' => true,
        'upmin' => true,
    ];

    private string $projectRoot;
    private string $buildRoot;

    public function __construct(string $projectRoot)
    {
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->buildRoot = $this->projectRoot . '/' . self::BUILD_DIR;
    }

    /** @return array{status: string, entries: int, cleanedAt: string} */
    public function clean(): array
    {
        $entries = $this->managedEntries($this->projectRoot);

        foreach ($entries as $entry) {
            $this->deletePath($this->projectRoot . '/' . $entry);
        }

        $this->ensureBuildDirectory();

        return [
            'status' => 'cleaned',
            'entries' => count($entries),
            'cleanedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
    }

    /** @return array{status: string, entries: int, publishedAt: string} */
    public function publish(): array
    {
        $this->ensureBuildDirectory();
        $entries = $this->listEntries($this->buildRoot);

        if (count($entries) === 0) {
            throw new \InvalidArgumentException('Build directory is empty.');
        }

        foreach ($entries as $entry) {
            if ($entry === self::BUILD_DIR) {
                continue;
            }
            $this->copyPath($this->buildRoot . '/' . $entry, $this->projectRoot . '/' . $entry);
        }

        return [
            'status' => 'published',
            'entries' => count($entries),
            'publishedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
    }

    private function ensureBuildDirectory(): void
    {
        if (is_dir($this->buildRoot)) {
            return;
        }
        if (!mkdir($this->buildRoot, 0755, true) && !is_dir($this->buildRoot)) {
            throw new \RuntimeException('Failed to create build directory.');
        }
    }

    /** @return string[] */
    private function listEntries(string $root): array
    {
        $items = scandir($root);
        if (!is_array($items)) {
            return [];
        }

        $entries = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $entries[] = $item;
        }

        sort($entries);

        return $entries;
    }

    /** @return string[] */
    private function managedEntries(string $root): array
    {
        if (!is_dir($root)) {
            return [];
        }

        $entries = [];
        foreach ($this->listEntries($root) as $entry) {
            if (str_starts_with($entry, '.')) {
                continue;
            }
            if (isset(self::EXCLUDED_ROOT_ITEMS[$entry])) {
                continue;
            }
            $entries[] = $entry;
        }

        return $entries;
    }

    private function copyPath(string $source, string $target): void
    {
        if (is_link($source)) {
            $linkTarget = readlink($source);
            if ($linkTarget === false) {
                throw new \RuntimeException('Failed to read build link.');
            }
            if (file_exists($target) || is_link($target)) {
                @unlink($target);
            }
            if (!symlink($linkTarget, $target)) {
                throw new \RuntimeException('Failed to copy build link.');
            }
            return;
        }

        if (is_dir($source)) {
            if (is_file($target) || is_link($target)) {
                $this->deletePath($target);
            }
            if (!is_dir($target) && !mkdir($target, 0755, true) && !is_dir($target)) {
                throw new \RuntimeException('Failed to create publish directory.');
            }
            $items = scandir($source);
            if (!is_array($items)) {
                return;
            }
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->copyPath($source . '/' . $item, $target . '/' . $item);
            }
            return;
        }

        $dir = dirname($target);
        if (is_dir($target)) {
            $this->deletePath($target);
        }
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create publish directory.');
        }
        if (!copy($source, $target)) {
            throw new \RuntimeException('Failed to publish build file.');
        }
    }

    private function deletePath(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);
            return;
        }
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if (is_array($items)) {
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->deletePath($path . '/' . $item);
            }
        }

        @rmdir($path);
    }
}
