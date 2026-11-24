// Genera docs/entregable/Presentacion_Moodle_GCP.pptx con capturas reales.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2];
const EV = f => path.join(ROOT, 'docs/evidencias', f);
const AR = f => path.join(ROOT, 'docs/arquitectura', f);
const NAVY = '1F4E79', INK = '1F2937', MUTED = '6B7280', LINE = 'D1D5DB';

function size(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
// Imagen encajada en una caja (x, y, w, h) conservando proporción; recorte superior opcional.
function img(s, file, x, y, w, h, cropTop) {
  if (!fs.existsSync(file)) return;
  const { w: iw, h: ih } = size(file);
  let ratio = iw / ih;
  if (cropTop && ih / iw > h / w) { // capturas de página completa: muestra la parte superior
    s.addImage({ path: file, x, y, w, h, sizing: { type: 'crop', w, h, x: 0, y: 0 } });
    s.addShape('rect', { x, y, w, h, line: { color: LINE, width: 0.75 }, fill: { type: 'none' } });
    return;
  }
  let W = w, H = w / ratio;
  if (H > h) { H = h; W = h * ratio; }
  s.addImage({ path: file, x: x + (w - W) / 2, y: y + (h - H) / 2, w: W, h: H });
  s.addShape('rect', { x: x + (w - W) / 2, y: y + (h - H) / 2, w: W, h: H, line: { color: LINE, width: 0.75 }, fill: { type: 'none' } });
}

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13,33 × 7,5 in
pptx.title = 'Moodle en GCP — Actividad 6';
let n = 0;

function slide(title, kicker) {
  const s = pptx.addSlide(); n += 1;
  s.background = { color: 'FFFFFF' };
  s.addShape('rect', { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.35, w: 9, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: MUTED, bold: true, charSpacing: 1 });
  s.addText(title, { x: 0.6, y: 0.62, w: 12.1, h: 0.75, fontFace: 'Calibri', fontSize: 28, bold: true, color: INK });
  s.addText(String(n), { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: MUTED, align: 'right' });
  return s;
}
function bullets(s, items, x = 0.6, y = 1.6, w = 4.6, h = 5.2, fs = 15) {
  s.addText(items.map(t => ({ text: t, options: { bullet: { indent: 16 }, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontFace: 'Calibri', fontSize: fs, color: INK, valign: 'top' });
}
function caption(s, text, x, y, w) {
  s.addText(text, { x, y, w, h: 0.3, fontFace: 'Calibri', fontSize: 10, italic: true, color: MUTED });
}

// 1. Portada
{
  const s = pptx.addSlide(); n += 1;
  s.background = { color: NAVY };
  s.addText('Moodle en Google Cloud Platform', { x: 0.8, y: 2.0, w: 11.5, h: 1.0, fontFace: 'Calibri', fontSize: 40, bold: true, color: 'FFFFFF' });
  s.addText('Infraestructura como código, CI/CD y observabilidad', { x: 0.8, y: 3.0, w: 11.5, h: 0.6, fontFace: 'Calibri', fontSize: 22, color: 'DCE6F2' });
  s.addText('Actividad 6 — IaC — CI-CD — Observabilidad — Opción B', { x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontFace: 'Calibri', fontSize: 16, color: 'DCE6F2' });
  s.addText('Integrantes: [Pendiente]   ·   Docente: [Pendiente]   ·   27 de noviembre de 2026', { x: 0.8, y: 6.3, w: 11.5, h: 0.4, fontFace: 'Calibri', fontSize: 13, color: 'B4C7E7' });
}

// 2. Objetivo y requisitos
{
  const s = slide('Objetivo y requisitos', 'Contexto');
  s.addText('Desplegar Moodle en GCP con contenedores y bases de datos gestionadas, administrado con Terraform mediante un pipeline CI/CD con aprobación y con observabilidad real.',
    { x: 0.6, y: 1.5, w: 12, h: 0.8, fontFace: 'Calibri', fontSize: 17, color: INK });
  const rows = [
    ['Requisito', 'Implementación'],
    ['Infraestructura como código', 'Terraform · estado remoto en GCS · 67 elementos'],
    ['Servicios contenerizados', 'Imagen propia en Cloud Run (web, install, cron)'],
    ['Base de datos gestionada', 'Cloud SQL para MySQL 8.4'],
    ['CI/CD — opción B (IaC)', 'GitHub Actions: plan en PR → aprobación → apply'],
    ['Observabilidad', 'Logging, dashboard, uptime check y 3 alertas'],
  ].map((r, i) => r.map(c => ({ text: c, options: i === 0 ? { bold: true, color: 'FFFFFF', fill: { color: NAVY } } : {} })));
  s.addTable(rows, { x: 0.6, y: 2.6, w: 12, colW: [4, 8], fontFace: 'Calibri', fontSize: 15, color: INK, border: { type: 'solid', color: LINE, pt: 0.75 }, rowH: 0.55 });
}

// 3. Arquitectura
{
  const s = slide('Arquitectura', 'Solución');
  img(s, AR('arquitectura.png'), 4.3, 1.4, 8.6, 5.6);
  bullets(s, ['Cloud Run ejecuta la imagen del fork (máx. 1 instancia, HTTPS gestionado)', 'Cloud SQL MySQL 8.4 por socket del conector', 'Filestore NFS para moodledata persistente', 'Secret Manager para contraseñas', 'Cron: Cloud Scheduler → Cloud Run job cada 15 min'], 0.6, 1.6, 3.6, 5.2, 14);
}

// 4. Fork
{
  const s = slide('Fork y repositorio', 'GitHub');
  img(s, EV('02b-fork-github-web.png'), 5.0, 1.4, 7.9, 5.4);
  bullets(s, ['Fork Casper128/moodle de moodle/moodle', 'Rama actividad6 desde MOODLE_502_STABLE (5.2.5+)', 'Remotos origin (fork) y upstream', 'Rama protegida: PR obligatorio, sin force-push', 'Workflows de upstream retirados']);
}

// 5. Contenerización
{
  const s = slide('Contenerización', 'Docker');
  img(s, EV('04-dockerfile.png'), 0.6, 1.5, 6.1, 5.3, true);
  bullets(s, ['Etapa 1: composer install --no-dev con composer.lock', 'Etapa 2: Ubuntu 24.04 + Apache + PHP 8.3', 'Imágenes base fijadas por digest', 'Prueba local: instalación, login, curso, reinicio y cron'], 7.0, 1.6, 5.9, 4.5, 15);
  caption(s, 'Dockerfile real del repositorio', 0.6, 6.85, 6);
}

// 6. Artifact Registry
{
  const s = slide('Artifact Registry y trazabilidad', 'Imagen');
  img(s, EV(fs.existsSync(EV('10b-consola-artifact-registry.png')) ? '10b-consola-artifact-registry.png' : '10-artifact-registry.png'), 0.6, 1.5, 7.4, 5.3);
  bullets(s, ['Etiqueta = SHA del commit, sin latest', 'Commit c8aa208f → moodle:c8aa208f… → sha256:d9534289…', 'Política de limpieza en Terraform', 'Push con gh-builder (solo escritura en el repositorio)'], 8.3, 1.6, 4.6, 5, 15);
}

// 7. Terraform
{
  const s = slide('Terraform', 'Infraestructura como código');
  img(s, EV('08-terraform-plan.png'), 0.6, 1.5, 6.6, 5.3, true);
  bullets(s, ['Módulos cloudrun, database y networking', 'Backend GCS versionado y privado', 'Estado previo migrado; deriva corregida', 'Plan revisado: 45 crear, 5 modificar, 2 reemplazar', 'Verificación final: No changes'], 7.5, 1.6, 5.4, 5, 15);
}

// 8. CI/CD IaC
{
  const s = slide('CI/CD de infraestructura — opción B', 'GitHub Actions · terraform.yml');
  img(s, EV('15b-aprobacion-entorno.png'), 6.6, 1.4, 6.3, 4.6);
  const steps = ['PR modifica Terraform', 'fmt · validate · plan (comentado)', 'Merge en actividad6', 'Aprobación del entorno produccion', 'apply + verificación + plan sin deriva', 'Etiqueta entrega=actividad-6 visible en GCP'];
  steps.forEach((t, i) => {
    const y = 1.55 + i * 0.78;
    s.addShape('ellipse', { x: 0.6, y, w: 0.42, h: 0.42, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText(String(i + 1), { x: 0.6, y, w: 0.42, h: 0.42, align: 'center', valign: 'middle', fontFace: 'Calibri', fontSize: 13, bold: true, color: 'FFFFFF' });
    s.addText(t, { x: 1.15, y: y - 0.04, w: 5.2, h: 0.5, fontFace: 'Calibri', fontSize: 15, color: INK, valign: 'middle' });
  });
  s.addText('OIDC + Workload Identity Federation: sin claves JSON · concurrencia terraform-state', { x: 0.6, y: 6.35, w: 12.3, h: 0.4, fontFace: 'Calibri', fontSize: 13, color: MUTED });
  caption(s, 'Aprobación real del despliegue (Plan: 2 add, 9 change, 0 destroy)', 6.6, 6.0, 6.3);
}

// 9. Despliegue y BD
{
  const s = slide('Despliegue y base de datos', 'Cloud Run · Cloud SQL · Filestore');
  img(s, EV('20b-moodle-curso-apariencia.png'), 0.6, 1.5, 6.4, 4.0);
  img(s, EV('17b-consola-cloud-run.png'), 7.2, 1.5, 5.7, 3.9);
  bullets(s, ['URL: moodle-sql-web-264423911779.us-central1.run.app', 'Revisión 00003 con el 100 % del tráfico; curso y archivo persisten tras el redespliegue', 'Cloud SQL sin redes autorizadas; acceso por conector', 'Secretos por referencia de Secret Manager'], 0.6, 5.6, 12.3, 1.5, 14);
}

// 10. Observabilidad
{
  const s = slide('Observabilidad', 'Logging · Monitoring');
  img(s, EV('23b-consola-dashboard.png'), 0.6, 1.45, 4.0, 3.0);
  img(s, EV('25-consola-uptime-check.png'), 4.67, 1.45, 4.0, 3.0);
  img(s, EV('26b-consola-politicas-alertas.png'), 8.74, 1.45, 4.0, 3.0);
  caption(s, 'Dashboard · Uptime check · Alertas (consola de GCP)', 0.6, 4.5, 12);
  bullets(s, ['Uptime check /login/index.php desde 6 regiones', 'Alertas: indisponibilidad, 5xx, CPU de Cloud SQL', 'Incidente real: abierto 05:18, cerrado 05:43 de forma automática', 'Dashboard de 8 gráficos y métrica moodle_php_errors', 'Disponibilidad 24 h: 93,461 % (incluye la instalación privada)'], 0.6, 4.9, 12.2, 2.1, 14);
}

// 11. Demostración y resultados
{
  const s = slide('Demostración y resultados', 'Pruebas');
  const rows = [
    ['Prueba', 'Resultado'],
    ['URL pública y login', 'HTTP 200 · dashboard'],
    ['Pipeline IaC (PR → aprobación → apply)', 'OK · 0 recursos destruidos'],
    ['Pipeline de aplicación → nueva revisión', 'OK · revisión 00003'],
    ['Persistencia tras redespliegue', 'Curso y archivo presentes'],
    ['Cron de Moodle', 'Ejecuciones correctas cada 15 min'],
    ['Alerta de indisponibilidad', 'Incidente abierto y cerrado'],
    ['Deriva final', 'No changes'],
  ].map((r, i) => r.map(c => ({ text: c, options: i === 0 ? { bold: true, color: 'FFFFFF', fill: { color: NAVY } } : {} })));
  s.addTable(rows, { x: 0.6, y: 1.5, w: 7.2, colW: [4.0, 3.2], fontFace: 'Calibri', fontSize: 14, color: INK, border: { type: 'solid', color: LINE, pt: 0.75 }, rowH: 0.55 });
  img(s, EV('18-moodle-url-publica.png'), 8.1, 1.5, 4.8, 3.2);
  s.addText('Coste estimado ≈ US$6/día (Filestore ≈ US$5,4)', { x: 8.1, y: 5.0, w: 4.8, h: 0.5, fontFace: 'Calibri', fontSize: 14, bold: true, color: NAVY });
}

// 12. Conclusiones
{
  const s = slide('Conclusiones', 'Cierre');
  bullets(s, [
    'La infraestructura solo cambia mediante código revisado, plan visible y aprobación humana.',
    'Separar los pipelines de aplicación e IaC mantiene a Terraform como única fuente de verdad, con trazabilidad de commit a revisión.',
    'Moodle sin servidor exige almacenamiento compartido POSIX: Filestore lo resuelve, pero domina el coste.',
    'La observabilidad detectó y cerró un incidente real sin intervención.',
    'Mejoras posibles: dominio propio, varias instancias con Redis y reducir Filestore tras la evaluación.',
  ], 0.6, 1.6, 12.2, 5.2, 18);
}

const out = path.join(ROOT, 'docs/entregable/Presentacion_Moodle_GCP.pptx');
pptx.writeFile({ fileName: out }).then(f => console.log('PPTX', f, n, 'diapositivas'));
