<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Update;

final class AdminUpdater
{
    /** @var array<string, bool> */
    private const PRESERVED_ADMIN_ROOT_ENTRIES = [
        '.git' => true,
        '.env' => true,
        'media' => true,
        'node_modules' => true,
        'store' => true,
        'vendor' => true,
    ];
    /** @var array<string, bool> */
    private const MANAGED_ADMIN_DIRECTORIES = [
        'bin' => true,
        'docker' => true,
        'public' => true,
        'src' => true,
        'tests' => true,
        'web' => true,
    ];

    private string $projectRoot;
    private string $manageRoot;
    private string $adminRelativePath;
    private string $manageStoreRoot;
    private string $publicStoreRoot;
    private string $versionPath;
    private RepositorySource $source;
    private UpdaterStateStore $stateStore;

    public function __construct(
        string $projectRoot,
        string $manageRoot,
        RepositorySource $source,
        UpdaterStateStore $stateStore
    ) {
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->manageRoot = rtrim($manageRoot, '/');
        $this->adminRelativePath = $this->resolveAdminRelativePath($this->projectRoot, $this->manageRoot);
        $this->manageStoreRoot = $this->manageRoot . '/store';
        $this->publicStoreRoot = $this->projectRoot . '/store';
        $this->versionPath = $this->manageStoreRoot . '/version.json';
        $this->source = $source;
        $this->stateStore = $stateStore;
    }

    /** @return array<string, mixed> */
    public function status(): array
    {
        $state = $this->stateStore->reconcile();
        $currentVersion = $this->readVersionFile($this->versionPath);

        if (($state['locked'] ?? false) === true || ($state['status'] ?? null) === 'running') {
            $state['currentVersion'] = $currentVersion;
            return $state;
        }

        try {
            $remoteVersion = $this->readVersionValue($this->source->fetchVersion(), 'Remote');
            $updateAvailable = version_compare($remoteVersion, $currentVersion, '>');
            $state = array_replace($state, [
                'status' => $updateAvailable ? 'ready' : 'idle',
                'locked' => false,
                'currentVersion' => $currentVersion,
                'latestVersion' => $remoteVersion,
                'updateAvailable' => $updateAvailable,
                'message' => $updateAvailable ? 'A new admin version is available.' : 'Admin is up to date.',
                'error' => null,
            ]);
            $this->stateStore->write($state);
        } catch (\Throwable $exception) {
            $state = array_replace($state, [
                'status' => 'failed',
                'locked' => false,
                'currentVersion' => $currentVersion,
                'updateAvailable' => false,
                'message' => 'Failed to check for updates.',
                'error' => $exception->getMessage(),
            ]);
            $this->stateStore->write($state);
        }

        return $state;
    }

