<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Logging;

use Manage\Domain\Document\DocumentWrapper;
use Manage\Interface\Http\Request;

final class ErrorLogger
{
    private const SETTINGS_PATH = 'logs/logger-settings.json';
    private const MIRROR_PATH = 'logs/errors.json';

    private LogStore $store;

    public function __construct(string $manageRoot)
    {
        $this->store = new LogStore($manageRoot);
    }

    public function ensureSettings(): void
    {
        if ($this->store->read(self::SETTINGS_PATH) !== null) {
            return;
        }

        $payload = DocumentWrapper::fromArray([
            'type' => 'module',
            'page' => 'logs',
            'name' => 'Logger Settings',
            'order' => 1,
            'section' => true,
            'data' => [
                'maxItems' => 1000,
                'maxDays' => 7,
            ],
        ])->toArray();

        $this->store->write(self::SETTINGS_PATH, $payload);
    }

    public function ensureLogFile(): void
    {
        $latest = $this->latestLogPath();
        if ($latest === null) {
            $this->createNewLogFile();
        }
    }

    public function logException(Request $request, \Throwable $exception, int $status = 500): void
    {
        try {
            $settings = $this->readSettings();
            $entry = [
                'timestamp' => $this->nowIso(),
                'endpoint' => strtoupper($request->method()) . ' ' . $request->path(),
                'method' => strtoupper($request->method()),
                'path' => $request->path(),
                'query' => $request->query(),
                'message' => $exception->getMessage(),
                'type' => get_class($exception),
                'code' => $exception->getCode(),
                'status' => $status,
            ];

            $logPath = $this->latestLogPath();
            $payload = $logPath ? $this->store->read($logPath) : null;

            if (!is_array($payload)) {
                $logPath = $this->createNewLogFile();
                $payload = $this->store->read($logPath);
            }

            if (!is_array($payload)) {
                return;
            }

            if ($this->shouldRotate($payload, $settings)) {
                $logPath = $this->createNewLogFile();
                $payload = $this->store->read($logPath);
                if (!is_array($payload)) {
                    return;
                }
            }

            $data = $payload['data'] ?? [];
            if (!is_array($data)) {
                $data = [];
            }
            $items = $data['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }

            $items[] = $entry;
            $data['items'] = $items;
            $data['updatedAt'] = $entry['timestamp'];
            if (!isset($data['createdAt'])) {
                $data['createdAt'] = $entry['timestamp'];
            }
            $payload['data'] = $data;

            $this->store->write($logPath, $payload);
            $this->store->write(self::MIRROR_PATH, $payload);
        } catch (\Throwable $ignored) {
            // Avoid recursive logging failures.
        }
    }

    /** @param array<string, mixed> $context */
    public function logError(Request $request, string $message, int $status, array $context = []): void
    {
        try {
            $settings = $this->readSettings();
            $entry = [
                'timestamp' => $this->nowIso(),
                'endpoint' => strtoupper($request->method()) . ' ' . $request->path(),
                'method' => strtoupper($request->method()),
                'path' => $request->path(),
                'query' => $request->query(),
                'message' => $message,
                'type' => 'ErrorResponse',
                'code' => 0,
                'status' => $status,
                'context' => $context,
            ];

            $logPath = $this->latestLogPath();
            $payload = $logPath ? $this->store->read($logPath) : null;

            if (!is_array($payload) || $this->shouldRotate($payload, $settings)) {
                $logPath = $this->createNewLogFile();
                $payload = $this->store->read($logPath);
            }

            if (!is_array($payload)) {
                return;
            }

            $data = $payload['data'] ?? [];
            if (!is_array($data)) {
                $data = [];
            }
            $items = $data['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }

            $items[] = $entry;
            $data['items'] = $items;
            $data['updatedAt'] = $entry['timestamp'];
            if (!isset($data['createdAt'])) {
                $data['createdAt'] = $entry['timestamp'];
            }
            $payload['data'] = $data;

            $this->store->write($logPath, $payload);
            $this->store->write(self::MIRROR_PATH, $payload);
        } catch (\Throwable $ignored) {
            // Avoid recursive logging failures.
        }
    }

    /** @return array<string, int> */
    private function readSettings(): array
    {
        $payload = $this->store->read(self::SETTINGS_PATH);
        if (!is_array($payload)) {
            return ['maxItems' => 1000, 'maxDays' => 7];
        }

        $data = $payload['data'] ?? [];
        if (!is_array($data)) {
            return ['maxItems' => 1000, 'maxDays' => 7];
        }

        $maxItems = isset($data['maxItems']) && is_int($data['maxItems']) ? $data['maxItems'] : 1000;
        $maxDays = isset($data['maxDays']) && is_int($data['maxDays']) ? $data['maxDays'] : 7;

        return ['maxItems' => $maxItems, 'maxDays' => $maxDays];
    }

    private function latestLogPath(): ?string
    {
        $paths = $this->store->listErrorLogs();
        if ($paths === []) {
            return null;
        }

        usort($paths, function (string $a, string $b): int {
            return strcmp($a, $b);
        });

        return end($paths) ?: null;
    }

    private function createNewLogFile(): string
    {
        $timestamp = $this->timestampId();
        $labelTime = $this->nowLabel();
        $path = 'logs/' . $timestamp . '-errors.json';

        $payload = DocumentWrapper::fromArray([
            'type' => 'log',
            'page' => 'logs',
            'name' => 'Errors ' . $labelTime,
            'order' => 1,
            'section' => true,
            'data' => [
                'createdAt' => $this->nowIso(),
                'updatedAt' => $this->nowIso(),
                'items' => [],
            ],
        ])->toArray();

        $this->store->write($path, $payload);
        $this->store->write(self::MIRROR_PATH, $payload);

        return $path;
    }

    private function shouldRotate(array $payload, array $settings): bool
    {
        $data = $payload['data'] ?? null;
        if (!is_array($data)) {
            return true;
        }

        $items = $data['items'] ?? [];
        if (!is_array($items)) {
            $items = [];
        }

        $maxItems = $settings['maxItems'] ?? 0;
        $maxDays = $settings['maxDays'] ?? 0;

        if (is_int($maxItems) && $maxItems > 0 && count($items) >= $maxItems) {
            return true;
        }

        if (is_int($maxDays) && $maxDays > 0) {
            $createdAt = $data['createdAt'] ?? null;
            if (is_string($createdAt)) {
                $created = strtotime($createdAt);
                if ($created !== false) {
                    $ageDays = (time() - $created) / 86400;
                    if ($ageDays >= $maxDays) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private function nowIso(): string
    {
        return date('c');
    }

    private function nowLabel(): string
    {
        return date('Y-m-d H:i:s');
    }

    private function timestampId(): string
    {
        return date('Ymd-His');
    }
}
