<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\GetUiConfig;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class UiConfigController
{
    private GetUiConfig $getUiConfig;

    public function __construct(GetUiConfig $getUiConfig)
    {
        $this->getUiConfig = $getUiConfig;
    }

    public function __invoke(Request $request): Response
    {
        $config = $this->getUiConfig->handle();

        return Response::json([
            'config' => $config ?? new \stdClass(),
        ]);
    }
}
