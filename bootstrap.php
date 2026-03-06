<?php

declare(strict_types=1);

$vendorAutoload = __DIR__ . '/vendor/autoload.php';
if (is_file($vendorAutoload)) {
    require $vendorAutoload;
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'Manage\\';
    $baseDir = __DIR__ . '/src/';

    if (strpos($class, $prefix) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    if (str_starts_with($relativeClass, 'Application\\PublicArea\\')) {
        $suffix = substr($relativeClass, strlen('Application\\PublicArea\\'));
        $file = $baseDir . 'Application/Public/' . str_replace('\\', '/', $suffix) . '.php';
    } else {
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    }

    if (is_file($file)) {
        require $file;
    }
});
