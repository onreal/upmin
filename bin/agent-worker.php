<?php

declare(strict_types=1);

use Manage\Application\UseCases\ProcessPendingAgentReply;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\Conversations\ConversationProgressTracker;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\SocketRealtimePublisher;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationRegistry;
use Manage\Integrations\IntegrationSettingsStore;

require dirname(__DIR__) . '/bootstrap.php';

$conversationId = isset($argv[1]) && is_string($argv[1]) ? trim($argv[1]) : '';
if ($conversationId === '') {
    fwrite(STDERR, "Conversation id is required.\n");
    exit(1);
}

$manageRoot = dirname(__DIR__);
$projectRoot = dirname(__DIR__, 2);

$env = Env::load($manageRoot . '/.env');
$documents = new JsonDocumentRepository([
    'private' => $manageRoot . '/store',
    'public' => $projectRoot . '/store',
]);
$integrationContext = new IntegrationContext($projectRoot, $manageRoot);
$integrationRegistry = new IntegrationRegistry($manageRoot . '/src/Integrations', $integrationContext);
$integrationSettings = new IntegrationSettingsStore($integrationContext);
$responder = new AgentResponder($documents, $integrationRegistry, $integrationSettings);
$realtime = new SocketRealtimePublisher(new RealtimeConfig($env));
$progress = new ConversationProgressTracker($documents, $realtime);

$processor = new ProcessPendingAgentReply($documents, $responder, $realtime, $progress);
$processor->handle($conversationId);
