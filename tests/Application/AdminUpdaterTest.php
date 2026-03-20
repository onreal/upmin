<?php

declare(strict_types=1);

use Manage\Infrastructure\Update\AdminUpdater;
use Manage\Infrastructure\Update\RepositorySource;
use Manage\Infrastructure\Update\UpdaterStateStore;
use PHPUnit\Framework\TestCase;

final class AdminUpdaterTest extends TestCase
{
    private string $workspace;
    private string $projectRoot;
    private string $adminRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = rtrim(sys_get_temp_dir(), '/') . '/admin-updater-test-' . bin2hex(random_bytes(6));
        $this->projectRoot = $this->workspace . '/upmin';
        $this->adminRoot = $this->projectRoot . '/control-panel';

        mkdir($this->projectRoot . '/store/system', 0755, true);
        mkdir($this->projectRoot . '/control-panel/.git', 0755, true);
        mkdir($this->projectRoot . '/control-panel/src', 0755, true);
        mkdir($this->projectRoot . '/control-panel/bin', 0755, true);
        mkdir($this->projectRoot . '/control-panel/docker', 0755, true);
        mkdir($this->projectRoot . '/control-panel/public/assets', 0755, true);
        mkdir($this->projectRoot . '/control-panel/tests', 0755, true);
        mkdir($this->projectRoot . '/control-panel/web', 0755, true);
        mkdir($this->projectRoot . '/control-panel/store', 0755, true);

