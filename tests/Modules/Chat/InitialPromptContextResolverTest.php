<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\Chat\Application\InitialPromptContextResolver;
use PHPUnit\Framework\TestCase;

final class InitialPromptContextResolverTest extends TestCase
{
    public function testResolvesPageDataAndExactSchemaFromSettingsKey(): void
    {
        $pageId = '11111111-1111-4111-8111-111111111111';
        $pageDocument = new Document(
            DocumentId::fromParts('public', 'pages/home.json'),
            DocumentWrapper::fromArray([
                'id' => $pageId,
                'type' => 'page',
                'page' => 'home',
                'name' => 'Home',
                'order' => 1,
                'section' => false,
                'modules' => ['chat'],
                'data' => [
                    'title' => 'Homepage',
                    'blocks' => [
                        ['type' => 'hero'],
                    ],
                ],
            ]),
            'public',
            'pages/home.json'
        );

        $repository = new class($pageDocument) implements DocumentRepository {
            /** @var array<int, Document> */
            private array $documents;

            public function __construct(Document $document)
            {
                $this->documents = [$document];
            }

            public function listAll(): array
            {
                return $this->documents;
            }

            public function get(DocumentId $id): ?Document
            {
                foreach ($this->documents as $document) {
                    if ($document->id()->encoded() === $id->encoded()) {
                        return $document;
                    }
                }

                return null;
            }

            public function save(Document $document): void
            {
                $this->documents[] = $document;
            }
        };

        $definition = ModuleDefinition::fromArray([
            'name' => 'chat',
            'description' => 'Chat with an agent and store conversations',
            'author' => 'me',
            'input' => 'message',
            'output' => 'conversation',
            'parameters' => [],
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'content' => ['type' => 'string'],
                ],
            ],
        ]);

        $resolver = new InitialPromptContextResolver($repository, $definition);
        $context = $resolver->resolve($pageId . '-chat');

        $this->assertSame(
            [
                'title' => 'Homepage',
                'blocks' => [
                    ['type' => 'hero'],
                ],
            ],
            $context['pageData'] ?? null
        );
        $this->assertSame($definition->schema(), $context['schema'] ?? null);
    }
}
