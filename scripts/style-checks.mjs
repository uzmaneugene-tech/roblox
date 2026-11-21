import assert from 'node:assert/strict';
export async function checkStyleTools(browser,base){
const c=await browser.newContext(),p=await c.newPage();try{
const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('' + base + '#library');await p.waitForSelector('#lib-canvas[data-ready=tower]');
const src=n=>'define.prop("test_cube",b=>b.box({pos:[0,1,0],scale:'+n+'}));';
await p.locator('#lib-source').fill(src(2));await p.locator('#lib-test').click();await p.waitForFunction(()=>document.querySelector('#lib-status').textContent.includes('Sits on the ground'));
await p.locator('#lib-save').click();await p.waitForSelector('#lib-canvas[data-ready=test_cube]');
await p.locator('#lib-source').fill(src(3));await p.locator('#lib-save').click();await p.waitForFunction(()=>document.querySelector('#lib-version').options.length===1);
await p.locator('#lib-source').fill(src(-1));await p.locator('#lib-save').click();await p.waitForFunction(()=>document.querySelector('#lib-error').textContent.includes('scale'));
const current=()=>p.evaluate(async()=>{const m=await import('./story/library/store.js');return(await m.customItems()).find(i=>i.name==='test_cube')});
assert.equal((await current()).source,src(3));await p.locator('#lib-restore').click();await p.waitForFunction(v=>document.querySelector('#lib-source').value===v,src(2));
await p.locator('#lib-source').fill(src(1).replace('test_cube','tower'));await p.locator('#lib-save').click();await p.waitForSelector('#lib-fork:not([hidden])');await p.locator('#lib-fork').click();await p.waitForSelector('#lib-canvas[data-ready=tower_2]');
const history=await p.evaluate(async()=>{const m=await import('./story/library/store.js');for(let i=0;i<13;i++)await m.saveItems([{name:'history_probe',type:'prop',source:String(i)}]);return (await m.customItems()).find(r=>r.name==='history_probe').versions;});
assert.equal(history.length,10);assert.equal(history[0].source,'11');
await p.goto('' + base + '#story');await p.waitForFunction(()=>typeof document.querySelector('#story-check').onclick==='function');
await p.locator('#story-code').fill('scene("test",{location:"empty",time:"day",duration:1},s=>{});');await p.locator('#story-check').click();await p.waitForFunction(()=>document.querySelector('#story-status').textContent.includes('1.00 seconds'));assert.ok(await p.locator('#story-frame').isHidden());
assert.deepEqual(errors,[]);
}finally{await c.close();}
}
