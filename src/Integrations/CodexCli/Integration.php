<?php

declare(strict_types=1);

namespace Manage\Integrations\CodexCli;

use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\ChatIntegration;
use Manage\Integrations\Contracts\IntegrationHandler;
use Manage\Integrations\IntegrationContext;

final class Integration implements IntegrationHandler, ChatIntegration
{
    private IntegrationDefinition $definition;
    private IntegrationContext $context;

    public function __construct(IntegrationDefinition $definition, IntegrationContext $context)
    {
        $this->definition = $definition;
        $this->context = $context;
    }

    public function definition(): IntegrationDefinition
    {
        return $this->definition;
    }

    public function fetchModels(array $settings): array
    {
        $binary = $settings['binary'] ?? null;
        if (!is_string($binary) || trim($binary) === '') {
            $binary = 'codex';
        }

        $workingDir = $settings['workingDir'] ?? null;
        if (!is_string($workingDir) || trim($workingDir) === '') {
            $workingDir = $this->context->projectRoot();
        } else {
            $workingDir = trim($workingDir);
        }

        $prompt = 'Return a JSON array of model IDs supported by the Codex CLI. '
            . 'Output only JSON (no markdown, no extra text).';

        $tmpFile = tempnam(sys_get_temp_dir(), 'codex-models-');
        if ($tmpFile === false) {
            throw new \RuntimeException('Unable to create temp file for Codex models.');
        }

        $parts = [
            'exec',
            '--json',
            '--output-last-message',
            $tmpFile,
            '--skip-git-repo-check',
            '--cd',
            $workingDir,
            $prompt,
        ];

        $command = $this->buildCommand($binary, $parts);
        [$stdout, $stderr, $exitCode] = $this->runCommand(
            $command,
            $workingDir,
            $this->resolveCommandEnv($settings, $binary, $workingDir),
            60
        );

        $content = file_get_contents($tmpFile);
        @unlink($tmpFile);

        $error = $this->extractErrorFromJsonl($stdout);
        if ($error !== '') {
            throw new \RuntimeException($error);
        }

        $raw = is_string($content) ? trim($content) : '';
        if ($raw === '') {
            $raw = $this->extractMessageFromJsonl($stdout);
        }
        if ($raw === '') {
            if ($exitCode !== 0) {
                $message = trim($stderr) !== '' ? trim($stderr) : 'Codex CLI exited with code ' . $exitCode . '.';
                throw new \RuntimeException($message);
            }
            throw new \RuntimeException('Codex CLI did not return models.');
        }

        $decoded = $this->decodeJsonArray($raw);
        $models = array_values(array_unique(array_filter(array_map(
            static fn($value) => is_string($value) ? trim($value) : '',
            $decoded
        ), static fn($value) => $value !== '')));

        if ($models === []) {
            throw new \RuntimeException('Codex CLI returned an empty model list.');
        }

        return $models;
    }

