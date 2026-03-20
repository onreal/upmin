<?php

declare(strict_types=1);

namespace Manage\Interface\Http;

use Manage\Application\UseCases\AuthenticateApiKey;
use Manage\Application\UseCases\AuthenticateUser;
use Manage\Application\UseCases\AppendAgentMessage;
use Manage\Application\UseCases\CreateDocument;
use Manage\Application\UseCases\CreateAgent;
use Manage\Application\UseCases\CreateAgentConversation;
use Manage\Application\UseCases\CreateUserApiKey;
use Manage\Application\UseCases\DeleteUserApiKey;
use Manage\Application\UseCases\EnsureApiKeysPage;
use Manage\Application\UseCases\ExportAllDocuments;
use Manage\Application\UseCases\ExportAllPayloads;
use Manage\Application\UseCases\ExportDocument;
use Manage\Application\UseCases\ExchangeDelegatedLoginGrant;
use Manage\Application\UseCases\GetAgent;
use Manage\Application\UseCases\GetAgentConversation;
use Manage\Application\UseCases\GetDocument;
use Manage\Application\UseCases\GetLayoutConfig;
use Manage\Application\UseCases\GetSystemUpdateStatus;
use Manage\Application\UseCases\ManageCreations;
use Manage\Application\UseCases\ManageWebsiteBuild;
use Manage\Application\UseCases\GetUiConfig;
use Manage\Application\UseCases\EnsureModuleSettings;
use Manage\Application\UseCases\EnsureFormPages;
use Manage\Application\UseCases\EnsureDocumentId;
use Manage\Application\UseCases\FindDocumentByWrapperId;
use Manage\Application\UseCases\GetIntegrationSettings;
use Manage\Application\UseCases\ListAgents;
use Manage\Application\UseCases\ListUserApiKeys;
use Manage\Application\UseCases\ListIntegrations;
use Manage\Application\UseCases\ListAgentConversations;
use Manage\Application\UseCases\ListModules;
use Manage\Application\UseCases\ListNavigation;
use Manage\Application\UseCases\ListLogs;
use Manage\Application\UseCases\ListForms;
use Manage\Application\UseCases\QueueIntegrationModelSync;
use Manage\Application\UseCases\ReorderDocuments;
use Manage\Application\UseCases\RequestDelegatedLoginGrant;
use Manage\Application\UseCases\SendAgentMessage;
use Manage\Application\UseCases\RunSystemUpdate;
use Manage\Application\UseCases\UpdateAgent;
use Manage\Application\UseCases\UpdateDocument;
use Manage\Application\UseCases\UpsertIntegrationSettings;
use Manage\Application\PublicArea\SubmitFormEntry;
use Manage\Infrastructure\Config\Env;
use Manage\Infrastructure\Auth\AuthUserStore;
use Manage\Infrastructure\Auth\DelegatedLoginGrantStore;
use Manage\Infrastructure\Auth\UserApiKeyHasher;
use Manage\Infrastructure\FileSystem\JsonDocumentRepository;
use Manage\Infrastructure\FileSystem\JsonUserRepository;
use Manage\Infrastructure\Security\BcryptPasswordHasher;
use Manage\Infrastructure\Security\EnvApiKeyProvider;
use Manage\Infrastructure\Security\HmacTokenService;
use Manage\Infrastructure\Security\PublicTokenService;
use Manage\Infrastructure\Realtime\RealtimeConfig;
use Manage\Infrastructure\Realtime\RealtimeTicketService;
use Manage\Infrastructure\Realtime\SocketRealtimePublisher;
use Manage\Infrastructure\Creations\CreationStore;
use Manage\Infrastructure\WebsiteBuild\WebsiteBuildStore;
use Manage\Infrastructure\Logging\ErrorLogger;
use Manage\Infrastructure\Logging\LogStore;
use Manage\Infrastructure\Update\AdminUpdater;
use Manage\Infrastructure\Update\GitHubRepositorySource;
use Manage\Infrastructure\Update\UpdaterStateStore;
use Manage\Infrastructure\Workers\ReplyWorkerLauncher;
use Manage\Interface\Http\Controllers\AuthController;
use Manage\Interface\Http\Controllers\AgentController;
use Manage\Interface\Http\Controllers\AgentConversationController;
use Manage\Interface\Http\Controllers\CreationController;
use Manage\Interface\Http\Controllers\DelegatedLoginController;
use Manage\Interface\Http\Controllers\DocumentController;
use Manage\Interface\Http\Controllers\ExportController;
use Manage\Interface\Http\Controllers\UserApiKeyController;
use Manage\Interface\Http\Controllers\WebsiteBuildController;
use Manage\Interface\Http\Controllers\LogController;
use Manage\Interface\Http\Controllers\FormController;
use Manage\Interface\Http\Controllers\IntegrationController;
use Manage\Interface\Http\Controllers\LayoutConfigController;
use Manage\Interface\Http\Controllers\ModuleController;
use Manage\Interface\Http\Controllers\ModuleRequestController;
use Manage\Interface\Http\Controllers\NavigationController;
use Manage\Interface\Http\Controllers\RealtimeController;
use Manage\Interface\Http\Controllers\SystemUpdateController;
use Manage\Interface\Http\Controllers\UiConfigController;
use Manage\Interface\Http\Controllers\Public\ModuleRequestController as PublicModuleRequestController;
use Manage\Interface\Http\Middleware\AuthMiddleware;
use Manage\Interface\Http\Middleware\PublicAuthMiddleware;
use Manage\Interface\Http\Routes\AdminRoutes;
use Manage\Interface\Http\Routes\PublicRoutes;
use Manage\Integrations\IntegrationContext;
use Manage\Integrations\IntegrationRegistry;
use Manage\Integrations\IntegrationSettingsStore;
use Manage\Integrations\IntegrationSyncStatusStore;
use Manage\Modules\ModuleContext;
use Manage\Modules\ModuleRegistry;
use Manage\Modules\ModuleSettingsStore;

