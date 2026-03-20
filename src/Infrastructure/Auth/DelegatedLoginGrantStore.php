<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Auth;

final class DelegatedLoginGrantStore
{
    private string $filePath;
    private UserApiKeyHasher $hasher;
    private int $ttlSeconds;

    public function __construct(string $manageRoot, UserApiKeyHasher $hasher, int $ttlSeconds = 120)
    {
        $this->filePath = rtrim($manageRoot, '/') . '/store/system/auth/delegated-login-grants.json';
        $this->hasher = $hasher;
        $this->ttlSeconds = $ttlSeconds;
    }

    /** @return array{grant: string, expiresAt: string} */
    public function issue(string $userId, string $email, string $apiKeyId): array
    {
        $grant = 'ulg_' . bin2hex(random_bytes(24));
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $expiresAt = $now->modify('+' . $this->ttlSeconds . ' seconds')->format(DATE_ATOM);
        $records = $this->cleanup($this->load());
        $records[] = [
            'grantHash' => $this->hasher->hash($grant),
            'userId' => trim($userId),
            'email' => trim($email),
            'apiKeyId' => trim($apiKeyId),
            'createdAt' => $now->format(DATE_ATOM),
            'expiresAt' => $expiresAt,
            'usedAt' => null,
        ];
        $this->save($records);

        return [
            'grant' => $grant,
            'expiresAt' => $expiresAt,
        ];
    }

    /** @return array{userId: string, email: string, apiKeyId: string}|null */
    public function consume(string $grant): ?array
    {
        $records = $this->cleanup($this->load());
        $grantHash = $this->hasher->hash($grant);
        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        foreach ($records as $index => $record) {
            if (($record['grantHash'] ?? null) !== $grantHash) {
                continue;
            }
            if (!is_string($record['expiresAt'] ?? null) || strtotime((string) $record['expiresAt']) < time()) {
                $this->save($this->cleanup($records));
                return null;
            }
            if (is_string($record['usedAt'] ?? null) && trim((string) $record['usedAt']) !== '') {
                return null;
            }

            $records[$index]['usedAt'] = $now;
            $this->save($records);

            return [
                'userId' => (string) ($record['userId'] ?? ''),
                'email' => (string) ($record['email'] ?? ''),
                'apiKeyId' => (string) ($record['apiKeyId'] ?? ''),
            ];
        }

        $this->save($records);
        return null;
    }

    /** @return array<int, array<string, mixed>> */
    private function load(): array
    {
        if (!is_file($this->filePath)) {
            return [];
        }

        $raw = file_get_contents($this->filePath);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
    }

    /** @param array<int, array<string, mixed>> $records */
    private function save(array $records): void
    {
        $dir = dirname($this->filePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($this->filePath, json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    /** @param array<int, array<string, mixed>> $records
     *  @return array<int, array<string, mixed>>
     */
    private function cleanup(array $records): array
    {
        $now = time();

        return array_values(array_filter($records, static function (array $record) use ($now): bool {
            $expiresAt = $record['expiresAt'] ?? null;
            if (!is_string($expiresAt) || strtotime($expiresAt) === false) {
                return false;
            }
            if (strtotime($expiresAt) < $now) {
                return false;
            }

            $usedAt = $record['usedAt'] ?? null;
            return !is_string($usedAt) || trim($usedAt) === '';
        }));
    }
}
