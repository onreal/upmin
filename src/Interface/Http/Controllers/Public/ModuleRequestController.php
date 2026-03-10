<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers\Public;

use Manage\Application\PublicArea\SubmitFormEntry;
use Manage\Domain\Exceptions\NotFoundException;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class ModuleRequestController
{
    private SubmitFormEntry $submitForm;

    public function __construct(SubmitFormEntry $submitForm)
    {
        $this->submitForm = $submitForm;
    }

    public function __invoke(Request $request, array $params, array $actor): Response
    {
        $module = $params['module'] ?? '';
        $pageId = $params['pageId'] ?? '';
        $action = $params['action'] ?? '';

        if (!is_string($module) || trim($module) === '') {
            return Response::json(['error' => 'Module name is required.'], 400);
        }
        if (!is_string($pageId) || trim($pageId) === '') {
            return Response::json(['error' => 'Page id is required.'], 400);
        }
        if (!is_string($action) || trim($action) === '') {
            return Response::json(['error' => 'Action is required.'], 400);
        }

        $module = strtolower(trim($module));
        $action = strtolower(trim($action));

        if ($module !== 'form' || $action !== 'submissions') {
            return Response::json(['error' => 'Not Found'], 404);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $result = $this->submitForm->handle($pageId, $payload, $actor);
        } catch (NotFoundException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        $document = $result['document'];

        return Response::json([
            'pageId' => $pageId,
            'entry' => $result['entry'],
            'document' => [
                'id' => $document['id'],
                'store' => $document['store'],
                'path' => $document['path'],
            ],
        ], 201);
    }
}
