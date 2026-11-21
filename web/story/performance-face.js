// Time-addressed beats: seeking and exporting never advance a random generator.
export function faceBeat(id,t,lines,expression){
  let seed=2166136261;
  for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const period=i=>2+((Math.imul(seed^(i+1),2654435761)>>>0)%2850)/1000;
  // Repeat an eight-blink phrase, offset per performer.
  const spans=Array.from({length:8},(_,i)=>period(i));
  let phase=(t+(seed%1300)/1000)%spans.reduce((a,b)=>a+b,0);
  for(const span of spans){if(phase<span)break;phase-=span;}
  const blink=phase<.13;
  const line=lines.findLast(l=>l.char===id&&l.t<=t);
  if(!line)return {blink,mouth:0};
  const p=(t-line.t)*line.speed,i=Math.floor(p),word=line.text.trim().split(/\s+/)[i];
  const mouth=word?Math.round(Math.sin(Math.PI*(p-i))*(expression==='shouting'?4:2+word.length%3)):0;
  return {blink,mouth};
}