    /** @return array<string, mixed> */
    public function run(): array
    {
        $currentVersion = $this->readVersionFile($this->versionPath);
        $remoteVersion = $this->readVersionValue($this->source->fetchVersion(), 'Remote');

        if (!version_compare($remoteVersion, $currentVersion, '>')) {
            throw new \InvalidArgumentException('Admin is already up to date.');
        }

        $lock = $this->stateStore->acquire();
        $tempRoot = '';

        $this->stateStore->write([
            'status' => 'running',
            'locked' => true,
            'currentVersion' => $currentVersion,
            'latestVersion' => $remoteVersion,
            'updateAvailable' => true,
            'startedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'finishedAt' => null,
            'message' => 'Downloading update archive.',
            'error' => null,
        ]);

        try {
            $tempRoot = rtrim(sys_get_temp_dir(), '/') . '/upmin-update-' . bin2hex(random_bytes(6));
            if (!mkdir($tempRoot, 0755, true) && !is_dir($tempRoot)) {
                throw new \RuntimeException('Failed to create temporary updater directory.');
            }

            $archivePath = $tempRoot . '/update.tar.gz';
            $extractRoot = $tempRoot . '/archive';

            $this->source->downloadArchive($archivePath);
            $this->touchMessage('Extracting update archive.');

            $remoteRoot = $this->extractArchive($archivePath, $extractRoot);
            $remoteManageRoot = $this->resolveRemoteAdminRoot($remoteRoot);
            $remoteStoreRoot = $remoteRoot . '/store';

            if (!is_dir($remoteManageRoot)) {
                throw new \RuntimeException('Update archive is missing the manage directory.');
            }
            if (!is_dir($remoteStoreRoot)) {
                throw new \RuntimeException('Update archive is missing the public store directory.');
            }

            $remoteVersionPath = $remoteManageRoot . '/store/version.json';
            $validatedRemoteVersion = $this->readVersionFile($remoteVersionPath);
            if ($validatedRemoteVersion !== $remoteVersion) {
                throw new \RuntimeException('Remote version changed during update.');
            }

            $this->touchMessage('Replacing admin files.');
            $this->syncManagedAdminRoot($remoteManageRoot, $this->manageRoot);

            $this->touchMessage('Replacing deployable system pages.');
            $syncedSystemPages = $this->syncDeployableSystemPages($remoteStoreRoot, $this->publicStoreRoot);

            $this->copyFile($remoteVersionPath, $this->versionPath);

            $result = [
                'status' => 'completed',
                'locked' => false,
                'currentVersion' => $validatedRemoteVersion,
                'latestVersion' => $validatedRemoteVersion,
                'updateAvailable' => false,
                'startedAt' => $this->stateStore->read()['startedAt'] ?? null,
                'finishedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
                'message' => 'Admin updated successfully.',
                'error' => null,
                'systemPagesSynced' => $syncedSystemPages,
            ];

            $this->stateStore->write($result);

            return $result;
        } catch (\Throwable $exception) {
            $failed = $this->stateStore->read();
            $failed['status'] = 'failed';
            $failed['locked'] = false;
            $failed['finishedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
            $failed['message'] = 'Admin update failed.';
            $failed['error'] = $exception->getMessage();
            $this->stateStore->write($failed);

            throw $exception;
        } finally {
            if ($tempRoot !== '') {
                $this->deletePath($tempRoot);
            }
            $this->stateStore->release($lock);
        }
    }

    public function isLocked(): bool
    {
        $state = $this->stateStore->reconcile();
        return ($state['locked'] ?? false) === true
            || ($state['status'] ?? null) === 'running'
            || $this->stateStore->isActivelyLocked();
    }

    /** @param array<string, mixed> $payload */
    private function readVersionValue(array $payload, string $label): string
    {
        $version = $payload['version'] ?? null;
        if (!is_string($version) || trim($version) === '') {
            throw new \RuntimeException($label . ' version file is missing a valid version.');
        }

        return trim($version);
    }

    private function readVersionFile(string $path): string
    {
        if (!is_file($path)) {
            throw new \RuntimeException('Version file not found: ' . $path);
        }

        $raw = file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            throw new \RuntimeException('Version file is empty: ' . $path);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Version file is invalid: ' . $path);
        }

        return $this->readVersionValue($decoded, 'Local');
    }

    private function touchMessage(string $message): void
    {
        $state = $this->stateStore->read();
        $state['message'] = $message;
        $this->stateStore->write($state);
    }

    private function resolveRemoteAdminRoot(string $remoteRoot): string
    {
        $candidates = [];

        if ($this->adminRelativePath !== '') {
            $candidates[] = $remoteRoot . '/' . $this->adminRelativePath;
        }
        $candidates[] = $remoteRoot;

        foreach ($candidates as $candidate) {
            if (!is_dir($candidate)) {
                continue;
            }

            if (!is_file($candidate . '/store/version.json')) {
                continue;
            }

            if (!is_dir($candidate . '/src') && !is_dir($candidate . '/public') && !is_file($candidate . '/index.php')) {
                continue;
            }

            return $candidate;
        }

        throw new \RuntimeException('Update archive does not contain a supported admin root.');
    }

