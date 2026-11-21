import test from 'node:test';
import assert from 'node:assert/strict';
import {Euler,Matrix4} from 'three';
import {frame,toData,modules,project,LIMIT} from '../web/format.js';
const p={format:'framecut-1',shots:[{name:'Shot1',caption:'',duration:2,position:[1,3,-2],rotation:[30,-45,88],fov:50,shake:0,transition:'Fade'}]};
test('Roblox row order matches Three camera basis for combined rotations',()=>{
 const m=new Matrix4().makeRotationFromEuler(new Euler(...p.shots[0].rotation.map(n=>n*Math.PI/180))).elements;
 assert.deepEqual(frame(p.shots[0]),[1,3,-2,...[0,4,8,1,5,9,2,6,10].map(i=>+m[i].toFixed(4))]);
});
test('invalid input rejected before export',()=>{
 assert.throws(()=>project({...p,shots:[...p.shots,...p.shots]}),/duplicate/);
 assert.throws(()=>project({...p,shots:[{...p.shots[0],duration:null}]}),/Duration/);
 const d=toData(p);d.shots[0].path[0].cf=[1];assert.throws(()=>modules(d),/CFrame/);
});
test('safe Luau strings and bounded split for a single large track',()=>{
 const d=toData(p);d.shots[0].caption='🎬"\\\n';const pose=d.shots[0].path[0];
 d.objects=[{name:'Cube',path:Array.from({length:6000},(_,t)=>({...pose,t})),visibility:[{t:0,value:1}]}];
 const out=modules(d);assert.ok(out['Part2.lua']);assert.ok(out['CutsceneData.lua'].includes('require'));
 assert.ok(Object.values(out).every(s=>s.length<=LIMIT));assert.match(out['Part1.lua'],/\\240\\159\\142\\172\\034\\092\\010/);
 assert.ok(Object.values(out).join('').includes('.visibility[1]={t=0,value=1}'));
});
