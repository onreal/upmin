FROM php:8.2-cli

ARG CODEX_CLI_PACKAGE="@openai/codex"

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg nginx supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && if [ -n "$CODEX_CLI_PACKAGE" ]; then npm install -g "$CODEX_CLI_PACKAGE"; fi \
    && npm cache clean --force \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY manage/docker/nginx.conf /etc/nginx/nginx.conf
COPY manage/docker/site.conf /etc/nginx/conf.d/default.conf
COPY manage/docker/php-opcache.ini /usr/local/etc/php/conf.d/99-opcache.ini
COPY manage/docker/supervisord.conf /etc/supervisor/conf.d/manage.conf
COPY manage/docker/start-manage.sh /usr/local/bin/start-manage

RUN chmod +x /usr/local/bin/start-manage

WORKDIR /app
