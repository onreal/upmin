<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class DeleteConversation
{
    private ConversationStore $store;

    public function __construct(ConversationStore $store)
    {
        $this->store = $store;
    }

    public function handle(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): bool
    {
        return $this->store->delete($conversationId, $moduleKey, $agentName, $userId, $settings, $agentId);
    }
}
