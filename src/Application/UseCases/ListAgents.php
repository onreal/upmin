<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;

final class ListAgents
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $agents = [];

        foreach ($this->documents->listAll() as $document) {
            if (!$this->isAgentDefinition($document)) {
                continue;
            }

            $wrapper = $document->wrapper();
            $agents[] = [
                'id' => $document->id()->encoded(),
                'name' => $wrapper->name(),
                'store' => $document->store(),
                'path' => $document->path(),
                'order' => $wrapper->order(),
            ];
        }

        usort($agents, [self::class, 'compareByOrder']);

        return $agents;
    }

    private function isAgentDefinition(Document $document): bool
    {
        $wrapper = $document->wrapper();
        return $wrapper->type() === 'agent' && $wrapper->page() === 'agents' && !$wrapper->isSection();
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
