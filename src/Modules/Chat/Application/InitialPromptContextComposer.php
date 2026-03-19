<?php

declare(strict_types=1);

namespace Manage\Modules\Chat\Application;

final class InitialPromptContextComposer
{
    /**
     * @param array{pageData?: mixed, schema?: mixed} $context
     * @return array<int, array<string, mixed>>
     */
    public function buildContextMessages(array $context): array
    {
        if ($context === []) {
            return [];
        }

        return [
            [
                'role' => 'user',
                'content' => $this->compose(
                    $context['pageData'] ?? null,
                    $context['schema'] ?? null
                ),
            ],
        ];
    }

    private function compose(mixed $pageData, mixed $schema): string
    {
        return implode("\n\n", [
            'Use the following current page data JSON as context for this conversation.',
            'PAGE_DATA_JSON:',
            $this->encodeJson($pageData),
            'Use the following exact JSON schema as the required structure reference for this conversation.',
            'JSON_SCHEMA:',
            $this->encodeJson($schema),
        ]);
    }

    private function encodeJson(mixed $value): string
    {
        $encoded = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return is_string($encoded) ? $encoded : 'null';
    }
}
