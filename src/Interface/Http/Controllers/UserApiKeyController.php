<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\Ports\TokenService;
use Manage\Application\UseCases\CreateUserApiKey;
use Manage\Application\UseCases\DeleteUserApiKey;
use Manage\Application\UseCases\ListUserApiKeys;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class UserApiKeyController
{
    private ListUserApiKeys $listApiKeys;
    private CreateUserApiKey $createApiKey;
    private DeleteUserApiKey $deleteApiKey;
    private TokenService $tokens;

    public function __construct(
        ListUserApiKeys $listApiKeys,
        CreateUserApiKey $createApiKey,
        DeleteUserApiKey $deleteApiKey,
        TokenService $tokens
    ) {
        $this->listApiKeys = $listApiKeys;
        $this->createApiKey = $createApiKey;
        $this->deleteApiKey = $deleteApiKey;
        $this->tokens = $tokens;
    }

    public function index(Request $request, array $params): Response
    {
        $user = $this->currentUser($request);
        if ($user === null) {
            return Response::json(['error' => 'Unauthorized'], 401);
        }

        return Response::json(['items' => $this->listApiKeys->handle($user['userId'])]);
    }

    public function create(Request $request, array $params): Response
    {
        $user = $this->currentUser($request);
        if ($user === null) {
            return Response::json(['error' => 'Unauthorized'], 401);
        }

        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        try {
            $apiKey = $this->createApiKey->handle(
                $user['userId'],
                (string) ($payload['name'] ?? ''),
                (string) ($payload['expiry'] ?? '')
            );
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 422);
        }

        return Response::json($apiKey, 201);
    }

    public function delete(Request $request, array $params): Response
    {
        $user = $this->currentUser($request);
        if ($user === null) {
            return Response::json(['error' => 'Unauthorized'], 401);
        }

        try {
            $this->deleteApiKey->handle($user['userId'], (string) ($params['id'] ?? ''));
        } catch (\InvalidArgumentException $exception) {
            return Response::json(['error' => $exception->getMessage()], 404);
        }

        return Response::json(['ok' => true]);
    }

    /** @return array{userId: string, email: string}|null */
    private function currentUser(Request $request): ?array
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        return $this->tokens->verify(trim(substr($authHeader, 7)));
    }
}
