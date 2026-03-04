<?php

declare(strict_types=1);

namespace Manage\Modules;

use Manage\Domain\Module\ModuleDefinition;
use Manage\Modules\Contracts\ModuleHandler;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

final class ModuleRegistry
{
    private string $modulesPath;
    private ModuleContext $context;

    /** @var array<string, ModuleHandler> */
    private array $handlers = [];

    public function __construct(string $modulesPath, ModuleContext $context)
    {
        $this->modulesPath = rtrim($modulesPath, '/');
        $this->context = $context;
    }

    /** @return ModuleDefinition[] */
    public function list(): array
    {
        return array_map(
            static fn(ModuleHandler $handler) => $handler->definition(),
            $this->loadHandlers()
        );
    }

    public function definition(string $name): ?ModuleDefinition
    {
        $handler = $this->handler($name);
        return $handler?->definition();
    }

    public function handler(string $name): ?ModuleHandler
    {
        $handlers = $this->loadHandlers();
        return $handlers[$name] ?? null;
    }

    /** @return array<string, ModuleHandler> */
    private function loadHandlers(): array
    {
        if ($this->handlers) {
            return $this->handlers;
        }

        if (!is_dir($this->modulesPath)) {
            return $this->handlers;
        }

        $useExtension = function_exists('yaml_parse_file');
        if (!$useExtension && !class_exists(Yaml::class)) {
            throw new \RuntimeException('YAML parser not available. Install symfony/yaml or enable ext-yaml.');
        }

        $manifests = glob($this->modulesPath . '/*/manifest.{yaml,yml}', GLOB_BRACE) ?: [];
        sort($manifests);

        foreach ($manifests as $manifest) {
            $directory = basename(dirname($manifest));

            try {
                $payload = $useExtension ? yaml_parse_file($manifest) : Yaml::parseFile($manifest);
            } catch (ParseException $exception) {
                throw new \RuntimeException('Invalid module YAML: ' . basename($manifest));
            }

            if ($payload === false || !is_array($payload)) {
                throw new \RuntimeException('Module YAML must be a mapping: ' . basename($manifest));
            }

            $definition = ModuleDefinition::fromArray($payload, $manifest);
            $class = 'Manage\\Modules\\' . $directory . '\\Module';

            if (!class_exists($class)) {
                throw new \RuntimeException('Module handler not found: ' . $class);
            }

            /** @var ModuleHandler $handler */
            $handler = new $class($definition, $this->context);
            if (!$handler instanceof ModuleHandler) {
                throw new \RuntimeException('Module handler must implement ModuleHandler: ' . $class);
            }
            $name = $handler->definition()->name();

            if (isset($this->handlers[$name])) {
                throw new \RuntimeException('Duplicate module name: ' . $name);
            }

            $this->handlers[$name] = $handler;
        }

        return $this->handlers;
    }
}
