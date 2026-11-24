// Genera docs/entregable/Informe_Final_Moodle_GCP.docx y docs/evidencias/INDICE.md
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, PageBreak, Footer, Header, PageNumber,
  TableOfContents, LevelFormat, ExternalHyperlink, PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
} = require('docx');

const ROOT = process.argv[2];
const EV = path.join(ROOT, 'docs/evidencias');
const OUT = path.join(ROOT, 'docs/entregable/Informe_Final_Moodle_GCP.docx');
const evid = require('./evidencias.js');

const FONT = 'Calibri', MONO = 'Courier New', ACCENT = '1F4E79';
const CONTENT_W = 9026; // A4 con márgenes de 2,54 cm (DXA)
let fig = 0, tab = 0;

const t = (s, o = {}) => new TextRun({ text: s, font: FONT, size: 22, ...o });
// Texto con `código` y **negrita** en línea.
function rich(s, base = {}) {
  const out = [];
  s.split(/(`[^`]+`|\*\*[^*]+\*\*)/).filter(Boolean).forEach(part => {
    if (part.startsWith('`')) out.push(new TextRun({ text: part.slice(1, -1), font: MONO, size: 19, ...base }));
    else if (part.startsWith('**')) out.push(t(part.slice(2, -2), { bold: true, ...base }));
    else out.push(t(part, base));
  });
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: rich(s), spacing: { after: 120, line: 276 }, alignment: AlignmentType.JUSTIFIED, ...o });
const HEADS = [];
const PAGES = fs.existsSync('pages.json') ? JSON.parse(fs.readFileSync('pages.json')) : {};
const H1 = s => (HEADS.push([1, s]), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: s })], pageBreakBefore: true }));
const H2 = s => (HEADS.push([2, s]), new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s })] }));
const B = s => new Paragraph({ children: rich(s), numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 } });
const N = s => new Paragraph({ children: rich(s), numbering: { reference: 'num', level: 0 }, spacing: { after: 60 } });
const CODE = lines => lines.map((l, i) => new Paragraph({
  children: [new TextRun({ text: l || ' ', font: MONO, size: 17 })],
  shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' },
  spacing: { after: 0, before: i === 0 ? 80 : 0 },
  indent: { left: 120, right: 120 },
  keepLines: true, keepNext: i < lines.length - 1,
})).concat([new Paragraph({ spacing: { after: 120 }, children: [] })]);

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Figura: imagen ajustada al ancho útil (máx. 6,25") y alto máx. 8"; pie numerado debajo.
function FIG(file, caption, maxH = 760) {
  const f = path.isAbsolute(file) ? file : path.join(EV, file);
  if (!fs.existsSync(f)) return [];
  const { w, h } = pngSize(f);
  let W = 600, H = Math.round(h * W / w);
  if (H > maxH) { H = maxH; W = Math.round(w * H / h); }
  fig += 1;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(f), transformation: { width: W, height: H },
        altText: { title: `Figura ${fig}`, description: caption, name: path.basename(f) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [t(`Figura ${fig}. `, { bold: true, size: 18, color: '444444' }), ...rich(caption, { size: 18, color: '444444', italics: true })] }),
  ];
}
const EVF = name => { const e = evid.find(x => x[0] === name); return e ? FIG(name, e[3] + (e[1] === 'term' ? ' (salida real de terminal)' : '')) : []; };

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
function TABLE(head, rows, widths, caption) {
  const total = widths.reduce((a, b) => a + b, 0);
  const ws = widths.map(x => Math.round(x * CONTENT_W / total));
  ws[ws.length - 1] += CONTENT_W - ws.reduce((a, b) => a + b, 0);
  const cell = (s, i, hdr) => new TableCell({
    width: { size: ws[i], type: WidthType.DXA },
    borders: { top: border, bottom: border, left: border, right: border },
    shading: hdr ? { type: ShadingType.CLEAR, fill: ACCENT } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: rich(String(s), hdr ? { bold: true, color: 'FFFFFF', size: 19 } : { size: 19 }) })],
  });
  tab += 1;
  return [
    new Paragraph({ keepNext: true, spacing: { before: 120, after: 60 }, children: [t(`Tabla ${tab}. `, { bold: true, size: 18, color: '444444' }), t(caption, { size: 18, italics: true, color: '444444' })] }),
    new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: ws,
      rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }),
        ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))] }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

// ---------- Datos reales del despliegue ----------
const URL = 'https://moodle-sql-web-264423911779.us-central1.run.app';
const FORK = 'https://github.com/Casper128/moodle';
const PROJ = 'project-8e56ba89-c5a4-43c4-aa6';
const IMG = `us-central1-docker.pkg.dev/${PROJ}/moodle-sql-containers/moodle`;
const RUNS = {
  plan: `${FORK}/actions/runs/45333019513`, apply: `${FORK}/actions/runs/45334356798`,
  app: `${FORK}/actions/runs/45335606138`, deployPlan: `${FORK}/actions/runs/45336071002`, deployApply: `${FORK}/actions/runs/45336246521`,
};

const body = [];
const add = (...xs) => xs.flat().forEach(x => body.push(x));

// ---------- Portada ----------
const cover = [
  new Paragraph({ spacing: { before: 2200 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'Implementación de Moodle en Google Cloud Platform mediante infraestructura como código, CI/CD y observabilidad', font: FONT, size: 40, bold: true, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1400 }, children: [t('Actividad 6 — IaC — CI-CD — Observabilidad — Opción B', { size: 28, color: '404040' })] }),
  ...[['Institución', '[Pendiente]'], ['Asignatura', '[Pendiente]'], ['Actividad', 'Actividad 6 — IaC, CI/CD y observabilidad (opción B)'], ['Docente', '[Pendiente]'], ['Integrantes', '[Pendiente]'], ['Fecha de entrega', '27 de noviembre de 2026']]
    .map(([k, v]) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [t(k + ': ', { bold: true, size: 24 }), t(v, { size: 24 })] })),
];

// ---------- Índice ----------
const toc = [
  new Paragraph({ pageBreakBefore: true, spacing: { after: 200 }, children: [new TextRun({ text: 'Tabla de contenido', font: FONT, size: 32, bold: true, color: ACCENT })] }),
];
function buildToc() {
  return HEADS.map(([lvl, s]) => new Paragraph({
    spacing: { after: lvl === 1 ? 60 : 20 }, indent: { left: lvl === 1 ? 0 : 400 },
    children: [t(s, { bold: lvl === 1, size: lvl === 1 ? 22 : 20 }),
      new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.DOT })], font: FONT }),
      t(String(PAGES[s] || '0'), { size: lvl === 1 ? 22 : 20 })],
  }));
}

