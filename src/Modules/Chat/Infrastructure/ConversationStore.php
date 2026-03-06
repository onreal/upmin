<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Infrastructure;

use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleContext;

final class ConversationStore
{
    private string $publicStore;
    private string $privateStore;

    public function __construct(ModuleContext $context)
    {
        $this->publicStore = rtrim($context->projectRoot(), '/') . '/store';
        $this->privateStore = rtrim($context->manageRoot(), '/') . '/store';
    }

    /** @return array<int, array<string, mixed>> */
    public function list(
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): array
    {
        $config = $this->resolveConfig($settings);
        $storeRoot = $this->storeRoot($config['visibility']);
        $storeName = $this->storeName($config['visibility']);
        $rootName = $config['root'];
        $rootDir = $storeRoot . '/' . $rootName;

        if (!is_dir($rootDir)) {
            return [];
        }

        $items = [];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($rootDir, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (!$file instanceof \SplFileInfo || $file->getExtension() !== 'json') {
                continue;
            }

            $payload = $this->readPayload($file->getPathname());
            if (!is_array($payload)) {
                continue;
            }

            try {
                $wrapper = DocumentWrapper::fromArray($payload);
            } catch (\InvalidArgumentException $exception) {
                continue;
            }
            $wrapper = $this->ensureWrapperId($file->getPathname(), $wrapper);

            if (!$this->isConversationWrapper($wrapper)) {
                continue;
            }

            $data = $wrapper->data();
            if (!is_array($data)) {
                continue;
            }
            if (($data['moduleKey'] ?? null) !== $moduleKey) {
                continue;
            }
            if (!$this->matchesAgent($data, $agentId)) {
                continue;
            }
            if (($data['userId'] ?? null) !== $userId) {
                continue;
            }

            $relative = $this->relativePath($storeRoot, $file->getPathname());
            if ($relative === null) {
                continue;
            }

            $items[] = [
                'id' => DocumentId::fromParts($storeName, $relative)->encoded(),
                'name' => $wrapper->name(),
                'createdAt' => is_string($data['createdAt'] ?? null) ? $data['createdAt'] : null,
                'updatedAt' => is_string($data['updatedAt'] ?? null) ? $data['updatedAt'] : null,
                'store' => $storeName,
                'path' => $relative,
            ];
        }

        usort($items, [self::class, 'compareByUpdatedAt']);

        return $items;
    }

    /** @return array<string, mixed> */
    public function create(
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): array
    {
        $config = $this->resolveConfig($settings);
        $storeRoot = $this->storeRoot($config['visibility']);
        $storeName = $this->storeName($config['visibility']);
        $rootName = $config['root'];
        $rootDir = $storeRoot . '/' . $rootName;

        if (!is_dir($rootDir) && !mkdir($rootDir, 0755, true) && !is_dir($rootDir)) {
            throw new \RuntimeException('Unable to create chat storage directory.');
        }

        $timestamp = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $createdAt = $timestamp->format(DATE_ATOM);
        $labelDate = $timestamp->format('Y-m-d H:i');

        $agentSlug = $this->slug($agentName) ?: 'agent';
        $userSlug = $this->slug($userId) ?: 'user';

        $baseName = $agentSlug . '-' . $userSlug . '-' . $timestamp->format('YmdHis') . '-' . $config['suffix'];
        $relativePath = $this->uniquePath($rootDir, $rootName, $baseName);

        $data = [
            'moduleKey' => $moduleKey,
            'agentName' => $agentName,
            'userId' => $userId,
            'createdAt' => $createdAt,
            'updatedAt' => $createdAt,
            'pendingResponse' => false,
            'messages' => [],
        ];

        if ($agentId !== null && trim($agentId) !== '') {
            $data['agentId'] = trim($agentId);
        }

        $wrapper = DocumentWrapper::fromArray([
            'id' => $this->uuidV4(),
            'type' => 'agent',
            'page' => 'chat-conversations',
            'name' => $agentName . ' · ' . $labelDate,
            'order' => 1,
            'data' => $data,
        ]);

        $payload = $wrapper->toArray();
        $this->writePayload($storeRoot . '/' . $relativePath, $payload);

        return [
            'id' => DocumentId::fromParts($storeName, $relativePath)->encoded(),
            'store' => $storeName,
            'path' => $relativePath,
            'payload' => $payload,
        ];
    }

    /** @return array<string, mixed>|null */
    public function append(
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
        $config = $this->resolveConfig($settings);
        $storeName = $this->storeName($config['visibility']);

        $id = DocumentId::fromEncoded($conversationId);
        if ($id->store() !== $storeName) {
            return null;
        }

        $storeRoot = $this->storeRoot($config['visibility']);
        $path = $this->safePath($storeRoot, $id->path());
        if (!is_file($path)) {
            return null;
        }

        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            return null;
        }

