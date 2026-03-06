<?php

declare(strict_types=1);

use Manage\Application\UseCases\ProcessIntegrationModelSync;
use Manage\Application\UseCases\SyncIntegrationModels;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\SocketRealtimePublisher;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationRegistry;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Integrations\IntegrationSyncStatusStore;

require dirname(__DIR__) . '/bootstrap.php';

$integrationName = isset($argv[1]) && is_string($argv[1]) ? trim($argv[1]) : '';
if ($integrationName === '') {
    fwrite(STDERR, "Integration name is required.\n");
    exit(1);
}

$manageRoot = dirname(__DIR__);
$projectRoot = dirname(__DIR__, 2);

$integrationContext = new IntegrationContext($projectRoot, $manageRoot);
$statuses = new IntegrationSyncStatusStore($integrationContext);

try {
    $env = Env::load($manageRoot . '/.env');
    $registry = new IntegrationRegistry($manageRoot . '/src/Integrations', $integrationContext);
    $settings = new IntegrationSettingsStore($integrationContext);
    $realtime = new SocketRealtimePublisher(new RealtimeConfig($env));

    $sync = new SyncIntegrationModels($registry, $settings);
    $processor = new ProcessIntegrationModelSync($sync, $statuses, $realtime);
    $processor->handle($integrationName);
} catch (\Throwable $exception) {
    $statuses->fail($integrationName, $exception->getMessage());
    fwrite(STDERR, trim($exception->getMessage()) . PHP_EOL);
    exit(1);
}