// 1
add(H1('1. Introducción'),
  P('Este informe documenta la implementación de Moodle 5.2, una plataforma de e-learning de código abierto, sobre Google Cloud Platform (GCP). La infraestructura se define con Terraform y se modifica únicamente mediante un pipeline de GitHub Actions con revisión y aprobación, lo que corresponde a la **opción B** de la actividad: CI/CD de infraestructura como código.'),
  P('El trabajo partió de la «versión B» de una actividad anterior, que ya contenía Terraform modular y una imagen Docker de Moodle. La auditoría inicial mostró que esa infraestructura había divergido del estado de Terraform; por eso se reconstruyó sobre un fork propio de Moodle, con estado remoto, pipelines y observabilidad. Todos los resultados que se presentan se ejecutaron y verificaron realmente en el proyecto GCP `' + PROJ + '`.'));

// 2
add(H1('2. Objetivos'), H2('2.1 Objetivo general'),
  P('Desplegar Moodle en GCP con servicios contenerizados y bases de datos gestionadas, administrados mediante infraestructura como código con un pipeline CI/CD verificable y observabilidad operativa.'),
  H2('2.2 Objetivos específicos'),
  N('Construir la imagen Docker de Moodle desde el código de un fork propio y publicarla en Artifact Registry con etiquetas inmutables por commit.'),
  N('Definir con Terraform, con estado remoto en GCS, la ejecución en Cloud Run, la base de datos Cloud SQL, el almacenamiento Filestore, los secretos, la identidad y la monitorización.'),
  N('Implementar un pipeline de IaC que valide y planifique en cada Pull Request y aplique los cambios aprobados en la rama principal.'),
  N('Implementar un pipeline complementario de aplicación coordinado con Terraform.'),
  N('Configurar logs, métricas, comprobación de disponibilidad y alertas, y demostrarlos con datos reales.'));

// 3
add(H1('3. Requisitos de la actividad'),
  TABLE(['Requisito del docente', 'Solución implementada'], [
    ['Infraestructura como código (Terraform o Pulumi)', 'Terraform 1.16 con proveedor google ~> 7.0, módulos `cloudrun`, `database` y `networking`, y estado remoto en GCS versionado.'],
    ['Servicios contenerizados', 'Imagen propia de Moodle en Cloud Run (servicio web) y Cloud Run jobs (instalación y cron).'],
    ['Bases de datos gestionadas relacionales y/o en memoria', 'Cloud SQL para MySQL 8.4 (relacional). Memorystore Redis se retiró por coste: con una sola instancia no aporta valor (sección 6).'],
    ['CI/CD — opción B: IaC en la nube con GitHub', '`terraform.yml`: fmt, validate y plan en cada PR; apply con aprobación del entorno `produccion`. Autenticación con Workload Identity Federation.'],
    ['Observabilidad', 'Cloud Logging, dashboard de Cloud Monitoring, uptime check, tres políticas de alerta y una métrica basada en logs, todo con Terraform.'],
    ['Evidencias y conversatorio', 'Capturas y logs reales en `docs/evidencias/`, presentación y guion en `docs/entregable/`.'],
  ], [1, 2], 'Relación entre requisitos y solución.'));

// 4
add(H1('4. Tecnologías utilizadas'),
  TABLE(['Tecnología', 'Uso en el proyecto'], [
    ['Moodle 5.2.5+ (MOODLE_502_STABLE)', 'Aplicación de e-learning, construida desde el fork Casper128/moodle.'],
    ['Docker / Buildx', 'Imagen multi-etapa: Composer para `vendor/` y Ubuntu 24.04 con Apache y PHP 8.3.'],
    ['GitHub y GitHub Actions', 'Repositorio, Pull Requests, protección de rama, entornos con aprobación y pipelines.'],
    ['Terraform', 'Definición y ciclo de vida de toda la infraestructura GCP.'],
    ['Artifact Registry', 'Registro privado de imágenes con política de limpieza.'],
    ['Cloud Run (servicio y jobs)', 'Ejecución del contenedor web, del instalador y del cron.'],
    ['Cloud SQL para MySQL 8.4', 'Base de datos gestionada de Moodle, con copias de seguridad y binlog.'],
    ['Filestore BASIC_HDD', 'Sistema de archivos NFS persistente para `moodledata`.'],
    ['Secret Manager', 'Contraseñas de base de datos y de administrador.'],
    ['Cloud Scheduler', 'Disparo del cron de Moodle cada 15 minutos.'],
    ['IAM y Workload Identity Federation', 'Cuentas de servicio con roles acotados y autenticación OIDC sin claves.'],
    ['Cloud Logging y Cloud Monitoring', 'Logs, métricas, dashboard, uptime check y alertas.'],
    ['Cloud Storage', 'Estado remoto de Terraform con versionado y bloqueo.'],
  ], [1, 2], 'Tecnologías empleadas realmente.'));

// 5
add(H1('5. Arquitectura de solución'),
  P('La figura siguiente muestra los componentes desplegados y los flujos de entrega. El usuario accede por HTTPS a la URL de Cloud Run. El contenedor se conecta a Cloud SQL mediante el socket del conector integrado y monta Filestore por NFS a través de salida directa a la VPC `moodle-sql-managed`.'),
  FIG(path.join(ROOT, 'docs/arquitectura/arquitectura.png'), 'Arquitectura implementada en GCP y flujos de CI/CD.', 700),
  H2('5.1 Decisiones de diseño'),
  TABLE(['Necesidad de Moodle', 'Decisión', 'Justificación'], [
    ['moodledata persistente y compartido', 'Filestore NFS montado en Cloud Run y en los jobs', 'El disco de Cloud Run es efímero. Cloud Storage FUSE no garantiza el bloqueo de archivos ni los renombrados atómicos que Moodle utiliza.'],
    ['Base de datos', 'Cloud SQL MySQL 8.4 existente; base nueva `moodle`', 'Se reutilizó la instancia. La base antigua `moodledb` se conservó intacta.'],
    ['Sesiones y bloqueos', 'Base de datos (`\\core\\session\\database`, `db_record_lock_factory`)', 'NFS no ofrece bloqueos fiables; con una sola instancia Redis no aporta beneficios.'],
    ['Escalado', 'Máximo 1 instancia, CPU solo durante solicitudes', 'Demostración académica: evita conflictos de caché en NFS y limita el coste.'],
    ['Tareas programadas', 'Cloud Run job lanzado por Cloud Scheduler cada 15 min', 'Ejecutarlo cada minuto multiplicaría por 15 el tiempo facturable del job.'],
    ['Instalación', 'Job `install` único; `site_ready` publica la web', 'La instalación web queda deshabilitada (`preventwebinstall`).'],
    ['HTTPS', 'URL `*.run.app` con certificado gestionado', 'No requiere dominio propio ni balanceador.'],
  ], [1.1, 1.3, 2], 'Decisiones de arquitectura.'),
  P('Se evaluó también una VM de Compute Engine con Docker, alternativa que ya existía en el proyecto con un coste estimado cercano a US$1/día. El responsable eligió Cloud Run con Filestore por ser la arquitectura original de la versión B, por ofrecer HTTPS y métricas nativas y por usar únicamente servicios gestionados, asumiendo su mayor coste (sección 17).'));

