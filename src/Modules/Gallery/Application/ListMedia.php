<?php

declare(strict_types=1);

namespace Manage\Modules\Gallery\Application;

use Manage\Modules\Gallery\Infrastructure\MediaLibrary;

final class ListMedia
{
    private MediaLibrary $library;

    public function __construct(MediaLibrary $library)
    {
        $this->library = $library;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(?array $settings = null, ?string $visibility = null): array
    {
        return $this->library->list($settings, $visibility);
    }

    public function delete(string $path, ?array $settings = null, ?string $visibility = null): bool
    {
        return $this->library->delete($path, $settings, $visibility);
    }
}
