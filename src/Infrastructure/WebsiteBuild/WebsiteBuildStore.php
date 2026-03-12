<?php

declare(strict_types=1);

namespace Manage\Infrastructure\WebsiteBuild;

use Manage\Infrastructure\Creations\CreationStore;

final class WebsiteBuildStore
{
    private const BUILD_DIR = 'build';
    /** @var array<string, bool> */
    private const EXCLUDED_BUILD_ITEMS = [
        'AGENTS.md' => true,
        'upmin' => true,
        'build' => true,
    ];

    private CreationStore $creations;
    private string $projectRoot;
    private string $buildRoot;
    private string $publicBuildRoot;

    public function __construct(string $projectRoot, CreationStore $creations)
    {
        $this->creations = $creations;
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->buildRoot = $this->projectRoot . '/' . self::BUILD_DIR;
        $this->publicBuildRoot = dirname($this->projectRoot) . '/' . self::BUILD_DIR;
    }

    /** @return array<string, mixed> */
    public function clean(?string $snapshotDataUrl): array
    {
        $this->ensureBuildDirectory();
        $creation = $this->snapshotBeforeClean($snapshotDataUrl);
        $entries = $this->managedEntries($this->buildRoot);

        foreach ($entries as $entry) {
            $this->deletePath($this->buildRoot . '/' . $entry);
        }

        $this->ensureBuildDirectory();

        $result = [
            'status' => 'cleaned',
            'entries' => count($entries),
            'cleanedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
        if ($creation !== null) {
            $result['creation'] = $creation;
        }

        return $result;
    }

    /** @return array<string, mixed> */
    public function copyFromPublic(?string $snapshotDataUrl): array
    {
        $this->ensureBuildDirectory();
        $creation = $this->snapshotBeforeClean($snapshotDataUrl);
        $this->cleanBuildDirectory();

        if (!is_dir($this->publicBuildRoot)) {
            throw new \RuntimeException('Public build directory not found.');
        }

        $entries = $this->copyEntriesFromPublic();

        $result = [
            'status' => 'copied',
            'entries' => count($entries),
            'copiedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
        if ($creation !== null) {
            $result['creation'] = $creation;
        }

        return $result;
    }

    private function cleanBuildDirectory(): void
    {
        foreach ($this->managedEntries($this->buildRoot) as $entry) {
            $this->deletePath($this->buildRoot . '/' . $entry);
        }
    }

    /** @return array<string, mixed>|null */
    private function snapshotBeforeClean(?string $snapshotDataUrl): ?array
    {
        if (!$this->creations->shouldCreateSnapshotOnEachClean()) {
            return null;
        }
        if (!is_string($snapshotDataUrl) || trim($snapshotDataUrl) === '') {
            throw new \InvalidArgumentException('Snapshot image is required.');
        }

        $result = $this->creations->snapshot(
            $snapshotDataUrl,
            'before-clear',
            CreationStore::TARGET_BUILD
        );

        return is_array($result['creation'] ?? null) ? $result['creation'] : null;
    }

    /** @return string[] */
    private function copyEntriesFromPublic(): array
    {
        $entries = $this->sourceEntries($this->publicBuildRoot);
        foreach ($entries as $entry) {
            $this->copyPath($this->publicBuildRoot . '/' . $entry, $this->buildRoot . '/' . $entry);
        }

        return $entries;
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
            if (isset(self::EXCLUDED_BUILD_ITEMS[$entry])) {
                continue;
            }
            $entries[] = $entry;
        }

        return $entries;
    }

    /** @return string[] */
    private function sourceEntries(string $root): array
    {
        if (!is_dir($root)) {
            return [];
        }

        $entries = [];
        foreach ($this->listEntries($root) as $entry) {
            if (str_starts_with($entry, '.')) {
                continue;
            }
            if (isset(self::EXCLUDED_BUILD_ITEMS[$entry])) {
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
