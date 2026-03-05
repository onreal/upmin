<?php

declare(strict_types=1);

namespace Manage\Integrations\Contracts;

interface ChatIntegration
{
    /**
     * @param array<string, mixed> $settings
     * @param array<string, mixed> $payload
     */
    public function chat(array $settings, array $payload): string;
}
