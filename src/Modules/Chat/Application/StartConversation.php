<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

use Manage\Modules\Chat\Infrastructure\ConversationStore;

final class StartConversation
{
    private ConversationStore $store;
    private InitialPromptContextResolver $contextResolver;
    private InitialPromptContextComposer $contextComposer;

    public function __construct(
        ConversationStore $store,
        InitialPromptContextResolver $contextResolver,
        InitialPromptContextComposer $contextComposer
    )
    {
        $this->store = $store;
        $this->contextResolver = $contextResolver;
        $this->contextComposer = $contextComposer;
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
        $resolvedContext = $this->contextResolver->resolve($moduleKey);
        return $this->store->create(
            $moduleKey,
            $agentName,
            $userId,
            $settings,
            $agentId,
            $resolvedContext !== null
                ? $this->contextComposer->buildContextMessages($resolvedContext)
                : null
        );
    }
}
