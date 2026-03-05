<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Agents;

use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
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
    public function reply(?string $agentId, string $agentName, array $messages): string
    {
        $agent = $this->resolveAgent($agentId, $agentName);
        if ($agent === null) {
            throw new \InvalidArgumentException('Chat agent not found.');
        }

        $provider = strtolower($agent['provider']);
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

        return $handler->chat($settings, $payload);
    }

    /** @return array{provider: string, model: string, systemPrompt: string, adminPrompt: string}|null */
    private function resolveAgent(?string $agentId, string $agentName): ?array
    {
        $document = null;

        if ($agentId !== null) {
            try {
                $id = DocumentId::fromEncoded($agentId);
            } catch (\InvalidArgumentException $exception) {
                $id = null;
            }
            if ($id !== null) {
                $document = $this->documents->get($id);
            }
        }

        if ($document === null) {
            $document = $this->findAgentByName($agentName);
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
            'model' => trim($model),
            'systemPrompt' => trim($systemPrompt),
            'adminPrompt' => trim($adminPrompt),
        ];
    }

    private function findAgentByName(string $agentName): ?Document
    {
        $needle = strtolower(trim($agentName));
        if ($needle === '') {
            return null;
        }

        foreach ($this->documents->listAll() as $document) {
            $wrapper = $document->wrapper();
            if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
                continue;
            }
            if (strtolower($wrapper->name()) === $needle) {
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
}
