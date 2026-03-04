<?php

declare(strict_types=1);

namespace Manage\Modules\Contracts;

#[\Attribute(\Attribute::TARGET_METHOD | \Attribute::IS_REPEATABLE)]
final class ModuleRoute
{
    public string $method;
    public ?string $path;

    public function __construct(string $method, ?string $path = null)
    {
        $this->method = strtoupper(trim($method));
        $this->path = $path !== null ? strtolower(trim($path)) : null;
    }
}
