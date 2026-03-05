<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Workers;

final class ReplyWorkerLauncher
{
    private string $projectRoot;
    private string $scriptPath;

    public function __construct(string $projectRoot, string $scriptPath)
    {
        $this->projectRoot = rtrim($projectRoot, '/');
        $this->scriptPath = $scriptPath;
    }

    public function dispatch(string $conversationId): void
    {
        $php = escapeshellarg(PHP_BINARY);
        $script = escapeshellarg($this->scriptPath);
        $id = escapeshellarg($conversationId);
        $command = sprintf('%s %s %s >/dev/null 2>&1 &', $php, $script, $id);

        $process = @proc_open(
            ['/bin/sh', '-lc', $command],
            [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            $this->projectRoot
        );

        if (!is_resource($process)) {
            throw new \RuntimeException('Unable to start reply worker.');
        }

        foreach ($pipes as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }

        proc_close($process);
    }
}
