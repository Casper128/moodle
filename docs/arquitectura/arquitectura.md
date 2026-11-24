# Arquitectura

## Componentes

```mermaid
flowchart LR
  dev[Desarrollador] -->|commit / PR| gh[(GitHub<br/>Casper128/moodle<br/>rama actividad6)]
  gh --> appwf[application.yml<br/>build + push]
  gh --> tfwf[terraform.yml<br/>fmt · validate · plan · apply]
  appwf -->|OIDC / WIF<br/>gh-builder| ar[(Artifact Registry<br/>moodle-sql-containers<br/>moodle:COMMIT_SHA)]
  appwf -->|PR deploy.auto.tfvars| gh
  tfwf -->|OIDC / WIF<br/>gh-terraform| tfstate[(GCS<br/>estado Terraform<br/>versionado)]
  tfwf -->|apply| gcp

  subgraph gcp[Google Cloud · us-central1]
    run[Cloud Run<br/>moodle-sql-web<br/>máx. 1 instancia]
    jobs[Cloud Run jobs<br/>install · cron]
    sched[Cloud Scheduler<br/>cada 15 min] --> jobs
    sql[(Cloud SQL MySQL 8.4<br/>moodle-sql-mysql<br/>db-f1-micro)]
    fs[(Filestore BASIC_HDD<br/>moodledata · NFS)]
    sm[Secret Manager<br/>db · admin]
    mon[Cloud Logging<br/>Cloud Monitoring<br/>uptime · alertas · dashboard]
    run -->|socket Cloud SQL| sql
    jobs --> sql
    run -->|VPC directa<br/>moodle-sql-managed| fs
    jobs --> fs
    sm -.->|variables secretas| run
    sm -.-> jobs
    run -.-> mon
    sql -.-> mon
  end
  ar -->|imagen inmutable| run
  user[Usuario] -->|HTTPS| run
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
