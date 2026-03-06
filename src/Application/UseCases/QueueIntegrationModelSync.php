<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\RealtimePublisher;
use Manage\Infrastructure\Workers\ReplyWorkerLauncher;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Integrations\IntegrationSyncStatusStore;

final class QueueIntegrationModelSync
{
    private IntegrationCatalog $catalog;
    private IntegrationSettingsStore $settings;
    private IntegrationSyncStatusStore $statuses;
    private RealtimePublisher $realtime;
    private ReplyWorkerLauncher $worker;

    public function __construct(
        IntegrationCatalog $catalog,
        IntegrationSettingsStore $settings,
        IntegrationSyncStatusStore $statuses,
        RealtimePublisher $realtime,
        ReplyWorkerLauncher $worker
    )
    {
        $this->catalog = $catalog;
        $this->settings = $settings;
        $this->statuses = $statuses;
        $this->realtime = $realtime;
        $this->worker = $worker;
    }

    /** @return array<string, mixed> */
    public function handle(string $name, string $identity): array
    {
        $definition = $this->catalog->definition($name);
        if ($definition === null) {
            throw new \InvalidArgumentException('Integration not found.');
        }

        if (!$definition->supportsModels()) {
            throw new \InvalidArgumentException('Integration does not support model sync.');
        }

        $data = $this->settings->read($definition->name());
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Integration settings not found.');
        }

        $result = $this->statuses->start($definition->name(), $identity);
        $alreadyRunning = $result['started'] !== true;
        $status = $result['status'];

        if ($alreadyRunning) {
            return [
                'name' => $definition->name(),
                'queued' => false,
                'alreadyRunning' => true,
                'syncing' => (bool) ($status['syncing'] ?? false),
            ];
        }

        $this->publish($identity, [
            'type' => 'integration.sync.updated',
            'name' => $definition->name(),
            'syncing' => true,
        ]);

        try {
            $this->worker->dispatch($definition->name());
        } catch (\Throwable $exception) {
            $failed = $this->statuses->fail($definition->name(), $exception->getMessage());
            $this->publish($identity, [
                'type' => 'integration.sync.updated',
                'name' => $definition->name(),
                'syncing' => false,
                'ok' => false,
                'error' => (string) ($failed['lastError'] ?? 'Unable to start integration sync.'),
            ]);

            throw new \RuntimeException((string) ($failed['lastError'] ?? 'Unable to start integration sync.'));
        }

        return [
            'name' => $definition->name(),
            'queued' => true,
            'alreadyRunning' => false,
            'syncing' => true,
        ];
    }

    /** @param array<string, mixed> $event */
    private function publish(string $identity, array $event): void
    {
        $identity = trim($identity);
        if ($identity === '') {
            return;
        }

        try {
            $this->realtime->publishToIdentity($identity, $event);
        } catch (\Throwable) {
            // The queued job still exists and the UI can reconcile with a later reload.
        }
    }
}
