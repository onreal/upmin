<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Update;

final class UpdaterStateStore
{
    private string $statePath;
    private string $lockPath;

    public function __construct(string $manageRoot)
    {
        $systemRoot = rtrim($manageRoot, '/') . '/store/system';
        $this->statePath = $systemRoot . '/updater-state.json';
        $this->lockPath = $systemRoot . '/updater.lock';
    }

    /** @return array<string, mixed> */
    public function read(): array
    {
        $this->ensureDirectory();

        if (!is_file($this->statePath)) {
            return $this->defaultState();
        }

        $raw = file_get_contents($this->statePath);
        if (!is_string($raw) || trim($raw) === '') {
            return $this->defaultState();
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $this->defaultState();
        }

        return array_replace($this->defaultState(), $decoded);
    }

    /** @param array<string, mixed> $state */
    public function write(array $state): void
    {
        $this->ensureDirectory();
        $payload = json_encode(array_replace($this->defaultState(), $state), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            throw new \RuntimeException('Failed to encode updater state.');
        }

        if (file_put_contents($this->statePath, $payload . PHP_EOL, LOCK_EX) === false) {
            throw new \RuntimeException('Failed to write updater state.');
        }
    }

    /** @return resource */
    public function acquire(): mixed
    {
        $this->ensureDirectory();

        $handle = fopen($this->lockPath, 'c+');
        if ($handle === false) {
            throw new \RuntimeException('Failed to open updater lock file.');
        }

        if (!flock($handle, LOCK_EX | LOCK_NB)) {
            fclose($handle);
            throw new \RuntimeException('An update is already running.');
        }

        return $handle;
    }

    public function release(mixed $handle): void
    {
        if (!is_resource($handle)) {
            return;
        }

        flock($handle, LOCK_UN);
        fclose($handle);
    }

    public function isActivelyLocked(): bool
    {
        $this->ensureDirectory();

        $handle = fopen($this->lockPath, 'c+');
        if ($handle === false) {
            return false;
        }

        $locked = !flock($handle, LOCK_EX | LOCK_NB);
        if (!$locked) {
            flock($handle, LOCK_UN);
        }

        fclose($handle);

        return $locked;
    }

    /** @return array<string, mixed> */
    public function reconcile(): array
    {
        $state = $this->read();
        $activelyLocked = $this->isActivelyLocked();
        $isRunning = ($state['status'] ?? null) === 'running';
        $isMarkedLocked = ($state['locked'] ?? false) === true;

        if (($isMarkedLocked || $isRunning) && $activelyLocked) {
            return $state;
        }

        if (!$isMarkedLocked && !$isRunning) {
            return $state;
        }

        $state['locked'] = false;
        if ($isRunning) {
            $state['status'] = 'failed';
            $state['message'] = 'The previous update did not complete.';
            $state['error'] = 'Updater lock was released unexpectedly.';
            $state['finishedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
        }

        $this->write($state);

        return $state;
    }

    private function ensureDirectory(): void
    {
        $dir = dirname($this->statePath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create updater state directory.');
        }
    }

    /** @return array<string, mixed> */
    private function defaultState(): array
    {
        return [
            'status' => 'idle',
            'locked' => false,
            'currentVersion' => null,
            'latestVersion' => null,
            'updateAvailable' => false,
            'startedAt' => null,
            'finishedAt' => null,
            'message' => null,
            'error' => null,
        ];
    }
}
