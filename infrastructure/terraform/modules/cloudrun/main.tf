variable "project_name" { type = string }
variable "project_id" { type = string }
variable "region" { type = string }
variable "image" { type = string }
variable "service_account" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }
variable "nfs_server" { type = string }
variable "sql_connection" { type = string }
variable "db_secret" { type = string }
variable "db_version" { type = string }
variable "admin_secret" { type = string }
variable "admin_version" { type = string }
variable "environment" { type = map(string) }
variable "enable_web" { type = bool }
variable "enable_cron" { type = bool }
variable "labels" { type = map(string) }
variable "cron_schedule" { type = string }
resource "google_cloud_run_v2_service" "web" {
  name                = "${var.project_name}-web"
  location            = var.region
  deletion_protection = false
  labels              = var.labels
  ingress             = "INGRESS_TRAFFIC_ALL"
  template {
    labels                           = var.labels
    max_instance_request_concurrency = 20
    scaling { max_instance_count = 1 }

    service_account       = var.service_account
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    timeout               = "3600s"
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = var.network
        subnetwork = var.subnetwork
      }
    }
    volumes {
      name = "data"
      nfs {
        server = var.nfs_server
        path   = "/moodle"
      }
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance { instances = [var.sql_connection] }
    }
    containers {
      image = var.image
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1", memory = "1Gi" }
        cpu_idle          = true
        startup_cpu_boost = true
      }
      startup_probe {
        tcp_socket { port = 8080 }
        period_seconds    = 5
        failure_threshold = 12
      }
      volume_mounts {
        name       = "data"
        mount_path = "/mnt/moodle"
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
      dynamic "env" {
        for_each = var.environment
        content {
          name  = env.key
          value = env.value
        }
      }
      env {
        name  = "MOODLE_DB_SOCKET"
        value = "/cloudsql/${var.sql_connection}"
      }
      env {
        name = "MOODLE_DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.db_secret
            version = var.db_version
          }
        }
      }

    }
  }
}
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.enable_web ? 1 : 0
  name     = google_cloud_run_v2_service.web.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
resource "google_cloud_run_v2_job" "task" {
  for_each            = toset(["install", "cron"])
  name                = "${var.project_name}-${each.key}"
  location            = var.region
  deletion_protection = false
  labels              = var.labels
  template {
    task_count  = 1
    parallelism = 1
    template {
      max_retries = 0

      service_account       = var.service_account
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      timeout               = "3600s"
      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"
        network_interfaces {
          network    = var.network
          subnetwork = var.subnetwork
        }
      }
      volumes {
        name = "data"
        nfs {
          server = var.nfs_server
          path   = "/moodle"
        }
      }
      volumes {
        name = "cloudsql"
        cloud_sql_instance { instances = [var.sql_connection] }
      }
      containers {
        image = var.image
        args  = [each.key]
        resources { limits = { cpu = "1", memory = "1Gi" } }
        volume_mounts {
          name       = "data"
          mount_path = "/mnt/moodle"
        }
        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
        dynamic "env" {
          for_each = var.environment
          content {
            name  = env.key
            value = env.value
          }
        }
        env {
          name  = "MOODLE_DB_SOCKET"
          value = "/cloudsql/${var.sql_connection}"
        }
        env {
          name = "MOODLE_DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = var.db_secret
              version = var.db_version
            }
          }
        }
        dynamic "env" {
          for_each = each.key == "install" ? [1] : []
          content {
            name = "MOODLE_ADMIN_PASSWORD"
            value_source {
              secret_key_ref {
                secret  = var.admin_secret
                version = var.admin_version
              }
            }
          }
        }
      }
    }
  }
}
resource "google_service_account" "scheduler" {
  account_id = "${var.project_name}-scheduler"
}
resource "google_cloud_run_v2_job_iam_member" "scheduler" {
  name     = google_cloud_run_v2_job.task["cron"].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}
resource "google_cloud_scheduler_job" "cron" {
  name     = "${var.project_name}-cron"
  region   = var.region
  schedule = var.cron_schedule
  paused   = !var.enable_cron
  http_target {
    uri         = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/${var.region}/jobs/${google_cloud_run_v2_job.task["cron"].name}:run"
    http_method = "POST"
    oauth_token { service_account_email = google_service_account.scheduler.email }
  }
  depends_on = [google_cloud_run_v2_job_iam_member.scheduler]
}
output "url" { value = google_cloud_run_v2_service.web.uri }
