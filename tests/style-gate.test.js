import test from 'node:test';
import assert from 'node:assert/strict';
import {runStory} from '../web/story/sandbox.js';
import {inspection} from '../web/story/library/inspection.js';
import {silhouettes,styleHeight} from '../web/story/styles.js';
const run=(body,lib=[])=>runStory('const a=character("Jin"), b=character("Kai");\nscene("Set",{location:"empty",time:"day",duration:2},s=>{\n'+body+'\n})',{library:lib});
test('independent unknown names include snippets, fixes and choices in one response',async()=>{
 const lib=[{name:'tower',source:'define.prop("tower",b=>b.bxo({}));'}];
 const r=await run('s.place(a,[0,0,0]);\ns.do(0,a,"bowing");\ns.cam(0,"wid");\ns.prop("bnch",[0,0,0]);\ns.spawn("towr",[0,0,0]);\ns.spawn("tower",[0,0,0]);\ns.cam(0,"wide",{heght:4});',lib);
 for(const v of ['bow','wide','bench','tower','box','height'])assert.ok(r.error.message.includes('Did you mean "'+v+'"?'),v);
 assert.ok(r.issues.every(i=>i.line>0&&i.snippet));
 const loc=await runStory('scene("s",{location:"backyard_part",time:"day",duration:2},s=>{s.zz()})');
 assert.match(loc.error.message,/Did you mean "backyard_party"/);assert.match(loc.error.message,/scene method: zz/);
});
test('normalization keeps numeric-looking dialogue, IDs and text as strings',async()=>{
 const lib=[{name:'cube',source:'define.prop("cube",b=>b.box({scale:["2"],color:" #abc ",rot:[0,90,0]}));'}];
 const r=await run('s.place(a,["1",0,0]);s.scatter(" cube ",{count:"1",area:[5,5],avoid:[[99,5,99,1]]});s.say("1",a,"123");s.prop("ball",[0,0,0],{rotate:.8});',lib);
 assert.equal(r.error,undefined,JSON.stringify(r.error));const scene=r.timeline.scenes[0],box=scene.nodes.at(-1);
 assert.equal(box.options.scale,2);assert.equal(box.options.color,'#aabbcc');assert.deepEqual(scene.placements[0].position,[1,0,0]);assert.equal(scene.captions[0].text,'123');
 for(const hint of ['one-element','numeric string','hex','spaces','radius','radians','degrees'])assert.ok(r.warnings.some(w=>w.message.includes(hint)),hint);
});
test('strict argument checks reject invalid records without returning a playable timeline',async()=>{
 const r=await run('s.place(a,[0,2]);s.prop("ball",[0,0,0],{scale:[1,0,1],color:"tomato"});s.cam(0,"group",{targets:[a,a]});s.cam(0,"two_shot",{});s.do(0,a,"bow");s.say(0,b,"Hi");s.sfx(3,"ding");s.scatter("cube",{count:1,area:[1,1],avoid:[[0,0,-1]]});s.grid("cube",{rows:2.5,cols:2,gap:2});',[{name:'cube',source:'define.prop("cube",b=>b.box({}));'}]);
 assert.ok(!r.timeline);for(const text of ['[x, y, z]','scale','hex color','distinct','Place the character','Scene time','radius','integer'])assert.ok(r.error.message.includes(text),text);
});
test('reports unexecuted literal dependencies and multiple syntax errors',async()=>{
 const r=await run('s.spawn("room",[0,0,0]);',[{name:'room',source:'define.location("room",w=>{if(false){w.use("missing_a");w.row("missing_b",{});}})'}]);
 assert.match(r.error.message,/missing_a/);assert.match(r.error.message,/missing_b/);
 const syntax=await runStory('const a = ;\nconst b = ;');assert.deepEqual(syntax.issues.map(i=>i.line),[1,2]);
});
test('all styles and preset joints validate; animation checks surface static and extreme poses',async()=>{
 for(const style of Object.keys(silhouettes)){
  const r=await runStory('const a=character("Jin",{preset:"actor"});scene("s",{time:"day",location:"empty",duration:4},s=>{s.place(a,[0,0,0]);s.do(0,a,"bend");})',{library:[
   {name:'actor',source:'define.character("actor",{style:"'+style+'"})'},
   {name:'bend',source:'define.animation("bend",rig=>{rig.elbowL.rotation.x=3.8;rig.kneeR.rotation.x=.5})'}]});
  assert.equal(r.timeline.characters[0].style,style);
  const report=inspection(r.timeline.scenes[0],{min:[0,-1,0],max:[61,3,2]},400,4);
  for(const w of ['below ground','60 studs','400','4 or more lights','±3.2','No motion'])assert.ok(report.includes(w));
 }
 assert.ok(styleHeight('thin')>styleHeight('slim')&&styleHeight('chunky')<styleHeight('classic'));
 for(const [min,max,word] of [[0,.3,'Sits'],[2,2.2,'Floating']]){
  const msg=inspection({nodes:[],actions:[]},{min:[0,min,0],max:[.1,max,.1]},1,0);assert.match(msg,/Smaller/);assert.ok(msg.includes(word));
 }
 const nan=await run('s.place(a,[0,0,0]);s.do(0,a,"bad");',[{name:'bad',source:'define.animation("bad",rig=>{rig.kneeL.rotation.x=NaN})'}]);assert.ok(nan.error);
});
test('story spawn accepts degrees and preserves existing radian rot',async()=>{
 const r=await run('s.spawn("marker",[0,0,0],{rotate:90});s.spawn("marker",[1,0,0],{rot:[0,.7,0]});',[{name:'marker',source:'define.prop("marker",b=>b.box({}));'}]);
 assert.ok(!r.error,JSON.stringify(r.error));assert.deepEqual(r.timeline.scenes[0].nodes.filter(n=>n.kind==='group').map(n=>n.options.rot[1]),[Math.PI/2,.7]);
});
