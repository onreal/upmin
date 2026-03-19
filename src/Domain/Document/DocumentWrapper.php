<?php

declare(strict_types=1);

namespace Manage\Domain\Document;

final class DocumentWrapper
{
    private ?string $id;
    private string $type;
    private string $page;
    private string $name;
    private ?string $language;
    private int $order;
    private bool $section;
    /** @var string[] */
    private array $modules;
    private ?string $position;
    private ?string $positionView;
    private mixed $data;

    private function __construct(
        ?string $id,
        string $type,
        string $page,
        string $name,
        ?string $language,
        int $order,
        bool $section,
        array $modules,
        ?string $position,
        ?string $positionView,
        mixed $data
    )
    {
        $this->id = $id;
        $this->type = $type;
        $this->page = $page;
        $this->name = $name;
        $this->language = $language;
        $this->order = $order;
        $this->section = $section;
        $this->modules = $modules;
        $this->position = $position;
        $this->positionView = $positionView;
        $this->data = $data;
    }

    public static function fromArray(array $payload): self
    {
        $id = null;
        if (array_key_exists('id', $payload)) {
            if (is_string($payload['id'])) {
                $trimmed = trim($payload['id']);
                if ($trimmed !== '') {
                    $id = $trimmed;
                }
            }
        }
        $type = $payload['type'] ?? 'page';
        if (!is_string($type) || trim($type) === '') {
            throw new \InvalidArgumentException('Document.type must be a non-empty string.');
        }
        $type = strtolower(trim($type));
        if (!in_array($type, ['page', 'module', 'agent', 'log'], true)) {
            throw new \InvalidArgumentException('Document.type must be one of: page, module, agent, log.');
        }
        if (!isset($payload['page']) || !is_string($payload['page']) || trim($payload['page']) === '') {
            throw new \InvalidArgumentException('Document.page is required.');
        }
        if (!isset($payload['name']) || !is_string($payload['name']) || trim($payload['name']) === '') {
            throw new \InvalidArgumentException('Document.name is required.');
        }
        $sectionValue = $payload['section'] ?? null;
        if ($sectionValue === null && in_array($type, ['agent', 'log'], true)) {
            $sectionValue = false;
        }
        if (!is_bool($sectionValue)) {
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

        $position = null;
        if (array_key_exists('position', $payload) && $payload['position'] !== null) {
            if (!is_string($payload['position'])) {
                throw new \InvalidArgumentException('Document.position must be a string.');
            }
            $position = strtolower(trim($payload['position']));
            if ($position === '') {
                $position = null;
            } elseif ($position !== 'system') {
                throw new \InvalidArgumentException('Document.position must be system.');
            }
        }

        $positionView = null;
        if (array_key_exists('position_view', $payload) && $payload['position_view'] !== null) {
            if (!is_string($payload['position_view'])) {
                throw new \InvalidArgumentException('Document.position_view must be a string.');
            }
            $positionView = strtolower(trim($payload['position_view']));
            if ($positionView === '') {
                $positionView = null;
            } elseif (!in_array($positionView, ['settings', 'sidebar', 'header', 'footer'], true)) {
                throw new \InvalidArgumentException('Document.position_view must be one of: settings, sidebar, header, footer.');
            }
        }

        return new self(
            $id,
            $type,
            trim($payload['page']),
            trim($payload['name']),
            $language,
            $order,
            $sectionValue,
            $modules,
            $position,
            $positionView,
            $payload['data']
        );
    }

    public function id(): ?string
    {
        return $this->id;
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

    public function position(): ?string
    {
        return $this->position;
    }

    public function positionView(): ?string
    {
        return $this->positionView;
    }

    public function data(): mixed
    {
        return $this->data;
    }

    public function withData(mixed $data): self
    {
        return new self($this->id, $this->type, $this->page, $this->name, $this->language, $this->order, $this->section, $this->modules, $this->position, $this->positionView, $data);
    }

    public function withOrder(int $order): self
    {
        return new self($this->id, $this->type, $this->page, $this->name, $this->language, $order, $this->section, $this->modules, $this->position, $this->positionView, $this->data);
    }

    public function withId(string $id): self
    {
        return new self($id, $this->type, $this->page, $this->name, $this->language, $this->order, $this->section, $this->modules, $this->position, $this->positionView, $this->data);
    }

    public function toArray(): array
    {
        $payload = [
            'type' => $this->type,
            'page' => $this->page,
            'name' => $this->name,
            'data' => $this->data,
        ];

        if ($this->id !== null) {
            $payload['id'] = $this->id;
        }

        if (in_array($this->type, ['page', 'module'], true)) {
            $payload['section'] = $this->section;
        }

        if ($this->language !== null) {
            $payload['language'] = $this->language;
        }
        if ($this->modules !== []) {
            $payload['modules'] = $this->modules;
        }
        if ($this->position !== null) {
            $payload['position'] = $this->position;
        }
        if ($this->positionView !== null) {
            $payload['position_view'] = $this->positionView;
        }
        $payload['order'] = $this->order;

        return $payload;
    }
}
