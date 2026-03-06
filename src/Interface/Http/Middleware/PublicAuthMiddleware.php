<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Middleware;

use Manage\Infrastructure\Security\PublicTokenService;
use Manage\Interface\Http\Request;

final class PublicAuthMiddleware
{
    private ?PublicTokenService $tokens;

    public function __construct(?PublicTokenService $tokens)
    {
        $this->tokens = $tokens;
    }

    /** @return array{sub:string,role?:string,exp:int}|null */
    public function authenticate(Request $request): ?array
    {
        if ($this->tokens === null) {
            return null;
        }

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            return $this->tokens->verify($token);
        }

        return null;
    }
}
