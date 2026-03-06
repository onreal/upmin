<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Conversations;

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\Ports\RealtimePublisher;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Infrastructure\Realtime\RealtimeIdentity;

final class ConversationProgressTracker
{
    private DocumentRepository $documents;
    private RealtimePublisher $realtime;

    public function __construct(DocumentRepository $documents, RealtimePublisher $realtime)
    {
        $this->documents = $documents;
        $this->realtime = $realtime;
    }

    public function update(string $conversationId, string $message): void
    {
        $normalized = $this->normalizeMessage($message);
        if ($normalized === '') {
            return;
        }

        $document = $this->documents->get(DocumentId::fromEncoded($conversationId));
        if ($document === null) {
            return;
        }

        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->isSection()) {
            return;
        }

        $eventType = $this->eventTypeForPage($wrapper->page());
        if ($eventType === null) {
            return;
        }

        $data = $wrapper->data();
        if (!is_array($data) || ($data['pendingResponse'] ?? null) !== true) {
            return;
        }

        $items = $this->normalizeItems($data['progress']['items'] ?? null);
        $last = $items[count($items) - 1]['message'] ?? null;
        if ($last === $normalized) {
            return;
        }

        $timestamp = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
        $items[] = [
            'message' => $normalized,
            'createdAt' => $timestamp,
        ];

        $data['progress'] = [
            'status' => $normalized,
            'updatedAt' => $timestamp,
            'items' => array_slice($items, -6),
        ];
        $data['updatedAt'] = $timestamp;

        $updated = $document->withWrapper($wrapper->withData($data));
        $this->documents->save($updated);

        try {
            $this->realtime->publishToIdentity(
                RealtimeIdentity::fromUserId($this->resolveUserId($data)),
                [
                    'type' => $eventType,
                    'conversation' => $this->conversationPayload($updated),
                ]
            );
        } catch (\Throwable) {
            // Progress is already persisted and can be resynced on reconnect.
        }
    }

    /** @return array<int, array{message: string, createdAt: string|null}> */
    private function normalizeItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        $normalized = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $message = $this->normalizeMessage($item['message'] ?? '');
            if ($message === '') {
                continue;
            }

            $createdAt = isset($item['createdAt']) && is_string($item['createdAt']) && trim($item['createdAt']) !== ''
                ? trim($item['createdAt'])
                : null;

            $normalized[] = [
                'message' => $message,
                'createdAt' => $createdAt,
            ];
        }

        return $normalized;
    }

    private function normalizeMessage(mixed $message): string
    {
        if (!is_string($message)) {
            return '';
        }

        $normalized = trim(preg_replace('/\s+/', ' ', $message) ?? $message);
        if ($normalized === '') {
            return '';
        }

        if (function_exists('mb_substr')) {
            return mb_substr($normalized, 0, 180);
        }

        return substr($normalized, 0, 180);
    }

    private function eventTypeForPage(string $page): ?string
    {
        return match ($page) {
            'agent-conversations' => 'agent.conversation.updated',
            'chat-conversations' => 'chat.conversation.updated',
            default => null,
        };
    }

    private function resolveUserId(array $data): string
    {
        $userId = $data['userId'] ?? null;
        return is_string($userId) && trim($userId) !== '' ? trim($userId) : 'api-key';
    }

    /** @return array<string, mixed> */
    private function conversationPayload(Document $document): array
    {
        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
