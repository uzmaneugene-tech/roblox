import {parse} from './vendor/acorn.mjs';
import {explain} from './diagnostics.js';
// Inspect literal dependencies even in branches a preview does not take.
export function sourceCheck(source,library){
  const issues=[],definitions=new Set(),references=[];
  function visit(n,fn){if(!n||typeof n!=='object')return;fn(n);for(const [key,v] of Object.entries(n))if(key!=='loc')Array.isArray(v)?v.forEach(c=>visit(c,fn)):visit(v,fn);}
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
      if(define&&typeof n.arguments[0]?.value==='string')definitions.add(n.arguments[0].value.trim());
      const cb=define?n.arguments[1]:member.name==='scene'?n.arguments[2]:null;
      if(!cb?.body||cb.params[0]?.type!=='Identifier')return;
      const actor=cb.params[0].name;
      visit(cb.body,c=>{
        if(c.type!=='CallExpression'||c.callee.object?.name!==actor||!['use','spawn','grid','row','scatter'].includes(c.callee.property?.name))return;
        const name=c.arguments[0]?.value;if(typeof name==='string')references.push({name:name.trim(),file,line:c.loc.start.line,snippet:lines[c.loc.start.line-1]?.trim()??''});
      });
    });
  }
  for(const [index,item] of library.entries())inspect(item.source,'library/'+(item.name??index)+'.js');
  inspect(source,'story.js');
  for(const {name,...where} of references)if(source.trim()&&!definitions.has(name))issues.push({...where,message:explain('Missing dependency (neither bundled nor installed custom). Unknown item: '+name+'. Valid values: '+[...definitions].join(', ')+'.')});
  return issues;
}
