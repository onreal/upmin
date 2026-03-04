<?php

declare(strict_types=1);

namespace Manage\Modules\Gallery\Interface;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Interface\Http\Request;
use Manage\Interface\Http\Response;
use Manage\Modules\Contracts\ModuleRoute;
use Manage\Modules\Gallery\Application\ListMedia;
use Manage\Modules\ModuleSettingsStore;

final class ModuleController
{
    private ModuleDefinition $definition;
    private ListMedia $listMedia;
    private ModuleSettingsStore $settings;

    public function __construct(
        ModuleDefinition $definition,
        ListMedia $listMedia,
        ModuleSettingsStore $settings
    )
    {
        $this->definition = $definition;
        $this->listMedia = $listMedia;
        $this->settings = $settings;
    }

    #[ModuleRoute('GET')]
    public function Get(Request $request): Response
    {
        return Response::json(['module' => $this->definition->toArray()]);
    }

    #[ModuleRoute('GET')]
    public function List(Request $request): Response
    {
        $query = $request->query();
        $settingsKey = is_string($query['settings'] ?? null) ? trim((string) $query['settings']) : null;
        $visibility = is_string($query['visibility'] ?? null) ? trim((string) $query['visibility']) : null;

        $settings = null;
        if (is_string($settingsKey) && $settingsKey !== '') {
            $settings = $this->settings->read($settingsKey);
        }

        $items = $this->listMedia->handle($settings, $visibility);

        return Response::json(['items' => $items]);
    }

    #[ModuleRoute('POST')]
    public function Delete(Request $request): Response
    {
        $payload = $request->body();
        if (!is_array($payload)) {
            return Response::json(['error' => 'Invalid payload.'], 400);
        }

        $path = $payload['path'] ?? null;
        if (!is_string($path) || trim($path) === '') {
            return Response::json(['error' => 'Path is required.'], 400);
        }

        $settingsKey = $payload['settings'] ?? null;
        $visibility = $payload['visibility'] ?? null;

        $settings = null;
        if (is_string($settingsKey) && trim($settingsKey) !== '') {
            $settings = $this->settings->read(trim($settingsKey));
        }

        $visibilityValue = is_string($visibility) ? trim($visibility) : null;
        $result = $this->listMedia->delete($path, $settings, $visibilityValue);

        if (!$result) {
            return Response::json(['error' => 'File not found.'], 404);
        }

        return Response::json(['ok' => true]);
    }
}
