<?php

declare(strict_types=1);

namespace Manage\Integrations\Contracts;

use Manage\Domain\Integration\IntegrationDefinition;

interface IntegrationHandler
{
    public function definition(): IntegrationDefinition;

    /** @param array<string, mixed> $settings
     *  @return string[]
     */
    public function fetchModels(array $settings): array;
}
