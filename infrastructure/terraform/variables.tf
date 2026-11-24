variable "project_id" {
  type        = string
  description = "Proyecto GCP existente con facturación"
}
variable "project_name" {
  type        = string
  default     = "moodle-sql"
  description = "Prefijo de los recursos (se conserva el de la versión B ya desplegada)"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,18}[a-z0-9]$", var.project_name))
    error_message = "Usa de 2 a 20 caracteres: minúsculas, números y guiones."
  }
}
variable "region" {
  type    = string
  default = "us-central1"
}
variable "zone" {
  type    = string
  default = "us-central1-a"
}
variable "labels" {
  type        = map(string)
  default     = {}
  description = "Etiquetas adicionales aplicadas a todos los recursos"
}

variable "container_image" {
  type        = string
  description = "Imagen inmutable de Moodle en Artifact Registry (etiqueta = commit SHA)"
}
variable "site_ready" {
  type        = bool
  default     = false
  description = "Publica la web y activa cron después de ejecutar el job de instalación"
}
variable "cron_schedule" {
  type        = string
  default     = "*/15 * * * *"
  description = "Frecuencia del cron de Moodle (cada 15 min para limitar costes)"
}

variable "admin_username" {
  type    = string
  default = "admin"
}
variable "admin_email" {
  type        = string
  sensitive   = true
  description = "Correo del administrador de Moodle (TF_VAR_admin_email)"
  validation {
    condition     = can(regex("^[^@ ]+@[^@ ]+[.][^@ ]+$", var.admin_email))
    error_message = "Introduce un correo válido."
  }
}
variable "alert_email" {
  type        = string
  sensitive   = true
  description = "Correo que recibe las alertas de Cloud Monitoring (TF_VAR_alert_email)"
}
variable "site_name" {
  type    = string
  default = "Aula virtual Moodle"
}
variable "site_shortname" {
  type    = string
  default = "Moodle"
}

variable "db_tier" {
  type        = string
  default     = "db-f1-micro"
  description = "Tipo de máquina de Cloud SQL (núcleo compartido para la demostración)"
}
variable "db_name" {
  type    = string
  default = "moodle"
}
variable "db_username" {
  type    = string
  default = "moodleuser"
}

variable "github_repository" {
  type        = string
  default     = "Casper128/moodle"
  description = "Repositorio autorizado a usar Workload Identity Federation"
}
variable "state_bucket" {
  type        = string
  description = "Bucket GCS del estado remoto (creado en el arranque inicial)"
}
