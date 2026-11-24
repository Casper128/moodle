# Moodle en Google Cloud — IaC, CI/CD y observabilidad

Fork de [moodle/moodle](https://github.com/moodle/moodle) (rama base `MOODLE_502_STABLE`, Moodle 5.2.5+) preparado para la Actividad 6 — opción B: CI/CD de infraestructura como código. El README original de Moodle está en [README.moodle.md](README.moodle.md).

- **URL:** https://moodle-sql-web-264423911779.us-central1.run.app
- **Rama de trabajo:** `actividad6` (por defecto en este fork). `main` sigue a upstream.
- **Proyecto GCP:** `project-8e56ba89-c5a4-43c4-aa6`, región `us-central1`.

## Arquitectura

Cloud Run ejecuta la imagen de Moodle construida desde este repositorio. Cloud SQL (MySQL 8.4) guarda la base de datos y Filestore (NFS) guarda `moodledata`. Secret Manager entrega las contraseñas, Cloud Scheduler lanza el cron y Cloud Monitoring vigila disponibilidad, errores y recursos. Diagramas y decisiones: [docs/arquitectura/arquitectura.md](docs/arquitectura/arquitectura.md).

```text
Dockerfile, docker/           Imagen: Composer (vendor) + Apache/PHP 8.3
infrastructure/terraform/     Terraform (estado en GCS) y módulos cloudrun, database, networking
.github/workflows/            terraform.yml (IaC) y application.yml (imagen)
docs/                         Arquitectura, evidencias, informe y presentación
```

## Requisitos

Docker, Terraform ≥ 1.7, Google Cloud CLI y GitHub CLI. Cuenta GCP con facturación y permisos de propietario para el arranque inicial.

## Prueba local

```sh
docker buildx build --platform linux/amd64 -t moodle-gcp:local .
docker network create moodle-local
docker run -d --name moodle-mysql --network moodle-local \
  -e MYSQL_RANDOM_ROOT_PASSWORD=1 -e MYSQL_DATABASE=moodle -e MYSQL_USER=moodle \
  -e MYSQL_PASSWORD=<clave> mysql:8.4 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
# local.env: MOODLE_DB_HOST=moodle-mysql, MOODLE_DB_NAME/USER/PASSWORD, MOODLE_WWWROOT=http://localhost:8088,
#            MOODLE_ADMIN_USER/PASSWORD/EMAIL, MOODLE_SITE_NAME, MOODLE_SITE_SHORTNAME
docker run --rm --network moodle-local --env-file local.env -v moodle-data:/mnt/moodle moodle-gcp:local install
docker run -d --network moodle-local --env-file local.env -v moodle-data:/mnt/moodle -p 8088:8080 moodle-gcp:local
```

## Imagen y Artifact Registry

`application.yml` construye la imagen en cada push a `actividad6` que cambie código, la publica como `us-central1-docker.pkg.dev/<proyecto>/moodle-sql-containers/moodle:<commit SHA>` y abre un PR que actualiza `container_image` en `infrastructure/terraform/deploy.auto.tfvars`. La etiqueta es inmutable por commit; no se usa `latest`.

## Terraform

Arranque inicial (una vez, con credenciales de propietario):

```sh
gcloud storage buckets create gs://<proyecto>-tfstate --location us-central1 \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://<proyecto>-tfstate --versioning
cd infrastructure/terraform
export TF_VAR_admin_email=... TF_VAR_alert_email=...
terraform init -backend-config="bucket=<proyecto>-tfstate"
terraform plan -out=tfplan && terraform apply tfplan
gcloud run jobs execute moodle-sql-install --region us-central1 --wait   # solo sobre una base vacía
```

Después se cambia `site_ready = true` en `deploy.auto.tfvars` mediante PR. Las contraseñas las genera Terraform y se guardan en Secret Manager; el estado de Terraform las contiene, por eso el bucket es privado y versionado.

## CI/CD

| Workflow | Disparador | Qué hace |
|---|---|---|
| `terraform.yml` | PR o push a `actividad6` en `infrastructure/terraform/**`; manual | `fmt -check`, `init`, `validate`, `plan` (comentado en el PR). En `actividad6`: aprobación del entorno `produccion`, `apply`, verificación HTTP y plan de deriva |
| `application.yml` | Push de código a `actividad6`; manual | Validaciones, build, push a Artifact Registry, verificación del digest y PR de despliegue |

Autenticación con Workload Identity Federation (`github-actions/github`), restringido a este repositorio; sin claves JSON. Variables del repositorio: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_TF_SA`, `GCP_BUILDER_SA`, `TF_STATE_BUCKET`. Secretos: `MOODLE_ADMIN_EMAIL`, `ALERT_EMAIL`.

## Observabilidad

`infrastructure/terraform/monitoring.tf` crea el uptime check de `/login/index.php`, alertas por indisponibilidad, por errores 5xx y por CPU de Cloud SQL, la métrica de logs `moodle_php_errors` y el dashboard «Moodle en GCP». Los logs de Apache/PHP salen por stdout/stderr hacia Cloud Logging.

## Documentación

- Seguimiento: [docs/PROGRESS.md](docs/PROGRESS.md)
- Evidencias: [docs/evidencias/](docs/evidencias/)
- Informe y presentación: [docs/entregable/](docs/entregable/)

## Limitaciones conocidas

- Una sola instancia de Cloud Run; no hay alta disponibilidad.
- Filestore BASIC_HDD reserva 1 TiB (≈ US$5,4/día): es el mayor coste de la solución.
- Sin dominio propio ni SMTP; subidas limitadas a 24 MiB.
- Las actualizaciones de esquema de Moodle no son automáticas (`admin/cli/upgrade.php` en un job).
