<?php

declare(strict_types=1);

namespace Manage\Domain\Integration;

final class IntegrationDefinition
{
    private string $id;
    private string $name;
    private string $description;
    /** @var IntegrationField[] */
    private array $fields;
    private bool $supportsModels;
    private string $source;

    /** @param IntegrationField[] $fields */
    private function __construct(
        string $id,
        string $name,
        string $description,
        array $fields,
        bool $supportsModels,
        string $source
    )
    {
        $this->id = $id;
        $this->name = $name;
        $this->description = $description;
        $this->fields = $fields;
        $this->supportsModels = $supportsModels;
        $this->source = $source;
    }

    public static function fromArray(array $payload, string $source): self
    {
        $name = $payload['name'] ?? null;
        if (!is_string($name) || trim($name) === '') {
            throw new \InvalidArgumentException('Integration.name is required.');
        }

        $description = $payload['description'] ?? null;
        if (!is_string($description) || trim($description) === '') {
            throw new \InvalidArgumentException('Integration.description is required.');
        }

        $fieldsRaw = $payload['fields'] ?? null;
        if (!is_array($fieldsRaw)) {
            throw new \InvalidArgumentException('Integration.fields must be a list.');
        }

        $fields = [];
        foreach ($fieldsRaw as $field) {
            if (!is_array($field)) {
                throw new \InvalidArgumentException('Integration.fields must contain objects.');
            }
            $fields[] = IntegrationField::fromArray($field);
        }

        $supportsModels = $payload['supportsModels'] ?? false;
        if (!is_bool($supportsModels)) {
            throw new \InvalidArgumentException('Integration.supportsModels must be boolean.');
        }

        $id = IntegrationId::fromName(trim($name));

        return new self(
            $id,
            trim($name),
            trim($description),
            $fields,
            $supportsModels,
            $source
        );
    }

    public function id(): string
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function description(): string
    {
        return $this->description;
    }

    /** @return IntegrationField[] */
    public function fields(): array
    {
        return $this->fields;
    }

    public function supportsModels(): bool
    {
        return $this->supportsModels;
    }

    public function source(): string
    {
        return $this->source;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'fields' => array_map(static fn(IntegrationField $field) => $field->toArray(), $this->fields),
            'supportsModels' => $this->supportsModels,
        ];
    }
}
