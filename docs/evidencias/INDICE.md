# Índice de evidencias

Todas las capturas son reales. «Navegador»: Chrome headless sobre la página pública. «Terminal»: salida real de comandos, guardada en `logs/` y renderizada como imagen. «Usuario»: tomada por el responsable con su sesión.

| Archivo | Fecha | Requisito | Tipo | Qué demuestra |
|---|---|---|---|---|
| [01-repositorio-original.png](01-repositorio-original.png) | 24-nov-2026 | Fork | Navegador | Repositorio original moodle/moodle en GitHub. |
| [02b-fork-github-web.png](02b-fork-github-web.png) | 24-nov-2026 | Fork | Navegador | Fork Casper128/moodle («forked from moodle/moodle») en la rama actividad6, con docker/, docs/ e infrastructure/terraform. |
| [02-fork-github.png](02-fork-github.png) | 24-nov-2026 | Fork | Terminal | Relación fork/upstream, remotos origin y upstream, ramas e historial de commits. |
| [03-estructura-proyecto.png](03-estructura-proyecto.png) | 24-nov-2026 | Fork | Terminal | Estructura del repositorio: código de Moodle, Dockerfile, Terraform, workflows y documentación. |
| [04-dockerfile.png](04-dockerfile.png) | 24-nov-2026 | Contenedores | Terminal | Dockerfile multi-etapa con imágenes base fijadas por digest. |
| [05-docker-build.png](05-docker-build.png) | 24-nov-2026 | Contenedores | Terminal | Construcción local de la imagen desde el código del fork (Composer + Apache/PHP 8.3). |
| [05f-pruebas-locales.png](05f-pruebas-locales.png) | 24-nov-2026 | Contenedores | Terminal | Prueba local: login, creación de curso, reinicio de contenedores, persistencia en MySQL y cron. |
| [05d-moodle-local-login.png](05d-moodle-local-login.png) | 24-nov-2026 | Contenedores | Navegador | Moodle ejecutándose en el contenedor local (puerto 8088). |
| [05e-moodle-local-dashboard.png](05e-moodle-local-dashboard.png) | 24-nov-2026 | Contenedores | Navegador | Dashboard del administrador en la prueba local. |
| [11-imagen-publicada.png](11-imagen-publicada.png) | 24-nov-2026 | Artifact Registry | Terminal | Publicación inicial en Artifact Registry con etiqueta = commit SHA y su digest. |
| [06-terraform-init.png](06-terraform-init.png) | 24-nov-2026 | IaC | Terminal | terraform init con backend remoto GCS. |
| [07-terraform-validate.png](07-terraform-validate.png) | 24-nov-2026 | IaC | Terminal | terraform fmt/validate y versiones del estado remoto en el bucket versionado. |
| [08-terraform-plan.png](08-terraform-plan.png) | 24-nov-2026 | IaC | Terminal | Resumen del plan de arranque: 45 a crear, 5 a modificar, 2 a reemplazar. |
| [09-terraform-apply.png](09-terraform-apply.png) | 24-nov-2026 | IaC | Terminal | terraform apply del plan revisado (incluye el único error, corregido después). |
| [12-cloud-sql.png](12-cloud-sql.png) | 24-nov-2026 | BD gestionada | Terminal | Cloud SQL MySQL 8.4: configuración no sensible, bases, usuarios y copias de seguridad. |
| [13-pipeline-iac-pr.png](13-pipeline-iac-pr.png) | 24-nov-2026 | CI/CD IaC | Navegador | PR #1 con el plan de Terraform comentado automáticamente por el pipeline. |
| [14-pipeline-terraform-plan.png](14-pipeline-terraform-plan.png) | 24-nov-2026 | CI/CD IaC | Navegador | Ejecución del pipeline en el PR: validar y planificar correcto; apply omitido. |
| [15a-pipeline-esperando-aprobacion.png](15a-pipeline-esperando-aprobacion.png) | 24-nov-2026 | CI/CD IaC | Navegador | Tras el merge, el job de apply queda esperando la aprobación del entorno produccion. |
| [15b-aprobacion-entorno.png](15b-aprobacion-entorno.png) | 24-nov-2026 | CI/CD IaC | Usuario | Aprobación del despliegue por el responsable y apply completado. |
| [15-pipeline-terraform-apply.png](15-pipeline-terraform-apply.png) | 24-nov-2026 | CI/CD IaC | Navegador | Ejecución completa: plan, apply y verificación. |
| [15c-cambio-verificado-gcp.png](15c-cambio-verificado-gcp.png) | 24-nov-2026 | CI/CD IaC | Terminal | Cambio verificado en GCP: etiqueta entrega=actividad-6, acceso público, cron activo y plan sin deriva. |
| [16-pipeline-aplicacion.png](16-pipeline-aplicacion.png) | 24-nov-2026 | CI/CD aplicación | Navegador | Pipeline de aplicación: validaciones, build, push a Artifact Registry y PR de despliegue. |
| [10-artifact-registry.png](10-artifact-registry.png) | 24-nov-2026 | Artifact Registry | Terminal | Trazabilidad: commit c8aa208f → imagen moodle:c8aa208f… y su digest. |
| [16b-pr-despliegue-imagen.png](16b-pr-despliegue-imagen.png) | 24-nov-2026 | CI/CD aplicación | Navegador | PR #3 creado por el pipeline: cambia container_image en deploy.auto.tfvars. |
| [16c-pipeline-despliegue-imagen.png](16c-pipeline-despliegue-imagen.png) | 24-nov-2026 | CI/CD aplicación | Navegador | Pipeline de Terraform que despliega la nueva imagen tras la aprobación. |
| [17-servicio-gcp.png](17-servicio-gcp.png) | 24-nov-2026 | Despliegue | Terminal | Cloud Run: imagen, recursos, secretos por referencia y volúmenes NFS y Cloud SQL. |
| [18-moodle-url-publica.png](18-moodle-url-publica.png) | 24-nov-2026 | Despliegue | Navegador | URL pública de Moodle en Cloud Run (HTTPS). |
| [19-moodle-login.png](19-moodle-login.png) | 24-nov-2026 | Despliegue | Navegador | Página de inicio de sesión. |
| [20-moodle-dashboard.png](20-moodle-dashboard.png) | 24-nov-2026 | Despliegue | Navegador | Dashboard tras iniciar sesión. |
| [21-moodle-cursos.png](21-moodle-cursos.png) | 24-nov-2026 | Despliegue | Navegador | Curso de prueba «Introducción a DevOps en GCP» creado en Moodle. |
| [21c-moodle-archivo-subido.png](21c-moodle-archivo-subido.png) | 24-nov-2026 | Persistencia | Navegador | Archivo subido a Archivos privados (almacenado en Filestore). |
| [21b-moodle-cursos-tras-redespliegue.png](21b-moodle-cursos-tras-redespliegue.png) | 24-nov-2026 | Persistencia | Navegador | El curso persiste tras desplegar la revisión 00003 con otra imagen. |
| [21d-moodle-archivo-tras-redespliegue.png](21d-moodle-archivo-tras-redespliegue.png) | 24-nov-2026 | Persistencia | Navegador | El archivo persiste tras el redespliegue. |
| [20b-moodle-curso-apariencia.png](20b-moodle-curso-apariencia.png) | 24-nov-2026 | Diseño visual | Navegador | Apariencia institucional aplicada con ajustes forzados del tema Boost. |
| [22b-trafico-controlado.png](22b-trafico-controlado.png) | 24-nov-2026 | Observabilidad | Terminal | Tráfico controlado: 120 solicitudes (90 × 200, 30 × 404). |
| [22-cloud-logging.png](22-cloud-logging.png) | 24-nov-2026 | Observabilidad | Terminal | Cloud Logging: solicitudes HTTP, stderr del contenedor y eventos de revisiones. |
| [23-cloud-monitoring-metricas.png](23-cloud-monitoring-metricas.png) | 24-nov-2026 | Observabilidad | Terminal | Métricas reales de Cloud Run, Cloud SQL y uptime check desde la API de Monitoring. |
| [24-cron-moodle.png](24-cron-moodle.png) | 24-nov-2026 | Observabilidad | Terminal | Ejecuciones del cron de Moodle (Cloud Scheduler → Cloud Run job). |
| [26-politicas-alertas-incidente.png](26-politicas-alertas-incidente.png) | 24-nov-2026 | Observabilidad | Terminal | Políticas de alerta, uptime check e incidente real abierto y cerrado automáticamente. |
| [27-verificacion-final.png](27-verificacion-final.png) | 24-nov-2026 | Verificación | Terminal | Plan final sin cambios y outputs de Terraform. |
| 10b-consola-artifact-registry.png | — | Artifact Registry | Usuario | Pendiente: captura manual (ver abajo) |
| 12b-consola-cloud-sql.png | — | BD gestionada | Usuario | Pendiente: captura manual (ver abajo) |
| 17b-consola-cloud-run.png | — | Despliegue | Usuario | Pendiente: captura manual (ver abajo) |
| 22c-consola-logs-explorer.png | — | Observabilidad | Usuario | Pendiente: captura manual (ver abajo) |
| 23b-consola-dashboard.png | — | Observabilidad | Usuario | Pendiente: captura manual (ver abajo) |
| 24b-consola-metricas-cloud-sql.png | — | Observabilidad | Usuario | Pendiente: captura manual (ver abajo) |
| 25-consola-uptime-check.png | — | Observabilidad | Usuario | Pendiente: captura manual (ver abajo) |
| 26b-consola-politicas-alertas.png | — | Observabilidad | Usuario | Pendiente: captura manual (ver abajo) |

## Capturas manuales de la consola de GCP

Requieren tu sesión. Guárdalas con el nombre indicado y vuelve a generar el informe.

| Archivo | Ruta en la consola |
|---|---|
| 10b-consola-artifact-registry.png | Artifact Registry → moodle-sql-containers → moodle |
| 12b-consola-cloud-sql.png | SQL → moodle-sql-mysql → Información general |
| 17b-consola-cloud-run.png | Cloud Run → moodle-sql-web → Revisiones |
| 22c-consola-logs-explorer.png | Logging → Explorador de registros, consulta `resource.labels.service_name="moodle-sql-web"` |
| 23b-consola-dashboard.png | Monitoring → Paneles → «Moodle en GCP» |
| 24b-consola-metricas-cloud-sql.png | SQL → moodle-sql-mysql → Supervisión |
| 25-consola-uptime-check.png | Monitoring → Verificaciones de tiempo de actividad → «Moodle login» |
| 26b-consola-politicas-alertas.png | Monitoring → Alertas (políticas e incidente cerrado) |
