<?php

declare(strict_types=1);

namespace Manage\Integrations\Gemini;

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

    public function chat(array $settings, array $payload): string
    {
        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Gemini apiKey is required.');
        }

        $model = $payload['model'] ?? null;
        if (!is_string($model) || trim($model) === '') {
            throw new \InvalidArgumentException('Gemini model is required.');
        }

        $systemPrompt = $payload['systemPrompt'] ?? null;
        $adminPrompt = $payload['adminPrompt'] ?? null;
        $systemText = '';
        if (is_string($systemPrompt) && trim($systemPrompt) !== '') {
            $systemText = trim($systemPrompt);
        }
        if (is_string($adminPrompt) && trim($adminPrompt) !== '') {
            $systemText = $systemText !== '' ? ($systemText . "\n" . trim($adminPrompt)) : trim($adminPrompt);
        }

        $contents = [];
        $inputMessages = $payload['messages'] ?? [];
        if (is_array($inputMessages)) {
            foreach ($inputMessages as $message) {
                if (!is_array($message)) {
                    continue;
                }
                $role = $message['role'] ?? null;
                $content = $message['content'] ?? null;
                if (!is_string($content) || trim($content) === '') {
                    continue;
                }
                $normalizedRole = strtolower(is_string($role) ? trim($role) : '');
                $geminiRole = $normalizedRole === 'assistant' ? 'model' : 'user';
                $contents[] = [
                    'role' => $geminiRole,
                    'parts' => [
                        ['text' => $content],
                    ],
                ];
            }
        }

        $body = [
            'contents' => $contents,
        ];
        if ($systemText !== '') {
            $body['system_instruction'] = [
                'parts' => [
                    ['text' => $systemText],
                ],
            ];
        }

        $modelId = trim($model);
        if (str_starts_with($modelId, 'models/')) {
            $modelId = substr($modelId, strlen('models/'));
        }
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($modelId) . ':generateContent?key=' . urlencode(trim($apiKey));
        $response = $this->http->postJson($url, [], $body);
        $candidates = $response['candidates'] ?? null;
        if (!is_array($candidates) || $candidates === []) {
            throw new \RuntimeException('Gemini response missing candidates.');
        }
        $first = $candidates[0] ?? null;
        if (!is_array($first)) {
            throw new \RuntimeException('Gemini response invalid.');
        }
        $content = $first['content'] ?? null;
        if (!is_array($content)) {
            throw new \RuntimeException('Gemini response missing content.');
        }
        $parts = $content['parts'] ?? null;
        if (!is_array($parts) || $parts === []) {
            throw new \RuntimeException('Gemini response missing parts.');
        }
        $firstPart = $parts[0] ?? null;
        if (!is_array($firstPart)) {
            throw new \RuntimeException('Gemini response invalid parts.');
        }
        $text = $firstPart['text'] ?? null;
        if (!is_string($text) || trim($text) === '') {
            throw new \RuntimeException('Gemini response missing text.');
        }

        return trim($text);
    }
}
