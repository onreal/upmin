<?php

declare(strict_types=1);

namespace Manage\Infrastructure\Realtime;

final class RealtimeIdentity
{
    public static function fromUserId(string $userId): string
    {
        $userId = trim($userId);
        if ($userId === '' || $userId === 'api-key') {
            return 'api-key';
        }

        return 'user:' . $userId;
    }
}
