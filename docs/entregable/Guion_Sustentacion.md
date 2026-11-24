# Guion de sustentación — Moodle en GCP (Actividad 6, opción B)

Duración sugerida: 10–12 minutos más preguntas. Entre paréntesis, la diapositiva de apoyo.

## 1. Qué problema resuelve (diap. 1–2)

Una institución necesita un aula virtual Moodle disponible en Internet, con datos persistentes y cambios controlados. El proyecto lo resuelve con servicios gestionados de GCP. Toda la infraestructura se define como código y solo cambia mediante un pipeline con revisión y aprobación, de modo que cada cambio es reproducible, auditable y reversible.

## 2. Qué es IaC y cómo se aplicó (diap. 7)

La infraestructura como código describe los recursos en archivos versionados, en lugar de crearlos a mano en la consola. Usamos Terraform:

- Los módulos `cloudrun`, `database` y `networking`, más `cicd.tf` y `monitoring.tf`, definen 67 elementos.
- El estado vive en un bucket GCS versionado y privado, con bloqueo, de modo que el equipo y el pipeline comparten la misma visión.
- Al auditar encontramos deriva: el estado decía que existían Cloud Run y Filestore, pero ya no estaban. Lo corregimos migrando el estado y recreando los recursos con Terraform.
- Comprobación final: `terraform plan` responde «No changes».

## 3. CI/CD de aplicación frente a CI/CD de infraestructura (diap. 8)

- **Aplicación (`application.yml`):** construye y publica un artefacto, la imagen Docker. No modifica la infraestructura.
- **Infraestructura (`terraform.yml`):** cambia recursos reales de la nube. Lo esencial es revisar el plan antes de aplicar, aprobar, serializar los cambios sobre el estado y verificar que no queda deriva.
- Ambos pipelines se conectan sin pisarse: el de aplicación abre un PR que cambia `container_image` y es Terraform quien despliega. Así existe una única fuente de verdad.

## 4. Por qué la opción B

El mayor riesgo operativo está en los cambios de infraestructura (red, base de datos, permisos), no solo en el código. La opción B obliga a tratarlos con la misma disciplina que el software: PR, revisión automática (fmt, validate), plan visible, aprobación humana y registro de cada ejecución en GitHub.

## 5. Cómo se construye la imagen (diap. 5)

- Dockerfile multi-etapa sobre el fork Casper128/moodle (Moodle 5.2.5+).
- Etapa 1: `composer install --no-dev` con `composer.lock`. Moodle desde Git no trae `vendor/`, y lo descubrimos en la prueba.
- Etapa 2: Ubuntu 24.04 con Apache y PHP 8.3, imágenes base fijadas por digest y el commit registrado en la etiqueta OCI `revision`.
- Antes de publicarla la probamos en local con MySQL 8.4: instalación, login, curso, reinicio y cron.

## 6. Cómo llega a Artifact Registry (diap. 6)

1. Push a `actividad6` → GitHub Actions obtiene un token OIDC.
2. Workload Identity Federation lo intercambia por credenciales temporales de `gh-builder`, que solo puede escribir en el repositorio.
3. Build y push con la etiqueta igual al SHA del commit, seguido de la verificación del digest.
4. Ejemplo real: commit `c8aa208f` → `moodle:c8aa208f…` → `sha256:d9534289…`.

## 7. Cómo se despliega Moodle (diap. 9)

- Terraform define el servicio Cloud Run `moodle-sql-web`: 1 vCPU, 1 GiB, máximo 1 instancia y HTTPS gestionado.
- La instalación corre una sola vez en el job `install`; la variable `site_ready = true` publica la web y activa el cron.
- El cron lo lanza Cloud Scheduler cada 15 minutos como un Cloud Run job.
- Cada imagen nueva crea una revisión; la actual es la `00003`.

## 8. Cómo se garantiza la persistencia

- **Base de datos:** Cloud SQL MySQL 8.4 con copias automáticas y binlog.
- **Archivos (`moodledata`):** Filestore por NFS. Descartamos el disco de Cloud Run, que es efímero, y Cloud Storage FUSE, que no ofrece los bloqueos ni los renombrados atómicos que Moodle utiliza.
- **Prueba:** creamos un curso y subimos un archivo; tras desplegar otra imagen (revisión 00003), ambos siguen ahí.

## 9. Cómo se gestionan los secretos

- Terraform genera las contraseñas (`random_password`) y las guarda en Secret Manager.
- Cloud Run las recibe por referencia: no están en la imagen, en el repositorio ni en los logs.
- El pipeline no recibe contraseñas; solo los correos, como secretos de GitHub y variables `sensitive`.
- El estado de Terraform sí las contiene, por eso el bucket es privado.

