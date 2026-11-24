const puppeteer = require('puppeteer-core'); const fs = require('fs');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  for (const [src, out, w] of [['arquitectura.mmd', process.argv[2] + '/arquitectura.png', 1100], ['pipeline.mmd', process.argv[2] + '/pipeline-cicd.png', 860]]) {
    const p = await b.newPage(); await p.setViewport({ width: w, height: 900, deviceScaleFactor: 2 });
    const code = fs.readFileSync(src, 'utf8');
    await p.setContent(`<html><body style="margin:0;background:#fff"><pre class="mermaid">${code.replace(/</g,'&lt;')}</pre>
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
      <script>mermaid.initialize({startOnLoad:true,theme:'neutral',fontFamily:'Arial',flowchart:{htmlLabels:true}});</script></body></html>`, { waitUntil: 'networkidle0' });
    await p.waitForSelector('pre.mermaid svg', { timeout: 30000 });
    const el = await p.$('pre.mermaid svg'); await el.screenshot({ path: out, omitBackground: false });
    console.log(out);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
