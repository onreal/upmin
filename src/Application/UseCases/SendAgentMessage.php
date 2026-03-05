<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\RealtimePublisher;
use Manage\Domain\Document\DocumentId;
use Manage\Infrastructure\Realtime\RealtimeIdentity;
use Manage\Infrastructure\Workers\ReplyWorkerLauncher;

final class SendAgentMessage
{
    private AppendAgentMessage $appendMessage;
    private RealtimePublisher $realtime;
    private ReplyWorkerLauncher $worker;

    public function __construct(
        AppendAgentMessage $appendMessage,
        RealtimePublisher $realtime,
        ReplyWorkerLauncher $worker
    )
    {
        $this->appendMessage = $appendMessage;
        $this->realtime = $realtime;
        $this->worker = $worker;
    }

    /** @return array<string, mixed>|null */
    public function handle(DocumentId $conversationId, string $userId, string $content): ?array
    {
        $conversation = $this->appendMessage->handle($conversationId, $userId, $content, 'user');
        if ($conversation === null) {
            return null;
        }

        $this->publish($conversation, $userId);

        try {
            $this->worker->dispatch($conversationId->encoded());
        } catch (\Throwable $exception) {
            $failed = $this->appendMessage->handle(
                $conversationId,
                $userId,
                $this->failureMessage($exception),
                'assistant'
            );

            if ($failed !== null) {
                $this->publish($failed, $userId);
                return $failed;
            }
        }

        return $conversation;
    }

    /** @param array<string, mixed> $conversation */
    private function publish(array $conversation, string $userId): void
    {
        try {
            $this->realtime->publishToIdentity(
                RealtimeIdentity::fromUserId($userId),
                [
                    'type' => 'agent.conversation.updated',
                    'conversation' => $conversation,
                ]
            );
        } catch (\Throwable) {
            // Conversation state is already persisted and can be resynced on reconnect.
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
