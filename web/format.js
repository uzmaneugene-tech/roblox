// Shared by the editor, background converter and test suite. Units are Roblox studs.
export const LIMIT=190000, MAX_BYTES=32*1024*1024;
const check=(ok,msg)=>{if(!ok) throw Error(msg)};
const num=(v,label,min=-Infinity,max=Infinity)=>{check(Number.isFinite(v)&&v>=min&&v<=max,label+' is outside its numeric range');return v};
const string=(v,label,limit)=>{check(typeof v==='string'&&v.length<=limit,label+' is missing or too long');return v};
function named(list,label) {
  check(Array.isArray(list),label+' must be a list'); const names=new Set();
  for(const s of list){const n=string(s?.name,label+' name',200).trim();check(n&&!names.has(n),'Empty or duplicate '+label+' name: '+n);names.add(n)}
}
function common(s){
  string(s.caption,'Caption',1000000);num(s.duration,'Duration',0.0001,1e8);num(s.shake,'Shake',0,1);
  check(['Cut','Fade','CrossFade'].includes(s.transition),'Unknown transition');
}
function vector(v,label,n,min,max){check(Array.isArray(v)&&v.length===n,label+' needs '+n+' numbers');v.forEach(x=>num(x,label,min,max));return v}
export function project(p){
  check(p?.format==='framecut-1'&&Array.isArray(p.shots)&&p.shots.length>0&&p.shots.length<=250,'Choose a Framecut project with 1–250 shots');
  named(p.shots,'shot');
  for(const s of p.shots){common(s);string(s.caption,'Editor caption',8000);num(s.fov,'FOV',1,120);vector(s.position,'Position',3);vector(s.rotation,'Rotation',3)}
  return p;
}
const round=n=>Number(n.toFixed(4));
// Intrinsic XYZ Euler angles, matching THREE.Euler. CFrame consumes matrix rows.
export function frame(s){
  const [x,y,z]=s.rotation.map(n=>n*Math.PI/180), [a,b,c,d,e,f]=[Math.cos(x),Math.sin(x),Math.cos(y),Math.sin(y),Math.cos(z),Math.sin(z)];
  return [...s.position,c*e,-c*f,d,a*f+b*e*d,a*e-b*f*d,-b*c,b*f-a*e*d,b*e+a*f*d,a*c].map(round);
}
export function toData(p){
  project(p);return {version:1,rig:'',objects:[],bones:[],shots:p.shots.map(s=>({name:s.name,caption:s.caption,duration:s.duration,shake:s.shake,transition:s.transition,transition_time:Math.min(s.duration,.35),fov_start:s.fov,fov_end:s.fov,speaker_color:[1,1,1],path:[{t:0,cf:frame(s)}]}))};
}
const bytes=new TextEncoder();
const quote=s=>'"'+Array.from(bytes.encode(s),n=>n>=32&&n<=126&&n!==34&&n!==92?String.fromCharCode(n):'\\'+String(n).padStart(3,'0')).join('')+'"';
export function modules(d){
  check(d?.version===1,'Expected Blender JSON version 1');check(Array.isArray(d.shots)&&d.shots.length,'At least one shot is required');
  named(d.shots,'shot');named(d.objects,'object');named(d.bones,'bone');
  const head='local d={version=1,shots={},objects={},bones={}}\n', chunks=[];let lines=[],size=0;
  function add(line){line+='\n';if(size+line.length>LIMIT-100){chunks.push(lines.join(''));lines=[];size=0}lines.push(line);size+=line.length}
  add('d.rig='+quote(string(d.rig,'Rig name',200)));
  if(d.bones.length)check(d.rig.trim(),'Bones require a rig name');
  for(const group of ['shots','objects','bones'])for(const [i,s] of d[group].entries()){
    const key='d.'+group+'['+(i+1)+']';add(key+'={name='+quote(s.name)+',path={}}');
    if(group==='shots'){
      common(s);num(s.fov_start,'Starting FOV',0,120);num(s.fov_end,'Ending FOV',0,120);num(s.transition_time,'Transition time',0);
      for(const field of ['duration','fov_start','fov_end','shake','transition_time'])add(key+'.'+field+'='+round(s[field]));
      add(key+'.transition='+quote(s.transition));add(key+'.speaker_color={'+vector(s.speaker_color,'Speaker color',3,0,1).map(round).join(',')+'}');
      add(key+'.caption=""');
      // Split by Unicode code points, so a boundary cannot cut an emoji in half.
      const chars=Array.from(s.caption);for(let n=0;n<chars.length;n+=2000)add(key+'.caption..='+quote(chars.slice(n,n+2000).join('')));
    }
    for(const field of group==='objects'?['path','visibility']:['path']){
      const track=s[field];check(Array.isArray(track)&&(field!=='path'||track.length),'Missing '+field+' on '+s.name);
      if(field==='visibility')add(key+'.visibility={}');let last=-1;
      for(const [j,p] of track.entries()){
        num(p.t,'Key time',0);check(p.t>=last,'Keys must be in timeline order');last=p.t;
        const value=field==='path'?'cf=CFrame.new('+vector(p.cf,'CFrame',12).map(round).join(',')+')':'value='+round(num(p.value,'Transparency',0,1));
        add(key+'.'+field+'['+(j+1)+']={t='+round(p.t)+','+value+'}');
      }
    }
  }
  chunks.push(lines.join(''));if(chunks.length===1)return {'CutsceneData.lua':head+chunks[0]+'return d\n'};
  return {'CutsceneData.lua':head+'for i=1,'+chunks.length+' do require(script["Part"..i])(d) end\nreturn d\n',...Object.fromEntries(chunks.map((v,i)=>['Part'+(i+1)+'.lua','return function(d)\n'+v+'end\n']))};
}