        try {
            $wrapper = DocumentWrapper::fromArray($payload);
        } catch (\InvalidArgumentException $exception) {
            return null;
        }
        $wrapper = $this->ensureWrapperId($path, $wrapper);

        if (!$this->isConversationWrapper($wrapper)) {
            return null;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return null;
        }
        if (($data['moduleKey'] ?? null) !== $moduleKey) {
            return null;
        }
        if (!$this->matchesAgent($data, $agentId)) {
            return null;
        }
        if (($data['userId'] ?? null) !== $userId) {
            return null;
        }

        $content = trim($content);
        if ($content === '') {
            throw new \InvalidArgumentException('Message.content is required.');
        }

        $role = strtolower(trim($role));
        if (!in_array($role, ['user', 'assistant'], true)) {
            $role = 'user';
        }
        if ($role === 'user' && ($data['pendingResponse'] ?? false) === true) {
            throw new \InvalidArgumentException('Wait for the current reply before sending another message.');
        }

        $messages = $data['messages'] ?? [];
        if (!is_array($messages)) {
            $messages = [];
        }

        $timestamp = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
        $messages[] = [
            'role' => $role,
            'content' => $content,
            'createdAt' => $timestamp,
        ];

        $data['messages'] = $messages;
        $data['updatedAt'] = $timestamp;
        $data['pendingResponse'] = $role === 'user';
        if ($role === 'user' && $this->supportsProgress($provider)) {
            $data['progress'] = [
                'status' => 'Queued reply...',
                'updatedAt' => $timestamp,
                'items' => [
                    [
                        'message' => 'Queued reply...',
                        'createdAt' => $timestamp,
                    ],
                ],
            ];
        } else {
            unset($data['progress']);
        }

        $updated = $wrapper->withData($data);
        $payload = $updated->toArray();
        $this->writePayload($path, $payload);

