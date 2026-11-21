import * as T from './vendor/three.module.min.js';
import { decal, makeAvatar, part, SLIM } from './slim-avatar.js';
import { softwarePreview } from './software-preview.js';

import {bodyScale} from './library/validate.js';
const angles = {
  front: [0, .18, 1],
  side: [1, .18, 0],
  back: [0, .18, -1],
  'three-quarter': [.64, .29, 1],
};
const palette = { light: '#f1c9a5', medium: '#b77e57', dark: '#6c432f' };
function color(value, fallback) {
  if (!value) return fallback;
  const resolved = palette[value.toLowerCase()] ?? value;
  return CSS.supports('color', resolved) ? resolved : fallback;
}
function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return { texture, paint: (...args) => { ctx.clearRect(0, 0, width, height); draw(ctx, ...args); texture.needsUpdate = true; } };
}
function hairColor(value) {
  if (!value) return undefined;
  const style = value.toLowerCase();
  if (style.includes('blond')) return '#ca9658';
  if (style.includes('brown')) return '#694530';
  if (style.includes('red')) return '#8f4030';
  return color(value, undefined);
}

export function buildAvatar(spec) {
  const outfit = spec.outfit ?? {};
  const options = {
    skin: color(spec.skin, undefined),
    shirt: color(outfit.shirt, undefined),
    pants: color(outfit.pants, undefined),
    shoes: color(outfit.shoes, undefined),
    hair: hairColor(spec.hair),
  };
  const model = makeAvatar(Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)));
  const { head, torso } = model.parts;
  const [hw, hh] = SLIM.head;
  model.group.scale.fromArray(bodyScale[spec.body??'slim']);
  const extras=spec.accessories??[],style=spec.hair;
  const attach=(parent,w,h,d,col,x,y,z)=>{const piece=part(w,h,d,col);piece.position.set(x,y,z);parent.add(piece);return piece;};
  if(['short','long','bald','cap','mohawk'].includes(style)){
    model.hairPieces.forEach(p=>p.visible=false);
    if(style!=='bald')attach(head,style==='mohawk'?.34:1.32,style==='mohawk'?.67:.32,1.18,style==='cap'?'#38608c':'#23232a',0,.61,0);
    if(style==='long')for(const x of [-.55,.55])attach(head,.3,1.28,1,'#23232a',x,.02,-.12);
    if(style==='cap')attach(head,1.43,.13,.62,'#314f77',0,.51,.66);
  }
  for(const a of extras){
    if(a==='glasses'||a==='sunglasses'){
      for(const x of [-.28,.28]){attach(head,.51,.34,.06,'#243547',x,.06,.59);if(a==='glasses')attach(head,.38,.21,.035,'#a7c9d3',x,.06,.64);}
      attach(head,.17,.06,.07,'#243547',0,.08,.59);
    }else if(a==='crown'){attach(head,1.4,.23,1.26,'#f7bd51',0,.91,0);for(const x of [-.54,0,.54])attach(head,.18,.33,.18,'#ffe08b',x,1.12,.49);}
    else if(a==='headphones'){attach(head,1.49,.15,.29,'#425a70',0,.91,0);for(const x of [-.71,.71])attach(head,.26,.72,.5,'#24354e',x,.28,0);}
    else if(a==='tie'||a==='suit'){if(a==='suit')for(const x of [-.57,.57])attach(torso,.47,1.94,.84,'#283649',x,0,0);
      attach(torso,.22,.96,.085,'#a54858',0,.26,.45);}
    else if(a==='backpack')attach(torso,1.38,1.6,.62,'#875848',0,0,-.64);
  }
  const hat = outfit.hat?.toLowerCase() || extras.find(a=>a==='beanie'||a==='party_hat') || '';
  if (hat.includes('beanie')) {
    const crown = part(hw + .22, .40, SLIM.head[2] + .25, '#bd527a');
    crown.position.y = hh / 2 + .53;
    const brim = part(hw + .31, .17, SLIM.head[2] + .32, '#96395e');
    brim.position.y = hh / 2 + .34;
    head.add(crown, brim);
  } else if (hat.includes('party')) {
    const cone = new T.Mesh(new T.ConeGeometry(.32, .66, 16), new T.MeshStandardMaterial({ color: '#fa7394', roughness: .55 }));
    cone.position.set(.12, hh / 2 + .86, .04);
    const tip = part(.115, .115, .115, '#ffe27a');
    tip.position.set(.12, hh / 2 + 1.23, .04);
    head.add(cone, tip);
  }
  if (outfit.shirtText) {
    const text = decal(ctx => {
      ctx.font = '900 59px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#242c40';
      ctx.strokeText(outfit.shirtText, 128, 128, 230);
      ctx.fillStyle = '#fff';
      ctx.fillText(outfit.shirtText, 128, 128, 230);
    }, SLIM.torso[0] * .89, .47, SLIM.torso[2] / 2 + .024);
    text.position.y = -.21;
    torso.add(text);
  }
  return model;
}

