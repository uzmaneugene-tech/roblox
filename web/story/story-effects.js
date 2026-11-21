import {T} from './world/mesh.js';
import {stormTimes,fxNames} from './phase-two.js';
import {smooth,clamp} from './motion.js';
import {presets} from './world/preview.js';
const colors={
  confetti:['#ff697a','#ffd450','#60e6c8','#a192ff'],rain:['#a0d1ef'],snow:['#f7fbff'],smoke:['#a19ead','#777585'],
  sparks:['#ffb037','#ffe98a'],hearts:['#ff638c','#ffa8c0'],money_rain:['#7fd78a','#f5d062'],
  stars:['#ffef86','#ffffff'],fireworks:['#ff789c','#e4b2ff','#6bffdc','#fff294'],dust:['#cab997','#e5d3af']
};
const rand=(n,k)=>{const v=Math.sin(n*127.1+k*311.7)*43758.5453;return v-Math.floor(v);};
const active=(items,t)=>items?.filter(e=>t>=e.t&&t<e.t+e.duration)??[];
function geometry(name){
  if(name==='money_rain')return new T.PlaneGeometry();
  if(name==='money_coins')return new T.CylinderGeometry(.5,.5,.16,8);
  if(name==='stars'||name==='hearts'){
    const shape=new T.Shape();
    if(name==='hearts'){
      shape.moveTo(0,-.5);shape.bezierCurveTo(-1,.12,-.31,.79,0,.35);shape.bezierCurveTo(.31,.79,1,.12,0,-.5);
    }else for(let i=0;i<10;i++){const rr=i%2?.23:.54,a=i*Math.PI/5+Math.PI/2;shape[i?'lineTo':'moveTo'](rr*Math.cos(a),rr*Math.sin(a));}
    return new T.ShapeGeometry(shape);
  }
  if(['smoke','dust','snow','fireworks','sparks'].includes(name))return new T.IcosahedronGeometry(.5,0);
  return new T.BoxGeometry();
}
export function sceneEffects(root,data) {
  const authored=data.effects??[], storms=data.weather==='storm'?stormTimes(data.sourceDuration??data.duration):[];
  const weather=data.weather==='storm'?'rain':data.weather;
  const system=new Map(), dummy=new T.Object3D(), tint=new T.Color();
  const dollars=authored.some(e=>e.name==='money_rain');
  const bill=()=>{
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=48;
    const c=canvas.getContext('2d');c.fillStyle='#a2e498';c.fillRect(0,0,96,48);
    c.strokeStyle='#367755';c.lineWidth=3;c.strokeRect(3,3,90,42);
    c.font='bold 33px sans-serif';c.fillStyle='#245239';c.textAlign='center';c.fillText('$',48,36);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
  };
  for(const name of [...fxNames.filter(n=>authored.some(e=>e.name===n)||weather===n&&['rain','snow'].includes(n)),...(dollars?['money_coins']:[])]){
    const mesh=new T.InstancedMesh(geometry(name),new T.MeshBasicMaterial({color:'white',map:name==='money_rain'?bill():null,side:T.DoubleSide,transparent:['smoke','dust'].includes(name),opacity:['smoke','dust'].includes(name)?.56:1}),128);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;mesh.userData.particle=true;root.add(mesh);system.set(name,mesh);
  }
  function drawBatch(mesh,name,cue,t,at,index,cap,key){
    const age=t-cue.t, continuous=cue.weather;
    const [x,y,z]=cue.target?(at(cue.target,t)?.pos??cue.position):cue.position;
    const count=Math.min(128-index,cap,Math.round((continuous?100:name==='money_coins'?12:36)*cue.intensity));
    for(let i=0;i<count;i++){
      const u=rand(i,key),v=rand(i,key+1),j=rand(i,key+2),k=rand(i,key+3);
      let px,py,pz,sx,sy,sz;
      if(name==='rain'||name==='snow'){
        const snow=name==='snow',width=continuous?37:9;
        px=x+(u-.5)*width+Math.sin(age+j*7)*(snow?1:.25);pz=z+(v-.5)*width;
        py=y+(((j+.01-age*(snow?.095:.92))%1+1)%1)*(continuous?16:6);
        sx=sz=snow?.16:.036;sy=snow?.20:.69;
      }else{
        const p=clamp(age/cue.duration),angle=u*Math.PI*2;
        const burst=['fireworks','sparks','stars'].includes(name), rising=['smoke','hearts','dust'].includes(name);
        const travel=(.8+j*3.9)*(burst?smooth(p):rising?.35+p*.7:.22+p);
        px=x+Math.cos(angle)*travel;pz=z+Math.sin(angle)*travel;
        py=y+(burst?(v-.23)*travel*1.9-.4*p:rising?v+p*(.9+3*v):2+3*v-(3+v)*p);
        const size=(.11+.17*k)*Math.min(1,(1-p)*7)*(name==='smoke'?2.4:name==='fireworks'?.7:1);
        sx=size*(name==='money_rain'?2.1:1);sy=size;sz=name==='confetti'?size*.13:size;
      }
      dummy.position.set(px,py,pz);dummy.scale.set(sx,sy,sz);
      dummy.rotation.set(j+age*k,v+age*.7,(u-.5)*.22+(['rain','snow'].includes(name)?0:age));dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);mesh.setColorAt(index,tint.set(name==='money_rain'?'white':name==='money_coins'?'#f2cb65':colors[name][i%colors[name].length]));index++;
    }
    return index;
  }
  return {
    update(t,quality,at,origin){
      const events=active(authored,t);
      for(const [name,mesh] of system){
        let i=0;const cap=quality==='Low'?32:quality==='Medium'?72:128;
        if(name===weather)i=drawBatch(mesh,name,{weather:true,t:0,intensity:data.weather==='storm'?1.22:.8,position:[origin[0],0,origin[2]]},t,at,i,cap,2);
        for(const e of events)if((e.name===name||e.name==='money_rain'&&name==='money_coins')&&i<cap)i=drawBatch(mesh,name,e,t,at,i,cap-i,Math.round(e.t*100)+3);
        mesh.count=i;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      }
      return storms.reduce((v,start)=>{const p=t-start;return Math.max(v,p>=-.18&&p<.16?Math.max(0,1-Math.abs(p+.09)*12)*.62:0);},0);
    },
    dispose(){for(const m of system.values()){root.remove(m);m.dispose();m.geometry.dispose();m.material.map?.dispose();m.material.dispose();}},
  };
}

