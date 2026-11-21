import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runStory} from '../web/story/sandbox.js';
import {locateScene} from '../web/story/timeline.js';
import {compileClock,sfxNames,ambienceNames,musicNames,fxNames,transitions,weatherNames,extraActions} from '../web/story/phase-two.js';
import {phaseTwoSample} from '../web/story/phase-two-sample.js';
import {renderSceneAudio} from '../web/story/sound.js';
import {compileItems} from '../web/story/action-poses.js';

test('sample exercises all Phase 2 choices and compiles a retimed timeline',async()=>{
  const result=await runStory(phaseTwoSample);
  assert.equal(result.error,undefined,JSON.stringify(result.error));
  const {scenes,duration}=result.timeline;
  assert.equal(duration,72.6);
  for(const [names,used] of [
    [sfxNames,scenes.flatMap(s=>s.sounds.map(e=>e.name))],
    [ambienceNames,scenes.map(s=>s.ambience.name)],
    [musicNames,scenes.map(s=>s.music.name)],
    [fxNames,scenes.flatMap(s=>s.effects.map(e=>e.name))],
    [transitions,scenes.flatMap(s=>s.transitions.map(e=>e.name))],
    [weatherNames,scenes.map(s=>s.weather)],
    [extraActions,scenes.flatMap(s=>s.actions.map(e=>e.action))]
  ])for(const name of names)assert.ok(used.includes(name),'sample is missing '+name);
  assert.equal(locateScene(result.timeline,4).localTime,3.5);
  assert.ok(scenes.some(s=>s.weather==='storm'&&s.sounds.some(e=>e.name==='thunder')));
});
test('retiming maps sound onset to the same output time as animation, and supports freeze',()=>{
  const setup=compileClock(3,[{t:1,length:1,rate:.5},{t:2.3,length:.4,rate:0}]);
  const scene={start:0,duration:setup.duration,clock:setup.spans,sounds:[{t:1.5,name:'buzzer'}]};
  assert.ok(Math.abs(scene.duration-4.4)<1e-9);
  const timeline={scenes:[scene],duration:scene.duration};
  assert.equal(locateScene(timeline,2).localTime,1.5);
  assert.equal(locateScene(timeline,3.5).localTime,2.3);
  const data=new Float32Array(22000);
  renderSceneAudio(scene,data,5000);
  assert.ok(data.slice(0,10000).every(s=>s===0));
  assert.ok(data.slice(10000,10500).some(s=>Math.abs(s)>.02));
  assert.ok(data.slice(16500,18500).every(s=>s===0));
  assert.throws(()=>compileClock(3,[{t:1,length:1,rate:.5},{t:1.5,length:1,rate:0}]),/cannot overlap/);
});
test('held items can be sought across the handoff',()=>{
  const lookup=compileItems([{action:'pick_up',char:'first',arg:'cup',t:1},{action:'give',char:'first',arg:'next',t:2}]);
  assert.equal(lookup('first',1.2),null);
  assert.equal(lookup('first',2),'cup');
  assert.equal(lookup('next',2),null);
  assert.equal(lookup('next',2.54),'cup');
  assert.equal(lookup('first',2.54),null);
});
