import { box, oval } from './mesh.js';
import { addProp } from './props.js';

export function dressGround(g, place, ctx) {
  if (place === 'house_interior') return;
  const street = place === 'neighborhood_street', court = place === 'basketball_court';
  const w = street ? 50 : court ? 21 : 18;
  const z = street ? 13 : court ? 10.5 : 10;
  for (const side of [-1,1]) for (let i=0;i<8;i++) {
    const x = side*(w-1.6-(i%4)*2.4), dz = z+i*.89;
    const y = street ? -.075 : court ? -.054 : -.097;
    box(g,3.6+(i%3),.01,2.1,x,y,dz,i%2?'#6eaf77':'#83c08b');
    oval(g,.47,.38,.53,x,(i%3)*.07+.2,dz,'#519461');
    if(i%2) oval(g,.27,.15,.21,x-.56,.10,dz+.40,'#99a69e');
    else for(let j=0;j<3;j++){
      box(g,.034,.23,.034,x-.51+j*.22,.11,dz+.61,'#469960');
      oval(g,.08,.084,.075,x-.51+j*.22,.25,dz+.61,j%2?'#ed91c8':'#f4ce73');
    }
  }
  for(const side of [-1,1]) {
    addProp(g,'tree',[side*(w-2.2),0,z-1],{scale:.86},ctx);
    for(let i=0;i<7;i++){
      const x=side*(w-3.7)-(street ? side*5 : 0)+Math.sin(i*.6)*.76;
      oval(g,.83,.014,.66,x,.023,z+i*1.03,'#bb9d7c');
    }
  }
}
