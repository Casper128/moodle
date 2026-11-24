output "moodle_url" { value = local.moodle_url }
output "image_repository" { value = local.image_repository }
output "deployed_image" { value = var.container_image }
output "install_job" { value = "${var.project_name}-install" }
output "cloud_sql_instance" { value = module.database.connection_name }
output "workload_identity_provider" { value = google_iam_workload_identity_pool_provider.github.name }
output "terraform_service_account" { value = google_service_account.ci["terraform"].email }
output "builder_service_account" { value = google_service_account.ci["builder"].email }
output "monitoring_dashboard" {
  value = "https://console.cloud.google.com/monitoring/dashboards/builder/${element(split("/", google_monitoring_dashboard.moodle.id), 3)}?project=${var.project_id}"
}
