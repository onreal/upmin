<?php

declare(strict_types=1);

namespace Manage\Domain\Module;

final class ModuleDefinition
{
    private string $name;
    private string $description;
    private string $input;
    private string $output;
    private ?string $author;
    private array $parameters;
    private array $schema;
    private string $source;

    private function __construct(
        string $name,
        string $description,
        string $input,
        string $output,
        ?string $author,
        array $parameters,
        array $schema,
        string $source
    )
    {
        $this->name = $name;
        $this->description = $description;
        $this->input = $input;
        $this->output = $output;
        $this->author = $author;
        $this->parameters = $parameters;
        $this->schema = $schema;
        $this->source = $source;
    }

    public static function fromArray(array $payload, string $source): self
    {
        $name = $payload['name'] ?? null;
        if (!is_string($name) || trim($name) === '') {
            throw new \InvalidArgumentException('Module.name is required.');
        }

        $description = $payload['description'] ?? null;
        if (!is_string($description) || trim($description) === '') {
            throw new \InvalidArgumentException('Module.description is required.');
        }

        $input = $payload['input'] ?? null;
        if (!is_string($input) || trim($input) === '') {
            throw new \InvalidArgumentException('Module.input is required.');
        }

        $output = $payload['output'] ?? null;
        if (!is_string($output) || trim($output) === '') {
            throw new \InvalidArgumentException('Module.output is required.');
        }

        $author = null;
        if (array_key_exists('author', $payload)) {
            if ($payload['author'] !== null && !is_string($payload['author'])) {
                throw new \InvalidArgumentException('Module.author must be a string.');
            }
            $author = is_string($payload['author']) ? trim($payload['author']) : null;
        }

        $parameters = [];
        if (array_key_exists('parameters', $payload)) {
            if (!is_array($payload['parameters'])) {
                throw new \InvalidArgumentException('Module.parameters must be an object.');
            }
            $parameters = $payload['parameters'];
        }

        $schema = $payload['schema'] ?? null;
        if (!is_array($schema)) {
            throw new \InvalidArgumentException('Module.schema must be an object.');
        }

        return new self(
            trim($name),
            trim($description),
            trim($input),
            trim($output),
            $author,
            $parameters,
            $schema,
            $source
        );
    }

    public function name(): string
    {
        return $this->name;
    }

    public function description(): string
    {
        return $this->description;
    }

    public function input(): string
    {
        return $this->input;
    }

    public function output(): string
    {
        return $this->output;
    }

    public function author(): ?string
    {
        return $this->author;
    }

    public function parameters(): array
    {
        return $this->parameters;
    }

    public function schema(): array
    {
        return $this->schema;
    }

    public function source(): string
    {
        return $this->source;
    }

    public function toArray(): array
    {
        $payload = [
            'name' => $this->name,
            'description' => $this->description,
            'input' => $this->input,
            'output' => $this->output,
            'parameters' => $this->parameters,
            'schema' => $this->schema,
        ];

        if ($this->author !== null) {
            $payload['author'] = $this->author;
        }

        return $payload;
    }
}
