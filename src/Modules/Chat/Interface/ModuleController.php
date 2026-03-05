<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Interface;

use Manage\Application\Ports\TokenService;
use Manage\Domain\Module\ModuleDefinition;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Modules\Chat\Application\GetConversation;
use Manage\Modules\Chat\Application\DeleteConversation;
use Manage\Modules\Chat\Application\SendMessage;
use Manage\Modules\Chat\Application\ListConversations;
use Manage\Modules\Chat\Application\StartConversation;
use Manage\Modules\Contracts\ModuleRoute;
use Manage\Modules\ModuleSettingsStore;

final class ModuleController
{
    private ModuleDefinition $definition;
    private ListConversations $listConversations;
    private StartConversation $startConversation;
    private SendMessage $sendMessage;
    private GetConversation $getConversation;
    private DeleteConversation $deleteConversation;
    private ModuleSettingsStore $settings;
    private TokenService $tokens;

    public function __construct(
        ModuleDefinition $definition,
        ListConversations $listConversations,
        StartConversation $startConversation,
        SendMessage $sendMessage,
        GetConversation $getConversation,
        DeleteConversation $deleteConversation,
        ModuleSettingsStore $settings,
        TokenService $tokens
    )
    {
        $this->definition = $definition;
        $this->listConversations = $listConversations;
        $this->startConversation = $startConversation;
        $this->sendMessage = $sendMessage;
        $this->getConversation = $getConversation;
        $this->deleteConversation = $deleteConversation;
        $this->settings = $settings;
        $this->tokens = $tokens;
    }

    #[ModuleRoute('GET')]
    public function Get(Request $request): Response
    {
        return Response::json(['module' => $this->definition->toArray()]);
    }

    #[ModuleRoute('GET')]
    public function List(Request $request): Response
    {
        $query = $request->query();
        $settingsKey = is_string($query['settings'] ?? null) ? trim((string) $query['settings']) : '';
        if ($settingsKey === '') {
            return Response::json(['error' => 'Settings key is required.'], 400);
        }

        $settings = $this->settings->read($settingsKey);
        $agent = $this->resolveAgent($settings);
        if ($agent === null) {
            return Response::json(['error' => 'Chat.agent.name is required.'], 422);
        }

        $userId = $this->resolveUserId($request);
        $items = $this->listConversations->handle($settingsKey, $agent['name'], $userId, $settings);

        return Response::json(['items' => $items]);
    }

    #[ModuleRoute('GET')]
    public function Pull(Request $request): Response
    {
        $query = $request->query();
        $settingsKey = is_string($query['settings'] ?? null) ? trim((string) $query['settings']) : '';
        if ($settingsKey === '') {
            return Response::json(['error' => 'Settings key is required.'], 400);
        }

        $conversationId = $query['id'] ?? null;
        if (!is_string($conversationId) || trim($conversationId) === '') {
            return Response::json(['error' => 'Conversation id is required.'], 400);
        }

        $settings = $this->settings->read($settingsKey);
        $agent = $this->resolveAgent($settings);
        if ($agent === null) {
            return Response::json(['error' => 'Chat.agent.name is required.'], 422);
        }

        $userId = $this->resolveUserId($request);
        $conversation = $this->getConversation->handle(
            trim($conversationId),
            $settingsKey,
            $agent['name'],
            $userId,
            $settings
        );

        if ($conversation === null) {
            return Response::json(['error' => 'Conversation not found.'], 404);
        }

        return Response::json($conversation);
    }

    #[ModuleRoute('POST')]
    public function Post(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $settingsKey = is_string($payload['settings'] ?? null) ? trim((string) $payload['settings']) : '';
        if ($settingsKey === '') {
            return Response::json(['error' => 'Settings key is required.'], 400);
        }

        $settings = $this->settings->read($settingsKey);
        $agent = $this->resolveAgent($settings);
        if ($agent === null) {
            return Response::json(['error' => 'Chat.agent.name is required.'], 422);
        }

        $userId = $this->resolveUserId($request);

        $conversation = $this->startConversation->handle(
            $settingsKey,
            $agent['name'],
            $userId,
            $settings,
            $agent['id']
        );

        return Response::json($conversation, 201);
    }

    #[ModuleRoute('POST')]
    public function Message(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $conversationId = $payload['id'] ?? null;
        if (!is_string($conversationId) || trim($conversationId) === '') {
            return Response::json(['error' => 'Conversation id is required.'], 400);
        }

        $content = $payload['content'] ?? null;
        if (!is_string($content)) {
            return Response::json(['error' => 'Message.content is required.'], 422);
        }

        $settingsKey = is_string($payload['settings'] ?? null) ? trim((string) $payload['settings']) : '';
        if ($settingsKey === '') {
            return Response::json(['error' => 'Settings key is required.'], 400);
        }

        $settings = $this->settings->read($settingsKey);
        $agent = $this->resolveAgent($settings);
        if ($agent === null) {
            return Response::json(['error' => 'Chat.agent.name is required.'], 422);
        }

        $userId = $this->resolveUserId($request);

        try {
            $conversation = $this->sendMessage->handle(
                $conversationId,
                $settingsKey,
                $agent['name'],
                $userId,
                $content,
                $settings,
                $agent['id']
            );
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        if ($conversation === null) {
            return Response::json(['error' => 'Conversation not found.'], 404);
        }

        return Response::json($conversation);
    }

    #[ModuleRoute('POST')]
    public function Delete(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $conversationId = $payload['id'] ?? null;
        if (!is_string($conversationId) || trim($conversationId) === '') {
            return Response::json(['error' => 'Conversation id is required.'], 400);
        }

        $settingsKey = is_string($payload['settings'] ?? null) ? trim((string) $payload['settings']) : '';
        if ($settingsKey === '') {
            return Response::json(['error' => 'Settings key is required.'], 400);
        }

        $settings = $this->settings->read($settingsKey);
        $agent = $this->resolveAgent($settings);
        if ($agent === null) {
            return Response::json(['error' => 'Chat.agent.name is required.'], 422);
        }

        $userId = $this->resolveUserId($request);
        $deleted = $this->deleteConversation->handle(
            trim($conversationId),
            $settingsKey,
            $agent['name'],
            $userId,
            $settings
        );

        if (!$deleted) {
            return Response::json(['error' => 'Conversation not found.'], 404);
        }

        return Response::json(['ok' => true]);
    }

    /** @return array{name: string, id: ?string}|null */
    private function resolveAgent(?array $settings): ?array
    {
        if (!is_array($settings)) {
            return null;
        }
        $agent = $settings['agent'] ?? null;
        if (!is_array($agent)) {
            return null;
        }
        $name = $agent['name'] ?? null;
        if (!is_string($name) || trim($name) === '') {
            return null;
        }
        $id = $agent['id'] ?? null;
        if (!is_string($id) || trim($id) === '') {
            $id = null;
        }

        return [
            'name' => trim($name),
            'id' => $id !== null ? trim($id) : null,
        ];
    }

    private function resolveUserId(Request $request): string
    {
        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            $payload = $this->tokens->verify($token);
            if (is_array($payload) && isset($payload['userId'])) {
                return (string) $payload['userId'];
            }
        }

        return 'api-key';
    }
}
