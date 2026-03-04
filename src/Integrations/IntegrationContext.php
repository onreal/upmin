<?php

declare(strict_types=1);

namespace Manage\Integrations;

final class IntegrationContext
{
    private string $projectRoot;
    private string $manageRoot;

    public function __construct(string $projectRoot, string $manageRoot)
    {
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->manageRoot = rtrim($manageRoot, '/');
    }

    public function projectRoot(): string
    {
        return $this->projectRoot;
    }

    public function manageRoot(): string
    {
        return $this->manageRoot;
    }
}
