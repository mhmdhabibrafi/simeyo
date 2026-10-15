FROM php:8.2-fpm-alpine
RUN apk upgrade --no-cache \
    && apk add --no-cache libpq libzip libpng libjpeg-turbo freetype oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_pgsql mbstring zip gd pcntl opcache \
    && apk del .build-deps
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY infrastructure/docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY infrastructure/production/php.ini /usr/local/etc/php/conf.d/production.ini
WORKDIR /app
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --optimize-autoloader
COPY apps/api .
# A checkout created with umask 077 must still be readable by the runtime user.
RUN chmod -R a+rX /app \
    && composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && php artisan package:discover \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm"]
