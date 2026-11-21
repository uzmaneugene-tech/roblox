import {actions,shots,props,locations,sceneMethods} from './registry.js';
import {parse} from './vendor/acorn.mjs';
import {explain} from './diagnostics.js';
// Inspect literal dependencies even in branches a preview does not take.
export function sourceCheck(source,library){
  const issues=[],definitions=new Set(),references=[],choices=[],animations=new Set(),places=new Set();
  function visit(n,fn){if(!n||typeof n!=='object')return;if(fn(n)===false)return;for(const [key,v] of Object.entries(n))if(key!=='loc')Array.isArray(v)?v.forEach(c=>visit(c,fn)):visit(v,fn);}
  function inspect(code,file){
    const lines=code.split('\n');let copy=[...lines],tree;
    for(let attempt=0;attempt<32;attempt++){
      try{tree=parse(copy.join('\n'),{ecmaVersion:'latest',locations:true,sourceType:'script'});break;}
      catch(e){const line=e.loc?.line??1;
        issues.push({file,line,snippet:lines[line-1]?.trim()??'',message:'JavaScript syntax: '+e.message+'. Check the punctuation, brackets and quotes on this line and the preceding line.'});
        if(!copy[line-1]?.trim())break;copy[line-1]='';
      }
    }
    if(!tree)return;
    visit(tree,n=>{
      if(n.type!=='CallExpression')return;
      const member=n.callee,define=member.type==='MemberExpression'&&member.object.name==='define';
      if(define&&typeof n.arguments[0]?.value==='string'){
        const name=n.arguments[0].value.trim();definitions.add(name);
        if(member.property.name==='animation')animations.add(name);
        if(member.property.name==='location')places.add(name);
      }
      const note=(call,kind,value,valid)=>{if(typeof value==='string')choices.push({kind,name:value.trim(),valid,file,line:call.loc.start.line,snippet:lines[call.loc.start.line-1]?.trim()??''});};
      if(member.name==='scene'){
        const loc=n.arguments[1]?.properties?.find(p=>p.key?.name==='location')?.value?.value;
        note(n,'location',loc,locations);
      }

      const cb=define?n.arguments[1]:member.name==='scene'?n.arguments[2]:null;
      if(!cb?.body||cb.params[0]?.type!=='Identifier')return;
      const actor=cb.params[0].name;
      visit(cb.body,c=>{
        if(c!==cb&&c.params?.some(p=>p.name===actor))return false;
        if(c.type!=='CallExpression'||c.callee.object?.name!==actor)return;
        const method=c.callee.property?.name;
        if(!define){
          note(c,'scene method',method,[...sceneMethods,'spawn','scatter','row','grid']);
          if(method==='do')note(c,'action',c.arguments[2]?.value,actions);
          if(method==='cam')note(c,'shot',c.arguments[1]?.value,shots);
          if(method==='prop')note(c,'prop',c.arguments[0]?.value,props);
        }
        if(!['use','spawn','grid','row','scatter'].includes(method))return;
        const name=c.arguments[0]?.value;if(typeof name==='string')references.push({name:name.trim(),file,line:c.loc.start.line,snippet:lines[c.loc.start.line-1]?.trim()??''});
      });
    });
  }
  for(const [index,item] of library.entries())inspect(item.source,'library/'+(item.name??index)+'.js');
  inspect(source,'story.js');
  for(const {name,...where} of references)if(source.trim()&&!definitions.has(name))issues.push({...where,message:explain('Missing dependency (neither bundled nor installed custom). Unknown item: '+name+'. Valid values: '+[...definitions].join(', ')+'.')});
  for(const {kind,name,valid,...where} of choices){
    const all=kind==='action'?[...valid,...animations]:kind==='location'?[...valid,'empty',...places]:valid;
    if(!all.includes(name))issues.push({...where,message:explain('Unknown '+kind+': '+name+'. Valid values: '+all.join(', ')+'.')});
  }
  return issues;
}
