<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\CreateAgent;
use Manage\Application\UseCases\GetAgent;
use Manage\Application\UseCases\ListAgents;
use Manage\Application\UseCases\UpdateAgent;
use Manage\Domain\Document\DocumentId;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class AgentController
{
    private ListAgents $listAgents;
    private GetAgent $getAgent;
    private CreateAgent $createAgent;
    private UpdateAgent $updateAgent;

    public function __construct(
        ListAgents $listAgents,
        GetAgent $getAgent,
        CreateAgent $createAgent,
        UpdateAgent $updateAgent
    )
    {
        $this->listAgents = $listAgents;
        $this->getAgent = $getAgent;
        $this->createAgent = $createAgent;
        $this->updateAgent = $updateAgent;
    }

    public function index(Request $request): Response
    {
        $agents = $this->listAgents->handle();
        return Response::json(['agents' => $agents]);
    }

    public function show(Request $request, array $params): Response
    {
        try {
            $id = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid agent id.'], 400);
        }

        $agent = $this->getAgent->handle($id);
        if ($agent === null) {
            return Response::json(['error' => 'Agent not found.'], 404);
        }

        return Response::json($agent);
    }

    public function create(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $agent = $this->createAgent->handle($payload);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        return Response::json($agent, 201);
    }

    public function update(Request $request, array $params): Response
    {
        try {
            $id = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid agent id.'], 400);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $agent = $this->updateAgent->handle($id, $payload);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        if ($agent === null) {
            return Response::json(['error' => 'Agent not found.'], 404);
        }

        return Response::json($agent);
    }
}
