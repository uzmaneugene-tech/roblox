import './vendor/markdown-it.min.js';

const markdown=globalThis.markdownit({html:false});
const directory=new URL('../docs/',import.meta.url);

export async function readDoc(name) {
  const response=await fetch(new URL(name+'.md',directory));
  if(!response.ok)throw new Error('Could not open '+name+'.md.');
  return (await response.text()).replace(/<!--[^]*?-->/g,'').trim();
}

export function renderDocs(target, texts) {
  target.innerHTML=texts.map(text=>markdown.render(text)).join('');
  for(const node of target.querySelectorAll('a[href],img[src]')){
    const attr=node.tagName==='A'?'href':'src', value=node.getAttribute(attr);
    if(value&&!/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(value))node.setAttribute(attr,new URL(value,directory).href);
  }
}

export async function cheatsheet() {
  const target=document.getElementById('cheatsheet-manual'), button=document.getElementById('cheatsheet-copy');
  const status=document.getElementById('cheatsheet-status'), manual=document.getElementById('cheatsheet-text');
  try{
    const {allItems}=await import('./library/store.js');
    const text=(await readDoc('story-code'))+'\n\n'+await libraryReference(await allItems());
    renderDocs(target,[text]);
    button.disabled=false;
    button.onclick=async()=>{
      try{
        await navigator.clipboard.writeText(text);
        status.textContent='Cheatsheet copied.';
      }catch{
        manual.hidden=false;manual.value=text;manual.focus();manual.select();
        status.textContent='Cheatsheet selected. Use your browser’s Copy command.';
      }
    };
  }catch(error){
    target.textContent=error.message;
  }
}

export async function libraryReference(items){
  const examples=items.map(i=>{
    const n=JSON.stringify(i.name);
    const use=i.type==='location'?'scene("Set",{location:'+n+',time:"dusk",duration:4},s=>{})'
      :i.type==='character'?'character("Hero",{preset:'+n+'})'
      :i.type==='animation'?'s.do(0,jin,'+n+',{duration:2})':'s.spawn('+n+',[0,0,0])';
    return '| '+i.name+' | '+i.type+' | '+(i.options||'—')+' | \`'+use+'\` |';
  });
  return await readDoc('library')+'\n\n### Available items on this device\n\n| Item | Type | Item options | Example |\n|---|---|---|---|\n'+examples.join('\n');
}
