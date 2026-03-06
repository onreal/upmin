<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Application\UseCases\EnsureDocumentId;

final class CreateAgentConversation
{
    private DocumentRepository $documents;
    private EnsureDocumentId $ensureDocumentId;

    public function __construct(DocumentRepository $documents, EnsureDocumentId $ensureDocumentId)
    {
        $this->documents = $documents;
        $this->ensureDocumentId = $ensureDocumentId;
    }

    /** @return array<string, mixed>|null */
    public function handle(DocumentId $agentId, string $userId): ?array
    {
        $agent = $this->documents->get($agentId);
        if ($agent === null) {
            return null;
        }

        $agent = $this->ensureDocumentId->handle($agent);
        $agentWrapper = $agent->wrapper();
        if ($agentWrapper->type() !== 'agent' || $agentWrapper->page() !== 'agents' || $agentWrapper->isSection()) {
            return null;
        }
        $agentUid = $agentWrapper->id();
        if ($agentUid === null) {
            throw new \RuntimeException('Agent id is required.');
        }

        $timestamp = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $createdAt = $timestamp->format(DATE_ATOM);
        $labelDate = $timestamp->format('Y-m-d H:i');

        $agentSlug = $this->slug($agentWrapper->name());
        if ($agentSlug === '') {
            $agentSlug = 'agent';
        }

        $userSlug = $this->slug($userId);
        if ($userSlug === '') {
            $userSlug = 'user';
        }

        $store = 'private';
        $path = $this->uniquePath($store, $agentSlug, $userSlug, $timestamp->format('YmdHis'));

        $wrapper = DocumentWrapper::fromArray([
            'type' => 'agent',
            'page' => 'agent-conversations',
            'name' => $agentWrapper->name() . ' · ' . $labelDate,
            'order' => 1,
            'data' => [
                'agentId' => $agentUid,
                'agentName' => $agentWrapper->name(),
                'userId' => $userId,
                'createdAt' => $createdAt,
                'updatedAt' => $createdAt,
                'pendingResponse' => false,
                'messages' => [],
            ],
        ]);

        $document = new Document(DocumentId::fromParts($store, $path), $wrapper, $store, $path);
        $this->documents->save($document);
        $document = $this->ensureDocumentId->handle($document);

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }

    private function uniquePath(string $store, string $agentSlug, string $userSlug, string $timestamp): string
    {
        $base = 'agents/conversations/' . $agentSlug . '-' . $userSlug . '-' . $timestamp;
        $suffix = '';
        $counter = 1;

        while (true) {
            $path = $base . $suffix . '.json';
            $id = DocumentId::fromParts($store, $path);
            if ($this->documents->get($id) === null) {
                return $path;
            }
            $counter++;
            $suffix = '-' . $counter;
        }
    }

    private function slug(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        return trim($value, '-');
    }
}
