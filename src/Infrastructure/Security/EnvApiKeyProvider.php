<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Security;

use Manage\Application\Ports\ApiKeyProvider;
use Manage\Infrastructure\Config\Env;

final class EnvApiKeyProvider implements ApiKeyProvider
{
    private Env $env;
    private string $keyName;

    public function __construct(Env $env, string $keyName = 'ADMIN_API_KEY')
    {
        $this->env = $env;
        $this->keyName = $keyName;
    }

    public function apiKey(): ?string
    {
        return $this->env->get($this->keyName);
    }
}
