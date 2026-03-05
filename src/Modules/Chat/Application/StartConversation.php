<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class StartConversation
{
    private ConversationStore $store;

    public function __construct(ConversationStore $store)
    {
        $this->store = $store;
    }

    /** @return array<string, mixed> */
    public function handle(
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): array
    {
        return $this->store->create($moduleKey, $agentName, $userId, $settings, $agentId);
    }
}
