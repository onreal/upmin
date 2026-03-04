<?php

declare(strict_types=1);

namespace Manage\Infrastructure\FileSystem;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class JsonDocumentRepository implements DocumentRepository
{
    /** @var array<string, string> */
    private array $stores;

    /** @param array<string, string> $stores */
    public function __construct(array $stores)
    {
        $this->stores = $stores;
    }

    public function listAll(): array
    {
        $documents = [];

        foreach ($this->stores as $store => $root) {
            if (!is_dir($root)) {
                continue;
            }

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if (!$file instanceof \SplFileInfo) {
                    continue;
                }

                if ($file->getExtension() !== 'json') {
                    continue;
                }

                $relative = ltrim(str_replace($root, '', $file->getPathname()), '/');
                $document = $this->buildDocument($store, $root, $relative);
                if ($document !== null) {
                    $documents[] = $document;
                }
            }
        }

        return $documents;
    }

    public function get(DocumentId $id): ?Document
    {
        $store = $id->store();
        $path = $id->path();

        if (!isset($this->stores[$store])) {
            return null;
        }

        return $this->buildDocument($store, $this->stores[$store], $path);
    }

    public function save(Document $document): void
    {
        $store = $document->store();
        if (!isset($this->stores[$store])) {
            throw new \RuntimeException('Unknown document store.');
        }

        $root = $this->stores[$store];
        $target = $this->safePath($root, $document->path());
        $dir = dirname($target);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $payload = json_encode($document->wrapper()->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            throw new \RuntimeException('Failed to encode JSON.');
        }

        file_put_contents($target, $payload . PHP_EOL, LOCK_EX);
    }

    private function buildDocument(string $store, string $root, string $relative): ?Document
    {
        $path = $this->safePath($root, $relative);
        if (!is_file($path)) {
            return null;
        }

        $raw = file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        try {
            $wrapper = DocumentWrapper::fromArray($decoded);
        } catch (\InvalidArgumentException $exception) {
            return null;
        }

        $id = DocumentId::fromParts($store, $relative);

        return new Document($id, $wrapper, $store, $relative);
    }

    private function safePath(string $root, string $relative): string
    {
        $relative = ltrim($relative, '/');
        $path = $root . DIRECTORY_SEPARATOR . $relative;
        $realRoot = realpath($root) ?: $root;
        $realPath = realpath($path) ?: $path;

        if (strpos($realPath, $realRoot) !== 0) {
            throw new \RuntimeException('Invalid document path.');
        }

        return $path;
    }
}
