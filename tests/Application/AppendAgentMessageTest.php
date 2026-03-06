<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\AppendAgentMessage;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class AppendAgentMessageTest extends TestCase
{
    public function testRejectsSecondUserMessageWhileReplyIsPending(): void
    {
        $conversationId = DocumentId::fromParts('private', 'agents/conversations/assistant-user-1.json');
        $repository = $this->repositoryWithConversation($conversationId, true);
        $useCase = new AppendAgentMessage($repository);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Wait for the current reply before sending another message.');

        $useCase->handle($conversationId, 'user-1', 'Another question');
    }

    public function testAppendsAssistantMessageAndClearsPendingState(): void
    {
        $conversationId = DocumentId::fromParts('private', 'agents/conversations/assistant-user-1.json');
        $repository = $this->repositoryWithConversation($conversationId, true);
        $useCase = new AppendAgentMessage($repository);

        $result = $useCase->handle($conversationId, 'user-1', 'Hello back.', 'assistant');

        $this->assertNotNull($result);
        $messages = $result['payload']['data']['messages'];
        $this->assertCount(2, $messages);
        $this->assertSame('assistant', $messages[1]['role']);
        $this->assertSame('Hello back.', $messages[1]['content']);
        $this->assertFalse($result['payload']['data']['pendingResponse']);
        $this->assertArrayNotHasKey('progress', $result['payload']['data']);
    }

    public function testAppendsUserMessageAndSeedsProgressState(): void
    {
        $conversationId = DocumentId::fromParts('private', 'agents/conversations/assistant-user-1.json');
        $repository = $this->repositoryWithConversation($conversationId, false);
        $useCase = new AppendAgentMessage($repository);

        $result = $useCase->handle($conversationId, 'user-1', 'Can you help?');

        $this->assertNotNull($result);
        $data = $result['payload']['data'];
        $this->assertTrue($data['pendingResponse']);
        $this->assertIsArray($data['progress']);
        $this->assertSame('Queued reply...', $data['progress']['status']);
        $this->assertCount(1, $data['progress']['items']);
        $this->assertSame('Queued reply...', $data['progress']['items'][0]['message']);
    }

    private function repositoryWithConversation(DocumentId $conversationId, bool $pending): DocumentRepository
    {
        return new class($conversationId, $pending) implements DocumentRepository {
            /** @var array<string, Document> */
            private array $documents = [];

            public function __construct(DocumentId $conversationId, bool $pending)
            {
                $this->documents[$conversationId->encoded()] = new Document(
                    $conversationId,
                    DocumentWrapper::fromArray([
                        'type' => 'agent',
                        'page' => 'agent-conversations',
                        'name' => 'Assistant · 2026-03-05 10:15',
                        'order' => 1,
                        'data' => [
                            'agentId' => 'private:agents/assistant.json',
                            'agentName' => 'Assistant',
                            'userId' => 'user-1',
                            'createdAt' => '2026-03-05T10:15:00+00:00',
                            'updatedAt' => '2026-03-05T10:15:00+00:00',
                            'pendingResponse' => $pending,
                            'messages' => [
                                [
                                    'role' => 'user',
                                    'content' => 'Hello',
                                    'createdAt' => '2026-03-05T10:15:00+00:00',
                                ],
                            ],
                        ],
                    ]),
                    'private',
                    'agents/conversations/assistant-user-1.json'
                );
            }

            public function listAll(): array
            {
                return array_values($this->documents);
            }

            public function get(DocumentId $id): ?Document
            {
                return $this->documents[$id->encoded()] ?? null;
            }

            public function save(Document $document): void
            {
                $this->documents[$document->id()->encoded()] = $document;
            }
        };
    }
}
