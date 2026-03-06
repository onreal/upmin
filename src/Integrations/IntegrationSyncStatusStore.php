<?php

declare(strict_types=1);

namespace Manage\Integrations;

final class IntegrationSyncStatusStore
{
    private string $root;

    public function __construct(IntegrationContext $context)
    {
        $this->root = rtrim($context->manageRoot(), '/') . '/store/system/integration-sync';
    }

    /** @return array<string, mixed> */
    public function read(string $name): array
    {
        $path = $this->pathForName($name);
        if ($path === null || !is_file($path)) {
            return $this->defaultStatus();
        }

        $raw = file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return $this->defaultStatus();
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $this->defaultStatus();
        }

        return $this->normalizeStatus($decoded);
    }

    /** @return array{started: bool, status: array<string, mixed>} */
    public function start(string $name, string $identity): array
    {
        $started = false;
        $status = $this->update($name, function (array $current) use ($identity, &$started): array {
            if (($current['syncing'] ?? false) === true) {
                return $current;
            }

            $started = true;
            return [
                'syncing' => true,
                'requestedBy' => trim($identity) !== '' ? trim($identity) : null,
                'startedAt' => $this->now(),
                'finishedAt' => null,
                'lastSyncedAt' => $current['lastSyncedAt'] ?? null,
                'lastError' => null,
            ];
        });

        return [
            'started' => $started,
            'status' => $status,
        ];
    }

    /** @return array<string, mixed> */
    public function complete(string $name): array
    {
        return $this->update($name, function (array $current): array {
            $finishedAt = $this->now();

            return [
                'syncing' => false,
                'requestedBy' => null,
                'startedAt' => $current['startedAt'] ?? null,
                'finishedAt' => $finishedAt,
                'lastSyncedAt' => $finishedAt,
                'lastError' => null,
            ];
        });
    }

    /** @return array<string, mixed> */
    public function fail(string $name, string $message): array
    {
        $message = trim($message);
        if ($message === '') {
            $message = 'Integration sync failed.';
        }

        return $this->update($name, function (array $current) use ($message): array {
            return [
                'syncing' => false,
                'requestedBy' => null,
                'startedAt' => $current['startedAt'] ?? null,
                'finishedAt' => $this->now(),
                'lastSyncedAt' => $current['lastSyncedAt'] ?? null,
                'lastError' => $message,
            ];
        });
    }

    /** @param callable(array<string, mixed>): array<string, mixed> $mutator
     *  @return array<string, mixed>
     */
    private function update(string $name, callable $mutator): array
    {
        $path = $this->pathForName($name);
        if ($path === null) {
            throw new \InvalidArgumentException('Invalid integration name.');
        }

        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create integration sync directory.');
        }

        $handle = fopen($path, 'c+');
        if ($handle === false) {
            throw new \RuntimeException('Unable to open integration sync status file.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new \RuntimeException('Unable to lock integration sync status file.');
            }

            rewind($handle);
            $raw = stream_get_contents($handle);
            $decoded = is_string($raw) && trim($raw) !== '' ? json_decode($raw, true) : null;
            $current = is_array($decoded) ? $this->normalizeStatus($decoded) : $this->defaultStatus();
            $next = $this->normalizeStatus($mutator($current));

            $encoded = json_encode($next, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            if ($encoded === false) {
                throw new \RuntimeException('Failed to encode integration sync status.');
            }

            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, $encoded . PHP_EOL);
            fflush($handle);
            flock($handle, LOCK_UN);

            return $next;
        } finally {
            fclose($handle);
        }
    }

    /** @return array<string, mixed> */
    private function defaultStatus(): array
    {
        return [
            'syncing' => false,
            'requestedBy' => null,
            'startedAt' => null,
            'finishedAt' => null,
            'lastSyncedAt' => null,
            'lastError' => null,
        ];
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    private function normalizeStatus(array $payload): array
    {
        return [
            'syncing' => ($payload['syncing'] ?? false) === true,
            'requestedBy' => isset($payload['requestedBy']) && is_string($payload['requestedBy']) && trim($payload['requestedBy']) !== ''
                ? trim($payload['requestedBy'])
                : null,
            'startedAt' => isset($payload['startedAt']) && is_string($payload['startedAt']) && trim($payload['startedAt']) !== ''
                ? trim($payload['startedAt'])
                : null,
            'finishedAt' => isset($payload['finishedAt']) && is_string($payload['finishedAt']) && trim($payload['finishedAt']) !== ''
                ? trim($payload['finishedAt'])
                : null,
            'lastSyncedAt' => isset($payload['lastSyncedAt']) && is_string($payload['lastSyncedAt']) && trim($payload['lastSyncedAt']) !== ''
                ? trim($payload['lastSyncedAt'])
                : null,
            'lastError' => isset($payload['lastError']) && is_string($payload['lastError']) && trim($payload['lastError']) !== ''
                ? trim($payload['lastError'])
                : null,
        ];
    }

    private function pathForName(string $name): ?string
    {
        $slug = $this->slug($name);
        if ($slug === '') {
            return null;
        }

        return $this->root . '/' . $slug . '.json';
    }

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';

        return trim($value, '-');
    }

    private function now(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
    }
}
