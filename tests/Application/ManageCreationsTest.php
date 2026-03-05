<?php

declare(strict_types=1);

use Manage\Infrastructure\Creations\CreationStore;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use PHPUnit\Framework\TestCase;

final class ManageCreationsTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = rtrim(sys_get_temp_dir(), '/') . '/manage-creations-test-' . bin2hex(random_bytes(6));
        mkdir($this->root . '/manage/store', 0755, true);
        mkdir($this->root . '/media', 0755, true);
        mkdir($this->root . '/store', 0755, true);
        mkdir($this->root . '/.git', 0755, true);

        file_put_contents($this->root . '/index.html', '<!doctype html><html><body>Hello</body></html>');
        file_put_contents($this->root . '/app.js', 'console.log("hello");');
        file_put_contents($this->root . '/store/home.json', '{"ok":true}');
        file_put_contents($this->root . '/router.php', '<?php echo "router";');
        file_put_contents($this->root . '/docker-compose.yml', 'services: {}');
        file_put_contents($this->root . '/AGENTS.md', '# agents');
        file_put_contents($this->root . '/.git/config', '[core]');
        file_put_contents($this->root . '/media/keep.txt', 'keep');
    }

    protected function tearDown(): void
    {
        $this->deletePath($this->root);
        parent::tearDown();
    }

    public function testSnapshotCreatesArchiveAndUpdatesPage(): void
    {
        $store = $this->creationStore();

        $result = $store->snapshot($this->snapshotDataUrl(), 'manual');

        $creation = $result['creation'];
        $document = $result['document'];

        $this->assertSame('private', $document['store']);
        $this->assertCount(1, $document['payload']['data']['creations']);
        $this->assertSame('manual', $creation['reason']);
        $this->assertFileExists($this->root . '/manage/store/' . $creation['snapshotPath']);
        $this->assertFileExists($this->root . '/manage/store/' . $creation['backupPath']);
    }

    public function testClearAllKeepsExcludedItemsAndStoresPreClearCreation(): void
    {
        $store = $this->creationStore();

        $result = $store->clearAll($this->snapshotDataUrl());

        $creation = $result['creation'];

        $this->assertSame('before-clear', $creation['reason']);
        $this->assertFileDoesNotExist($this->root . '/index.html');
        $this->assertFileDoesNotExist($this->root . '/app.js');
        $this->assertDirectoryDoesNotExist($this->root . '/store');
        $this->assertDirectoryExists($this->root . '/manage');
        $this->assertDirectoryExists($this->root . '/media');
        $this->assertFileExists($this->root . '/router.php');
        $this->assertFileExists($this->root . '/docker-compose.yml');
        $this->assertFileExists($this->root . '/AGENTS.md');
        $this->assertDirectoryExists($this->root . '/.git');
    }

    public function testRestoreRecreatesManagedFiles(): void
    {
        $store = $this->creationStore();
        $snapshot = $store->snapshot($this->snapshotDataUrl(), 'manual');
        $id = $snapshot['creation']['id'];

        unlink($this->root . '/index.html');
        $this->deletePath($this->root . '/store');
        file_put_contents($this->root . '/new-file.txt', 'temporary');

        $store->restore($id);

        $this->assertFileExists($this->root . '/index.html');
        $this->assertDirectoryExists($this->root . '/store');
        $this->assertFileDoesNotExist($this->root . '/new-file.txt');
    }

    public function testSnapshotAcceptsSvgImages(): void
    {
        $store = $this->creationStore();

        $result = $store->snapshot($this->svgSnapshotDataUrl(), 'manual');

        $this->assertSame('image/svg+xml', $result['creation']['snapshotMimeType']);
        $this->assertFileExists($this->root . '/manage/store/' . $result['creation']['snapshotPath']);
        $this->assertStringEndsWith('.svg', $result['creation']['snapshotPath']);
    }

    private function creationStore(): CreationStore
    {
        $repository = new JsonDocumentRepository([
            'private' => $this->root . '/manage/store',
            'public' => $this->root . '/store',
        ]);

        return new CreationStore($repository, $this->root, $this->root . '/manage');
    }

    private function snapshotDataUrl(): string
    {
        return 'data:image/png;base64,' . base64_encode('fake-image-content');
    }

    private function svgSnapshotDataUrl(): string
    {
        return 'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
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
