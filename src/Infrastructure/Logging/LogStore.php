<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Logging;

final class LogStore
{
    private string $storeRoot;

    public function __construct(string $manageRoot)
    {
        $this->storeRoot = rtrim($manageRoot, '/') . '/store';
    }

    public function logsRoot(): string
    {
        return $this->storeRoot . '/logs';
    }

    /** @return string[] */
    public function listErrorLogs(): array
    {
        $root = $this->logsRoot();
        if (!is_dir($root)) {
            return [];
        }

        $paths = glob($root . '/*-errors.json') ?: [];
        $relative = [];
        foreach ($paths as $path) {
            $name = basename($path);
            if ($name === 'errors.json') {
                continue;
            }
            $relative[] = 'logs/' . $name;
        }

        sort($relative);

        return $relative;
    }

    public function read(string $relativePath): ?array
    {
        $full = $this->fullPath($relativePath);
        if ($full === null || !is_file($full)) {
            return null;
        }
        $raw = file_get_contents($full);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    public function write(string $relativePath, array $payload): void
    {
        $full = $this->fullPath($relativePath);
        if ($full === null) {
            throw new \RuntimeException('Invalid log path.');
        }

        $dir = dirname($full);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create log directory.');
        }

        $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Failed to encode log payload.');
        }

        file_put_contents($full, $encoded . PHP_EOL, LOCK_EX);
    }

    private function fullPath(string $relativePath): ?string
    {
        $relativePath = str_replace('\\', '/', $relativePath);
        $relativePath = ltrim($relativePath, '/');
        if ($relativePath === '' || str_contains($relativePath, '..')) {
            return null;
        }

        return $this->storeRoot . '/' . $relativePath;
    }
}
