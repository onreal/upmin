<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

interface ApiKeyProvider
{
    public function apiKey(): ?string;
}
