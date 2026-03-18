<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\GetSystemUpdateStatus;
use Manage\Application\UseCases\RunSystemUpdate;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class SystemUpdateController
{
    private GetSystemUpdateStatus $getStatus;
    private RunSystemUpdate $runUpdate;

    public function __construct(GetSystemUpdateStatus $getStatus, RunSystemUpdate $runUpdate)
    {
        $this->getStatus = $getStatus;
        $this->runUpdate = $runUpdate;
    }

    public function status(Request $request, array $params): Response
    {
        return Response::json([
            'update' => $this->getStatus->handle(),
        ]);
    }

    public function run(Request $request, array $params): Response
    {
        try {
            $result = $this->runUpdate->handle();
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        } catch (\RuntimeException $exception) {
            $status = $exception->getMessage() === 'An update is already running.' ? 423 : 500;
            return Response::json(['error' => $exception->getMessage()], $status);
        }

        return Response::json([
            'update' => $result,
        ]);
    }
}
