# Imagen de Moodle construida desde el código de este repositorio (fork de moodle/moodle).
# Las imágenes base se fijan por digest para que la construcción sea reproducible.

# 1) Dependencias PHP de Moodle 5.2 según composer.lock (sin paquetes de desarrollo).
FROM composer:2@sha256:50ea4d33fdcde1adb0f045547295faa1548b33872e5f789dae5b02ce2fb5de93 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts \
      --no-autoloader --ignore-platform-reqs --prefer-dist \
 && composer dump-autoload --no-dev --no-scripts

# 2) Ejecución: Apache + PHP 8.3 precompilado de Ubuntu 24.04.
FROM ubuntu:24.04@sha256:562111b88caa79c71391c0c4d3c2114a7d5c35915c20561fd893cb1e07929e6b
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      apache2 libapache2-mod-php8.3 php8.3-cli php8.3-mysql php8.3-xml \
      php8.3-curl php8.3-gd php8.3-intl php8.3-mbstring php8.3-zip \
      php8.3-soap php8.3-bcmath ca-certificates gosu \
 && rm -rf /var/lib/apt/lists/*

COPY --chown=root:www-data . /var/www/moodle
COPY --from=vendor --chown=root:www-data /app/vendor /var/www/moodle/vendor
COPY docker/moodle.ini /etc/php/8.3/mods-available/moodle.ini
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/config.php /var/www/moodle/config.php
COPY docker/install.php /opt/moodle/install.php
COPY docker/entrypoint.sh /usr/local/bin/moodle-entrypoint
RUN phpenmod moodle && sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf \
 && chmod +x /usr/local/bin/moodle-entrypoint \
 && rm -rf /var/www/moodle/docker

ARG GIT_SHA=local
LABEL org.opencontainers.image.source="https://github.com/Casper128/moodle" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.title="moodle-gcp"
ENV APACHE_CONFDIR=/etc/apache2 MOODLE_GIT_SHA=${GIT_SHA}
WORKDIR /var/www/moodle
EXPOSE 8080
ENTRYPOINT ["moodle-entrypoint"]
CMD ["web"]