export function timeWeights(data,t){
  const names=Object.keys(presets);
  let start=names.map(n=>+(n===data.time)), target=start, onset=0,length=.01;
  function at(time){const p=smooth((time-onset)/length);return start.map((s,i)=>s+(target[i]-s)*p);}
  for(const event of data.timeChanges??[]){
    if(t<event.t)break;
    start=at(event.t);target=names.map(n=>+(n===event.value));onset=event.t;length=event.duration;
  }
  return at(t);
}
export function frameEffects(data,t,elapsed){
  const list=active(data.transitions,t);
  const out=list.map(e=>({name:e.name,phase:Math.sin(Math.PI*(t-e.t)/e.duration)}));
  if(data.transitionIn&&elapsed<data.transitionIn.duration)out.push({name:data.transitionIn.name,phase:1-smooth(elapsed/data.transitionIn.duration)});
  if(data.transitionOut&&elapsed>data.duration-data.transitionOut.duration)out.push({name:data.transitionOut.name,phase:smooth(1-(data.duration-elapsed)/data.transitionOut.duration)});
  return {moves:out,bubbles:active(data.bubbles,t).slice(-4),title:active(data.titles,t).at(-1)};
}

export function drawStoryOverlays(ctx,w,h,{moves,bubbles,title,flash},t){
  ctx.save();
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const {pixel:[x,y],...bubble} of bubbles){
    if(x<0||x>1||y<0||y>1)continue;
    const font=w*.051;ctx.font='750 '+font+'px system-ui';
    const rows=[''];
    for(const word of bubble.text.split(/\s+/)){const trial=rows.at(-1)+' '+word;
      if(rows.at(-1)&&ctx.measureText(trial).width>w*.57)rows.push(word);else rows[rows.length-1]=trial.trim();}
    const lines=rows.slice(0,5);
    if(rows.length>5)lines[4]+='…';
    const bw=Math.min(w*.76,Math.max(w*.21,...lines.map(r=>ctx.measureText(r).width+w*.085))),bh=font*(lines.length*1.24+.82);
    const bx=clamp(x*w,bw/2+w*.02,w-bw/2-w*.02),by=clamp(y*h-bh*.58,bh/2+h*.02,h-bh/2);
    ctx.fillStyle=bubble.kind==='exclaim'?'#ffe49d':'#fff9eb';ctx.strokeStyle='#283044';ctx.lineWidth=w*.006;
    ctx.beginPath();ctx.roundRect(bx-bw/2,by-bh/2,bw,bh,bubble.kind==='thought'?bh*.39:w*.04);ctx.fill();ctx.stroke();
    ctx.beginPath();
    if(bubble.kind==='thought'){ctx.arc(bx+font*.35,by+bh*.5+font*.17,font*.15,0,Math.PI*2);ctx.moveTo(bx+font*.61,by+bh*.5+font*.42);ctx.arc(bx+font*.54,by+bh*.5+font*.42,font*.07,0,Math.PI*2);}
    else {ctx.moveTo(bx-font*.3,by+bh*.5);ctx.lineTo(bx+font*.12,by+bh*.5+font*.55);ctx.lineTo(bx+font*.37,by+bh*.5);}
    ctx.fill();ctx.stroke();
    ctx.fillStyle='#182339';lines.forEach((r,i)=>ctx.fillText(r,bx,by+(i-(lines.length-1)/2)*font*1.24,bw-w*.05));
  }
  if(title){
    const at=title.style==='lowerthird'?.73:.43,font=w*(title.style==='big'?.114:.084),y=h*at;
    ctx.globalAlpha=Math.min(1,(t-title.t)*8,(title.t+title.duration-t)*8);
    ctx.fillStyle='#162036cc';ctx.fillRect(0,y-font,w,font*2.18);
    ctx.fillStyle='#fff5d8';ctx.font='900 '+font+'px system-ui';ctx.fillText(title.text,w/2,y,w*.88);
    if(title.sub){ctx.font='600 '+font*.46+'px system-ui';ctx.fillText(title.sub,w/2,y+font*.69,w*.85);}
    ctx.globalAlpha=1;
  }
  if(flash){ctx.fillStyle='#e1edff';ctx.globalAlpha=flash;ctx.fillRect(0,0,w,h);}
  for(const {name,phase} of moves){
    if(name==='whip_pan'||name==='glitch')continue;
    ctx.globalAlpha=name==='iris'?1:phase;
    ctx.fillStyle=name==='flash'||name==='fade_white'?'#fff':'#080a14';
    if(name==='iris'){
      ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(w/2,h/2,Math.hypot(w,h)*.53*(1-phase),0,Math.PI*2);ctx.fill('evenodd');
    }else ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
}
