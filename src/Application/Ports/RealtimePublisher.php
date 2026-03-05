<?php

declare(strict_types=1);

namespace Manage\Application\Ports;

interface RealtimePublisher
{
    /** @param array<string, mixed> $event */
    public function publishToIdentity(string $identity, array $event): void;
}
