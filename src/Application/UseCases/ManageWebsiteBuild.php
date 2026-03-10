<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Infrastructure\WebsiteBuild\WebsiteBuildStore;

final class ManageWebsiteBuild
{
    private WebsiteBuildStore $store;

    public function __construct(WebsiteBuildStore $store)
    {
        $this->store = $store;
    }

    /** @return array{status: string, entries: int, publishedAt: string} */
    public function publish(): array
    {
        return $this->store->publish();
    }

    /** @return array{status: string, entries: int, cleanedAt: string} */
    public function clean(): array
    {
        return $this->store->clean();
    }
}
