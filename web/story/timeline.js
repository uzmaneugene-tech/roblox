import {ambienceNames,musicNames,fxNames,transitions,weatherNames,heldItems,danceStyles,compileClock,clockAt,stormTimes} from './phase-two.js';
import { actions, expressions, locations, props, shots, times } from './registry.js';

import {shapeRecord,bodies,accessories} from './library/validate.js';
export const MAX_SOURCE = 128 * 1024;
export const MAX_RECORD = 8 * 1024;

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value, name, max = 100) => {
  assert(typeof value === 'string' && value.trim() && value.length <= max, name + ': expected text (1–' + max + ' characters).');
  return value;
};
const number = (value, name, min, max) => {
  assert(Number.isFinite(value) && value >= min && value <= max, name + ': expected a number from ' + min + ' to ' + max + '.');
  return value;
};
const vector = (value, name) => {
  assert(Array.isArray(value) && value.length === 3, name + ': expected [x, y, z].');
  return value.map(n => number(n, name, -10000, 10000));
};
const choice = (value, name, allowed) => {
  assert(allowed.includes(value), 'Unknown ' + name + ': ' + String(value) + '. Valid values: ' + allowed.join(', ') + '.');
  return value;
};
const object = (value, name, keys) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), name + ': expected an options object.');
  if (keys) {
    const extra = Object.keys(value).find(k => !keys.includes(k));
    assert(!extra, name + ': unknown option "' + extra + '". Valid options: ' + keys.join(', ') + '.');
  }
  return value;
};

export function locateScene(timeline, seconds) {
  if (!timeline.scenes.length) return null;
  const time = Math.min(Math.max(seconds, 0), timeline.duration);
  const scene = timeline.scenes.find(s => time < s.start + s.duration) ?? timeline.scenes.at(-1);
  return {scene, elapsed:time-scene.start, localTime:clockAt(scene,time-scene.start)};
}

