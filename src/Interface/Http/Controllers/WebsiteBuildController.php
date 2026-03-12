<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ManageWebsiteBuild;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class WebsiteBuildController
{
    private ManageWebsiteBuild $build;

    public function __construct(ManageWebsiteBuild $build)
    {
        $this->build = $build;
    }

    public function publish(Request $request, array $params): Response
    {
        try {
            $result = $this->build->publish();
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
    }

    public function clean(Request $request, array $params): Response
    {
        try {
            $result = $this->build->clean($this->snapshotPayload($request));
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
    }

    public function copyFromPublic(Request $request, array $params): Response
    {
        try {
            $result = $this->build->copyFromPublic($this->snapshotPayload($request));
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json($result);
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
}
