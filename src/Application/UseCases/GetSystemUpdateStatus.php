<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Infrastructure\Update\AdminUpdater;

final class GetSystemUpdateStatus
{
    private AdminUpdater $updater;

    public function __construct(AdminUpdater $updater)
    {
        $this->updater = $updater;
    }

    /** @return array<string, mixed> */
    public function handle(): array
    {
        return $this->updater->status();
    }
}
