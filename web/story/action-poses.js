export const actionTimes={hold:.48,hug:1.6,dance:2,cry:1.7,laugh:1.6,push:.95,pick_up:1.15,give:1.18,phone_call:1.55,point:1.08,bow:1.35,clap:1.4,salute:1.24,nod:1.1,shake_head:1.06,shrug:1.15,stretch:1.5,sleep:1.2,kneel:.9,crawl:2.1,backflip:1.05,kick:.94,punch_air:.82};
export function extraPose(action,arg,t,q,e,rot){
  const {head,torso,armL,armR,legL,legR}=rot;
  let low=0,root=0,face,forward=0;
  switch(action){
    case 'hold':armR[0]=-.67*q;break;
    case 'hug':armR[0]=armL[0]=-1.45*e;armR[2]=-.26*e;armL[2]=.26*e;torso[0]=.18*e;forward=.34*e;break;
    case 'dance':{
      const beat=Math.sin(t*10)*e;
      low=.26*Math.abs(beat);torso[2]=beat*.27;
      armL[2]=-Math.abs(beat)*2;armR[2]=Math.abs(beat)*2;
      legL[0]=beat*.53;legR[0]=-legL[0];
      if(arg==='robot'){armR[0]=Math.sign(beat)*-.92*e;head[1]=Math.sign(beat)*.28*e;}
      if(arg==='spin')torso[1]=Math.sin(q*2*Math.PI)*1.5;
      break;
    }
    case 'cry':head[0]=.58*e;armR[0]=-2.17*e;torso[2]=Math.sin(t*18)*.065*e;if(e>.36)face='sad';break;
    case 'laugh':head[0]=-.27*e;torso[0]=.22*Math.abs(Math.sin(t*15))*e;armL[0]=armR[0]=-.54*e;break;
    case 'push':armR[0]=armL[0]=-1.54*e;torso[0]=.38*e;legL[0]=-.34*e;forward=.63*e;break;
    case 'pick_up':torso[0]=.65*e;legR[0]=-.63*e;armR[0]=-.49*e;low=-.46*e;break;
    case 'give':armR[0]=-1.52*e;torso[0]=.17*e;break;
    case 'phone_call':armR[0]=-2.46*e;armR[2]=-.24*e;head[2]=-.19*e;break;
    case 'point':armR[0]=-1.57*e;head[1]=-.16*e;break;
    case 'bow':torso[0]=.86*e;head[0]=.49*e;low=-.18*e;break;
    case 'clap':armR[0]=armL[0]=-1.39*e;armR[1]=(.52+.36*Math.sin(t*18))*e;armL[1]=-armR[1];armR[2]=-.37*e;armL[2]=.37*e;break;
    case 'salute':armR[0]=-2.3*e;armR[2]=.32*e;break;
    case 'nod':head[0]=Math.sin(t*15)*.43*e;break;
    case 'shake_head':head[1]=Math.sin(t*15)*.62*e;break;
    case 'shrug':armR[2]=.89*e;armL[2]=-.89*e;head[2]=.24*e;break;
    case 'stretch':armR[2]=2.68*e;armL[2]=-2.68*e;torso[0]=-.23*e;break;
    case 'sleep':root=-Math.PI*.49*q;low=.77*q;head[2]=.25*q;break;
    case 'kneel':low=-.89*q;legR[0]=1.12*q;legL[0]=-1.16*q;torso[0]=.15*q;break;
    case 'crawl':{
      root=1.27*e;low=.38*e; const gait=Math.sin(t*12)*e;
      armL[0]=-1.42*e+.36*gait;armR[0]=-1.42*e-.36*gait;legL[0]=.4*gait;legR[0]=-.4*gait;
      forward=2.6*q;break;
    }
    case 'backflip':root=-Math.PI*2*q*q*(3-2*q);low=6*q*(1-q);legL[0]=legR[0]=.46*e;armR[2]=1.8*e;armL[2]=-1.8*e;break;
    case 'kick':legR[0]=-1.58*e;armR[2]=.81*e;armL[2]=-.68*e;torso[0]=-.24*e;break;
    case 'punch_air':armR[0]=-1.59*e;armL[0]=-.82*e;torso[1]=.43*e;forward=.24*e;break;
  }
  return {low,root,face,forward};
}
export function compileItems(events){
  const byId=new Map();
  const set=(char,t,item)=>{if(!byId.has(char))byId.set(char,[]);byId.get(char).push({t,item});};
  const get=(char,t)=>byId.get(char)?.findLast(e=>e.t<=t)?.item??null;
  const edits=events.filter(e=>['hold','pick_up','phone_call','give'].includes(e.action))
    .map(e=>({...e,t:e.t+({pick_up:.54,give:.52}[e.action]??0)})).sort((a,b)=>a.t-b.t);
  for(const {action,arg,char,t} of edits){
    if(action==='give'){const item=get(char,t);if(item){set(char,t,null);set(arg,t,item);}}
    else set(char,t,action==='phone_call'?'phone':arg);
  }
  return get;
}
