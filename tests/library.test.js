import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runStory} from '../web/story/sandbox.js';
import {compileCamera,avoidSolids} from '../web/story/shots.js';
import * as T from '../web/story/vendor/three.module.min.js';
const file=name=>readFile(new URL('../web/library/'+name,import.meta.url),'utf8');
const catalog=JSON.parse(await file('catalog.json'));
const library=await Promise.all(catalog.map(async i=>({...i,source:await file(i.name+'.js')})));
const scene=(body,loc='empty')=>'scene("shot",{location:"'+loc+'",time:"dusk",duration:4},s=>{'+body+'})';
test('each shipped definition can be built inside QuickJS',async()=>{
  for(const i of library){
    const arg=JSON.stringify(i.name);
    const code=i.type==='character'?'character("actor",{preset:'+arg+'})':i.type==='animation'?'const a=character("Actor");'+scene('s.place(a,[0,0,0]);s.do(0,a,'+arg+');'):
      i.type==='location'?scene('',i.name):scene('s.spawn('+arg+',[0,0,0])');
    const r=await runStory(code,{library});assert.equal(r.error,undefined,i.name+': '+JSON.stringify(r.error));
    if(!['character','animation'].includes(i.type))assert.ok(r.timeline.scenes[0].nodes.length>1,i.name);
  }
});
test('library definitions run without browser capabilities, including in callbacks',async()=>{
  for(const expr of ['fetch("no")','new XMLHttpRequest()','new WebSocket("no")','document.body','localStorage.clear()','import("./no.js")']){
    const r=await runStory(scene('s.spawn("probe",[0,0,0])'),{library:[{name:'probe',source:'define.prop("probe", b=>{\n'+expr+';\n});'}]});
    assert.ok(r.error,expr);
  }
});
test('invalid builder values, unknown dependencies, duplicate names and recursive items report errors',async()=>{
  for(const source of ['define.prop("sample", b=>b.box({rough:2}));','define.prop("sample", b=>b.use("missing"));','define.prop("sample", b=>b.use("sample"));','define.prop("sample",42);','define.prop("sample",b=>{});define.prop("sample",b=>{});']){
    const r=await runStory(scene('s.spawn("sample",[0,0,0])'),{library:[{name:'sample',source}]});assert.match(r.error.message,/sample/);assert.ok(r.error.line);
  }
});
test('scatter is deterministic, respects exclusion circles and changes with seed',async()=>{
  const get=async seed=>{const r=await runStory(scene('s.scatter("rock",{count:12,area:[10,10],seed:'+seed+',avoid:[[0,0,2]]})'),{library});return r.timeline.scenes[0].nodes.filter(n=>n.kind==='group').map(n=>n.options.pos)};
  const a=await get(42);assert.equal(a.length,12);assert.deepEqual(await get(42),a);assert.notDeepEqual(await get(1),a);assert.ok(a.every(([x,,z])=>Math.hypot(x,z)>=2));
});
test('portrait camera projection meets medium and close-up silhouette targets',()=>{
  for(const height of [3.5,5,6.25])for(const shot of ['medium','close_up']){
    const director=compileCamera([{shot,t:0,opts:{}}],()=>({pos:[0,0,0],height,low:0,yaw:0}),()=>0);
    const v=director(0),cam=new T.PerspectiveCamera(v.fov,9/16,.1,230);cam.position.fromArray(v.from);cam.lookAt(...v.look);cam.updateMatrixWorld();
    const fraction=(new T.Vector3(0,height,0).project(cam).y-new T.Vector3().project(cam).y)/2;
    assert.ok(shot==='medium'?fraction>=.15&&fraction<=.25:fraction>.3&&fraction<=.6,shot+': '+fraction);
  }
});
test('director clears solid props and camera stays outside people during easing',()=>{
  assert.ok(avoidSolids([0,2,10],[0,2,0],[{min:[-1,0,4],max:[1,3,6]}],[])[2]<4);
  assert.ok(avoidSolids([1,3,0],[0,2,0],[],[{pos:[1,0,0]}])[1]>5);
});
test('the copied Library recipes run unchanged',async()=>{
  const doc=await readFile(new URL('../web/docs/library.md',import.meta.url),'utf8');
  const blocks=[...doc.matchAll(/^```js\n([\s\S]*?)^```/gm)].map(m=>m[1]);
  let i=0;
  for(const source of blocks){const r=await runStory(source,{library:[...library,...blocks.slice(0,i).filter(s=>s.startsWith('define.')).map((source,j)=>({name:'kit'+j,source}))]});assert.equal(r.error,undefined,JSON.stringify(r.error));i++;}
  assert.ok(i>=4);
});
test('over-shoulder keeps the far face exposed beside the foreground silhouette',()=>{
  for(const separation of [3,5,8]){
    const at=id=>({pos:[0,0,id==='b'?separation:0],yaw:0,low:0});
    const frame=compileCamera([{t:0,shot:'over_shoulder',opts:{targets:['a','b']}}],at,()=>0,['a','b'])(0);
    const crossing=separation/(separation-frame.from[2]);
    assert.ok(Math.abs(frame.from[0])*crossing>=1.55);
    assert.deepEqual(frame.look,[0,4.2,separation]);
  }
});
