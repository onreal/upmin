<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\ApiKeyProvider;

final class AuthenticateApiKey
{
    private ApiKeyProvider $apiKeyProvider;

    public function __construct(ApiKeyProvider $apiKeyProvider)
    {
        $this->apiKeyProvider = $apiKeyProvider;
    }

    public function handle(?string $provided): bool
    {
        $expected = $this->apiKeyProvider->apiKey();
        if ($expected === null || $expected === '') {
            return false;
        }

        if ($provided === null) {
            return false;
        }

        return hash_equals($expected, trim($provided));
    }
}
