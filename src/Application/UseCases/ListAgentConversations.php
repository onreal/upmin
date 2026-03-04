<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;

final class ListAgentConversations
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(DocumentId $agentId, string $userId): array
    {
        $agentKey = $agentId->encoded();
        $conversations = [];

        foreach ($this->documents->listAll() as $document) {
            if (!$this->isConversation($document)) {
                continue;
            }

            $data = $document->wrapper()->data();
            if (!is_array($data)) {
                continue;
            }
            if (($data['agentId'] ?? null) !== $agentKey) {
                continue;
            }
            if (($data['userId'] ?? null) !== $userId) {
                continue;
            }

            $createdAt = is_string($data['createdAt'] ?? null) ? $data['createdAt'] : null;

            $conversations[] = [
                'id' => $document->id()->encoded(),
                'name' => $document->wrapper()->name(),
                'createdAt' => $createdAt,
                'store' => $document->store(),
                'path' => $document->path(),
            ];
        }

        usort($conversations, [self::class, 'compareByCreatedAt']);

        return $conversations;
    }

    private function isConversation(Document $document): bool
    {
        $wrapper = $document->wrapper();
        return $wrapper->type() === 'agent' && $wrapper->page() === 'agent-conversations' && !$wrapper->isSection();
    }

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    private static function compareByCreatedAt(array $a, array $b): int
    {
        $timeA = is_string($a['createdAt'] ?? null) ? strtotime($a['createdAt']) : false;
        $timeB = is_string($b['createdAt'] ?? null) ? strtotime($b['createdAt']) : false;
        $timeA = $timeA === false ? 0 : $timeA;
        $timeB = $timeB === false ? 0 : $timeB;

        if ($timeA !== $timeB) {
            return $timeB <=> $timeA;
        }

        return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
    }
}
