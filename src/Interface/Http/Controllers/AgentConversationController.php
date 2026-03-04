<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\Ports\TokenService;
use Manage\Application\UseCases\AppendAgentMessage;
use Manage\Application\UseCases\CreateAgentConversation;
use Manage\Application\UseCases\GetAgentConversation;
use Manage\Application\UseCases\ListAgentConversations;
use Manage\Domain\Document\DocumentId;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class AgentConversationController
{
    private ListAgentConversations $listConversations;
    private CreateAgentConversation $createConversation;
    private GetAgentConversation $getConversation;
    private AppendAgentMessage $appendMessage;
    private TokenService $tokens;

    public function __construct(
        ListAgentConversations $listConversations,
        CreateAgentConversation $createConversation,
        GetAgentConversation $getConversation,
        AppendAgentMessage $appendMessage,
        TokenService $tokens
    )
    {
        $this->listConversations = $listConversations;
        $this->createConversation = $createConversation;
        $this->getConversation = $getConversation;
        $this->appendMessage = $appendMessage;
        $this->tokens = $tokens;
    }

    public function index(Request $request, array $params): Response
    {
        try {
            $agentId = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid agent id.'], 400);
        }

        $userId = $this->resolveUserId($request);
        $conversations = $this->listConversations->handle($agentId, $userId);

        return Response::json(['conversations' => $conversations]);
    }

    public function create(Request $request, array $params): Response
    {
        try {
            $agentId = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid agent id.'], 400);
        }

        $userId = $this->resolveUserId($request);
        $conversation = $this->createConversation->handle($agentId, $userId);
        if ($conversation === null) {
            return Response::json(['error' => 'Agent not found.'], 404);
        }

        return Response::json($conversation, 201);
    }

    public function show(Request $request, array $params): Response
    {
        try {
            $conversationId = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid conversation id.'], 400);
        }

        $userId = $this->resolveUserId($request);
        $conversation = $this->getConversation->handle($conversationId, $userId);
        if ($conversation === null) {
            return Response::json(['error' => 'Conversation not found.'], 404);
        }

        return Response::json($conversation);
    }

    public function append(Request $request, array $params): Response
    {
        try {
            $conversationId = DocumentId::fromEncoded($params['id'] ?? '');
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => 'Invalid conversation id.'], 400);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $content = $payload['content'] ?? null;
        if (!is_string($content)) {
            return Response::json(['error' => 'Message.content is required.'], 422);
        }

        $userId = $this->resolveUserId($request);

        try {
            $conversation = $this->appendMessage->handle($conversationId, $userId, $content);
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        if ($conversation === null) {
            return Response::json(['error' => 'Conversation not found.'], 404);
        }

        return Response::json($conversation);
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