## 10. Cómo se detectan fallos (diap. 10)

- **Logs:** solicitudes HTTP con código y latencia, stderr de Apache y PHP, ejecuciones del cron y auditoría.
- **Métricas:** solicitudes por clase, latencia p95, CPU, memoria, instancias, CPU y conexiones de Cloud SQL, en un dashboard creado con Terraform.
- **Uptime check:** GET HTTPS a `/login/index.php` cada 5 minutos desde 6 regiones.
- **Alertas:** indisponibilidad, más de 5 errores 5xx en 5 minutos y CPU de Cloud SQL por encima del 80 %.
- **Ejemplo real:** mientras el sitio era privado durante la instalación, la alerta abrió un incidente a las 05:18 y lo cerró sola a las 05:43, al publicarse.

## 11. Cómo se reproduciría la infraestructura

1. Crear el bucket del estado (comando en el README).
2. `terraform init -backend-config="bucket=..."` → `plan` → `apply`.
3. Ejecutar el job `install` una vez.
4. Fusionar un PR con `site_ready = true`.

En otro proyecto basta con cambiar `project_id`, `state_bucket` y `github_repository`.

## 12. Costos (diap. 11)

- Total estimado ≈ US$6/día. Filestore BASIC_HDD supone ≈ US$5,4/día porque reserva 1 TiB como mínimo; Cloud SQL `db-f1-micro`, ≈ US$0,4/día; el resto queda casi en el nivel gratuito.
- Ahorros aplicados: se eliminaron un Redis huérfano (≈ US$36/mes), una VM y los restos del despliegue Marketplace, y el cron pasó a cada 15 minutos.
- El gasto real se consulta en Facturación → Informes de la consola de GCP.

## Preguntas probables del profesor

**¿Por qué Cloud Run y no una VM o GKE?**
Cloud Run gestiona HTTPS, escalado, revisiones y métricas sin administrar servidores. GKE sería excesivo para una instancia. La VM costaba menos (≈ US$1/día), pero requería gestionar el sistema operativo y los certificados; se eligió el modelo gestionado y se asumió el coste de Filestore.

**¿Qué pasa si dos personas ejecutan el pipeline a la vez?**
El grupo de concurrencia `terraform-state` encola las ejecuciones y el backend GCS bloquea el estado. Nunca hay dos `apply` simultáneos.

**¿Cómo se evita que alguien aplique sin revisar?**
La rama `actividad6` exige PR, el plan se publica en el PR y el job de apply pide aprobación del entorno `produccion`. El apply solo corre desde `actividad6`.

**¿Dónde están las claves de la cuenta de servicio de GitHub?**
No existen. Se usa OIDC con Workload Identity Federation, restringido por la condición `assertion.repository == "Casper128/moodle"`, y los tokens duran como máximo una hora.

**¿Por qué Redis no está, si el enunciado menciona bases de datos en memoria?**
El enunciado dice «relacionales y/o en memoria». Con una sola instancia, las sesiones en base de datos funcionan y Redis no aportaba beneficio; además estaba fuera de Terraform y costaba unos US$36/mes. Se documentó cómo añadirlo si se escala a varias instancias.

**¿El pipeline modificó algo real?**
Sí. El PR #1 aplicó «2 added, 9 changed, 0 destroyed»: la etiqueta `entrega=actividad-6` aparece en Cloud Run, Cloud SQL y Filestore, y Moodle pasó a ser público. El PR #3 desplegó la imagen `c8aa208f`.

**¿Qué problemas reales tuvieron?**
Deriva del estado; `vendor/` ausente en el código Git de Moodle; un filtro de Logging con sintaxis incorrecta (`resource.label` en lugar de `resource.labels`); deriva perpetua del dashboard; que GitHub Actions no tenía permiso para crear PR; y que los PR creados por el bot no disparan workflows (se resolvió con `workflow_dispatch`).

**¿Cómo se haría un rollback?**
Con un PR que devuelva `container_image` al SHA anterior: el pipeline lo despliega con plan y aprobación. Las imágenes anteriores siguen en Artifact Registry y el estado está versionado en GCS.

**¿Cómo se actualiza Moodle de versión?**
Se integra la rama estable nueva desde `upstream`, el pipeline construye la imagen y se ejecuta `admin/cli/upgrade.php` en un job antes de dirigir tráfico. Esta actualización no está automatizada; es una limitación documentada.
