// Installed inside QuickJS. Only JSON records leave this realm.
export function libraryAPI(command, base) {
  const items=new Map(), types=['prop','building','location','character','animation'];
  const fail=m=>{throw new Error(m)};
  const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max?n:fail('Expected a count between 0 and '+max);
  const num=n=>Number.isFinite(n)&&Math.abs(n)<=10000?n:fail('Expected a finite number within 10,000');
  const vec=(v,len=3)=>Array.isArray(v)&&v.length===len?v.map(num):fail('Expected a '+len+'-component vector');
  const get=(name,allowed)=>{const item=items.get(name);if(!item||!allowed.includes(item.type))fail('Unknown '+allowed.join('/')+': '+name);return item;};
  const invoke=(item,fn)=>{try{return fn()}catch(e){throw new Error(item.name+': '+e.message+'\n'+String(e.stack??'').split('\n').find(l=>l.includes('library/')))}};
  const define=Object.fromEntries(types.map(type=>[type,(name,fn)=>{
    if(typeof name!=='string'||!/^\w[\w-]{0,63}$/.test(name)||items.has(name))fail('Invalid or duplicate item: '+name);
    if(type==='character'?(!fn||typeof fn!=='object'||Array.isArray(fn)):typeof fn!=='function')fail(name+': expected '+(type==='character'?'options':'a builder function'));
    if(type==='character')command('checkPreset',[name,fn]);
    items.set(name,{name,type,fn});command('definition',[name,type]);
  }]));
  Object.defineProperty(globalThis,'define',{value:new Proxy(Object.freeze(define),{get:(o,k)=>Object.hasOwn(o,k)?o[k]:fail('Unknown define.'+String(k)+'. Valid: '+types.join(', '))})});
  let time='day', depth=0;
  function distribute(mode,name,o,place){
    const origin=vec(o.pos??[0,0,0]), shift=v=>v.map((x,i)=>x+origin[i]);
    const add=p=>place(name,{...(o.opts??{}),pos:shift(p)});
    if(mode==='row'){const a=vec(o.from),b=vec(o.to),n=int(o.count,256);for(let i=0;i<n;i++)add(a.map((x,j)=>x+(b[j]-x)*i/Math.max(1,n-1)));return;}
    if(mode==='grid'){const r=int(o.rows,64),c=int(o.cols,64);int(r*c,256);const gap=Array.isArray(o.gap)?vec(o.gap,2):[num(o.gap),o.gap];for(let i=0;i<r;i++)for(let j=0;j<c;j++)add([j*gap[0],0,i*gap[1]]);return;}
    const n=int(o.count,256),[w,d]=vec(o.area,2);let seed=num(o.seed??1)>>>0;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const avoid=(o.avoid??[]).map(a=>vec(a)); // local x,z,radius circles
    for(let i=0,tries=0;i<n&&tries<n*32;i++,tries++){const x=(random()-.5)*w,z=(random()-.5)*d;
      if(avoid.some(([a,b,r])=>Math.hypot(x-a,z-b)<r)){i--;continue;}add([x,0,z]);}
  }
  function build(name,o={},parent=-1){
    if(++depth>20)fail('Nested item limit or circular b.use: '+name);
    const item=get(name,['building','prop','location']);
    const node=(kind,opts={},extra={})=>Number(command('shape',[name,kind,parent,opts,extra]));
    const group=node('group',pick(o),{solid:item.type==='building'||['bench','car','bus','limo'].includes(name)});
    function builder(parentId){
      const shape=(kind,opts={},extra={})=>Number(command('shape',[name,kind,parentId,opts,extra]));
      const b={};
      for(const k of ['box','sphere','cone','cylinder','wedge','torus','plane'])b[k]=(opts={})=>shape(k,opts);
      b.text=(label,opts={})=>shape('text',opts,{label});
      b.light=(color,intensity=1,distance=8,opts={})=>shape('light',opts,{color,intensity,distance});
      b.group=(opts={})=>builder(shape('group',opts));
      b.repeat=(n,fn)=>{for(let i=0;i<int(n,256);i++)fn(i)};
      b.use=(n,opts={})=>build(n,opts,parentId);
      for(const mode of ['scatter','row','grid'])b[mode]=(n,opts)=>distribute(mode,n,opts,b.use);
      b.ground=(opts={})=>shape('ground',opts);
      b.road=(path,width=5)=>stroke(path,width,'#465064');
      b.path=(points,width=1.5)=>stroke(points,width,'#c49d77');
      function stroke(path,width,color){if(!Array.isArray(path)||path.length<2)fail('Expected two or more path points');num(width);
        path.map(p=>vec(p)).forEach((p,i)=>{if(!i)return;const q=path[i-1],dx=p[0]-q[0],dz=p[2]-q[2];
          b.box({pos:p.map((v,j)=>(v+q[j])/2+(j===1?.04:0)),rot:[0,Math.atan2(dx,dz),0],scale:[width,.08,Math.hypot(dx,dz)||.01],color,outline:false});});}
      b.sky=({time:t})=>{command('sky',[t]);time=t};
      b.fog=(opts={})=>command('fog',[opts]);
      return Object.freeze(b);
    }
    try{invoke(item,()=>item.fn(builder(group),{...o,time}));}finally{depth--;}
  }
  function pick(o){return Object.fromEntries(['pos','rot','scale','color','rough','emissive','outline'].filter(k=>k in o).map(k=>[k,o[k]]));}
  const originalScene=base.scene;
  base.scene=(id,o,fn)=>{
    const custom=items.has(o.location);if(custom)get(o.location,['location']);
    originalScene(id,{...o,location:custom?'empty':o.location},s=>{
      time=o.time;if(custom)build(o.location,{});
      const extra={spawn:(name,pos,opts={})=>build(name,{...opts,pos})};
      for(const mode of ['scatter','row','grid'])extra[mode]=(n,opts)=>distribute(mode,n,opts,(name,o)=>build(name,o));
      extra.do=(at,char,action,opts)=>{
        if(items.get(action)?.type!=='animation')return s.do(at,char,action,...(opts===undefined?[]:[opts]));
        const item=items.get(action),duration=opts?.duration??1;
        if(!(duration>0&&duration<=30))fail(action+': duration must be 0–30 seconds');
        command('animation',[at,char,action,duration]);
        const steps=Math.ceil(duration*15);
        for(let i=0;i<=steps;i++){const parts=['head','torso','armL','armR','legL','legR'];
          const rig=Object.fromEntries(parts.map(k=>[k,{rotation:{x:0,y:0,z:0}}]));
          invoke(item,()=>item.fn(rig,duration*i/steps,opts??{}));
          command('keyframe',[parts.map(k=>{const r=rig[k].rotation;return vec(Array.isArray(r)?r:[r.x,r.y,r.z])})]);}
      };
      return fn(new Proxy(extra,{get:(o,k)=>{
        if(Object.hasOwn(o,k))return o[k];
        if(Object.hasOwn(s,k))return s[k];
        fail('Unknown scene method: s.'+String(k)+'. Valid methods: '+[...new Set([...Object.keys(s),...Object.keys(o)])].join(', '));
      }}));
    });
  };
  const originalCharacter=base.character;
  base.character=(name,o={})=>{if(!o.preset)return originalCharacter(name,o);
    const {preset,...rest}=o,defaults=get(preset,['character']).fn;
    return originalCharacter(name,{...defaults,...rest,outfit:{...defaults.outfit,...rest.outfit}});};
}
