import {sceneEffects,timeWeights,frameEffects} from './story-effects.js';
import {compileItems} from './action-poses.js';
import {heldProp} from './held-props.js';
import { T, batch, shadow } from './world/mesh.js';
import { addProp } from './world/props.js';
import { locationRegistry } from './world/locations/index.js';
import { dressGround } from './world/polish.js';
import { presets, sky } from './world/preview.js';
import { buildAvatar } from './avatar-view.js';
import { softwarePreview } from './software-preview.js';
import { captionAt, compileMotion, smooth } from './motion.js';
import { compileCamera } from './shots.js';
import { locateScene } from './timeline.js';

import {buildLibrary} from './library/render.js';
import {bodyScale} from './library/validate.js';
import {faceBeat} from './performance-face.js';
import {frameFinish} from './finish-frame.js';
function dispose(root, permanentGeometry) {
  const resources=new Set();
  root.traverse(node=>{
    if (!node.isMesh)return;
    if (!permanentGeometry || node.geometry.type==='BufferGeometry' || node.material.map) resources.add(node.geometry);
    if (node.material.map) { resources.add(node.material.map); resources.add(node.material); }
    else if (!permanentGeometry) resources.add(node.material);
  });
  for (const resource of resources) resource.dispose();
}

export function createStoryView(canvas, caption, fixedSize) {
  const output=canvas,composite=Boolean(caption||fixedSize),finish=composite?frameFinish(output):null;
  if(composite)canvas=document.createElement('canvas');
  let debug=null,override=null,slow=0,auto='High',settings={quality:'High',grain:false};
  const rank=['Low','Medium','High'];
  const effective=()=>rank[Math.min(rank.indexOf(settings.quality),rank.indexOf(auto))];
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true});
  const renderer=gl&&new T.WebGLRenderer({canvas,context:gl,alpha:true,antialias:true});
  const paint=renderer?null:softwarePreview(T,canvas);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(43,9/16,.12,230);
  camera.userData.focus=new T.Vector3();
  const key=new T.DirectionalLight('#fff2d6',2.0), fill=new T.HemisphereLight('#d4ebff','#947790',1.48);
  const rim=new T.DirectionalLight('#c3ceff',.89);
  key.position.set(-26,38,22); rim.position.set(18,14,-19);
  scene.add(key,fill,rim);
  let timeline, stage, current, lastTime=0, lastTurntable=null;

  function clear() {
    if(!stage)return;
    for(const root of stage.owned)dispose(root,false);
    for(const ball of stage.balls.values())ball.traverse(node=>{if(node.geometry?.type==='TorusGeometry')node.geometry.dispose()});
    if(stage.contacts){stage.contacts.dispose();dispose(stage.contacts,false);}
    stage.library.dispose();stage.effects.dispose();
    for(const m of stage.dynamicMaterials.keys())m.dispose();
    scene.remove(stage.root);
    dispose(stage.set,true);
    stage=null;
  }
  function load(data) {
    clear();
    current=data;
    const preset=presets[data.time], dynamic=Boolean(data.timeChanges),ctx={dark:dynamic||data.time!=='day',night:data.time==='night',glows:0};
    const root=new T.Group(), set=new T.Group(), live=new T.Group();
    root.add(set,live);
    const layout=locationRegistry[data.location]?.(set,ctx)??{focus:[0,0,0]};
    if(locationRegistry[data.location])dressGround(set,data.location,ctx);
    const hoops=[...(layout.hoops??[])];
    for(const prop of data.props) {
      const model=addProp(set,prop.type,prop.position,prop.opts,ctx);
      if(prop.type==='hoop'){model.updateMatrixWorld(true);hoops.push([...model.localToWorld(new T.Vector3(0,4.38,.76))]);}
    }
    const libraryRoot=new T.Group();root.add(libraryRoot);
    const library=buildLibrary(libraryRoot,data.nodes??[],data.crowds??[],data.time,dynamic);
    const picks=[...library.picks],solids=[...library.solids];set.updateMatrixWorld(true);
    set.traverse(node=>{if(node.userData.prop)picks.push({name:node.userData.prop,point:node.getWorldPosition(new T.Vector3())});if(node.userData.solid){const box=new T.Box3().setFromObject(node);solids.push({min:box.min.toArray(),max:box.max.toArray()});}});
    // Share one radial texture and draw call across static contact patches.
    const grounded=picks.filter(p=>Math.abs(p.point.y)<.7).slice(0,256);
    let contacts;
    if(grounded.length){
      const template=new T.Group();shadow(template,0,0,1,1);
      const m=template.children[0];contacts=new T.InstancedMesh(m.geometry,m.material,grounded.length);
      const dummy=new T.Object3D();dummy.rotation.x=-Math.PI/2;
      grounded.forEach(({point,name},i)=>{dummy.position.set(point.x,point.y+.085,point.z);
        const r=/house|tower|shop|apartment/.test(name)?8:/car|bench|bus/.test(name)?4:2;
        dummy.scale.set(r,r*.75,1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);});root.add(contacts);
    }
    const dynamicMaterials=new Map(),pointLights=[];
    batch(set);
    if(dynamic){
      const copies=new Map();
      set.traverse(item=>{
        if(item.isPointLight)pointLights.push([item,item.intensity]);
        if(!item.material?.userData.windowGlow)return;
        const original=item.material;
        if(!copies.has(original)){const copy=original.clone();copies.set(original,copy);dynamicMaterials.set(copy,original.color.clone());}
        item.material=copies.get(original);
      });
    }
    const owned=[], models=new Map(), tracks=new Map(), balls=new Map();
    const placed=new Map(data.placements.map(p=>[p.char,p.position]));
    const itemAt=compileItems(data.actions), items=new Map();
    const effects=sceneEffects(root,data);
    const eventsFor=id=>[...data.actions.filter(e=>e.char===id),...data.actions.filter(e=>e.arg===id&&e.action==='hug').map(e=>({...e,char:id,arg:e.char}))].sort((a,b)=>a.t-b.t);
    for(const [id,pos] of placed) {
      const spec=timeline.characters.find(c=>c.id===id);
      const model=buildAvatar(spec), pivot=new T.Group();
      pivot.add(model.group);live.add(pivot);owned.push(model.group);
      const events=eventsFor(id);
      const track=compileMotion(pos,events,hoops,placed);
      const baseShadow=new T.Group();shadow(baseShadow,0,0,3.8,2.25);live.add(baseShadow);owned.push(baseShadow);
      models.set(id,{model,pivot,baseShadow}); tracks.set(id,track);
      if(events.some(event=>event.action==='shoot_ball')){
        const ball=addProp(live,'ball',[0,0,0],{scale:.77}); balls.set(id,ball);
      }
    }
    const targetAt=(id,t)=> {
      const frame=(tracks.get(id)??tracks.values().next().value)?.(t);
      if(frame)return {...frame,height:5*(bodyScale[timeline.characters.find(c=>c.id===id)?.body??'slim'][1])};
      return {pos:[layout.focus[0],0,layout.focus[2]],yaw:0,low:0};
    };
    const shouts=data.actions.filter(e=>e.action==='shout');
    const director=compileCamera(data.cameras,targetAt,time=>shouts.reduce((strength,shot)=>{
      const age=time-shot.t;
      return Math.max(strength,age>=0&&age<1.1?smooth(age/.15)*(1-smooth((age-.16)/.94)):0);
    },0),[...placed.keys()],solids,library.actors);
    scene.add(root);
    const face=new T.Quaternion(), inverse=new T.Quaternion(), halos=[];
    root.traverse(item=>{if(item.userData.halo)halos.push(item);});
    stage={contacts,picks,root,library,set,live,owned,models,tracks,balls,director,halos,face,inverse,effects,targetAt,items,itemAt,dynamicMaterials,pointLights,blended:{exposure:[0,0,0],fog:[0,0,0]}};
    const overrides=data.light??{};
    key.color.set(typeof overrides.color==='string'?overrides.color:preset.key);
    key.intensity=Number.isFinite(overrides.intensity)?T.MathUtils.clamp(overrides.intensity,0,8):preset.power;
    fill.color.set(preset.fill);
    if(Number.isFinite(overrides.ambient))fill.intensity=T.MathUtils.clamp(overrides.ambient,0,5);
    else fill.intensity=data.time==='night'?.75:1.48;
    scene.fog=new T.Fog(data.fog?.color??new T.Color('rgb('+preset.fog.join(',')+')'),data.fog?.near??22,data.fog?.far??93);
    scene.userData.world=Object.keys(overrides).length ? {
      ...preset,
      exposure: preset.exposure.map((channel,i)=>{
        const shade = new T.Color(key.color).convertLinearToSRGB()[['r','g','b'][i]];
        const normalFill=data.time==='night'?.75:1.48;
        return channel * (.67 * key.intensity/preset.power + .33 * fill.intensity/normalFill) * (.68+.32*shade);
      }),
    } : preset;
    canvas.style.backgroundImage=sky(data.time,preset);
  }

  function render(time=lastTime, turntable) {
    const began=performance.now();lastTime=time;lastTurntable=turntable;
    const active=timeline&&locateScene(timeline,time);
    if(!active)return;
    const bounds=fixedSize??output.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    if(active.scene!==current)load(active.scene);
    const dpr=fixedSize?1:Math.min(devicePixelRatio||1, renderer?2:1.15);
    const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
    if(composite&&(output.width!==width||output.height!==height)){output.width=width;output.height=height;}
    const quality=effective(),factor=composite?({High:1,Medium:.8,Low:.6}[quality]):1;
    const rw=Math.max(1,Math.round(width*factor)),rh=Math.max(1,Math.round(height*factor));
    if(canvas.width!==rw||canvas.height!==rh){if(renderer)renderer.setSize(rw,rh,false);else{canvas.width=rw;canvas.height=rh;}}
    const characters=[];
    const t=active.localTime; stage.library.update(t);
    for(const group of stage.items.values())group.visible=false;
    for(const [id, { model,pivot,baseShadow }] of stage.models) {
      const frame=stage.tracks.get(id)(t);
      pivot.position.set(frame.pos[0],frame.pos[1]+frame.low,frame.pos[2]);
      pivot.rotation.set(0,frame.yaw,0);
      model.group.rotation.x=frame.root;
      for(const [part,rot] of Object.entries(frame.rot))model.parts[part].rotation.set(...rot);
      model.parts.torso.scale.y=frame.breath;
      const beat=faceBeat(id,t,current.captions,frame.face);
      model.setFace(frame.face,beat.mouth,beat.blink);
      characters.push({id,name:timeline.characters.find(c=>c.id===id).name,position:pivot.position.toArray(),action:current.actions.findLast(e=>e.char===id&&e.t<=t)?.action??'idle',face:frame.face,...beat});
      const held=stage.itemAt(id,t);
      if(held){
        const key=id+':'+held;
        if(!stage.items.has(key)){const group=heldProp(held);stage.items.set(key,group);stage.live.add(group);stage.owned.push(group);}
        const group=stage.items.get(key),hand=model.parts.armR;
        group.visible=true;
        group.position.copy(hand.localToWorld(new T.Vector3(0,-1.75,.31)));
        hand.getWorldQuaternion(group.quaternion);group.rotateX(Math.PI);
      }
      baseShadow.position.set(frame.pos[0],frame.pos[1],frame.pos[2]);
      const ball=stage.balls.get(id);
      if(ball){ball.visible=Boolean(frame.ball);if(frame.ball)ball.position.set(frame.ball[0],frame.ball[1]-.34,frame.ball[2]);}
    }
    const view=override??stage.director(t);
    if(turntable){
      const bounds=stage.library.bounds.isEmpty()?new T.Box3(new T.Vector3(-1.5,0,-1),new T.Vector3(1.5,6,1)):stage.library.bounds;
      const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
      const r=Math.max(1.5,Math.hypot(size.x,size.z)*.5,size.y*.57);
      const dist=r*2.9*Math.max(1,height/width),a=turntable.angle;
      view.fov=44;view.look=center.toArray();view.from=[center.x+dist*Math.sin(a),center.y+dist*.27,center.z+dist*Math.cos(a)];
    }
    camera.aspect=width/height;camera.fov=view.fov;
    camera.position.fromArray(view.from);camera.userData.focus.fromArray(view.look);camera.lookAt(camera.userData.focus);
    camera.updateProjectionMatrix();camera.getWorldQuaternion(stage.face);
    for(const glow of stage.halos)glow.quaternion.copy(glow.parent.getWorldQuaternion(stage.inverse).invert()).multiply(stage.face);
    const flash=stage.effects.update(t,quality,stage.targetAt,view.look);
    const weights=current.timeChanges?timeWeights(current,t):null,overrides=current.light??{};
    if(weights){
      const list=Object.values(presets), blended=stage.blended;
      const sum=f=>list.reduce((v,p,i)=>v+weights[i]*f(p,i),0);
      key.color.set(overrides.color??'#000');fill.color.set('#000');
      for(let i=0;i<list.length;i++)fill.color.add(new T.Color(list[i].fill).multiplyScalar(weights[i]));
      if(!overrides.color){key.color.set('#000');for(let i=0;i<list.length;i++)key.color.add(new T.Color(list[i].key).multiplyScalar(weights[i]));}
      key.intensity=overrides.intensity??sum(p=>p.power);
      fill.intensity=overrides.ambient??(1.48-.73*weights[2]);
      for(let i=0;i<3;i++){blended.exposure[i]=sum(p=>p.exposure[i]);blended.fog[i]=sum(p=>p.fog[i]);}
      scene.userData.world=blended;
      if(!current.fog?.color)scene.fog.color.setRGB(...blended.fog.map(c=>c/255),T.SRGBColorSpace);
      const glow=.68*weights[1]+weights[2];
      for(const halo of stage.halos)halo.material.opacity=glow;
      for(const [m,color] of stage.dynamicMaterials)m.color.set('#83b1c4').lerp(color,glow);
      for(const [light,power] of stage.pointLights)light.intensity=power*glow;
      stage.library.lightLevel(glow);
    }else key.intensity=overrides.intensity??presets[current.time].power;
    if(current.weather==='fog'||current.weather==='storm'){
      scene.fog.near=current.fog?.near??(current.weather==='fog'?5:12);
      scene.fog.far=current.fog?.far??(current.weather==='fog'?36:59);
    }
    if(current.weather==='fog'||current.weather==='storm'){
      scene.userData.world={...scene.userData.world,fogNear:scene.fog.near,fogFar:scene.fog.far};
    }
    key.intensity+=flash*2.1;
    if(renderer)renderer.render(scene,camera);else paint(scene,camera);
    const word=captionAt(active.scene.captions,t);
    if(finish){
      const target=stage.models.get(current.dof?.focus);let focus;
      if(target){const p=target.pivot.position.clone();p.y+=2.7;const d=p.distanceTo(camera.position);p.project(camera);focus={x:(p.x+1)/2,y:(1-p.y)/2,r:Math.min(2,2.9/(Math.max(.1,d)*2*Math.tan(view.fov*Math.PI/360)))};}
      const overlays=frameEffects(current,t,active.elapsed);overlays.flash=flash;
      overlays.bubbles=overlays.bubbles.flatMap(b=>{
        const actor=stage.models.get(b.char);if(!actor)return [];
        const p=actor.model.parts.head.getWorldPosition(new T.Vector3());p.y+=.86;p.project(camera);
        return p.z>=-1&&p.z<1?[{...b,pixel:[(p.x+1)/2,(1-p.y)/2]}]:[];
      });
      finish(canvas,{weights,overlays,time:current.time,grade:current.grade,dof:current.dof,focus,quality,noise:settings.grain,t,word});
    }
    debug={title:timeline.title,scene:current.id,localTime:t,timelineTime:time,camera:{from:[...view.from],look:[...view.look],fov:view.fov},characters,quality};
    if(!fixedSize&&composite){slow=performance.now()-began>1000/timeline.fps?slow+1:0;if(slow>=4){auto=rank[Math.max(0,rank.indexOf(quality)-1)];slow=0;}}
    if(caption){
      caption.textContent=word?.word??'';
      caption.style.transform='scale('+(word?.scale??1)+')';
    }
    output.dataset.shot=view.shot;
    return { word, time:active.scene.time };
  }
  const resize = fixedSize ? null : new ResizeObserver(()=>render(lastTime,lastTurntable));
  resize?.observe(output);
  return {
    setTimeline(data) { override=null;debug=null;auto='High';settings={...settings,...data.lookSettings};clear(); current=null;timeline=data;lastTime=0;if(!fixedSize)render(0); },
    render,debug:()=>debug,lookSettings:()=>({...settings,quality:effective()}),
    configure(options){settings={...settings,...options};auto='High';slow=0;render(lastTime);},
    camera(view){override=view;render(lastTime);},
    project(point){const p=new T.Vector3(...point).project(camera);return [(p.x+1)/2,(1-p.y)/2,p.z];},
    pick(x,y){
      if(!stage)return null;
      const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*x-1,1-2*y),camera);
      const hit=ray.intersectObject(stage.root,true).find(h=>h.object.visible&&h.object!==stage.contacts&&!h.object.userData.halo&&!h.object.userData.particle);
      const point=hit?.point??ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
      if(!point)return null;
      let best=Infinity,name=null;for(const p of stage.picks){const d=p.point.distanceToSquared(point);if(d<best){best=d;name=p.name;}}
      return {position:point.toArray().map(v=>+v.toFixed(2)),nearest:name};
    },
    dispose() {
      resize?.disconnect(); clear();
      renderer?.dispose(); renderer?.forceContextLoss();
      timeline=null; current=null;
    },
  };
}
