<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\Ports\RealtimePublisher;
use Manage\Domain\Document\DocumentId;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Infrastructure\Realtime\RealtimeIdentity;

final class ProcessPendingAgentReply
{
    private DocumentRepository $documents;
    private AgentResponder $responder;
    private RealtimePublisher $realtime;

    public function __construct(
        DocumentRepository $documents,
        AgentResponder $responder,
        RealtimePublisher $realtime
    )
    {
        $this->documents = $documents;
        $this->responder = $responder;
        $this->realtime = $realtime;
    }

    public function handle(string $conversationId): void
    {
        $id = DocumentId::fromEncoded($conversationId);
        $document = $this->documents->get($id);
        if ($document === null) {
            return;
        }

        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agent-conversations' || $wrapper->isSection()) {
            return;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return;
        }

        $pending = $data['pendingResponse'] ?? null;
        if (!is_bool($pending) || !$pending) {
            return;
        }

        $messages = $data['messages'] ?? [];
        if (!is_array($messages)) {
            $messages = [];
        }

        $agentName = is_string($data['agentName'] ?? null) ? trim((string) $data['agentName']) : '';
        $agentId = is_string($data['agentId'] ?? null) ? trim((string) $data['agentId']) : null;
        $userId = is_string($data['userId'] ?? null) ? trim((string) $data['userId']) : 'api-key';

        try {
            $reply = $this->responder->reply($agentId !== '' ? $agentId : null, $agentName, $messages);
        } catch (\Throwable $exception) {
            $reply = $this->failureMessage($exception);
        }

        $messages[] = [
            'role' => 'assistant',
            'content' => $reply,
            'createdAt' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM),
        ];

        $data['messages'] = $messages;
        $data['updatedAt'] = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
        $data['pendingResponse'] = false;

        $updated = $document->withWrapper($wrapper->withData($data));
        $this->documents->save($updated);

        try {
            $this->realtime->publishToIdentity(
                RealtimeIdentity::fromUserId($userId),
                [
                    'type' => 'agent.conversation.updated',
                    'conversation' => [
                        'id' => $updated->id()->encoded(),
                        'store' => $updated->store(),
                        'path' => $updated->path(),
                        'payload' => $updated->wrapper()->toArray(),
                    ],
                ]
            );
        } catch (\Throwable) {
            // The updated conversation is already persisted; a reconnect can resync state later.
        }
    }

    private function failureMessage(\Throwable $exception): string
    {
        $message = trim($exception->getMessage());
        if ($message === '') {
            return 'Something went wrong while I was replying. Please try again.';
        }

        return 'Something went wrong while I was replying: ' . $message;
    }
}
