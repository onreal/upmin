<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ListNavigation
{
    private DocumentRepository $documents;
    private EnsureModuleSettings $ensureModuleSettings;
    private EnsureFormPages $ensureFormPages;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(
        DocumentRepository $documents,
        EnsureModuleSettings $ensureModuleSettings,
        EnsureFormPages $ensureFormPages,
        EnsureDocumentId $ensureDocumentId
    )
    {
        $this->documents = $documents;
        $this->ensureModuleSettings = $ensureModuleSettings;
        $this->ensureFormPages = $ensureFormPages;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    /** @return array<string, mixed> */
    public function handle(): array
    {
        $pages = [];
        $sectionsByPage = [];
        $defaultLanguage = null;

        foreach ($this->documents->listAll() as $document) {
            $document = $this->ensureDocumentId->handle($document);
            if ($document->store() === 'private' && str_starts_with($document->path(), 'system/forms/')) {
                continue;
            }
            if ($document->store() === 'private' && $document->path() === 'system/configuration.json') {
                $data = $document->wrapper()->data();
                if (is_array($data)) {
                    $configured = $data['defaultLanguage'] ?? null;
                    if (is_string($configured)) {
                        $configured = trim($configured);
                        $defaultLanguage = $configured !== '' ? $configured : null;
                    }
                }
            }
            $type = $document->wrapper()->type();
            if (!in_array($type, ['page', 'module'], true)) {
                continue;
            }
            $this->ensureModuleSettings->handle($document->wrapper());
            $this->ensureFormPages->handle($document);
            if ($document->wrapper()->isSection()) {
                $pageKey = $document->wrapper()->page();
                $order = $document->wrapper()->order();
                $groupKey = is_int($order) ? ('order:' . $order) : ('path:' . $document->path());
                if (!isset($sectionsByPage[$pageKey])) {
                    $sectionsByPage[$pageKey] = [];
                }
                if (!isset($sectionsByPage[$pageKey][$groupKey])) {
                    $sectionsByPage[$pageKey][$groupKey] = [
                        'key' => $groupKey,
                        'order' => is_int($order) ? $order : null,
                        'variants' => [],
                    ];
                }
                $sectionsByPage[$pageKey][$groupKey]['variants'][] = $this->serializeDocument($document);
                continue;
            }
            $pageKey = $document->wrapper()->page();
            if (!isset($pages[$pageKey])) {
                $pages[$pageKey] = [];
            }
            $pages[$pageKey][] = $document;
        }

        $navigation = [];
        $pageKeys = array_unique(array_merge(array_keys($pages), array_keys($sectionsByPage)));

        foreach ($pageKeys as $pageKey) {
            $pageDocs = $pages[$pageKey] ?? [];
            $sectionGroups = $sectionsByPage[$pageKey] ?? [];
            $navigation[] = $this->buildPage($pageKey, $pageDocs, $sectionGroups);
        }

        return [
            'pages' => $navigation,
            'defaultLanguage' => $defaultLanguage,
        ];
    }

    /** @param Document[] $pageDocs @param array<string, array<string, mixed>> $sections */
    private function buildPage(string $pageKey, array $pageDocs, array $sections): array
    {
        $variants = [];
        foreach ($pageDocs as $pageDoc) {
            $variants[] = $this->serializeDocument($pageDoc);
        }
        usort($variants, [self::class, 'compareVariant']);

        $pagePayload = [
            'page' => $pageKey,
            'variants' => $variants,
            'sections' => array_values($sections),
        ];

        foreach ($pagePayload['sections'] as &$sectionGroup) {
            if (!isset($sectionGroup['variants']) || !is_array($sectionGroup['variants'])) {
                $sectionGroup['variants'] = [];
            }
            usort($sectionGroup['variants'], [self::class, 'compareVariant']);
        }

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

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    private static function compareVariant(array $a, array $b): int
    {
        return self::compareByOrder($a, $b);
    }

    /** @return array<string, mixed> */
    private function serializeDocument(Document $document): array
    {
        $wrapper = $document->wrapper();
        return [
            'id' => $document->id()->encoded(),
            'name' => $wrapper->name(),
            'language' => $wrapper->language(),
            'order' => $wrapper->order(),
            'store' => $document->store(),
            'path' => $document->path(),
            'position' => $wrapper->position(),
        ];
    }
}
