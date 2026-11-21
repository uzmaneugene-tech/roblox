// widths/heights/depths in studs, before optional body scaling.
export const silhouettes={
  slim:[[1.25,1.2,1.15],[1.6,2,.8],[.6,2,.65],[.75,2,.75],.05],
  classic:[[2,1,1],[2,2,1],[1,2,1],[1,2,1],0],
  r15:[[1.48,1.16,1.04],[1.78,1.94,.91],[.78,2.04,.78],[.84,2.16,.84],.025],
  thin:[[1.02,1.06,.97],[1.27,2.26,.65],[.41,2.38,.48],[.53,2.65,.55],.03],
  chunky:[[1.99,1.45,1.49],[2.18,1.47,1.18],[.87,1.46,.95],[.99,1.28,1.04],.025]
};
export const styleHeight=style=>{const [h,t,,l]=silhouettes[style??'slim'];return h[1]+t[1]+l[1];};
export function fitStyle(model,style){
  const [head,torso,arm,leg,gap]=silhouettes[style??'slim'],p=model.parts;
  const ratios=(a,b)=>a.map((n,i)=>n/b[i]);
  p.head.scale.fromArray(ratios(head,silhouettes.slim[0]));p.head.position.y=leg[1]+torso[1]+head[1]/2+.03;
  p.torso.scale.fromArray(ratios(torso,silhouettes.slim[1]));p.torso.position.y=leg[1]+torso[1]/2;
  for(const [side,sign] of [['L',-1],['R',1]]){
    const a=p['arm'+side],l=p['leg'+side];a.scale.fromArray(ratios(arm,silhouettes.slim[2]));l.scale.fromArray(ratios(leg,silhouettes.slim[3]));
    a.position.set(sign*(torso[0]/2+arm[0]/2+gap),leg[1]+torso[1]-.1*a.scale.y,0);
    l.position.set(sign*(leg[0]+gap)/2,leg[1],0);
  }
  model.torsoScale=p.torso.scale.y;
}
