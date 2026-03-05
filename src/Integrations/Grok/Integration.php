<?php

declare(strict_types=1);

namespace Manage\Integrations\Grok;

use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\ChatIntegration;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\Infrastructure\HttpClient;
use Manage\Integrations\IntegrationContext;

final class Integration implements IntegrationHandler, ChatIntegration
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

    public function chat(array $settings, array $payload): string
    {
        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Grok apiKey is required.');
        }

        $model = $payload['model'] ?? null;
        if (!is_string($model) || trim($model) === '') {
            throw new \InvalidArgumentException('Grok model is required.');
        }

        $headers = [
            'Authorization' => 'Bearer ' . trim($apiKey),
        ];

        $messages = [];
        $systemPrompt = $payload['systemPrompt'] ?? null;
        if (is_string($systemPrompt) && trim($systemPrompt) !== '') {
            $messages[] = ['role' => 'system', 'content' => trim($systemPrompt)];
        }
        $adminPrompt = $payload['adminPrompt'] ?? null;
        if (is_string($adminPrompt) && trim($adminPrompt) !== '') {
            $messages[] = ['role' => 'system', 'content' => trim($adminPrompt)];
        }

        $inputMessages = $payload['messages'] ?? [];
        if (is_array($inputMessages)) {
            foreach ($inputMessages as $message) {
                if (!is_array($message)) {
                    continue;
                }
                $role = $message['role'] ?? null;
                $content = $message['content'] ?? null;
                if (!is_string($role) || !is_string($content) || trim($content) === '') {
                    continue;
                }
                $normalizedRole = strtolower(trim($role));
                if (!in_array($normalizedRole, ['user', 'assistant'], true)) {
                    $normalizedRole = 'user';
                }
                $messages[] = ['role' => $normalizedRole, 'content' => $content];
            }
        }

        $response = $this->http->postJson('https://api.x.ai/v1/chat/completions', $headers, [
            'model' => trim($model),
            'messages' => $messages,
        ]);

        $choices = $response['choices'] ?? null;
        if (!is_array($choices) || $choices === []) {
            throw new \RuntimeException('Grok response missing choices.');
        }
        $first = $choices[0] ?? null;
        if (!is_array($first)) {
            throw new \RuntimeException('Grok response invalid.');
        }
        $message = $first['message'] ?? null;
        if (!is_array($message)) {
            throw new \RuntimeException('Grok response missing message.');
        }
        $content = $message['content'] ?? null;
        if (!is_string($content) || trim($content) === '') {
            throw new \RuntimeException('Grok response missing content.');
        }

        return trim($content);
    }
}
