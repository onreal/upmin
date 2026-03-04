<?php

declare(strict_types=1);

namespace Manage\Domain\Document;

final class Document
{
    private DocumentId $id;
    private DocumentWrapper $wrapper;
    private string $store;
    private string $path;

    public function __construct(DocumentId $id, DocumentWrapper $wrapper, string $store, string $path)
    {
        $this->id = $id;
        $this->wrapper = $wrapper;
        $this->store = $store;
        $this->path = $path;
    }

    public function id(): DocumentId
    {
        return $this->id;
    }

    public function wrapper(): DocumentWrapper
    {
        return $this->wrapper;
    }

    public function store(): string
    {
        return $this->store;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function withWrapper(DocumentWrapper $wrapper): self
    {
        return new self($this->id, $wrapper, $this->store, $this->path);
    }
}
