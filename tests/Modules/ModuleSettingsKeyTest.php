<?php

declare(strict_types=1);

use Manage\Modules\ModuleSettingsKey;
use PHPUnit\Framework\TestCase;

final class ModuleSettingsKeyTest extends TestCase
{
    public function testDocumentIdCanBeRecoveredFromSettingsKey(): void
    {
        $documentId = '11111111-1111-4111-8111-111111111111';

        $this->assertSame(
            $documentId,
            ModuleSettingsKey::documentIdFromKey($documentId . '-chat', 'chat')
        );
    }

    public function testDocumentIdReturnsNullForMismatchedModuleSuffix(): void
    {
        $documentId = '11111111-1111-4111-8111-111111111111';

        $this->assertNull(ModuleSettingsKey::documentIdFromKey($documentId . '-gallery', 'chat'));
    }
}
