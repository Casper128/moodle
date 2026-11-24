# Valores no sensibles versionados. Los cambios llegan por Pull Request y los aplica
# el pipeline de Terraform. Correos: variables TF_VAR_admin_email y TF_VAR_alert_email.
project_id   = "project-8e56ba89-c5a4-43c4-aa6"
state_bucket = "project-8e56ba89-c5a4-43c4-aa6-tfstate"

# Imagen inmutable publicada por el pipeline de aplicación (etiqueta = commit SHA).
container_image = "us-central1-docker.pkg.dev/project-8e56ba89-c5a4-43c4-aa6/moodle-sql-containers/moodle:c8aa208fe713f76b10774c35612690971fc20411"

site_ready = true

# Cambio de demostración del pipeline IaC: etiqueta visible en todos los recursos.
labels = { entrega = "actividad-6" }
