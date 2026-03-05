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

        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Codex CLI apiKey is required.');
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
        [$stdout, $stderr, $exitCode] = $this->runCommand($command, $workingDir, trim($apiKey), 60);

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

        $apiKey = $settings['apiKey'] ?? null;
        if (!is_string($apiKey) || trim($apiKey) === '') {
            throw new \InvalidArgumentException('Codex CLI apiKey is required.');
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
        $env = $this->buildEnv(trim($apiKey));

        $process = proc_open($command, $descriptor, $pipes, $workingDir, $env);
        if (!is_resource($process)) {
            throw new \RuntimeException('Unable to start Codex CLI.');
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        fclose($pipes[0]);

        $stdout = '';
        $stderr = '';

        while (true) {
            $status = proc_get_status($process);
            $outChunk = stream_get_contents($pipes[1]);
            $errChunk = stream_get_contents($pipes[2]);

            if (is_string($outChunk) && $outChunk !== '') {
                $stdout .= $outChunk;
                $this->writeLog($logPath, 'stdout', $outChunk);
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

    private function buildEnv(string $apiKey): array
    {
        $env = $_ENV;
        $env['CODEX_API_KEY'] = $apiKey;
        $env['OPENAI_API_KEY'] = $apiKey;
        return $env;
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

    private function buildCommand(string $binary, array $parts): string
    {
        $command = escapeshellcmd(trim($binary));
        foreach ($parts as $part) {
            $command .= ' ' . escapeshellarg((string) $part);
        }

        return $command;
    }

    /** @return array{0:string,1:string,2:int} */
    private function runCommand(string $command, string $workingDir, string $apiKey, int $timeoutSeconds = 30): array
    {
        $descriptor = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $env = $this->buildEnv($apiKey);
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