        file_put_contents($this->projectRoot . '/control-panel/store/version.json', json_encode(['version' => '1.0.0'], JSON_PRETTY_PRINT));
        file_put_contents(
            $this->projectRoot . '/store/system/local-system.json',
            json_encode(['position' => 'system', 'update_deploy' => true, 'title' => 'old'], JSON_PRETTY_PRINT)
        );
        file_put_contents(
            $this->projectRoot . '/store/system/local-user.json',
            json_encode(['position' => 'system', 'update_deploy' => false, 'title' => 'keep'], JSON_PRETTY_PRINT)
        );
        file_put_contents($this->projectRoot . '/control-panel/src/OldOnly.php', '<?php echo "old";');
        file_put_contents($this->projectRoot . '/control-panel/bin/old-script', 'old-script');
        file_put_contents($this->projectRoot . '/control-panel/docker/old.conf', 'old-docker');
        file_put_contents($this->projectRoot . '/control-panel/public/assets/app.js', 'old-build');
        file_put_contents($this->projectRoot . '/control-panel/tests/OldTest.php', '<?php');
        file_put_contents($this->projectRoot . '/control-panel/web/old.ts', 'old-web');
        file_put_contents($this->projectRoot . '/control-panel/bootstrap.php', 'old-bootstrap');
        file_put_contents($this->projectRoot . '/control-panel/store/auth.json', '{"users":[]}');
        file_put_contents($this->projectRoot . '/control-panel/.git/config', '[core]');
        file_put_contents($this->projectRoot . '/control-panel/local-only.keep', 'keep-me');
    }

    protected function tearDown(): void
    {
        $this->deletePath($this->workspace);
        parent::tearDown();
    }

    public function testStatusReportsAvailableUpdate(): void
    {
        $updater = $this->buildUpdater($this->buildRemoteArchive('1.1.0'), '1.1.0');

        $status = $updater->status();

        $this->assertSame('ready', $status['status']);
        $this->assertSame('1.0.0', $status['currentVersion']);
        $this->assertSame('1.1.0', $status['latestVersion']);
        $this->assertTrue($status['updateAvailable']);
    }

    public function testRunUpdatesManageAndDeployableSystemPagesOnly(): void
    {
        $updater = $this->buildUpdater($this->buildRemoteArchive('1.2.0'), '1.2.0');

        $result = $updater->run();

        $this->assertSame('completed', $result['status']);
        $this->assertSame('1.2.0', $result['currentVersion']);
        $this->assertFileDoesNotExist($this->projectRoot . '/control-panel/src/OldOnly.php');
        $this->assertFileDoesNotExist($this->projectRoot . '/control-panel/bin/old-script');
        $this->assertFileDoesNotExist($this->projectRoot . '/control-panel/docker/old.conf');
        $this->assertFileDoesNotExist($this->projectRoot . '/control-panel/tests/OldTest.php');
        $this->assertFileDoesNotExist($this->projectRoot . '/control-panel/web/old.ts');
        $this->assertSame('<?php echo "new";', file_get_contents($this->projectRoot . '/control-panel/src/NewFile.php'));
        $this->assertSame('new-bin', file_get_contents($this->projectRoot . '/control-panel/bin/runner'));
        $this->assertSame('new-docker', file_get_contents($this->projectRoot . '/control-panel/docker/site.conf'));
        $this->assertSame('new-build', file_get_contents($this->projectRoot . '/control-panel/public/assets/app.js'));
        $this->assertSame('new-root-bootstrap', file_get_contents($this->projectRoot . '/control-panel/bootstrap.php'));
        $this->assertSame('{"users":[]}', file_get_contents($this->projectRoot . '/control-panel/store/auth.json'));
        $this->assertFileExists($this->projectRoot . '/control-panel/.git/config');
        $this->assertSame('keep-me', file_get_contents($this->projectRoot . '/control-panel/local-only.keep'));
        $this->assertStringContainsString('"title": "remote"', (string) file_get_contents($this->projectRoot . '/store/system/local-system.json'));
        $this->assertStringContainsString('"title": "keep"', (string) file_get_contents($this->projectRoot . '/store/system/local-user.json'));
        $this->assertFileDoesNotExist($this->projectRoot . '/store/system/orphan.json');
        $this->assertSame('1.2.0', $this->readVersion());
    }

    public function testRunMergesDeployableSystemPagesWhenMergeStrategyIsConfigured(): void
    {
        file_put_contents(
            $this->projectRoot . '/store/system/local-system.json',
            json_encode([
                'position' => 'system',
                'update_deploy' => true,
                'strategy_deploy' => 'merge',
                'items' => ['1', '2', '3', '4'],
                'person' => [
                    'name' => 'nikos',
                    'surname' => 'mixos',
                ],
            ], JSON_PRETTY_PRINT)
        );

        $updater = $this->buildUpdater($this->buildRemoteArchive('1.3.0', [
            'local-system' => [
                'position' => 'system',
                'update_deploy' => true,
                'strategy_deploy' => 'merge',
                'items' => ['5'],
                'person' => [
                    'name' => 'antreas',
                    'surname' => 'midres',
                    'age' => null,
                ],
                'parents' => [],
            ],
        ]), '1.3.0');

        $updater->run();

        $decoded = json_decode((string) file_get_contents($this->projectRoot . '/store/system/local-system.json'), true);

        $this->assertSame(['1', '2', '3', '4', '5'], $decoded['items']);
        $this->assertSame([
            'name' => 'nikos',
            'surname' => 'mixos',
            'age' => null,
        ], $decoded['person']);
        $this->assertSame([], $decoded['parents']);
    }

    private function buildUpdater(string $archivePath, string $remoteVersion): AdminUpdater
    {
        $source = new class($archivePath, $remoteVersion) implements RepositorySource {
            private string $archivePath;
            private string $remoteVersion;

            public function __construct(string $archivePath, string $remoteVersion)
            {
                $this->archivePath = $archivePath;
                $this->remoteVersion = $remoteVersion;
            }

            public function fetchVersion(): array
            {
                return ['version' => $this->remoteVersion];
            }

            public function downloadArchive(string $destination): void
            {
                copy($this->archivePath, $destination);
            }
        };

        return new AdminUpdater(
            $this->projectRoot,
            $this->adminRoot,
            $source,
            new UpdaterStateStore($this->adminRoot)
        );
    }

    /** @param array<string, array<string, mixed>> $systemPages */
    private function buildRemoteArchive(string $version, array $systemPages = []): string
    {
        $remoteRoot = $this->workspace . '/remote/upmin-main';
        mkdir($remoteRoot . '/control-panel/bin', 0755, true);
        mkdir($remoteRoot . '/control-panel/docker', 0755, true);
        mkdir($remoteRoot . '/control-panel/src', 0755, true);
        mkdir($remoteRoot . '/control-panel/public/assets', 0755, true);
        mkdir($remoteRoot . '/control-panel/store', 0755, true);
        mkdir($remoteRoot . '/control-panel/tests', 0755, true);
        mkdir($remoteRoot . '/control-panel/web', 0755, true);
        mkdir($remoteRoot . '/store/system', 0755, true);

        file_put_contents($remoteRoot . '/control-panel/bin/runner', 'new-bin');
        file_put_contents($remoteRoot . '/control-panel/docker/site.conf', 'new-docker');
        file_put_contents($remoteRoot . '/control-panel/src/NewFile.php', '<?php echo "new";');
        file_put_contents($remoteRoot . '/control-panel/public/assets/app.js', 'new-build');
        file_put_contents($remoteRoot . '/control-panel/tests/NewTest.php', '<?php');
        file_put_contents($remoteRoot . '/control-panel/web/index.ts', 'new-web');
        file_put_contents($remoteRoot . '/control-panel/store/ignored.json', '{"ignored":true}');
        file_put_contents($remoteRoot . '/control-panel/store/version.json', json_encode(['version' => $version], JSON_PRETTY_PRINT));
        file_put_contents($remoteRoot . '/control-panel/bootstrap.php', 'new-root-bootstrap');
        $deployablePages = $systemPages !== [] ? $systemPages : [
            'local-system' => ['position' => 'system', 'update_deploy' => true, 'title' => 'remote'],
        ];

        foreach ($deployablePages as $name => $payload) {
            file_put_contents(
                $remoteRoot . '/store/system/' . $name . '.json',
                json_encode($payload, JSON_PRETTY_PRINT)
            );
        }
        file_put_contents(
            $remoteRoot . '/store/system/remote-private.json',
            json_encode(['position' => 'system', 'update_deploy' => false, 'title' => 'ignore'], JSON_PRETTY_PRINT)
        );
        file_put_contents(
            $this->projectRoot . '/store/system/orphan.json',
            json_encode(['position' => 'system', 'update_deploy' => true, 'title' => 'remove'], JSON_PRETTY_PRINT)
        );

        $archivePath = $this->workspace . '/remote.tar.gz';
        $tarPath = $this->workspace . '/remote.tar';
        $phar = new PharData($tarPath);

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(dirname($remoteRoot), FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (!$file instanceof SplFileInfo || $file->isDir()) {
                continue;
            }
            $fullPath = $file->getPathname();
            $relativePath = ltrim(str_replace(dirname($remoteRoot) . '/', '', $fullPath), '/');
            $phar->addFile($fullPath, $relativePath);
        }

        $phar->compress(Phar::GZ);
        unset($phar);
        @unlink($tarPath);

        return $archivePath;
    }

    private function readVersion(): string
    {
        $decoded = json_decode((string) file_get_contents($this->projectRoot . '/control-panel/store/version.json'), true);
        return (string) ($decoded['version'] ?? '');
    }

    private function deletePath(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);
            return;
        }
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        if (is_array($items)) {
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') {
                    continue;
                }
                $this->deletePath($path . '/' . $item);
            }
        }

        @rmdir($path);
    }
}
