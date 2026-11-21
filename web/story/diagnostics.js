// Runs inside the isolated JS runtime. Leave labels, narration, and IDs as text.
export function checking(report){
  const numeric=new Set('duration t count seed width height depth floors rows cols ambient intensity distance fps near far shake amount speed rough volume fadeIn angle speed radius factor fov ease shake pos position scale rot rotate area from look offset to gap avoid path points slide'.split(' '));
  function normalize(v,key=''){
    if(key==='rotate'&&typeof v==='number'&&v!==0&&Math.abs(v)<6.3)report('notice','Story prop rotate uses degrees; 90 is a quarter turn.');
    if(typeof v==='string'){
      const s=v.trim();
      if(s!==v)report('notice','Trimmed extra spaces from '+(key||'argument')+'.');
      if(numeric.has(key)&&s!==''&&Number.isFinite(Number(s))){report('notice','Converted a numeric string in '+key+'.');return Number(s);}
      if(['color','skin','shirt','pants','shoes','emissive','hair'].includes(key)&&/^#[0-9a-f]{3}$/i.test(s)){report('notice','Expanded short hex color '+s+'.');return '#'+[...s.slice(1)].map(x=>x+x).join('');}
      return s;
    }
    if(Array.isArray(v)){
      if(key==='avoid')return v.map(row=>{
        if(Array.isArray(row)&&row.length===4){report('notice','Converted [x,y,z,radius] to [x,z,radius].');row=[row[0],row[2],row[3]];}
        return normalize(row,'area');
      });
      if(key==='scale'&&v.length===1){report('notice','Converted one-element scale to a number.');return normalize(v[0],key);}
      const a=v.map(x=>normalize(x,key));
      if(key==='rot'&&a.some(n=>Math.abs(n)>6.3))report('notice','Library rot uses radians; check values above 6.3 (π is a half turn).');
      if(key==='rotate'&&a.some(n=>n!==0&&Math.abs(n)<6.3))report('notice','Story prop rotate uses degrees; e.g. [0,90,0].');
      return a;
    }
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x,k)]));
    return v;
  }
  const timed='do cam say narrate sfx title fx bubble transition slowmo freeze timeOfDay follow'.split(' ');
  function inspect(value,key){
    if(value==null)return;
    if(['pos','position','rot','slide','offset','from','look','to'].includes(key)&&(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite)))
      report('error',key+' needs three finite numbers, e.g. [0,2,0].');
    if(key==='scale'&&!(Number.isFinite(value)&&value>0||Array.isArray(value)&&value.length===3&&value.every(n=>Number.isFinite(n)&&n>0)))
      report('error','Invalid scale. Use scale:2 or scale:[1,2,1] (all positive).');
    if(['color','emissive','shirt','pants','shoes'].includes(key)&&value!==''&&!/^#[0-9a-f]{6}$/i.test(value))
      report('error',key+' must be a hex color, e.g. "#44aaff".');
    if(['rows','cols','count','floors'].includes(key)&&!Number.isInteger(value))report('error',key+' must be an integer, e.g. 3.');
    if(value&&typeof value==='object'&&!Array.isArray(value))for(const [k,v] of Object.entries(value))inspect(v,k);
  }
  const call=(fn,name,args)=>{
    try{const normalized=args.map((v,i)=>normalize(v,timed.includes(name)&&i===0?'t':
      name==='place'&&i===1||['spawn','prop'].includes(name)&&i===1||name==='do'&&i===3&&Array.isArray(v)?'position':
      name==='do'&&args[2]==='turn_to'&&i===3?'angle':name==='repeat'&&i===0?'count':name==='slowmo'&&i===2?'factor':['freeze','slowmo'].includes(name)&&i===1?'duration':
      name==='light'&&typeof args[0]==='string'?['color','intensity','distance'][i] :''));for(const v of normalized)inspect(v,'');return fn(...normalized);}
    catch(e){if(/limit exceeded|exceeded .*calls|out of memory|interrupted/i.test(String(e.message)))throw e;
      report('error',String(e.message),e.stack);return undefined;}
  };
  return {call,proxy(obj,label){
    return new Proxy({}, {get(_,k){
      if(typeof k!=='string')return undefined;
      if(!Object.hasOwn(obj,k))return ()=>report('error','Unknown '+label+': '+k+'. Valid values: '+Object.keys(obj).join(', ')+'.');
      return (...args)=>call(obj[k],k,args);
    }});
  }};
}
export function explain(message){
  const unknown=/unknown [^:]+:\s*["']?([\w-]+)["']?\.\s*Valid (?:values|options|methods): (.+?)\.(?:$|\n)/i.exec(message)
    ??/unknown option "([^"]+)"\. Valid options: (.+?)\./i.exec(message);
  if(unknown){
    const key=unknown[1].toLowerCase(),list=unknown[2].split(', ');
    const dist=s=>{let a=Array.from({length:s.length+1},(_,i)=>i);for(let i=0;i<key.length;i++){
      const b=[i+1];for(let j=0;j<s.length;j++)b.push(Math.min(b[j]+1,a[j+1]+1,a[j]+(key[i]!==s[j])));a=b;}return a.at(-1);};
    return message+' Did you mean "'+list.sort((a,b)=>dist(a)-dist(b)||a.localeCompare(b))[0]+'"?';
  }
  if(/Unknown/.test(message)&&/Valid values: \./.test(message))return message+' Install or define the missing item first.';
  if(/scale/i.test(message))return message+' Use scale:2 or scale:[1,2,1] (all positive).';
  if(/color/i.test(message))return message+' Use a hex color such as "#44aaff".';
  if(/time \(seconds\)/i.test(message))return message+' Move this cue inside the scene duration.';
  if(/count/i.test(message))return message+' Use an integer such as count:3.';
  return message;
}