export function recorder() {
  const model = { title: 'Untitled story', aspect: '9:16', fps: 30, duration: 0, characters: [], scenes: [] };
  let current = null, commands = 0, hasStory = false;
  const handle = id => {
    assert(typeof id === 'string' && model.characters.some(c => c.id === id), 'Expected a handle returned by character().');
    return id;
  };
  const catalog=[];
  function preset(opts){
    object(opts,'character()', ['outfit','hair','skin','body','accessories']);
    const clothes=object(opts.outfit??{},'outfit',['shirt','pants','shoes','hat','shirtText']);
    for(const [key,value] of Object.entries(clothes))if(value!=='')text(value,'outfit.'+key,80);
    for(const key of ['hair','skin'])if(opts[key]!==undefined)text(opts[key],key,80);
    if(opts.body!==undefined)choice(opts.body,'body',bodies);
    if(opts.accessories!==undefined){assert(Array.isArray(opts.accessories)&&opts.accessories.length<=12,'Expected up to 12 accessories');opts.accessories.forEach(a=>choice(a,'accessory',accessories));}
  }
  function transitionOptions(value,name){
    if(typeof value==='string')return {name:choice(value,name,transitions),duration:.45};
    object(value,name,['name','duration']);
    return {name:choice(value.name,name,transitions),duration:number(value.duration??.45,name+' duration',.03,15)};
  }
  const settings = {
    definition(name,type){assert(catalog.length<256,'Limit: 256 definitions');catalog.push({name,type});},
    checkPreset(name,opts){preset(opts);},
    story(opts = {}) {
      assert(!hasStory, 'Call story() once.');
      object(opts, 'story()', ['title', 'aspect', 'fps']);
      if (opts.title !== undefined) model.title = text(opts.title, 'Title', 200);
      if (opts.aspect !== undefined) {
        assert(typeof opts.aspect === 'string' && /^[1-9][0-9]?:[1-9][0-9]?$/.test(opts.aspect), 'Aspect: expected a ratio such as "9:16".');
        model.aspect = opts.aspect;
      }
      if (opts.fps !== undefined) {
        assert(Number.isInteger(opts.fps), 'FPS must be an integer.');
        model.fps = number(opts.fps, 'FPS', 1, 120);
      }
      hasStory = true;
    },
    character(name, opts = {}) {
      text(name, 'Character name');
      assert(model.characters.length < 32, 'Use at most 32 characters.');
      assert(!model.characters.some(c => c.name === name), 'Duplicate character name: ' + name);
      preset(opts);
      const outfit = object(opts.outfit ?? {}, 'outfit', ['shirt', 'pants', 'hat', 'shirtText', 'shoes']);
      for (const [key, value] of Object.entries(outfit)) {
        if (value !== '') text(value, 'outfit.' + key, 80);
      }
      for (const key of ['hair', 'skin']) if (opts[key] !== undefined) text(opts[key], key, 80);
      const id = 'character:' + model.characters.length;
      model.characters.push({ id, name, outfit, body:opts.body, accessories:opts.accessories, hair: opts.hair, skin: opts.skin });
      return id;
    },
    open(id, opts) {
      assert(!current, 'Scenes cannot be nested.');
      assert(model.scenes.length < 100, 'Use at most 100 scenes.');
      text(id, 'Scene ID');
      assert(!model.scenes.some(s => s.id === id), 'Duplicate scene ID: ' + id);
      object(opts, 'scene()', ['location', 'time', 'duration','weather','transitionIn','transitionOut']);
      const duration = number(opts.duration, 'Duration (seconds)', 0.01, 600);
      assert(model.duration + duration <= 600, 'The timeline must be at most 600 seconds.');
      current = {
        id, location: choice(opts.location, 'location', [...locations,'empty']), time: choice(opts.time, 'time', times),
        start: model.duration, duration,
        ...(opts.weather!==undefined?{weather:choice(opts.weather,'weather',weatherNames)}:{}),
        ...(opts.transitionIn!==undefined?{transitionIn:transitionOptions(opts.transitionIn,'transitionIn')}:{}),
        ...(opts.transitionOut!==undefined?{transitionOut:transitionOptions(opts.transitionOut,'transitionOut')}:{}),
        nodes:[], crowds:[], placements: [], props: [], actions: [], cameras: [], captions: [], sounds: [],
      };
    },
    close() {
      assert(current, 'No active scene.');
      if(current.weather==='storm')for(const t of stormTimes(current.duration))current.sounds.push({t,name:'thunder'});
      for(const list of ['actions','cameras','captions','sounds','effects','bubbles','titles','transitions','timeChanges']){
        current[list]?.sort((a,b)=>a.t-b.t);
      }
      if(current.edits){
        const clock=compileClock(current.duration,current.edits);
        current.sourceDuration=current.duration;
        current.duration=clock.duration;
        current.clock=clock.spans;
        delete current.edits;
      }
      assert(model.duration+current.duration<=600,'The retimed timeline must be at most 600 seconds.');
      model.scenes.push(current);
      model.duration += current.duration;
      current = null;
    },
  };
  const at = t => number(t, 'Scene time (seconds)', 0, current.duration);
  function captionLine(t, caption, opts, char) {
    object(opts, 'Caption', ['speed']);
    current.captions.push({ t: at(t), text: text(caption, 'Caption', 1000),
      speed: number(opts.speed ?? 3, 'Caption speed (words per second)', .25, 20),
      ...(char === undefined ? {} : { char }) });
  }
  const methods = {
    shape(...args){
      const k=args[1];if(k==='text')assert((current.textCount=(current.textCount??0)+1)<=80,'Use at most 80 text panels per scene.');
      return shapeRecord(...args,current.nodes);
    },
    sky(time){current.time=choice(time,'sky time',times);},
    fog(opts){object(opts,'fog',['near','far','color']); const near=number(opts.near??20,'fog near',0,500); current.fog={near,far:number(opts.far??100,'fog far',near+.1,1000),color:opts.color===undefined?null:text(opts.color,'fog color',30)};},
    animation(t,char,action,duration){current.actions.push({t:at(t),char:handle(char),action,duration,frames:[]});},
    keyframe(frame){current.actions.at(-1).frames.push(frame);},
    crowd(opts){object(opts,'crowd',['count','area','seed','style']);const count=number(opts.count,'crowd count',1,150);
      assert(Number.isInteger(count)&&current.crowds.reduce((n,c)=>n+c.count,0)+count<=150,'Use at most 150 NPCs per scene');
      assert(Array.isArray(opts.area)&&opts.area.length===2,'crowd area is [width,depth]');current.crowds.push({count,area:opts.area.map(n=>number(n,'area',1,500)),seed:number(opts.seed??1,'seed',0,4294967295),style:choice(opts.style??'rich','crowd style',['rich','poor','kids'])});},
    place(char, position) {
      current.placements.push({ char: handle(char), position: vector(position, 'Character position') });
    },
    prop(type, position, opts = {}) {
      object(opts, 'prop()', ['text', 'color', 'rotate', 'scale']);
      if (opts.text !== undefined && opts.text !== '') text(opts.text, 'Prop text', 200);
      if (opts.color !== undefined) text(opts.color, 'Prop color', 80);
      if (opts.rotate !== undefined) Array.isArray(opts.rotate) ? vector(opts.rotate, 'Rotation') : number(opts.rotate, 'Rotation', -3600, 3600);
      if (opts.scale !== undefined) {
        if (Array.isArray(opts.scale)) vector(opts.scale, 'Scale').forEach(n => number(n, 'Scale axis', 0.001, 100));
        else number(opts.scale, 'Scale', 0.001, 100);
      }
      current.props.push({ type: choice(type, 'prop', props), position: vector(position, 'Prop position'), opts });
    },
    do(t, char, action, arg = null) {
      choice(action, 'action', actions);
      if (action === 'walk_to' || action === 'run_to') vector(arg, action + ' destination');
      if (action === 'turn_to') Array.isArray(arg) ? vector(arg, 'Turn target') : number(arg, 'Heading (degrees)', -3600, 3600);
      if (action === 'emote') choice(arg, 'expression', expressions);
      if (action === 'shoot_ball' && arg !== null) vector(arg, 'Hoop target');
      if(['hug','give','push'].includes(action)&&arg!==null)handle(arg);
      if(action==='give')handle(arg);
      if(['hold','pick_up'].includes(action))choice(arg,'held item',heldItems);
      if(action==='dance'&&arg!==null)choice(arg,'dance style',danceStyles);
      current.actions.push({ t: at(t), char: handle(char), action, arg });
    },
    cam(t, shot, opts = {}) {
      object(opts, 'cam()', ['from', 'look', 'target', 'face', 'side', 'ease', 'shake', 'cut', 'dist', 'height', 'fov', 'offset', 'targets']);
      for (const key of ['from', 'look', 'offset']) if (opts[key] !== undefined) vector(opts[key], 'Camera ' + key);
      if (opts.target !== undefined) handle(opts.target);
      if(opts.targets!==undefined){assert(Array.isArray(opts.targets)&&opts.targets.length>=2&&opts.targets.length<=32,'Camera targets: provide 2–32 character handles.');opts.targets.forEach(handle);}
      if(shot==='two_shot')assert(opts.targets?.length===2,'two_shot needs exactly two targets.');
      for(const [key,min,max] of [['dist',.5,200],['height',.1,150],['fov',12,125]])if(opts[key]!==undefined)number(opts[key],'Camera '+key,min,max);
      if (opts.face !== undefined) assert(typeof opts.face === 'boolean', 'Camera face: expected true or false.');
      if (opts.side !== undefined) choice(opts.side, 'camera side', ['left', 'right']);
      if (opts.ease !== undefined) number(opts.ease, 'Camera ease (seconds)', 0, 10);
      if (opts.shake !== undefined) number(opts.shake, 'Camera shake', 0, 2);
      if (opts.cut !== undefined) assert(typeof opts.cut === 'boolean', 'Camera cut: expected true or false.');
      current.cameras.push({ t: at(t), shot: choice(shot, 'shot', shots), opts });
    },
    say(t, char, caption, opts = {}) {
      captionLine(t, caption, opts, handle(char));
    },
    narrate(t, caption, opts = {}) {
      captionLine(t, caption, opts);
    },
    grade(value){current.grade=choice(value,'grade',['neutral','warm_dusk','cold_night','bright_day']);},
    dof(opts){object(opts,'dof',['focus','amount']);current.dof={focus:handle(opts.focus),amount:number(opts.amount??.3,'focus amount',0,1)};},
    light(opts) {
      object(opts, 'light()', ['color', 'intensity', 'ambient']);
      if (opts.color !== undefined) text(opts.color, 'Light color', 80);
      if (opts.intensity !== undefined) number(opts.intensity, 'Light intensity', 0, 8);
      if (opts.ambient !== undefined) number(opts.ambient, 'Ambient light', 0, 5);
      current.light = opts;
    },
    ambience(name,opts={}){
      object(opts,'ambience',['volume']);
      current.ambience={name:choice(name,'ambience',ambienceNames),volume:number(opts.volume??.55,'ambience volume',0,1)};
    },
    music(name,opts={}){
      object(opts,'music',['volume','fadeIn']);
      current.music={name:choice(name,'music',musicNames),volume:number(opts.volume??.55,'music volume',0,1),fadeIn:number(opts.fadeIn??.4,'music fadeIn',0,30)};
    },
    fx(t,name,opts={}){
      object(opts,'fx',['target','position','duration','intensity']);
      assert(opts.target===undefined||opts.position===undefined,'fx: use target or position.');
      (current.effects??=[]).push({t:at(t),name:choice(name,'effect',fxNames),target:opts.target===undefined?null:handle(opts.target),position:vector(opts.position??[0,2,0],'effect position'),duration:number(opts.duration??2,'effect duration',.03,60),intensity:number(opts.intensity??1,'effect intensity',0,3)});
    },
    bubble(t,char,value,opts={}){
      object(opts,'bubble',['kind','duration']);
      (current.bubbles??=[]).push({t:at(t),char:handle(char),text:text(value,'bubble text',180),kind:choice(opts.kind??'speech','bubble kind',['speech','thought','exclaim']),duration:number(opts.duration??2,'bubble duration',.03,30)});
    },
    title(t,value,opts={}){
      object(opts,'title',['sub','duration','style']);
      (current.titles??=[]).push({t:at(t),text:text(value,'title text',160),sub:opts.sub===undefined?'':text(opts.sub,'subtitle',180),style:choice(opts.style??'big','title style',['big','lowerthird','chapter']),duration:number(opts.duration??2,'title duration',.03,30)});
    },
    transition(t,name,opts={}){
      object(opts,'transition',['duration']);
      (current.transitions??=[]).push({t:at(t),...transitionOptions({name,duration:opts.duration},'transition')});
    },
    slowmo(t,duration,factor){
      (current.edits??=[]).push({t:at(t),length:number(duration,'slowmo duration',.01,600),rate:number(factor,'slowmo factor',.05,1)});
    },
    freeze(t,duration){(current.edits??=[]).push({t:at(t),length:number(duration,'freeze duration',.01,60),rate:0});},
    timeOfDay(t,value,opts={}){
      object(opts,'timeOfDay',['duration']);
      (current.timeChanges??=[]).push({t:at(t),value:choice(value,'time',times),duration:number(opts.duration??1,'time transition duration',.03,60)});
    },
    sfx(t, name) { current.sounds.push({ t: at(t), name: text(name, 'Sound') }); },
  };
  return {
    catalog,
    record(command, args) {
      assert(++commands <= 28000, 'Story Code exceeded 28,000 API calls.');
      assert(Array.isArray(args), 'Invalid Story Code arguments.');
      if (Object.hasOwn(settings, command)) return settings[command](...args);
      assert(current && Object.hasOwn(methods, command), 'Call scene methods inside a scene() callback.');
      return methods[command](...args);
    },
    finish() {
      assert(!current, 'Unclosed scene.');
      return model;
    },
  };
}
