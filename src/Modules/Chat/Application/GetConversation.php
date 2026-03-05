<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class GetConversation
{
    private ConversationStore $store;

    public function __construct(ConversationStore $store)
    {
        $this->store = $store;
    }

    /** @return array<string, mixed>|null */
    public function handle(string $conversationId, string $moduleKey, string $agentName, string $userId, ?array $settings = null): ?array
    {
        return $this->store->get($conversationId, $moduleKey, $agentName, $userId, $settings);
    }
}
