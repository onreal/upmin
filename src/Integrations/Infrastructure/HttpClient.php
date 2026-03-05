<?php

declare(strict_types=1);

namespace Manage\Integrations\Infrastructure;

final class HttpClient
{
    /** @return array<string, mixed> */
    public function getJson(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to initialize HTTP request.');
        }

        $headerLines = [];
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => $headerLines,
        ]);

        $response = curl_exec($ch);
        if (!is_string($response)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('HTTP request failed: ' . $error);
        }

        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status < 200 || $status >= 300) {
            $snippet = trim($response);
            $detail = $snippet !== '' ? (' ' . $snippet) : '';
            throw new \RuntimeException('HTTP request failed with status ' . $status . '.' . $detail);
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON response.');
        }

        return $decoded;
    }

    /** @return array<string, mixed> */
    public function postJson(string $url, array $headers = [], array $body = []): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to initialize HTTP request.');
        }

        $payload = json_encode($body);
        if ($payload === false) {
            throw new \RuntimeException('Failed to encode request body.');
        }

        $headerLines = [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
        ];
        foreach ($headers as $key => $value) {
            $headerLines[] = $key . ': ' . $value;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $headerLines,
        ]);

        $response = curl_exec($ch);
        if (!is_string($response)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('HTTP request failed: ' . $error);
        }

        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status < 200 || $status >= 300) {
            $snippet = trim($response);
            $detail = $snippet !== '' ? (' ' . $snippet) : '';
            throw new \RuntimeException('HTTP request failed with status ' . $status . '.' . $detail);
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON response.');
        }

        return $decoded;
    }
}