final class App
{
    private Env $env;
    private string $manageRoot;
    private string $projectRoot;
    private string $privateStore;
    private string $publicStore;
    private ModuleRegistry $moduleRegistry;
    private ErrorLogger $errorLogger;
    private ManageCreations $manageCreations;
    private EnsureApiKeysPage $ensureApiKeysPage;
    private AuthMiddleware $authMiddleware;
    private AdminUpdater $adminUpdater;
    private Router $adminRouter;
    private Router $publicRouter;

    public static function run(): void
    {
        $app = new self();
        $app->handle(Request::fromGlobals());
    }

    public function __construct()
    {
        $this->manageRoot = dirname(__DIR__, 3);
        $this->projectRoot = dirname($this->manageRoot);
        $this->env = Env::load($this->manageRoot . '/.env');
        $this->privateStore = $this->manageRoot . '/store';
        $this->publicStore = $this->projectRoot . '/store';
        $modulesPath = $this->manageRoot . '/src/Modules';
        $integrationsPath = $this->manageRoot . '/src/Integrations';

        $documentRepository = new JsonDocumentRepository([
            'private' => $this->privateStore,
            'public' => $this->publicStore,
        ]);

        $userRepository = new JsonUserRepository($this->privateStore . '/auth.json');
        $moduleContext = new ModuleContext($this->projectRoot, $this->manageRoot);
        $this->moduleRegistry = new ModuleRegistry($modulesPath, $moduleContext);
        $moduleSettingsStore = new ModuleSettingsStore($moduleContext);
        $integrationContext = new IntegrationContext($this->projectRoot, $this->manageRoot);
        $integrationRegistry = new IntegrationRegistry($integrationsPath, $integrationContext);
        $integrationSettingsStore = new IntegrationSettingsStore($integrationContext);
        $integrationSyncStatusStore = new IntegrationSyncStatusStore($integrationContext);
        $logStore = new LogStore($this->manageRoot);
        $this->errorLogger = new ErrorLogger($this->manageRoot);
        $creationStore = new CreationStore($documentRepository, $this->projectRoot, $this->manageRoot);
        $websiteBuildStore = new WebsiteBuildStore($this->projectRoot, $creationStore);
        $userApiKeyHasher = new UserApiKeyHasher($this->env);
        $authUserStore = new AuthUserStore($documentRepository, $userApiKeyHasher);
        $delegatedLoginGrantStore = new DelegatedLoginGrantStore($this->manageRoot, $userApiKeyHasher);
        $apiKeyProvider = new EnvApiKeyProvider($this->env);
        $tokenService = new HmacTokenService($this->env);
        $realtimeConfig = new RealtimeConfig($this->env);
        $realtimeTicketService = new RealtimeTicketService($realtimeConfig->secret());
        $hasher = new BcryptPasswordHasher();
        $updaterStateStore = new UpdaterStateStore($this->manageRoot);
        $adminRelativePath = ltrim(str_replace($this->projectRoot, '', $this->manageRoot), '/');
        $updaterSource = new GitHubRepositorySource($adminRelativePath);
        $this->adminUpdater = new AdminUpdater($this->projectRoot, $this->manageRoot, $updaterSource, $updaterStateStore);

        $ensureModuleSettings = new EnsureModuleSettings($this->moduleRegistry, $moduleSettingsStore);
        $ensureDocumentId = new EnsureDocumentId($documentRepository);
        $ensureFormPages = new EnsureFormPages($documentRepository, $this->moduleRegistry, $moduleSettingsStore, $ensureDocumentId);
        $findDocumentByWrapperId = new FindDocumentByWrapperId($documentRepository, $ensureDocumentId);
        $listNavigation = new ListNavigation($documentRepository, $ensureModuleSettings, $ensureFormPages, $ensureDocumentId);
        $listModules = new ListModules($this->moduleRegistry);
        $listIntegrations = new ListIntegrations($integrationRegistry, $integrationSettingsStore, $integrationSyncStatusStore);
        $getIntegrationSettings = new GetIntegrationSettings($integrationRegistry, $integrationSettingsStore);
        $upsertIntegrationSettings = new UpsertIntegrationSettings($integrationRegistry, $integrationSettingsStore);
        $listLogs = new ListLogs($logStore);
        $listForms = new ListForms($documentRepository);
        $listAgents = new ListAgents($documentRepository, $ensureDocumentId);
        $getAgent = new GetAgent($documentRepository, $ensureDocumentId);
        $createAgent = new CreateAgent($documentRepository, $integrationRegistry, $integrationSettingsStore, $ensureDocumentId);
        $updateAgent = new UpdateAgent($documentRepository, $integrationRegistry, $integrationSettingsStore, $ensureDocumentId);
        $listAgentConversations = new ListAgentConversations($documentRepository);
        $createAgentConversation = new CreateAgentConversation($documentRepository, $ensureDocumentId);
        $getAgentConversation = new GetAgentConversation($documentRepository);
        $appendAgentMessage = new AppendAgentMessage($documentRepository, $ensureDocumentId);
        $realtimePublisher = new SocketRealtimePublisher($realtimeConfig);
        $integrationSyncWorker = new ReplyWorkerLauncher($this->projectRoot, $this->manageRoot . '/bin/integration-sync-worker.php');
        $queueIntegrationModelSync = new QueueIntegrationModelSync(
            $integrationRegistry,
            $integrationSettingsStore,
            $integrationSyncStatusStore,
            $realtimePublisher,
            $integrationSyncWorker
        );
        $agentWorker = new ReplyWorkerLauncher($this->projectRoot, $this->manageRoot . '/bin/agent-worker.php');
        $sendAgentMessage = new SendAgentMessage($appendAgentMessage, $realtimePublisher, $agentWorker);
        $getDocument = new GetDocument($documentRepository, $ensureDocumentId);
        $reorderDocuments = new ReorderDocuments($documentRepository);
        $updateDocument = new UpdateDocument($documentRepository, $reorderDocuments, $ensureModuleSettings, $ensureFormPages, $ensureDocumentId);
        $createDocument = new CreateDocument($documentRepository, $reorderDocuments, $ensureModuleSettings, $ensureFormPages, $ensureDocumentId);
        $exportDocument = new ExportDocument($documentRepository);
        $exportAllDocuments = new ExportAllDocuments($documentRepository);
        $exportAllPayloads = new ExportAllPayloads($documentRepository);
        $this->ensureApiKeysPage = new EnsureApiKeysPage($documentRepository);
        $listUserApiKeys = new ListUserApiKeys($authUserStore);
        $createUserApiKey = new CreateUserApiKey($authUserStore, $userApiKeyHasher);
        $deleteUserApiKey = new DeleteUserApiKey($authUserStore);
        $requestDelegatedLoginGrant = new RequestDelegatedLoginGrant($authUserStore, $delegatedLoginGrantStore);
        $exchangeDelegatedLoginGrant = new ExchangeDelegatedLoginGrant($delegatedLoginGrantStore, $authUserStore, $tokenService);
        $getLayoutConfig = new GetLayoutConfig($documentRepository);
        $this->manageCreations = new ManageCreations($creationStore);
        $manageWebsiteBuild = new ManageWebsiteBuild($websiteBuildStore);
        $getUiConfig = new GetUiConfig($documentRepository);
        $getSystemUpdateStatus = new GetSystemUpdateStatus($this->adminUpdater);
        $runSystemUpdate = new RunSystemUpdate($this->adminUpdater);
        $authenticateApiKey = new AuthenticateApiKey($apiKeyProvider);
        $authenticateUser = new AuthenticateUser($userRepository, $hasher, $tokenService);

        $navigationController = new NavigationController($listNavigation);
        $moduleController = new ModuleController($listModules);
        $moduleRequestController = new ModuleRequestController($this->moduleRegistry);
        $integrationController = new IntegrationController(
            $listIntegrations,
            $getIntegrationSettings,
            $upsertIntegrationSettings,
            $queueIntegrationModelSync,
            $tokenService
        );
        $logController = new LogController($listLogs);
        $formController = new FormController($listForms);
        $agentController = new AgentController($listAgents, $getAgent, $createAgent, $updateAgent);
        $agentConversationController = new AgentConversationController(
            $listAgentConversations,
            $createAgentConversation,
            $getAgentConversation,
            $sendAgentMessage,
            $tokenService
        );
        $creationController = new CreationController($this->manageCreations);
        $websiteBuildController = new WebsiteBuildController($manageWebsiteBuild);
        $documentController = new DocumentController($getDocument, $updateDocument, $createDocument, $exportDocument);
        $exportController = new ExportController($exportAllDocuments, $exportAllPayloads);
        $authController = new AuthController($authenticateUser, $authenticateApiKey);
        $delegatedLoginController = new DelegatedLoginController($requestDelegatedLoginGrant, $exchangeDelegatedLoginGrant);
        $userApiKeyController = new UserApiKeyController($listUserApiKeys, $createUserApiKey, $deleteUserApiKey, $tokenService);
        $layoutConfigController = new LayoutConfigController($getLayoutConfig);
        $realtimeController = new RealtimeController($authenticateApiKey, $tokenService, $realtimeTicketService, $realtimeConfig);
        $uiConfigController = new UiConfigController($getUiConfig);
        $systemUpdateController = new SystemUpdateController($getSystemUpdateStatus, $runSystemUpdate);

        $submitFormEntry = new SubmitFormEntry(
            $documentRepository,
            $ensureDocumentId,
            $ensureModuleSettings,
            $ensureFormPages,
            $findDocumentByWrapperId
        );
        $publicModuleController = new PublicModuleRequestController($submitFormEntry);

        $this->authMiddleware = new AuthMiddleware($authenticateApiKey, $tokenService);

        $publicTokenService = null;
        try {
            $publicTokenService = new PublicTokenService($this->env);
        } catch (\RuntimeException $exception) {
            $publicTokenService = null;
        }
        $publicAuthMiddleware = new PublicAuthMiddleware($publicTokenService);

        $this->adminRouter = new Router();
        AdminRoutes::register($this->adminRouter, [
            'navigation' => $navigationController,
            'modules' => $moduleController,
            'moduleRequest' => $moduleRequestController,
            'integrations' => $integrationController,
            'logs' => $logController,
            'forms' => $formController,
            'agents' => $agentController,
            'creations' => $creationController,
            'websiteBuild' => $websiteBuildController,
            'userApiKeys' => $userApiKeyController,
            'agentConversations' => $agentConversationController,
            'layout' => $layoutConfigController,
            'realtime' => $realtimeController,
            'ui' => $uiConfigController,
            'systemUpdate' => $systemUpdateController,
            'documents' => $documentController,
            'export' => $exportController,
        ]);

        $this->publicRouter = new Router();
        PublicRoutes::register($this->publicRouter, [
            'auth' => $authController,
            'delegatedLogin' => $delegatedLoginController,
            'publicModules' => $publicModuleController,
        ], $publicAuthMiddleware);
    }

