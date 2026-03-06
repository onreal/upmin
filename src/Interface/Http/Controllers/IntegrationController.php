<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\Ports\TokenService;
use Manage\Application\UseCases\GetIntegrationSettings;
use Manage\Application\UseCases\ListIntegrations;
use Manage\Application\UseCases\QueueIntegrationModelSync;
use Manage\Application\UseCases\UpsertIntegrationSettings;
use Manage\Infrastructure\Realtime\RealtimeIdentity;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class IntegrationController
{
    private ListIntegrations $listIntegrations;
    private GetIntegrationSettings $getSettings;
    private UpsertIntegrationSettings $upsertSettings;
    private QueueIntegrationModelSync $queueSync;
    private TokenService $tokens;

    public function __construct(
        ListIntegrations $listIntegrations,
        GetIntegrationSettings $getSettings,
        UpsertIntegrationSettings $upsertSettings,
        QueueIntegrationModelSync $queueSync,
        TokenService $tokens
    )
    {
        $this->listIntegrations = $listIntegrations;
        $this->getSettings = $getSettings;
        $this->upsertSettings = $upsertSettings;
        $this->queueSync = $queueSync;
        $this->tokens = $tokens;
    }

    public function index(Request $request): Response
    {
        try {
            $integrations = $this->listIntegrations->handle();
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json(['integrations' => $integrations]);
    }

    public function show(Request $request, array $params): Response
    {
        $name = $params['name'] ?? '';
        if (!is_string($name) || trim($name) === '') {
            return Response::json(['error' => 'Integration name is required.'], 400);
        }

        try {
            $settings = $this->getSettings->handle($name);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        }

        if ($settings === null) {
            return Response::json(['error' => 'Integration settings not found.'], 404);
        }

        return Response::json(['settings' => $settings]);
    }

    public function upsert(Request $request, array $params): Response
    {
        $name = $params['name'] ?? '';
        if (!is_string($name) || trim($name) === '') {
            return Response::json(['error' => 'Integration name is required.'], 400);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $settings = $this->upsertSettings->handle($name, $payload);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        return Response::json(['settings' => $settings]);
    }

    public function sync(Request $request, array $params): Response
    {
        $name = $params['name'] ?? '';
        if (!is_string($name) || trim($name) === '') {
            return Response::json(['error' => 'Integration name is required.'], 400);
        }

        try {
            $result = $this->queueSync->handle($name, $this->resolveIdentity($request));
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 502);
        }

        return Response::json($result, 202);
    }

    private function resolveIdentity(Request $request): string
    {
        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            $payload = $this->tokens->verify($token);
            if (is_array($payload) && isset($payload['userId'])) {
                return RealtimeIdentity::fromUserId((string) $payload['userId']);
            }
        }

        return RealtimeIdentity::fromUserId('api-key');
    }
}
