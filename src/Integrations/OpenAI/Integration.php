<?php

declare(strict_types=1);

namespace Manage\Integrations\OpenAI;

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
            throw new \InvalidArgumentException('OpenAI apiKey is required.');
        }

        $headers = [
            'Authorization' => 'Bearer ' . trim($apiKey),
        ];

        $organization = $settings['organization'] ?? null;
        if (is_string($organization) && trim($organization) !== '') {
            $headers['OpenAI-Organization'] = trim($organization);
        }

        $response = $this->http->getJson('https://api.openai.com/v1/models', $headers);
        $items = $response['data'] ?? null;
        if (!is_array($items)) {
            throw new \RuntimeException('OpenAI models response missing data.');
        }

        $models = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id = $item['id'] ?? null;
            if (is_string($id) && trim($id) !== '') {
                $models[] = $id;
            }
        }

        return $models;
    }
}
