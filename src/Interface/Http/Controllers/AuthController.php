<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\AuthenticateApiKey;
use Manage\Application\UseCases\AuthenticateUser;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class AuthController
{
    private AuthenticateUser $authenticateUser;
    private AuthenticateApiKey $authenticateApiKey;

    public function __construct(AuthenticateUser $authenticateUser, AuthenticateApiKey $authenticateApiKey)
    {
        $this->authenticateUser = $authenticateUser;
        $this->authenticateApiKey = $authenticateApiKey;
    }

    public function login(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        if (isset($payload['apiKey'])) {
            if ($this->authenticateApiKey->handle((string) $payload['apiKey'])) {
                return Response::json(['apiKey' => true]);
            }
            return Response::json(['error' => 'Invalid API key.'], 401);
        }

        $email = (string) ($payload['email'] ?? '');
        $password = (string) ($payload['password'] ?? '');
        if ($email === '' || $password === '') {
            return Response::json(['error' => 'Email and password required.'], 422);
        }

        $result = $this->authenticateUser->handle($email, $password);
        if ($result === null) {
            return Response::json(['error' => 'Invalid credentials.'], 401);
        }

        return Response::json($result);
    }
}
