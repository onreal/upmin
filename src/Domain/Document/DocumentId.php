<?php

declare(strict_types=1);

namespace Manage\Domain\Document;

final class DocumentId
{
    private string $store;
    private string $path;

    private function __construct(string $store, string $path)
    {
        $this->store = $store;
        $this->path = $path;
    }

    public static function fromParts(string $store, string $path): self
    {
        return new self($store, $path);
    }

    public static function fromEncoded(string $encoded): self
    {
        $decoded = self::base64UrlDecode($encoded);
        $parts = explode(':', $decoded, 2);
        if (count($parts) !== 2) {
            throw new \InvalidArgumentException('Invalid document id.');
        }

        return new self($parts[0], $parts[1]);
    }

    public function encoded(): string
    {
        return self::base64UrlEncode($this->store . ':' . $this->path);
    }

    public function store(): string
    {
        return $this->store;
    }

    public function path(): string
    {
        return $this->path;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }
        return (string) base64_decode(strtr($value, '-_', '+/'));
    }
}
