import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:8000/roblox/';
const browser = process.env.FRAMECUT_CDP
  ? await chromium.connectOverCDP(process.env.FRAMECUT_CDP)
  : await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
const checks = [];
function log(kind, message) {
  console.log(`[${kind}] ${message}`);
  if (kind !== 'pass' && kind !== 'console.info') errors.push(`${kind}: ${message}`);
}
page.on('console', message => {
  if (message.type() === 'error') log('console.error', message.text());
  if (message.type() === 'info' || message.type() === 'warning') log('console.info', message.text());
});
page.on('pageerror', error => log('pageerror', error.message));
page.on('requestfailed', request => log('requestfailed', `${request.failure()?.errorText} ${request.url()}`));
page.on('response', response => {
  if (!response.ok() && response.status() >= 400) log('http', `${response.status()} ${response.url()}`);
  if (response.ok() && /\.m?js(?:\?|$)/.test(response.url())
      && !/(?:java|ecma)script/i.test(response.headers()['content-type'] || '')) {
    log('mime', `${response.url()} → ${response.headers()['content-type']}`);
  }
});
page.setDefaultTimeout(5000);
async function check(name, run) {
  try {
    await run();
    checks.push(name);
    log('pass', name);
  } catch (error) { log('check', `${name}: ${error.message}`); }
}
try {
  const result = await page.goto(base);
  assert.ok(result?.ok(), `Could not open ${base}`);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const panels = [
    ['Story Studio','story'], ['Location Preview','locations'], ['Character Preview','characters'],
    ['Shot Builder','builder'], ['Converter','converter'], ['Caption Writer','captions'],
    ['Cheatsheet','cheatsheet'], ['Guide','guide'], ['Overview','home'],
  ];
  for (const [label,id] of panels) await check(label, async () => {
    const link = nav.getByRole('link', {name: label, exact: true});
    await link.tap();
    await page.locator(`main > #${id}`).waitFor({state:'visible'});
    assert.deepEqual(await page.locator('main > section:visible').evaluateAll(views=>views.map(view=>view.id)), [id]);
    assert.equal(new URL(page.url()).hash, '#'+id);
    if(id==='locations') await page.locator('#location-canvas[aria-label*="for scale"]').waitFor();
    if(id==='characters') await page.locator('#story-avatar[data-ready="true"]').waitFor();
    if(id==='guide') await page.locator('#manual h1').first().waitFor();
    if(id==='cheatsheet') await page.locator('#cheatsheet-copy:enabled').waitFor();
  });
  await check('Sample story renders', async () => {
    await nav.getByRole('link',{name:'Story Studio',exact:true}).tap();
    await page.getByRole('button',{name:'Load sample',exact:true}).tap();
    await page.getByRole('button',{name:'Run',exact:true}).tap();
    const canvas = page.locator('#story-film[data-shot="wide"]');
    await canvas.waitFor({timeout:15000});
    assert.ok(await canvas.screenshot().then(buffer=>buffer.length > 1024), 'Sample canvas is blank');
    assert.ok(await page.locator('#story-errors').isHidden(), await page.locator('#story-error').textContent());
  });
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(`${checks.length} checks passed at ${base}; no console errors, failed requests or script MIME errors.`);
} finally {
  await context.close();
  await browser.close();
}
