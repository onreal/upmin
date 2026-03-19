FROM php:8.2-cli

ARG CODEX_CLI_PACKAGE="@openai/codex"

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg nginx supervisor unzip git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && if [ -n "$CODEX_CLI_PACKAGE" ]; then npm install -g "$CODEX_CLI_PACKAGE"; fi \
    && npm cache clean --force \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY upmin/docker/nginx.conf /etc/nginx/nginx.conf
COPY upmin/docker/site.conf /etc/nginx/conf.d/default.conf
COPY upmin/docker/php-opcache.ini /usr/local/etc/php/conf.d/99-opcache.ini
COPY upmin/docker/supervisord.conf /etc/supervisor/conf.d/manage.conf
COPY upmin/docker/start-manage.sh /usr/local/bin/start-manage

RUN chmod +x /usr/local/bin/start-manage

WORKDIR /app
