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
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true});
  const renderer=gl&&new T.WebGLRenderer({canvas,context:gl,alpha:true,antialias:true});
  const paint=renderer?null:softwarePreview(T,canvas);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(43,9/16,.12,230);
  camera.userData.focus=new T.Vector3();
  const key=new T.DirectionalLight('#fff2d6',2.0), fill=new T.HemisphereLight('#d4ebff','#947790',1.48);
  const rim=new T.DirectionalLight('#c3ceff',.89);
  key.position.set(-26,38,22); rim.position.set(18,14,-19);
  scene.add(key,fill,rim);
  let timeline, stage, current, lastTime=0;

  function clear() {
    if(!stage)return;
    for(const root of stage.owned)dispose(root,false);
    for(const ball of stage.balls.values())ball.traverse(node=>{if(node.geometry?.type==='TorusGeometry')node.geometry.dispose()});
    stage.library.dispose();
    scene.remove(stage.root);
    dispose(stage.set,true);
    stage=null;
  }
  function load(data) {
    clear();
    current=data;
    const preset=presets[data.time], ctx={dark:data.time!=='day',night:data.time==='night',glows:0};
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
    const library=buildLibrary(libraryRoot,data.nodes??[],data.crowds??[],data.time);
    const solids=[...library.solids];set.updateMatrixWorld(true);
    set.traverse(node=>{if(node.userData.solid){const box=new T.Box3().setFromObject(node);solids.push({min:box.min.toArray(),max:box.max.toArray()});}});
    batch(set);
    const owned=[], models=new Map(), tracks=new Map(), balls=new Map();
    const placed=new Map(data.placements.map(p=>[p.char,p.position]));
    for(const [id,pos] of placed) {
      const spec=timeline.characters.find(c=>c.id===id);
      const model=buildAvatar(spec), pivot=new T.Group();
      pivot.add(model.group);live.add(pivot);owned.push(model.group);
      const events=data.actions.filter(e=>e.char===id);
      const track=compileMotion(pos,events,hoops);
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
    },0),[...placed.keys()],solids);
    scene.add(root);
    const face=new T.Quaternion(), inverse=new T.Quaternion(), halos=[];
    root.traverse(item=>{if(item.userData.halo)halos.push(item);});
    stage={root,library,set,live,owned,models,tracks,balls,director,halos,face,inverse};
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

  function render(time=lastTime) {
    lastTime=time;
    const active=timeline&&locateScene(timeline,time);
    if(!active)return;
    const bounds=fixedSize??canvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    if(active.scene!==current)load(active.scene);
    const dpr=fixedSize?1:Math.min(devicePixelRatio||1, renderer?2:1.15);
    const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
    if(canvas.width!==width||canvas.height!==height){
      if(renderer)renderer.setSize(width,height,false);else{canvas.width=width;canvas.height=height;}
    }
    const t=active.localTime; stage.library.update(t);
    for(const [id, { model,pivot,baseShadow }] of stage.models) {
      const frame=stage.tracks.get(id)(t);
      pivot.position.set(frame.pos[0],frame.pos[1]+frame.low,frame.pos[2]);
      pivot.rotation.set(0,frame.yaw,0);
      model.group.rotation.x=frame.root;
      for(const [part,rot] of Object.entries(frame.rot))model.parts[part].rotation.set(...rot);
      model.parts.torso.scale.y=frame.breath;
      model.setFace(frame.face);
      baseShadow.position.set(frame.pos[0],frame.pos[1],frame.pos[2]);
      const ball=stage.balls.get(id);
      if(ball){ball.visible=Boolean(frame.ball);if(frame.ball)ball.position.set(frame.ball[0],frame.ball[1]-.34,frame.ball[2]);}
    }
    const view=stage.director(t);
    camera.aspect=width/height;camera.fov=view.fov;
    camera.position.fromArray(view.from);camera.userData.focus.fromArray(view.look);camera.lookAt(camera.userData.focus);
    camera.updateProjectionMatrix();camera.getWorldQuaternion(stage.face);
    for(const glow of stage.halos)glow.quaternion.copy(glow.parent.getWorldQuaternion(stage.inverse).invert()).multiply(stage.face);
    if(renderer)renderer.render(scene,camera);else paint(scene,camera);
    const word=captionAt(active.scene.captions,t);
    if(caption){
      caption.textContent=word?.word??'';
      caption.style.transform='scale('+(word?.scale??1)+')';
    }
    canvas.dataset.shot=view.shot;
    return { word, time:active.scene.time };
  }
  const resize = fixedSize ? null : new ResizeObserver(()=>render());
  resize?.observe(canvas);
  return {
    setTimeline(data) { clear(); current=null;timeline=data;lastTime=0;if(!fixedSize)render(0); },
    render,
    dispose() {
      resize?.disconnect(); clear();
      renderer?.dispose(); renderer?.forceContextLoss();
      timeline=null; current=null;
    },
  };
}