        return [
            'id' => $conversationId,
            'store' => $storeName,
            'path' => $id->path(),
            'payload' => $payload,
        ];
    }

    /** @return array<string, mixed>|null */
    public function get(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): ?array
    {
        $config = $this->resolveConfig($settings);
        $storeName = $this->storeName($config['visibility']);

        $id = DocumentId::fromEncoded($conversationId);
        if ($id->store() !== $storeName) {
            return null;
        }

        $storeRoot = $this->storeRoot($config['visibility']);
        $path = $this->safePath($storeRoot, $id->path());
        if (!is_file($path)) {
            return null;
        }

        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            return null;
        }

        try {
            $wrapper = DocumentWrapper::fromArray($payload);
        } catch (\InvalidArgumentException $exception) {
            return null;
        }
        $wrapper = $this->ensureWrapperId($path, $wrapper);

        if (!$this->isConversationWrapper($wrapper)) {
            return null;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return null;
        }
        if (($data['moduleKey'] ?? null) !== $moduleKey) {
            return null;
        }
        if (!$this->matchesAgent($data, $agentId)) {
            return null;
        }
        if (($data['userId'] ?? null) !== $userId) {
            return null;
        }

        return [
            'id' => $conversationId,
            'store' => $storeName,
            'path' => $id->path(),
            'payload' => $payload,
        ];
    }

    public function delete(
        string $conversationId,
        string $moduleKey,
        string $agentName,
        string $userId,
        ?array $settings = null,
        ?string $agentId = null
    ): bool
    {
        $config = $this->resolveConfig($settings);
        $storeName = $this->storeName($config['visibility']);

        $id = DocumentId::fromEncoded($conversationId);
        if ($id->store() !== $storeName) {
            return false;
        }

        $storeRoot = $this->storeRoot($config['visibility']);
        $path = $this->safePath($storeRoot, $id->path());
        if (!is_file($path)) {
            return false;
        }

        $payload = $this->readPayload($path);
        if (!is_array($payload)) {
            return false;
        }

        try {
            $wrapper = DocumentWrapper::fromArray($payload);
        } catch (\InvalidArgumentException $exception) {
            return false;
        }

        if (!$this->isConversationWrapper($wrapper)) {
            return false;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return false;
        }
        if (($data['moduleKey'] ?? null) !== $moduleKey) {
            return false;
        }
        if (!$this->matchesAgent($data, $agentId)) {
            return false;
        }
        if (($data['userId'] ?? null) !== $userId) {
            return false;
        }

        return unlink($path);
    }

    /** @return array{visibility: string, root: string, suffix: string} */
    private function resolveConfig(?array $settings): array
    {
        $visibility = 'public';
        $root = 'chats';
        $suffix = 'conversation';

        if (is_array($settings)) {
            $conversation = $settings['conversation'] ?? null;
            if (is_array($conversation)) {
                $visibilityValue = $conversation['visibility'] ?? null;
                if (is_string($visibilityValue) && in_array($visibilityValue, ['public', 'private'], true)) {
                    $visibility = $visibilityValue;
                }

                $rootValue = $conversation['root'] ?? null;
                if (is_string($rootValue)) {
                    $rootValue = trim($rootValue, "/ ");
                    if ($rootValue !== '' && preg_match('/^[a-zA-Z0-9_\/-]+$/', $rootValue)) {
                        $root = $rootValue;
                    }
                }

                $suffixValue = $conversation['suffix'] ?? null;
                if (is_string($suffixValue)) {
                    $suffixValue = $this->slug($suffixValue);
                    if ($suffixValue !== '') {
                        $suffix = $suffixValue;
                    }
                }
            }
        }

        return [
            'visibility' => $visibility,
            'root' => $root,
            'suffix' => $suffix,
        ];
    }

    private function storeRoot(string $visibility): string
    {
        return $visibility === 'private' ? $this->privateStore : $this->publicStore;
    }

    private function storeName(string $visibility): string
    {
        return $visibility === 'private' ? 'private' : 'public';
    }

    private function safePath(string $root, string $relative): string
    {
        $relative = ltrim($relative, '/');
        $path = $root . DIRECTORY_SEPARATOR . $relative;
        $realRoot = realpath($root) ?: $root;
        $realPath = realpath($path) ?: $path;

        if (strpos($realPath, $realRoot) !== 0) {
            throw new \RuntimeException('Invalid conversation path.');
        }

        return $path;
    }

    private function relativePath(string $root, string $path): ?string
    {
        $root = rtrim($root, DIRECTORY_SEPARATOR);
        $path = rtrim($path, DIRECTORY_SEPARATOR);
        if (strpos($path, $root) !== 0) {
            return null;
        }
        $relative = ltrim(substr($path, strlen($root)), '/');
        return $relative !== '' ? $relative : null;
    }

    private function uniquePath(string $rootDir, string $rootName, string $base): string
    {
        $suffix = '';
        $counter = 1;

        while (true) {
            $filename = $base . $suffix . '.json';
            $path = $rootDir . '/' . $filename;
            if (!is_file($path)) {
                return $rootName . '/' . $filename;
            }
            $counter++;
            $suffix = '-' . $counter;
        }
    }

    private function readPayload(string $path): ?array
    {
        $raw = file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writePayload(string $path, array $payload): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create chat directory.');
        }

        $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new \RuntimeException('Failed to encode chat conversation.');
        }

        file_put_contents($path, $encoded . PHP_EOL, LOCK_EX);
    }

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }

    private function isConversationWrapper(DocumentWrapper $wrapper): bool
    {
        return $wrapper->type() === 'agent'
            && $wrapper->page() === 'chat-conversations'
            && !$wrapper->isSection();
    }

    private function ensureWrapperId(string $path, DocumentWrapper $wrapper): DocumentWrapper
    {
        $existing = $wrapper->id();
        if (is_string($existing) && $this->isValidUuid($existing)) {
            return $wrapper;
        }

        $updated = $wrapper->withId($this->uuidV4());
        $this->writePayload($path, $updated->toArray());

        return $updated;
    }

    private function isValidUuid(string $value): bool
    {
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        ) === 1;
    }

    private function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    /** @param array<string, mixed> $data */
    private function matchesAgent(array $data, ?string $agentId): bool
    {
        $expectedId = is_string($agentId) ? trim($agentId) : '';
        $actualId = is_string($data['agentId'] ?? null) ? trim((string) $data['agentId']) : '';

        if ($expectedId === '' || $actualId === '') {
            return false;
        }

        return $actualId === $expectedId;
    }

    private function supportsProgress(?string $provider): bool
    {
        if (!is_string($provider)) {
            return false;
        }
        return strtolower(trim($provider)) === 'codex-cli';
    }

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    private static function compareByUpdatedAt(array $a, array $b): int
    {
        $timeA = is_string($a['updatedAt'] ?? null) ? strtotime($a['updatedAt']) : false;
        $timeB = is_string($b['updatedAt'] ?? null) ? strtotime($b['updatedAt']) : false;
        if ($timeA === false) {
            $timeA = is_string($a['createdAt'] ?? null) ? strtotime($a['createdAt']) : false;
        }
        if ($timeB === false) {
            $timeB = is_string($b['createdAt'] ?? null) ? strtotime($b['createdAt']) : false;
        }
        $timeA = $timeA === false ? 0 : $timeA;
        $timeB = $timeB === false ? 0 : $timeB;

        if ($timeA !== $timeB) {
            return $timeB <=> $timeA;
        }

        return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
    }
}