    public function handle(Request $request): void
    {
        if (str_starts_with($request->path(), '/api/')) {
            $this->handleApi($request);
            return;
        }

        $this->handleStatic($request);
    }

    private function handleApi(Request $request): void
    {
        $path = $request->path();

        $router = $this->adminRouter;
        $requiresAdmin = true;
        if (
            $path === '/api/auth/login'
            || $path === '/api/auth/delegated-login/request'
            || $path === '/api/auth/delegated-login/exchange'
            || str_starts_with($path, '/api/public/')
        ) {
            $router = $this->publicRouter;
            $requiresAdmin = false;
        }

        if ($requiresAdmin && !$this->authMiddleware->authorize($request)) {
            Response::json(['error' => 'Unauthorized'], 401)->send();
            return;
        }

        if ($requiresAdmin && $this->adminUpdater->isLocked() && !$this->isAllowedDuringUpdate($path)) {
            Response::json([
                'ok' => false,
                'error' => 'Admin update is in progress.',
                'locked' => true,
            ], 423)->send();
            return;
        }

        $this->errorLogger->ensureSettings();
        $this->errorLogger->ensureLogFile();
        $this->manageCreations->ensurePage();
        $this->ensureApiKeysPage->handle();

        try {
            $response = $router->dispatch($request);
        } catch (\Throwable $exception) {
            $status = $exception instanceof \InvalidArgumentException ? 422 : 500;
            $this->errorLogger->logException($request, $exception, $status);
            Response::json(['ok' => false, 'message' => $exception->getMessage()], $status)->send();
            return;
        }

        if ($response->status() >= 400) {
            $body = $response->body();
            $message = 'Request failed.';
            if (is_array($body)) {
                if (isset($body['message'])) {
                    $message = (string) $body['message'];
                } elseif (isset($body['error'])) {
                    $message = (string) $body['error'];
                }
            } elseif (is_string($body) && trim($body) !== '') {
                $message = $body;
            }
            $this->errorLogger->logError($request, $message, $response->status(), ['body' => $body]);
        }

        $response->send();
    }

    private function isAllowedDuringUpdate(string $path): bool
    {
        return $path === '/api/system/update' || $path === '/api/system/update/run';
    }

    private function handleStatic(Request $request): void
    {
        $allowedPublicRoots = ['media' => true];
        $allowedPrivateRoots = ['media' => true];

        try {
            foreach ($this->moduleRegistry->list() as $module) {
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
                $candidate = $this->projectRoot . '/' . $root . '/' . $relative;
                $serveMedia($candidate);
            }
        }

        foreach (array_keys($allowedPrivateRoots) as $root) {
            $prefix = '/manage-media/' . $root . '/';
            if (str_starts_with($path, $prefix)) {
                $relative = ltrim(substr($path, strlen($prefix)), '/');
                $candidate = $this->manageRoot . '/' . $root . '/' . $relative;
                $serveMedia($candidate);
            }
        }

        $publicPath = $this->manageRoot . '/public' . $request->path();
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

        $index = $this->manageRoot . '/public/index.html';
        if (is_file($index)) {
            header('Content-Type: text/html; charset=utf-8');
            readfile($index);
            exit;
        }

        Response::text('Not Found', 404)->send();
    }
}
