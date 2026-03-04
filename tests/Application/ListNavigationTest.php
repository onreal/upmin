<?php

declare(strict_types=1);

use Manage\Application\Ports\DocumentRepository;
use Manage\Application\UseCases\EnsureModuleSettings;
use Manage\Application\UseCases\ListNavigation;
use Manage\Domain\Document\Document;
use Manage\Domain\Document\DocumentId;
use Manage\Domain\Document\DocumentWrapper;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsStore;
use PHPUnit\Framework\TestCase;

final class ListNavigationTest extends TestCase
{
    public function testBuildsPagesAndSections(): void
    {
        $repository = new class() implements DocumentRepository {
            public function listAll(): array
            {
                return [
                    new Document(
                        DocumentId::fromParts('public', 'content.json'),
                        DocumentWrapper::fromArray([
                            'page' => 'content',
                            'name' => 'Περιεχόμενο',
                            'order' => 2,
                            'section' => false,
                            'data' => [],
                        ]),
                        'public',
                        'content.json'
                    ),
                    new Document(
                        DocumentId::fromParts('public', 'projects.json'),
                        DocumentWrapper::fromArray([
                            'page' => 'projects',
                            'name' => 'Projects',
                            'order' => 1,
                            'section' => false,
                            'data' => [],
                        ]),
                        'public',
                        'projects.json'
                    ),
                    new Document(
                        DocumentId::fromParts('public', 'hero.json'),
                        DocumentWrapper::fromArray([
                            'page' => 'content',
                            'name' => 'Hero',
                            'order' => 2,
                            'section' => true,
                            'data' => [],
                        ]),
                        'public',
                        'hero.json'
                    ),
                    new Document(
                        DocumentId::fromParts('public', 'intro.json'),
                        DocumentWrapper::fromArray([
                            'page' => 'content',
                            'name' => 'Intro',
                            'order' => 1,
                            'section' => true,
                            'data' => [],
                        ]),
                        'public',
                        'intro.json'
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

        $context = new ModuleContext(sys_get_temp_dir(), sys_get_temp_dir());
        $registry = new ModuleRegistry(sys_get_temp_dir() . '/modules', $context);
        $settingsStore = new ModuleSettingsStore($context);
        $ensureModuleSettings = new EnsureModuleSettings($registry, $settingsStore);

        $useCase = new ListNavigation($repository, $ensureModuleSettings);
        $pages = $useCase->handle();

        $this->assertCount(2, $pages);
        $this->assertSame('Projects', $pages[0]['name']);
        $this->assertSame('Περιεχόμενο', $pages[1]['name']);
        $this->assertCount(2, $pages[1]['sections']);
        $this->assertSame('Intro', $pages[1]['sections'][0]['name']);
        $this->assertSame('Hero', $pages[1]['sections'][1]['name']);
    }
}