// 6
add(H1('6. Estado inicial del proyecto'),
  P('La auditoría del 23 de noviembre de 2026 inspeccionó el código local, el estado de Terraform y los recursos reales del proyecto GCP:'),
  TABLE(['Elemento', 'Hallazgo', 'Acción'], [
    ['Código', 'Carpeta sin Git; dos variantes (`relacional`, `relacional-redis`) con Terraform y Docker', 'Se reutilizaron los módulos y la imagen de `relacional` en un fork de Moodle'],
    ['Estado Terraform', 'Estado local del 3-nov que incluía Cloud Run, jobs y Filestore ya inexistentes', 'Migrado a GCS; los recursos ausentes se recrearon con Terraform'],
    ['Cloud SQL `moodle-sql-mysql`', 'MySQL 8.4, db-f1-micro, detenida', 'Encendida y reutilizada'],
    ['Memorystore `moodle-sql-sessions`', 'Activo, fuera de Terraform, ≈ US$1,2/día', 'Eliminado con autorización'],
    ['VM `moodle-sql-demo` y disco', 'Detenida, de una prueba anterior', 'Eliminada con autorización'],
    ['Despliegue Marketplace `moodle-1`', 'Suspendido; quedaban reglas de firewall, bucket y cuenta de servicio', 'Eliminado con autorización'],
    ['Artifact Registry', 'Repositorio `moodle-sql-containers` con etiquetas antiguas', 'Reutilizado e importado al flujo con política de limpieza'],
  ], [1, 1.6, 1.4], 'Hallazgos de la auditoría inicial.'),
  P('Sobre la versión B se realizaron estos cambios: imagen construida desde el código fuente en lugar de descargar Moodle; contraseñas generadas por Terraform; Redis retirado; cron cada 15 minutos; etiquetas, sondas y límites en Cloud Run; nuevos archivos `backend.tf`, `cicd.tf`, `monitoring.tf` y `outputs.tf`; y los dos pipelines.'));

// 7
add(H1('7. Fork y repositorio'),
  P(`Se creó el fork ${FORK} de moodle/moodle con GitHub CLI. Se clonó la rama \`MOODLE_502_STABLE\` (Moodle 5.2.5+, commit \`1ba79d273\`) y se creó la rama de trabajo \`actividad6\`, configurada como rama por defecto del fork. La rama \`main\` conserva la relación con upstream. Los remotos quedaron como \`origin\` (fork) y \`upstream\` (moodle/moodle).`),
  P('Se retiraron los workflows de upstream de `.github/workflows`, que ejecutan la batería completa de pruebas de Moodle. El README original se conservó como `README.moodle.md`. La rama `actividad6` está protegida: exige Pull Request y prohíbe force-push y eliminación.'),
  ...EVF('01-repositorio-original.png'), ...EVF('02b-fork-github-web.png'), ...EVF('02-fork-github.png'), ...EVF('03-estructura-proyecto.png'));

// 8
add(H1('8. Contenerización de Moodle'),
  P('Moodle 5.2 obtenido desde Git no incluye las librerías de terceros (`vendor/`), así que el Dockerfile tiene dos etapas. La primera ejecuta `composer install --no-dev` sobre `composer.lock` para garantizar versiones exactas. La segunda copia el código del repositorio sobre Ubuntu 24.04 con Apache y PHP 8.3 precompilados. Ambas imágenes base se fijan por digest y la etiqueta OCI `revision` registra el commit.'),
  P('El contenedor escucha en el puerto 8080 y escribe sus logs en stdout/stderr. El entrypoint admite tres modos: `web`, `install` y `cron`. `config.php` lee la configuración de variables de entorno y falla si falta alguna obligatoria. Las contraseñas llegan como variables inyectadas desde Secret Manager; nunca forman parte de la imagen ni de la línea de comandos.'),
  ...EVF('04-dockerfile.png'), ...EVF('05-docker-build.png'),
  P('Antes de publicar la imagen se probó en local con MySQL 8.4 en Docker. La prueba cubrió la instalación por CLI (40 s), la respuesta HTTP 200, el login real del administrador, la creación de un curso, el reinicio de ambos contenedores y la ejecución del cron. El curso se mantuvo tras los reinicios.'),
  ...EVF('05f-pruebas-locales.png'), ...EVF('05e-moodle-local-dashboard.png'));

// 9
add(H1('9. Artifact Registry'),
  P(`Las imágenes se publican en \`${IMG}\` con la etiqueta igual al SHA completo del commit; no se usa \`latest\`. El repositorio se gestiona con Terraform y aplica dos políticas de limpieza: conservar las 10 versiones más recientes y borrar las imágenes sin etiqueta con más de 7 días.`),
  TABLE(['Origen', 'Etiqueta (commit)', 'Digest'], [
    ['Arranque inicial (local)', '`ad14cb810a86…`', '`sha256:66d8f2c4eeaa…`'],
    ['Pipeline de aplicación', '`c8aa208fe713…`', '`sha256:d9534289c810…`'],
  ], [1.2, 1.4, 1.6], 'Imágenes publicadas y desplegadas.'),
  ...EVF('11-imagen-publicada.png'), ...EVF('10-artifact-registry.png'), ...EVF('10b-consola-artifact-registry.png'));

