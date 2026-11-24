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

## Pendientes reales

- Completar en la portada del informe y en la presentación: institución, asignatura, docente e integrantes.
- Coste: Filestore ≈ US$5,4/día. Tras la evaluación, desactivar `deletion_protection_enabled` mediante un PR y retirar los recursos de forma controlada.

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
