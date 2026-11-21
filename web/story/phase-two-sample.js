import {sfxNames,ambienceNames,musicNames,fxNames,transitions,weatherNames,extraActions} from './phase-two.js';
const js=JSON.stringify;
export const phaseTwoSample=`story({title:"A Night at the Sound Fair",fps:30});
const jin=character("Jin");
const kai=character("Kai",{outfit:{shirt:"#c975ab"},hair:"short"});
const sounds=${js(sfxNames)};
const ambience=${js(ambienceNames)};
const music=${js(musicNames)};
const effects=${js(fxNames)};
const transitions=${js(transitions)};
const weather=${js(weatherNames)};
// Seven festival stops cover every sound loop, effect, transition, weather type and action.
const actions=${js(extraActions)};
const args={hold:"briefcase",hug:kai,dance:"shuffle",push:kai,pick_up:"flag",give:kai};
for(let i=0;i<7;i++){
  scene(["Welcome","The Arcade","Snow Lanterns","On the Radio","Street Parade","Thunder Break","Finale"][i],{
    location:["backyard_party","house_interior","neighborhood_street","basketball_court"][i%4],
    time:i%2?"night":"dusk",duration:10,weather:weather[i%weather.length],
    transitionIn:{name:transitions[i%6],duration:.55},transitionOut:"fade_black"
  },s=>{
    s.place(jin,[-1,0,0]);s.place(kai,[1,0,0]);
    s.cam(0,"two_shot",{targets:[jin,kai],dist:11,cut:true});
    s.cam(7.3,"wide",{target:jin});
    s.title(.65,["Sound Fair","Arcade","Lanterns","Broadcast","Parade","Storm","Finale"][i],{sub:"ACT "+(i+1),duration:1.3,style:["chapter","lowerthird","big"][i%3]});
    s.bubble(2,jin,["Welcome to the fair!","What a night...","Look up!"][i%3],{kind:["speech","thought","exclaim"][i%3],duration:2});
    s.say(4,jin,"This is our big night!",{speed:3});
    s.ambience(ambience[i],{volume:.66});
    s.music(music[i%music.length],{volume:.68,fadeIn:.5});
    sounds.forEach((name,n)=>{if(n%7===i)s.sfx(1.6+Math.floor(n/7)*2.3,name);});
    effects.forEach((name,n)=>{if(n%7===i)s.fx(3.1+Math.floor(n/7)*3,name,{position:[0,3,0],duration:3,intensity:1.1});});
    const group=actions.filter((name,n)=>Math.floor(n/4)===i);
    group.forEach((name,n)=>s.do(1.5+n*1.83,jin,name,args[name]));
    if(i===2){
      s.timeOfDay(5,"night",{duration:2});
    }
    if(i===0)s.slowmo(3,2,.5);
    if(i===3)s.freeze(6.5,.6);
    s.transition(8.4,transitions[i%6],{duration:.6});
  });
}
`;
