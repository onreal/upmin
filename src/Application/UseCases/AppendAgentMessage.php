<?php

declare(strict_types=1);

namespace Manage\Application\UseCases;

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;

final class AppendAgentMessage
{
    private DocumentRepository $documents;

    public function __construct(DocumentRepository $documents)
    {
        $this->documents = $documents;
    }

    /** @return array<string, mixed>|null */
    public function handle(DocumentId $id, string $userId, string $content, string $role = 'user'): ?array
    {
        $document = $this->documents->get($id);
        if ($document === null) {
            return null;
        }

        $wrapper = $document->wrapper();
        if ($wrapper->type() !== 'agent' || $wrapper->page() !== 'agent-conversations' || $wrapper->isSection()) {
            return null;
        }

        $data = $wrapper->data();
        if (!is_array($data)) {
            return null;
        }
        if (($data['userId'] ?? null) !== $userId) {
            return null;
        }

        $content = trim($content);
        if ($content === '') {
            throw new \InvalidArgumentException('Message.content is required.');
        }

        $role = strtolower(trim($role));
        if (!in_array($role, ['user', 'assistant'], true)) {
            $role = 'user';
        }

        if ($role === 'user' && ($data['pendingResponse'] ?? false) === true) {
            throw new \InvalidArgumentException('Wait for the current reply before sending another message.');
        }

        $messages = $data['messages'] ?? [];
        if (!is_array($messages)) {
            $messages = [];
        }

        $messages[] = [
            'role' => $role,
            'content' => $content,
            'createdAt' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM),
        ];

        $data['messages'] = $messages;
        $data['updatedAt'] = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
        $data['pendingResponse'] = $role === 'user';

        $updatedWrapper = $wrapper->withData($data);

        $document = $document->withWrapper($updatedWrapper);
        $this->documents->save($document);

        return [
            'id' => $document->id()->encoded(),
            'store' => $document->store(),
            'path' => $document->path(),
            'payload' => $document->wrapper()->toArray(),
        ];
    }
}
