<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class ListConversations
{
    private ConversationStore $store;

    public function __construct(ConversationStore $store)
    {
        $this->store = $store;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(string $moduleKey, string $agentName, string $userId, ?array $settings = null): array
    {
        return $this->store->list($moduleKey, $agentName, $userId, $settings);
    }
}
