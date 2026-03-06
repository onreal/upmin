<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\RealtimePublisher;
use Manage\Integrations\IntegrationSyncStatusStore;

final class ProcessIntegrationModelSync
{
    private SyncIntegrationModels $syncModels;
    private IntegrationSyncStatusStore $statuses;
    private RealtimePublisher $realtime;

    public function __construct(
        SyncIntegrationModels $syncModels,
        IntegrationSyncStatusStore $statuses,
        RealtimePublisher $realtime
    )
    {
        $this->syncModels = $syncModels;
        $this->statuses = $statuses;
        $this->realtime = $realtime;
    }

    public function handle(string $name): void
    {
        $status = $this->statuses->read($name);
        $identity = isset($status['requestedBy']) && is_string($status['requestedBy'])
            ? trim($status['requestedBy'])
            : '';

        if (($status['syncing'] ?? false) !== true) {
            return;
        }

        try {
            $settings = $this->syncModels->handle($name);
            $this->statuses->complete($name);

            $models = $settings['models'] ?? [];
            $count = is_array($models) ? count($models) : 0;

            $this->publish($identity, [
                'type' => 'integration.sync.updated',
                'name' => $name,
                'syncing' => false,
                'ok' => true,
                'models' => $count,
            ]);
        } catch (\Throwable $exception) {
            $failed = $this->statuses->fail($name, $exception->getMessage());
            $this->publish($identity, [
                'type' => 'integration.sync.updated',
                'name' => $name,
                'syncing' => false,
                'ok' => false,
                'error' => (string) ($failed['lastError'] ?? 'Integration sync failed.'),
            ]);
        }
    }

    /** @param array<string, mixed> $event */
    private function publish(string $identity, array $event): void
    {
        if ($identity === '') {
            return;
        }

        try {
            $this->realtime->publishToIdentity($identity, $event);
        } catch (\Throwable) {
            // The job result is already persisted.
        }
    }
}
