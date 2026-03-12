<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Infrastructure\Creations\CreationStore;

final class ManageCreations
{
    private CreationStore $creations;

    public function __construct(CreationStore $creations)
    {
        $this->creations = $creations;
    }

    public function ensurePage(): void
    {
        $this->creations->ensurePage();
    }

    /** @return array<string, mixed> */
    public function snapshot(string $snapshotDataUrl): array
    {
        return $this->creations->snapshot($snapshotDataUrl, 'manual');
    }

    /** @return array<string, mixed> */
    public function clearAll(?string $snapshotDataUrl): array
    {
        return $this->creations->clearAll($snapshotDataUrl);
    }

    /** @return array<string, mixed> */
    public function restore(string $id): array
    {
        return $this->creations->restore($id);
    }

    /** @return array<string, mixed> */
    public function delete(string $id): array
    {
        return $this->creations->delete($id);
    }

    /** @return array{path: string, filename: string, mimeType: string} */
    public function downloadArchive(string $id): array
    {
        return $this->creations->downloadArchive($id);
    }

    /** @return array{path: string, filename: string, mimeType: string} */
    public function readSnapshotImage(string $id): array
    {
        return $this->creations->readSnapshotImage($id);
    }
}
