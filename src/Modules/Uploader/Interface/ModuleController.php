<?php

declare(strict_types=1);

namespace Manage\Modules\Uploader\Interface;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Modules\Contracts\ModuleRoute;
use Manage\Modules\Uploader\Application\UploadImage;

final class ModuleController
{
    private UploadImage $uploadImage;
    private ModuleDefinition $definition;

    public function __construct(ModuleDefinition $definition, UploadImage $uploadImage)
    {
        $this->definition = $definition;
        $this->uploadImage = $uploadImage;
    }

    #[ModuleRoute('GET')]
    public function Get(Request $request): Response
    {
        return Response::json(['module' => $this->definition->toArray()]);
    }

    #[ModuleRoute('POST')]
    public function Post(Request $request): Response
    {
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
            $postMax = ini_get('post_max_size');
            $postMaxBytes = is_string($postMax) ? $this->parseSizeToBytes($postMax) : 0;
            if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes) {
                return Response::json(
                    ['error' => 'Upload exceeds server post_max_size (' . $postMax . ').'],
                    400
                );
            }
            return Response::json(['error' => 'File is required.'], 400);
        }

        $settingsKey = null;
        if (isset($_POST['settings']) && is_string($_POST['settings'])) {
            $settingsKey = trim($_POST['settings']);
        }

        try {
            $result = $this->uploadImage->handle($_FILES['file'], $settingsKey);
        } catch (\RuntimeException $exception) {
            return Response::json(['error' => $exception->getMessage()], 400);
        }

        return Response::json($result, 201);
    }

    #[ModuleRoute('GET')]
    public function List(Request $request): Response
    {
        return Response::json(['items' => []]);
    }

    private function parseSizeToBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        $unit = strtolower(substr($value, -1));
        $number = (int) $value;
        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
