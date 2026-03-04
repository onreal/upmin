<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\ListAgents;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class ListAgentsTest extends TestCase
{
    public function testListsAgentDefinitionsOnly(): void
    {
        $repository = new class() implements DocumentRepository {
            public function listAll(): array
            {
                return [
                    new Document(
                        DocumentId::fromParts('public', 'content.json'),
                        DocumentWrapper::fromArray([
                            'page' => 'content',
                            'name' => 'Content',
                            'order' => 1,
                            'section' => false,
                            'data' => [],
                        ]),
                        'public',
                        'content.json'
                    ),
                    new Document(
                        DocumentId::fromParts('private', 'agents/assistant.json'),
                        DocumentWrapper::fromArray([
                            'type' => 'agent',
                            'page' => 'agents',
                            'name' => 'Assistant',
                            'order' => 1,
                            'section' => false,
                            'data' => [],
                        ]),
                        'private',
                        'agents/assistant.json'
                    ),
                    new Document(
                        DocumentId::fromParts('private', 'agents/conversations/assistant-user-1.json'),
                        DocumentWrapper::fromArray([
                            'type' => 'agent',
                            'page' => 'agent-conversations',
                            'name' => 'Assistant · 2026-03-04 10:00',
                            'order' => 1,
                            'section' => false,
                            'data' => [
                                'agentId' => 'private:agents/assistant.json',
                                'userId' => 'user-1',
                                'messages' => [],
                            ],
                        ]),
                        'private',
                        'agents/conversations/assistant-user-1.json'
                    ),
                ];
            }

            public function get(DocumentId $id): ?Document
            {
                return null;
            }

            public function save(Document $document): void
            {
            }
        };

        $useCase = new ListAgents($repository);
        $agents = $useCase->handle();

        $this->assertCount(1, $agents);
        $this->assertSame('Assistant', $agents[0]['name']);
    }
}
