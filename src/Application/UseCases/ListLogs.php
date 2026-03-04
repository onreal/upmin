<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Infrastructure\Logging\LogStore;

final class ListLogs
{
    private LogStore $store;

    public function __construct(LogStore $store)
    {
        $this->store = $store;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $logs = [];

        foreach ($this->store->listErrorLogs() as $path) {
            $payload = $this->store->read($path);
            if (!is_array($payload)) {
                continue;
            }

            try {
                $wrapper = DocumentWrapper::fromArray($payload);
            } catch (\InvalidArgumentException $exception) {
                continue;
            }

            $data = $wrapper->data();
            $items = is_array($data) && isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
            $createdAt = is_array($data) && is_string($data['createdAt'] ?? null) ? $data['createdAt'] : null;
            $updatedAt = is_array($data) && is_string($data['updatedAt'] ?? null) ? $data['updatedAt'] : null;

            $logs[] = [
                'id' => DocumentId::fromParts('private', $path)->encoded(),
                'name' => $wrapper->name(),
                'path' => $path,
                'count' => count($items),
                'createdAt' => $createdAt,
                'updatedAt' => $updatedAt,
            ];
        }

        usort($logs, static function (array $a, array $b): int {
            return strcmp((string) ($b['path'] ?? ''), (string) ($a['path'] ?? ''));
        });

        return $logs;
    }
}
