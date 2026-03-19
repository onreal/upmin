<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\Ports\RealtimePublisher;
use Manage\Application\UseCases\ProcessPendingAgentReply;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Infrastructure\Conversations\ConversationProgressTracker;
use PHPUnit\Framework\TestCase;

final class ProcessPendingAgentReplyTest extends TestCase
{
    public function testProcessesPendingReplyAndPublishesRealtimeEvent(): void
    {
        $conversationId = DocumentId::fromParts('private', 'agents/conversations/assistant-user-1.json');
        $repository = new class($conversationId) implements DocumentRepository {
            /** @var array<string, Document> */
            public array $documents = [];

            public function __construct(DocumentId $conversationId)
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
                            'pendingResponse' => true,
                            'progress' => [
                                'status' => 'Queued reply...',
                                'updatedAt' => '2026-03-05T10:15:00+00:00',
                                'items' => [
                                    [
                                        'message' => 'Queued reply...',
                                        'createdAt' => '2026-03-05T10:15:00+00:00',
                                    ],
                                ],
                            ],
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
            ->willReturnCallback(function (?string $agentId, string $agentName, array $messages): string {
                self::assertSame('private:agents/assistant.json', $agentId);
                self::assertSame('Assistant', $agentName);
                self::assertSame('Hello', $messages[0]['content']);
                self::assertStringNotContainsString('PAGE_DATA_JSON:', $messages[0]['content']);

                return 'Hello back.';
            });

        $progress = new ConversationProgressTracker($repository, $realtime);
        $useCase = new ProcessPendingAgentReply($repository, $responder, $realtime, $progress);
        $useCase->handle($conversationId->encoded());

        $updated = $repository->get($conversationId);
        $this->assertNotNull($updated);
        $data = $updated->wrapper()->data();
        $this->assertIsArray($data);
        $this->assertFalse($data['pendingResponse']);
        $this->assertCount(2, $data['messages']);
        $this->assertSame('assistant', $data['messages'][1]['role']);
        $this->assertSame('Hello back.', $data['messages'][1]['content']);
        $this->assertArrayNotHasKey('progress', $data);

        $this->assertCount(1, $published);
        $this->assertSame('user:user-1', $published[0]['identity']);
        $this->assertSame('agent.conversation.updated', $published[0]['event']['type']);
    }
}