// 10
add(H1('10. Infraestructura como código'),
  P('La configuración vive en `infrastructure/terraform/`:'),
  TABLE(['Archivo', 'Contenido'], [
    ['`main.tf`', 'Proveedores, APIs, Artifact Registry, cuenta de ejecución, contraseñas aleatorias, Secret Manager y módulos.'],
    ['`backend.tf`', 'Backend GCS (`moodle/version-b`); el bucket se pasa en `terraform init`.'],
    ['`variables.tf` / `deploy.auto.tfvars`', 'Parámetros; los valores no sensibles (imagen, `site_ready`, etiquetas) se versionan.'],
    ['`cicd.tf`', 'Pool y proveedor de Workload Identity, cuentas `gh-terraform` y `gh-builder`, y sus roles.'],
    ['`monitoring.tf`', 'Canal de correo, uptime check, alertas, métrica basada en logs y dashboard.'],
    ['`outputs.tf`', 'URL, imagen desplegada, instancia SQL, proveedor WIF y enlace al dashboard.'],
    ['`modules/cloudrun`', 'Servicio web, jobs `install` y `cron`, Cloud Scheduler e IAM de invocación.'],
    ['`modules/database`', 'Instancia Cloud SQL, base `moodle` (utf8mb4) y usuario.'],
    ['`modules/networking`', 'VPC, subred `10.20.0.0/24` y Filestore.'],
  ], [1, 2.4], 'Organización de Terraform.'),
  P('El estado se guarda en el bucket `' + PROJ + '-tfstate`, que tiene versionado, acceso uniforme y prevención de acceso público. Como el estado contiene las contraseñas generadas, solo la cuenta del responsable y `gh-terraform` pueden leerlo. El estado previo se migró con `terraform init -migrate-state`. La base `moodledb` se retiró del estado con `terraform state rm` para conservarla sin que Terraform la reemplazara.'),
  ...CODE(['terraform init -migrate-state -backend-config="bucket=' + PROJ + '-tfstate"', 'terraform fmt -recursive && terraform validate', 'terraform plan -out=tfplan-bootstrap.tfplan      # 45 crear, 5 modificar, 2 reemplazar', 'terraform apply tfplan-bootstrap.tfplan            # tras la autorización del responsable', 'gcloud run jobs execute moodle-sql-install --region us-central1 --wait']),
  P('El plan inicial se revisó antes de aplicarlo. En Cloud SQL solo añadía etiquetas y reactivaba el autoaumento del disco, sin reinicio, y los únicos reemplazos eran las versiones de los secretos. El apply creó 44 recursos y falló en uno, la métrica de logs, por un error de sintaxis del filtro que se corrigió después a través del pipeline (sección 20).'),
  ...EVF('06-terraform-init.png'), ...EVF('07-terraform-validate.png'), ...EVF('08-terraform-plan.png'), ...EVF('09-terraform-apply.png'));

// 11
add(H1('11. Base de datos gestionada'),
  P('Cloud SQL para MySQL 8.4 (`moodle-sql-mysql`, edición Enterprise, `db-f1-micro`, 20 GB SSD con autoaumento) tiene activadas las copias de seguridad automáticas y el binlog. Moodle usa la base `moodle` con `utf8mb4_unicode_ci` y el usuario `moodleuser`, cuya contraseña de 24 caracteres genera Terraform y entrega Secret Manager.'),
  P('La instancia tiene IP pública sin redes autorizadas: no acepta conexiones directas desde Internet. Cloud Run se conecta mediante el conector de Cloud SQL (socket Unix en `/cloudsql`), autenticado con la cuenta `moodle-sql-runtime`, que tiene el rol `roles/cloudsql.client`.'),
  P('La conexión a Cloud SQL quedó demostrada de tres formas: el job de instalación creó el esquema en 25 min 49 s; las métricas muestran unas 6 conexiones activas; y el curso y el archivo de prueba siguieron disponibles tras desplegar otra revisión con una imagen distinta.'),
  ...EVF('12-cloud-sql.png'), ...EVF('12b-consola-cloud-sql.png'));

// 12
add(H1('12. CI/CD de infraestructura — Opción B'),
  P('El workflow `.github/workflows/terraform.yml` es el núcleo de la actividad. Solo se dispara con cambios en `infrastructure/terraform/**` o en el propio workflow, y está separado del pipeline de aplicación.'),
  FIG(path.join(ROOT, 'docs/arquitectura/pipeline-cicd.png'), 'Secuencia de los pipelines de infraestructura y aplicación.', 720),
  H2('12.1 Diseño'),
  TABLE(['Aspecto', 'Implementación'], [
    ['Eventos', '`pull_request` y `push` hacia `actividad6` en rutas de Terraform; `workflow_dispatch` manual.'],
    ['Autenticación', 'OIDC de GitHub → Workload Identity Federation (`github-actions/github`). La condición `assertion.repository == "Casper128/moodle"` restringe el pool a este repositorio. Se impersona `gh-terraform`; no existen claves JSON.'],
    ['Integración continua', 'Job «Validar y planificar»: checkout, Terraform 1.16.6, `fmt -check`, `init` (backend GCS), `validate` y `plan -detailed-exitcode`. El plan se publica en el resumen de la ejecución y como comentario del PR.'],
    ['Aprobación', 'El job «Aplicar» usa el entorno `produccion`, con revisor obligatorio y despliegue limitado a la rama `actividad6`.'],
    ['Despliegue', 'Tras la aprobación: `plan -out=tfplan`, `apply tfplan`, verificación de Cloud Run y HTTP, y un plan final que confirma la ausencia de deriva.'],
    ['Concurrencia', 'Grupo `terraform-state` sin cancelación: las ejecuciones se encolan y el backend GCS añade su bloqueo de estado.'],
    ['Datos sensibles', 'Las variables de correo están marcadas `sensitive`. El plan binario no se publica como artefacto, sino que se regenera dentro del job aprobado. Los correos se guardan como secretos de GitHub.'],
    ['Permisos mínimos', '`gh-terraform` tiene roles de administración solo de los servicios que gestiona y `storage.admin` limitado al bucket del estado. `gh-builder` solo puede escribir en el repositorio de Artifact Registry.'],
  ], [1, 3], 'Diseño del pipeline de IaC.'),
  H2('12.2 Demostración del flujo completo'),
  P('El cambio demostrado fue real y verificable. Se añadió la etiqueta `entrega = "actividad-6"` a todos los recursos, se publicó Moodle (`site_ready = true`) y se corrigieron la métrica de logs y la deriva del dashboard.'),
  TABLE(['Paso', 'Resultado'], [
    ['1. Modificar Terraform', 'Commit `1d8ca58c8` en la rama `iac/publicar-moodle-etiqueta` (`deploy.auto.tfvars`, `monitoring.tf`).'],
    ['2. Pull Request', `PR #1 (${FORK}/pull/1).`],
    ['3. Validación y plan', `Ejecución ${RUNS.plan}: fmt, validate y plan correctos; «Plan: 2 to add, 9 to change, 0 to destroy» comentado en el PR.`],
    ['4. Merge', 'El merge en `actividad6` dispara el pipeline por `push`.'],
    ['5. Aprobación', 'El job de apply queda en espera hasta que el responsable aprueba el entorno `produccion`.'],
    ['6. Apply', `Ejecución ${RUNS.apply}: «Apply complete! Resources: 2 added, 9 changed, 0 destroyed» y «No changes» en la verificación.`],
    ['7. Cambio en GCP', 'Etiqueta `entrega=actividad-6` visible en Cloud Run, Cloud SQL y Filestore; `allUsers` con `roles/run.invoker`; Cloud Scheduler `ENABLED`; HTTP 200.'],
  ], [1, 3], 'Evidencia paso a paso del pipeline de IaC.'),
  ...EVF('13-pipeline-iac-pr.png'), ...EVF('14-pipeline-terraform-plan.png'), ...EVF('15a-pipeline-esperando-aprobacion.png'),
  ...EVF('15b-aprobacion-entorno.png'), ...EVF('15-pipeline-terraform-apply.png'), ...EVF('15c-cambio-verificado-gcp.png'));

