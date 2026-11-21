import * as T from '../vendor/three.module.min.js';
export { T };
const materials = new Map();
const cube = new T.BoxGeometry();
const sphere = new T.SphereGeometry(1, 12, 8);
export function material(color, glow = false) {
  const id = color + ':' + glow;
  if (!materials.has(id)) materials.set(id, glow
    ? new T.MeshBasicMaterial({ color })
    : new T.MeshStandardMaterial({ color, roughness: .88 }));
  const value=materials.get(id);if(glow)value.userData.windowGlow=true;
  return value;
}
export function mesh(parent, geometry, color, x, y, z, glow = false) {
  const item = new T.Mesh(geometry, material(color, glow));
  item.position.set(x, y, z);
  parent.add(item);
  return item;
}
export function box(parent, w, h, d, x, y, z, color, glow = false) {
  const item = mesh(parent, cube, color, x, y, z, glow);
  item.scale.set(w, h, d);
  return item;
}
export function oval(parent, w, h, d, x, y, z, color, glow = false) {
  const item = mesh(parent, sphere, color, x, y, z, glow);
  item.scale.set(w, h, d);
  return item;
}
export function beam(parent, from, to, width, color, glow = false) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to);
  const mid = a.clone().lerp(b, .5);
  const item = box(parent, width, a.distanceTo(b), width, ...mid, color, glow);
  item.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
  return item;
}
export function panel(parent, w, h, x, y, z, text, background, foreground = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, 502, 118);
  ctx.fillStyle = foreground; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 66px system-ui, sans-serif'; ctx.fillText(text, 256, 66, 477);
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
  const result = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
  result.position.set(x, y, z); parent.add(result); return result;
}
export function shadow(parent, x, z, w, d) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, '#19203065'); gradient.addColorStop(1, '#19203000');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(c);
  const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  m.position.set(x, .07, z); m.rotation.x = -Math.PI / 2; parent.add(m);
}
// Flatten same-material static meshes into a single draw call without merging signs or lights.
export function batch(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), normalTransform = new T.Matrix3(), v = new T.Vector3();
  root.traverse(m => {
    if (!m.isMesh || m.material.map) return;
    const { position, normal } = m.geometry.attributes;
    const index = m.geometry.index;
    const list = buckets.get(m.material) ?? { positions: [], normals: [], indices: [], sources: [] };
    buckets.set(m.material, list);
    normalTransform.getNormalMatrix(m.matrixWorld);
    const offset = list.positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(m.matrixWorld); list.positions.push(v.x, v.y, v.z);
      v.fromBufferAttribute(normal, i).applyNormalMatrix(normalTransform); list.normals.push(v.x, v.y, v.z);
    }
    for (let i = 0; i < (index?.count ?? position.count); i++) {
      list.indices.push(offset + (index ? index.getX(i) : i));
    }
    list.sources.push(m);
  });
  for (const [mat, { positions, normals, indices, sources }] of buckets) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    g.setIndex(indices);
    root.add(new T.Mesh(g, mat));
    for (const source of sources) source.removeFromParent();
  }
}
