<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ListLogs;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class LogController
{
    private ListLogs $listLogs;

    public function __construct(ListLogs $listLogs)
    {
        $this->listLogs = $listLogs;
    }

    public function index(Request $request): Response
    {
        try {
            $logs = $this->listLogs->handle();
        } catch (\RuntimeException $exception) {
            return Response::json(['message' => $exception->getMessage()], 500);
        }

        return Response::json(['logs' => $logs]);
    }
}