    public function chat(array $settings, array $payload): string
    {
        $binary = $settings['binary'] ?? null;
        if (!is_string($binary) || trim($binary) === '') {
            $binary = 'codex';
        }

        $model = $payload['model'] ?? null;
        if (!is_string($model) || trim($model) === '') {
            throw new \InvalidArgumentException('Codex CLI model is required.');
        }

        $args = $settings['args'] ?? null;
        $workingDir = $settings['workingDir'] ?? null;
        if (!is_string($workingDir) || trim($workingDir) === '') {
            $workingDir = $this->context->projectRoot();
        } else {
            $workingDir = trim($workingDir);
        }

        if (!is_string($args)) {
            $args = '';
        }
        $args = trim($args);
        if ($args === '') {
            $args = '--dangerously-bypass-approvals-and-sandbox exec --json --output-last-message {outputFile} --skip-git-repo-check --cd {workingDir} --model {model}';
        }
        $args = str_replace(['{model}', '{{model}}'], escapeshellarg(trim($model)), $args);

        $outputFile = null;
        if (str_contains($args, '{outputFile}') || str_contains($args, '{{outputFile}}') || str_contains($args, '{output_file}') || str_contains($args, '{{output_file}}')) {
            $tmpFile = tempnam(sys_get_temp_dir(), 'codex-chat-');
            if ($tmpFile === false) {
                throw new \RuntimeException('Unable to create temp file for Codex output.');
            }
            $outputFile = $tmpFile;
            $args = str_replace(
                ['{outputFile}', '{{outputFile}}', '{output_file}', '{{output_file}}'],
                escapeshellarg($outputFile),
                $args
            );
        } elseif (!str_contains($args, '--output-last-message')) {
            $tmpFile = tempnam(sys_get_temp_dir(), 'codex-chat-');
            if ($tmpFile === false) {
                throw new \RuntimeException('Unable to create temp file for Codex output.');
            }
            $outputFile = $tmpFile;
            $args .= ' --json --output-last-message ' . escapeshellarg($outputFile);
        }

        $args = str_replace(
            ['{workingDir}', '{{workingDir}}', '{working_dir}', '{{working_dir}}'],
            escapeshellarg($workingDir),
            $args
        );

        $prompt = $this->buildPrompt($payload);
        if ($prompt === '') {
            throw new \InvalidArgumentException('Codex CLI prompt is required.');
        }

        $command = escapeshellcmd(trim($binary));
        if ($args !== '') {
            $usesPrompt = str_contains($args, '{prompt}') || str_contains($args, '{{prompt}}');
            if ($usesPrompt) {
                $args = str_replace(['{prompt}', '{{prompt}}'], escapeshellarg($prompt), $args);
                $command .= ' ' . $args;
            } else {
                $command .= ' ' . $args . ' ' . escapeshellarg($prompt);
            }
        } else {
            $command .= ' ' . escapeshellarg($prompt);
        }

        $logPath = $this->openLogFile();
        $descriptor = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $env = $this->resolveCommandEnv($settings, $binary, $workingDir);
        $onProgress = $this->resolveProgressCallback($payload);

        $process = proc_open($command, $descriptor, $pipes, $workingDir, $env);
        if (!is_resource($process)) {
            throw new \RuntimeException('Unable to start Codex CLI.');
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        fclose($pipes[0]);

        $stdout = '';
        $stderr = '';
        $stdoutBuffer = '';

        $this->emitProgress($onProgress, 'Queued reply...');

        while (true) {
            $status = proc_get_status($process);
            $outChunk = stream_get_contents($pipes[1]);
            $errChunk = stream_get_contents($pipes[2]);

            if (is_string($outChunk) && $outChunk !== '') {
                $stdout .= $outChunk;
                $this->writeLog($logPath, 'stdout', $outChunk);
                $this->consumeProgressChunk($stdoutBuffer, $outChunk, $onProgress);
            }
            if (is_string($errChunk) && $errChunk !== '') {
                $stderr .= $errChunk;
                $this->writeLog($logPath, 'stderr', $errChunk);
            }

            if (!$status['running']) {
                break;
            }
            usleep(20000);
        }

        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);
        $this->writeLog($logPath, 'exit', (string) $exitCode, true);
        $this->consumeProgressChunk($stdoutBuffer, '', $onProgress, true);

        $output = '';
        if (is_string($outputFile)) {
            $content = file_get_contents($outputFile);
            @unlink($outputFile);
            if (is_string($content) && trim($content) !== '') {
                $output = trim($content);
            }
        }

        if ($output === '') {
            $output = $this->extractMessageFromJsonl($stdout);
        }

        if ($output === '') {
            $output = $this->cleanCliOutput($stdout);
        }

        if ($output === '') {
            $error = $this->extractErrorFromJsonl($stdout);
            if ($error !== '') {
                throw new \RuntimeException($error);
            }
            if ($exitCode !== 0) {
                $message = trim($stderr) !== '' ? trim($stderr) : 'Codex CLI exited with code ' . $exitCode . '.';
                throw new \RuntimeException($message);
            }
            throw new \RuntimeException('Codex CLI returned an empty response.');
        }

        if ($exitCode !== 0) {
            $error = $this->extractErrorFromJsonl($stdout);
            if ($error !== '') {
                throw new \RuntimeException($error);
            }
        }

        return $output;
    }

    private function buildPrompt(array $payload): string
    {
        $parts = [];

        $systemPrompt = $payload['systemPrompt'] ?? null;
        if (is_string($systemPrompt) && trim($systemPrompt) !== '') {
            $parts[] = 'System: ' . trim($systemPrompt);
        }

        $adminPrompt = $payload['adminPrompt'] ?? null;
        if (is_string($adminPrompt) && trim($adminPrompt) !== '') {
            $parts[] = 'Admin: ' . trim($adminPrompt);
        }

        $messages = $payload['messages'] ?? [];
        if (is_array($messages)) {
            foreach ($messages as $message) {
                if (!is_array($message)) {
                    continue;
                }
                $role = $message['role'] ?? null;
                $content = $message['content'] ?? null;
                if (!is_string($content) || trim($content) === '') {
                    continue;
                }
                $label = 'User';
                if (is_string($role) && strtolower(trim($role)) === 'assistant') {
                    $label = 'Assistant';
                }
                $parts[] = $label . ': ' . trim($content);
            }
        }

        return trim(implode(PHP_EOL . PHP_EOL, $parts));
    }

