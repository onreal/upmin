<?php

declare(strict_types=1);

namespace Manage\Integrations\Contracts;

use Manage\Domain\Integration\IntegrationDefinition;

interface IntegrationCatalog
{
    /** @return IntegrationDefinition[] */
    public function list(): array;

    public function definition(string $name): ?IntegrationDefinition;

    public function handler(string $name): ?IntegrationHandler;
}
