# GitHub Actions se autentica con Workload Identity Federation (OIDC): sin claves JSON.
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.apis]
}
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  # Solo los tokens emitidos para este repositorio pueden intercambiarse.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

# terraform: plan/apply de la infraestructura. builder: solo publica imágenes.
resource "google_service_account" "ci" {
  for_each     = toset(["terraform", "builder"])
  account_id   = "gh-${each.key}"
  display_name = "GitHub Actions (${each.key})"
}
resource "google_service_account_iam_member" "wif" {
  for_each           = google_service_account.ci
  service_account_id = each.value.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# Roles necesarios para administrar exactamente los servicios de este Terraform.
resource "google_project_iam_member" "terraform" {
  for_each = toset([
    "roles/run.admin", "roles/cloudsql.admin", "roles/file.editor",
    "roles/compute.networkAdmin", "roles/artifactregistry.admin",
    "roles/secretmanager.admin", "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser", "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin", "roles/monitoring.admin",
    "roles/logging.configWriter", "roles/cloudscheduler.admin",
    "roles/iam.workloadIdentityPoolAdmin",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.ci["terraform"].email}"
}
resource "google_storage_bucket_iam_member" "state" {
  bucket = var.state_bucket
  role   = "roles/storage.admin" # limitado a este bucket: estado y su propia política IAM
  member = "serviceAccount:${google_service_account.ci["terraform"].email}"
}
resource "google_artifact_registry_repository_iam_member" "builder" {
  location   = google_artifact_registry_repository.moodle.location
  repository = google_artifact_registry_repository.moodle.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.ci["builder"].email}"
}
