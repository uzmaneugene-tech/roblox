// Depth-buffered orthographic fallback for browsers with WebGL disabled.
export function softwarePreview(T, canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  const sample = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const textures = new WeakMap();
  const key = new T.Vector3(-.43, .75, .63).normalize();
  const fill = new T.Vector3(.74, .32, .42).normalize();
  const rim = new T.Vector3(.12, .46, -.88).normalize();
  const warmth = [245,137,61];
  let frame, depth;
  return (scene, camera) => {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    const { width, height } = canvas;
    if (!frame || frame.width !== width || frame.height !== height) {
      frame = ctx.createImageData(width, height);
      depth = new Float32Array(width * height);
    }
    const rgba = frame.data;
    rgba.fill(0);
    depth.fill(Infinity);
    const project = point => {
      point.project(camera);
      return [(point.x + 1) * width / 2, (1 - point.y) * height / 2, point.z];
    };
    const eye = camera.position.clone().sub(camera.userData.focus).normalize();
    const shine = eye.clone().add(key).normalize();
    const world = scene.userData.world;
    const perspective = camera.isPerspectiveCamera;
    const projection = camera.projectionMatrix.elements;
    function projectView(p) {
      const inverse = -1 / p[11];
      p[0] = (p[9] * inverse * projection[0] + 1) * width / 2;
      p[1] = (1 - p[10] * inverse * projection[5]) * height / 2;
      p[2] = (p[11] * projection[10] + projection[14]) * inverse;
      return p;
    }
    function clipped(a,b,c) {
      if (!perspective || Math.max(a[11],b[11],c[11]) <= -camera.near) return [[a,b,c]];
      const input = [a,b,c], output = [], plane = -camera.near;
      for (let i=0;i<3;i++) {
        const from=input[i], to=input[(i+1)%3], inA=from[11]<=plane,inB=to[11]<=plane;
        if(inA)output.push(from);
        if(inA!==inB){
          const t=(plane-from[11])/(to[11]-from[11]);
          output.push(projectView(from.map((value,k)=>value+(to[k]-value)*t)));
        }
      }
      return output.length < 3 ? [] : output.length===3 ? [output] : [[output[0],output[1],output[2]],[output[0],output[2],output[3]]];
    }
    const lights = [];
    if (world) scene.traverse(light => {
      if (light.isPointLight) lights.push([light.getWorldPosition(new T.Vector3()), light.intensity]);
    });
    const drawList = [];
    scene.traverseVisible(mesh => { if (!mesh.isMesh || mesh.userData.shadow)return;
      if(!mesh.isInstancedMesh){drawList.push(mesh);return;}
      for(let i=0;i<mesh.count;i++){
        const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);
        const color=mesh.instanceColor?new T.Color().fromBufferAttribute(mesh.instanceColor,i):null;
        drawList.push({geometry:mesh.geometry,material:mesh.material,instanceTint:color,matrixWorld:matrix.premultiply(mesh.matrixWorld)});
      } });
    if (world) drawList.sort((a,b) => Number(Boolean(a.material.map)) - Number(Boolean(b.material.map)));
    drawList.forEach(mesh => {
      const { position, normal, uv } = mesh.geometry.attributes;
      const normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
      const vertices = Array.from({ length: position.count }, (_, i) => {
        const vertex = new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        const p = project(vertex.clone());
        const n = new T.Vector3().fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
        p.push(.73 + .24 * Math.max(0, n.dot(key)) + .10 * Math.max(0, n.dot(fill)) + .12 * Math.max(0, n.dot(rim)),
          .16 * Math.max(0, n.dot(shine)) ** 14, uv?.getX(i), uv?.getY(i));
        if (world) {
          let warm = 0;
          for (const [at, power] of lights) {
            const d = vertex.distanceToSquared(at);
            warm += power / (275 + 12 * d);
          }
          p.push(Math.min(.52, warm),
            Math.max(0, Math.min(.55, world.fogNear===undefined?(camera.userData.focus.clone().sub(vertex).dot(eye) - 11) / 105:(camera.position.clone().sub(vertex).dot(eye)-world.fogNear)/(world.fogFar-world.fogNear))));
        }
        if (perspective) {
          const view = vertex.clone().applyMatrix4(camera.matrixWorldInverse);
          p[9]=view.x;p[10]=view.y;p[11]=view.z;
        }
        return p;
      });
      const texture = mesh.material.map;
      let pixels;
      if (texture) {
        const image = texture.image;
        pixels = textures.get(texture);
        if (!pixels || pixels.version !== texture.version) {
          sample.canvas.width = image.width;
          sample.canvas.height = image.height;
          sample.drawImage(image, 0, 0);
          pixels = { version: texture.version, width: image.width, height: image.height, data: sample.getImageData(0, 0, image.width, image.height).data };
          textures.set(texture, pixels);
        }
      }
      const color = (mesh.instanceTint??mesh.material.color).getHex();
      const index = mesh.geometry.index;
      const count = index ? index.count : position.count;
      for (let start = 0; start < count; start += 3) {
        const first = vertices[index ? index.getX(start) : start];
        const second = vertices[index ? index.getX(start + 1) : start + 1];
        const third = vertices[index ? index.getX(start + 2) : start + 2];
        for (const [a,b,c] of clipped(first,second,third)) {
        const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1];
        const area = bx * cy - by * cx;
        if (mesh.material.side === T.BackSide ? area <= .0001 : mesh.material.side === T.DoubleSide ? Math.abs(area) <= .0001 : area >= -.0001) continue;
        const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
        const x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
        const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
        const y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + .5 - a[0], py = y + .5 - a[1];
          const w = (px * cy - py * cx) / area, v = (bx * py - by * px) / area, u = 1 - w - v;
          if (u < -.00001 || v < -.00001 || w < -.00001) continue;
          const z = u * a[2] + w * b[2] + v * c[2];
          const i = y * width + x, j = i * 4;
          if (z >= depth[i]) continue;
          if (pixels) {
            const f = perspective ? u / -a[11] : u, g = perspective ? w / -b[11] : w, h = perspective ? v / -c[11] : v;
            const weight = f + g + h;
            const tx = Math.min(pixels.width - 1, Math.max(0, Math.floor((f * a[5] + g * b[5] + h * c[5]) / weight * pixels.width)));
            const ty = Math.min(pixels.height - 1, Math.max(0, Math.floor((1 - (f * a[6] + g * b[6] + h * c[6]) / weight) * pixels.height)));
            const k = 4 * (ty * pixels.width + tx), alpha = pixels.data[k + 3] / 255;
            if (alpha < .02) continue;
            const carry = (1 - alpha) * rgba[j + 3] / 255;
            const opacity = alpha + carry;
            for (let channel = 0; channel < 3; channel++) rgba[j + channel] = (alpha * pixels.data[k + channel] + carry * rgba[j + channel]) / opacity;
            rgba[j + 3] = opacity * 255;
          } else {
            const shade = mesh.material.isMeshBasicMaterial ? 1 : u * a[3] + w * b[3] + v * c[3];
            const gloss = mesh.material.isMeshBasicMaterial ? 0 : 255 * (u * a[4] + w * b[4] + v * c[4]);
            rgba[j] = (color >> 16) * shade + gloss;
            rgba[j + 1] = (color >> 8 & 255) * shade + gloss;
            rgba[j + 2] = (color & 255) * shade + gloss;
            if (world && !mesh.material.isMeshBasicMaterial) {
              const glow = u * a[7] + w * b[7] + v * c[7];
              const fog = u * a[8] + w * b[8] + v * c[8];
              for (let k = 0; k < 3; k++) {
                const lit = rgba[j + k] * world.exposure[k] + glow * warmth[k];
                rgba[j + k] = lit * (1 - fog) + world.fog[k] * fog;
              }
            }
          }
          if (!pixels) rgba[j + 3] = 255;
          if (mesh.material.depthWrite) depth[i] = z;
        }
        }
      }
    });
    const [x, y] = project(new T.Vector3(0, .01, 0));
    const radius = width * .38;
    if (!world) for (let py = Math.max(0, Math.floor(y - radius * .22)); py <= Math.min(height - 1, y + radius * .22); py++) {
      for (let px = Math.max(0, Math.floor(x - radius)); px <= Math.min(width - 1, x + radius); px++) {
        const j = (py * width + px) * 4;
        if (rgba[j + 3]) continue;
        const fade = 1 - Math.min(1, Math.hypot((px - x) / radius, (py - y) / (radius * .22)));
        rgba[j] = 46; rgba[j + 1] = 55; rgba[j + 2] = 70; rgba[j + 3] = Math.round(81 * fade ** 2);
      }
    }
    ctx.putImageData(frame, 0, 0);
  };
}
