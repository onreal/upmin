<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentWrapper;

final class EnsureDocumentId
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    public function handle(Document $document, ?string $lockedId = null, bool $force = false): Document
    {
        $wrapper = $document->wrapper();
        $resolvedId = $this->resolveId($wrapper, $lockedId, $force);
        if ($resolvedId === $wrapper->id()) {
            return $document;
        }

        $updatedWrapper = $wrapper->withId($resolvedId);
        $updated = $document->withWrapper($updatedWrapper);
        $this->documents->save($updated);

        return $updated;
    }

    public function isValid(?string $value): bool
    {
        return $this->normalizeUuid($value) !== null;
    }

    private function resolveId(DocumentWrapper $wrapper, ?string $lockedId, bool $force): string
    {
        $current = $wrapper->id();
        $locked = $this->normalizeUuid($lockedId);
        if ($locked !== null) {
            return $locked;
        }

        if (!$force) {
            $existing = $this->normalizeUuid($current);
            if ($existing !== null) {
                return $existing;
            }
        }

        return $this->uuidV4();
    }

    private function normalizeUuid(?string $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (!preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        )) {
            return null;
        }

        return strtolower($value);
    }

    private function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
