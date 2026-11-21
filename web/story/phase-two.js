export const sfxNames='whoosh door_open door_close buzzer cheer clap pop ding coin thud step camera_click gasp sad_trombone swoosh_fast hoop elevator_ding phone_ring heartbeat boom'.split(' ');
export const ambienceNames='city_night crickets party_crowd wind rain office_hum none'.split(' ');
export const musicNames='calm tense happy sad epic none'.split(' ');
export const fxNames='confetti rain snow smoke sparks hearts money_rain stars fireworks dust'.split(' ');
export const transitions='fade_black fade_white whip_pan flash iris glitch'.split(' ');
export const weatherNames='rain snow fog storm clear'.split(' ');
export const heldItems='phone briefcase cup letter ball money flag microphone umbrella'.split(' ');
export const danceStyles=['shuffle','robot','spin'];
export const extraActions='hold hug dance cry laugh push pick_up give phone_call point bow clap salute nod shake_head shrug stretch sleep kneel crawl backflip kick punch_air'.split(' ');

export function compileClock(duration, edits) {
  let from=0, out=0;
  const spans=[];
  const add=(source,length,rate)=>{if(length>0){spans.push({source,from:out,until:out+length,rate});out+=length;}};
  for(const edit of [...edits].sort((a,b)=>a.t-b.t)){
    if(edit.t<from-1e-8 || edit.t+edit.length>duration+1e-8)throw Error('Slow motion and freeze must fit inside the scene and cannot overlap.');
    add(from,edit.t-from,1);
    if (edit.rate) {
      add(edit.t,edit.length/edit.rate,edit.rate);
      from=edit.t+edit.length;
    } else {
      add(edit.t,edit.length,0);
      from=edit.t;
    }
  }
  add(from,duration-from,1);
  return {spans,duration:out};
}
export function clockAt(scene, elapsed) {
  const span=scene.clock?.find(s=>elapsed<s.until)??scene.clock?.at(-1);
  return span?span.source+Math.max(0,Math.min(elapsed,span.until)-span.from)*span.rate:elapsed;
}
export function stormTimes(duration) {
  return Array.from({length:Math.ceil(duration/5.2)},(_,i)=>1.15+i*5.2).filter(t=>t<duration);
}
