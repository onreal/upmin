<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Update;

interface RepositorySource
{
    /** @return array<string, mixed> */
    public function fetchVersion(): array;

    public function downloadArchive(string $destination): void;
}
