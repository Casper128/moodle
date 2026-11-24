# Seguimiento — Actividad 6 (IaC · CI/CD · Observabilidad, opción B)

Entrega: 27-nov-2026. Proyecto GCP `project-8e56ba89-c5a4-43c4-aa6` · región `us-central1`.
Moodle: https://moodle-sql-web-264423911779.us-central1.run.app · Fork: https://github.com/Casper128/moodle

## Estado por fase (verificado el 24-nov-2026)

| Fase | Estado | Evidencia |
|---|---|---|
| 1. Auditoría | Hecha | Tabla inferior · `logs/02-limpieza-recursos.log` |
| 2. Fork | Hecho: `Casper128/moodle`, rama `actividad6` (por defecto, protegida) | 01–03 |
| 3. Arquitectura | Cloud Run + Cloud SQL + Filestore (elegida por el responsable) | `docs/arquitectura/` |
| 4. Contenerización | Verificada en local y en Cloud Run | 04, 05* |
| 5. Artifact Registry | Imágenes `ad14cb81…` y `c8aa208f…` con digest | 10, 11 |
| 6. Terraform | Estado en GCS; 67 elementos; plan final sin cambios | 06–09, 27 |
| 7. Cloud SQL | MySQL 8.4 conectada; persistencia probada | 12, 21b, 21d |
| 8. CI/CD IaC | PR #1 → plan → aprobación → apply → cambio visible en GCP | 13–15c |
| 9. CI/CD aplicación | PR #2 → imagen → PR #3 → apply aprobado → revisión 00003 | 16–16c |
| 10. Despliegue | URL pública, login, curso, archivo y cron verificados | 17–21d |
| 11. Observabilidad | Logs, métricas, uptime, 3 alertas, dashboard; incidente real | 22–26 |
| 12. Diseño visual | Color institucional en el tema Boost, sin tocar el núcleo | 20b |
| 13. Evidencias | 48 capturas reales (8 de consola GCP) e índice | `evidencias/INDICE.md` |
| 14. Informe | Word y PDF (53 páginas, 47 figuras) | `entregable/` |
| 15. Presentación y guion | 12 diapositivas y guion con preguntas | `entregable/` |

## Retirada de la infraestructura (24-nov-2026)

A petición del responsable, tras completar las evidencias, se eliminó toda la infraestructura para detener la facturación:

1. Se desactivó la protección contra borrado de Cloud SQL y Filestore (apply local de 2 cambios).
2. `terraform plan -destroy` revisado (66 recursos) y aplicado: Cloud Run, jobs, Scheduler, Cloud SQL (incluida la base antigua `moodledb`), Filestore, Secret Manager, Artifact Registry con sus imágenes, monitorización, WIF y cuentas de servicio.
3. La subred quedó retenida por una IP interna de Cloud Run que Google libera de forma diferida. Mientras tanto, el responsable desvinculó la facturación del proyecto, lo que impide borrar recursos de Compute.
4. Se borró el bucket del estado y se eliminó el proyecto completo (`gcloud projects delete`, estado `DELETE_REQUESTED`). Es recuperable hasta 30 días con `gcloud projects undelete project-8e56ba89-c5a4-43c4-aa6`; después, GCP lo elimina definitivamente.

Log: `evidencias/logs/28-terraform-destroy.log`. La URL de Moodle ya no responde. Para recrear la solución: crear el bucket del estado, `terraform init/plan/apply` y ejecutar el job de instalación (README); los datos de la demostración no se conservaron, por decisión del responsable.

## Pendientes reales

- Completar en la portada del informe y en la presentación: institución, asignatura, docente e integrantes.

## Auditoría inicial (23-nov-2026)

| Elemento | Hallazgo | Acción |
|---|---|---|
| Repositorio | Carpeta sin Git; `gh` no instalado | `gh` instalado; fork creado y rama `actividad6` |
| Terraform | Estado local de `version-b/relacional` desactualizado | Migrado a GCS; recursos recreados |
| Cloud SQL `moodle-sql-mysql` | Detenida | Encendida y reutilizada; base nueva `moodle`; `moodledb` conservada |
| Redis `moodle-sql-sessions` | Activo, fuera de Terraform | Eliminado (autorizado) |
| VM `moodle-sql-demo` + disco | Detenida | Eliminada (autorizado) |
| Marketplace `moodle-1` | Restos: firewall, bucket, cuenta de servicio | Eliminados (autorizado) |
| Secreto `moodle-sql-redis-password` | Huérfano | Eliminado |

Nota: el estado local de `version-b/relacional/terraform.tfstate` quedó obsoleto. No ejecutes Terraform desde esa carpeta; el estado vigente está en `gs://project-8e56ba89-c5a4-43c4-aa6-tfstate/moodle/version-b`.
