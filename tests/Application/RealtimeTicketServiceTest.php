<?php

declare(strict_types=1);

use Manage\Infrastructure\Realtime\RealtimeTicketService;
use PHPUnit\Framework\TestCase;

final class RealtimeTicketServiceTest extends TestCase
{
    public function testIssuesAndVerifiesTicket(): void
    {
        $service = new RealtimeTicketService('test-secret');

        $ticket = $service->issue(['sub' => 'user:user-1'], 60);
        $claims = $service->verify($ticket);

        $this->assertNotNull($claims);
        $this->assertSame('user:user-1', $claims['sub']);
        $this->assertSame('realtime-ticket', $claims['type']);
        $this->assertArrayHasKey('exp', $claims);
    }
}