// 13
add(H1('13. CI/CD de aplicación'),
  P('El workflow `.github/workflows/application.yml` se dispara con cambios de código en `actividad6`; ignora `infrastructure/**`, `docs/**` y Markdown. Este pipeline no modifica Cloud Run: publica la imagen y propone su despliegue mediante un PR que actualiza `container_image`. Así Terraform sigue siendo la única fuente de verdad y los dos pipelines nunca modifican a la vez el mismo recurso.'),
  N('Validaciones: `php -l` de los archivos PHP, `sh -n` del entrypoint, JSON de Composer y `hadolint` del Dockerfile.'),
  N('Autenticación con WIF como `gh-builder` y login en Artifact Registry con un token de corta duración.'),
  N('Build con Buildx (caché de GitHub Actions) y push con la etiqueta igual al SHA del commit.'),
  N('Verificación del digest en Artifact Registry y registro en el resumen de la ejecución.'),
  N('Creación de la rama `deploy/<sha>` y del PR hacia `actividad6`, y lanzamiento del plan de Terraform con `workflow_dispatch`.'),
  P(`Trazabilidad demostrada: commit \`c8aa208f\` (PR #2: \`ServerName\` y apariencia) → ejecución ${RUNS.app} → imagen \`moodle:c8aa208f…\` (\`sha256:d9534289…\`) → PR #3 → plan ${RUNS.deployPlan} (3 recursos cambian de imagen) → aprobación → apply ${RUNS.deployApply} → revisión \`moodle-sql-web-00003-psx\`.`),
  ...EVF('16-pipeline-aplicacion.png'), ...EVF('16b-pr-despliegue-imagen.png'), ...EVF('16c-pipeline-despliegue-imagen.png'));

// 14
add(H1('14. Despliegue final'),
  P(`Moodle se ejecuta en Cloud Run en ${URL}, con HTTPS gestionado por Google.`),
  TABLE(['Parámetro', 'Valor'], [
    ['Servicio / revisión', '`moodle-sql-web` / `moodle-sql-web-00003-psx`'],
    ['Imagen', '`moodle:c8aa208fe713f76b10774c35612690971fc20411`'],
    ['Recursos', '1 vCPU, 1 GiB, CPU solo durante solicitudes, *startup CPU boost*, concurrencia 20'],
    ['Escalado', 'Mínimo 0, máximo 1 instancia'],
    ['Puerto / sondas', '8080; sonda de arranque TCP (12 × 5 s)'],
    ['Red', 'Salida directa a la VPC `moodle-sql-managed`, solo rangos privados'],
    ['Volúmenes', 'Filestore `/moodle` → `/mnt/moodle`; Cloud SQL → `/cloudsql`'],
    ['Secretos', '`MOODLE_DB_PASSWORD` ← `moodle-sql-db-password`; la contraseña de administrador solo llega al job `install`'],
    ['Cron', '`moodle-sql-cron`, Cloud Scheduler `*/15 * * * *`'],
    ['Acceso', 'Público (`allUsers` con `roles/run.invoker`), activado por `site_ready`'],
  ], [1, 2.6], 'Configuración no sensible del despliegue.'),
  P('Se probaron en la URL pública la página de inicio, el login del administrador, el dashboard, la creación del curso «Introducción a DevOps en GCP», la subida de un archivo a Archivos privados, la persistencia tras redesplegar y el cron. La apariencia institucional se aplicó mediante `forced_plugin_settings` del tema Boost (color de marca `#1F4E79` y borde de la barra de navegación), sin modificar el núcleo de Moodle; requirió purgar la caché del tema.'),
  ...EVF('17-servicio-gcp.png'), ...EVF('17b-consola-cloud-run.png'), ...EVF('18-moodle-url-publica.png'), ...EVF('20-moodle-dashboard.png'),
  ...EVF('21-moodle-cursos.png'), ...EVF('21c-moodle-archivo-subido.png'), ...EVF('21b-moodle-cursos-tras-redespliegue.png'),
  ...EVF('21d-moodle-archivo-tras-redespliegue.png'), ...EVF('20b-moodle-curso-apariencia.png'));

