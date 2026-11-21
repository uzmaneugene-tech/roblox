import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runStory } from '../web/story/sandbox.js';
import { example } from '../web/story/example.js';
import { originalActions, shots } from '../web/story/registry.js';
import { compileMotion, captionAt } from '../web/story/motion.js';
import { compileCamera } from '../web/story/shots.js';

test('sample authors every original action and shot exactly once through the sandbox', async () => {
  const { timeline } = await runStory(example);
  const scene = timeline.scenes[0];
  assert.deepEqual(scene.actions.map(e=>e.action).sort(), [...originalActions].sort());
  assert.deepEqual(scene.cameras.map(e=>e.shot).sort(), [...shots].sort());
  assert.equal(scene.cameras[4].opts.cut, true);
  assert.equal(scene.captions[0].speed, 1);
});

test('motion seeks reproducibly, preserving position at an interrupted move', () => {
  const moving = {action:'walk_to',t:0,arg:[8,0,0]};
  const first = compileMotion([0,0,0],[moving]);
  const interrupted = compileMotion([0,0,0],[moving,{action:'wave',t:1.2}]);
  assert.deepEqual(interrupted(1.2).pos, first(1.2).pos);
  const crouch = compileMotion([0,0,0],[{action:'sit',t:1}]);
  assert.equal(crouch(1).low,0);
  assert.ok(crouch(2).rot.legL[0] < -1.2);
  const hoop=[9,6,0];
  const shot=compileMotion([0,0,0],[{action:'shoot_ball',t:1}],[hoop]);
  assert.ok(shot(2.12).ball[1]>hoop[1]);
  shot(2.57).ball.forEach((n,i)=>assert.ok(Math.abs(n-hoop[i])<.01));
});

test('camera starts an eased shot on previous view and applies hard cuts immediately', () => {
  const opts = x => ({from:[x,4,10],look:[0,2,0]});
  const track=compileCamera([
    {t:0,shot:'wide',opts:opts(0)},
    {t:1,shot:'close_up',opts:{...opts(8),ease:1}},
    {t:3,shot:'low_angle',opts:{...opts(16),cut:true}},
  ],()=>({pos:[0,0,0],yaw:0,low:0}),()=>0);
  assert.equal(track(1).from[0],0);
  assert.equal(track(1.5).from[0],4);
  assert.equal(track(2).from[0],8);
  assert.equal(track(3).from[0],16);
});

test('captions expose one label-free word and honor speed', () => {
  const lines=[{t:1,text:'One two',speed:2,char:'character:0'}];
  assert.equal(captionAt(lines,.99),null);
  assert.equal(captionAt(lines,1.49).word,'One');
  assert.equal(captionAt(lines,1.5).word,'two');
  assert.equal(captionAt(lines,2),null);
});
