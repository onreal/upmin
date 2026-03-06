<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Routes;

use Manage\Interface\Http\Middleware\PublicAuthMiddleware;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Interface\Http\Router;

final class PublicRoutes
{
    public static function register(Router $router, array $controllers, PublicAuthMiddleware $publicAuth): void
    {
        $router->add('POST', '/api/auth/login', [$controllers['auth'], 'login']);

        $router->add('POST', '/api/public/forms/{formId}/submissions', function (Request $request, array $params) use ($controllers, $publicAuth): Response {
            $actor = $publicAuth->authenticate($request);
            if ($actor === null) {
                return Response::json(['error' => 'Unauthorized'], 401);
            }
            return $controllers['publicForms']->submit($request, $params, $actor);
        });
    }
}
