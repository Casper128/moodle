# Estado remoto en GCS con versionado y bloqueo nativo.
# El bucket se pasa en `terraform init -backend-config="bucket=<PROYECTO>-tfstate"`.
terraform {
  backend "gcs" {
    prefix = "moodle/version-b"
  }
}
