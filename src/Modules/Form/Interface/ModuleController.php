<?php

declare(strict_types=1);

namespace Manage\Modules\Form\Interface;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Modules\Contracts\ModuleRoute;

final class ModuleController
{
    private ModuleDefinition $definition;

    public function __construct(ModuleDefinition $definition)
    {
        $this->definition = $definition;
    }

    #[ModuleRoute('GET')]
    public function Get(Request $request): Response
    {
        return Response::json(['module' => $this->definition->toArray()]);
    }
}
