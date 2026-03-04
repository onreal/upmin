<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\GetIntegrationSettings;
use Manage\Application\UseCases\ListIntegrations;
use Manage\Application\UseCases\SyncIntegrationModels;
use Manage\Application\UseCases\UpsertIntegrationSettings;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class IntegrationController
{
    private ListIntegrations $listIntegrations;
    private GetIntegrationSettings $getSettings;
    private UpsertIntegrationSettings $upsertSettings;
    private SyncIntegrationModels $syncModels;

    public function __construct(
        ListIntegrations $listIntegrations,
        GetIntegrationSettings $getSettings,
        UpsertIntegrationSettings $upsertSettings,
        SyncIntegrationModels $syncModels
    )
    {
        $this->listIntegrations = $listIntegrations;
        $this->getSettings = $getSettings;
        $this->upsertSettings = $upsertSettings;
        $this->syncModels = $syncModels;
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
            $settings = $this->syncModels->handle($name);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 502);
        }

        return Response::json(['settings' => $settings]);
    }
}