function dispose(root) {
  const found = new Set();
  root.traverse(node => {
    if (node.geometry) found.add(node.geometry);
    if (node.material) {
      found.add(node.material);
      if (node.material.map) found.add(node.material.map);
    }
  });
  for (const item of found) item.dispose();
}

export function createAvatarView(canvas, { closeUp = false } = {}) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
  const renderer = context && new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  const paint = renderer ? null : softwarePreview(T, canvas);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const focus = new T.Vector3(0, closeUp ? 4.97 : 2.92, 0);
  camera.userData.focus = focus;
  const key = new T.DirectionalLight('#fff4e8', 2.05);
  key.position.set(-4, 7, 6);
  const fill = new T.DirectionalLight('#dfecff', 1.05);
  fill.position.set(5, 3, 4);
  const rim = new T.DirectionalLight('#f3f7ff', 1.75);
  rim.position.set(1, 5, -5);
  scene.add(key, fill, rim, new T.HemisphereLight('#ffffff', '#a7aab9', 1.35));

  const shadow = canvasTexture(128, 128, ctx => {
    const gradient = ctx.createRadialGradient(64, 64, 7, 64, 64, 63);
    gradient.addColorStop(0, '#29334778');
    gradient.addColorStop(1, '#29334700');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
  shadow.paint();
  const floorShadow = new T.Mesh(new T.PlaneGeometry(4.9, 3.5), new T.MeshBasicMaterial({
    map: shadow.texture, transparent: true, depthWrite: false,
  }));
  floorShadow.userData.shadow = true;
  floorShadow.rotation.x = -Math.PI / 2;
  scene.add(floorShadow);

  let current, model;
  function render() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      if (renderer) renderer.setSize(pixelWidth, pixelHeight, false);
      else { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    }
    const aspect = width / height;
    const halfW = closeUp ? Math.max(.94, 1.05 * aspect) : Math.max(1.64, (focus.y + .26) * aspect);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfW / aspect;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    if (renderer) renderer.render(scene, camera);
    else paint(scene, camera);
  }
  function show(spec, angle, expression) {
    if (spec !== model) {
      if (current) {
        scene.remove(current.group);
        dispose(current.group);
      }
      current = spec ? buildAvatar(spec) : null;
      model = spec;
      if (current) scene.add(current.group);
    }
    current?.setFace(expression);
    if (!closeUp) focus.y = spec?.outfit?.hat?.toLowerCase().includes('party') ? 3.24 : 2.92;
    camera.position.fromArray(angles[angle] ?? angles['three-quarter']).normalize().multiplyScalar(12).add(focus);
    camera.lookAt(focus);
    render();
  }
  new ResizeObserver(render).observe(canvas);
  show(null, 'three-quarter', 'happy');
  return { show };
}
