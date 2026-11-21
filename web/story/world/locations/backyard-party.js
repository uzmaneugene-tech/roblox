import { box, oval, shadow } from '../mesh.js';
import { addProp } from '../props.js';
export function backyardParty(g, c) {
  const p=(name,position,opts)=>addProp(g,name,position,opts,c);
  box(g,65,.5,85,0,-.35,23,'#70ba7d');
  const lawn=['#7ec488','#74bd81'];
  for(let i=0;i<8;i++)box(g,4,.028,21,(i-3.5)*4,-.075,2,lawn[i%2]);
  p('house',[-4,0,-8.8],{color:'#f6c1a1',scale:[1.75,1.15,1.12]});
  box(g,15,.22,6,-4,.03,-3.72,'#ddc7b9');
  for(let i=0;i<20;i++)box(g,.021,.025,5.97,-11.1+i*.73,.153,-3.72,'#bfa898');
  for(let x=-15;x<=15;x+=4.10)p('fence',[x,0,-11.8]);
  for(const x of [-16,16])for(let z=-9.9;z<=10;z+=4.12)p('fence',[x,0,z],{rotate:90});
  for(const [x,z] of [[-11,4],[8,4],[-11,-5],[8,-5]]){
    box(g,.18,5.7,.18,x,2.85,z,'#7d5960');
  }
  for (const z of [-5,4]) {
    p('string_lights',[-1.5,0,z],{scale:[1.58,1,1]});
    if(z===-5)p('bunting',[-1.5,.15,z+.32],{scale:[1.55,1,1]});
  }
  shadow(g,-4,3,7,4);p('cake_table',[-4,.03,3]);
  p('balloons',[-7.13,0,2.02]);p('balloons',[.1,0,1.28],{scale:.86});
  p('pool',[7,0,2.8],{scale:1.2});p('bench',[9,0,-3.8]);
  p('sign',[-9.8,0,6],{text:'PARTY TIME!',color:'#e06d99'});
  for(const [x,z,s] of [[-13,-9,1.5],[12,-9,1.2],[16,-12,1.5],[-17,0,1.2]])p('tree',[x,0,z],{scale:s});
  for(let i=0;i<7;i++)oval(g,.3,.24,.3,-14+i*.75,.19,7.2,i%2?'#f5a5c9':'#ffe18a');
  return {focus:[-1.2,2,0],jin:[.5,0,6.6],view:[.39,.37,1],span:32};
}
