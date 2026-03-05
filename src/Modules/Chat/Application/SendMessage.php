<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\AgentResponder;

final class SendMessage
{
    private AppendMessage $appendMessage;
    private AgentResponder $responder;

    public function __construct(AppendMessage $appendMessage, AgentResponder $responder)
    {
        $this->appendMessage = $appendMessage;
        $this->responder = $responder;
    }

    /** @return array<string, mixed>|null */
    public function handle(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        string $content,
        ?array $settings = null,
        ?string $agentId = null
    ): ?array
    {
        $conversation = $this->appendMessage->handle(
            $conversationId,
            $moduleKey,
            $agentName,
            $userId,
            $content,
            'user',
            $settings
        );

        if ($conversation === null) {
            return null;
        }

        $payload = $conversation['payload'] ?? null;
        if (!is_array($payload)) {
            return $conversation;
        }

        $data = $payload['data'] ?? null;
        if (!is_array($data)) {
            return $conversation;
        }

        $messages = $data['messages'] ?? [];
        if (!is_array($messages)) {
            $messages = [];
        }

        $resolvedAgentId = $agentId;
        if ($resolvedAgentId === null) {
            $agentRef = $data['agentId'] ?? null;
            if (is_string($agentRef) && trim($agentRef) !== '') {
                $resolvedAgentId = trim($agentRef);
            }
        }

        $reply = $this->responder->reply($resolvedAgentId, $agentName, $messages);

        $updated = $this->appendMessage->handle(
            $conversationId,
            $moduleKey,
            $agentName,
            $userId,
            $reply,
            'assistant',
            $settings
        );

        return $updated ?? $conversation;
    }
}
