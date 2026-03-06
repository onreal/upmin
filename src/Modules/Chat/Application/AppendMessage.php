<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class AppendMessage
{
    private ConversationStore $store;

    public function __construct(ConversationStore $store)
    {
        $this->store = $store;
    }

    /** @return array<string, mixed>|null */
    public function handle(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        string $content,
        string $role = 'user',
        ?array $settings = null,
        ?string $agentId = null,
        ?string $provider = null
    ): ?array
    {
        return $this->store->append(
            $conversationId,
            $moduleKey,
            $agentName,
            $userId,
            $content,
            $role,
            $settings,
            $agentId,
            $provider
        );
    }
}
