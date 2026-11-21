import {project,MAX_BYTES} from './format.js';
const $=id=>document.getElementById(id), el=tag=>document.createElement(tag);
const fresh=name=>({name,caption:'',duration:2,position:[0,2.3,9],rotation:[0,0,0],fov:50,transition:'Cut',shake:0});
const key='framecut.project.v1';
let model={format:'framecut-1',shots:[fresh('Shot1')]},index=0,renderPreview,previewStarted=false,timer;
function notice(msg){$('notice').textContent=msg;clearTimeout(timer);timer=setTimeout(()=>$('notice').textContent='',4800)}
try{const saved=localStorage.getItem(key);if(saved)model=project(JSON.parse(saved))}catch{notice('Could not restore the saved project. Import a backup to recover it.')}
function persist(){try{localStorage.setItem(key,JSON.stringify(model))}catch{notice('Browser storage unavailable or full. Download project JSON to keep your work.')}}
function action(id,fn){$(id).onclick=async()=>{try{await fn()}catch(e){notice(e.message)}}}
function route(){
 const pages=['home','builder','converter','guide','captions'];let page=location.hash.slice(1);if(!pages.includes(page))page='home';
 for(const p of pages)$(p).hidden=p!==page;
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+page));
 if(page==='builder'&&!previewStarted){previewStarted=true;import('./preview.js').then(m=>{renderPreview=m.monitor($('canvas'));preview()}).catch(()=>{$('preview-info').textContent='3D preview unavailable. Check your connection and browser; editing and export still work.'})}
 window.scrollTo(0,0);
}
async function loadGuide(){
 try{
  const script=el('script');script.src='https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js';
  const ready=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject});document.head.append(script);
  const [texts]=await Promise.all([Promise.all(['guide','troubleshooting'].map(async name=>{const response=await fetch('./docs/'+name+'.md');if(!response.ok)throw Error('Guide unavailable');return response.text()})),ready]);
  const md=window.markdownit({html:false});$('manual').innerHTML=texts.map(text=>md.render(text.replace(/<!--[\s\S]*?-->/g,''))).join('');
  // Markdown asset links are relative to the published documentation folder.
  $('manual').querySelectorAll('a[href],img[src]').forEach(node=>{const attr=node.tagName==='A'?'href':'src',value=node.getAttribute(attr);if(value&&!/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(value))node.setAttribute(attr,new URL(value,new URL('./docs/',document.baseURI)).href)});
 }catch{$('manual').textContent='Guide unavailable. Check your connection or open docs/guide.md in the repository.'}
}
loadGuide();
function preview(){const s=model.shots[index];if(renderPreview&&[...s.rotation,...s.position,s.fov].every(Number.isFinite))renderPreview(s)}
function list(){const host=$('shot-list');host.replaceChildren();model.shots.forEach((s,i)=>{const btn=el('button');btn.textContent=String(i+1).padStart(2,'0')+' / '+s.name;btn.classList.toggle('selected',index===i);btn.onclick=()=>{index=i;draw()};host.append(btn)})}
let revision=0;
function changed(){revision++;$('builder-result').replaceChildren();try{project(model);persist();$('fields').removeAttribute('data-invalid')}catch(e){$('fields').dataset.invalid=e.message}preview()}
function draw(){
 list();const form=$('fields'),s=model.shots[index];form.replaceChildren();form.onsubmit=e=>e.preventDefault();
 function field(k,title,kind,host=form,i=null){
   const label=el('label');label.textContent=title;const input=el(kind==='select'?'select':kind==='textarea'?'textarea':'input');
   if(kind==='select')for(const t of ['Cut','Fade','CrossFade'])input.add(new Option(t,t));
   if(input.tagName==='INPUT'){input.type=kind;if(kind==='number')input.step='any'}
   if(k==='caption')input.maxLength=8000;if(k==='name')input.maxLength=200;
   input.value=i===null?s[k]:s[k][i];label.append(input);host.append(label);
   input.oninput=()=>{const value=kind==='number'?input.valueAsNumber:input.value;if(i===null)s[k]=value;else s[k][i]=value;if(k==='name')list();changed()};
 }
 field('name','Shot name','text');field('caption','Caption','textarea');field('duration','Duration (seconds)','number');
 for(const k of ['position','rotation']){const title=el('div');title.textContent=k==='position'?'Position (studs)':'Rotation (degrees, XYZ)';form.append(title);const axes=el('div');axes.className='axes';form.append(axes);['X','Y','Z'].forEach((axis,i)=>field(k,axis,'number',axes,i))}
 field('fov','Vertical FOV (1–120°)','number');field('transition','Incoming transition','select');field('shake','Camera shake (0–1)','number');
 $('up').disabled=index===0;$('down').disabled=index===model.shots.length-1;$('delete').disabled=model.shots.length===1;preview();
}
function unique(){let i=1;const names=new Set(model.shots.map(s=>s.name.trim()));while(names.has('Shot'+i))i++;return 'Shot'+i}
function apply(next,i){project(next);model=next;index=i;draw();changed()}
for(const id of ['add','duplicate','up','down','delete'])action(id,()=>{
 const p=structuredClone(model);let i=index;
 if(id==='add'||id==='duplicate'){const shot=id==='add'?fresh(unique()):{...p.shots[i],name:unique()};p.shots.splice(++i,0,shot)}
 else if(id==='delete'){p.shots.splice(i,1);i=Math.min(i,p.shots.length-1)}
 else {const j=i+(id==='up'?-1:1);[p.shots[i],p.shots[j]]=[p.shots[j],p.shots[i]];i=j}
 apply(p,i)
});
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
action('export-project',()=>{project(model);download(new Blob([JSON.stringify(model,null,2)],{type:'application/json'}),'Framecut-project.json')});
$('import-project').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>3*1024*1024)throw Error('Editor project exceeds 3 MiB');apply(JSON.parse(await f.text()),0);notice('Project imported')}catch(e){notice(e.message)}};
action('assign',()=>{const lines=$('story').value.replace(/\r\n?/g,'\n').split('\n');if(lines.length===model.shots.length+1&&lines.at(-1)==='')lines.pop();
 if(lines.length!==model.shots.length)throw Error('Expected '+model.shots.length+' lines, received '+lines.length);
 const p=structuredClone(model);p.shots.forEach((s,i)=>s.caption=lines[i]);apply(p,index);notice('Assigned '+lines.length+' captions')});