// 15
add(H1('15. Observabilidad'),
  TABLE(['Mecanismo', 'Configuración', 'Qué permite detectar'], [
    ['Cloud Logging', 'Logs de solicitudes de Cloud Run, stdout/stderr de Apache y PHP, ejecuciones de jobs y auditoría', 'Errores de la aplicación, rutas con 4xx/5xx, latencia por solicitud, fallos del cron y cambios de revisión'],
    ['Métrica de logs `moodle_php_errors`', 'Cuenta «PHP Fatal error / Warning / Parse error»', 'Regresiones de código tras un despliegue'],
    ['Dashboard «Moodle en GCP»', '8 gráficos: solicitudes por clase, latencia p95, CPU, memoria, instancias, CPU y conexiones de Cloud SQL, uptime', 'Saturación de recursos y degradación de rendimiento'],
    ['Uptime check «Moodle login»', 'GET HTTPS `/login/index.php` cada 5 min desde 6 regiones', 'Indisponibilidad vista desde Internet'],
    ['Alerta «Moodle no disponible»', 'Fallo del uptime en más de una región durante 10 min → correo', 'Caídas del servicio'],
    ['Alerta «Moodle errores HTTP 5xx»', 'Más de 5 respuestas 5xx en 5 min', 'Errores del servidor o de la base de datos'],
    ['Alerta «Cloud SQL CPU alta»', 'CPU > 80 % durante 10 min', 'Saturación de la base de datos'],
  ], [1.1, 1.6, 1.6], 'Mecanismos de observabilidad.'),
  H2('15.1 Resultados observados'),
  B('**Tráfico controlado:** 120 solicitudes secuenciales generaron 90 respuestas 200 y 30 respuestas 404, visibles en los logs con su latencia (≈ 0,11–0,12 s en el login y ≈ 0,014 s en los 404).'),
  B('**Cloud Run:** CPU p95 de 0,38 y memoria p95 de 0,14 durante la carga; latencia p95 de 4,36 s en el primer intervalo tras publicar el sitio (arranque en frío y cachés vacías), que bajó a 0,42–0,49 s en los siguientes.'),
  B('**Cloud SQL:** CPU media entre 0,11 y 0,19 y unas 6 conexiones.'),
  B('**Uptime e incidente real:** el uptime check falló entre 05:12 y 05:42 UTC, mientras el sitio era privado y se instalaba, y desde 05:52 alcanzó 1,0 en las 6 regiones. La alerta «Moodle no disponible» abrió un incidente a las 05:18:29 y lo cerró automáticamente a las 05:43:37, lo que confirma la cadena completa de detección y notificación.'),
  B('**Logs y despliegue:** el aviso de Apache AH00558 solo aparece en la revisión anterior; tras desplegar el cambio de `ServerName` dejó de registrarse.'),
  B('**Errores PHP:** la métrica `moodle_php_errors` no registró eventos en la ventana analizada.'),
  B('**Consola de Monitoring:** el uptime check muestra una disponibilidad del 93,461 % en 24 h, que incluye la media hora en que el sitio fue privado durante la instalación, y una latencia media de 459,669 ms. Las estadísticas de Cloud SQL indican un uso de CPU p99 del 38,6 % y del disco del 6,7 %.'),
  ...EVF('22b-trafico-controlado.png'), ...EVF('22-cloud-logging.png'), ...EVF('22c-consola-logs-explorer.png'), ...EVF('23-cloud-monitoring-metricas.png'),
  ...EVF('23b-consola-dashboard.png'), ...EVF('24b-consola-metricas-cloud-sql.png'), ...EVF('24-cron-moodle.png'), ...EVF('25-consola-uptime-check.png'),
  ...EVF('26-politicas-alertas-incidente.png'), ...EVF('26b-consola-politicas-alertas.png'));

// 16
add(H1('16. Seguridad'),
  B('**Sin secretos en el repositorio:** las contraseñas se generan con `random_password`, se guardan en Secret Manager y se inyectan por referencia. `.gitignore` excluye estados, planes y `terraform.tfvars`. Los logs de evidencia se revisaron para confirmar que no contienen contraseñas.'),
  B('**Estado protegido:** bucket privado y versionado; el acceso está limitado al propietario y a `gh-terraform`.'),
  B('**CI sin claves:** Workload Identity Federation con condición por repositorio; los tokens de Google duran como máximo una hora.'),
  B('**Mínimo privilegio:** `moodle-sql-runtime` solo tiene `cloudsql.client` y acceso a sus dos secretos; `gh-builder` solo escribe en un repositorio de Artifact Registry; `gh-terraform` tiene roles acotados a los servicios gestionados.'),
  B('**Controles de cambio:** rama protegida, PR obligatorio, plan revisable y aprobación humana antes de cada apply.'),
  B('**Red:** Cloud SQL sin redes autorizadas; Filestore solo exporta a la subred `10.20.0.0/24`; se eliminaron las reglas de firewall abiertas que no se usaban.'),
  B('**Exposición pública:** el repositorio es público por ser un fork. Por eso los correos se pasan como secretos de GitHub y variables `sensitive`, y se comprobó que no aparecen en los logs públicos de Actions.'));

// 17
add(H1('17. Costos'),
  P('Estimaciones con precios de lista de us-central1 en USD (la cuenta factura en COP). Durante la sesión no fue posible consultar el gasto real ni los créditos restantes desde la CLI: el gasto observado debe revisarse en Consola → Facturación → Informes y Créditos.'),
  TABLE(['Recurso', 'Configuración', 'Estimación'], [
    ['Filestore', 'BASIC_HDD, 1 TiB mínimo', '≈ US$5,4/día (≈ US$164/mes)'],
    ['Cloud SQL', 'db-f1-micro, 20 GB SSD, copias', '≈ US$0,4/día'],
    ['Cloud Run (servicio y jobs)', 'CPU solo por solicitud; cron 96 veces/día (≈ 4 min por ejecución)', 'Bajo; parcialmente cubierto por el nivel gratuito'],
    ['Cloud Scheduler', '1 job', 'Gratuito (3 jobs por cuenta)'],
    ['Artifact Registry', '≈ 0,5–1 GB', '< US$0,10/mes'],
    ['Secret Manager, GCS (estado), Monitoring', 'Pocas versiones y métricas', 'Despreciable / nivel gratuito'],
    ['Total aproximado', '', '≈ US$6/día (≈ US$42 hasta el 1-dic-2026)'],
  ], [1.2, 1.8, 1.4], 'Recursos facturables y estimación.'),
  P('Ahorros realizados: eliminación de Memorystore (≈ US$36/mes), de la VM con su disco y de los restos del despliegue Marketplace, y cron cada 15 min. Tras la evaluación, la mayor reducción posible es borrar Filestore; para hacerlo hay que desactivar `deletion_protection_enabled` y aplicar el cambio por el pipeline.'));

// 18
add(H1('18. Pruebas y resultados'),
  TABLE(['Prueba', 'Resultado esperado', 'Resultado obtenido', 'Estado', 'Evidencia'], [
    ['Build de imagen desde el fork', 'Imagen funcional', 'Build en 3 min 30 s; Moodle, vendor y PHP 8.3 presentes', 'OK', '05'],
    ['Instalación local', 'Esquema creado', '«Installation completed successfully» en 40 s', 'OK', '05f'],
    ['Persistencia local tras reinicio', 'Curso conservado', 'DEVOPS-101 presente tras `docker restart`', 'OK', '05f'],
    ['terraform validate / fmt', 'Sin errores', 'Success; fmt sin cambios', 'OK', '07'],
    ['Apply inicial', 'Recursos creados', '44 creados; 1 error de filtro corregido después', 'Parcial → OK', '09'],
    ['Job de instalación en Cloud Run', 'Esquema en Cloud SQL', 'Completado en 25 min 49 s', 'OK', '—'],
    ['Pipeline IaC en PR', 'fmt, validate y plan correctos', 'Correcto; plan comentado', 'OK', '13, 14'],
    ['Apply con aprobación', 'Cambio aplicado tras aprobar', '2 añadidos, 9 cambiados, 0 destruidos', 'OK', '15, 15b'],
    ['Cambio visible en GCP', 'Etiqueta en los recursos', '`entrega=actividad-6` en Run, SQL y Filestore', 'OK', '15c'],
    ['Pipeline de aplicación', 'Imagen publicada y PR de despliegue', 'Correcto en el 2.º intento (permiso de PR)', 'OK', '16'],
    ['Despliegue de nueva imagen', 'Nueva revisión', '`moodle-sql-web-00003-psx` con `c8aa208f`', 'OK', '16c, 17'],
    ['URL pública y login', 'HTTP 200 y dashboard', 'HTTP 200 (0,58 s); dashboard', 'OK', '18–20'],
    ['Crear curso', 'Curso visible', '«Introducción a DevOps en GCP» (id=2)', 'OK', '21'],
    ['Subir archivo', 'Archivo almacenado', '`evidencia-subida.txt` en Archivos privados', 'OK', '21c'],
    ['Persistencia tras redespliegue', 'Curso y archivo presentes', 'Ambos presentes en la revisión 00003', 'OK', '21b, 21d'],
    ['Cron', 'Ejecuciones correctas', '05:45 y 06:00 «Cron run completed correctly»', 'OK', '24'],
    ['Logs y métricas', 'Datos reales', 'Solicitudes, latencia, CPU, SQL y uptime', 'OK', '22, 23'],
    ['Alerta de indisponibilidad', 'Incidente y notificación', 'Abierto 05:18:29, cerrado 05:43:37', 'OK', '26'],
    ['Deriva final', 'Sin cambios', '`No changes`, código de salida 0', 'OK', '27'],
  ], [1.5, 1.2, 1.7, 0.6, 0.6], 'Pruebas realizadas.'));

