<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ManageCreations;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class CreationController
{
    private ManageCreations $creations;

    public function __construct(ManageCreations $creations)
    {
        $this->creations = $creations;
    }

    public function snapshot(Request $request, array $params): Response
    {
        $snapshot = $this->snapshotPayload($request);
        if ($snapshot === null) {
            return Response::json(['error' => 'Snapshot image is required.'], 400);
        }

        try {
            $result = $this->creations->snapshot($snapshot);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result, 201);
    }

    public function clear(Request $request, array $params): Response
    {
        try {
            $result = $this->creations->clearAll($this->snapshotPayload($request));
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
    }

    public function restore(Request $request, array $params): Response
    {
        $id = trim((string) ($params['id'] ?? ''));
        if ($id === '') {
            return Response::json(['error' => 'Creation id is required.'], 400);
        }

        try {
            $result = $this->creations->restore($id);
        } catch (\OutOfBoundsException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
    }

    public function delete(Request $request, array $params): Response
    {
        $id = trim((string) ($params['id'] ?? ''));
        if ($id === '') {
            return Response::json(['error' => 'Creation id is required.'], 400);
        }

        try {
            $result = $this->creations->delete($id);
        } catch (\OutOfBoundsException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
    }

    public function download(Request $request, array $params): Response
    {
        $id = trim((string) ($params['id'] ?? ''));
        if ($id === '') {
            return Response::json(['error' => 'Creation id is required.'], 400);
        }

        try {
            $asset = $this->creations->downloadArchive($id);
        } catch (\OutOfBoundsException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return $this->binaryResponse($asset, true);
    }

    public function image(Request $request, array $params): Response
    {
        $id = trim((string) ($params['id'] ?? ''));
        if ($id === '') {
            return Response::json(['error' => 'Creation id is required.'], 400);
        }

        try {
            $asset = $this->creations->readSnapshotImage($id);
        } catch (\OutOfBoundsException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return $this->binaryResponse($asset, false);
    }

    private function snapshotPayload(Request $request): ?string
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return null;
        }

        $snapshot = $payload['snapshot'] ?? null;

        return is_string($snapshot) ? trim($snapshot) : null;
    }

    /** @param array{path: string, filename: string, mimeType: string} $asset */
    private function binaryResponse(array $asset, bool $download): Response
    {
        $content = file_get_contents($asset['path']);
        if ($content === false) {
            return Response::json(['error' => 'File not found.'], 404);
        }

        $headers = [
            'Content-Type' => $asset['mimeType'],
            'Content-Length' => (string) strlen($content),
        ];
        if ($download) {
            $headers['Content-Disposition'] = 'attachment; filename="' . $asset['filename'] . '"';
        }

        return new Response(200, $headers, $content);
    }
}
