<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Agents;

use Manage\Domain\Document\Document;
use Manage\Integrations\Contracts\ChatIntegration;
use Manage\Integrations\IntegrationRegistry;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;

class AgentResponder
{
    private JsonDocumentRepository $documents;
    private IntegrationRegistry $integrations;
    private IntegrationSettingsStore $settings;

    public function __construct(
        JsonDocumentRepository $documents,
        IntegrationRegistry $integrations,
        IntegrationSettingsStore $settings
    )
    {
        $this->documents = $documents;
        $this->integrations = $integrations;
        $this->settings = $settings;
    }

    /**
     * @param array<int, array<string, mixed>> $messages
     */
    public function reply(?string $agentId, string $agentName, array $messages, ?callable $onProgress = null): string
    {
        $agent = $this->resolveAgent($agentId, $agentName);
        if ($agent === null) {
            throw new \InvalidArgumentException('Chat agent not found.');
        }

        $definition = $this->resolveIntegrationDefinition($agent['providerId'] ?? null, $agent['provider']);
        if ($definition === null) {
            throw new \InvalidArgumentException('Chat provider not found.');
        }
        $provider = $definition->name();
        $handler = $this->integrations->handler($provider);
        if ($handler === null) {
            throw new \InvalidArgumentException('Chat provider not found.');
        }
        if (!$handler instanceof ChatIntegration) {
            throw new \InvalidArgumentException('Chat provider does not support chat.');
        }

        $settings = $this->settings->read($provider);
        if ($settings === null) {
            throw new \InvalidArgumentException('Chat provider settings not found.');
        }

        $payload = [
            'model' => $agent['model'],
            'systemPrompt' => $agent['systemPrompt'],
            'adminPrompt' => $agent['adminPrompt'],
            'messages' => $this->normalizeMessages($messages),
        ];
        if ($onProgress !== null) {
            $payload['onProgress'] = $onProgress;
        }

        return $handler->chat($settings, $payload);
    }

    /** @return array{provider: string, providerId: ?string, model: string, systemPrompt: string, adminPrompt: string}|null */
    private function resolveAgent(?string $agentId, string $agentName): ?array
    {
        $document = null;

        if ($agentId !== null) {
            $agentId = trim($agentId);
            if ($agentId !== '' && preg_match(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
                $agentId
            )) {
                $document = $this->findAgentByUid(strtolower($agentId));
            }
        }

        if ($document === null) {
            return null;
        }

        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
            return null;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return null;
        }

        $provider = $data['provider'] ?? null;
        $providerId = $data['providerId'] ?? null;
        $model = $data['model'] ?? null;
        $systemPrompt = $data['systemPrompt'] ?? null;
        $adminPrompt = $data['adminPrompt'] ?? null;

        if (!is_string($provider) || trim($provider) === '') {
            throw new \InvalidArgumentException('Agent.provider is required.');
        }
        if (!is_string($model) || trim($model) === '') {
            throw new \InvalidArgumentException('Agent.model is required.');
        }
        if (!is_string($systemPrompt) || trim($systemPrompt) === '') {
            throw new \InvalidArgumentException('Agent.systemPrompt is required.');
        }
        if (!is_string($adminPrompt) || trim($adminPrompt) === '') {
            throw new \InvalidArgumentException('Agent.adminPrompt is required.');
        }

        return [
            'provider' => trim($provider),
            'providerId' => is_string($providerId) && trim($providerId) !== '' ? strtolower(trim($providerId)) : null,
            'model' => trim($model),
            'systemPrompt' => trim($systemPrompt),
            'adminPrompt' => trim($adminPrompt),
        ];
    }

    private function findAgentByUid(string $uid): ?Document
    {
        foreach ($this->documents->listAll() as $document) {
            $wrapper = $document->wrapper();
            if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
                continue;
            }
            if ($wrapper->id() === $uid) {
                return $document;
            }
        }

        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $messages
     * @return array<int, array{role: string, content: string}>
     */
    private function normalizeMessages(array $messages): array
    {
        $normalized = [];
        foreach ($messages as $message) {
            if (!is_array($message)) {
                continue;
            }
            $role = $message['role'] ?? null;
            $content = $message['content'] ?? null;
            if (!is_string($content) || trim($content) === '') {
                continue;
            }
            $normalizedRole = strtolower(is_string($role) ? trim($role) : '');
            if (!in_array($normalizedRole, ['assistant', 'user'], true)) {
                $normalizedRole = 'user';
            }
            $normalized[] = [
                'role' => $normalizedRole,
                'content' => $content,
            ];
        }

        return $normalized;
    }

    private function resolveIntegrationDefinition(?string $providerId, string $provider): ?\Manage\Domain\Integration\IntegrationDefinition
    {
        if (is_string($providerId) && trim($providerId) !== '') {
            $normalized = strtolower(trim($providerId));
            foreach ($this->integrations->list() as $definition) {
                if ($definition->id() === $normalized) {
                    return $definition;
                }
            }
        }

        $provider = strtolower(trim($provider));
        if ($provider === '') {
            return null;
        }

        return $this->integrations->definition($provider);
    }
}
