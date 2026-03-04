<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\CreateAgentConversation;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class CreateAgentConversationTest extends TestCase
{
    public function testCreatesConversationWithUserIdInPath(): void
    {
        $repository = new class() implements DocumentRepository {
            /** @var array<string, Document> */
            private array $documents = [];

            public function __construct()
            {
                $agentId = DocumentId::fromParts('private', 'agents/assistant.json');
                $this->documents[$agentId->encoded()] = new Document(
                    $agentId,
                    DocumentWrapper::fromArray([
                        'type' => 'agent',
                        'page' => 'agents',
                        'name' => 'Assistant',
                        'order' => 1,
                        'section' => false,
                        'data' => [
                            'provider' => 'openai',
                            'model' => 'gpt-4.1',
                            'systemPrompt' => 'system',
                            'adminPrompt' => 'admin',
                        ],
                    ]),
                    'private',
                    'agents/assistant.json'
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

        $useCase = new CreateAgentConversation($repository);
        $agentId = DocumentId::fromParts('private', 'agents/assistant.json');

        $result = $useCase->handle($agentId, 'user-1');

        $this->assertNotNull($result);
        $this->assertIsString($result['path']);
        $this->assertStringContainsString('agents/conversations/assistant-user-1-', $result['path']);
        $this->assertSame('agent-conversations', $result['payload']['page']);
        $this->assertSame('agent', $result['payload']['type']);
        $this->assertSame($agentId->encoded(), $result['payload']['data']['agentId']);
        $this->assertSame('user-1', $result['payload']['data']['userId']);
        $this->assertSame([], $result['payload']['data']['messages']);
    }
}
