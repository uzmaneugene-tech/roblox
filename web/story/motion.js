import {actionTimes,extraPose} from './action-poses.js';
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, q) => a + (b - a) * q;
export const smooth = x => { const p = clamp(x); return p*p*(3-2*p); };
export const angleMix = (a,b,q) => a + Math.atan2(Math.sin(b-a),Math.cos(b-a))*q;
const distance = (a,b) => Math.hypot(b[0]-a[0],b[2]-a[2]);
const heading = (a,b,otherwise) => distance(a,b) > .001 ? Math.atan2(b[0]-a[0],b[2]-a[2]) : otherwise;
const parts = ['head','torso','armL','armR','legL','legR','elbowL','elbowR','kneeL','kneeR'];
const baseRot = () => Object.fromEntries(parts.map(p=>[p,[0,0,0]]));
const durations = { wave:1.45,jump:1.08,shout:1.48,shoot_ball:1.65,celebrate:1.68,fall:.95,turn_to:.62,sit:.66,emote:.3 };

function sample(segment, absolute) {
  const { action, arg, start, duration, from, goal, yaw, hoop } = segment;
  const t = Math.max(0, absolute-start), q = clamp(t/duration), blend = smooth(t/.23);
  let pos = [...from.pos], direction = angleMix(from.yaw,yaw,smooth(t/.4)), root = 0, low = 0;
  let face = from.face, rot = baseRot(), ball = null;
  rot.torso[2] = Math.sin(absolute*2)*.014;
  rot.head[1] = Math.sin(absolute*1.5)*.025;
  if (goal) {
    const progress = smooth(q), gait = action==='run_to'?14:9;
    pos = from.pos.map((value,i)=>mix(value,goal[i],progress));
    const strength = smooth(t/.26)*smooth((duration-t)/.27);
    const frequency = Math.sin(t*gait)*strength;
    rot.legL[0]=frequency*(action==='run_to'?.83:.58);
    rot.legR[0]=-rot.legL[0];
    rot.armL[0]=-.76*rot.legL[0];rot.armR[0]=-rot.armL[0];
    rot.torso[0]=strength*(action==='run_to'?.15:.045);
    low=Math.abs(Math.sin(t*gait))*strength*.12;
  }
  if(segment.frames){
    const f=q*(segment.frames.length-1),a=Math.floor(f),b=Math.ceil(f);
    parts.forEach((k,i)=>{if(segment.frames[a][i])rot[k]=segment.frames[a][i].map((v,j)=>mix(v,segment.frames[b][i][j],f-a));});
  }
  const impulse = smooth(t/.21)*smooth((duration-t)/.28);
  if(action==='wave') {
    rot.armR[2]=(2.27+Math.sin(t*15)*.27)*impulse;
    rot.head[2]=.12*impulse;
  } else if(action==='jump'||action==='celebrate'){
    const airtime=action==='jump'?1.0:.94;
    const phase=clamp(action==='jump'?t/airtime:(t%airtime)/airtime);
    low=4*phase*(1-phase)*(action==='jump'?1.96:1.25)*smooth((duration-t)/.25);
    rot.armL[2]=-impulse*(action==='jump'?1.3:2.59);rot.armR[2]=-rot.armL[2];
    rot.legL[0]=.36*impulse;rot.legR[0]=-.33*impulse;
  } else if(action==='shout'){
    rot.head[0]=-.49*impulse;rot.torso[0]=-.12*impulse;
    rot.armL[2]=-1.43*impulse;rot.armR[2]=1.43*impulse;
    if(t>.14&&t<duration-.13)face='shouting';
  } else if(action==='sit'){
    const down=smooth(q);low=-.86*down;
    rot.legL[0]=rot.legR[0]=-1.32*down;rot.armL[0]=rot.armR[0]=-.27*down;
    rot.torso[0]=.09*down;
  } else if(action==='fall'){
    root=-Math.PI*.46*smooth(q);low=.32*smooth(q);
    rot.armL[2]=-.83*impulse;rot.armR[2]=.83*impulse;
  } else if(action==='emote') face=arg;
  else if(action==='shoot_ball'&&hoop){
    const release=.42,flight=1.13;
    rot.armL[0]=rot.armR[0]=-2.64*impulse;rot.head[0]=-.20*impulse;
    const hand=[pos[0]+Math.sin(direction)*1.32,pos[1]+4.27,pos[2]+Math.cos(direction)*1.32];
    const p=clamp((t-release)/flight);
    ball=t<=release+flight+.32 ? hand.map((v,i)=>mix(v,hoop[i],p)
      +(i===1?4*p*(1-p)*2.05-Math.max(0,t-release-flight)**2*13:0)) : null;
  }
  if(action in actionTimes){
    const extra=extraPose(action,arg,t,smooth(q),impulse,rot);
    low=extra.low;root=extra.root;face=extra.face??face;
    pos[0]+=Math.sin(direction)*extra.forward;pos[2]+=Math.cos(direction)*extra.forward;
  }
  if(!segment.frames)for(const side of ['L','R']){
    rot['elbow'+side][0]=-Math.min(1.15,Math.abs(rot['arm'+side][0])*.55+Math.abs(rot['arm'+side][2])*.19);
    rot['knee'+side][0]=Math.min(1.45,Math.max(0,-rot['leg'+side][0])*1.07);
  }
  // Blend every pivot and root offset from the pose already visible at the event boundary.
  for(const p of parts) rot[p]=rot[p].map((v,i)=>mix(from.rot[p][i],v,blend));
  return {pos,yaw:direction,center:mix(from.center??0,action==='backflip'?2.56:0,blend),breath:1+.009*Math.sin(absolute*2.2),root:mix(from.root,root,blend),low:mix(from.low,low,blend),rot,face,ball};
}

export function compileMotion(placement, events, hoops = [], placements = new Map()) {
  const defaultPose = {pos:[...placement],yaw:0,root:0,low:0,rot:baseRot(),face:'happy',ball:null};
  const segments=[{action:'idle',start:0,duration:1,from:defaultPose,yaw:0}];
  for(const event of events){
    const from=sample(segments.at(-1),event.t);
    const {action,arg,t:start}=event;
    const goal=['walk_to','run_to'].includes(action)?arg:null;
    const targets=arg&&action==='shoot_ball'?[arg]:hoops;
    const hoop=action==='shoot_ball'?targets.reduce((best,item)=>!best||distance(from.pos,item)<distance(from.pos,best)?item:best,null)
      ?? [from.pos[0],from.pos[1]+4.7,from.pos[2]+9] : null;
    const partner=['hug','give','push'].includes(action)?placements.get(arg):null;
    const yaw=goal||hoop||partner?heading(from.pos,goal??hoop??partner,from.yaw)
      :action==='turn_to'?(Array.isArray(arg)?heading(from.pos,arg,from.yaw):arg*Math.PI/180):from.yaw;
    const duration=goal?Math.max(.28,distance(from.pos,goal)/(action==='run_to'?5.8:2.55)):event.duration??durations[action]??actionTimes[action]??1;
    segments.push({action,arg,frames:event.frames,start,duration,from,goal,yaw,hoop});
  }
  return t => sample(segments.findLast(s=>s.start<=t) ?? segments[0],t);
}

export function captionAt(lines,time) {
  const line=lines.findLast(item=>item.t<=time);
  if(!line)return null;
  const words=line.text.trim().split(/\s+/);
  const progress=(time-line.t)*(line.speed??3);
  const word=words[Math.floor(progress)];
  if(!word)return null;
  return {word,scale:1+.2*(1-smooth((progress%1)/.56))};
}
