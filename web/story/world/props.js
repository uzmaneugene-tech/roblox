import { T, beam, box, mesh, oval, panel } from './mesh.js';
const trim = '#293451';
const lit = (c, daytime = '#7fbed5') => c.dark ? '#ffda88' : daytime;
const rainbow = ['#ff747f', '#ffd360', '#62d9bb', '#779cf6', '#e98bdf'];
const cylinder = new T.CylinderGeometry(1, 1, 1, 12);
function pole(g, x, z, h, color = trim) { box(g, .19, h, .19, x, h / 2, z, color); }
function halo(g, c, x, y, z, size) {
  if (!c.dark) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32,32,1,32,32,31);
  gradient.addColorStop(0, c.night ? '#ffe295b5' : '#ffe29585');
  gradient.addColorStop(.35, '#ffd98a43');
  gradient.addColorStop(1, '#ffca7000');
  ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const flare = new T.Mesh(new T.PlaneGeometry(size,size),material);
  flare.userData.halo = true;
  flare.position.set(x,y,z); g.add(flare);
}
function point(g, c, x, y, z, power = 34) {
  if (!c.dark || c.glows >= 8) return;
  c.glows++;
  const light = new T.PointLight('#ffbd6e', c.night ? power * 1.5 : power, 16, 2);
  light.position.set(x, y, z); g.add(light);
}
export const propRegistry = {
  house(g, o, c) {
    box(g, 7, 4.6, 5.6, 0, 2.3, 0, o.color ?? '#f3a6a3');
    box(g, 7.14, .28, 5.7, 0, .15, 0, trim);
    const shape = new T.Shape();
    shape.moveTo(-3.92, 0); shape.lineTo(0, 2.05); shape.lineTo(3.92, 0); shape.closePath();
    mesh(g, new T.ExtrudeGeometry(shape, { depth: 6.1, bevelEnabled: false }), '#484c72', 0, 4.59, -3.05);
    for (const x of [-2.35, 2.35]) {
      box(g, 1.44, 1.49, .16, x, 2.73, 2.81, trim);
      box(g, 1.24, 1.29, .035, x, 2.73, 2.91, lit(c), c.dark);
      box(g, .095, 1.29, .04, x, 2.73, 2.945, '#fff0d9');
      box(g, 1.24, .09, .04, x, 2.73, 2.945, '#fff0d9');
    }
    propRegistry.door(g, { color: o.door }, c);
    box(g, 2.3, .23, .88, 0, .12, 3.12, '#ced3df');
    point(g, c, -2.35, 2.6, 3.32, 9);
  },
  tree(g, o) {
    box(g, .62, 3.6, .62, 0, 1.8, 0, '#9b6855');
    oval(g, 1.75, 1.98, 1.5, 0, 4, 0, o.color ?? '#439d68');
    oval(g, 1.15, 1.1, 1.15, -.98, 3.65, .16, '#54b578');
    oval(g, .95, 1.13, .96, .96, 4.03, -.22, '#6bc280');
  },
  lamp(g, o, c) {
    const color = o.color ?? trim;
    pole(g, 0, 0, 5.8, color);
    box(g, 1.26, .17, .19, .62, 5.65, 0, color);
    box(g, .71, .30, .58, 1.23, 5.49, 0, color);
    box(g, .58, .12, .46, 1.23, 5.28, 0, lit(c, '#fff2bd'), c.dark);
    point(g, c, 1.22, 5.13, 0);
    halo(g,c,1.23,5.29,0,c.night?2.1:1.44);
  },
  fence(g, o) {
    const color = o.color ?? '#ba8060';
    for (let i = -4; i <= 4; i++) box(g, .25, 1.65 + (i % 4 === 0 ? .24 : 0), .17, i * .48, .87, 0, color);
    for (const y of [.47, 1.28]) box(g, 4.16, .16, .10, 0, y, -.12, '#87594c');
  },
  car(g, o) {
    const color = o.color ?? '#fa657e';
    box(g, 2.9, .85, 4.6, 0, .83, 0, color);
    box(g, 2.38, .69, 2.58, 0, 1.56, -.33, color);
    box(g, 2.1, .49, .05, 0, 1.61, .982, '#466586');
    for (const x of [-1.23, 1.23]) {
      box(g, .045, .48, 2.29, x, 1.61, -.32, '#466586');
      for (const z of [-1.42, 1.42]) {
        const tire = mesh(g, cylinder, trim, x * 1.14, .55, z); tire.rotation.z = Math.PI / 2; tire.scale.set(.51, .37, .51);
        const hub = mesh(g, cylinder, '#d5deed', x * 1.30, .55, z); hub.rotation.z = Math.PI / 2; hub.scale.set(.26, .09, .26);
      }
      box(g, .41, .24, .07, x, .88, 2.31, '#fff1c0');
      box(g, .41, .22, .07, x, .88, -2.31, '#b73352');
    }
  },
  bleachers(g, o) {
    for (let i = 0; i < 4; i++) {
      const y = .52 + i * .52, z = -.65 * i;
      box(g, 9.8, .18, .62, 0, y, z, o.color ?? '#8298bb');
      for (const x of [-4.2, 0, 4.2]) box(g, .16, y, .22, x, y / 2, z, trim);
    }
    for (const x of [-4.75, 4.75]) beam(g,[x,.58,.2],[x,2.52,-2.2],.12,trim);
  },
  hoop(g, o) {
    pole(g, 0, -.35, 5, o.color ?? trim);
    box(g, 3.55, 2.05, .17, 0, 4.85, .02, trim);
    box(g, 3.33, 1.83, .04, 0, 4.85, .125, '#f1f6ff');
    box(g, 1.16, .66, .03, 0, 4.66, .153, '#ef7453');
    box(g, .95, .47, .032, 0, 4.68, .17, '#f1f6ff');
    const r = mesh(g, new T.TorusGeometry(.57,.055,6,18), '#ff724e', 0, 4.38, .76);
    r.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, b = a + .34;
      beam(g,[.55*Math.sin(a),4.34,.76+.55*Math.cos(a)],[.32*Math.sin(b),3.78,.76+.32*Math.cos(b)],.025,'#eef1ff');
      beam(g,[.55*Math.sin(a),4.34,.76+.55*Math.cos(a)],[.32*Math.sin(a-.34),3.78,.76+.32*Math.cos(a-.34)],.025,'#eef1ff');
    }
  },
  ball(g, o) {
    oval(g, .44,.44,.44,0,.44,0,o.color ?? '#eb8a39');
    for (const axis of [0, 1, 2]) {
      const seam = mesh(g,new T.TorusGeometry(.441,.011,5,20),trim,0,.44,0);
      if(axis===1) seam.rotation.x=Math.PI/2;
      if(axis===2) seam.rotation.y=Math.PI/2;
    }
  },
  banner(g, o) {
    panel(g, 10, 1.25, 0, 1.3, 0, o.text ?? 'SUMMER PARTY GAME', o.color ?? '#df527c');
  },
  bunting(g, o) {
    const h = x => 4.9 + .021 * x * x;
    for (let i = -6; i < 6; i++) {
      beam(g,[i,h(i),0],[i+1,h(i+1),0],.037,'#49465d');
      const s = new T.Shape(); s.moveTo(-.35,0); s.lineTo(.35,0); s.lineTo(0,-.66); s.closePath();
      const flag = mesh(g,new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:false}),o.color ?? rainbow[(i+6)%5],i+.5,h(i+.5),0);
      flag.rotation.z = .13 * Math.sin(i);
    }
  },
  string_lights(g, o, c) {
    const h = x => 4.65 + .020 * x * x;
    for (let i = -6; i < 6; i++) {
      beam(g,[i,h(i),0],[i+1,h(i+1),0],.035,trim);
      oval(g,.12,.17,.12,i+.5,h(i+.5)-.12,0,o.color ?? lit(c,'#fff1c7'),c.dark);
      halo(g,c,i+.5,h(i+.5)-.12,0,c.night?.80:.54);
      if(i % 5 === 0) point(g,c,i+.5,h(i+.5)-.2,0,14);
    }
  },
  balloons(g, o) {
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4, x = Math.cos(angle)*.73, z = Math.sin(angle)*.62, y = 3.6 + (i % 3) * .52;
      beam(g,[0,.13,0],[x,y-.42,z],.025,'#e5e5fa');
      oval(g,.41,.52,.39,x,y,z,o.color??rainbow[i]);
    }
  },
  cake_table(g, o) {
    box(g,4.5,.18,2.4,0,2.17,0,o.color??'#e47198');
    box(g,4.32,.63,2.22,0,1.79,0,'#ffbad0');
    for(const x of [-1.89,1.89]) for(const z of [-.87,.87]) box(g,.20,2,.20,x,1,z,'#79526e');
    for(const [i,r] of [.84,.66,.44].entries()){
      const cake=mesh(g,cylinder,i%2?'#ff89ac':'#fff1ce',0,2.42+i*.26,0);cake.scale.set(r,.26,r);
    }
    for(let i=0;i<7;i++) {
      const x=(i%2?1:-1)*(1.27+(i%3)*.29),z=(i%3-1)*.53;
      box(g,.30,.19,.30,x,2.35,z,'#b57c65'); oval(g,.18,.155,.18,x,2.50,z,rainbow[i%5]);
    }
    box(g,.075,.38,.075,0,3.20,0,'#fa799b');
    oval(g,.085,.14,.085,0,3.46,0,'#ffd269',true);
  },
  pool(g, o) {
    box(g,7,.43,4.65,0,.23,0,'#d2e5f3');box(g,6.47,.1,4.14,0,.47,0,o.color??'#52cbef');
    for(let i=0;i<6;i++) box(g,.6+(i%3)*.25,.012,.037,(i%3-1)*1.45,.529,i<3?-.81:.71,'#b6f1fb');
    for(const x of [-.29,.29]) {
      beam(g,[x,.32,2.06],[x,1.3,2.06],.07,'#748ba6');
      beam(g,[x,1.3,2.06],[x,1.3,2.5],.07,'#748ba6');
    }
    for(const y of [.59,.91,1.20]) box(g,.57,.07,.09,0,y,2.06,'#748ba6');
  },
  scoreboard(g,o,c) {
    for(const x of [-1.25,1.25]) pole(g,x,0,4.1);
    box(g,5.30,1.62,.25,0,4.06,0,trim);
    panel(g,5.05,1.36,0,4.05,.137,o.text??'HOME  50',o.color??'#223050',c.dark?'#ffdc79':'#fff1ae');
  },
  bench(g,o) {
    for(const x of [-1.14,1.14]) box(g,.17,1.03,.66,x,.515,0,trim);
    box(g,3.15,.18,1.14,0,1.05,0,o.color??'#a76c55');
    box(g,3.15,.55,.17,0,1.79,-.45,o.color??'#a76c55');
    for(const x of [-1.14,1.14])box(g,.14,.82,.14,x,1.47,-.45,trim);
  },
  door(g,o) {
    box(g,1.61,3.0,.15,0,1.50,2.81,trim);
    box(g,1.40,2.84,.10,0,1.43,2.93,o.color??'#557099');
    box(g,.16,.16,.12,.44,1.35,3.01,'#ffd484');
  },
  sign(g,o) {
    pole(g,0,0,2.6);
    box(g,3.23,.98,.10,0,2.45,0,trim);
    panel(g,3,.77,0,2.44,.058,o.text??'FRAMECUT',o.color??'#427b7e');
  },
};
export function addProp(parent, type, position, options = {}, context = { glows: 0 }) {
  if (!Object.hasOwn(propRegistry, type)) throw new Error('Unknown prop: ' + type);
  const group = new T.Group();
  group.position.set(...position);
  const rotation = options.rotate ?? 0;
  const rad = T.MathUtils.degToRad;
  if (Array.isArray(rotation)) group.rotation.set(...rotation.map(rad));
  else group.rotation.y = rad(rotation);
  if (Array.isArray(options.scale)) group.scale.set(...options.scale);
  else group.scale.setScalar(options.scale ?? 1);
  propRegistry[type](group,options,context);
  group.userData.solid=['house','car','bench'].includes(type);
  parent.add(group);
  return group;
}
