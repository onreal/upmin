<?php

declare(strict_types=1);

namespace Manage\Domain\Integration;

final class IntegrationId
{
    private const NAMESPACE_UUID = '6c0d0a34-9a4d-4b6c-8a63-1b2d4a1a7c42';

    public static function fromName(string $name): string
    {
        $name = strtolower(trim($name));
        if ($name === '') {
            throw new \InvalidArgumentException('Integration name is required for id.');
        }

        return self::uuidV5(self::NAMESPACE_UUID, $name);
    }

    public static function isValid(?string $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        $value = trim($value);
        if ($value === '') {
            return false;
        }
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        ) === 1;
    }

    private static function uuidV5(string $namespace, string $name): string
    {
        $ns = str_replace('-', '', strtolower($namespace));
        if (strlen($ns) !== 32 || !ctype_xdigit($ns)) {
            throw new \InvalidArgumentException('Invalid namespace UUID.');
        }

        $nsBytes = hex2bin($ns);
        if ($nsBytes === false) {
            throw new \InvalidArgumentException('Invalid namespace UUID.');
        }

        $hash = sha1($nsBytes . $name, true);
        $hash[6] = chr((ord($hash[6]) & 0x0f) | 0x50);
        $hash[8] = chr((ord($hash[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($hash), 4));
    }
}
