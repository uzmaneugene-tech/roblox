import {T,panel} from '../world/mesh.js';
import {RoundedBoxGeometry} from '../vendor/rounded-box.js';

// Build unit meshes once per scene; transforms and materials are shared by instances.
export function buildLibrary(root,nodes,crowds,time,dynamic=false){
  const glowLights=[],geo=new Map(), mats=new Map(), textures=[], batches=new Map(), parents=[], solids=[], actors=[], updates=[];
  const geometry=k=>{
    if(!geo.has(k)){
      let g;
      if(k==='box')g=new RoundedBoxGeometry(1,1,1,1,.035);
      if(k==='cylinder'||k==='cone')g=new T.CylinderGeometry(k==='cone'?0:.5,.5,1,10);
      if(k==='sphere')g=new T.SphereGeometry(.5,10,7);
      if(k==='torus')g=new T.TorusGeometry(.38,.12,6,14);
      if(k==='plane')g=new T.PlaneGeometry();
      if(k==='wedge'){const s=new T.Shape();s.moveTo(-.5,-.5);s.lineTo(.5,-.5);s.lineTo(-.5,.5);s.closePath();g=new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false});g.translate(0,0,-.5);}
      geo.set(k,g);
    }return geo.get(k);
  };
  function mat(o,back=false){
    const color=back?'#263246':o.color??'#58b4a6', glow=!back&&(dynamic||time!=='day')&&o.emissive, key=[color,o.rough,glow,back].join('/');
    if(!mats.has(key))mats.set(key,back?new T.MeshBasicMaterial({color,side:T.BackSide}):
      new T.MeshStandardMaterial({color,roughness:o.rough??.73,emissive:glow||0,emissiveIntensity:time==='night'?1.3:.7,side:T.DoubleSide}));
    return mats.get(key);
  }
  const transform=(obj,o)=>{obj.position.fromArray(o.pos??[0,0,0]);obj.rotation.set(...(o.rot??[0,0,0]));
    if(Array.isArray(o.scale))obj.scale.fromArray(o.scale);else obj.scale.setScalar(o.scale??1);obj.updateMatrix();};
  const put=(g,m,matrix,animate)=>{
    const key=g.uuid+m.uuid;let b=batches.get(key);if(!b){b={g,m,entries:[]};batches.set(key,b);}b.entries.push({matrix,animate});
  };
  const dummy=new T.Object3D(), ident=new T.Matrix4(), box=new T.Box3(), boundaries=new Map();
  const picks=[];let lights=0;const bounds=new T.Box3();
  for(const [i,{kind,options:o,extra,parent}] of nodes.entries()){
    transform(dummy,o);const matrix=new T.Matrix4().multiplyMatrices(parents[parent]?.matrix??ident,dummy.matrix);
    const inherited=parents[parent]?.style??{},styleOpts={...inherited};
    for(const key of ['color','rough','emissive','outline'])if(o[key]!==undefined)styleOpts[key]=o[key];
    const owner=extra.solid?i:parents[parent]?.owner;
    parents.push({matrix,owner,style:styleOpts});
    if(kind==='group'){if('solid' in extra)picks.push({name:nodes[i].name,point:new T.Vector3().setFromMatrixPosition(matrix)});continue;}
    if(kind==='light'){if((dynamic||time!=='day')&&lights++<4){const l=new T.PointLight(extra.color,extra.intensity,extra.distance);l.position.setFromMatrixPosition(matrix);root.add(l);glowLights.push([l,extra.intensity]);}continue;}
    if(kind==='text'){const mesh=panel(root,1,1,0,0,0,extra.label,o.color??'#243a50');matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);textures.push(mesh);continue;}
    const ground=kind==='ground',g=geometry(ground?'box':kind);
    const palette={grass:'#71ae76',asphalt:'#49505e',sand:'#e4c48a',concrete:'#a5b4bd',water:'#45add2'};
    const style=ground?{...o,color:o.color??palette[o.texture??'grass']}:styleOpts;
    if(ground)matrix.multiply(new T.Matrix4().makeScale(100,.15,100)).multiply(new T.Matrix4().makeTranslation(0,-.5,0));
    const slide=o.slide,animate=slide?(t,out)=>out.copy(matrix).premultiply(new T.Matrix4().makeTranslation(...slide.map(v=>v*(1-Math.cos(t*1.5))*.5))):null;
    put(g,mat(style),matrix,animate);
    if(!ground&&kind!=='plane'&&styleOpts.outline!==false){
      const outlineMatrix=matrix.clone().multiply(new T.Matrix4().makeScale(1.017,1.017,1.017));
      put(g,mat(style,true),outlineMatrix,slide?(t,out)=>{animate(t,out);out.multiply(new T.Matrix4().makeScale(1.017,1.017,1.017));}:null);
    }
    if(ground&&o.texture){
      // Low-poly surface marks share geometry and material with every other tile.
      const colors={grass:'#699b64',asphalt:'#565d69',sand:'#d9b881',concrete:'#a1aeb2',water:'#86cbdc'};
      const groundMatrix=parents[i].matrix.clone(); // matrix currently includes the slab scale
      const g=geometry('box'),m=mat({color:colors[o.texture]});
      for(let n=0;n<48;n++){
        const x=((n*31)%97)/100-.48,z=((n*43)%89)/100-.44;
        dummy.position.set(x,.56,z);dummy.rotation.set(0,n*.47,0);dummy.scale.set(o.texture==='water'?.034:.011,.03,.004);
        dummy.updateMatrix();put(g,m,groundMatrix.clone().multiply(dummy.matrix));
      }
    }
    if(!ground){box.set(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5)).applyMatrix4(matrix);bounds.union(box);
      if(owner!==undefined){if(!boundaries.has(owner))boundaries.set(owner,new T.Box3());boundaries.get(owner).union(box);}}
  }
  for(const c of crowds){
    let seed=c.seed;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let i=0;i<c.count;i++){
      const x=(rand()-.5)*c.area[0],z=(rand()-.5)*c.area[1],phase=rand()*6.28,angle=rand()*6.28,walk=rand()>.36;
      const size=c.style==='kids'?.72:1; const shirt=(c.style==='rich'?['#233750','#583954','#f4eee0']:c.style==='poor'?['#7f695e','#798477','#b09774']:['#e5a752','#58aaad','#dc7e89'])[i%3];
      const skin=['#d89f79','#f1c9a5','#916043'][i%3], pants='#324354';
      const parts=[[0,2.9,0,1.6,1.8,.8,shirt],[0,4.4,0,1.2,1.1,1.1,skin],[0,4.98,0,1.26,.38,1.16,'#312937'],
        ...[-1,1].flatMap(k=>[[k*1.04,2.95,0,.53,1.65,.65,shirt],[k*1.04,2.02,0,.52,.35,.63,skin],[k*.42,1,0,.75,2,.74,pants],[k*.42,.22,.11,.8,.4,.9,'#dddcd6'],[k*.22,4.52,.56,.11,.19,.035,'#231e27']])];
      const rot=new T.Object3D(),small=new T.Object3D();
      const blinkScale=new T.Vector3(1,.14,1);
      const pose={pos:[x,0,z],height:5.4*size,low:0};actors.push(pose);
      const poseAt=t=>{const a=t*.32+phase,u=walk?Math.sin(a)*1.6:0;
        rot.position.set(x+u*Math.sin(angle),size*.04*Math.sin(phase+t*3),z+u*Math.cos(angle));
        rot.rotation.y=angle+(walk?(1-Math.tanh(4*Math.cos(a)))*Math.PI/2:0);
        rot.scale.setScalar(size);rot.updateMatrix();rot.position.toArray(pose.pos);
      };
      poseAt(0);updates.push(poseAt);
      for(const [dx,dy,dz,w,h,d,color] of parts){
        small.position.set(dx,dy,dz);small.scale.set(w,h,d);small.updateMatrix();const local=small.matrix.clone();
        const animate=(t,out)=>{
          out.multiplyMatrices(rot.matrix,local);
          if(color==='#231e27'&&(t+phase)%(2.1+phase*.4)<.13)out.scale(blinkScale);
          return out;
        };
        put(geometry('box'),mat({color}),animate(0,new T.Matrix4()),animate);
      }
      bounds.expandByPoint(new T.Vector3(x,5,z));
    }
  }
  const meshes=[],temp=new T.Matrix4();
  for(const {g,m,entries} of batches.values()){
    const mesh=new T.InstancedMesh(g,m,entries.length);meshes.push(mesh);root.add(mesh);
    const moving=[];entries.forEach(({matrix,animate},i)=>{mesh.setMatrixAt(i,matrix);if(animate)moving.push([i,animate]);});
    if(moving.length){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      updates.push(t=>{for(const [i,fn] of moving){fn(t,temp);mesh.setMatrixAt(i,temp);}mesh.instanceMatrix.needsUpdate=true;});}
  }
  for(const b of boundaries.values())solids.push({min:b.min.toArray(),max:b.max.toArray()});
  return {picks,bounds,solids,actors,lightLevel(level){mats.forEach(m=>{if(m.emissive)m.emissiveIntensity=level*1.3;});for(const [l,power] of glowLights)l.intensity=power*level;},update:t=>updates.forEach(f=>f(t)),dispose(){meshes.forEach(m=>m.dispose());geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(m=>{m.geometry.dispose();m.material.map.dispose();m.material.dispose();});}};
}
