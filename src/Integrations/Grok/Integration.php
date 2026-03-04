<?php

declare(strict_types=1);

namespace Manage\Integrations\Grok;

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
            throw new \InvalidArgumentException('Grok apiKey is required.');
        }

        $headers = [
            'Authorization' => 'Bearer ' . trim($apiKey),
        ];

        $response = $this->http->getJson('https://api.x.ai/v1/models', $headers);
        $items = $response['data'] ?? null;
        if (!is_array($items)) {
            throw new \RuntimeException('Grok models response missing data.');
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
