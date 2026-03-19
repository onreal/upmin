#!/bin/sh
set -eu

if [ ! -f /app/upmin/vendor/autoload.php ] || [ /app/upmin/composer.lock -nt /app/upmin/vendor/autoload.php ]; then
  mkdir -p /app/upmin/vendor
  find /app/upmin/vendor -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  composer install --working-dir=/app/upmin --no-interaction --no-dev --prefer-dist --optimize-autoloader
fi

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/manage.conf
