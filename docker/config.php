<?php
unset($CFG);
global $CFG;
$CFG = new stdClass();
$required = static function (string $name): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException("Missing environment variable: " . $name);
    }
    return $value;
};
$CFG->dbtype = 'mysqli';
$CFG->dblibrary = 'native';
$CFG->dbhost = getenv('MOODLE_DB_HOST') ?: 'localhost';
$CFG->dbname = $required('MOODLE_DB_NAME');
$CFG->dbuser = $required('MOODLE_DB_USER');
$CFG->dbpass = $required('MOODLE_DB_PASSWORD');
$CFG->prefix = 'mdl_';
// Cloud Run usa el socket de Cloud SQL; la prueba local usa TCP (MOODLE_DB_HOST).
$CFG->dboptions = ['dbpersist' => false, 'dbcollation' => 'utf8mb4_unicode_ci'];
if (getenv('MOODLE_DB_SOCKET')) {
    $CFG->dboptions['dbsocket'] = getenv('MOODLE_DB_SOCKET');
}
$CFG->wwwroot = $required('MOODLE_WWWROOT');
$CFG->dataroot = '/mnt/moodle/moodledata';
$CFG->localcachedir = '/tmp/moodle-localcache';
$CFG->directorypermissions = 02770;
$CFG->admin = 'admin';
// Cloud Run termina TLS delante del contenedor; en local se usa HTTP.
$CFG->sslproxy = str_starts_with($CFG->wwwroot, 'https://');
// Cloud Run NFS mounts have no file locking: use database sessions and locks.
$CFG->session_handler_class = '\core\session\database';
$CFG->lock_factory = '\core\lock\db_record_lock_factory';
$CFG->preventwebinstall = true;
$CFG->disableupdateautodeploy = true;
require_once(__DIR__ . '/lib/setup.php');
