FROM php:8.2-cli

ARG CODEX_CLI_PACKAGE="@openai/codex"

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && if [ -n "$CODEX_CLI_PACKAGE" ]; then npm install -g "$CODEX_CLI_PACKAGE"; fi \
    && npm cache clean --force \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
