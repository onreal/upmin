<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Domain\Integration\IntegrationField;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;

final class UpsertIntegrationSettings
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;

    public function __construct(IntegrationCatalog $catalog, IntegrationSettingsStore $settings)
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function handle(string $name, array $payload): array
    {
        $definition = $this->catalog->definition($name);
        if ($definition === null) {
            throw new \InvalidArgumentException('Integration not found.');
        }

        $existing = $this->settings->read($definition->name());
        $existingData = is_array($existing) ? $existing : [];

        $data = [];
        foreach ($definition->fields() as $field) {
            $key = $field->key();
            $value = $payload[$key] ?? null;
            if ($this->isMissingValue($value) && array_key_exists($key, $existingData)) {
                $existingValue = $existingData[$key];
                if (is_string($existingValue) && trim($existingValue) !== '') {
                    $data[$key] = $existingValue;
                    continue;
                }
            }
            $data[$key] = $this->normalizeField($field, $value);
        }

        $models = [];
        if (is_array($existing) && array_key_exists('models', $existing) && is_array($existing['models'])) {
            $models = array_values(array_filter($existing['models'], 'is_string'));
        }

        $data['models'] = $models;

        $label = 'Integration: ' . $definition->name();
        $this->settings->write($definition->name(), $data, $label);

        return $data;
    }

    private function isMissingValue(mixed $value): bool
    {
        if ($value === null) {
            return true;
        }
        if (is_string($value) && trim($value) === '') {
            return true;
        }
        return false;
    }

    private function normalizeField(IntegrationField $field, mixed $value): ?string
    {
        if ($value === null) {
            if ($field->isRequired()) {
                throw new \InvalidArgumentException('Integration.' . $field->key() . ' is required.');
            }
            return null;
        }

        if (!is_string($value)) {
            throw new \InvalidArgumentException('Integration.' . $field->key() . ' must be a string.');
        }

        $value = trim($value);
        if ($value === '') {
            if ($field->isRequired()) {
                throw new \InvalidArgumentException('Integration.' . $field->key() . ' is required.');
            }
            return null;
        }

        return $value;
    }
}
