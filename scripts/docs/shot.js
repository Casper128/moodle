// Uso:
//   node shot.js web  <salida.png> <url> [login]      (login usa MOODLE_USER / MOODLE_PASS del entorno)
//   node shot.js term <salida.png> <titulo> <archivo-log> [maxLineas]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

(async () => {
  const [mode, out, a, b, c] = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--lang=es-ES'] });
  const page = await browser.newPage();
  if (mode === 'web') {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    if (b === 'login') {
      const base = new URL(a).origin;
      await page.goto(base + '/login/index.php', { waitUntil: 'networkidle2', timeout: 90000 });
      await page.type('#username', process.env.MOODLE_USER);
      await page.type('#password', process.env.MOODLE_PASS);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }), page.click('#loginbtn')]);
    }
    await page.goto(a, { waitUntil: 'networkidle2', timeout: 90000 });
    // Cierra los tours de usuario de Moodle (se marcan como vistos y no reaparecen).
    for (let i = 0; i < 5; i++) {
      const closed = await page.evaluate(() => {
        const btn = document.querySelector('[data-role="flexitour-step"] [data-role="end"], .flexitour-container [data-role="end"]');
        if (btn) { btn.click(); return true; } return false;
      });
      if (!closed) break;
      await new Promise(r => setTimeout(r, 800));
    }
    await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
    console.log(out, '->', page.url(), await page.title());
  } else {
    const max = parseInt(c || '60', 10);
    let lines = fs.readFileSync(b, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').split('\n');
    if (lines.length > max) lines = lines.slice(0, max).concat([`… (${lines.length - max} líneas más en ${b.split('/').pop()})`]);
    const html = `<html><body style="margin:0;background:#1e1e1e;font:13px/1.45 Menlo,monospace;color:#d4d4d4">
      <div style="background:#333;color:#ccc;padding:8px 14px;font:12px -apple-system,sans-serif">Salida real de terminal — ${esc(a)}</div>
      <pre style="margin:0;padding:12px 14px;white-space:pre-wrap;word-break:break-all">${esc(lines.join('\n'))}</pre></body></html>`;
    await page.setViewport({ width: 1200, height: 400, deviceScaleFactor: 1 });
    await page.setContent(html);
    await page.screenshot({ path: out, fullPage: true });
    console.log(out);
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
