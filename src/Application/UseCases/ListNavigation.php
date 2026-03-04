<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ListNavigation
{
    private DocumentRepository $documents;
    private EnsureModuleSettings $ensureModuleSettings;

    public function __construct(DocumentRepository $documents, EnsureModuleSettings $ensureModuleSettings)
    {
        $this->documents = $documents;
        $this->ensureModuleSettings = $ensureModuleSettings;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $pages = [];
        $sectionsByPage = [];

        foreach ($this->documents->listAll() as $document) {
            $this->ensureModuleSettings->handle($document->wrapper());
            if ($document->wrapper()->isSection()) {
                $sectionsByPage[$document->wrapper()->page()][] = $document;
                continue;
            }
            $pages[$document->wrapper()->page()] = $document;
        }

        $navigation = [];
        $pageKeys = array_unique(array_merge(array_keys($pages), array_keys($sectionsByPage)));

        foreach ($pageKeys as $pageKey) {
            $pageDoc = $pages[$pageKey] ?? null;
            $sectionDocs = $sectionsByPage[$pageKey] ?? [];
            $navigation[] = $this->buildPage($pageKey, $pageDoc, $sectionDocs);
        }

        usort($navigation, [self::class, 'compareByOrder']);

        return $navigation;
    }

    /** @param Document[] $sections */
    private function buildPage(string $pageKey, ?Document $pageDoc, array $sections): array
    {
        $name = $pageDoc?->wrapper()->name() ?? $pageKey;
        $language = $pageDoc?->wrapper()->language();

        $pagePayload = [
            'page' => $pageKey,
            'name' => $name,
            'language' => $language,
            'order' => $pageDoc?->wrapper()->order(),
            'documentId' => $pageDoc?->id()->encoded(),
            'store' => $pageDoc?->store(),
            'path' => $pageDoc?->path(),
            'sections' => [],
        ];

        foreach ($sections as $section) {
            $pagePayload['sections'][] = [
                'id' => $section->id()->encoded(),
                'name' => $section->wrapper()->name(),
                'language' => $section->wrapper()->language(),
                'order' => $section->wrapper()->order(),
                'store' => $section->store(),
                'path' => $section->path(),
            ];
        }

        usort($pagePayload['sections'], [self::class, 'compareByOrder']);

        return $pagePayload;
    }

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    private static function compareByOrder(array $a, array $b): int
    {
        $orderA = is_int($a['order'] ?? null) ? $a['order'] : PHP_INT_MAX;
        $orderB = is_int($b['order'] ?? null) ? $b['order'] : PHP_INT_MAX;

        if ($orderA !== $orderB) {
            return $orderA <=> $orderB;
        }

        return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
    }
}
