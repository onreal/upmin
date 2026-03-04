<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Config;

final class Env
{
    private array $values;

    private function __construct(array $values)
    {
        $this->values = $values;
    }

    public static function load(string $path): self
    {
        $values = [];

        if (is_file($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                    continue;
                }
                $parts = explode('=', $trimmed, 2);
                if (count($parts) === 2) {
                    $key = trim($parts[0]);
                    $value = trim($parts[1]);
                    $values[$key] = trim($value, "\"'");
                }
            }
        }

        return new self($values);
    }

    public function get(string $key, ?string $default = null): ?string
    {
        $env = getenv($key);
        if ($env !== false) {
            return $env;
        }

        return $this->values[$key] ?? $default;
    }
}
