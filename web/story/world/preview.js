import { T, batch, shadow } from './mesh.js';
import { locationRegistry } from './locations/index.js';
import { softwarePreview } from '../software-preview.js';
import { dressGround } from './polish.js';
import { buildAvatar } from '../avatar-view.js';

export const presets = {
  day: { sky: ['#68b9f2','#e5f8fc'], fog: [175,218,238], exposure: [1.08,1.09,1.10], key: '#fff2d6', fill: '#d4ebff', power: 2.3 },
  dusk: { sky: ['#645da4','#f29bae','#ffc790'], fog: [143,112,153], exposure: [.94,.81,.91], key: '#ffd2ad', fill: '#b8a5e9', power: 1.52 },
  night: { sky: ['#111b41','#303c72','#67719e'], fog: [45,55,98], exposure: [.48,.55,.75], key: '#6688dc', fill: '#7f99e4', power: .95 },
};
const title = {
  neighborhood_street: 'Neighborhood street', backyard_party: 'Backyard party',
  basketball_court: 'Basketball court', house_interior: 'House interior',
};
function skyLights(time) {
  const sun = time === 'day' ? [82,16,2.7,'#fff3a6','#fff0b644',6.3]
    : time === 'dusk' ? [81,28,2,'#ffd995','#ffc09e44',6.1]
    : [82,16,2.1,'#e1edff','#a7c5fd22',4.5];
  const stars = time === 'night'
    ? Array.from({length:35},(_,i)=>[(i*71+17)%97,(i*23+3)%55,i%3?'#ccd7ff':'#fff7da']) : [];
  return { sun, stars };
}
export function sky(time, preset) {
  const { sun: [x,y,r,center,halo,outer], stars } = skyLights(time);
  const lights = stars.map(([sx,sy,color]) =>
    'radial-gradient(circle at '+sx+'% '+sy+'%, '+color+' 0 1px, transparent 1.7px)');
  return ['radial-gradient(circle at '+x+'% '+y+'%, '+center+' 0 '+r+'%, '+halo+' '+(r+.2)+'%, transparent '+outer+'%)',
    ...lights, 'linear-gradient(180deg,'+preset.sky.join(',')+')'].join(',');
}
export function paintSky(ctx, time, width, height) {
  const preset = presets[time];
  const tint = ctx.createLinearGradient(0,0,0,height);
  preset.sky.forEach((color,i)=>tint.addColorStop(i/(preset.sky.length-1),color));
  ctx.fillStyle=tint;ctx.fillRect(0,0,width,height);
  const {sun:[x,y,r,center,halo,outer],stars}=skyLights(time);
  for(const [sx,sy,color] of stars) {
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(width*sx/100,height*sy/100,width/420,0,2*Math.PI);ctx.fill();
  }
  const px=width*x/100, py=height*y/100, radius=Math.hypot(Math.max(px,width-px),Math.max(py,height-py))/100;
  const glow=ctx.createRadialGradient(px,py,0,px,py,outer*radius);
  glow.addColorStop(0,center);glow.addColorStop(r/outer,center);
  glow.addColorStop((r+.2)/outer,halo);glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.fillRect(px-outer*radius,py-outer*radius,2*outer*radius,2*outer*radius);
}
function destroy(root, shared) {
  const disposed = new Set();
  root?.traverse(mesh => {
    if (!mesh.isMesh) return;
    disposed.add(mesh.geometry);
    if (mesh.material.map) {
      disposed.add(mesh.material.map);
      disposed.add(mesh.material);
    } else if (!shared) disposed.add(mesh.material);
  });
  for (const item of disposed) item.dispose();
}
export function createLocationView(canvas) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
  const renderer = context && new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  const paint = renderer ? null : softwarePreview(T, canvas);
  const scene = new T.Scene(), camera = new T.OrthographicCamera(-1,1,1,-1,.1,210);
  const focus = new T.Vector3();
  camera.userData.focus = focus;
  const sun = new T.DirectionalLight('#fff2d6', 2), fill = new T.HemisphereLight('#d4ebff','#8c7893',1.2);
  const edge = new T.DirectionalLight('#decbfb',.8);
  sun.position.set(-26,38,22); edge.position.set(18,14,-26);
  scene.add(sun,fill,edge);
  const jin = buildAvatar({name:'Jin'});
  scene.add(jin.group);
  let settings, world, yaw, pitch, angle = 'overview', preset, raf = 0;
  const eye = new T.PerspectiveCamera(52,1,.1,210);
  const face = new T.Quaternion(), inv = new T.Quaternion();
  let halos = [];
  function draw() {
    raf = 0;
    if (!settings) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = renderer ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1200 / bounds.width);
    const width = Math.round(bounds.width*ratio), height = Math.round(bounds.height*ratio);
    if (canvas.width !== width || canvas.height !== height) {
      if (renderer) renderer.setSize(width,height,false);
      else { canvas.width=width; canvas.height=height; }
    }
    const aspect = width/height;
    const w = settings.span * .5 * Math.max(1, aspect / 1.62);
    const h = w / aspect;
    camera.left=-w; camera.right=w; camera.top=h; camera.bottom=-h;
    camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(78).add(focus);
    camera.lookAt(focus); camera.updateProjectionMatrix();
    const active = angle === 'eye' ? eye : camera;
    if (active === eye) {
      eye.aspect=aspect;
      const reach = settings.span * .43;
      eye.position.set(focus.x+Math.sin(yaw)*reach,1.5,focus.z+Math.cos(yaw)*reach);
      eye.userData.focus = focus;
      eye.lookAt(focus.x,1.42+(pitch-.41)*4,focus.z);
      eye.updateProjectionMatrix();
    }
    active.getWorldQuaternion(face);
    for (const glow of halos) glow.quaternion.copy(glow.parent.getWorldQuaternion(inv).invert()).multiply(face);
    if (renderer) renderer.render(scene,active);
    else paint(scene,active);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
  function reset() {
    yaw = Math.atan2(settings.view[0],settings.view[2]);
    pitch = Math.atan2(settings.view[1],Math.hypot(settings.view[0],settings.view[2]));
    schedule();
  }
  function show(location,time) {
    preset=presets[time] ?? presets.day;
    if (world) { scene.remove(world); destroy(world,true); }
    world = new T.Group();
    const ctx={ dark: time!=='day',night: time==='night',glows:0 };
    settings = locationRegistry[location](world,ctx);
    dressGround(world,location,ctx);
    shadow(world,settings.jin[0],settings.jin[2],3.8,2.7);
    batch(world);
    scene.add(world);
    halos = []; world.traverse(item => { if (item.userData.halo) halos.push(item); });
    jin.group.position.set(...settings.jin); jin.group.rotation.y = .11;
    focus.set(...settings.focus);
    scene.userData.world = preset;
    const fog = new T.Color('rgb('+preset.fog.join(',')+')');
    scene.fog = new T.Fog(fog,89,165);
    sun.color.set(preset.key); sun.intensity=preset.power;
    fill.color.set(preset.fill); fill.intensity=time==='night'?.75:1.48;
    edge.intensity=time==='night'?.66:.83;
    canvas.style.backgroundImage=sky(time,preset);
    canvas.setAttribute('aria-label', title[location]+' at '+time+', with Jin for scale');
    reset();
  }
  function orbit(dx,dy) {
    yaw -= dx*.008; pitch = T.MathUtils.clamp(pitch+dy*.006,.06,1.28); schedule();
  }
  let pointer;
  canvas.addEventListener('pointerdown', e => {
    if (pointer) return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if(pointer?.id!==e.pointerId) return;
    orbit(e.clientX-pointer.x,e.clientY-pointer.y);
    pointer.x=e.clientX;pointer.y=e.clientY;
  });
  for(const type of ['lostpointercapture','pointercancel','pointerup']) canvas.addEventListener(type, e => { if(pointer?.id===e.pointerId) pointer=null; });
  canvas.addEventListener('keydown', e => {
    const moves={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,24],ArrowDown:[0,-24]};
    if (!Object.hasOwn(moves,e.key)) return;
    e.preventDefault();orbit(...moves[e.key]);
  });
  new ResizeObserver(schedule).observe(canvas);
  return {show,reset,setAngle(value){angle=value;reset()}};
}

export function startLocationPreview() {
  const view=createLocationView(document.getElementById('location-canvas'));
  const select=document.getElementById('location-name'), time=document.getElementById('location-time');
  const update=()=>view.show(select.value,time.value);
  select.append(...Object.keys(locationRegistry).map(id=>new Option(title[id],id)));
  select.addEventListener('change',update); time.addEventListener('change',update);
  document.getElementById('location-reset').addEventListener('click',view.reset);
  document.getElementById('location-angle').addEventListener('change', event=>view.setAngle(event.target.value));
  update();
}
