<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\Ports\RealtimePublisher;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Modules\Chat\Application\ProcessPendingReply;
use PHPUnit\Framework\TestCase;

final class ProcessPendingChatReplyTest extends TestCase
{
    public function testProcessesPendingReplyAndPublishesRealtimeEvent(): void
    {
        $conversationId = DocumentId::fromParts('public', 'chats/test-user-1-conversation.json');
        $repository = new class($conversationId) implements DocumentRepository {
            /** @var array<string, Document> */
            public array $documents = [];

            public function __construct(DocumentId $conversationId)
            {
                $this->documents[$conversationId->encoded()] = new Document(
                    $conversationId,
                    DocumentWrapper::fromArray([
                        'type' => 'agent',
                        'page' => 'chat-conversations',
                        'name' => 'Helper · 2026-03-05 10:15',
                        'order' => 1,
                        'data' => [
                            'moduleKey' => 'content-chat',
                            'agentName' => 'Helper',
                            'agentId' => 'private:agents/helper.json',
                            'userId' => 'user-1',
                            'createdAt' => '2026-03-05T10:15:00+00:00',
                            'updatedAt' => '2026-03-05T10:15:00+00:00',
                            'pendingResponse' => true,
                            'messages' => [
                                [
                                    'role' => 'user',
                                    'content' => 'Hello',
                                    'createdAt' => '2026-03-05T10:15:00+00:00',
                                ],
                            ],
                        ],
                    ]),
                    'public',
                    'chats/test-user-1-conversation.json'
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

        $published = [];
        $realtime = new class($published) implements RealtimePublisher {
            /** @var array<int, array{identity: string, event: array<string, mixed>}> */
            public array $messages;

            /** @param array<int, array{identity: string, event: array<string, mixed>}> $messages */
            public function __construct(array &$messages)
            {
                $this->messages = &$messages;
            }

            public function publishToIdentity(string $identity, array $event): void
            {
                $this->messages[] = ['identity' => $identity, 'event' => $event];
            }
        };

        $responder = $this->createMock(AgentResponder::class);
        $responder->expects($this->once())
            ->method('reply')
            ->willReturn('Hello back.');

        $useCase = new ProcessPendingReply($repository, $responder, $realtime);
        $useCase->handle($conversationId->encoded());

        $updated = $repository->get($conversationId);
        $this->assertNotNull($updated);
        $data = $updated->wrapper()->data();
        $this->assertIsArray($data);
        $this->assertFalse($data['pendingResponse']);
        $this->assertCount(2, $data['messages']);
        $this->assertSame('assistant', $data['messages'][1]['role']);
        $this->assertSame('Hello back.', $data['messages'][1]['content']);

        $this->assertCount(1, $published);
        $this->assertSame('user:user-1', $published[0]['identity']);
        $this->assertSame('chat.conversation.updated', $published[0]['event']['type']);
    }
}