    private function resolveAdminRelativePath(string $projectRoot, string $manageRoot): string
    {
        $projectRoot = rtrim(str_replace('\\', '/', $projectRoot), '/');
        $manageRoot = rtrim(str_replace('\\', '/', $manageRoot), '/');
        $prefix = $projectRoot . '/';

        if (!str_starts_with($manageRoot, $prefix)) {
            throw new \InvalidArgumentException('Admin root must be inside the project root.');
        }

        $relativePath = substr($manageRoot, strlen($prefix));
        $relativePath = trim((string) $relativePath, '/');

        if ($relativePath === '') {
            throw new \InvalidArgumentException('Admin relative path cannot be empty.');
        }

        return $relativePath;
    }

    private function extractArchive(string $archivePath, string $destination): string
    {
        if (!class_exists(\PharData::class)) {
            throw new \RuntimeException('PharData is required for admin updates.');
        }

        if (!mkdir($destination, 0755, true) && !is_dir($destination)) {
            throw new \RuntimeException('Failed to create extraction directory.');
        }

        $tarPath = preg_replace('/\.gz$/', '', $archivePath);
        if (!is_string($tarPath) || trim($tarPath) === '') {
            throw new \RuntimeException('Failed to prepare update archive extraction.');
        }

        try {
            if (!is_file($tarPath)) {
                $compressed = new \PharData($archivePath);
                $compressed->decompress();
            }
            $archive = new \PharData($tarPath);
            $archive->extractTo($destination, null, true);
        } catch (\Throwable $exception) {
            throw new \RuntimeException('Failed to extract update archive: ' . $exception->getMessage(), 0, $exception);
        }

        $entries = array_values(array_filter(scandir($destination) ?: [], static fn (string $entry): bool => $entry !== '.' && $entry !== '..'));
        if (count($entries) !== 1) {
            throw new \RuntimeException('Unexpected update archive structure.');
        }

        $root = $destination . '/' . $entries[0];
        if (!is_dir($root)) {
            throw new \RuntimeException('Update archive root is invalid.');
        }

        return $root;
    }

    private function syncManagedAdminRoot(string $sourceRoot, string $targetRoot): void
    {
        if (!is_dir($targetRoot) && !mkdir($targetRoot, 0755, true) && !is_dir($targetRoot)) {
            throw new \RuntimeException('Failed to create target directory: ' . $targetRoot);
        }

        $sourceEntries = $this->listEntries($sourceRoot);
        $targetEntries = $this->listEntries($targetRoot);

        $managedRootFiles = [];
        foreach ($sourceEntries as $entry) {
            if ($this->shouldPreserveAdminRootEntry($entry)) {
                continue;
            }

            $sourcePath = $sourceRoot . '/' . $entry;
            if (is_file($sourcePath) || is_link($sourcePath)) {
                $managedRootFiles[$entry] = true;
            }
        }

        foreach ($targetEntries as $entry) {
            if ($this->shouldPreserveAdminRootEntry($entry)) {
                continue;
            }

            $targetPath = $targetRoot . '/' . $entry;
            if (is_dir($targetPath) && !is_link($targetPath)) {
                if (isset(self::MANAGED_ADMIN_DIRECTORIES[$entry]) && !in_array($entry, $sourceEntries, true)) {
                    $this->deletePath($targetPath);
                }
                continue;
            }

            if (isset($managedRootFiles[$entry]) && !in_array($entry, $sourceEntries, true)) {
                $this->deletePath($targetPath);
            }
        }

        foreach ($sourceEntries as $entry) {
            if ($this->shouldPreserveAdminRootEntry($entry)) {
                continue;
            }

            $sourcePath = $sourceRoot . '/' . $entry;
            $targetPath = $targetRoot . '/' . $entry;

            if (is_dir($sourcePath) && !is_link($sourcePath) && isset(self::MANAGED_ADMIN_DIRECTORIES[$entry])) {
                $this->syncDirectoryContents($sourcePath, $targetPath);
                continue;
            }

            if (is_file($sourcePath) || is_link($sourcePath)) {
                $this->copyFile($sourcePath, $targetPath);
            }
        }
    }

