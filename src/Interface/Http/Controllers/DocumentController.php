<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\GetDocument;
use Manage\Application\UseCases\ExportDocument;
use Manage\Application\UseCases\CreateDocument;
use Manage\Application\UseCases\UpdateDocument;
use Manage\Domain\Document\DocumentId;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class DocumentController
{
    private GetDocument $getDocument;
    private UpdateDocument $updateDocument;
    private CreateDocument $createDocument;
    private ExportDocument $exportDocument;

    public function __construct(
        GetDocument $getDocument,
        UpdateDocument $updateDocument,
        CreateDocument $createDocument,
        ExportDocument $exportDocument
    )
    {
        $this->getDocument = $getDocument;
        $this->updateDocument = $updateDocument;
        $this->createDocument = $createDocument;
        $this->exportDocument = $exportDocument;
    }

    public function show(Request $request, array $params): Response
    {
        try {
            $id = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid document id.'], 400);
        }

        $document = $this->getDocument->handle($id);
        if ($document === null) {
            return Response::json(['error' => 'Document not found.'], 404);
        }

        return Response::json($document);
    }

    public function update(Request $request, array $params): Response
    {
        try {
            $id = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid document id.'], 400);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $document = $this->updateDocument->handle($id, $payload);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        if ($document === null) {
            return Response::json(['error' => 'Document not found.'], 404);
        }

        return Response::json($document);
    }

    public function create(Request $request, array $params): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $store = $payload['store'] ?? null;
        $path = $payload['path'] ?? null;
        $documentPayload = $payload['payload'] ?? null;

        if (!is_string($store) || !is_string($path) || !is_array($documentPayload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $document = $this->createDocument->handle($store, $path, $documentPayload);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        if ($document === null) {
            return Response::json(['error' => 'Document already exists.'], 409);
        }

        return Response::json($document, 201);
    }

    public function export(Request $request, array $params): Response
    {
        try {
            $id = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid document id.'], 400);
        }

        try {
            $export = $this->exportDocument->handle($id);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        if ($export === null) {
            return Response::json(['error' => 'Document not found.'], 404);
        }

        return new Response(200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $export['filename'] . '"',
            'Content-Length' => (string) strlen($export['content']),
        ], $export['content']);
    }
}
