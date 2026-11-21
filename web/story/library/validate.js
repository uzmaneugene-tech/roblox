export const bodies=['slim','normal','tall','kid','big'];
export const bodyScale={slim:[1,1,1],normal:[1.18,1,1.1],tall:[1,1.25,1],kid:[.78,.7,.78],big:[1.48,1.14,1.4]};
export const accessories=['glasses','sunglasses','beanie','party_hat','crown','tie','backpack','headphones','suit'];
export function shapeRecord(name,kind,parent,options,extra,nodes){
  const fail=m=>{throw new Error(name+': '+m)};
  if(!Number.isInteger(parent)||parent< -1||parent>=nodes.length||nodes.length>=6000)fail('Invalid parent or scene exceeded 6,000 shapes');
  if(!options||typeof options!=='object'||Array.isArray(options))fail('Expected shape options');
  for(const [k,v] of Object.entries(options)){
    if(['pos','rot','scale','slide'].includes(k)){
      const a=typeof v==='number'&&k==='scale'?[v,v,v]:v;
      if(!Array.isArray(a)||a.length!==3||!a.every(n=>Number.isFinite(n)&&Math.abs(n)<=10000&&(k!=='scale'||n>0)))fail('Invalid '+k+'; use three finite numbers, e.g. [1,2,3].');
    }else if(['color','emissive'].includes(k)){if(typeof v!=='string'||!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v))fail(k+' must be a hex color');}
    else if(k==='rough'){if(!(typeof v==='number'&&v>=0&&v<=1))fail('rough must be 0–1');}
    else if(k==='outline'){if(typeof v!=='boolean')fail('outline must be boolean');}
    else if(k==='texture'&&kind==='ground'){if(!['grass','asphalt','sand','concrete','water'].includes(v))fail('Unknown ground texture');}
    else fail('Unknown shape option: '+k+'. Valid values: pos, rot, scale, color, emissive, rough, slide, outline, texture.');
  }
  if(kind==='text'&&(typeof extra.label!=='string'||extra.label.length>150))fail('Use a text label up to 150 characters');
  if(kind==='light'&&(!/^#[0-9a-f]{6}$/i.test(extra.color)||![extra.intensity,extra.distance].every(n=>Number.isFinite(n)&&n>=0&&n<=200)))fail('Invalid light settings');
  nodes.push({name,kind,parent,options,extra});return String(nodes.length-1);
}
