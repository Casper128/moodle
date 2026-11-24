terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project        = var.project_id
  region         = var.region
  default_labels = local.labels
}

locals {
  labels = merge({ app = "moodle", managed-by = "terraform" }, var.labels)
  # URL determinista de Cloud Run: se conoce antes de crear el servicio.
  moodle_url       = "https://${var.project_name}-web-${data.google_project.current.number}.${var.region}.run.app"
  image_repository = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.moodle.repository_id}/moodle"
}

resource "google_project_service" "apis" {
  for_each = toset([
    "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com", "run.googleapis.com", "sqladmin.googleapis.com",
    "compute.googleapis.com", "file.googleapis.com", "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com", "artifactregistry.googleapis.com",
    "logging.googleapis.com", "monitoring.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}
data "google_project" "current" {}

resource "google_artifact_registry_repository" "moodle" {
  location      = var.region
  repository_id = "${var.project_name}-containers"
  format        = "DOCKER"
  description   = "Imágenes de Moodle construidas desde el fork en GitHub"
  # Conserva las 10 imágenes más recientes y borra las no etiquetadas antiguas.
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions { keep_count = 10 }
  }
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"
    }
  }
  depends_on = [google_project_service.apis]
}

# Identidad de ejecución de Moodle (web, instalación y cron).
resource "google_service_account" "runtime" {
  account_id = "${var.project_name}-runtime"
  depends_on = [google_project_service.apis]
}
resource "google_project_iam_member" "sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# Contraseñas generadas por Terraform y entregadas a Cloud Run desde Secret Manager.
resource "random_password" "db" {
  length  = 24
  special = false
}
resource "random_password" "admin" {
  length           = 20
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
  override_special = "!#%*-_"
}
resource "google_secret_manager_secret" "password" {
  for_each  = toset(["db", "admin"])
  secret_id = "${var.project_name}-${each.key}-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}
resource "google_secret_manager_secret_version" "db" {
  secret      = google_secret_manager_secret.password["db"].id
  secret_data = random_password.db.result
}
resource "google_secret_manager_secret_version" "admin" {
  secret      = google_secret_manager_secret.password["admin"].id
  secret_data = random_password.admin.result
}
resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each  = google_secret_manager_secret.password
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

module "networking" {
  source       = "./modules/networking"
  project_name = var.project_name
  region       = var.region
  zone         = var.zone
  labels       = local.labels
  depends_on   = [google_project_service.apis]
}
module "database" {
  source       = "./modules/database"
  project_name = var.project_name
  region       = var.region
  tier         = var.db_tier
  db_name      = var.db_name
  db_username  = var.db_username
  db_password  = random_password.db.result
  labels       = local.labels
  depends_on   = [google_project_service.apis]
}
module "cloudrun" {
  source          = "./modules/cloudrun"
  project_name    = var.project_name
  project_id      = var.project_id
  region          = var.region
  image           = var.container_image
  service_account = google_service_account.runtime.email
  network         = module.networking.network_name
  subnetwork      = module.networking.subnetwork_name
  nfs_server      = module.networking.nfs_server
  sql_connection  = module.database.connection_name
  labels          = local.labels
  cron_schedule   = var.cron_schedule
  environment = {
    MOODLE_WWWROOT        = local.moodle_url
    MOODLE_DB_NAME        = var.db_name
    MOODLE_DB_USER        = var.db_username
    MOODLE_ADMIN_USER     = var.admin_username
    MOODLE_ADMIN_EMAIL    = var.admin_email
    MOODLE_SITE_NAME      = var.site_name
    MOODLE_SITE_SHORTNAME = var.site_shortname
  }
  db_secret     = google_secret_manager_secret.password["db"].secret_id
  db_version    = google_secret_manager_secret_version.db.version
  admin_secret  = google_secret_manager_secret.password["admin"].secret_id
  admin_version = google_secret_manager_secret_version.admin.version
  enable_web    = var.site_ready
  enable_cron   = var.site_ready
  depends_on    = [module.database, google_project_iam_member.sql, google_secret_manager_secret_iam_member.runtime]
}
