import { box, oval, shadow } from '../mesh.js';
import { addProp } from '../props.js';
export function neighborhoodStreet(g, c) {
  const p = (name, position, opts) => addProp(g, name, position, opts, c);
  box(g, 126, .6, 120, 0, -.38, 29.5, '#70b778');
  box(g, 104, .12, 9.4, 0, -.04, 4, '#4d5773');
  for (let x = -49; x < 50; x += 4) box(g, 2.4, .016, .16, x, .031, 4, '#ffe48d');
  for (const z of [-1.1, 9.1]) {
    box(g, 104, .23, 1.58, 0, -.04, z, '#c3d1de');
    for(let x=-45;x<46;x+=3)box(g,.036,.016,1.51,x,.085,z,'#9caec1');
  }
  for (const [x,z] of [[-18,-2.1],[0,-2.1],[18,-2.1],[-9,10.4],[11,10.4]]) p('lamp', [x,0,z]);
  const colors = ['#fa9591','#f7cc83','#8bdad2','#b7a6ec','#f6a8cb','#9fcaf1'];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 8.7;
    p('house', [x,0,-10], { color: colors[i] });
    box(g, 1.65,.04,5.2,x,.022,-4.42,'#d9dccf');
    p('fence',[x + 3.0,0,-5.72],{scale:[.57,.64,1]});
  }
  for (const [x,z,s] of [[-28,-5,1.25],[-21,-6,.66],[-5,-6,.66],[9,-5,.70],[26,-7,1.04],[-22,13,1.1],[22,15,.9]]) p('tree',[x,0,z],{scale:s});
  for(const [x,z,color] of [[-13,1.34,'#f36c87'],[2,7.1,'#58d0c6'],[16,1.35,'#eec065']]){
    shadow(g,x,z,5.7,3.2);p('car',[x,.03,z],{color,rotate:90});
  }
  p('sign',[-23,0,-2.65],{text:'SUNSET LANE',scale:.86});
  for (let i=0; i<10; i++) oval(g, 11,5+(i%4)*1.65,9,(i-4.5)*11,-.8,-26-(i%2)*5,i%2?'#7999a1':'#6d9e94');
  return { focus: [0, 2.1, -2.8], jin: [5, .08, 9.15], view: [.32, .30, 1], span: 52 };
}
