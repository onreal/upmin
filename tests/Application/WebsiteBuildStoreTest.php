<?php

declare(strict_types=1);

use Manage\Infrastructure\WebsiteBuild\WebsiteBuildStore;
use PHPUnit\Framework\TestCase;

final class WebsiteBuildStoreTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();

        $this->root = rtrim(sys_get_temp_dir(), '/') . '/website-build-test-' . bin2hex(random_bytes(6));
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
        file_put_contents($this->root . '/AGENTS.md', '# keep');
        file_put_contents($this->root . '/manage/store/auth.json', '{}');
        file_put_contents($this->root . '/upmin/keep.txt', 'keep');
        file_put_contents($this->root . '/.git/config', '[core]');
    }

    protected function tearDown(): void
    {
        $this->deletePath($this->root);
        parent::tearDown();
    }

    public function testCleanRemovesWebsiteFilesAndKeepsProtectedEntries(): void
    {
        $store = new WebsiteBuildStore($this->root);

        $result = $store->clean();

        $this->assertSame('cleaned', $result['status']);
        $this->assertSame(6, $result['entries']);
        $this->assertDirectoryExists($this->root . '/build');
        $this->assertDirectoryDoesNotExist($this->root . '/build/assets');
        $this->assertFileDoesNotExist($this->root . '/index.php');
        $this->assertFileDoesNotExist($this->root . '/styles.css');
        $this->assertDirectoryDoesNotExist($this->root . '/store');
        $this->assertDirectoryDoesNotExist($this->root . '/media');
        $this->assertDirectoryDoesNotExist($this->root . '/vendor');
        $this->assertFileExists($this->root . '/AGENTS.md');
        $this->assertDirectoryExists($this->root . '/manage');
        $this->assertDirectoryExists($this->root . '/upmin');
        $this->assertFileExists($this->root . '/upmin/keep.txt');
        $this->assertDirectoryExists($this->root . '/.git');
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
