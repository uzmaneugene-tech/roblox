import {allItems,customItems,removeItem,saveItems,sources} from './store.js';
import {execute} from '../execute.js';
import {createStoryView} from '../story-view.js';
import {heldItems} from '../phase-two.js';

const demo={name:'crowd',type:'demo',options:'count, area, seed, style'};
const pretty=s=>s.replaceAll('_',' ');
const typeLabel=t=>({prop:'Props & vehicles',building:'Buildings',location:'Locations',character:'Character presets',animation:'Animations',demo:'Crowds'})[t];
export function previewCode(item,time='dusk'){
  const n=JSON.stringify(item.name);
  const actor=item.type==='character'?'const a=character("Actor",{preset:'+n+'});':item.type==='animation'?'const a=character("Actor");':'';
  const body={character:'s.place(a,[0,0,0]);',animation:'s.place(a,[0,0,0]);s.do(0,a,'+n+',{duration:4});',location:'',demo:'s.crowd({count:18,area:[12,10],seed:7,style:"kids"});'}[item.type]??'s.spawn('+n+',[0,0,0]);';
  return actor+'scene("Turntable",{duration:8,time:'+JSON.stringify(time)+',location:'+(item.type==='location'?n:'"empty"')+'},s=>{'+body+'});';
}
function saveFile(name,data){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([data],{type:'text/plain'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export async function startLibrary(){
  const el=id=>document.getElementById('lib-'+id);
  let items=[],item,view,version=0,raf=0,angle=.47,prev=0,spin=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state=msg=>{el('status').textContent=msg};
  const error=e=>{el('error').textContent=(e.line?'Line '+e.line+': ':'')+e.message;el('copy-error').hidden=false;};
  const clear=()=>{el('error').textContent='';el('copy-error').hidden=true;};
  function stop(){cancelAnimationFrame(raf);prev=0;}
  function draw(now){
    if(location.hash!=='#library'||!view)return;
    if(!prev||now-prev>=85){angle+=prev?Math.min(.09,(now-prev)/1000)*.24:0;prev=now;view.render((now/1000)%8,{angle});}
    if(spin)raf=requestAnimationFrame(draw);
  }
  async function show(name){
    const id=++version;stop();clear();item=items.find(i=>i.name===name)??demo;
    el('name').textContent=pretty(item.name);el('meta').textContent=typeLabel(item.type)+' / '+(item.builtin||item===demo?'Bundled':'Your library');
    el('delete').disabled=item.builtin||item===demo;
    el('source').value=item.source??previewCode(demo);el('item').value=name;el('canvas').removeAttribute('data-ready');
    const result=await execute(previewCode(item,el('time').value),sources(items));if(id!==version||location.hash!=='#library')return;
    if(result.error){error(result.error);return;}
    view??=createStoryView(el('canvas'),null);view.setTimeline(result.timeline);angle=.47;draw(performance.now());el('canvas').dataset.ready=name;
  }
  function list(name){
    const filter=el('type').value, visible=[...items,demo].filter(i=>filter==='all'||i.type===filter);
    el('item').replaceChildren(...visible.map(i=>new Option(pretty(i.name),i.name)));
    return show(visible.some(i=>i.name===name)?name:visible[0].name);
  }
  async function reload(name){items=await allItems();await list(name);}
  function action(id,fn){el(id).onclick=async()=>{clear();try{await fn()}catch(e){error(e)}}}
  el('item').onchange=()=>show(el('item').value);el('type').onchange=()=>list();el('time').onchange=()=>show(item.name);
  for(const btn of document.querySelectorAll('[data-feature]'))btn.onclick=()=>{el('type').value='all';list(btn.dataset.feature);};
  el('spin').textContent=spin?'Pause rotation':'Rotate';
  action('spin',()=>{spin=!spin;stop();el('spin').textContent=spin?'Pause rotation':'Rotate';if(spin)draw(performance.now());});
  async function copy(text){try{await navigator.clipboard.writeText(text);state('Copied.')}catch{el('copy-text').hidden=false;el('copy-text').value=text;el('copy-text').select();state('Text selected. Use Copy.');}}
  el('copy-error').onclick=()=>copy(el('error').textContent);
  action('copy',async()=>copy(await (await import('../docs-view.js')).libraryReference(await allItems())));
  action('new',()=>{el('source').value='define.prop("my_prop", (b, o) => {\n  b.box({pos:[0,1,0], scale:[2,2,2], color:o.color ?? "#479ba3"});\n});';el('source').focus();});
  async function install(records){
    if(!Array.isArray(records)||!records.length||records.length>190)throw Error('Import up to 190 definitions at once.');
    const incoming=[],names=new Set();
    for(const record of records){
      const source=record.source;if(typeof source!=='string'||source.length>131072)throw Error('Each definition must be under 128 KiB.');
      const r=await execute('',[{name:record.name??'pasted-item',source}]);if(r.error)throw r.error;
      if(r.catalog.length!==1)throw Error('Use one define block per item. Import multiple items using a Framecut library export.');
      const {name,type}=r.catalog[0];
      if(names.has(name)||items.some(i=>i.name===name&&i.builtin&&!(heldItems.includes(name)&&name!=='briefcase'))||name===demo.name)throw Error(name+': duplicate or reserved bundled name. Rename your item.');
      names.add(name);incoming.push({name,type,source});
    }
    const next=[...items.filter(i=>!names.has(i.name)),...incoming];
    // Validate callbacks and dependencies together before committing the entire import.
    for(const i of incoming){const r=await execute(previewCode(i),sources(next));if(r.error)throw r.error;}
    await saveItems(incoming);el('type').value='all';await reload(incoming[0].name);state('Saved '+incoming.length+' item(s) on this device.');
  }
  action('save',()=>install([{source:el('source').value}]));
  action('delete',async()=>{await removeItem(item.name);el('type').value='all';await reload('tower');state('Item deleted.');});
  const delimiter='\n// --- Framecut library item ---\n';
  action('json',async()=>saveFile('framecut-library.json',JSON.stringify({version:1,items:await customItems()},null,2)));
  action('js',async()=>saveFile('framecut-library.js',(await customItems()).map(i=>i.source).join(delimiter)));
  el('import').onchange=async()=>{clear();try{const f=el('import').files[0];if(!f)return;if(f.size>1024*1024)throw Error('Import at most 1 MiB.');
    const text=await f.text();await install(f.name.endsWith('.json')?JSON.parse(text).items:text.split(delimiter).filter(s=>s.trim()).map(source=>({source})));}catch(e){error(e)}finally{el('import').value='';}};
  addEventListener('framecut:view',e=>{if(e.detail!=='library'){++version;stop();if(view){view.dispose();view=null;const old=el('canvas');old.replaceWith(old.cloneNode(false));}}else if(item)show(item.name);});
  await reload('tower');
}
