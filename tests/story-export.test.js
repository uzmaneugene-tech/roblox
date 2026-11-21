import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeTimelineFrames, exportPlan, exportName } from '../web/story/export-timing.js';
import { runStory } from '../web/story/sandbox.js';
import { locateScene } from '../web/story/timeline.js';

test('sandbox denies browser transports and static and dynamic imports', async () => {
  for (const source of [
    'fetch("https://example.invalid")', 'new XMLHttpRequest()', 'new WebSocket("wss://example.invalid")',
    'import "https://example.invalid/module.js"', 'import("https://example.invalid/module.js")',
    'document.body', 'localStorage.getItem("secret")',
  ]) {
    const result = await runStory(source);
    assert.ok(result.error, source);
    assert.equal(result.timeline,undefined,source);
  }
  const timeout=await runStory('while(true){}',{budget:50});
  assert.match(timeout.error.message,/time limit/);
});

test('API validates unsupported actions, options and time with source locations', async () => {
  const prefix='const jin=character("Jin");\nscene("Court",{location:"basketball_court",time:"dusk",duration:2},s=>{\n';
  for (const [source,message] of [
    ['s.do(0,jin,"run_up_wall")',/Valid values/],
    ['s.cam(0,"wide",{cut:"yes"})',/expected true or false/],
    ['s.say(1,jin,"Hello",{speed:0})',/Caption speed/],
    ['s.narrate(3,"Too late")',/Scene time/],
    ['s.light({intensity:-1})',/Light intensity/],
  ]) {
    const result=await runStory(prefix+source+'\n});');
    assert.match(result.error.message,message);
    assert.equal(result.error.line,3);
  }
});

test('130 seconds across 15 scenes maps to exactly 3900 ordered export frames', async () => {
  const source='for(let i=0;i<15;i++) scene("Set "+i,{location:"basketball_court",time:"day",duration:i===14?18:8},()=>{});';
  const {timeline}=await runStory(source);
  assert.equal(timeline.duration,130);
  assert.equal(locateScene(timeline,8).scene.id,'Set 1');
  assert.equal(locateScene(timeline,130).localTime,18);
  for(const height of [1280,1920]){
    const plan=exportPlan(timeline.duration,height);
    assert.equal(plan.frames,3900);
    const frames=[];
    await encodeTimelineFrames(plan,{
      signal:new AbortController().signal,draw(){},encode(t,d){frames.push([t,d]);},tick(){},yieldTask(){},
    });
    assert.equal(frames.length,3900);
    assert.deepEqual(frames[240],[8,1/30]);
    assert.deepEqual(frames.at(-1),[3899/30,1/30]);
  }
  assert.equal(exportPlan(.08,1280).frames,3);
  assert.equal(exportName('A/B: scene?','mp4'),'A-B- scene-.mp4');
  assert.throws(()=>exportPlan(600,1920),/720p/);
});

test('frame scheduler stops before drawing the next frame on cancel', async () => {
  const stop=new AbortController(), seen=[];
  await assert.rejects(encodeTimelineFrames(exportPlan(2,1280),{
    signal:stop.signal,draw:i=>seen.push(i),encode(){},tick:n=>{if(n===4)stop.abort();},yieldTask(){},
  }),{name:'AbortError'});
  assert.deepEqual(seen,[0,1,2,3]);
});
