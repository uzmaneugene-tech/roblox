import { mix, smooth } from './motion.js';

const cameraPos = (s, t) => {
  const { shot, opts } = s;
  const pose = t(opts.target);
  const { pos, yaw, low } = pose;
  const x = pos[0], y = pos[1], z = pos[2];
  const face = opts.face === false ? yaw + Math.PI : yaw;
  const side = opts.side === 'left' ? -1 : 1;
  const offset = (l,h,f) => [x+l*Math.cos(face)+f*Math.sin(face),y+h,z-l*Math.sin(face)+f*Math.cos(face)];
  const head = y + 4.65 + low;
  const upper = y + 3.35 + low*.8;
  const body = y + 2.72 + low*.72;
  let from, look;
  switch (shot) {
    case 'close_up': from=offset(side*.08,head-y+.13,2.49);look=[x,head,z];break;
    case 'tracking': from=offset(side*9.2,3.48+low*.4,.65);look=[x,body,z];break;
    case 'over_shoulder': from=offset(side*.81,4.55+low,-3.0);look=offset(-.17,3.5+low,6);break;
    case 'low_angle': from=offset(side*1.7,1.35,7.3);look=[x,upper-.32,z];break;
    case 'static': from=[x+3,y+4.7,z+11.0];look=[x,body,z];break;
    case 'medium': from=offset(side*1.25,4.12+low*.4,7.2);look=[x,upper-.24,z];break;
    default: from=offset(side*4.4,6.4,12.8);look=[x,body+.15,z];break;
  }
  return {from:opts.from??from,look:opts.look??look};
};

export function compileCamera(events, targetAt, shoutAt) {
  const tracks = events.length && events[0].t===0 ? [...events] : [{t:0,shot:'wide',opts:{}},...events];
  for (let i=0;i<tracks.length;i++) {
    const event = tracks[i];
    // Static shots keep the initial view even when their target moves.
    tracks[i] = {...event, hold:event.shot==='static'?cameraPos(event,id=>targetAt(id,event.t)):null};
    if (i) tracks[i].previous = evaluate(tracks[i].t,i-1);
  }
  function evaluate(time, i) {
    const shot=tracks[i];
    const view=shot.hold ?? cameraPos(shot,id=>targetAt(id,time));
    const ease=shot.opts.cut?0:shot.opts.ease??.72;
    if (!shot.previous||ease===0||time-shot.t>=ease) return view;
    const k=smooth((time-shot.t)/ease);
    return {from:view.from.map((v,j)=>mix(shot.previous.from[j],v,k)),look:view.look.map((v,j)=>mix(shot.previous.look[j],v,k))};
  }
  return time=>{
    const i=Math.max(0,tracks.findLastIndex(shot=>shot.t<=time)), active=tracks[i];
    const {from,look}=evaluate(time,i);
    const pulse=(active.opts.shake??0)*.13 + shoutAt(time)*.14;
    return {from:[from[0]+Math.sin(time*41)*pulse,from[1]+Math.cos(time*53)*pulse,from[2]],look:[...look],shot:active.shot};
  };
}
