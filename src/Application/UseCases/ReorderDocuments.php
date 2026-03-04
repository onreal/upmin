<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ReorderDocuments
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    public function handle(Document $target): Document
    {
        $store = $target->store();
        $isSection = $target->wrapper()->isSection();
        $pageKey = $target->wrapper()->page();

        $group = array_filter(
            $this->documents->listAll(),
            static function (Document $document) use ($store, $isSection, $pageKey): bool {
                if ($document->store() !== $store) {
                    return false;
                }
                if ($document->wrapper()->isSection() !== $isSection) {
                    return false;
                }
                if ($isSection && $document->wrapper()->page() !== $pageKey) {
                    return false;
                }
                return true;
            }
        );

        $group = array_values(array_filter(
            $group,
            static fn (Document $document) => !self::isSameDocument($document, $target)
        ));

        usort($group, [self::class, 'compareDocuments']);

        $desiredOrder = max(1, $target->wrapper()->order());
        $insertIndex = min($desiredOrder - 1, count($group));
        array_splice($group, $insertIndex, 0, [$target]);

        $updatedTarget = $target;
        $position = 1;
        foreach ($group as $document) {
            $wrapper = $document->wrapper();
            if ($wrapper->order() !== $position) {
                $document = $document->withWrapper($wrapper->withOrder($position));
            }
            if (self::isSameDocument($document, $target)) {
                $updatedTarget = $document;
            }
            $this->documents->save($document);
            $position++;
        }

        return $updatedTarget;
    }

    private static function isSameDocument(Document $a, Document $b): bool
    {
        return $a->store() === $b->store() && $a->path() === $b->path();
    }

    private static function compareDocuments(Document $a, Document $b): int
    {
        $orderA = $a->wrapper()->order();
        $orderB = $b->wrapper()->order();

        if ($orderA !== $orderB) {
            return $orderA <=> $orderB;
        }

        return strcmp($a->wrapper()->name(), $b->wrapper()->name());
    }
}
