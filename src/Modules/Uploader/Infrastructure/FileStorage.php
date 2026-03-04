<?php

declare(strict_types=1);

namespace Manage\Modules\Uploader\Infrastructure;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\ModuleContext;

final class FileStorage
{
    private ModuleDefinition $definition;
    private ModuleContext $context;

    public function __construct(ModuleDefinition $definition, ModuleContext $context)
    {
        $this->definition = $definition;
        $this->context = $context;
    }

    /** @param array<string, mixed>|null $settings */
    public function store(array $file, ?array $settings = null): array
    {
        $storage = $this->definition->parameters()['storage'] ?? [];
        if (is_array($settings) && array_key_exists('storage', $settings)) {
            $storage = $settings['storage'] ?? [];
        }
        if (!is_array($storage)) {
            throw new \RuntimeException('Module storage configuration is invalid.');
        }

        $visibility = $this->stringOrDefault($storage['visibility'] ?? null, 'public');
        if (!in_array($visibility, ['public', 'private'], true)) {
            throw new \RuntimeException('Module storage visibility must be public or private.');
        }

        $root = $this->normalizePath($this->stringOrDefault($storage['root'] ?? null, 'media'));
        $folder = $this->normalizePath($this->stringOrDefault($storage['folder'] ?? null, ''));
        $maxSizeMb = $this->intOrDefault($storage['maxSizeMb'] ?? null, 10);

        if ($root === '') {
            throw new \RuntimeException('Module storage root is required.');
        }

        $basePath = $visibility === 'public'
            ? $this->context->projectRoot()
            : $this->context->manageRoot();
        $targetDir = $basePath . '/' . $root;
        if ($folder !== '') {
            $targetDir .= '/' . $folder;
        }

        $this->ensureDir($targetDir);
        $this->assertUploadedFile($file);

        $tmpPath = $file['tmp_name'];
        $originalName = $file['name'] ?? 'upload';
        $size = (int) ($file['size'] ?? 0);

        if ($size <= 0) {
            throw new \RuntimeException('Uploaded file is empty.');
        }
        if ($size > ($maxSizeMb * 1024 * 1024)) {
            throw new \RuntimeException('Uploaded file exceeds size limit.');
        }

        $mime = $this->detectMime($tmpPath);
        $extension = $this->extensionForMime($mime) ?? $this->extensionFromName($originalName);
        if ($extension === null) {
            throw new \RuntimeException('Unsupported image type.');
        }

        $filename = $this->buildFilename($originalName, $extension);
        $targetPath = $targetDir . '/' . $filename;

        if (!move_uploaded_file($tmpPath, $targetPath)) {
            throw new \RuntimeException('Unable to save uploaded file.');
        }

        $urlBase = $visibility === 'public'
            ? '/' . ltrim($root, '/')
            : '/manage-media/' . ltrim($root, '/');

        $url = rtrim($urlBase, '/');
        if ($folder !== '') {
            $url .= '/' . ltrim($folder, '/');
        }
        $url .= '/' . $filename;

        return [
            'url' => $url,
            'path' => $this->relativePath($root, $folder, $filename),
            'filename' => $filename,
            'visibility' => $visibility,
            'size' => $size,
            'mime' => $mime,
        ];
    }

    private function stringOrDefault(mixed $value, string $default): string
    {
        if (!is_string($value)) {
            return $default;
        }
        $trimmed = trim($value);
        return $trimmed === '' ? $default : $trimmed;
    }

    private function intOrDefault(mixed $value, int $default): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }
        return $default;
    }

    private function normalizePath(string $value): string
    {
        $value = trim($value);
        $value = str_replace('\\', '/', $value);
        $value = trim($value, '/');
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^[a-zA-Z0-9_\\-\\/]+$/', $value)) {
            throw new \RuntimeException('Storage path contains invalid characters.');
        }
        if (str_contains($value, '..')) {
            throw new \RuntimeException('Storage path traversal is not allowed.');
        }
        return $value;
    }

    private function ensureDir(string $dir): void
    {
        if (is_dir($dir)) {
            return;
        }
        if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create storage directory.');
        }
    }

    private function assertUploadedFile(array $file): void
    {
        if (!isset($file['error'])) {
            throw new \RuntimeException('File upload failed.');
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $message = match ($file['error']) {
                UPLOAD_ERR_INI_SIZE => $this->uploadLimitMessage('upload_max_filesize'),
                UPLOAD_ERR_FORM_SIZE => 'Uploaded file exceeds the form size limit.',
                UPLOAD_ERR_PARTIAL => 'File upload was interrupted.',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
                UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory is missing.',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
                UPLOAD_ERR_EXTENSION => 'File upload was stopped by a server extension.',
                default => 'File upload failed.',
            };
            throw new \RuntimeException($message);
        }
        if (!isset($file['tmp_name']) || !is_string($file['tmp_name'])) {
            throw new \RuntimeException('File upload is invalid.');
        }
        if (!is_uploaded_file($file['tmp_name'])) {
            throw new \RuntimeException('File upload is invalid.');
        }
    }

    private function uploadLimitMessage(string $iniKey): string
    {
        $limit = ini_get($iniKey);
        if (is_string($limit) && $limit !== '') {
            return 'Uploaded file exceeds server limit (' . $iniKey . ': ' . $limit . ').';
        }
        return 'Uploaded file exceeds server limit.';
    }

    private function detectMime(string $path): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path);
        return is_string($mime) ? $mime : 'application/octet-stream';
    }

    private function extensionForMime(string $mime): ?string
    {
        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/svg+xml' => 'svg',
            default => null,
        };
    }

    private function extensionFromName(string $name): ?string
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        return $ext !== '' ? $ext : null;
    }

    private function buildFilename(string $originalName, string $extension): string
    {
        $base = strtolower(pathinfo($originalName, PATHINFO_FILENAME));
        $base = preg_replace('/[^a-z0-9_-]+/', '-', $base) ?? 'upload';
        $base = trim($base, '-');
        if ($base === '') {
            $base = 'upload';
        }
        $suffix = bin2hex(random_bytes(4));
        $timestamp = date('YmdHis');
        return sprintf('%s-%s-%s.%s', $base, $timestamp, $suffix, $extension);
    }

    private function relativePath(string $root, string $folder, string $filename): string
    {
        $segments = [$root];
        if ($folder !== '') {
            $segments[] = $folder;
        }
        $segments[] = $filename;
        return implode('/', $segments);
    }
}
