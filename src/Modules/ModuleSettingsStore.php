<?php

declare(strict_types=1);

namespace Manage\Modules;

final class ModuleSettingsStore
{
    private string $root;

    public function __construct(ModuleContext $context)
    {
        $this->root = rtrim($context->manageRoot(), '/') . '/store/modules';
    }

    /** @return array<string, mixed>|null */
    public function read(string $key): ?array
    {
        $path = $this->pathForKey($key);
        if ($path === null || !is_file($path)) {
            return null;
        }
        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            return null;
        }
        $data = $payload['data'] ?? null;
        return is_array($data) ? $data : null;
    }

    /** @param array<string, mixed> $data */
    public function ensureDefaults(string $key, array $data, string $label, ?string $legacyKey = null): void
    {
        $path = $this->pathForKey($key);
        if ($path === null) {
            return;
        }

        if (!is_file($path)) {
            $legacyPayload = $this->payloadForLegacy($legacyKey, $label, $data);
            if ($legacyPayload !== null) {
                $this->writePayload($path, $legacyPayload);
                return;
            }
            $this->writePayload($path, $this->defaultPayload($label, $data));
            return;
        }

        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            $this->writePayload($path, $this->defaultPayload($label, $data));
            return;
        }

        $existing = $payload['data'] ?? null;
        $existingData = is_array($existing) ? $existing : [];
        $merged = $this->mergeDefaults($data, $existingData);

        $needsWrite = false;
        if (($payload['type'] ?? null) !== 'module') {
            $payload['type'] = 'module';
            $needsWrite = true;
        }

        if ($merged !== $existingData) {
            $payload['data'] = $merged;
            $needsWrite = true;
        }

        if ($needsWrite) {
            $this->writePayload($path, $payload);
        }
    }

    private function pathForKey(string $key): ?string
    {
        $key = strtolower(trim($key));
        if ($key === '' || !preg_match('/^[a-z0-9-]+$/', $key)) {
            return null;
        }

        return $this->root . '/' . $key . '.json';
    }

    private function defaultPayload(string $label, array $data): array
    {
        return [
            'type' => 'module',
            'page' => 'modules',
            'name' => $label,
            'section' => true,
            'order' => 1,
            'data' => $data,
        ];
    }

    private function readPayload(string $path): ?array
    {
        $raw = file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writePayload(string $path, array $payload): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create module settings directory.');
        }

        $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Failed to encode module settings.');
        }

        file_put_contents($path, $encoded . PHP_EOL, LOCK_EX);
    }

    private function payloadForLegacy(?string $legacyKey, string $label, array $defaults): ?array
    {
        if ($legacyKey === null) {
            return null;
        }
        $legacyPath = $this->pathForKey($legacyKey);
        if ($legacyPath === null || !is_file($legacyPath)) {
            return null;
        }
        $payload = $this->readPayload($legacyPath);
        if (!is_array($payload)) {
            return null;
        }
        $existing = $payload['data'] ?? null;
        $existingData = is_array($existing) ? $existing : [];
        $payload['type'] = 'module';
        $payload['page'] = 'modules';
        $payload['name'] = $label;
        $payload['section'] = true;
        $payload['order'] = 1;
        $payload['data'] = $this->mergeDefaults($defaults, $existingData);
        return $payload;
    }

    /** @param array<string, mixed> $defaults @param array<string, mixed> $existing */
    private function mergeDefaults(array $defaults, array $existing): array
    {
        $merged = $existing;
        foreach ($defaults as $key => $value) {
            if (!array_key_exists($key, $existing)) {
                $merged[$key] = $value;
                continue;
            }
            if (is_array($value) && is_array($existing[$key])) {
                if ($this->isAssoc($value) && $this->isAssoc($existing[$key])) {
                    $merged[$key] = $this->mergeDefaults($value, $existing[$key]);
                } else {
                    $merged[$key] = $existing[$key] === [] ? $value : $existing[$key];
                }
            }
        }
        return $merged;
    }

    private function isAssoc(array $value): bool
    {
        return $value !== [] && array_keys($value) !== range(0, count($value) - 1);
    }
}
