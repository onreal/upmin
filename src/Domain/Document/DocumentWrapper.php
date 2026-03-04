<?php

declare(strict_types=1);

namespace Manage\Domain\Document;

final class DocumentWrapper
{
    private string $type;
    private string $page;
    private string $name;
    private ?string $language;
    private int $order;
    private bool $section;
    /** @var string[] */
    private array $modules;
    private mixed $data;

    private function __construct(
        string $type,
        string $page,
        string $name,
        ?string $language,
        int $order,
        bool $section,
        array $modules,
        mixed $data
    )
    {
        $this->type = $type;
        $this->page = $page;
        $this->name = $name;
        $this->language = $language;
        $this->order = $order;
        $this->section = $section;
        $this->modules = $modules;
        $this->data = $data;
    }

    public static function fromArray(array $payload): self
    {
        $type = $payload['type'] ?? 'page';
        if (!is_string($type) || trim($type) === '') {
            throw new \InvalidArgumentException('Document.type must be a non-empty string.');
        }
        $type = strtolower(trim($type));
        if (!in_array($type, ['page', 'module', 'agent'], true)) {
            throw new \InvalidArgumentException('Document.type must be one of: page, module, agent.');
        }
        if (!isset($payload['page']) || !is_string($payload['page']) || trim($payload['page']) === '') {
            throw new \InvalidArgumentException('Document.page is required.');
        }
        if (!isset($payload['name']) || !is_string($payload['name']) || trim($payload['name']) === '') {
            throw new \InvalidArgumentException('Document.name is required.');
        }
        if (!array_key_exists('section', $payload) || !is_bool($payload['section'])) {
            throw new \InvalidArgumentException('Document.section must be boolean.');
        }
        if (!array_key_exists('data', $payload)) {
            throw new \InvalidArgumentException('Document.data is required.');
        }

        $language = null;
        if (isset($payload['language'])) {
            if (!is_string($payload['language'])) {
                throw new \InvalidArgumentException('Document.language must be a string.');
            }
            $language = $payload['language'];
        }

        if (!array_key_exists('order', $payload) || !is_int($payload['order'])) {
            throw new \InvalidArgumentException('Document.order must be an integer.');
        }
        $order = $payload['order'];

        $modules = [];
        if (array_key_exists('modules', $payload)) {
            if (!is_array($payload['modules'])) {
                throw new \InvalidArgumentException('Document.modules must be an array.');
            }
            foreach ($payload['modules'] as $module) {
                if (!is_string($module)) {
                    throw new \InvalidArgumentException('Document.modules must contain strings.');
                }
                $module = trim($module);
                if ($module !== '') {
                    $modules[] = $module;
                }
            }
        }
        if (array_key_exists('module', $payload)) {
            if ($payload['module'] !== null && !is_string($payload['module'])) {
                throw new \InvalidArgumentException('Document.module must be a string.');
            }
            $module = is_string($payload['module']) ? trim($payload['module']) : null;
            if ($module !== null && $module !== '') {
                $modules[] = $module;
            }
        }
        $modules = array_values(array_unique($modules));

        return new self(
            $type,
            trim($payload['page']),
            trim($payload['name']),
            $language,
            $order,
            $payload['section'],
            $modules,
            $payload['data']
        );
    }

    public function page(): string
    {
        return $this->page;
    }

    public function type(): string
    {
        return $this->type;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function language(): ?string
    {
        return $this->language;
    }

    public function order(): int
    {
        return $this->order;
    }

    public function isSection(): bool
    {
        return $this->section;
    }

    /** @return string[] */
    public function modules(): array
    {
        return $this->modules;
    }

    public function data(): mixed
    {
        return $this->data;
    }

    public function withData(mixed $data): self
    {
        return new self($this->type, $this->page, $this->name, $this->language, $this->order, $this->section, $this->modules, $data);
    }

    public function withOrder(int $order): self
    {
        return new self($this->type, $this->page, $this->name, $this->language, $order, $this->section, $this->modules, $this->data);
    }

    public function toArray(): array
    {
        $payload = [
            'type' => $this->type,
            'page' => $this->page,
            'name' => $this->name,
            'section' => $this->section,
            'data' => $this->data,
        ];

        if ($this->language !== null) {
            $payload['language'] = $this->language;
        }
        if ($this->modules !== []) {
            $payload['modules'] = $this->modules;
        }
        $payload['order'] = $this->order;

        return $payload;
    }
}
