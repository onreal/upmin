<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Application\Ports\RealtimePublisher;
use Manage\Infrastructure\Realtime\RealtimeIdentity;
use Manage\Infrastructure\Workers\ReplyWorkerLauncher;

final class SendMessage
{
    private AppendMessage $appendMessage;
    private RealtimePublisher $realtime;
    private ReplyWorkerLauncher $worker;

    public function __construct(
        AppendMessage $appendMessage,
        RealtimePublisher $realtime,
        ReplyWorkerLauncher $worker
    )
    {
        $this->appendMessage = $appendMessage;
        $this->realtime = $realtime;
        $this->worker = $worker;
    }

    /** @return array<string, mixed>|null */
    public function handle(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        string $content,
        ?array $settings = null,
        ?string $agentId = null,
        ?string $provider = null
    ): ?array
    {
        $conversation = $this->appendMessage->handle(
            $conversationId,
            $moduleKey,
            $agentName,
            $userId,
            $content,
            'user',
            $settings,
            $agentId,
            $provider
        );

        if ($conversation === null) {
            return null;
        }

        $this->publish($conversation, $userId);

        try {
            $this->worker->dispatch($conversationId);
        } catch (\Throwable $exception) {
            $failed = $this->appendMessage->handle(
                $conversationId,
                $moduleKey,
                $agentName,
                $userId,
                $this->failureMessage($exception),
                'assistant',
                $settings,
                $agentId,
                $provider
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
                    'type' => 'chat.conversation.updated',
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
