<?php

declare(strict_types=1);

namespace Manage\Domain\Auth;

final class UserId
{
    private string $value;

    private function __construct(string $value)
    {
        $this->value = $value;
    }

    public static function fromString(string $value): self
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            throw new \InvalidArgumentException('User id cannot be empty.');
        }
        return new self($trimmed);
    }

    public function value(): string
    {
        return $this->value;
    }
}
