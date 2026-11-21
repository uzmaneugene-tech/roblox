import { mix, smooth } from './motion.js';

// Default distances are in studs for a five-stud actor; lenses are vertical FOV.
export const lenses = {
  wide:[26,7,53], medium:[10,3.6,103], close_up:[5,4.4,94],
  tracking:[9.5,3.6,59], over_shoulder:[6,5.8,54], low_angle:[8,1,63],
  static:[12,4.7,48], two_shot:[11,4,58], group:[15,6,62], orbit:[12,4,57], crane_up:[18,5,58],
};
function cameraPos(event, at, elapsed, ids) {
  const {shot,opts:o}=event, people=o.targets??ids;
  const subject=at(o.target??people[0]), {pos,yaw,low}=subject;
  const unit=(subject.height??5)/5;
  const [d,h,lens]=lenses[shot], fov=o.fov??lens;
  let dist=o.dist??d*unit, height=o.height??h*unit;
  let angle=yaw+(o.face===false?Math.PI:0), side=o.side==='left'?-1:1;
  let center=[...pos], aim=shot==='close_up'?4.1:shot==='medium'?3.35:2.65;
  let look=[center[0],center[1]+aim*unit+low,center[2]];
  if(shot==='tracking')angle+=side*Math.PI/2;
  if(shot==='wide'||shot==='static')angle+=side*.22;
  if(shot==='orbit')angle+=elapsed*.23*side;
  if(shot==='crane_up'){height+=Math.min(18,elapsed*1.5);dist+=Math.min(12,elapsed);}
  if(shot==='two_shot'||shot==='group'){
    const actors=people.length?people.map(at):[subject];
    if(actors.length===2){
      const dx=actors[1].pos[0]-actors[0].pos[0],dz=actors[1].pos[2]-actors[0].pos[2];
      if(Math.hypot(dx,dz)>.1){angle=Math.atan2(-dz,dx);if(Math.cos(angle-yaw)<0)angle+=Math.PI;}
    }
    const points=actors.flatMap(a=>[a.pos,[a.pos[0],a.pos[1]+(a.height??5),a.pos[2]]]);
    const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=min.map((_,i)=>Math.max(...points.map(p=>p[i])));
    center=min.map((v,i)=>(v+max[i])/2);look=[...center];height-=2.5;
    const radius=Math.hypot(...max.map((v,i)=>(v-min[i])/2))+1;
    dist=Math.max(dist,radius/Math.sin(Math.atan(Math.tan(fov*Math.PI/360)*9/16)));
  }
  if(shot==='over_shoulder'){
    const other=people.find(id=>id!==(o.target??people[0]));
    let shoulder=1.7*unit;
    if(other){const a=at(other);look=[a.pos[0],a.pos[1]+(a.height??5)*.84+a.low,a.pos[2]];
      const dx=look[0]-pos[0],dz=look[2]-pos[2],gap=Math.hypot(dx,dz);
      // Reserve shoulder/face clearance where the sightline crosses the near actor.
      shoulder=Math.min(dist,1.65*unit*(1+dist/Math.max(gap,1)));
      angle=Math.atan2(dx,dz);}
    else look=[pos[0]+Math.sin(angle)*6,pos[1]+4*unit,pos[2]+Math.cos(angle)*6];
    center=[pos[0]+side*shoulder*Math.cos(angle),pos[1],pos[2]-side*shoulder*Math.sin(angle)];angle+=Math.PI;
  }
  const from=o.from??[center[0]+dist*Math.sin(angle),center[1]+height,center[2]+dist*Math.cos(angle)];
  return {from:from.map((v,i)=>v+(o.offset?.[i]??0)),look:o.look??look,fov};
}
// Slab intersection along the sightline. Stop before the nearest blocking surface.
export function avoidSolids(from,look,boxes,actors){
  const delta=from.map((v,i)=>v-look[i]);let limit=1;
  for(const {min,max} of boxes){
    let lo=0,hi=1;
    for(let i=0;i<3;i++){
      if(Math.abs(delta[i])<1e-8){if(look[i]<min[i]||look[i]>max[i])hi=-1;continue;}
      const a=(min[i]-.2-look[i])/delta[i],b=(max[i]+.2-look[i])/delta[i];
      lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
    }
    if(lo>0&&lo<=hi)limit=Math.min(limit,lo);
  }
  const out=delta.map((v,i)=>look[i]+v*limit);
  for(const {pos,height=5,low=0} of actors){
    if(Math.hypot(out[0]-pos[0],out[2]-pos[2])<1.9&&out[1]>pos[1]+low-.4)
      out[1]=Math.max(out[1],pos[1]+low+height+1);
  }
  for(const {min,max} of boxes){
    if(out.every((v,i)=>v>=min[i]-.15&&v<=max[i]+.15))out[1]=max[1]+.35;
  }
  return out;
}
export function compileCamera(events, targetAt, shoutAt, ids=[], boxes=[], extras=[]) {
  const tracks = events.length && events[0].t===0 ? [...events] : [{t:0,shot:'wide',opts:{}},...events];
  for (let i=0;i<tracks.length;i++) {
    const event = tracks[i];
    // Static shots keep the initial view even when their target moves.
    tracks[i] = {...event, hold:event.shot==='static'?cameraPos(event,id=>targetAt(id,event.t),0,ids):null};
    if (i) tracks[i].previous = evaluate(tracks[i].t,i-1);
  }
  function evaluate(time, i) {
    const shot=tracks[i];
    const view=shot.hold ?? cameraPos(shot,id=>targetAt(id,time),time-shot.t,ids);
    const ease=shot.opts.cut?0:shot.opts.ease??.72;
    if (!shot.previous||ease===0||time-shot.t>=ease) return view;
    const k=smooth((time-shot.t)/ease);
    return {fov:mix(shot.previous.fov,view.fov,k),from:view.from.map((v,j)=>mix(shot.previous.from[j],v,k)),look:view.look.map((v,j)=>mix(shot.previous.look[j],v,k))};
  }
  return time=>{
    const i=Math.max(0,tracks.findLastIndex(shot=>shot.t<=time)), active=tracks[i];
    const {from,look,fov}=evaluate(time,i);
    const pulse=(active.opts.shake??0)*.13 + shoutAt(time)*.14;
    return {fov,from:avoidSolids([from[0]+Math.sin(time*41)*pulse,from[1]+Math.cos(time*53)*pulse,from[2]],look,boxes,[...ids.map(id=>targetAt(id,time)),...extras]),look:[...look],shot:active.shot};
  };
}
