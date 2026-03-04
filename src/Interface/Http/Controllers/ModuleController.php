<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ListModules;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class ModuleController
{
    private ListModules $listModules;

    public function __construct(ListModules $listModules)
    {
        $this->listModules = $listModules;
    }

    public function __invoke(Request $request, array $params): Response
    {
        try {
            $modules = $this->listModules->handle();
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 500);
        }

        return Response::json(['modules' => $modules]);
    }
}
