<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Routes;

use Manage\Interface\Http\Router;

final class AdminRoutes
{
    public static function register(Router $router, array $controllers): void
    {
        $router->add('GET', '/api/navigation', $controllers['navigation']);
        $router->add('GET', '/api/modules', $controllers['modules']);
        $router->add('GET', '/api/modules/{name}', $controllers['moduleRequest']);
        $router->add('POST', '/api/modules/{name}', $controllers['moduleRequest']);
        $router->add('GET', '/api/modules/{name}/{action}', $controllers['moduleRequest']);
        $router->add('POST', '/api/modules/{name}/{action}', $controllers['moduleRequest']);
        $router->add('GET', '/api/integrations', [$controllers['integrations'], 'index']);
        $router->add('GET', '/api/integrations/{name}', [$controllers['integrations'], 'show']);
        $router->add('PUT', '/api/integrations/{name}', [$controllers['integrations'], 'upsert']);
        $router->add('POST', '/api/integrations/{name}/sync', [$controllers['integrations'], 'sync']);
        $router->add('GET', '/api/logs', [$controllers['logs'], 'index']);
        $router->add('GET', '/api/forms', [$controllers['forms'], 'index']);
        $router->add('GET', '/api/agents', [$controllers['agents'], 'index']);
        $router->add('POST', '/api/agents', [$controllers['agents'], 'create']);
        $router->add('POST', '/api/creations/snapshot', [$controllers['creations'], 'snapshot']);
        $router->add('POST', '/api/creations/clear', [$controllers['creations'], 'clear']);
        $router->add('POST', '/api/creations/{id}/restore', [$controllers['creations'], 'restore']);
        $router->add('DELETE', '/api/creations/{id}', [$controllers['creations'], 'delete']);
        $router->add('GET', '/api/creations/{id}/download', [$controllers['creations'], 'download']);
        $router->add('GET', '/api/creations/{id}/image', [$controllers['creations'], 'image']);
        $router->add('POST', '/api/website-build/publish', [$controllers['websiteBuild'], 'publish']);
        $router->add('POST', '/api/website-build/clean', [$controllers['websiteBuild'], 'clean']);
        $router->add('POST', '/api/website-build/copy-public', [$controllers['websiteBuild'], 'copyFromPublic']);
        $router->add('GET', '/api/agents/{id}/conversations', [$controllers['agentConversations'], 'index']);
        $router->add('POST', '/api/agents/{id}/conversations', [$controllers['agentConversations'], 'create']);
        $router->add('GET', '/api/agents/conversations/{id}', [$controllers['agentConversations'], 'show']);
        $router->add('POST', '/api/agents/conversations/{id}/messages', [$controllers['agentConversations'], 'append']);
        $router->add('GET', '/api/agents/{id}', [$controllers['agents'], 'show']);
        $router->add('PUT', '/api/agents/{id}', [$controllers['agents'], 'update']);
        $router->add('GET', '/api/layout-config', $controllers['layout']);
        $router->add('GET', '/api/realtime/ticket', [$controllers['realtime'], 'ticket']);
        $router->add('GET', '/api/ui-config', $controllers['ui']);
        $router->add('GET', '/api/documents/{id}', [$controllers['documents'], 'show']);
        $router->add('PUT', '/api/documents/{id}', [$controllers['documents'], 'update']);
        $router->add('POST', '/api/documents', [$controllers['documents'], 'create']);
        $router->add('GET', '/api/documents/{id}/export', [$controllers['documents'], 'export']);
        $router->add('GET', '/api/export', [$controllers['export'], 'exportAll']);
        $router->add('GET', '/api/export.zip', [$controllers['export'], 'exportAll']);
        $router->add('GET', '/api/export.tar.gz', [$controllers['export'], 'exportAllTarGz']);
        $router->add('GET', '/api/export.json', [$controllers['export'], 'exportAllJson']);
    }
}
