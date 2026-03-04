<?php

declare(strict_types=1);

namespace Manage\Interface\Http;

final class Response
{
    private int $status;
    private array $headers;
    private mixed $body;

    public function __construct(int $status = 200, array $headers = [], mixed $body = null)
    {
        $this->status = $status;
        $this->headers = $headers;
        $this->body = $body;
    }

    public static function json(mixed $body, int $status = 200): self
    {
        return new self($status, ['Content-Type' => 'application/json'], $body);
    }

    public static function text(string $body, int $status = 200): self
    {
        return new self($status, ['Content-Type' => 'text/plain'], $body);
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $header => $value) {
            header($header . ': ' . $value);
        }

        if ($this->body === null) {
            return;
        }

        if (is_array($this->body)) {
            echo json_encode($this->body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            return;
        }

        echo $this->body;
    }

    public function status(): int
    {
        return $this->status;
    }

    public function body(): mixed
    {
        return $this->body;
    }
}
