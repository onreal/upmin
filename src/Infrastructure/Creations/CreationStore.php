<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Creations;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class CreationStore
{
    private const PAGE_STORE = 'private';
    private const PAGE_PATH = 'creations.json';
    private const CREATIONS_DIR = 'creations';
    private const MANIFEST_FILE = '.creation-manifest.json';
    public const TARGET_PUBLIC = 'public';
    public const TARGET_BUILD = 'build';

    /** @var array<string, bool> */
    private const EXCLUDED_PUBLIC_ROOT_ITEMS = [
        'manage' => true,
        'upmin' => true,
        'media' => true,
        'router.php' => true,
        'AGENTS.md' => true,
        'docker-compose.yml' => true,
        'build' => true,
    ];
    /** @var array<string, bool> */
    private const EXCLUDED_BUILD_CLEAN_ITEMS = [
        'AGENTS.md' => true,
    ];

    private DocumentRepository $documents;
    private string $projectRoot;
    private string $manageRoot;

    public function __construct(DocumentRepository $documents, string $projectRoot, string $manageRoot)
    {
        $this->documents = $documents;
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->manageRoot = rtrim($manageRoot, '/');
    }

    public function ensurePage(): void
    {
        if ($this->documents->get($this->pageId()) !== null) {
            $this->ensureCreationsDirectory();
            return;
        }

        $wrapper = DocumentWrapper::fromArray([
            'type' => 'page',
            'page' => 'creations',
            'name' => 'Creations',
            'order' => 4,
            'section' => false,
            'position' => 'system',
            'data' => ['creations' => []],
        ]);

        $document = new Document($this->pageId(), $wrapper, self::PAGE_STORE, self::PAGE_PATH);
        $this->documents->save($document);
        $this->ensureCreationsDirectory();
    }

    /** @return array<string, mixed> */
    public function snapshot(string $snapshotDataUrl, string $reason, string $target = self::TARGET_PUBLIC): array
    {
        $page = $this->pageDocument();
        $this->ensureCreationsDirectory();
        $target = $this->normalizeTarget($target);

        $createdAt = (new \DateTimeImmutable())->format(DATE_ATOM);
        $id = $this->nextCreationId();
        $decoded = $this->decodeSnapshot($snapshotDataUrl);
        $snapshotRelative = self::CREATIONS_DIR . '/' . $id . '.' . $decoded['extension'];
        $archiveRelative = self::CREATIONS_DIR . '/' . $id . '.tar.gz';
        $snapshotPath = $this->creationAssetPath($snapshotRelative);

        if (file_put_contents($snapshotPath, $decoded['content'], LOCK_EX) === false) {
            throw new \RuntimeException('Failed to store snapshot image.');
        }

        try {
            $this->createArchive($this->creationAssetPath($archiveRelative), $createdAt, $reason, $target);
        } catch (\Throwable $exception) {
            if (is_file($snapshotPath)) {
                unlink($snapshotPath);
            }
            throw $exception;
        }

        $creation = [
            'id' => $id,
            'createdAt' => $createdAt,
            'reason' => $reason,
            'target' => $target,
            'snapshotPath' => $snapshotRelative,
            'snapshotMimeType' => $decoded['mimeType'],
            'backupPath' => $archiveRelative,
        ];

        $updated = $this->savePageCreations($page, static function (array $creations) use ($creation): array {
            array_unshift($creations, $creation);
            return $creations;
        });

        return [
            'creation' => $creation,
            'document' => $this->serializeDocument($updated),
        ];
    }

    /** @return array<string, mixed> */
    public function clearAll(?string $snapshotDataUrl): array
    {
        $result = [
            'document' => $this->serializeDocument($this->pageDocument()),
        ];
        if ($this->shouldCreateSnapshotOnEachClean()) {
            if (!is_string($snapshotDataUrl) || trim($snapshotDataUrl) === '') {
                throw new \InvalidArgumentException('Snapshot image is required.');
            }
            $result = $this->snapshot($snapshotDataUrl, 'before-clear', self::TARGET_PUBLIC);
        }
        $this->clearTargetEntries(self::TARGET_PUBLIC);

        return $result;
    }

    /** @return array<string, mixed> */
    public function restore(string $id): array
    {
        $page = $this->pageDocument();
        $creation = $this->findCreation($page, $id);
        $archive = $this->creationAssetPath((string) ($creation['backupPath'] ?? ''));

        if (!is_file($archive)) {
            throw new \OutOfBoundsException('Creation archive not found.');
        }

        $workspace = $this->makeTempDirectory('creation-restore-');
        $extractDir = $workspace . '/extract';
        mkdir($extractDir, 0700, true);

        try {
            $this->extractArchive($archive, $workspace, $extractDir);
            $target = $this->normalizeTarget($creation['target'] ?? null);
            $this->clearTargetEntries($target, true);
            $this->restoreFromDirectory($extractDir, $target);
        } finally {
            $this->deletePath($workspace);
        }

        return [
            'creation' => $creation,
            'document' => $this->serializeDocument($this->pageDocument()),
        ];
    }

    /** @return array<string, mixed> */
    public function delete(string $id): array
    {
        $page = $this->pageDocument();
        $creation = $this->findCreation($page, $id);

        foreach (['snapshotPath', 'backupPath'] as $key) {
            $relative = $creation[$key] ?? null;
            if (!is_string($relative) || trim($relative) === '') {
                continue;
            }
            $absolute = $this->creationAssetPath($relative);
            if (is_file($absolute)) {
                unlink($absolute);
            }
        }

        $updated = $this->savePageCreations($page, static function (array $creations) use ($id): array {
            return array_values(array_filter(
                $creations,
                static fn (array $creation): bool => ($creation['id'] ?? null) !== $id
            ));
        });

        return [
            'document' => $this->serializeDocument($updated),
        ];
    }

    /** @return array{path: string, filename: string, mimeType: string} */
    public function downloadArchive(string $id): array
    {
        $page = $this->pageDocument();
        $creation = $this->findCreation($page, $id);
        $relative = $creation['backupPath'] ?? null;
        if (!is_string($relative) || trim($relative) === '') {
            throw new \OutOfBoundsException('Creation archive not found.');
        }

        $path = $this->creationAssetPath($relative);
        if (!is_file($path)) {
            throw new \OutOfBoundsException('Creation archive not found.');
        }

        return [
            'path' => $path,
            'filename' => basename($path),
            'mimeType' => 'application/gzip',
        ];
    }

    /** @return array{path: string, filename: string, mimeType: string} */
    public function readSnapshotImage(string $id): array
    {
        $page = $this->pageDocument();
        $creation = $this->findCreation($page, $id);
        $relative = $creation['snapshotPath'] ?? null;
        if (!is_string($relative) || trim($relative) === '') {
            throw new \OutOfBoundsException('Creation snapshot not found.');
        }

        $path = $this->creationAssetPath($relative);
        if (!is_file($path)) {
            throw new \OutOfBoundsException('Creation snapshot not found.');
        }

        $mimeType = $creation['snapshotMimeType'] ?? null;
        if (!is_string($mimeType) || trim($mimeType) === '') {
            $mimeType = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                'jpg', 'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'svg' => 'image/svg+xml',
                default => 'image/png',
            };
        }

        return [
            'path' => $path,
            'filename' => basename($path),
            'mimeType' => $mimeType,
        ];
    }

    public function shouldCreateSnapshotOnEachClean(): bool
    {
        $document = $this->documents->get(DocumentId::fromParts(self::PAGE_STORE, 'system/configuration.json'));
        if ($document === null) {
            return true;
        }

        $data = $document->wrapper()->data();
        if (!is_array($data)) {
            return true;
        }

        $value = $data['createSnapshotOnEachClean'] ?? null;
        return !is_bool($value) || $value;
    }

    private function pageId(): DocumentId
    {
        return DocumentId::fromParts(self::PAGE_STORE, self::PAGE_PATH);
    }

    private function ensureCreationsDirectory(): void
    {
        $dir = $this->manageRoot . '/store/' . self::CREATIONS_DIR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    private function pageDocument(): Document
    {
        $this->ensurePage();
        $document = $this->documents->get($this->pageId());
        if ($document === null) {
            throw new \RuntimeException('Creations page is unavailable.');
        }

        return $document;
    }

    /** @return array<int, array<string, mixed>> */
    private function pageCreations(Document $page): array
    {
        $data = $page->wrapper()->data();
        if (is_array($data) && array_is_list($data)) {
            $records = $data;
        } elseif (is_array($data) && isset($data['creations']) && is_array($data['creations'])) {
            $records = $data['creations'];
        } else {
            $records = [];
        }

        $creations = [];
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }
            $id = $record['id'] ?? null;
            $createdAt = $record['createdAt'] ?? null;
            $snapshotPath = $record['snapshotPath'] ?? null;
            $backupPath = $record['backupPath'] ?? null;
            if (!is_string($id) || !is_string($createdAt) || !is_string($snapshotPath) || !is_string($backupPath)) {
                continue;
            }
            $creations[] = [
                'id' => $id,
                'createdAt' => $createdAt,
                'reason' => is_string($record['reason'] ?? null) ? $record['reason'] : 'manual',
                'target' => $this->normalizeTarget($record['target'] ?? null),
                'snapshotPath' => $snapshotPath,
                'snapshotMimeType' => is_string($record['snapshotMimeType'] ?? null) ? $record['snapshotMimeType'] : 'image/png',
                'backupPath' => $backupPath,
            ];
        }

        return $creations;
    }

    private function savePageCreations(Document $page, callable $mutate): Document
    {
        $current = $this->pageCreations($page);
        $next = $mutate($current);
        $wrapper = $page->wrapper()->withData(['creations' => array_values($next)]);
        $updated = $page->withWrapper($wrapper);
        $this->documents->save($updated);

        return $updated;
    }

    /** @return array<string, mixed> */
    private function findCreation(Document $page, string $id): array
    {
        foreach ($this->pageCreations($page) as $creation) {
            if (($creation['id'] ?? null) === $id) {
                return $creation;
            }
        }

        throw new \OutOfBoundsException('Creation not found.');
    }

    private function nextCreationId(): string
    {
        $base = 'creation-' . (new \DateTimeImmutable())->format('Ymd-His');
        $candidate = $base;
        $index = 2;
        while (
            is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.png'))
            || is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.jpg'))
            || is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.jpeg'))
            || is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.webp'))
            || is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.svg'))
            || is_file($this->creationAssetPath(self::CREATIONS_DIR . '/' . $candidate . '.tar.gz'))
        ) {
            $candidate = $base . '-' . $index;
            $index += 1;
        }

        return $candidate;
    }

    /** @return array{extension: string, mimeType: string, content: string} */
    private function decodeSnapshot(string $snapshotDataUrl): array
    {
        if (!preg_match('#^data:(image/(png|jpeg|jpg|webp)|image/svg\+xml);base64,(.+)$#s', trim($snapshotDataUrl), $matches)) {
            throw new \InvalidArgumentException('Snapshot image is invalid.');
        }

        $mimeType = strtolower($matches[1]);
        $extension = match ($mimeType) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            default => 'png',
        };

        $content = base64_decode(str_replace(' ', '+', $matches[3]), true);
        if ($content === false || $content === '') {
            throw new \InvalidArgumentException('Snapshot image is invalid.');
        }

        return [
            'extension' => $extension,
            'mimeType' => $mimeType === 'image/jpg' ? 'image/jpeg' : $mimeType,
            'content' => $content,
        ];
    }

    private function creationAssetPath(string $relative): string
    {
        $relative = trim(str_replace('\\', '/', $relative), '/');
        if ($relative === '' || str_contains($relative, '..') || !str_starts_with($relative, self::CREATIONS_DIR . '/')) {
            throw new \RuntimeException('Invalid creation asset path.');
        }

        return $this->manageRoot . '/store/' . $relative;
    }

    private function createArchive(string $archivePath, string $createdAt, string $reason, string $target): void
    {
        $workspace = $this->makeTempDirectory('creation-build-');
        $archiveTarget = $this->normalizeTarget($target);
        $sourceRoot = $this->targetRoot($archiveTarget);

        try {
            $entries = $this->archivedEntries($sourceRoot, $archiveTarget);
            foreach ($entries as $entry) {
                $source = $sourceRoot . '/' . $entry;
                $destination = $workspace . '/' . $entry;
                $this->copyPath($source, $destination);
            }

            file_put_contents(
                $workspace . '/' . self::MANIFEST_FILE,
                json_encode([
                    'createdAt' => $createdAt,
                    'reason' => $reason,
                    'target' => $archiveTarget,
                    'entries' => $entries,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL
            );

            $this->archiveDirectory($workspace, $archivePath);
        } finally {
            $this->deletePath($workspace);
        }
    }

    private function archiveDirectory(string $sourceDir, string $archivePath): void
    {
        $tarPath = preg_replace('/\.gz$/', '', $archivePath);
        if (!is_string($tarPath) || $tarPath === $archivePath) {
            throw new \RuntimeException('Invalid archive path.');
        }

        foreach ([$archivePath, $tarPath] as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }

        $archive = new \PharData($tarPath);
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if (!$item instanceof \SplFileInfo) {
                continue;
            }
            $local = substr($item->getPathname(), strlen($sourceDir) + 1);
            if ($local === '' || $local === false) {
                continue;
            }
            if ($item->isDir()) {
                $archive->addEmptyDir($local);
                continue;
            }
            $archive->addFile($item->getPathname(), $local);
        }

        $archive->compress(\Phar::GZ);
        unset($archive);

        $compressedPath = $tarPath . '.gz';
        if (!is_file($compressedPath)) {
            throw new \RuntimeException('Failed to create creation archive.');
        }

        rename($compressedPath, $archivePath);
        if (is_file($tarPath)) {
            unlink($tarPath);
        }
    }

    private function extractArchive(string $archivePath, string $workspace, string $extractDir): void
    {
        $workingArchive = $workspace . '/archive.tar.gz';
        if (!copy($archivePath, $workingArchive)) {
            throw new \RuntimeException('Failed to read creation archive.');
        }

        $compressed = new \PharData($workingArchive);
        $compressed->decompress();

        $tarPath = substr($workingArchive, 0, -3);
        $archive = new \PharData($tarPath);
        $archive->extractTo($extractDir, null, true);
    }

    private function restoreFromDirectory(string $extractDir, string $target): void
    {
        $restoreRoot = $this->targetRoot($target);
        foreach ($this->archivedEntries($extractDir, $target) as $entry) {
            $source = $extractDir . '/' . $entry;
            $destination = $restoreRoot . '/' . $entry;
            $this->copyPath($source, $destination);
        }
    }

    /** @return string[] */
    private function publicManagedEntries(string $root): array
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
            if (str_starts_with($item, '.')) {
                continue;
            }
            if (isset(self::EXCLUDED_PUBLIC_ROOT_ITEMS[$item])) {
                continue;
            }
            $entries[] = $item;
        }

        sort($entries);

        return $entries;
    }

    /** @return string[] */
    private function buildCleanEntries(string $root): array
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
            if (str_starts_with($item, '.')) {
                continue;
            }
            if (isset(self::EXCLUDED_BUILD_CLEAN_ITEMS[$item])) {
                continue;
            }
            $entries[] = $item;
        }

        sort($entries);

        return $entries;
    }

    /** @return string[] */
    private function archivedEntries(string $root, string $target): array
    {
        $target = $this->normalizeTarget($target);
        if ($target === self::TARGET_PUBLIC) {
            return $this->publicManagedEntries($root);
        }

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
            if (str_starts_with($item, '.')) {
                continue;
            }
            $entries[] = $item;
        }

        sort($entries);

        return $entries;
    }

    private function clearTargetEntries(string $target, bool $forRestore = false): void
    {
        $target = $this->normalizeTarget($target);
        if ($target === self::TARGET_BUILD) {
            $buildRoot = $this->targetRoot($target);
            if (!is_dir($buildRoot)) {
                return;
            }
            $entries = $forRestore ? $this->archivedEntries($buildRoot, $target) : $this->buildCleanEntries($buildRoot);
            foreach ($entries as $entry) {
                $this->deletePath($buildRoot . '/' . $entry);
            }
            return;
        }

        foreach ($this->publicManagedEntries($this->projectRoot) as $entry) {
            $this->deletePath($this->projectRoot . '/' . $entry);
        }
    }

    private function normalizeTarget(mixed $target): string
    {
        $normalized = strtolower(trim(is_string($target) ? $target : ''));
        return $normalized === self::TARGET_BUILD ? self::TARGET_BUILD : self::TARGET_PUBLIC;
    }

    private function targetRoot(string $target): string
    {
        $target = $this->normalizeTarget($target);
        if ($target === self::TARGET_BUILD) {
            return $this->projectRoot . '/build';
        }

        return $this->projectRoot;
    }

    private function copyPath(string $source, string $target): void
    {
        if (is_dir($source)) {
            if (!is_dir($target)) {
                mkdir($target, 0755, true);
            }
            $items = scandir($source);
            if (!is_array($items)) {
                return;
            }
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->copyPath($source . '/' . $item, $target . '/' . $item);
            }
            return;
        }

        $dir = dirname($target);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        if (!copy($source, $target)) {
            throw new \RuntimeException('Failed to copy website files for creation archive.');
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

    private function makeTempDirectory(string $prefix): string
    {
        $path = rtrim(sys_get_temp_dir(), '/') . '/' . $prefix . bin2hex(random_bytes(8));
        if (!mkdir($path, 0700, true) && !is_dir($path)) {
            throw new \RuntimeException('Failed to prepare creation workspace.');
        }

        return $path;
    }

    /** @return array<string, mixed> */
    private function serializeDocument(Document $document): array
    {
        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
