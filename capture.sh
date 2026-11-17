#!/usr/bin/env bash
set -Eeuo pipefail
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence directory}"
RUNTIME_DIR="${RUNTIME_DIR:-${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}/.runtime}"
run() { /usr/bin/time -p "$@"; }
run mkdir -p "$CAPTURE_DIR"
export CAPTURE_URL CAPTURE_DIR
run node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = path.join(process.env.HOME, '.local/share/omgithub-playwright');
const loadRuntimePackage = createRequire(path.join(runtime, 'package.json'));
let chromium, config;
try {
  ({ chromium } = loadRuntimePackage('playwright'));
  config = JSON.parse(fs.readFileSync(path.join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'));
  if (process.platform === 'linux') process.env.DISPLAY ||= ':' + fs.readFileSync(path.join(runtime, 'display'), 'utf8').trim();
} catch (error) { console.error(`Browser setup failed: ${error.message}`); process.exit(75); }
const url = process.env.CAPTURE_URL, output = process.env.CAPTURE_DIR;
try { new URL(url); } catch { console.error('CAPTURE_URL is not a valid URL'); process.exit(1); }
const temporary = error => { const e = new Error(error.message || String(error)); e.exitCode = 75; throw e; };
let browser;
(async()=>{
  try {
    try { browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }); }
    catch (error) { temporary(error); }
    for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
      let page;
      try { page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 }); }
      catch (error) { temporary(error); }
      page.setDefaultTimeout(20000);
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      let response;
      try { response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }); }
      catch (error) { await page.close().catch(()=>{}); temporary(error); }
      if (!response || !response.ok()) {
        const status = response?.status(); await page.close().catch(()=>{});
        const error = new Error(`Preview navigation returned HTTP ${status || 'no response'}`);
        error.exitCode = !status || [408,429,500,502,503,504].includes(status) ? 75 : 1;
        throw error;
      }
      try {
        await page.locator('body').waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.readyState === 'complete' && document.body && (document.body.innerText.trim().length > 20 || document.querySelector('canvas,svg,main')));
        await page.waitForTimeout(900);
        const rendered = await page.evaluate(() => {
          const canvas = [...document.querySelectorAll('canvas')].some(c => c.width > 0 && c.height > 0 && c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().height > 0);
          const visible = [...document.querySelectorAll('main,canvas,svg,body > *')].some(el => { const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none' });
          return { canvas, visible, text: document.body.innerText.trim() };
        });
        if (!rendered.visible || (!rendered.canvas && rendered.text.length < 20)) throw new Error('Page loaded but no visible application content was rendered');
        if (pageErrors.length) throw new Error(`Application JavaScript error: ${pageErrors.join('; ')}`);
        await page.screenshot({ path: path.join(output, `final-${name}.png`), fullPage: false, timeout: 30000 });
        console.log(`Captured ${name} (${width}x${height}) from ${url}`);
      } catch (error) {
        await page.close().catch(()=>{});
        if (error.name === 'TimeoutError' || !browser.isConnected()) temporary(error);
        throw error;
      }
      await page.close();
    }
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = error.exitCode || 1;
  } finally {
    if (browser) { try { await browser.close(); } catch (error) { console.error(`Browser close failed: ${error.message}`); process.exitCode ||= 75; } }
  }
})();
NODE
