<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Update;

final class GitHubRepositorySource implements RepositorySource
{
    private const REMOTE_VERSION_URL_TEMPLATE = 'https://raw.githubusercontent.com/onreal/upmin/main/%s/store/version.json';
    private const ARCHIVE_URL = 'https://codeload.github.com/onreal/upmin/zip/refs/heads/main';

    private string $adminRelativePath;

    public function __construct(string $adminRelativePath)
    {
        $normalized = trim(str_replace('\\', '/', $adminRelativePath), '/');
        if ($normalized === '') {
            throw new \InvalidArgumentException('Admin relative path cannot be empty.');
        }

        $this->adminRelativePath = $normalized;
    }

    /** @return array<string, mixed> */
    public function fetchVersion(): array
    {
        $response = $this->fetch(sprintf(self::REMOTE_VERSION_URL_TEMPLATE, $this->adminRelativePath));
        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Remote version file is invalid.');
        }

        return $decoded;
    }

    public function downloadArchive(string $destination): void
    {
        $payload = $this->fetch(self::ARCHIVE_URL, false);
        $dir = dirname($destination);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create updater download directory.');
        }

        if (file_put_contents($destination, $payload, LOCK_EX) === false) {
            throw new \RuntimeException('Failed to store update archive.');
        }
    }

    private function fetch(string $url, bool $json = true): string
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to initialize update request.');
        }

        $headers = [
            'Accept: ' . ($json ? 'application/json' : 'application/octet-stream'),
            'User-Agent: Upmin-Updater',
        ];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        $response = curl_exec($ch);
        if (!is_string($response)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('Update request failed: ' . $error);
        }

        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('Update request failed with status ' . $status . '.');
        }

        return $response;
    }
}
