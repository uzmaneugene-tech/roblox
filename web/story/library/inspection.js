export function inspection(scene, bounds, count, lights){
  const warnings=[],size=bounds.max.map((x,i)=>x-bounds.min[i]),largest=Math.max(...size);
  const n=scene.nodes.filter(n=>n.kind==='light').length;
  if(count>=400)warnings.push('Phone budget: 400 or more meshes.');
  if(Math.max(n,lights)>=4)warnings.push('Phone budget: 4 or more lights.');
  if(largest>60||largest<.5)warnings.push(largest>60?'Larger than 60 studs.':'Smaller than 0.5 studs.');
  if(!size.every(Number.isFinite))warnings.push('Non-finite dimensions.');
  for(const a of scene.actions.filter(a=>a.frames)){
    const flat=a.frames.flat(2);
    if(!flat.every(Number.isFinite))warnings.push('NaN or infinite joint rotation.');
    if(flat.some(v=>Math.abs(v)>3.2))warnings.push('Joint rotation exceeds ±3.2 radians.');
    if(a.frames.every(f=>JSON.stringify(f)===JSON.stringify(a.frames[0])))warnings.push('No motion across sampled poses.');
  }
  return 'Size (W × H × D): '+size.map(x=>x.toFixed(2)).join(' × ')+' studs. '+count+' meshes (instances included), '+Math.max(n,lights)+' lights. '+(bounds.min[1]<-.06?'Goes below ground.':bounds.min[1]>.06?'Floating.':'Sits on the ground.')+'\n'+warnings.join('\n');
}
