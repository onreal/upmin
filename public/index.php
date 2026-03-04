<?php

declare(strict_types=1);

use Manage\Application\UseCases\AuthenticateApiKey;
use Manage\Application\UseCases\AuthenticateUser;
use Manage\Application\UseCases\CreateDocument;
use Manage\Application\UseCases\ExportAllDocuments;
use Manage\Application\UseCases\ExportAllPayloads;
use Manage\Application\UseCases\ExportDocument;
use Manage\Application\UseCases\GetDocument;
use Manage\Application\UseCases\GetLayoutConfig;
use Manage\Application\UseCases\GetUiConfig;
use Manage\Application\UseCases\EnsureModuleSettings;
use Manage\Application\UseCases\ListModules;
use Manage\Application\UseCases\ListNavigation;
use Manage\Application\UseCases\ReorderDocuments;
use Manage\Application\UseCases\UpdateDocument;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\FileSystem\JsonUserRepository;
use Manage\Infrastructure\Security\BcryptPasswordHasher;
use Manage\Infrastructure\Security\EnvApiKeyProvider;
use Manage\Infrastructure\Security\HmacTokenService;
use Manage\Interface\Http\Controllers\AuthController;
use Manage\Interface\Http\Controllers\DocumentController;
use Manage\Interface\Http\Controllers\ExportController;
use Manage\Interface\Http\Controllers\LayoutConfigController;
use Manage\Interface\Http\Controllers\ModuleController;
use Manage\Interface\Http\Controllers\ModuleRequestController;
use Manage\Interface\Http\Controllers\NavigationController;
use Manage\Interface\Http\Controllers\UiConfigController;
use Manage\Interface\Http\Middleware\AuthMiddleware;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Interface\Http\Router;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsStore;

require dirname(__DIR__) . '/bootstrap.php';

$env = Env::load(dirname(__DIR__) . '/.env');

$manageRoot = dirname(__DIR__);
$projectRoot = dirname(__DIR__, 2);
$privateStore = $manageRoot . '/store';
$publicStore = $projectRoot . '/store';
$modulesPath = $manageRoot . '/src/Modules';

$documentRepository = new JsonDocumentRepository([
    'private' => $privateStore,
    'public' => $publicStore,
]);

$userRepository = new JsonUserRepository($privateStore . '/auth.json');
$moduleContext = new ModuleContext($projectRoot, $manageRoot);
$moduleRegistry = new ModuleRegistry($modulesPath, $moduleContext);
$moduleSettingsStore = new ModuleSettingsStore($moduleContext);
$apiKeyProvider = new EnvApiKeyProvider($env);
$tokenService = new HmacTokenService($env);
$hasher = new BcryptPasswordHasher();

$ensureModuleSettings = new EnsureModuleSettings($moduleRegistry, $moduleSettingsStore);
$listNavigation = new ListNavigation($documentRepository, $ensureModuleSettings);
$listModules = new ListModules($moduleRegistry);
$getDocument = new GetDocument($documentRepository);
$reorderDocuments = new ReorderDocuments($documentRepository);
$updateDocument = new UpdateDocument($documentRepository, $reorderDocuments, $ensureModuleSettings);
$createDocument = new CreateDocument($documentRepository, $reorderDocuments, $ensureModuleSettings);
$exportDocument = new ExportDocument($documentRepository);
$exportAllDocuments = new ExportAllDocuments($documentRepository);
$exportAllPayloads = new ExportAllPayloads($documentRepository);
$getLayoutConfig = new GetLayoutConfig($documentRepository);
$getUiConfig = new GetUiConfig($documentRepository);
$authenticateApiKey = new AuthenticateApiKey($apiKeyProvider);
$authenticateUser = new AuthenticateUser($userRepository, $hasher, $tokenService);

$navigationController = new NavigationController($listNavigation);
$moduleController = new ModuleController($listModules);
$moduleRequestController = new ModuleRequestController($moduleRegistry);
$documentController = new DocumentController($getDocument, $updateDocument, $createDocument, $exportDocument);
$exportController = new ExportController($exportAllDocuments, $exportAllPayloads);
$authController = new AuthController($authenticateUser, $authenticateApiKey);
$layoutConfigController = new LayoutConfigController($getLayoutConfig);
$uiConfigController = new UiConfigController($getUiConfig);
$authMiddleware = new AuthMiddleware($authenticateApiKey, $tokenService);

