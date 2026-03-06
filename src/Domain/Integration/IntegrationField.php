<?php

declare(strict_types=1);

namespace Manage\Domain\Integration;

final class IntegrationField
{
    private string $key;
    private string $label;
    private string $type;
    private bool $required;
    /** @var array<int, array{value: string, label: string}> */
    private array $options;

    /** @param array<int, array{value: string, label: string}> $options */
    private function __construct(string $key, string $label, string $type, bool $required, array $options)
    {
        $this->key = $key;
        $this->label = $label;
        $this->type = $type;
        $this->required = $required;
        $this->options = $options;
    }

    public static function fromArray(array $payload): self
    {
        $key = $payload['key'] ?? null;
        if (!is_string($key) || trim($key) === '') {
            throw new \InvalidArgumentException('IntegrationField.key is required.');
        }
        $key = trim($key);
        if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $key)) {
            throw new \InvalidArgumentException('IntegrationField.key must be alphanumeric with underscores.');
        }

        $label = $payload['label'] ?? null;
        if (!is_string($label) || trim($label) === '') {
            throw new \InvalidArgumentException('IntegrationField.label is required.');
        }

        $type = $payload['type'] ?? 'text';
        if (!is_string($type) || trim($type) === '') {
            throw new \InvalidArgumentException('IntegrationField.type must be a string.');
        }
        $type = strtolower(trim($type));
        if (!in_array($type, ['text', 'password', 'select'], true)) {
            throw new \InvalidArgumentException('IntegrationField.type must be text, password, or select.');
        }

        $required = $payload['required'] ?? false;
        if (!is_bool($required)) {
            throw new \InvalidArgumentException('IntegrationField.required must be boolean.');
        }

        $options = self::normalizeOptions($type, $payload['options'] ?? null);

        return new self($key, trim($label), $type, $required, $options);
    }

    public function key(): string
    {
        return $this->key;
    }

    public function label(): string
    {
        return $this->label;
    }

    public function type(): string
    {
        return $this->type;
    }

    public function isRequired(): bool
    {
        return $this->required;
    }

    /** @return array<int, array{value: string, label: string}> */
    public function options(): array
    {
        return $this->options;
    }

    public function toArray(): array
    {
        $payload = [
            'key' => $this->key,
            'label' => $this->label,
            'type' => $this->type,
            'required' => $this->required,
        ];

        if ($this->options !== []) {
            $payload['options'] = $this->options;
        }

        return $payload;
    }

    /** @return array<int, array{value: string, label: string}> */
    private static function normalizeOptions(string $type, mixed $optionsRaw): array
    {
        if ($type !== 'select') {
            return [];
        }

        if (!is_array($optionsRaw) || $optionsRaw === []) {
            throw new \InvalidArgumentException('IntegrationField.options is required for select fields.');
        }

        $options = [];
        $seen = [];

        foreach ($optionsRaw as $option) {
            if (!is_array($option)) {
                throw new \InvalidArgumentException('IntegrationField.options must contain objects.');
            }

            $value = $option['value'] ?? null;
            $label = $option['label'] ?? null;
            if (!is_string($value) || trim($value) === '') {
                throw new \InvalidArgumentException('IntegrationField.options[].value is required.');
            }
            if (!is_string($label) || trim($label) === '') {
                throw new \InvalidArgumentException('IntegrationField.options[].label is required.');
            }

            $value = trim($value);
            if (isset($seen[$value])) {
                throw new \InvalidArgumentException('IntegrationField.options values must be unique.');
            }

            $seen[$value] = true;
            $options[] = [
                'value' => $value,
                'label' => trim($label),
            ];
        }

        return $options;
    }
}
