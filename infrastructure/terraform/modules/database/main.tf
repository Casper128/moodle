variable "project_name" {
  type = string
}
variable "region" {
  type = string
}
variable "db_name" {
  type = string
}
variable "db_username" {
  type = string
}
variable "labels" {
  type = map(string)
}
variable "tier" {
  type = string
}
variable "db_password" {
  type      = string
  sensitive = true
}

resource "google_sql_database_instance" "moodle" {
  name                = "${var.project_name}-mysql"
  region              = var.region
  database_version    = "MYSQL_8_4"
  deletion_protection = true
  settings {
    tier            = var.tier
    user_labels     = var.labels
    edition         = "ENTERPRISE"
    disk_size       = 20
    disk_autoresize = true
    backup_configuration {
      enabled            = true
      binary_log_enabled = true
    }
    ip_configuration {
      ipv4_enabled = true
    }
  }
}
resource "google_sql_database" "moodle" {
  name      = var.db_name
  instance  = google_sql_database_instance.moodle.name
  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}
resource "google_sql_user" "moodle" {
  name     = var.db_username
  instance = google_sql_database_instance.moodle.name
  host     = "%"
  password = var.db_password
}

output "connection_name" { value = google_sql_database_instance.moodle.connection_name }