    private function resolveProgressCallback(array $payload): ?callable
    {
        $callback = $payload['onProgress'] ?? null;
        return is_callable($callback) ? $callback : null;
    }

    /** @return array<string, string> */
    private function buildEnv(?string $apiKey = null): array
    {
        $env = $_ENV;
        $path = getenv('PATH');
        if (is_string($path) && trim($path) !== '') {
            $env['PATH'] = $path;
        }
        $home = getenv('HOME');
        if (is_string($home) && trim($home) !== '') {
            $env['HOME'] = $home;
        }
        if ($apiKey !== null && trim($apiKey) !== '') {
            $env['CODEX_API_KEY'] = $apiKey;
            $env['OPENAI_API_KEY'] = $apiKey;
        }
        return $env;
    }

    /** @return array<string, string> */
    private function resolveCommandEnv(array $settings, string $binary, string $workingDir): array
    {
        $authMode = $this->resolveAuthMode($settings);
        if ($authMode === 'cliAuth') {
            $env = $this->buildEnv();
            $this->assertCliLogin($binary, $workingDir, $env);
            return $env;
        }

        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Codex CLI apiKey is required when authMode is apiKey.');
        }

        return $this->buildEnv(trim($apiKey));
    }

    private function resolveAuthMode(array $settings): string
    {
        $authMode = $settings['authMode'] ?? 'apiKey';
        if (!is_string($authMode) || trim($authMode) === '') {
            return 'apiKey';
        }

        $normalized = strtolower(trim($authMode));
        return match ($normalized) {
            'apikey', 'api-key', 'api_key' => 'apiKey',
            'cliauth', 'cli-auth', 'cli_auth' => 'cliAuth',
            default => throw new \InvalidArgumentException('Codex CLI authMode must be apiKey or cliAuth.'),
        };
    }

    /** @param array<string, string> $env */
    private function assertCliLogin(string $binary, string $workingDir, array $env): void
    {
        $command = $this->buildCommand($binary, ['login', 'status']);
        [$stdout, $stderr, $exitCode] = $this->runCommand($command, $workingDir, $env, 15);
        if ($exitCode === 0 || $this->isSuccessfulLoginStatus($stdout, $stderr)) {
            return;
        }

        $message = trim($stdout) !== '' ? trim($stdout) : trim($stderr);
        if ($message === '') {
            $message = 'Codex CLI is not logged in.';
        }

        throw new \RuntimeException($message . ' Run "docker compose exec manage codex login --device-auth".');
    }

    private function isSuccessfulLoginStatus(string $stdout, string $stderr): bool
    {
        $output = strtolower(trim($stdout . PHP_EOL . $stderr));
        if ($output === '') {
            return false;
        }

        return str_contains($output, 'logged in') && !str_contains($output, 'not logged in');
    }

    private function openLogFile(): string
    {
        $dir = rtrim($this->context->manageRoot(), '/') . '/store/logs';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Unable to create Codex log directory.');
        }

        $name = 'codex-cli-' . (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Ymd-His');
        return $dir . '/' . $name . '.jsonl';
    }

    private function writeLog(string $path, string $stream, string $chunk, bool $isExit = false): void
    {
        $payload = [
            'ts' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM),
        ];
        if ($isExit) {
            $payload['event'] = 'exit';
            $payload['code'] = (int) $chunk;
        } else {
            $payload['stream'] = $stream;
            $payload['chunk'] = $chunk;
        }

        $line = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($line === false) {
            return;
        }

        file_put_contents($path, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    private function consumeProgressChunk(string &$buffer, string $chunk, ?callable $onProgress, bool $flush = false): void
    {
        if ($onProgress === null) {
            return;
        }

        $buffer .= $chunk;
        $remainder = '';
        $lines = preg_split('/\r?\n/', $buffer);
        if ($lines === false || $lines === []) {
            return;
        }

        if ($flush) {
            $buffer = '';
        } else {
            $remainder = array_pop($lines) ?? '';
            $buffer = $remainder;
        }

        foreach ($lines as $line) {
            $this->emitProgressFromLine($line, $onProgress);
        }

        if ($flush && $remainder !== '') {
            $this->emitProgressFromLine($remainder, $onProgress);
        }
    }

    private function emitProgressFromLine(string $line, callable $onProgress): void
    {
        $line = trim($line);
        if ($line === '') {
            return;
        }

        $payload = json_decode($line, true);
        if (!is_array($payload)) {
            return;
        }

        $message = $this->extractProgressMessage($payload);
        if ($message === '') {
            return;
        }

        $this->emitProgress($onProgress, $message);
    }

    private function emitProgress(?callable $onProgress, string $message): void
    {
        if ($onProgress === null) {
            return;
        }

        $normalized = trim($message);
        if ($normalized === '') {
            return;
        }

        try {
            $onProgress($normalized);
        } catch (\Throwable) {
            // Progress reporting is best-effort and must not interrupt Codex execution.
        }
    }

    private function extractProgressMessage(array $payload): string
    {
        $type = isset($payload['type']) && is_string($payload['type']) ? trim($payload['type']) : '';
        if ($type === 'thread.started') {
            return 'Starting Codex CLI...';
        }
        if ($type === 'turn.started') {
            return 'Analyzing request...';
        }

        $item = $payload['item'] ?? null;
        if (!is_array($item)) {
            return '';
        }

        $itemType = isset($item['type']) && is_string($item['type']) ? trim($item['type']) : '';
        return match ($itemType) {
            'reasoning' => $this->sanitizeReasoningText($item['text'] ?? null),
            'todo_list' => $this->describeTodoList($item['items'] ?? null),
            'agent_message' => 'Preparing response...',
            default => '',
        };
    }

    private function sanitizeReasoningText(mixed $value): string
    {
        if (!is_string($value)) {
            return '';
        }

        $lines = preg_split('/\r?\n/', trim($value)) ?: [];
        $line = '';
        foreach ($lines as $candidate) {
            $candidate = trim($candidate);
            if ($candidate !== '') {
                $line = $candidate;
                break;
            }
        }

        if ($line === '') {
            return '';
        }

        $line = preg_replace('/^\*+|\*+$/', '', $line) ?? $line;
        $line = preg_replace('/`+/', '', $line) ?? $line;
        $line = trim(preg_replace('/\s+/', ' ', $line) ?? $line);

        if ($line === '') {
            return '';
        }

        if (function_exists('mb_substr')) {
            return mb_substr($line, 0, 160);
        }

        return substr($line, 0, 160);
    }

    private function describeTodoList(mixed $items): string
    {
        if (!is_array($items)) {
            return 'Updating plan...';
        }

        foreach ($items as $item) {
            if (!is_array($item) || ($item['completed'] ?? false) === true) {
                continue;
            }

            $text = $this->sanitizeReasoningText($item['text'] ?? null);
            if ($text !== '') {
                return $text;
            }
        }

        return 'Updating plan...';
    }

    private function buildCommand(string $binary, array $parts): string
    {
        $command = escapeshellcmd(trim($binary));
        foreach ($parts as $part) {
            $command .= ' ' . escapeshellarg((string) $part);
        }

        return $command;
    }

    /** @param array<string, string> $env
     *  @return array{0:string,1:string,2:int}
     */
    private function runCommand(string $command, string $workingDir, array $env, int $timeoutSeconds = 30): array
    {
        $descriptor = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptor, $pipes, $workingDir, $env);
        if (!is_resource($process)) {
            throw new \RuntimeException('Unable to start Codex CLI.');
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $startedAt = microtime(true);

        while (true) {
            $status = proc_get_status($process);
            $outChunk = stream_get_contents($pipes[1]);
            $errChunk = stream_get_contents($pipes[2]);

            if (is_string($outChunk) && $outChunk !== '') {
                $stdout .= $outChunk;
            }
            if (is_string($errChunk) && $errChunk !== '') {
                $stderr .= $errChunk;
            }

            if (!$status['running']) {
                break;
            }
            if ($timeoutSeconds > 0 && (microtime(true) - $startedAt) >= $timeoutSeconds) {
                proc_terminate($process);
                usleep(100000);
                $status = proc_get_status($process);
                if ($status['running']) {
                    proc_terminate($process, 9);
                }
                fclose($pipes[1]);
                fclose($pipes[2]);
                throw new \RuntimeException('Codex CLI timed out.');
            }
            usleep(20000);
        }

        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        return [$stdout, $stderr, $exitCode];
    }

    private function extractMessageFromJsonl(string $stdout): string
    {
        $lines = preg_split('/\r?\n/', trim($stdout)) ?: [];
        $buffer = '';
        $lastMessage = '';

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $payload = json_decode($line, true);
            if (!is_array($payload)) {
                continue;
            }

            $text = $this->extractTextFromEvent($payload);
            if ($text !== '') {
                $buffer .= $text;
                $lastMessage = $buffer;
            }
        }

        return trim($lastMessage);
    }

    private function extractErrorFromJsonl(string $stdout): string
    {
        $lines = preg_split('/\r?\n/', trim($stdout)) ?: [];
        $lastError = '';

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $payload = json_decode($line, true);
            if (!is_array($payload)) {
                continue;
            }

            if (($payload['type'] ?? null) === 'error' && isset($payload['message']) && is_string($payload['message'])) {
                $lastError = trim($payload['message']);
                continue;
            }

            if (isset($payload['error']) && is_array($payload['error']) && isset($payload['error']['message'])) {
                $message = $payload['error']['message'];
                if (is_string($message) && trim($message) !== '') {
                    $lastError = trim($message);
                }
            }
        }

        return $lastError;
    }

    private function extractTextFromEvent(array $payload): string
    {
        if (isset($payload['message']) && is_array($payload['message'])) {
            return $this->extractTextFromMessage($payload['message']);
        }
        if (isset($payload['data']) && is_array($payload['data'])) {
            $text = $this->extractTextFromEvent($payload['data']);
            if ($text !== '') {
                return $text;
            }
        }
        if (isset($payload['response']) && is_array($payload['response'])) {
            $text = $this->extractTextFromResponse($payload['response']);
            if ($text !== '') {
                return $text;
            }
        }
        if (isset($payload['content'])) {
            $text = $this->extractTextFromContent($payload['content']);
            if ($text !== '') {
                return $text;
            }
        }
        if (isset($payload['delta']) && is_string($payload['delta'])) {
            return $payload['delta'];
        }
        if (isset($payload['text']) && is_string($payload['text'])) {
            return $payload['text'];
        }
        if (isset($payload['output_text']) && is_string($payload['output_text'])) {
            return $payload['output_text'];
        }

        return '';
    }

    private function extractTextFromMessage(array $message): string
    {
        if (isset($message['content'])) {
            return $this->extractTextFromContent($message['content']);
        }
        if (isset($message['text']) && is_string($message['text'])) {
            return $message['text'];
        }

        return '';
    }

    private function extractTextFromResponse(array $response): string
    {
        if (isset($response['output']) && is_array($response['output'])) {
            $text = '';
            foreach ($response['output'] as $item) {
                if (is_array($item) && isset($item['content'])) {
                    $text .= $this->extractTextFromContent($item['content']);
                }
            }
            return $text;
        }

        return '';
    }

    private function extractTextFromContent(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }
        if (!is_array($content)) {
            return '';
        }

        $text = '';
        foreach ($content as $item) {
            if (is_string($item)) {
                $text .= $item;
                continue;
            }
            if (!is_array($item)) {
                continue;
            }
            if (isset($item['text']) && is_string($item['text'])) {
                $text .= $item['text'];
                continue;
            }
            if (isset($item['output_text']) && is_string($item['output_text'])) {
                $text .= $item['output_text'];
                continue;
            }
            if (isset($item['content'])) {
                $text .= $this->extractTextFromContent($item['content']);
            }
        }

        return $text;
    }

    /** @return array<int, mixed> */
    private function decodeJsonArray(string $raw): array
    {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        $trimmed = trim($raw);
        $start = strpos($trimmed, '[');
        $end = strrpos($trimmed, ']');
        if ($start !== false && $end !== false && $end > $start) {
            $slice = substr($trimmed, $start, $end - $start + 1);
            $decoded = json_decode($slice, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function cleanCliOutput(string $stdout): string
    {
        $stdout = $this->stripAnsi($stdout);
        $lines = preg_split('/\r?\n/', $stdout) ?: [];
        $clean = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (str_contains($line, 'OpenAI Codex') || str_contains($line, 'workdir:') || str_contains($line, 'session id:')) {
                continue;
            }
            if (str_starts_with($line, 'tokens used')) {
                continue;
            }
            if (str_starts_with($line, 'codex ')) {
                $line = trim(substr($line, 6));
            }
            $clean[] = $line;
        }

        return trim(implode("\n", $clean));
    }

    private function stripAnsi(string $value): string
    {
        return preg_replace('/\x1B\[[0-9;]*[A-Za-z]/', '', $value) ?? $value;
    }
}
