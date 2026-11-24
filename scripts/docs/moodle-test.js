// Prueba funcional de Moodle en Cloud Run con capturas reales.
// Uso: node moodle-test.js <url> <dir-evidencias> <fase: crear|verificar> <archivo-subida>
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [base, dir, phase, upload] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function closeTours(page) {
  for (let i = 0; i < 5; i++) {
    const c = await page.evaluate(() => {
      const b = document.querySelector('.flexitour-container [data-role="end"], [data-role="flexitour-step"] [data-role="end"]');
      if (b) { b.click(); return true; } return false;
    });
    if (!c) break; await sleep(800);
  }
}
async function go(page, path, shot, full = false) {
  await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 120000 });
  await closeTours(page);
  if (path.includes('files.php')) {
    // El gestor de archivos carga su contenido por AJAX.
    await page.waitForFunction(() => document.querySelector('.fp-file, .fp-empty, .fp-filename') &&
      !document.querySelector('.filemanager-loading:not(.hidden), .fp-content .fa-spin, .fp-content .icon.spinner'), { timeout: 60000 }).catch(() => {});
    await sleep(1500);
  }
  if (shot) await page.screenshot({ path: `${dir}/${shot}`, fullPage: full });
  log('GET', path, '->', page.url(), '|', await page.title());
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try {
    if (phase === 'crear') await go(page, '/', '18-moodle-url-publica.png');
    await go(page, '/login/index.php', phase === 'crear' ? '19-moodle-login.png' : null);
    await page.type('#username', 'admin');
    await page.type('#password', process.env.MOODLE_PASS);
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), page.click('#loginbtn')]);
    log('login ->', page.url(), '|', await page.title());
    if (!/Dashboard|Área personal|Panel/.test(await page.title())) await go(page, '/my/', null);
    await closeTours(page);

    if (phase === 'crear') {
      await page.screenshot({ path: `${dir}/20-moodle-dashboard.png` });
      // Curso de prueba mediante el formulario estándar de Moodle.
      await go(page, '/course/search.php?search=DEVOPS-101', null);
      const exists = await page.evaluate(() => document.body.innerText.includes('Introducción a DevOps en GCP'));
      if (!exists) {
      await go(page, '/course/edit.php?category=1', null);
      await page.type('#id_fullname', 'Introducción a DevOps en GCP');
      await page.type('#id_shortname', 'DEVOPS-101');
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), page.click('#id_saveanddisplay')]);
      log('curso creado ->', page.url(), '|', await page.title());
      } else log('curso ya existente: DEVOPS-101');
      // Archivo en «Archivos privados» mediante el selector de archivos de Moodle.
      await go(page, '/user/files.php', null);
      await page.click('.fp-btn-add a, .fp-btn-add');
      await page.waitForSelector('.fp-repo-area', { visible: true, timeout: 60000 });
      const repos = await page.$$('.fp-repo a, .fp-repo');
      for (const r of repos) {
        const t = await r.evaluate(e => e.textContent);
        if (/Upload a file|Subir un archivo/i.test(t)) { await r.click(); break; }
      }
      const input = await page.waitForSelector('input[type=file][name=repo_upload_file]', { timeout: 60000 });
      await input.uploadFile(upload);
      await page.click('.fp-upload-btn');
      await page.waitForFunction(() => document.querySelectorAll('.fp-file, .fp-filename-icon').length > 0, { timeout: 60000 });
      await sleep(1500);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), page.click('[name="submitbutton"]')]);
      log('archivo guardado ->', page.url());
    }
    await go(page, '/course/index.php?categoryid=1', phase === 'crear' ? '21-moodle-cursos.png' : '21b-moodle-cursos-tras-redespliegue.png');
    const course = await page.evaluate(() => document.body.innerText.includes('Introducción a DevOps en GCP'));
    await go(page, '/user/files.php', phase === 'crear' ? '21c-moodle-archivo-subido.png' : '21d-moodle-archivo-tras-redespliegue.png');
    const file = await page.evaluate(() => !!document.querySelector('.fp-filename, .fp-file') && (document.body.innerHTML.includes('evidencia-subida.txt')));
    log(`RESULTADO fase=${phase} curso=${course} archivo=${file}`);
  } catch (e) {
    await page.screenshot({ path: `${dir}/error-${phase}.png` });
    log('ERROR', e.message);
    process.exitCode = 1;
  }
  await browser.close();
})();
