<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\Contracts\ModuleRoute;

final class ModuleRequestController
{
    private ModuleRegistry $modules;

    public function __construct(ModuleRegistry $modules)
    {
        $this->modules = $modules;
    }

    public function __invoke(Request $request, array $params): Response
    {
        $name = $params['name'] ?? '';
        if (!is_string($name) || trim($name) === '') {
            return Response::json(['error' => 'Module name is required.'], 400);
        }

        $handler = $this->modules->handler($name);
        if ($handler === null) {
            return Response::json(['error' => 'Not Found'], 404);
        }

        $controller = $handler->controller();
        $action = $params['action'] ?? null;
        $pathKey = $action ? strtolower((string) $action) : 'self';

        $routes = $this->buildRouteMap($controller);
        $method = strtoupper($request->method());
        $key = $method . ':' . $pathKey;

        if (!isset($routes[$key])) {
            return Response::json(['error' => 'Not Found'], 404);
        }

        $handlerMethod = $routes[$key];
        return $controller->{$handlerMethod}($request);
    }

    /** @return array<string, string> */
    private function buildRouteMap(object $controller): array
    {
        $routes = [];
        $reflection = new \ReflectionObject($controller);
        foreach ($reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
            $attributes = $method->getAttributes(ModuleRoute::class);
            if (!$attributes) {
                continue;
            }

            foreach ($attributes as $attribute) {
                /** @var ModuleRoute $route */
                $route = $attribute->newInstance();
                $pathKey = $route->path;
                if ($pathKey === null || $pathKey === '') {
                    $pathKey = $this->defaultPathForMethod($method->getName());
                }
                if ($pathKey === null) {
                    continue;
                }
                $key = $route->method . ':' . $pathKey;
                $routes[$key] = $method->getName();
            }
        }
        return $routes;
    }

    private function defaultPathForMethod(string $method): ?string
    {
        $normalized = strtolower($method);
        if ($normalized === 'get' || $normalized === 'post') {
            return 'self';
        }
        return $normalized;
    }
}
