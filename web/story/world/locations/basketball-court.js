import { T, box, mesh } from '../mesh.js';
import { addProp } from '../props.js';
export function basketballCourt(g,c) {
  const p=(name,position,opts)=>addProp(g,name,position,opts,c);
  box(g,85,.50,105,0,-.31,24,'#76b280');
  box(g,32,.12,17.8,0,-.012,0,'#42577f');
  box(g,31,.07,16.8,0,.062,0,'#467ec0');
  const line='#fcf5e7', y=.106;
  for(const z of [-7.94,7.94])box(g,30.1,.014,.12,0,y,z,line);
  for(const x of [-15.05,0,15.05])box(g,.12,.014,15.87,x,y,0,line);
  function arc(x,r,a,b) {
    const t = mesh(g,new T.TorusGeometry(r,.054,5,58,b-a),line,x,y,0);
    t.rotation.set(-Math.PI/2,0,-a);
  }
  arc(0,2.15,0,Math.PI*2);
  for(const side of [-1,1]){
    box(g,5.3,.013,5.22,side*12.32,y-.005,0,'#3265a7');
    for(const z of [-2.59,2.59])box(g,5.4,.02,.087,side*12.37,y,z,line);
    box(g,.10,.018,5.21,side*9.66,y,0,line);
    arc(side*9.64,2.6,side===1 ? Math.PI/2 : -Math.PI/2,side===1 ? Math.PI*1.5 : Math.PI/2);
    p('hoop',[side*14.45,.10,0],{rotate:-side*90,scale:1.5});
  }
  for(const [x,z,r] of [[-15.8,-9.25,0],[15.8,-9.25,180],[-16,8.9,0],[16,8.9,180]])p('lamp',[x,0,z],{rotate:r,scale:1.25});
  p('bleachers',[-6,0,-11.3]);p('scoreboard',[9.8,0,-11.5],{text:'HOME 50',scale:1.5});
  p('banner',[-6,1.45,-10.1],{text:'SUMMER PARTY GAME',scale:1.5});
  p('bunting',[-6,0,-10.8],{scale:[1.22,1,1]});
  p('string_lights',[0,.25,-12.5],{scale:[2.1,1,1]});
  p('ball',[3,.10,2.2]);p('bench',[10,0,-10.15]);
  for(const z of [3.8,5.6]) {
    for(const x of [16.8,18.8])box(g,.12,1.15,.12,x,.57,z,'#314268');
    box(g,2.42,.14,.52,17.8,1.02,z,'#7185a5');
    for(const x of [17.06,17.76,18.46])p('ball',[x,1.09,z],{scale:.62});
  }
  box(g,.95,.74,.79,13,.41,-10,'#f3ecdc');
  box(g,.98,1.12,.83,13,1.24,-10,'#4ecbe6');
  box(g,1.02,.17,.88,13,1.87,-10,'#f8ecdc');
  box(g,.18,.13,.22,13,1.04,-9.51,'#647a9c');
  for(let x=-18;x<=18;x+=4.14)p('fence',[x,0,-14.1],{color:'#8f9da8',scale:[1,1.15,1]});
  for(const x of [-18,18])for(let z=-12;z<=8;z+=4.12)p('fence',[x,0,z],{rotate:90,color:'#8f9da8'});
  for(const [i,x] of [-17,-7,3,13].entries())p('house',[x,0,-20.4],{color:['#e89491','#9fc1e5','#e9be83','#bfa1df'][i],scale:.92});
  for(const [x,z] of [[-19,-12],[19,-10],[21,-22],[-23,-19]])p('tree',[x,0,z],{scale:1.1});
  return {focus:[0,2.0,-3.3],jin:[-3,.10,3.65],view:[.36,.46,1],span:49, hoops:[[-13.31,6.67,0],[13.31,6.67,0]]};
}
