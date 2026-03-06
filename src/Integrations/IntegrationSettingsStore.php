<?php

declare(strict_types=1);

namespace Manage\Integrations;

use Manage\Domain\Integration\IntegrationId;

final class IntegrationSettingsStore
{
    private string $root;

    public function __construct(IntegrationContext $context)
    {
        $this->root = rtrim($context->manageRoot(), '/') . '/store/system';
    }

    public function exists(string $name): bool
    {
        $path = $this->pathForName($name);
        return $path !== null && is_file($path);
    }

    /** @return array<string, mixed>|null */
    public function read(string $name): ?array
    {
        $path = $this->pathForName($name);
        if ($path === null || !is_file($path)) {
            return null;
        }
        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            return null;
        }
        $existingId = $payload['id'] ?? null;
        if (!IntegrationId::isValid(is_string($existingId) ? $existingId : null)) {
            $payload['id'] = IntegrationId::fromName($name);
            $this->writePayload($path, $payload);
        }
        $data = $payload['data'] ?? null;
        return is_array($data) ? $data : null;
    }

    /** @param array<string, mixed> $data */
    public function write(string $name, array $data, string $label): void
    {
        $path = $this->pathForName($name);
        if ($path === null) {
            throw new \InvalidArgumentException('Invalid integration name.');
        }

        $payload = [
            'id' => IntegrationId::fromName($name),
            'type' => 'module',
            'page' => 'system',
            'name' => $label,
            'section' => true,
            'order' => 1,
            'data' => $data,
        ];

        $this->writePayload($path, $payload);
    }

    private function pathForName(string $name): ?string
    {
        $slug = $this->slug($name);
        if ($slug === '') {
            return null;
        }

        return $this->root . '/' . $slug . '-settings.json';
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
            throw new \RuntimeException('Unable to create integration settings directory.');
        }

        $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Failed to encode integration settings.');
        }

        file_put_contents($path, $encoded . PHP_EOL, LOCK_EX);
    }

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }
}
