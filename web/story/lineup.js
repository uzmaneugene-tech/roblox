import {createAvatarView} from './avatar-view.js';
import {silhouettes} from './styles.js';
import {compileMotion} from './motion.js';
import {expressions} from './registry.js';
export function styleLineup(){
  const panel=document.querySelector('#style-lineup'),styles=Object.keys(silhouettes),select=panel.querySelector('select');
  const cast=Object.fromEntries(styles.map(style=>[style,{name:'Jin',style}]));
  select.replaceChildren(...styles.map(s=>new Option(s,s)));
  let actor,portrait,loop,first=true;
  const sheet=panel.querySelector('.style-sheet'),motion=panel.querySelector('.style-motion'),toggle=panel.querySelector('button');
  const track=compileMotion([0,0,0],[{action:'walk_to',arg:[0,0,4],t:0},{action:'wave',t:1.65},{action:'sit',t:3.25}]);
  const snap=(host,label,view,canvas,style,angle,face)=>{
    view.show(cast[style],angle,face,null,true);
    const pic=document.createElement('img');pic.src=canvas.toDataURL();pic.alt=style+' '+label;
    const fig=document.createElement('figure'),cap=document.createElement('figcaption');cap.textContent=label;fig.append(pic,cap);host.append(fig);
  };
  function stop(){cancelAnimationFrame(loop);loop=0;toggle.textContent='Play walk / wave / sit';}
  function draw(){
    if(!panel.open||location.hash!=='#characters'){stop();return;}
    const canvas=panel.querySelector('.style-body'),close=panel.querySelector('.style-face');
    actor??=createAvatarView(canvas);portrait??=createAvatarView(close,{closeUp:true});
    if(first){first=false;for(const style of styles)snap(panel.querySelector('.style-row'),style,actor,canvas,style,'front','happy');}
    const style=select.value;sheet.replaceChildren();
    for(const angle of ['front','side','back','three-quarter'])snap(sheet,angle,actor,canvas,style,angle,'happy');
    const faces=panel.querySelector('.face-row');faces.replaceChildren();
    for(const face of expressions)snap(faces,face,portrait,close,style,'front',face);
    stop();actor.show(cast[style],'three-quarter','happy',null,true);
  }
  toggle.onclick=()=>{if(loop){stop();return;}const since=performance.now();toggle.textContent='Pause motion test';
    const play=now=>{if(!panel.open||location.hash!=='#characters')return stop();
      const t=((now-since)/1000)%5.2;motion.textContent=t<1.65?'Walk':t<3.25?'Wave':'Sit';
      actor.show(cast[select.value],'three-quarter','happy',track(t),true);loop=requestAnimationFrame(play);};play(since);};
  select.onchange=draw;panel.ontoggle=draw;addEventListener('hashchange',draw);
}
