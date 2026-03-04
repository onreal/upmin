<?php

declare(strict_types=1);

namespace Manage\Interface\Http;

final class Request
{
    private string $method;
    private string $path;
    private array $headers;
    private array $query;
    private mixed $body;

    public function __construct(string $method, string $path, array $headers, array $query, mixed $body)
    {
        $this->method = $method;
        $this->path = $path;
        $this->headers = $headers;
        $this->query = $query;
        $this->body = $body;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $normalized = str_replace('_', '-', substr($key, 5));
                $headers[$normalized] = $value;
            }
        }

        $rawBody = file_get_contents('php://input');
        $body = null;
        if (is_string($rawBody) && $rawBody !== '') {
            $decoded = json_decode($rawBody, true);
            $body = is_array($decoded) ? $decoded : $rawBody;
        }

        return new self($method, $path, $headers, $_GET, $body);
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function headers(): array
    {
        return $this->headers;
    }

    public function header(string $name): ?string
    {
        foreach ($this->headers as $key => $value) {
            if (strcasecmp($key, $name) === 0) {
                return is_array($value) ? null : (string) $value;
            }
        }
        return null;
    }

    public function query(): array
    {
        return $this->query;
    }

    public function body(): mixed
    {
        return $this->body;
    }
}
