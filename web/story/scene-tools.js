const round=a=>a.map(v=>+v.toFixed(2));
export function sceneTools(get,stop,lastError){
  const $=id=>document.getElementById('tools-'+id),canvas=document.querySelector('#story-film'),overlay=$('overlay'),panel=$('panel');
  const pointers=new Map();let picked=null,drag=false,previous=null,localShot=null;
  const state=text=>{$('result').textContent=text;};
  async function copy(text){try{await navigator.clipboard.writeText(text);state('Copied: '+text);}
    catch{state(text);const r=document.createRange();r.selectNodeContents($('result'));getSelection().removeAllRanges();getSelection().addRange(r);}}
  function refresh(){
    const view=get();if(!view?.debug())return;
    overlay.replaceChildren();if(!panel.open)return;
    const elem=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;overlay.append(n);};
    const pt=p=>{const [x,y,z]=view.project(p);return z>=-1&&z<=1?[x*900,y*1600]:null;};
    const line=(a,b,color,w=2)=>{a=pt(a);b=pt(b);if(a&&b)elem('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':w});};
    const anchor=picked?.position??[0,0,0], [x,y,z]=anchor;
    if($('grid').checked){
      for(let i=-8;i<=8;i++){line([x+i,y,z-8],[x+i,y,z+8],i?'#ffffff50':'#75bdff',i?2:5);line([x-8,y,z+i],[x+8,y,z+i],i?'#ffffff50':'#ff8880',i?2:5);}
      line(anchor,[x,y+5,z],'#bdf578',5);for(let i=0;i<=5;i++)line([x,y+i,z],[x+.22,y+i,z],'#bdf578',4);
      const tip=pt([x,y+5,z]);if(tip)elem('text',{x:tip[0]+8,y:tip[1],fill:'#d9ffac','font-size':30},'5 studs');
    }
    const p=picked&&pt(anchor);if(p)elem('circle',{cx:p[0],cy:p[1],r:12,fill:'#ecff69',stroke:'#273334','stroke-width':4});
  }
  function reset(){picked=null;localShot=null;pointers.clear();$('position').textContent='Tap the preview to pick a position.';overlay.replaceChildren();}
  function mode(){canvas.style.touchAction=panel.open?'none':'';if(!panel.open){localShot=null;get()?.camera(null);}refresh();}
  panel.ontoggle=mode;$('grid').onchange=refresh;
  function fly(dx,dy,forward=0,pan=false,up=0){
    const v=get(),d=v?.debug();if(!d)return;stop();
    const {from,look,fov}=localShot??d.camera, delta=look.map((n,i)=>n-from[i]),len=Math.max(.1,Math.hypot(...delta));
    let yaw=Math.atan2(delta[0],delta[2]),pitch=Math.asin(Math.max(-1,Math.min(1,delta[1]/len)));
    const origin=[...from];
    if(pan){origin[0]+=Math.cos(yaw)*dx;origin[2]-=Math.sin(yaw)*dx;origin[1]+=dy;}
    else{yaw+=dx;pitch=Math.max(-1.48,Math.min(1.48,pitch+dy));}
    const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
    dir.forEach((n,i)=>origin[i]+=n*forward);origin[1]+=up;
    localShot={from:origin,look:origin.map((n,i)=>n+len*dir[i]),fov,shot:'free'};v.camera(localShot);refresh();
  }
  function gesture(){const a=[...pointers.values()],b=a[1]??a[0];return {x:(a[0].x+b.x)/2,y:(a[0].y+b.y)/2,gap:Math.hypot(a[0].x-b.x,a[0].y-b.y)};}
  canvas.onpointerdown=e=>{if(!panel.open||!get()?.debug())return;stop();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag=pointers.size>1;previous=gesture();};
  canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=gesture(),dx=g.x-previous.x,dy=g.y-previous.y;
    if(!drag&&Math.hypot(dx,dy)<4)return;drag=true;
    if(pointers.size===1)fly(-dx*.006,dy*.006);else fly(dx*.026,dy*.026,(g.gap-previous.gap)*.045,true);previous=g;};
  canvas.onpointerup=e=>{if(!pointers.delete(e.pointerId))return;if(!drag){
    const r=canvas.getBoundingClientRect();picked=get().pick((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
    if(picked){$('position').textContent=JSON.stringify(picked.position)+' · nearest prop: '+(picked.nearest??'none');refresh();if($('place').checked)snippet();}
  }if(pointers.size)previous=gesture();};
  canvas.onpointercancel=e=>{pointers.delete(e.pointerId);drag=true;if(pointers.size)previous=gesture();};
  canvas.onwheel=e=>{if(panel.open){e.preventDefault();fly(0,0,-Math.sign(e.deltaY));}};
  function snippet(){if(!picked)return state('Pick a position first.');const pos=JSON.stringify(picked.position),name=$('name').value.trim();
    if($('kind').value==='place'&&!/^[A-Za-z_$][\w$]*$/.test(name))return state('Enter your character variable name.');
    copy($('kind').value==='place'?'s.place('+name+', '+pos+');':'s.spawn('+JSON.stringify(name)+', '+pos+');');}
  $('coords').onclick=()=>picked?copy(JSON.stringify(picked.position)):state('Pick a position first.');
  $('shot').onclick=()=>{const d=get()?.debug();if(!d)return state('Run a story first.');const c=d.camera;copy('s.cam('+Number(d.localTime.toFixed(3))+', "static", '+JSON.stringify({from:round(c.from),look:round(c.look),fov:+c.fov.toFixed(2)})+');');};
  $('up').onclick=()=>fly(0,0,0,true,1);$('down').onclick=()=>fly(0,0,0,true,-1);
  $('reset').onclick=()=>{localShot=null;get()?.camera(null);refresh();};
  function settings(){return {quality:$('quality').value,grain:$('grain').checked};}
  $('quality').onchange=$('grain').onchange=()=>get()?.configure(settings());
  $('debug').onclick=()=>{stop();const d=get()?.debug();const text=JSON.stringify({...d,lastError:lastError()||null,browser:navigator.userAgent},null,2);$('log').textContent=text;copy(text);
    if(d)canvas.toBlob(blob=>{if(blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='framecut-frame.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}},'image/png');};
  return {refresh,reset,settings};
}
