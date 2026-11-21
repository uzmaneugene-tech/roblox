import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/rounded-box.js';

export const SLIM = {
  head: [1.25, 1.2, 1.15], torso: [1.6, 2, 0.8],
  arm: [0.6, 2, 0.65], leg: [0.75, 2, 0.75],
  gap: 0.05, radius: 0.09, outline: 0.04
};

export function part(w, h, d, color, P = SLIM) {
  const g = new THREE.Group();
  const geo = new RoundedBoxGeometry(w, h, d, 3, P.radius);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  m.castShadow = true; g.add(m);
  const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide }));
  o.scale.set((w + P.outline * 2) / w, (h + P.outline * 2) / h, (d + P.outline * 2) / d);
  g.add(o);
  return g;
}

export function decal(draw, w, h, z) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.position.z = z; return m;
}

const PI = Math.PI;
function drawFace(x, name, mouth=0, blink=false) {
  x.lineCap = 'round'; x.lineWidth = 13; x.strokeStyle = x.fillStyle = '#111';
  const eye = (cx, cy, rx, ry) => {
    if(blink){x.beginPath();x.moveTo(cx-rx,cy);x.lineTo(cx+rx,cy);x.stroke();return;}
    x.fillStyle = '#111'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + rx * .3, cy - ry * .35, rx * .3, 0, 7); x.fill();
    x.fillStyle = '#111';
  };
  const arc = (cx, cy, r, a, b) => { x.beginPath(); x.arc(cx, cy, r, a, b); x.stroke(); };
  const line = (a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  if (name === 'happy') { eye(88, 112, 15, 27); eye(168, 112, 15, 27); arc(128, 150, 42, .15 * PI, .85 * PI); }
  if (name === 'shocked') { eye(88, 108, 19, 32); eye(168, 108, 19, 32);
    x.beginPath(); x.ellipse(128, 188, 17, 26, 0, 0, 7); x.fill(); }
  if (name === 'sad') { eye(88, 118, 14, 24); eye(168, 118, 14, 24);
    line(62, 84, 108, 72); line(194, 84, 148, 72); arc(128, 208, 36, 1.15 * PI, 1.85 * PI); }
  if (name === 'angry') { eye(88, 120, 14, 20); eye(168, 120, 14, 20);
    line(58, 72, 112, 98); line(198, 72, 144, 98); arc(128, 212, 34, 1.15 * PI, 1.85 * PI); }
  if (name === 'shouting') { arc(88, 124, 17, 1.1 * PI, 1.9 * PI); arc(168, 124, 17, 1.1 * PI, 1.9 * PI);
    x.beginPath(); x.ellipse(128, 188, 36, 40, 0, 0, 7); x.fill();
    x.fillStyle = '#e8625a'; x.beginPath(); x.ellipse(128, 206, 22, 14, 0, 0, 7); x.fill(); }
  if(mouth){
    x.clearRect(65,151,126,105);x.fillStyle='#381e28';x.beginPath();
    x.ellipse(128,186,20+mouth*3,6+mouth*6,0,0,2*PI);x.fill();
    x.fillStyle='#e78177';x.beginPath();x.ellipse(128,190+mouth*3,10+mouth*2,3+mouth,0,0,2*PI);x.fill();
  }
  if(blink&&name==='shouting'){
    x.clearRect(45,99,166,53);
    if(name==='happy'||name==='shocked')x.clearRect(45,70,166,31);
    x.strokeStyle='#111';x.lineWidth=11;line(72,115,102,115);line(154,115,184,115);
  }
}