function results(host,files){
 host.replaceChildren();const box=el('div');box.className='result';host.append(box);
 const title=el('h3');title.textContent='Generated Luau';const note=el('p');note.textContent=Object.keys(files).length>1?'Create the numbered ModuleScripts as children of CutsceneData. Download each file below.':'Paste this into a ModuleScript named CutsceneData.';
 const select=el('select');select.ariaLabel='Output module';for(const k of Object.keys(files))select.add(new Option(k,k));
 const pre=el('pre'),actions=el('div');actions.className='actions';box.append(title,note,select,pre,actions);
 const show=async()=>{const k=select.value,txt=await files[k].slice(0,4000).text();if(select.value===k)pre.textContent=txt+(files[k].size>4000?'\n… (preview shortened; copy or download for full source)':'')};select.onchange=show;show();
 for(const label of ['Copy Luau','Download .lua']){const btn=el('button');btn.textContent=label;actions.append(btn);btn.onclick=async()=>{const name=select.value;try{if(label.startsWith('Copy')){if(globalThis.ClipboardItem&&navigator.clipboard.write){await navigator.clipboard.write([new ClipboardItem({'text/plain':files[name]})])}else{await navigator.clipboard.writeText(await files[name].text())}notice('Copied '+name)}else download(files[name],name)}catch{notice('Clipboard unavailable. Use Download .lua.')}}}
}
function generate(where,payload){
 const btn=$(where==='builder'?'generate':'convert'),host=$(where+'-result'),rev=revision,w=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 btn.disabled=true;host.textContent='Generating modules…';
 const done=()=>{btn.disabled=false;w.terminate()};
 w.onerror=()=>{done();host.textContent='Conversion failed. Try a smaller file.'};
 w.onmessage=({data})=>{done();if(where==='builder'&&rev!==revision){host.replaceChildren();return}if(data.error)host.textContent=data.error;else results(host,data.files)};
 w.postMessage(payload);
}
action('generate',()=>{project(model);generate('builder',{project:model})});
action('convert',()=>{const file=$('file').files[0];if((file?.size??$('json').value.length)>MAX_BYTES)throw Error('Maximum input is 32 MiB');generate('converter',file?{file}:{text:$('json').value})});
$('json').oninput=()=>{$('file').value=''};$('file').onchange=()=>{if($('file').files.length)$('json').value=''};
draw();route();addEventListener('hashchange',route);
