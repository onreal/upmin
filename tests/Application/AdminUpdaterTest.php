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
        mkdir($this->projectRoot . '/control-panel/src', 0755, true);
        mkdir($this->projectRoot . '/control-panel/public/assets', 0755, true);
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
        file_put_contents($this->projectRoot . '/control-panel/public/assets/app.js', 'old-build');
        file_put_contents($this->projectRoot . '/control-panel/store/auth.json', '{"users":[]}');
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
        $this->assertSame('<?php echo "new";', file_get_contents($this->projectRoot . '/control-panel/src/NewFile.php'));
        $this->assertSame('new-build', file_get_contents($this->projectRoot . '/control-panel/public/assets/app.js'));
        $this->assertSame('{"users":[]}', file_get_contents($this->projectRoot . '/control-panel/store/auth.json'));
        $this->assertStringContainsString('"title": "remote"', (string) file_get_contents($this->projectRoot . '/store/system/local-system.json'));
        $this->assertStringContainsString('"title": "keep"', (string) file_get_contents($this->projectRoot . '/store/system/local-user.json'));
        $this->assertFileDoesNotExist($this->projectRoot . '/store/system/orphan.json');
        $this->assertSame('1.2.0', $this->readVersion());
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

    private function buildRemoteArchive(string $version): string
    {
        $remoteRoot = $this->workspace . '/remote/upmin-main';
        mkdir($remoteRoot . '/control-panel/src', 0755, true);
        mkdir($remoteRoot . '/control-panel/public/assets', 0755, true);
        mkdir($remoteRoot . '/control-panel/store', 0755, true);
        mkdir($remoteRoot . '/store/system', 0755, true);

        file_put_contents($remoteRoot . '/control-panel/src/NewFile.php', '<?php echo "new";');
        file_put_contents($remoteRoot . '/control-panel/public/assets/app.js', 'new-build');
        file_put_contents($remoteRoot . '/control-panel/store/ignored.json', '{"ignored":true}');
        file_put_contents($remoteRoot . '/control-panel/store/version.json', json_encode(['version' => $version], JSON_PRETTY_PRINT));
        file_put_contents(
            $remoteRoot . '/store/system/local-system.json',
            json_encode(['position' => 'system', 'update_deploy' => true, 'title' => 'remote'], JSON_PRETTY_PRINT)
        );
        file_put_contents(
            $remoteRoot . '/store/system/remote-private.json',
            json_encode(['position' => 'system', 'update_deploy' => false, 'title' => 'ignore'], JSON_PRETTY_PRINT)
        );
        file_put_contents(
            $this->projectRoot . '/store/system/orphan.json',
            json_encode(['position' => 'system', 'update_deploy' => true, 'title' => 'remove'], JSON_PRETTY_PRINT)
        );

        $archivePath = $this->workspace . '/remote.zip';
        $zip = new ZipArchive();
        $zip->open($archivePath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(dirname($remoteRoot), FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (!$file instanceof SplFileInfo || $file->isDir()) {
                continue;
            }
            $fullPath = $file->getPathname();
            $relativePath = ltrim(str_replace(dirname($remoteRoot) . '/', '', $fullPath), '/');
            $zip->addFile($fullPath, $relativePath);
        }

        $zip->close();

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
