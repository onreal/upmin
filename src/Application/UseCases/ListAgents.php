<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Integration\IntegrationId;

final class ListAgents
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    /** @return array<int, array<string, mixed>> */
    public function handle(): array
    {
        $agents = [];

        foreach ($this->documents->listAll() as $document) {
            if (!$this->isAgentDefinition($document)) {
                continue;
            }

            $document = $this->ensureDocumentId->handle($document);
            $wrapper = $document->wrapper();
            $data = $wrapper->data();
            if (is_array($data)) {
                $provider = $data['provider'] ?? null;
                $providerId = $data['providerId'] ?? null;
                if (is_string($provider) && trim($provider) !== '' && !IntegrationId::isValid($providerId)) {
                    $data['providerId'] = IntegrationId::fromName($provider);
                    $wrapper = $wrapper->withData($data);
                    $document = $document->withWrapper($wrapper);
                    $this->documents->save($document);
                }
            }

            $agents[] = [
                'id' => $document->id()->encoded(),
                'uid' => $wrapper->id(),
                'name' => $wrapper->name(),
                'provider' => is_array($data ?? null) && is_string($data['provider'] ?? null) ? $data['provider'] : null,
                'providerId' => is_array($data ?? null) && is_string($data['providerId'] ?? null) ? $data['providerId'] : null,
                'store' => $document->store(),
                'path' => $document->path(),
                'order' => $wrapper->order(),
            ];
        }

        usort($agents, [self::class, 'compareByOrder']);

        return $agents;
    }

    private function isAgentDefinition(Document $document): bool
    {
        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agents' || $wrapper->isSection()) {
            return false;
        }
        $data = $wrapper->data();
        if (is_array($data) && isset($data['position']) && is_string($data['position'])) {
            if (strtolower(trim($data['position'])) === 'system') {
                return false;
            }
        }
        return true;
    }

    /** @param array<string, mixed> $a @param array<string, mixed> $b */
    private static function compareByOrder(array $a, array $b): int
    {
        $orderA = is_int($a['order'] ?? null) ? $a['order'] : PHP_INT_MAX;
        $orderB = is_int($b['order'] ?? null) ? $b['order'] : PHP_INT_MAX;

        if ($orderA !== $orderB) {
            return $orderA <=> $orderB;
        }

        return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
    }
}
