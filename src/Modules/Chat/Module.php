<?php

declare(strict_types=1);

namespace Manage\Modules\Chat;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Infrastructure\Agents\AgentPromptResolver;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\SocketRealtimePublisher;
use Manage\Infrastructure\Security\HmacTokenService;
use Manage\Infrastructure\Workers\ReplyWorkerLauncher;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationRegistry;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Modules\Chat\Application\AppendMessage;
use Manage\Modules\Chat\Application\DeleteConversation;
use Manage\Modules\Chat\Application\GetConversation;
use Manage\Modules\Chat\Application\InitialPromptContextComposer;
use Manage\Modules\Chat\Application\InitialPromptContextResolver;
use Manage\Modules\Chat\Application\ListConversations;
use Manage\Modules\Chat\Application\SendMessage;
use Manage\Modules\Chat\Application\StartConversation;
use Manage\Modules\Chat\Infrastructure\ConversationStore;
use Manage\Modules\Chat\Interface\ModuleController as ChatController;
use Manage\Modules\Contracts\ModuleHandler;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleSettingsStore;

final class Module implements ModuleHandler
{
    private ModuleDefinition $definition;
    private object $controller;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $settingsStore = new ModuleSettingsStore($context);
        $conversationStore = new ConversationStore($context);
        $listConversations = new ListConversations($conversationStore);
        $documentRepository = new JsonDocumentRepository($storeRoots = [
            'private' => rtrim($context->manageRoot(), '/') . '/store',
            'public' => rtrim($context->projectRoot(), '/') . '/store',
        ]);
        $initialPromptContextComposer = new InitialPromptContextComposer();
        $initialPromptContextResolver = new InitialPromptContextResolver($documentRepository, $definition);
        $startConversation = new StartConversation(
            $conversationStore,
            $initialPromptContextResolver,
            $initialPromptContextComposer
        );
        $appendMessage = new AppendMessage($conversationStore);
        $getConversation = new GetConversation($conversationStore);
        $deleteConversation = new DeleteConversation($conversationStore);
        $integrationContext = new IntegrationContext($context->projectRoot(), $context->manageRoot());
        $integrationRegistry = new IntegrationRegistry($context->manageRoot() . '/src/Integrations', $integrationContext);
        $integrationSettings = new IntegrationSettingsStore($integrationContext);
        $promptResolver = new AgentPromptResolver($storeRoots);
        $responder = new AgentResponder($documentRepository, $integrationRegistry, $integrationSettings, $promptResolver);
        $env = Env::load($context->manageRoot() . '/.env');
        $realtimeConfig = new RealtimeConfig($env);
        $realtimePublisher = new SocketRealtimePublisher($realtimeConfig);
        $workerLauncher = new ReplyWorkerLauncher($context->projectRoot(), $context->manageRoot() . '/bin/chat-worker.php');
        $sendMessage = new SendMessage($appendMessage, $realtimePublisher, $workerLauncher);
        $tokenService = new HmacTokenService($env);

        $this->controller = new ChatController(
            $definition,
            $listConversations,
            $startConversation,
            $getConversation,
            $sendMessage,
            $deleteConversation,
            $settingsStore,
            $tokenService
        );
    }

    public function definition(): ModuleDefinition
    {
        return $this->definition;
    }

    public function controller(): object
    {
        return $this->controller;
    }
}
