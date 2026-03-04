<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Middleware;

use Manage\Application\UseCases\AuthenticateApiKey;
use Manage\Application\Ports\TokenService;
use Manage\Interface\Http\Request;

final class AuthMiddleware
{
    private AuthenticateApiKey $apiKeyAuth;
    private TokenService $tokens;

    public function __construct(AuthenticateApiKey $apiKeyAuth, TokenService $tokens)
    {
        $this->apiKeyAuth = $apiKeyAuth;
        $this->tokens = $tokens;
    }

    public function authorize(Request $request): bool
    {
        $apiKey = $request->header('X-API-KEY');
        if ($this->apiKeyAuth->handle($apiKey)) {
            return true;
        }

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            return $this->tokens->verify($token) !== null;
        }

        return false;
    }
}
