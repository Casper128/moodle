# Arquitectura

## Componentes

```mermaid
flowchart TB
  dev([Desarrollador]) -->|commit / PR| gh[(GitHub · Casper128/moodle<br/>rama actividad6)]
  user([Usuario]) -->|HTTPS| run

  subgraph cicd[GitHub Actions · OIDC / Workload Identity Federation]
    direction LR
    appwf[application.yml<br/>build · push · PR de despliegue]
    tfwf[terraform.yml<br/>fmt · validate · plan · aprobación · apply]
  end
  gh --> appwf
  gh --> tfwf
  appwf -->|gh-builder| ar[(Artifact Registry<br/>moodle:COMMIT_SHA)]
  tfwf -->|gh-terraform| tfstate[(GCS · estado Terraform<br/>versionado)]

  subgraph gcp[Google Cloud · us-central1 · gestionado por Terraform]
    direction LR
    run[Cloud Run · moodle-sql-web<br/>máx. 1 instancia]
    jobs[Cloud Run jobs<br/>install · cron]
    sched[Cloud Scheduler<br/>cada 15 min]
    sm[Secret Manager]
    sql[(Cloud SQL MySQL 8.4<br/>db-f1-micro)]
    fs[(Filestore BASIC_HDD<br/>moodledata · NFS)]
    mon[Logging · Monitoring<br/>uptime · alertas · dashboard]
    sched --> jobs
    run -->|socket Cloud SQL| sql
    jobs --> sql
    run -->|VPC directa| fs
    jobs --> fs
    sm -.-> run
    run -.-> mon
  end
  ar -->|imagen inmutable| run
  tfwf -->|apply| run
```

## Decisiones

| Necesidad de Moodle | Decisión | Motivo |
|---|---|---|
| `moodledata` persistente y compartido | Filestore (NFS) montado en Cloud Run y en los jobs | El disco de Cloud Run es efímero; Cloud Storage FUSE no ofrece el bloqueo ni los renombrados atómicos que Moodle espera |
| Base de datos | Cloud SQL MySQL 8.4 existente, base `moodle` nueva | Se reutiliza la instancia; la base antigua `moodledb` se conserva sin tocar |
| Sesiones y bloqueos | Base de datos (`\core\session\database`, `db_record_lock_factory`) | NFS sin bloqueo fiable; una instancia no justifica Redis (se eliminó por coste) |
| Escalado | `max_instance_count = 1`, `cpu_idle = true` | Demostración académica; evita concurrencia de cachés en NFS y reduce coste |
| Cron | Cloud Run job lanzado por Cloud Scheduler cada 15 min | Cada minuto costaría ≈ 15 veces más en ejecuciones de job |
| Instalación | Job `install` una única vez; `site_ready = true` publica la web | La instalación no queda expuesta en la web (`preventwebinstall`) |
| HTTPS | URL `*.run.app` con certificado gestionado | Sin dominio propio ni balanceador |
| Secretos | Contraseñas generadas por Terraform (`random_password`) en Secret Manager | El pipeline no necesita recibir contraseñas |
| Autenticación CI | Workload Identity Federation limitado a `Casper128/moodle` | Sin claves JSON permanentes |

## Pipelines

```mermaid
sequenceDiagram
  autonumber
  participant D as Desarrollador
  participant G as GitHub
  participant T as terraform.yml
  participant A as application.yml
  participant R as Artifact Registry
  participant C as GCP (Cloud Run, SQL…)
  D->>G: PR que modifica infrastructure/terraform
  G->>T: pull_request
  T->>T: fmt -check · init · validate · plan
  T-->>G: comentario con el plan
  D->>G: merge en actividad6
  G->>T: push
  T->>T: plan
  T-->>D: espera aprobación (entorno produccion)
  D->>T: aprueba
  T->>C: apply + verificación HTTP + plan sin deriva
  D->>G: push de código de la aplicación
  G->>A: push
  A->>R: build y push moodle:SHA
  A->>G: PR deploy/SHA (cambia container_image)
  A->>T: workflow_dispatch (plan del PR)
```

La imagen desplegada solo la cambia Terraform: el pipeline de aplicación publica la imagen y propone el cambio por PR. Ambos flujos quedan separados y el grupo de concurrencia `terraform-state` serializa los `apply`.
