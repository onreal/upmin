<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ListNavigation;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class NavigationController
{
    private ListNavigation $listNavigation;

    public function __construct(ListNavigation $listNavigation)
    {
        $this->listNavigation = $listNavigation;
    }

    public function __invoke(Request $request): Response
    {
        return Response::json($this->listNavigation->handle());
    }
}
