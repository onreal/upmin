<?php

declare(strict_types=1);

namespace Manage\Interface\Http\Controllers;

use Manage\Application\UseCases\ExchangeDelegatedLoginGrant;
use Manage\Application\UseCases\RequestDelegatedLoginGrant;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;

final class DelegatedLoginController
{
    private RequestDelegatedLoginGrant $requestGrant;
    private ExchangeDelegatedLoginGrant $exchangeGrant;

    public function __construct(
        RequestDelegatedLoginGrant $requestGrant,
        ExchangeDelegatedLoginGrant $exchangeGrant
    ) {
        $this->requestGrant = $requestGrant;
        $this->exchangeGrant = $exchangeGrant;
    }

    public function request(Request $request, array $params): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $apiKey = trim((string) ($payload['apiKey'] ?? ''));
        if ($apiKey === '') {
            return Response::json(['error' => 'API key is required.'], 422);
        }

        $grant = $this->requestGrant->handle($apiKey);
        if ($grant === null) {
            return Response::json(['error' => 'Invalid API key.'], 401);
        }

        return Response::json($grant);
    }

    public function exchange(Request $request, array $params): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $grant = trim((string) ($payload['grant'] ?? ''));
        if ($grant === '') {
            return Response::json(['error' => 'Grant is required.'], 422);
        }

        $result = $this->exchangeGrant->handle($grant);
        if ($result === null) {
            return Response::json(['error' => 'Invalid or expired delegated login grant.'], 401);
        }

        return Response::json($result);
    }
}
