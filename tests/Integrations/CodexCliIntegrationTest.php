<?php

declare(strict_types=1);

use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\CodexCli\Integration;
use Manage\Integrations\IntegrationContext;
use PHPUnit\Framework\TestCase;

final class CodexCliIntegrationTest extends TestCase
{
    public function testAssertCliLoginAcceptsLoggedInStatusOutputEvenWhenExitCodeIsNonZero(): void
    {
        $binary = $this->createCliStub(<<<'SH'
#!/bin/sh
echo "Logged in using ChatGPT"
exit 1
SH
        );

        $integration = $this->integration();
        $method = new ReflectionMethod($integration, 'assertCliLogin');
        $method->setAccessible(true);

        $method->invoke(
            $integration,
            $binary,
            sys_get_temp_dir(),
            [
                'PATH' => (string) getenv('PATH'),
                'HOME' => sys_get_temp_dir(),
            ]
        );

        $this->addToAssertionCount(1);
    }

    public function testChatStreamsSanitizedProgressUpdates(): void
    {
        $binary = $this->createCliStub(<<<'SH'
#!/bin/sh
echo '{"type":"thread.started"}'
echo '{"type":"turn.started"}'
echo '{"type":"item.completed","item":{"id":"item_1","type":"reasoning","text":"**Inspecting project files**"}}'
echo '{"type":"item.started","item":{"id":"item_2","type":"todo_list","items":[{"text":"Run validation for the updated files.","completed":false}]}}'
        echo '{"text":"Done."}'
        exit 0
SH
        );

        $progress = [];
        $reply = $this->integration()->chat(
            [
                'authMode' => 'apiKey',
                'apiKey' => 'test-key',
                'binary' => $binary,
                'args' => 'exec --json --skip-git-repo-check --cd {workingDir} --model {model}',
                'workingDir' => sys_get_temp_dir(),
            ],
            [
                'model' => 'gpt-5-codex',
                'systemPrompt' => 'You are helpful.',
                'adminPrompt' => 'Be concise.',
                'messages' => [
                    ['role' => 'user', 'content' => 'Hi'],
                ],
                'onProgress' => static function (string $message) use (&$progress): void {
                    $progress[] = $message;
                },
            ]
        );

        $this->assertSame('Done.', $reply);
        $this->assertContains('Queued reply...', $progress);
        $this->assertContains('Starting Codex CLI...', $progress);
        $this->assertContains('Analyzing request...', $progress);
        $this->assertContains('Inspecting project files', $progress);
        $this->assertContains('Run validation for the updated files.', $progress);
    }

    private function integration(): Integration
    {
        $root = sys_get_temp_dir() . '/upmin-codex-cli-' . uniqid('', true);
        $manageRoot = $root . '/manage';
        if (!is_dir($manageRoot) && !mkdir($manageRoot, 0755, true) && !is_dir($manageRoot)) {
            throw new RuntimeException('Failed to create temp manage root.');
        }

        return new Integration(
            IntegrationDefinition::fromArray(
                [
                    'name' => 'codex-cli',
                    'description' => 'Codex CLI',
                    'supportsModels' => true,
                    'fields' => [
                        ['key' => 'authMode', 'label' => 'Authentication mode', 'type' => 'select', 'required' => true, 'options' => [
                            ['value' => 'cliAuth', 'label' => 'CLI authentication'],
                            ['value' => 'apiKey', 'label' => 'API key'],
                        ]],
                    ],
                ],
                __FILE__
            ),
            new IntegrationContext($root, $manageRoot)
        );
    }

    private function createCliStub(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'codex-cli-stub-');
        if ($path === false) {
            throw new RuntimeException('Failed to create temp Codex CLI stub.');
        }

        file_put_contents($path, $contents);
        chmod($path, 0755);

        $this->registerShutdownCleanup($path);

        return $path;
    }

    private function registerShutdownCleanup(string $path): void
    {
        register_shutdown_function(static function () use ($path): void {
            if (is_file($path)) {
                @unlink($path);
            }
        });
    }
}
