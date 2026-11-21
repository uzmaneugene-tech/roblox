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
    ['Library','library'], ['Cheatsheet','cheatsheet'], ['Guide','guide'], ['Overview','home'],
  ];
  for (const [label,id] of panels) await check(label, async () => {
    const link = nav.getByRole('link', {name: label, exact: true});
    await link.tap();
    await page.locator(`main > #${id}`).waitFor({state:'visible'});
    assert.deepEqual(await page.locator('main > section:visible').evaluateAll(views=>views.map(view=>view.id)), [id]);
    assert.equal(new URL(page.url()).hash, '#'+id);
    if(id==='locations') await page.locator('#location-canvas[aria-label*="for scale"]').waitFor();
    if(id==='characters') await page.locator('#story-avatar[data-ready="true"]').waitFor();
    if(id==='library') await page.locator('#lib-canvas[data-ready="tower"]').waitFor({timeout:15000});
    if(id==='guide') await page.locator('#manual h1').first().waitFor();
    if(id==='cheatsheet') await page.locator('#cheatsheet-copy:enabled').waitFor();
  });
  await check('Custom library item survives reload and round-trips through JSON and JavaScript', async () => {
    await nav.getByRole('link',{name:'Library',exact:true}).tap();
    await page.locator('#lib-canvas[data-ready="tower"]').waitFor();
    await page.locator('#lib-source').fill('define.prop("bad_item", b=>{\n b.box({rough:3});\n});');
    await page.locator('#lib-save').tap();
    await page.locator('#lib-copy-error:not([hidden])').waitFor();
    const diagnostic=await page.locator('#lib-error').textContent();
    assert.match(diagnostic,/Line 2:.*bad_item/);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedDiagnostic=text}}}));
    await page.locator('#lib-copy-error').tap();
    assert.equal(await page.evaluate(()=>window.copiedDiagnostic),diagnostic);
    const src='define.prop("ci_marker", b=>b.cone({pos:[0,1,0],scale:2,color:"#eb915c"}));';
    await page.locator('#lib-source').fill(src);
    await page.locator('#lib-save').tap();
    await page.locator('#lib-canvas[data-ready="ci_marker"]').waitFor({timeout:15000});
    await page.reload();
    await page.locator('#lib-canvas[data-ready="tower"]').waitFor();
    await page.locator('#lib-item option[value="ci_marker"]').waitFor({state:'attached'});
    await page.locator('#lib-item').selectOption('ci_marker');
    await page.locator('#lib-canvas[data-ready="ci_marker"]').waitFor();
    for(const ext of ['json','js']){
      const download=page.waitForEvent('download');await page.locator('#lib-'+ext).tap();
      const file=await download, path=await file.path();
      await page.locator('#lib-delete').tap();
      await page.locator('#lib-item option[value="ci_marker"]').waitFor({state:'detached'});
    await page.locator('#lib-canvas[data-ready="tower"]').waitFor();
      const {readFile}=await import('node:fs/promises');
      await page.locator('#lib-import').setInputFiles({name:file.suggestedFilename(),mimeType:'text/plain',buffer:await readFile(path)});
      await page.locator('#lib-canvas[data-ready="ci_marker"]').waitFor({timeout:15000});
    }
    await page.locator('#lib-delete').tap();
    await page.locator('#lib-item option[value="ci_marker"]').waitFor({state:'detached'});
    await page.locator('#lib-canvas[data-ready="tower"]').waitFor();
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
  await check('Pick coordinates, capture the camera and copy the complete reference',async()=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedDiagnostic=text}}}));
    await page.locator('#tools-panel summary').tap();
    const film=page.locator('#story-film'),bounds=await film.boundingBox();
    await film.tap({position:{x:Math.floor(bounds.width*.5),y:Math.floor(bounds.height*.82)}});
    assert.match(await page.locator('#tools-position').textContent(),/nearest prop:/);
    await page.locator('#tools-up').tap();await page.locator('#tools-shot').tap();
    assert.match(await page.evaluate(()=>window.copiedDiagnostic),/^s.cam\(0, "static",/);
    await nav.getByRole('link',{name:'Cheatsheet',exact:true}).tap();
    await page.locator('#cheatsheet-copy').tap();
    assert.ok(await page.evaluate(async()=>{
      const text=window.copiedDiagnostic,rows=await(await fetch('./library/catalog.json')).json();
      return text.includes('s.timeOfDay(2,')&&text.includes('s.do(1,jin,"punch_air")')&&text===await(await fetch(document.querySelector('#cheatsheet-file').href)).text()
        &&rows.every(i=>text.includes('| '+i.name+' | '+i.type+' | '+(i.options||'—')+' |'));
    }));
  });
  await check('Sound and effects sample runs, plays from a tap and can be muted',async()=>{
    await nav.getByRole('link',{name:'Story Studio',exact:true}).tap();
    await page.locator('#story-phase-two').tap();
    await page.evaluate(()=>{
      const resume=AudioContext.prototype.resume, start=AudioBufferSourceNode.prototype.start, stop=AudioBufferSourceNode.prototype.stop;
      window.audioSmoke={resume:0,start:0,stop:0};
      AudioContext.prototype.resume=function(...args){window.audioSmoke.resume++;return resume.apply(this,args);};
      AudioBufferSourceNode.prototype.start=function(...args){window.audioSmoke.start++;return start.apply(this,args);};
      AudioBufferSourceNode.prototype.stop=function(...args){window.audioSmoke.stop++;return stop.apply(this,args);};
    });
    await page.locator('#story-run').tap();
    await page.locator('#story-run:enabled').waitFor({timeout:15000});
    assert.ok(await page.locator('#story-errors').isHidden(),await page.locator('#story-error').textContent());
    assert.match(await page.locator('#story-status').textContent(),/7 scenes/);
    await page.locator('#story-play').tap();
    await page.waitForFunction(()=>window.audioSmoke.resume>0&&window.audioSmoke.start>0);
    await page.locator('#story-audio summary').tap();
    await page.locator('#story-sound').uncheck();
    await page.waitForFunction(()=>window.audioSmoke.stop>0);
    if(await page.locator('#story-play').textContent()==='Pause')await page.locator('#story-play').tap();
    await page.locator('#story-scene').selectOption('Thunder Break');
    assert.equal(await page.locator('#story-film').getAttribute('data-shot'),'two_shot');
  });
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(`${checks.length} checks passed at ${base}; no console errors, failed requests or script MIME errors.`);
} finally {
  await context.close();
  await browser.close();
}
