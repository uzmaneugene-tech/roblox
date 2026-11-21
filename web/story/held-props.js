import {T} from './world/mesh.js';
// Shared recipes for the hand attachment and the matching pasteable library definitions.
export const items={
  phone:[['box',[0,.29,0],[.34,.58,.095],'#263142'],['box',[0,.3,.05],[.26,.43,.015],'#80cfe7']],
  cup:[['cylinder',[0,.21,0],[.38,.42,.38],'#f57264'],['cylinder',[0,.43,0],[.42,.05,.42],'#fff4d6']],
  letter:[['box',[0,.25,0],[.56,.42,.046],'#fff0cf'],['sphere',[0,.26,.05],[.12,.12,.07],'#d95661']],
  ball:[['sphere',[0,.27,0],[.55,.55,.55],'#eb853d']],
  money:[['box',[0,.13,0],[.61,.22,.39],'#5cc585'],['box',[0,.14,0],[.14,.23,.40],'#fff2ad']],
  flag:[['cylinder',[0,.65,0],[.07,1.3,.07],'#ebe3cc'],['box',[.27,1.12,0],[.52,.35,.04],'#f37365']],
  microphone:[['cylinder',[0,.26,0],[.14,.52,.14],'#374159'],['sphere',[0,.57,0],[.26,.27,.26],'#aebfce']],
  umbrella:[['cylinder',[0,.84,0],[.055,1.7,.055],'#58546c'],['cone',[0,1.7,0],[1.6,.45,1.6],'#9780e1']],
  briefcase:[['box',[0,.34,0],[.88,.66,.29],'#785a46'],['box',[0,.72,0],[.36,.15,.11],'#433b39'],['box',[0,.34,.15],[.16,.11,.035],'#e7bc73']],
};
export function heldProp(name){
  const group=new T.Group();
  for(const [kind,pos,scale,color] of items[name]){
    const geo=kind==='sphere'?new T.SphereGeometry(.5,12,8):kind==='cylinder'||kind==='cone'?new T.CylinderGeometry(kind==='cone'?0:.5,.5,1,12):new T.BoxGeometry();
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.65}));mesh.position.fromArray(pos);mesh.scale.fromArray(scale);group.add(mesh);
  }
  return group;
}
