<?php

declare(strict_types=1);

use Manage\Infrastructure\Creations\CreationStore;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\WebsiteBuild\WebsiteBuildStore;
use PHPUnit\Framework\TestCase;

final class WebsiteBuildStoreTest extends TestCase
{
    private string $workspace;
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = rtrim(sys_get_temp_dir(), '/') . '/website-build-test-' . bin2hex(random_bytes(6));
        $this->root = $this->workspace . '/upmin';
        mkdir($this->workspace . '/build/assets', 0755, true);
        mkdir($this->root . '/build/assets', 0755, true);
        mkdir($this->root . '/manage/store', 0755, true);
        mkdir($this->root . '/upmin', 0755, true);
        mkdir($this->root . '/store', 0755, true);
        mkdir($this->root . '/media', 0755, true);
        mkdir($this->root . '/vendor', 0755, true);
        mkdir($this->root . '/.git', 0755, true);

        file_put_contents($this->root . '/index.php', '<?php echo "site";');
        file_put_contents($this->root . '/styles.css', 'body{}');
        file_put_contents($this->root . '/store/home.json', '{"ok":true}');
        file_put_contents($this->root . '/media/image.txt', 'image');
        file_put_contents($this->root . '/vendor/app.js', 'console.log("vendor");');
        file_put_contents($this->root . '/build/assets/app.js', 'console.log("build");');
        file_put_contents($this->root . '/build/AGENTS.md', '# build-agents');
        file_put_contents($this->root . '/manage/store/auth.json', '{}');
        file_put_contents($this->root . '/upmin/keep.txt', 'keep');
        file_put_contents($this->root . '/.git/config', '[core]');

        file_put_contents($this->workspace . '/build/index.html', '<html><body>Public build</body></html>');
        file_put_contents($this->workspace . '/build/assets/public.js', 'console.log("public");');
        file_put_contents($this->workspace . '/build/AGENTS.md', '# public-agents');
    }

    protected function tearDown(): void
    {
        $this->deletePath($this->workspace);
        parent::tearDown();
    }

    public function testCleanOnlyRemovesBuildEntriesAndKeepsEverythingOutsideBuild(): void
    {
        $store = $this->websiteBuildStore();

        $result = $store->clean($this->snapshotDataUrl());

        $this->assertSame('cleaned', $result['status']);
        $this->assertSame(1, $result['entries']);
        $this->assertDirectoryExists($this->root . '/build');
        $this->assertDirectoryDoesNotExist($this->root . '/build/assets');
        $this->assertFileExists($this->root . '/build/AGENTS.md');
        $this->assertFileExists($this->root . '/index.php');
        $this->assertFileExists($this->root . '/styles.css');
        $this->assertDirectoryExists($this->root . '/store');
        $this->assertDirectoryExists($this->root . '/media');
        $this->assertDirectoryExists($this->root . '/vendor');
        $this->assertDirectoryExists($this->root . '/manage');
        $this->assertDirectoryExists($this->root . '/upmin');
        $this->assertFileExists($this->root . '/upmin/keep.txt');
        $this->assertDirectoryExists($this->root . '/.git');
        $this->assertSame('build', $result['creation']['target'] ?? null);
    }

    public function testCopyFromPublicCleansBuildOnlyAndCopiesSiblingPublicBuild(): void
    {
        $store = $this->websiteBuildStore();

        $result = $store->copyFromPublic($this->snapshotDataUrl());

        $this->assertSame('copied', $result['status']);
        $this->assertSame(2, $result['entries']);
        $this->assertFileExists($this->root . '/build/AGENTS.md');
        $this->assertStringContainsString('Public build', (string) file_get_contents($this->root . '/build/index.html'));
        $this->assertSame('console.log("public");', file_get_contents($this->root . '/build/assets/public.js'));
        $this->assertFileDoesNotExist($this->root . '/build/assets/app.js');
        $this->assertFileExists($this->root . '/index.php');
        $this->assertSame('build', $result['creation']['target'] ?? null);
    }

    private function websiteBuildStore(): WebsiteBuildStore
    {
        $repository = new JsonDocumentRepository([
            'private' => $this->root . '/manage/store',
            'public' => $this->root . '/store',
        ]);
        $creations = new CreationStore($repository, $this->root, $this->root . '/manage');

        return new WebsiteBuildStore($this->root, $creations);
    }

    private function snapshotDataUrl(): string
    {
        return 'data:image/png;base64,' . base64_encode('fake-image-content');
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
