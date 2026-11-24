# Seguimiento — Actividad 6 (IaC · CI/CD · Observabilidad, opción B)

Entrega: 27-nov-2026. Proyecto GCP: `project-8e56ba89-c5a4-43c4-aa6` · región `us-central1`.

## Auditoría inicial (23-nov-2026)

| Elemento | Hallazgo | Acción |
|---|---|---|
| Repositorio | Carpeta sin Git; `gh` no instalado | Se instaló `gh`; clon de `moodle/moodle` `MOODLE_502_STABLE` (5.2.5+) en `version-b/moodle-gcp` |
| Terraform | Estado local de `version-b/relacional` (3-nov) desactualizado: Cloud Run, jobs y Filestore ya no existían | Estado migrado a GCS; los recursos inexistentes se recrearán |
| Cloud SQL `moodle-sql-mysql` | MySQL 8.4, db-f1-micro, detenida | Encendida (autorizado). Se reutiliza; base nueva `moodle`, `moodledb` se conserva fuera del estado |
| Redis `moodle-sql-sessions` | Activo, fuera de Terraform, ≈ US$1,2/día | Eliminado (autorizado) |
| VM `moodle-sql-demo` + disco 20 GB | Detenida; demo del 5-nov | Pendiente de confirmar eliminación |
| Infra Manager `moodle-1` | Marketplace suspendido; solo quedan 2 reglas de firewall | Pendiente de limpieza |
| Artifact Registry `moodle-sql-containers` | 2 etiquetas antiguas | Se reutiliza (política de limpieza en Terraform) |
| Secret Manager | `db`, `admin` (en estado) y `redis` (huérfano) | `redis` pendiente de eliminar |

## Fases

| Fase | Estado | Evidencia |
|---|---|---|
| 1. Auditoría | Hecha | Esta tabla |
| 2. Fork | Bloqueada: falta `gh auth login` del usuario | — |
| 3. Arquitectura | Elegida por el usuario: Cloud Run + Cloud SQL + Filestore | `docs/arquitectura/` |
| 4. Contenerización | Verificada en local | `docs/evidencias/logs/05*.log` |
| 5. Artifact Registry | Pendiente | — |
| 6. Terraform (backend GCS) | Código validado; estado migrado; plan pendiente de aprobación | — |
| 7. Cloud SQL | Encendida, pendiente de apply | — |
| 8. CI/CD IaC | Workflow escrito; requiere fork + WIF | `.github/workflows/terraform.yml` |
| 9. CI/CD aplicación | Workflow escrito | `.github/workflows/application.yml` |
| 10. Despliegue | Pendiente | — |
| 11. Observabilidad | Código Terraform escrito | `infrastructure/terraform/monitoring.tf` |
| 13–15. Evidencias, informe, presentación | Pendiente | — |

## Problemas reales encontrados

1. Moodle 5.2 desde Git no incluye `vendor/`: se añadió una etapa `composer install --no-dev` con `composer.lock`.
2. `$CFG->sslproxy = true` rompía el acceso HTTP local: ahora depende de que `wwwroot` sea HTTPS.
3. Primera prueba local: host de BD incorrecto y puerto 8080 ocupado por otra aplicación; se usó 8088.