// 19
add(H1('19. Matriz de cumplimiento'),
  TABLE(['Requisito', 'Implementación', 'Estado', 'Evidencia'], [
    ['Fork propio de Moodle', 'Casper128/moodle, rama actividad6', 'Cumplido', '01–03'],
    ['Imagen construida desde el repositorio', 'Dockerfile multi-etapa; pipeline de aplicación', 'Cumplido', '04, 05, 16'],
    ['Imagen en Artifact Registry', 'Etiquetas por SHA y digest', 'Cumplido', '10, 11'],
    ['Infraestructura con Terraform', '67 elementos en el estado remoto GCS', 'Cumplido', '06–09, 27'],
    ['Base de datos gestionada conectada', 'Cloud SQL MySQL 8.4', 'Cumplido', '12, 23'],
    ['Persistencia de Moodle', 'Filestore y Cloud SQL tras redespliegue', 'Cumplido', '21b, 21d'],
    ['Pipeline CI/CD de IaC (opción B)', 'terraform.yml con plan en PR y apply aprobado', 'Cumplido', '13–15c'],
    ['Pipeline de aplicación', 'application.yml', 'Cumplido', '16–16c'],
    ['Moodle funcionando en GCP', URL, 'Cumplido', '18–21'],
    ['Logs y métricas reales', 'Cloud Logging y Monitoring', 'Cumplido', '22–24'],
    ['Monitorización y alertas', 'Uptime, 3 alertas, dashboard', 'Cumplido', '26'],
    ['Capturas de la consola de GCP', '8 capturas con la sesión del usuario', evid.filter(e => e[1] === 'usuario' && e[0].includes('consola')).every(e => fs.existsSync(path.join(EV, e[0]))) ? 'Cumplido' : 'Pendiente del usuario', 'docs/evidencias/INDICE.md'],
    ['Documento, presentación y guion', 'docs/entregable/', 'Cumplido', '—'],
    ['Repositorio sin secretos', 'Revisión de logs y .gitignore', 'Cumplido', '—'],
  ], [1.4, 1.6, 0.8, 0.8], 'Matriz de cumplimiento.'));

// 20
add(H1('20. Problemas encontrados y soluciones'),
  TABLE(['Problema real', 'Causa', 'Solución'], [
    ['Estado Terraform desactualizado', 'Cambios hechos fuera del estado (Cloud Run y Filestore eliminados; VM y Redis creados)', 'Auditoría, limpieza autorizada, migración a GCS y recreación con Terraform'],
    ['`vendor/` ausente en el código Git de Moodle 5.2', 'Las librerías se gestionan con Composer', 'Etapa `composer install --no-dev` con `composer.lock`'],
    ['Error 500 en local («Must use https in wwwroot»)', '`sslproxy` forzado', '`sslproxy` activo solo si `wwwroot` es HTTPS'],
    ['Fallo de conexión a la BD y puerto ocupado en local', 'Host incorrecto; el 8080 lo usaba otra aplicación', 'Host `moodle-mysql` y puerto 8088'],
    ['Error de la métrica de logs en el apply', 'El filtro de Logging usa `resource.labels`, no `resource.label`', 'Filtro corregido y aplicado por el pipeline'],
    ['Deriva perpetua del dashboard', 'La API normaliza el JSON (`targetAxis`, ceros omitidos)', 'JSON generado ya normalizado'],
    ['El pipeline no podía crear PR', 'Permiso del repositorio desactivado', 'Se activó «Allow GitHub Actions to create pull requests»'],
    ['Los PR creados por el bot no disparan workflows', 'Restricción de GitHub sobre `GITHUB_TOKEN`', '`gh workflow run terraform.yml --ref deploy/<sha>`'],
    ['Instalación lenta en Cloud Run (25 min)', '`db-f1-micro` y Filestore HDD', 'Se aceptó para la demostración; espera controlada'],
    ['La apariencia nueva no se veía', 'Caché del tema', 'Purga de cachés desde la administración'],
  ], [1.3, 1.4, 1.5], 'Problemas reales y soluciones.'));

// 21
add(H1('21. Conclusiones'),
  B('Moodle quedó desplegado en GCP con contenedores y servicios gestionados, construido desde un fork propio y administrado íntegramente con Terraform y estado remoto.'),
  B('El pipeline de IaC demostró el ciclo completo: cambio en código, PR, validación, plan, aprobación humana, apply y verificación sin deriva. El cambio resultó visible en los recursos reales.'),
  B('Separar el pipeline de aplicación del de infraestructura, conectados por un PR que cambia la imagen, mantiene a Terraform como única fuente de verdad y deja trazabilidad de commit a revisión.'),
  B('La persistencia de Moodle en una plataforma sin servidor exige almacenamiento compartido con semántica POSIX; Filestore lo resuelve, pero domina el coste.'),
  B('La observabilidad detectó un incidente real (el sitio privado durante la instalación) y lo cerró automáticamente, lo que valida la configuración de alertas.'));

