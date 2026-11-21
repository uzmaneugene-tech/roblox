import {clockAt} from './phase-two.js';
export const audioRate=48000;
const tau=2*Math.PI, sin=(hz,t)=>Math.sin(hz*tau*t);
const clip=(a,max=1)=>Math.min(max,Math.max(0,a));
const noise=i=>((Math.imul((i^(i>>>11)),0x45d9f3b)>>>9)%8192)/4096-1;
const envelope=(t,len)=>(t<0||t>=len?0:clip(t*95)*(1-t/len)**1.7);
const profiles={
  whoosh:[.52,240,-250,1],door_open:[.58,142,-50,.42],door_close:[.35,76,-75,.55],
  buzzer:[.56,128,0,.12],cheer:[1.2,322,110,.54],clap:[.22,630,0,.94],
  pop:[.17,880,-1800,.22],ding:[.71,880,0,.04],coin:[.49,1319,155,.04],
  thud:[.31,72,-99,.57],step:[.23,118,-110,.73],camera_click:[.21,440,-740,.9],
  gasp:[.59,288,185,.71],sad_trombone:[1.4,206,-52,.05],swoosh_fast:[.25,415,-500,.94],
  hoop:[.43,177,-90,.77],elevator_ding:[.84,659,0,.02],phone_ring:[1.04,740,0,.08],
  heartbeat:[.91,56,-16,.18],boom:[1.6,54,-19,.56],thunder:[2.4,39,-6,.75]
};
const chords={
  calm:[220,261.63,329.63,392],tense:[110,116.54,155.56,164.81],
  happy:[261.63,329.63,392,523.25],sad:[146.83,174.61,220,261.63],
  epic:[82.41,123.47,164.81,246.94],
};
function effect(name,t,i) {
  const [len,hz,bend,hiss]=(Object.hasOwn(profiles,name)?profiles[name]:null)??[.23,440,0,.04];
  let e=envelope(t,len);
  if(name==='phone_ring')e*=t%.26<.17?1:0;
  if(name==='heartbeat')e*=Math.max(envelope(t,.15),envelope(t-.22,.13));
  const p=t*(hz+bend*t*.5);
  return e*((1-hiss)*(sin(p,1)+.23*sin(p*2.01,1))+hiss*noise(i))*.28;
}
function ambience(name,t,i) {
  const n=noise(i>>2), slow=(1+sin(.43,t))*.5;
  switch(name){
    case 'crickets':return .08*sin(2630,t)*Math.max(0,sin(3.1,t))**8;
    case 'wind':return n*(.015+.064*slow);
    case 'rain':return .061*n+.038*noise(i);
    case 'city_night':return .04*n+.05*sin(58,t)*slow;
    case 'party_crowd':return .041*n+.058*sin(188,t+sin(.51,t)*.025)*slow;
    case 'office_hum':return .036*sin(60,t)+.017*sin(120,t);
    default:return 0;
  }
}
function music(name,t,i){
  const c=chords[name];if(!c)return 0;
  const beat=name==='epic'||name==='happy'?.27:.42, p=t%beat,k=Math.floor(t/beat);
  const shape=envelope(p,beat), note=c[k%4]*(k%8<4?1:2);
  const drum=(name==='epic'||name==='happy')&&k%4===0?.064*envelope(p,.17)*(sin(79,p)+.3*noise(i)):0;
  return .09*shape*(sin(note,p)+.22*sin(note*2,p))+.03*sin(c[Math.floor(k/8)%4]*.5,t)*clip(p*45)*clip((beat-p)*45)+drum;
}
export function hasSceneAudio(scene,gains={}) {
  return Boolean(((gains.sfx??1)>0&&scene.sounds?.length)
    ||((gains.music??1)>0&&chords[scene.music?.name]&&scene.music.volume)
    ||((gains.ambience??1)>0&&scene.ambience?.name!=='none'&&scene.ambience?.volume));
}
export function renderSceneAudio(scene,data,rate,gains={}) {
  const cues=scene.sounds??[], amb=scene.ambience,mus=scene.music;
  const sx=gains.sfx??1, am=(gains.ambience??1)*(amb?.volume??0), mu=(gains.music??1)*(mus?.volume??0);
  if(!hasSceneAudio(scene,gains))return;
  let first=0,next=0,spanIndex=0;
  for(let i=0;i<data.length;i++){
    const out=i/rate,spans=scene.clock;
    while(spans&&spanIndex<spans.length-1&&out>=spans[spanIndex].until)spanIndex++;
    const span=spans?.[spanIndex], t=span?span.source+(out-span.from)*span.rate:out, sample=Math.round(t*rate);
    while(next<cues.length&&cues[next].t<=t)next++;
    while(first<next&&t-cues[first].t>2.4)first++;
    let value=0;
    if(sx)for(let c=first;c<next;c++)value+=sx*effect(cues[c].name,t-cues[c].t,sample);
    // Silence a frozen cue instead of holding a DC sample; loops continue quietly under the still.
    const edge=clip(Math.min(out,scene.duration-out)*4), loopTime=span?.rate===0?clockAt(scene,out)+out-span.from:t;
    if(span?.rate===0)value=0;
    if(am)value+=am*edge*ambience(amb.name,loopTime,Math.round(loopTime*rate));
    if(mu)value+=mu*edge*clip(mus.fadeIn?out/mus.fadeIn:1)*music(mus.name,loopTime,sample);
    data[i]=Math.max(-1,Math.min(1,data[i]+value));
  }
}
export function previewSound(){
  let context,source,scene,buffer,signature='',expected;
  return {
    unlock(){
      const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;
      if(!Audio)return;
      try{context??=new Audio();context.resume().catch(()=>{});}catch{/* unsupported device */}
    },
    stop(){if(source){source.stop();source.disconnect();source=null;}},
    tick(active,gains){
      if(!context||context.state!=='running'||gains.muted||!active){this.stop();return;}
      const {scene:current,elapsed}=active,k=JSON.stringify(gains);
      if(source&&scene===current&&signature===k&&Math.abs(expected+context.currentTime-elapsed)<.16)return;
      this.stop();
      if(scene!==current||signature!==k){
        scene=current;signature=k;buffer=null;
        if(hasSceneAudio(scene,gains)){
          const rate=22050;
          buffer=context.createBuffer(1,Math.ceil(scene.duration*rate),rate);
          renderSceneAudio(scene,buffer.getChannelData(0),rate,gains);
        }
      }
      if(buffer&&elapsed<buffer.duration){
        source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start(0,elapsed);expected=elapsed-context.currentTime;
      }
    },
    reset(){this.stop();scene=buffer=null;},
  };
}