export function makeAvatar(o = {}, P = SLIM) {
  const C = Object.assign({ skin: '#f1c9a5', shirt: '#4aa3e8', pants: '#1f2a52',
    shoes: '#ffffff', hair: '#16161a', collar: true, pocket: true, patches: true }, o);
  const [hw, hh, hd] = P.head, [tw, th, td] = P.torso, [aw, ah, ad] = P.arm, [lw, lh, ld] = P.leg;
  const root = new THREE.Group();

  const joints={};
  const joint=(p,k,y)=>{const g=new THREE.Group();joints[k]=g;if(o.segmented){g.position.y=y;p.add(g);}return g;};
  const mkLeg = (side) => {
    const p = new THREE.Group(); p.position.set(side * (lw / 2 + P.gap / 2), lh, 0);
    const knee=joint(p,'knee'+(side<0?'L':'R'),-1);
    const len=o.segmented?.98:lh;
    const leg = part(lw,len,ld,C.pants,P);leg.position.y=-len/2;p.add(leg);
    if(o.segmented){const shin=part(lw*.92,.92,ld*.94,C.pants,P);shin.position.y=-.47;knee.add(shin);const cap=part(lw*.8,.24,ld*.8,C.pants,P);knee.add(cap);}
    const shoe = part(lw + .08, .42, ld + .3, C.shoes, P); shoe.position.set(0, -lh + .21, .12); if(o.segmented){shoe.position.y+=1;knee.add(shoe);}else p.add(shoe);
    if (C.patches) {
      const patch = decal(x => { x.fillStyle = '#3b4a86'; x.fillRect(70, 90, 110, 100);
        x.strokeStyle = '#0d1230'; x.lineWidth = 6; x.setLineDash([12, 10]); x.strokeRect(70, 90, 110, 100); },
      .38, .38, ld / 2 + .012);
      patch.position.set(side * .1, -.7, ld / 2 + .012);
      p.add(patch);
    }
    root.add(p); return p;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  const torso = new THREE.Group(); torso.position.y = lh + th / 2; root.add(torso);
  if(o.segmented){const chest=part(tw,1.42,td,C.shirt,P);chest.position.y=.29;const waist=part(tw*.92,.57,td*.94,C.shirt,P);waist.position.y=-.715;torso.add(chest,waist);}else torso.add(part(tw, th, td, C.shirt, P));
  torso.add(decal(x => {
    if (C.collar) { x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = 5;
      [[[78, 0], [128, 0], [128, 62]], [[178, 0], [128, 0], [128, 62]]].forEach(t => {
        x.beginPath(); x.moveTo(...t[0]); x.lineTo(...t[1]); x.lineTo(...t[2]); x.closePath(); x.fill(); x.stroke(); }); }
    x.fillStyle = '#e9f3ff'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(128, 82 + i * 34, 6, 0, 7); x.fill(); }
    if (C.pocket) { x.strokeStyle = '#2a6fb0'; x.lineWidth = 6; x.strokeRect(160, 96, 56, 56); }
    if (C.patches) { x.fillStyle = '#e7d28a'; x.fillRect(48, 168, 46, 40); x.strokeStyle = '#7a6a2a'; x.lineWidth = 4; x.setLineDash([8, 6]); x.strokeRect(48, 168, 46, 40); }
  }, tw, th, td / 2 + .012));

  const mkArm = (side) => {
    const p = new THREE.Group(); p.position.set(side * (tw / 2 + aw / 2 + P.gap), lh + th - .1, 0);
    const elbow=joint(p,'elbow'+(side<0?'L':'R'),-.9);
    const length=o.segmented?.98:o.classic?ah-.32:ah;
    const arm=part(aw,length,ad,C.shirt,P);arm.position.y=-length/2+.1;p.add(arm);
    if(o.segmented){const lower=part(aw*.94,.66,ad*.94,C.shirt,P);lower.position.y=-.32;elbow.add(lower);elbow.add(part(aw*.8,.23,ad*.8,C.shirt,P));}
    const hand = part(aw + .02, .55, ad + .02, C.skin, P); hand.position.y = -ah + .1 + .275; if(o.segmented){hand.position.y+=.9;elbow.add(hand);}else if(o.classic){hand.scale.set(aw/(aw+.02),.32/.55,ad/(ad+.02));hand.position.y=-ah+.26;p.add(hand);}else p.add(hand);
    root.add(p); return p;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  const head = new THREE.Group(); head.position.y = lh + th + hh / 2 + .03; root.add(head);
  head.add(part(hw, hh, hd, C.skin, P));
  const faceMesh = decal(x => drawFace(x, 'happy'), hw * .86, hh * .86, hd / 2 + .012);
  head.add(faceMesh);
  let face = 'happy:0:false';
  const setFace = (name,mouth=0,blink=false) => {
    const key=name+':'+mouth+':'+blink;
    if (face === key) return;
    face = key;
    const texture = faceMesh.material.map;
    const ctx = texture.image.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    drawFace(ctx,name,mouth,blink);
    texture.needsUpdate = true;
  };
  const hairStart=head.children.length;
  const hairBase = part(hw + .1, .4, hd + .1, C.hair, P); hairBase.position.y = hh / 2 + .02; head.add(hairBase);
  const back = part(hw + .1, hh * .7, .3, C.hair, P); back.position.set(0, .1, -hd / 2 - .02); head.add(back);
  [[-.5, .3], [-.17, .36], [.17, .32], [.5, .28]].forEach(([x, drop], i) => {
    const b = part(.34, drop, .22, C.hair, P); b.position.set(x, hh / 2 - drop / 2 + .1, hd / 2 + .02);
    b.rotation.z = (i % 2 ? .15 : -.15); head.add(b);
  });
  [[-.45, -.3], [-.15, .2], [.2, -.2], [.5, .25], [0, 0]].forEach(([x, r], i) => {
    const s = part(.3, .45, .3, C.hair, P); s.position.set(x, hh / 2 + .38, (i - 2) * .15);
    s.rotation.set(.2 * r, 0, r); head.add(s);
  });

  root.traverse(n => { if (n.isMesh) n.castShadow = true; });
  return { group: root, hairPieces:head.children.slice(hairStart), parts: { head, torso, armL, armR, legL, legR,...joints }, setFace };
}
