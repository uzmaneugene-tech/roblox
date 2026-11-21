import {drawStoryOverlays} from './story-effects.js';
import {paintSky} from './world/preview.js';
const grades={warm_dusk:['#ff9a59',.26],cold_night:['#366acb',.34],bright_day:['#fff1b6',.2],neutral:null};
export function frameFinish(canvas){
  const ctx=canvas.getContext('2d'),scratch=document.createElement('canvas'),mini=scratch.getContext('2d');
  const skies=new Map(),effectCanvas=document.createElement('canvas');let sizeKey='',vignette,grain;
  return (source,{weights,overlays,time,grade,dof,focus,quality,noise,t,word})=>{
    const w=canvas.width,h=canvas.height,key=[w,h].join('/');
    if(sizeKey!==key){
      skies.clear();sizeKey=key;
      vignette=ctx.createRadialGradient(w*.5,h*.46,w*.24,w*.5,h*.5,Math.hypot(w,h)*.55);
      vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#10101f54');
    }
    function drawSky(name,alpha){
      if(!skies.has(name)){const sky=document.createElement('canvas');sky.width=w;sky.height=h;paintSky(sky.getContext('2d'),name,w,h);skies.set(name,sky);}
      ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(skies.get(name),0,0);ctx.restore();
    }
    if(weights){let sum=0;['day','dusk','night'].forEach((name,i)=>{if(weights[i]>0){sum+=weights[i];drawSky(name,weights[i]/sum);}});}
    else drawSky(time,1);
    ctx.drawImage(source,0,0,w,h);
    const g=grades[grade];if(g){ctx.save();ctx.globalCompositeOperation=grade==='bright_day'?'screen':'soft-light';ctx.globalAlpha=g[1]*2;ctx.fillStyle=g[0];ctx.fillRect(0,0,w,h);ctx.restore();}
    const sw=Math.max(1,Math.round(w/(quality==='High'?5:9))),sh=Math.max(1,Math.round(h*sw/w));
    if(quality!=='Low'||focus){
      if(scratch.width!==sw||scratch.height!==sh){scratch.width=sw;scratch.height=sh;}
      mini.filter='none';mini.drawImage(canvas,0,0,sw,sh);
      if(focus&&dof.amount){
        // A soft focus window follows the projected target at any lens distance.
        const radius=Math.max(1,focus.r*sh),x=focus.x*sw,y=focus.y*sh;
        const mask=mini.createRadialGradient(x,y,radius*.35,x,y,radius*1.65);
        mask.addColorStop(0,'black');mask.addColorStop(1,'transparent');
        mini.save();mini.globalCompositeOperation='destination-out';mini.fillStyle=mask;mini.fillRect(0,0,sw,sh);mini.restore();
        ctx.save();ctx.filter='blur('+Math.max(.5,h*.004*dof.amount)+'px)';ctx.globalAlpha=dof.amount;ctx.drawImage(scratch,0,0,w,h);ctx.restore();
      }
      if(quality!=='Low'){
        mini.clearRect(0,0,sw,sh);mini.filter='contrast(240%) brightness(75%)';mini.drawImage(source,0,0,sw,sh);
        ctx.save();ctx.filter='blur('+Math.max(1,h*.009)+'px)';ctx.globalCompositeOperation='screen';ctx.globalAlpha=.13;ctx.drawImage(scratch,0,0,w,h);ctx.restore();
      }
    }
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    if(noise){
      if(!grain){const tile=document.createElement('canvas');tile.width=tile.height=64;const c=tile.getContext('2d'),im=c.createImageData(64,64);let n=7;
        for(let i=0;i<im.data.length;i+=4){n=(Math.imul(n,1664525)+1013904223)>>>0;im.data.fill(n>>>24,i,i+3);im.data[i+3]=20;}c.putImageData(im,0,0);grain=ctx.createPattern(tile,'repeat');}
      ctx.save();const k=Math.floor(t*30)%64;ctx.translate(-k,-k);ctx.fillStyle=grain;ctx.fillRect(0,0,w+64,h+64);ctx.restore();
    }
    if(word){ctx.save();ctx.translate(w/2,h*.88);ctx.scale(word.scale,word.scale);ctx.font='950 '+w*.084+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.lineJoin='round';ctx.lineWidth=w*.0135;ctx.strokeStyle='#101119';ctx.fillStyle='white';ctx.strokeText(word.word,0,0,w*.85);ctx.fillText(word.word,0,0,w*.85);ctx.restore();}
    if(overlays){
      const distort=overlays.moves.find(e=>e.name==='whip_pan'||e.name==='glitch');
      if(distort){
        effectCanvas.width=w;effectCanvas.height=h;effectCanvas.getContext('2d').drawImage(canvas,0,0);
        if(distort.name==='whip_pan'){
          const shift=w*.36*distort.phase;ctx.drawImage(effectCanvas,-shift,0);ctx.drawImage(effectCanvas,w-shift,0);
        }else for(let i=0;i<12;i++){
          const y=Math.round(i*h/12),dh=Math.ceil(h/12),dx=w*.14*distort.phase*Math.sin(i*62+Math.floor(t*24));
          ctx.drawImage(effectCanvas,0,y,w,dh,dx,y,w,dh);
        }
      }
      drawStoryOverlays(ctx,w,h,overlays,t);
    }
  };
}
