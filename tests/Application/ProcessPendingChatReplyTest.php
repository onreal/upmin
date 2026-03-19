<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\Ports\RealtimePublisher;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Infrastructure\Agents\AgentResponder;
use Manage\Infrastructure\Conversations\ConversationProgressTracker;
use Manage\Modules\Chat\Application\ProcessPendingReply;
use PHPUnit\Framework\TestCase;

final class ProcessPendingChatReplyTest extends TestCase
{
    public function testInjectsInitialPageContextOnlyOnFirstPendingReply(): void
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
                            'contextMessages' => [
                                [
                                    'role' => 'user',
                                    'content' => implode("\n\n", [
                                        'Use the following current page data JSON as context for this conversation.',
                                        'PAGE_DATA_JSON:',
                                        "{\n    \"title\": \"Homepage\",\n    \"blocks\": [\n        {\n            \"type\": \"hero\"\n        }\n    ]\n}",
                                        'Use the following exact JSON schema as the required structure reference for this conversation.',
                                        'JSON_SCHEMA:',
                                        "{\n    \"type\": \"object\",\n    \"properties\": {\n        \"content\": {\n            \"type\": \"string\"\n        }\n    }\n}",
                                    ]),
                                ],
                            ],
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
        $call = 0;
        $responder->expects($this->exactly(2))
            ->method('reply')
            ->willReturnCallback(function (?string $agentId, string $agentName, array $messages) use (&$call): string {
                $call++;
                self::assertSame('private:agents/helper.json', $agentId);
                self::assertSame('Helper', $agentName);
                self::assertNotEmpty($messages);

                if ($call === 1) {
                    self::assertStringContainsString('PAGE_DATA_JSON:', $messages[0]['content']);
                    self::assertStringContainsString('"title": "Homepage"', $messages[0]['content']);
                    self::assertStringContainsString('JSON_SCHEMA:', $messages[0]['content']);
                    self::assertStringContainsString('"content"', $messages[0]['content']);
                    self::assertSame('Hello', $messages[1]['content']);
                    return 'Hello back.';
                }

                self::assertStringContainsString('PAGE_DATA_JSON:', $messages[0]['content']);
                self::assertSame('Hello', $messages[1]['content']);
                self::assertSame('Hello back.', $messages[2]['content']);
                self::assertSame('Next step', $messages[3]['content']);
                return 'Second reply.';
            });

        $progress = new ConversationProgressTracker($repository, $realtime);
        $useCase = new ProcessPendingReply($repository, $responder, $realtime, $progress);
        $useCase->handle($conversationId->encoded());

        $updated = $repository->get($conversationId);
        $this->assertNotNull($updated);
        $data = $updated->wrapper()->data();
        $this->assertIsArray($data);
        $this->assertFalse($data['pendingResponse']);
        $this->assertCount(2, $data['messages']);
        $this->assertSame('Hello', $data['messages'][0]['content']);
        $this->assertSame('assistant', $data['messages'][1]['role']);
        $this->assertSame('Hello back.', $data['messages'][1]['content']);
        $this->assertArrayNotHasKey('progress', $data);
        $this->assertArrayHasKey('contextMessages', $data);

        $this->assertCount(1, $published);
        $this->assertSame('user:user-1', $published[0]['identity']);
        $this->assertSame('chat.conversation.updated', $published[0]['event']['type']);

        $repository->save(
            new Document(
                $conversationId,
                $updated->wrapper()->withData([
                    ...$data,
                    'pendingResponse' => true,
                    'messages' => [
                        ...$data['messages'],
                        [
                            'role' => 'user',
                            'content' => 'Next step',
                            'createdAt' => '2026-03-05T10:16:00+00:00',
                        ],
                    ],
                ]),
                'public',
                'chats/test-user-1-conversation.json'
            )
        );

        $useCase->handle($conversationId->encoded());

        $secondUpdate = $repository->get($conversationId);
        $this->assertNotNull($secondUpdate);
        $secondData = $secondUpdate->wrapper()->data();
        $this->assertIsArray($secondData);
        $this->assertCount(4, $secondData['messages']);
        $this->assertSame('Second reply.', $secondData['messages'][3]['content']);
    }
}
