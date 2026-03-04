<?php

declare(strict_types=1);

namespace Manage\Domain\Auth;

final class User
{
    private UserId $id;
    private string $firstname;
    private string $lastname;
    private string $email;
    private string $passwordHash;
    private array $attributes;

    public function __construct(
        UserId $id,
        string $firstname,
        string $lastname,
        string $email,
        string $passwordHash,
        array $attributes = []
    ) {
        $this->id = $id;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->email = $email;
        $this->passwordHash = $passwordHash;
        $this->attributes = $attributes;
    }

    public function id(): UserId
    {
        return $this->id;
    }

    public function firstname(): string
    {
        return $this->firstname;
    }

    public function lastname(): string
    {
        return $this->lastname;
    }

    public function email(): string
    {
        return $this->email;
    }

    public function passwordHash(): string
    {
        return $this->passwordHash;
    }

    public function attributes(): array
    {
        return $this->attributes;
    }
}