$request = Request::fromGlobals();

if (str_starts_with($request->path(), '/api/')) {
    $router = new Router();
    $router->add('GET', '/api/navigation', $navigationController);
    $router->add('GET', '/api/modules', $moduleController);
    $router->add('GET', '/api/modules/{name}', $moduleRequestController);
    $router->add('POST', '/api/modules/{name}', $moduleRequestController);
    $router->add('GET', '/api/modules/{name}/{action}', $moduleRequestController);
    $router->add('POST', '/api/modules/{name}/{action}', $moduleRequestController);
    $router->add('GET', '/api/layout-config', $layoutConfigController);
    $router->add('GET', '/api/ui-config', $uiConfigController);
    $router->add('GET', '/api/documents/{id}', [$documentController, 'show']);
    $router->add('PUT', '/api/documents/{id}', [$documentController, 'update']);
    $router->add('POST', '/api/documents', [$documentController, 'create']);
    $router->add('GET', '/api/documents/{id}/export', [$documentController, 'export']);
    $router->add('GET', '/api/export', [$exportController, 'exportAll']);
    $router->add('GET', '/api/export.zip', [$exportController, 'exportAll']);
    $router->add('GET', '/api/export.tar.gz', [$exportController, 'exportAllTarGz']);
    $router->add('GET', '/api/export.json', [$exportController, 'exportAllJson']);
    $router->add('POST', '/api/auth/login', [$authController, 'login']);

    if ($request->path() !== '/api/auth/login' && !$authMiddleware->authorize($request)) {
        Response::json(['error' => 'Unauthorized'], 401)->send();
        exit;
    }

    $router->dispatch($request)->send();
    exit;
}

$allowedPublicRoots = ['media' => true];
$allowedPrivateRoots = ['media' => true];

try {
    foreach ($moduleRegistry->list() as $module) {
        $storage = $module->parameters()['storage'] ?? null;
        if (!is_array($storage)) {
            continue;
        }
        $visibility = $storage['visibility'] ?? 'public';
        $root = $storage['root'] ?? null;
        if (!is_string($root) || trim($root) === '') {
            continue;
        }
        $root = trim(str_replace('\\', '/', $root), '/');
        if ($root === '' || str_contains($root, '..')) {
            continue;
        }
        if ($visibility === 'private') {
            $allowedPrivateRoots[$root] = true;
        } else {
            $allowedPublicRoots[$root] = true;
        }
    }
} catch (\RuntimeException $exception) {
    $allowedPublicRoots = ['media' => true];
    $allowedPrivateRoots = ['media' => true];
}

$path = $request->path();
$serveMedia = function (string $candidate): void {
    if (!is_file($candidate)) {
        Response::text('Not Found', 404)->send();
        exit;
    }
    $ext = pathinfo($candidate, PATHINFO_EXTENSION);
    $mime = match ($ext) {
        'js' => 'application/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        default => 'application/octet-stream',
    };
    header('Content-Type: ' . $mime);
    readfile($candidate);
    exit;
};

foreach (array_keys($allowedPublicRoots) as $root) {
    $prefix = '/' . $root . '/';
    if (str_starts_with($path, $prefix)) {
        $relative = ltrim(substr($path, strlen($prefix)), '/');
        $candidate = $projectRoot . '/' . $root . '/' . $relative;
        $serveMedia($candidate);
    }
}

foreach (array_keys($allowedPrivateRoots) as $root) {
    $prefix = '/manage-media/' . $root . '/';
    if (str_starts_with($path, $prefix)) {
        $relative = ltrim(substr($path, strlen($prefix)), '/');
        $candidate = $manageRoot . '/' . $root . '/' . $relative;
        $serveMedia($candidate);
    }
}

$publicPath = __DIR__ . $request->path();
if ($request->path() !== '/' && is_file($publicPath)) {
    $ext = pathinfo($publicPath, PATHINFO_EXTENSION);
    $mime = match ($ext) {
        'js' => 'application/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        default => 'application/octet-stream',
    };
    header('Content-Type: ' . $mime);
    readfile($publicPath);
    exit;
}

$index = __DIR__ . '/index.html';
if (is_file($index)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index);
    exit;
}

Response::text('Not Found', 404)->send();
