<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Agents;

use Manage\Domain\Document\Document;

final class AgentPromptResolver
{
    /** @var array<string, string> */
    private array $stores;

    /** @param array<string, string> $stores */
    public function __construct(array $stores)
    {
        $this->stores = $stores;
    }

    /** @param array<string, mixed> $data */
    public function resolve(Document $document, array $data, string $inlineKey, string $fileKey): string
    {
        $file = $data[$fileKey] ?? null;
        if (is_string($file) && trim($file) !== '') {
            return $this->readPromptFile($document, trim($file), $fileKey);
        }

        $inline = $data[$inlineKey] ?? null;
        if (!is_string($inline) || trim($inline) === '') {
            throw new \InvalidArgumentException('Agent.' . $inlineKey . ' is required.');
        }

        return trim($inline);
    }

    private function readPromptFile(Document $document, string $relativePath, string $field): string
    {
        if (strtolower((string) pathinfo($relativePath, PATHINFO_EXTENSION)) !== 'md') {
            throw new \InvalidArgumentException('Agent.' . $field . ' must point to a .md file.');
        }

        $root = $this->stores[$document->store()] ?? null;
        if (!is_string($root) || $root === '') {
            throw new \InvalidArgumentException('Agent.' . $field . ' store is invalid.');
        }

        $agentDirectory = dirname($document->path());
        $baseDirectory = rtrim($root, DIRECTORY_SEPARATOR);
        if ($agentDirectory !== '' && $agentDirectory !== '.') {
            $baseDirectory .= DIRECTORY_SEPARATOR . $agentDirectory;
        }

        $target = $this->joinRelativePath($baseDirectory, $relativePath);
        if (!is_file($target)) {
            throw new \InvalidArgumentException('Agent.' . $field . ' file not found.');
        }
        if (!$this->isWithinDirectory($baseDirectory, $target)) {
            throw new \InvalidArgumentException('Prompt file paths cannot leave the agent directory.');
        }

        $contents = file_get_contents($target);
        if ($contents === false || trim($contents) === '') {
            throw new \InvalidArgumentException('Agent.' . $field . ' file is empty.');
        }

        return trim($contents);
    }

    private function joinRelativePath(string $baseDirectory, string $relativePath): string
    {
        $relativePath = str_replace('\\', '/', trim($relativePath));
        if ($relativePath === '' || str_starts_with($relativePath, '/')) {
            throw new \InvalidArgumentException('Prompt file paths must be relative to the agent directory.');
        }

        $parts = [];
        foreach (explode('/', $relativePath) as $part) {
            $segment = trim($part);
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                throw new \InvalidArgumentException('Prompt file paths cannot leave the agent directory.');
            }
            $parts[] = $segment;
        }

        if ($parts === []) {
            throw new \InvalidArgumentException('Prompt file path is invalid.');
        }

        return rtrim($baseDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $parts);
    }

    private function isWithinDirectory(string $baseDirectory, string $target): bool
    {
        $realBase = realpath($baseDirectory);
        $realTarget = realpath($target);
        if ($realBase === false || $realTarget === false) {
            return false;
        }

        $normalizedBase = rtrim($realBase, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        return str_starts_with($realTarget, $normalizedBase);
    }
}
