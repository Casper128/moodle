#!/bin/sh
set -eu
umask 007
# Only this subdirectory is owned by Moodle; never recursively chown the share.
mkdir -p /mnt/moodle/moodledata
chown www-data:www-data /mnt/moodle/moodledata
chmod 2770 /mnt/moodle/moodledata
case "${1:-web}" in
  web) . /etc/apache2/envvars; exec apache2 -D FOREGROUND ;;
  install) exec gosu www-data php -d memory_limit=512M /opt/moodle/install.php ;;
  cron) exec gosu www-data php /var/www/moodle/admin/cli/cron.php ;;
  *) echo 'Expected web, install or cron' >&2; exit 2 ;;
esac