// 22
add(H1('22. Referencias'),
  P('Documentación oficial de referencia de los componentes empleados:'),
  ...[
    ['Moodle Docs — Installing Moodle y Administration via command line', 'https://docs.moodle.org/502/en/Installing_Moodle'],
    ['Moodle Docs — Composer vendor directory', 'https://docs.moodle.org/502/en/Composer_vendor_directory_not_found'],
    ['Google Cloud — Cloud Run: NFS volume mounts', 'https://cloud.google.com/run/docs/configuring/services/nfs-volume-mounts'],
    ['Google Cloud — Cloud Run: conexión a Cloud SQL', 'https://cloud.google.com/sql/docs/mysql/connect-run'],
    ['Google Cloud — Workload Identity Federation con GitHub Actions', 'https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines'],
    ['Google Cloud — Uptime checks y políticas de alerta', 'https://cloud.google.com/monitoring/uptime-checks'],
    ['Terraform — Backend gcs', 'https://developer.hashicorp.com/terraform/language/backend/gcs'],
    ['Terraform Registry — Google provider', 'https://registry.terraform.io/providers/hashicorp/google/latest/docs'],
    ['GitHub Docs — Using environments for deployment', 'https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment'],
    ['google-github-actions/auth', 'https://github.com/google-github-actions/auth'],
    ['Docker Docs — Multi-stage builds', 'https://docs.docker.com/build/building/multi-stage/'],
  ].map(([n, u]) => new Paragraph({ numbering: { reference: 'num2', level: 0 }, spacing: { after: 60 },
    children: [t(n + '. '), new ExternalHyperlink({ link: u, children: [new TextRun({ text: u, font: FONT, size: 20, color: '1F4E79', underline: {} })] })] })));

// 23
add(H1('23. Anexos'), H2('A. Enlaces'),
  TABLE(['Recurso', 'Enlace'], [
    ['Fork', FORK], ['Moodle', URL], ['PR #1 (IaC)', `${FORK}/pull/1`], ['PR #2 (aplicación)', `${FORK}/pull/2`], ['PR #3 (despliegue de imagen)', `${FORK}/pull/3`],
    ['Plan en PR', RUNS.plan], ['Apply aprobado', RUNS.apply], ['Pipeline de aplicación', RUNS.app], ['Apply de la nueva imagen', RUNS.deployApply],
  ], [1, 2.4], 'Enlaces del proyecto.'),
  H2('B. Comandos relevantes'),
  ...CODE([
    'gh repo fork moodle/moodle --clone=false --default-branch-only',
    'git clone --depth 1 --branch MOODLE_502_STABLE https://github.com/moodle/moodle.git moodle-gcp',
    'git remote rename origin upstream && git remote add origin https://github.com/Casper128/moodle.git',
    'docker buildx build --platform linux/amd64 --build-arg GIT_SHA=$SHA -t $IMAGE:$SHA --push .',
    'gcloud storage buckets create gs://' + PROJ + '-tfstate --uniform-bucket-level-access --public-access-prevention',
    'terraform init -backend-config="bucket=' + PROJ + '-tfstate"',
    'terraform plan -out=tfplan && terraform apply tfplan',
    'gcloud run jobs execute moodle-sql-install --region us-central1 --wait',
    'gh pr create --base actividad6 ... && gh pr merge <n> --merge',
  ]),
  H2('C. Estructura del repositorio'),
  ...CODE([
    'Casper128/moodle (rama actividad6)',
    '├── Dockerfile, .dockerignore, docker/      imagen y configuración de Moodle',
    '├── infrastructure/terraform/               main, backend, variables, cicd, monitoring, outputs',
    '│   └── modules/{cloudrun,database,networking}',
    '├── .github/workflows/                      terraform.yml, application.yml',
    '├── docs/{PROGRESS.md, arquitectura/, evidencias/, entregable/}',
    '├── README.md, README.moodle.md',
    '└── código fuente de Moodle 5.2 (admin/, lib/, public/, …)',
  ]));

// ---------- Documento ----------
const doc = new Document({
  creator: 'Equipo del proyecto', title: 'Implementación de Moodle en GCP — Actividad 6', description: 'Informe final',
  
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: ACCENT }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: '2F5597' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    { reference: 'num2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '[%1]', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 420 } } } }] },
  ] },
  sections: [
    { properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: cover },
    { properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('Moodle en GCP — Actividad 6, opción B', { size: 16, color: '808080' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '808080' })] })] }) },
      children: [...toc, ...buildToc(), ...body] },
  ],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync('heads.json', JSON.stringify(HEADS));
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('DOCX', OUT, 'figuras', fig, 'tablas', tab); });

// Índice de evidencias en Markdown
const rows = evid.map(([f, tipo, req, desc]) => {
  const ok = fs.existsSync(path.join(EV, f));
  return `| ${ok ? `[${f}](${f})` : f} | ${ok ? '24-nov-2026' : '—'} | ${req} | ${{ web: 'Navegador', term: 'Terminal', usuario: 'Navegador (sesión del usuario)' }[tipo]} | ${ok ? desc : 'Pendiente: captura manual (ver abajo)'} |`;
});
fs.writeFileSync(path.join(EV, 'INDICE.md'), `# Índice de evidencias

Todas las capturas son reales. «Navegador»: Chrome headless sobre la página pública. «Terminal»: salida real de comandos, guardada en \`logs/\` y renderizada como imagen. «Usuario»: tomada por el responsable con su sesión.

| Archivo | Fecha | Requisito | Tipo | Qué demuestra |
|---|---|---|---|---|
${rows.join('\n')}

## Capturas de la consola de GCP

Ocho capturas tomadas desde Chrome con la sesión del usuario el 24-nov-2026. Se recortaron las pestañas y la barra de favoritos del navegador para no publicar datos personales; los originales quedan en \`originales-consola/\`, excluidos de Git.

| Archivo | Ruta en la consola |
|---|---|
| 10b-consola-artifact-registry.png | Artifact Registry → moodle-sql-containers → moodle |
| 12b-consola-cloud-sql.png | SQL → moodle-sql-mysql → Información general |
| 17b-consola-cloud-run.png | Cloud Run → moodle-sql-web → Revisiones |
| 22c-consola-logs-explorer.png | Logging → Explorador de registros, consulta \`resource.labels.service_name="moodle-sql-web"\` |
| 23b-consola-dashboard.png | Monitoring → Paneles → «Moodle en GCP» |
| 24b-consola-metricas-cloud-sql.png | SQL → moodle-sql-mysql → Supervisión |
| 25-consola-uptime-check.png | Monitoring → Verificaciones de tiempo de actividad → «Moodle login» |
| 26b-consola-politicas-alertas.png | Monitoring → Alertas (políticas e incidente cerrado) |
`);
console.log('INDICE', path.join(EV, 'INDICE.md'));
