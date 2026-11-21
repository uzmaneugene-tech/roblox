import test from 'node:test';
import assert from 'node:assert/strict';
import {faceBeat} from '../web/story/performance-face.js';
import {runStory} from '../web/story/sandbox.js';
test('speech and blink beats are seekable and specific to the performer',()=>{
 const lines=[{char:'a',t:0,text:'Hello there',speed:2}];
 assert.ok(faceBeat('a',.25,lines,'happy').mouth>0);
 assert.equal(faceBeat('b',.25,lines,'happy').mouth,0);
 assert.equal(faceBeat('a',1,lines,'sad').mouth,0);
 const beats=Array.from({length:600},(_,i)=>faceBeat('a',i/30,lines,'happy'));
 assert.ok(beats.filter((v,i)=>v.blink&&!beats[i-1]?.blink).length>=4);
 assert.deepEqual(faceBeat('a',.4,lines,'happy'),beats[12]);
});
test('scene look is validated before preview and export',async()=>{
 const code=opts=>'const a=character("A");scene("Look",{location:"empty",duration:1,time:"day"},s=>{s.grade("cold_night");s.dof('+opts+');});';
 assert.equal((await runStory(code('{focus:a,amount:.3}'))).timeline.scenes[0].grade,'cold_night');
 assert.ok((await runStory(code('{focus:a,amount:2}'))).error);
});