    private function syncDirectoryContents(string $source, string $target): void
    {
        if (!is_dir($target) && !mkdir($target, 0755, true) && !is_dir($target)) {
            throw new \RuntimeException('Failed to create target directory: ' . $target);
        }

        $sourceEntries = $this->listEntries($source);
        $targetEntries = $this->listEntries($target);

        foreach ($targetEntries as $entry) {
            if (!in_array($entry, $sourceEntries, true)) {
                $this->deletePath($target . '/' . $entry);
            }
        }

        foreach ($sourceEntries as $entry) {
            $sourcePath = $source . '/' . $entry;
            $targetPath = $target . '/' . $entry;

            if (is_dir($sourcePath) && !is_link($sourcePath)) {
                $this->syncDirectoryContents($sourcePath, $targetPath);
                continue;
            }

            $this->copyFile($sourcePath, $targetPath);
        }
    }

    private function shouldPreserveAdminRootEntry(string $entry): bool
    {
        return isset(self::PRESERVED_ADMIN_ROOT_ENTRIES[$entry]) || str_starts_with($entry, '.git');
    }

    private function syncDeployableSystemPages(string $remoteStoreRoot, string $localStoreRoot): int
    {
        $remoteFiles = $this->collectDeployableSystemPages($remoteStoreRoot);
        $localFiles = $this->collectDeployableSystemPages($localStoreRoot);

        foreach (array_keys($localFiles) as $relativePath) {
            if (!isset($remoteFiles[$relativePath])) {
                $this->deletePath($localStoreRoot . '/' . $relativePath);
            }
        }

        foreach ($remoteFiles as $relativePath => $sourcePath) {
            $this->copyFile($sourcePath, $localStoreRoot . '/' . $relativePath);
        }

        return count($remoteFiles);
    }

    /** @return array<string, string> */
    private function collectDeployableSystemPages(string $root): array
    {
        if (!is_dir($root)) {
            return [];
        }

        $result = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (!$file instanceof \SplFileInfo || $file->getExtension() !== 'json') {
                continue;
            }

            $path = $file->getPathname();
            $relativePath = ltrim(str_replace(rtrim($root, '/') . '/', '', $path), '/');
            if ($relativePath === 'version.json') {
                continue;
            }

            $raw = file_get_contents($path);
            if (!is_string($raw) || trim($raw) === '') {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                continue;
            }

            if (($decoded['position'] ?? null) !== 'system') {
                continue;
            }

            if (($decoded['update_deploy'] ?? false) !== true) {
                continue;
            }

            $result[$relativePath] = $path;
        }

        ksort($result);

        return $result;
    }

    /** @return string[] */
    private function listEntries(string $root): array
    {
        if (!is_dir($root)) {
            return [];
        }

        $entries = [];
        $items = scandir($root);
        if (!is_array($items)) {
            return [];
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $entries[] = $item;
        }

        sort($entries);

        return $entries;
    }

    private function copyFile(string $source, string $target): void
    {
        $dir = dirname($target);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create directory: ' . $dir);
        }

        if (is_link($target) || is_file($target)) {
            @unlink($target);
        } elseif (is_dir($target)) {
            $this->deletePath($target);
        }

        if (!copy($source, $target)) {
            throw new \RuntimeException('Failed to copy file: ' . $source);
        }
    }

    private function deletePath(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);
            return;
        }
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if (is_array($items)) {
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->deletePath($path . '/' . $item);
            }
        }

        @rmdir($path);
    }
}
