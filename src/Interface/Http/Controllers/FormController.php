<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ListForms;
use Manage\Interface\Http\Response;

final class FormController
{
    private ListForms $listForms;

    public function __construct(ListForms $listForms)
    {
        $this->listForms = $listForms;
    }

    public function index(): Response
    {
        $forms = $this->listForms->handle();
        return Response::json(['forms' => $forms]);
    }
}
