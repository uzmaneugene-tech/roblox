import {paintSky} from './world/preview.js';
const grades={warm_dusk:['#ff9a59',.26],cold_night:['#366acb',.34],bright_day:['#fff1b6',.2],neutral:null};
export function frameFinish(canvas){
  const ctx=canvas.getContext('2d'),scratch=document.createElement('canvas'),mini=scratch.getContext('2d');
  const sky=document.createElement('canvas');let skyKey='',vignette,grain;
  return (source,{time,grade,dof,focus,quality,noise,t,word})=>{
    const w=canvas.width,h=canvas.height,key=[w,h,time].join('/');
    if(skyKey!==key){
      sky.width=w;sky.height=h;paintSky(sky.getContext('2d'),time,w,h);skyKey=key;
      vignette=ctx.createRadialGradient(w*.5,h*.46,w*.24,w*.5,h*.5,Math.hypot(w,h)*.55);
      vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#10101f54');
    }
    ctx.drawImage(sky,0,0);ctx.drawImage(source,0,0,w,h);
    const g=grades[grade];if(g){ctx.save();ctx.globalCompositeOperation=grade==='bright_day'?'screen':'soft-light';ctx.globalAlpha=g[1]*2;ctx.fillStyle=g[0];ctx.fillRect(0,0,w,h);ctx.restore();}
    const sw=Math.max(1,Math.round(w/(quality==='High'?5:9))),sh=Math.max(1,Math.round(h*sw/w));
    if(quality!=='Low'||focus){
      if(scratch.width!==sw||scratch.height!==sh){scratch.width=sw;scratch.height=sh;}
      mini.filter='none';mini.drawImage(canvas,0,0,sw,sh);
      if(focus&&dof.amount){
        // A soft focus window follows the projected target at any lens distance.
        ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);
        ctx.ellipse(focus.x*w,focus.y*h,focus.r*h*.6,focus.r*h,0,0,2*Math.PI,true);ctx.clip('evenodd');
        ctx.filter='blur('+Math.max(.5,h*.004*dof.amount)+'px)';ctx.globalAlpha=dof.amount;ctx.drawImage(scratch,0,0,w,h);ctx.restore();
      }
      if(quality!=='Low'){
        mini.filter='contrast(240%) brightness(75%)';mini.drawImage(source,0,0,sw,sh);
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
  };
}
