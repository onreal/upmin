<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\GetLayoutConfig;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class LayoutConfigController
{
    private GetLayoutConfig $getLayoutConfig;

    public function __construct(GetLayoutConfig $getLayoutConfig)
    {
        $this->getLayoutConfig = $getLayoutConfig;
    }

    public function __invoke(Request $request): Response
    {
        $config = $this->getLayoutConfig->handle();

        return Response::json([
            'config' => $config ?? new \stdClass(),
        ]);
    }
}
