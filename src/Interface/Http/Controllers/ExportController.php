<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ExportAllDocuments;
use Manage\Application\UseCases\ExportAllPayloads;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use ZipArchive;

final class ExportController
{
    private ExportAllDocuments $exportAll;
    private ExportAllPayloads $exportAllPayloads;

    public function __construct(ExportAllDocuments $exportAll, ExportAllPayloads $exportAllPayloads)
    {
        $this->exportAll = $exportAll;
        $this->exportAllPayloads = $exportAllPayloads;
    }

    public function exportAll(Request $request, array $params): Response
    {
        if (!class_exists(ZipArchive::class)) {
            return Response::json(['error' => 'ZIP extension is not available.'], 500);
        }

        try {
            $entries = $this->exportAll->handle();
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'manage-export-');
        if ($tmpFile === false) {
            return Response::json(['error' => 'Unable to create archive.'], 500);
        }

        $zip = new ZipArchive();
        if ($zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return Response::json(['error' => 'Unable to open archive.'], 500);
        }

        foreach ($entries as $entry) {
            $zip->addFromString($entry['path'], $entry['content']);
        }

        $zip->close();

        $content = file_get_contents($tmpFile);
        @unlink($tmpFile);

        if ($content === false) {
            return Response::json(['error' => 'Unable to read archive.'], 500);
        }

        return new Response(200, [
            'Content-Type' => 'application/zip',
            'Content-Transfer-Encoding' => 'binary',
            'Cache-Control' => 'no-store',
            'Content-Disposition' => 'attachment; filename="manage-export.zip"',
            'Content-Length' => (string) strlen($content),
        ], $content);
    }

    public function exportAllTarGz(Request $request, array $params): Response
    {
        if (!class_exists(\PharData::class)) {
            return Response::json(['error' => 'TAR extension is not available.'], 500);
        }

        try {
            $entries = $this->exportAll->handle('public');
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'manage-export-');
        if ($tmpFile === false) {
            return Response::json(['error' => 'Unable to create archive.'], 500);
        }

        @unlink($tmpFile);
        $tarPath = $tmpFile . '.tar';
        $gzPath = $tarPath . '.gz';

        try {
            $phar = new \PharData($tarPath);
            foreach ($entries as $entry) {
                $phar->addFromString($entry['path'], $entry['content']);
            }
            $phar->compress(\Phar::GZ);
        } catch (\Exception $exception) {
            @unlink($tarPath);
            @unlink($gzPath);
            return Response::json(['error' => 'Unable to build tar.gz archive.'], 500);
        }

        $content = file_get_contents($gzPath);
        @unlink($tarPath);
        @unlink($gzPath);

        if ($content === false) {
            return Response::json(['error' => 'Unable to read archive.'], 500);
        }

        return new Response(200, [
            'Content-Type' => 'application/gzip',
            'Content-Transfer-Encoding' => 'binary',
            'Cache-Control' => 'no-store',
            'Content-Disposition' => 'attachment; filename="manage-export.tar.gz"',
            'Content-Length' => (string) strlen($content),
        ], $content);
    }

    public function exportAllJson(Request $request, array $params): Response
    {
        try {
            $payloads = $this->exportAllPayloads->handle();
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return new Response(200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="manage-export.json"',
        ], [
            'documents' => $payloads,
        ]);
    }
}
