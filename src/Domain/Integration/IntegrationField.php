<?php

declare(strict_types=1);

namespace Manage\Domain\Integration;

final class IntegrationField
{
    private string $key;
    private string $label;
    private string $type;
    private bool $required;

    private function __construct(string $key, string $label, string $type, bool $required)
    {
        $this->key = $key;
        $this->label = $label;
        $this->type = $type;
        $this->required = $required;
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
        if (!in_array($type, ['text', 'password'], true)) {
            throw new \InvalidArgumentException('IntegrationField.type must be text or password.');
        }

        $required = $payload['required'] ?? false;
        if (!is_bool($required)) {
            throw new \InvalidArgumentException('IntegrationField.required must be boolean.');
        }

        return new self($key, trim($label), $type, $required);
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

    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'label' => $this->label,
            'type' => $this->type,
            'required' => $this->required,
        ];
    }
}
