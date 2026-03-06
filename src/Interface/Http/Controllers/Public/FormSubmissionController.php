<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers\Public;

use Manage\Application\PublicArea\SubmitFormEntry;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class FormSubmissionController
{
    private SubmitFormEntry $submitForm;

    public function __construct(SubmitFormEntry $submitForm)
    {
        $this->submitForm = $submitForm;
    }

    public function submit(Request $request, array $params, array $actor): Response
    {
        $formId = $params['formId'] ?? '';
        if (!is_string($formId) || trim($formId) === '') {
            return Response::json(['error' => 'Form id is required.'], 400);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $result = $this->submitForm->handle($formId, $payload, $actor);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        $document = $result['document'];

        return Response::json([
            'formId' => $formId,
            'entry' => $result['entry'],
            'document' => [
                'id' => $document['id'],
                'store' => $document['store'],
                'path' => $document['path'],
            ],
        ], 201);
    }
}
