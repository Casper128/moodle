variable "project_name" {
  type = string
}
variable "region" {
  type = string
}
variable "zone" {
  type = string
}
variable "labels" {
  type = map(string)
}

resource "google_compute_network" "moodle" {
  name                    = "${var.project_name}-managed"
  auto_create_subnetworks = false
}
resource "google_compute_subnetwork" "moodle" {
  name                     = "${var.project_name}-run"
  region                   = var.region
  network                  = google_compute_network.moodle.id
  ip_cidr_range            = "10.20.0.0/24"
  private_ip_google_access = true
}
resource "google_filestore_instance" "moodle" {
  name                        = "${var.project_name}-files"
  location                    = var.zone
  tier                        = "BASIC_HDD"
  labels                      = var.labels
  deletion_protection_enabled = true
  file_shares {
    name        = "moodle"
    capacity_gb = 1024
    nfs_export_options {
      ip_ranges   = [google_compute_subnetwork.moodle.ip_cidr_range]
      access_mode = "READ_WRITE"
      squash_mode = "NO_ROOT_SQUASH"
    }
  }
  networks {
    network = google_compute_network.moodle.name
    modes   = ["MODE_IPV4"]
  }
}

output "network_id" { value = google_compute_network.moodle.id }
output "network_name" { value = google_compute_network.moodle.name }
output "subnetwork_name" { value = google_compute_subnetwork.moodle.name }
output "nfs_server" { value = google_filestore_instance.moodle.networks[0].ip_addresses[0] }
