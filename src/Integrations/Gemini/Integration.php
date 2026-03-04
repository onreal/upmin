<?php

declare(strict_types=1);

namespace Manage\Integrations\Gemini;

use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\Infrastructure\HttpClient;
use Manage\Integrations\IntegrationContext;

final class Integration implements IntegrationHandler
{
    private IntegrationDefinition $definition;
    private HttpClient $http;

    public function __construct(IntegrationDefinition $definition, IntegrationContext $context)
    {
        $this->definition = $definition;
        $this->http = new HttpClient();
    }

    public function definition(): IntegrationDefinition
    {
        return $this->definition;
    }

    public function fetchModels(array $settings): array
    {
        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Gemini apiKey is required.');
        }

        $url = 'https://generativelanguage.googleapis.com/v1/models?key=' . urlencode(trim($apiKey));
        $response = $this->http->getJson($url);
        $items = $response['models'] ?? null;
        if (!is_array($items)) {
            throw new \RuntimeException('Gemini models response missing models.');
        }

        $models = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $name = $item['name'] ?? null;
            if (is_string($name) && trim($name) !== '') {
                $models[] = $name;
            }
        }

        return $models;
    }
}
