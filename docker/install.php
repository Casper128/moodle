<?php
// Pass credentials in-process, not in the container command line or image.
$required = static function (string $name): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException('Missing environment variable: ' . $name);
    }
    return $value;
};
$argv = ['/var/www/moodle/admin/cli/install_database.php', '--agree-license', '--lang=en'];
foreach (['adminuser' => 'MOODLE_ADMIN_USER', 'adminpass' => 'MOODLE_ADMIN_PASSWORD',
          'adminemail' => 'MOODLE_ADMIN_EMAIL', 'fullname' => 'MOODLE_SITE_NAME',
          'shortname' => 'MOODLE_SITE_SHORTNAME'] as $option => $env) {
    $argv[] = '--' . $option . '=' . $required($env);
}
$argc = count($argv);
$_SERVER['argv'] = $argv;
$_SERVER['argc'] = $argc;
require '/var/www/moodle/admin/cli/install_database.php';
