<?php

declare(strict_types=1);

namespace Manage\Integrations;

use Manage\Domain\Integration\IntegrationDefinition;
use Manage\Integrations\Contracts\IntegrationCatalog;
use Manage\Integrations\Contracts\IntegrationHandler;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

final class IntegrationRegistry implements IntegrationCatalog
{
    private string $integrationsPath;
    private IntegrationContext $context;

    /** @var array<string, IntegrationHandler> */
    private array $handlers = [];

    public function __construct(string $integrationsPath, IntegrationContext $context)
    {
        $this->integrationsPath = rtrim($integrationsPath, '/');
        $this->context = $context;
    }

    /** @return IntegrationDefinition[] */
    public function list(): array
    {
        return array_map(
            static fn(IntegrationHandler $handler) => $handler->definition(),
            $this->loadHandlers()
        );
    }

    public function definition(string $name): ?IntegrationDefinition
    {
        $handler = $this->handler($name);
        return $handler?->definition();
    }

    public function handler(string $name): ?IntegrationHandler
    {
        $handlers = $this->loadHandlers();
        return $handlers[$name] ?? null;
    }

    /** @return array<string, IntegrationHandler> */
    private function loadHandlers(): array
    {
        if ($this->handlers) {
            return $this->handlers;
        }

        if (!is_dir($this->integrationsPath)) {
            return $this->handlers;
        }

        $useExtension = function_exists('yaml_parse_file');
        if (!$useExtension && !class_exists(Yaml::class)) {
            throw new \RuntimeException('YAML parser not available. Install symfony/yaml or enable ext-yaml.');
        }

        $manifests = [
            ...(glob($this->integrationsPath . '/*/manifest.yaml') ?: []),
            ...(glob($this->integrationsPath . '/*/manifest.yml') ?: []),
        ];
        $manifests = array_values(array_unique($manifests));
        sort($manifests);

        foreach ($manifests as $manifest) {
            $directory = basename(dirname($manifest));

            try {
                $payload = $useExtension ? yaml_parse_file($manifest) : Yaml::parseFile($manifest);
            } catch (ParseException $exception) {
                throw new \RuntimeException('Invalid integration YAML: ' . basename($manifest));
            }

            if ($payload === false || !is_array($payload)) {
                throw new \RuntimeException('Integration YAML must be a mapping: ' . basename($manifest));
            }

            $definition = IntegrationDefinition::fromArray($payload, $manifest);
            $class = 'Manage\\Integrations\\' . $directory . '\\Integration';

            if (!class_exists($class)) {
                throw new \RuntimeException('Integration handler not found: ' . $class);
            }

            /** @var IntegrationHandler $handler */
            $handler = new $class($definition, $this->context);
            if (!$handler instanceof IntegrationHandler) {
                throw new \RuntimeException('Integration handler must implement IntegrationHandler: ' . $class);
            }
            $name = $handler->definition()->name();

            if (isset($this->handlers[$name])) {
                throw new \RuntimeException('Duplicate integration name: ' . $name);
            }

            $this->handlers[$name] = $handler;
        }

        return $this->handlers;
    }
}
