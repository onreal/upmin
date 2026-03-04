<?php

declare(strict_types=1);

use Manage\Domain\Document\DocumentWrapper;
use PHPUnit\Framework\TestCase;

final class DocumentWrapperTest extends TestCase
{
    public function testValidWrapper(): void
    {
        $wrapper = DocumentWrapper::fromArray([
            'page' => 'content',
            'name' => 'Περιεχόμενο',
            'language' => 'el',
            'order' => 2,
            'section' => false,
            'data' => ['title' => 'Hello'],
        ]);

        $this->assertSame('content', $wrapper->page());
        $this->assertSame('Περιεχόμενο', $wrapper->name());
        $this->assertSame('el', $wrapper->language());
        $this->assertSame(2, $wrapper->order());
        $this->assertFalse($wrapper->isSection());
        $this->assertSame(['title' => 'Hello'], $wrapper->data());
    }

    public function testInvalidWrapperThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DocumentWrapper::fromArray([
            'name' => 'Missing page',
            'order' => 1,
            'section' => true,
            'data' => [],
        ]);
    }
}
