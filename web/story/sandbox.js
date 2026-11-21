import {sourceCheck} from './source-check.js';
import {checking,explain} from './diagnostics.js';
import { newQuickJSWASMModuleFromVariant, browserRelease } from './vendor/quickjs.mjs';
import { globals, sceneMethods } from './registry.js';
import { recorder, MAX_SOURCE, MAX_RECORD } from './timeline.js';

import {libraryAPI} from './library/guest.js';
let engine;
const api = (bridge, methods, library, check) => {
  const stringify = JSON.stringify;
  const ErrorType = Error;
  const startsWith = Function.call.bind(String.prototype.startsWith);
  const command = (name, args) => {
    const result = bridge(name, stringify(args));
    if (startsWith(result, '!')) throw new ErrorType(result.slice(1));
    return result || undefined;
  };
  const report=(kind,message,stack)=>command('diagnostic',[kind,message,(stack||new ErrorType().stack).slice(0,6000)]);
  const checks=check(report);
  const definitions = {
    story: options => command('story', options === undefined ? [] : [options]),
    character: (name, options) => command('character', options === undefined ? [name] : [name, options]),
    scene: (id, options, callback) => {
      if (typeof callback !== 'function') throw new ErrorType('scene() needs a callback: (s) => { ... }.');
      try{command('open',[id, options]);}catch(e){
        if(!/Unknown location|Unknown time|unknown option|Duration \(seconds\)/.test(e.message))throw e;
        report('error',e.message,e.stack);
        command('open',[id,{location:'empty',time:'day',duration:typeof options?.duration==='number'&&options.duration>0&&options.duration<=600?options.duration:1}]);
      }
      let active = true;
      const target = Object.create(null);
      for (const name of methods) target[name] = (...args) => {
        if (!active) throw new ErrorType('Call scene methods inside their scene() callback.');
        return command(name, args);
      };
      const s = new Proxy(Object.freeze(target), {
        get(target, name) {
          if (!Object.hasOwn(target, name)) {
            throw new ErrorType('Unknown scene method: s.' + String(name) + '. Valid methods: ' + methods.join(', ') + '.');
          }
          return target[name];
        },
      });
      try {
        const returned = callback(s);
        if (returned && typeof returned.then === 'function') {
          throw new ErrorType('Use a synchronous scene() callback.');
        }
      } finally {
        active = false;
        command('close', []);
      }
    },
  };
  library(command, definitions,checks);
  for (const name of Object.keys(definitions)) Object.defineProperty(globalThis, name, { value: (...args)=>checks.call(definitions[name],name,args) });
  return error => stringify({
    message: typeof error?.message === 'string' ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    name: typeof error?.name === 'string' ? error.name : '',
    stack: typeof error?.stack === 'string' ? error.stack.slice(0, 8192) : '',
  });
};

function readError(vm, describe, error) {
  const details = vm.callFunction(describe, vm.undefined, error);
  if (details.error) {
    details.error.dispose();
    return { message: 'Story Code stopped before it could finish.' };
  }
  try {
    const { message, name, stack } = JSON.parse(vm.getString(details.value));
    const file=/library\/([^:\n]+):(\d+)/.exec(message+"\n"+stack);
    const line = Number(file?.[2]) || Number(/story\.js:(\d+)/.exec(stack)?.[1]) || null;
    const hint = name === 'ReferenceError' ? ' Valid Story Code functions: ' + globals.join(', ') + '.' : '';
    return { message: (file ? file[1]+': ' : '') + (message || 'Unknown error.') + hint, line };
  } finally {
    details.value.dispose();
  }
}

export async function runStory(source, { budget = 1500, library=[] } = {}) {
  if (typeof source !== 'string' || source.length > MAX_SOURCE) {
    return { error: { message: 'Story Code must be at most 128 Ki characters.' } };
  }
  engine ??= newQuickJSWASMModuleFromVariant(browserRelease);
  const runtime = (await engine).newRuntime();
  runtime.setMemoryLimit(24 * 1024 * 1024);
  runtime.setMaxStackSize(512 * 1024);
  const model = recorder(), issues=[],warnings=[],seen=new Set();
  function add(kind,msg,stack){
    const hit=/(library\/[\w-]+\.js|story\.js):(\d+)/.exec(stack);
    const line=Number(hit?.[2])||1,file=hit?.[1]??'story.js';
    const item=library.find(i=>'library/'+i.name+'.js'===file);
    const snippet=(item?.source??source).split('\n')[line-1]?.trim().slice(0,200)??'';
    const explained=explain(msg),key=[kind,file,line,msg].join(':');if(issues.some(i=>i.line===line&&i.file===file&&i.message===explained)||seen.has(key)||issues.some(i=>i.file===file&&i.line===line&&i.message.startsWith('Missing dependency')&&msg.includes('Missing dependency')))return;
    if(seen.size>=250)throw Error('Diagnostic limit exceeded (250).');
    seen.add(key);(kind==='notice'?warnings:issues).push({line,message:explained,snippet,file});
  }
  function failed(){return {issues,warnings,error:{line:issues[0].line,message:issues.map(i=>i.file+' · Line '+i.line+': '+i.message+'\n  '+i.snippet).join('\n\n')}};}

  let interrupted = false;
  const deadline = performance.now() + budget;
  runtime.setInterruptHandler(() => (interrupted ||= performance.now() > deadline));
  const vm = runtime.newContext();
  try {
    const bridge = vm.newFunction('record', (name, payload) => {
      try {
        if (vm.typeof(name) !== 'string' || vm.typeof(payload) !== 'string') throw new Error('Invalid API call.');
        const input = vm.getString(payload);
        if (input.length > MAX_RECORD) throw new Error('An API call exceeded the input limit.');
        if(vm.getString(name)==='diagnostic'){add(...JSON.parse(input));return vm.newString('');}
        return vm.newString(model.record(vm.getString(name), JSON.parse(input)) ?? '');
      } catch (error) {
        return vm.newString('!' + error.message);
      }
    });
    const install = vm.unwrapResult(vm.evalCode('(' + api.toString() + ')', 'story-api.js'));
    const methods = vm.unwrapResult(vm.evalCode(JSON.stringify(sceneMethods), 'story-api.js'));
    let describe;
    try {
      const lib=vm.unwrapResult(vm.evalCode('('+libraryAPI.toString()+')','builder-api.js'));
      const check=vm.unwrapResult(vm.evalCode('('+checking.toString()+')','checks.js'));
      try{describe = vm.unwrapResult(vm.callFunction(install, vm.undefined, bridge, methods, lib,check));}finally{check.dispose();lib.dispose();}
    } finally {
      methods.dispose();
      install.dispose();
      bridge.dispose();
    }
    try {
      if(!Array.isArray(library)||library.length>256||library.some(e=>typeof e.source!=='string'||e.source.length>MAX_SOURCE)||library.reduce((n,e)=>n+e.source.length,0)>1024*1024)return {error:{message:'Library exceeds its source limit.'}};
      const staticIssues=sourceCheck(source,library);
      if(staticIssues.length){issues.push(...staticIssues);if(staticIssues.some(i=>i.message.startsWith('JavaScript syntax')))return failed();}
      for(const [index,item] of library.entries()){
        const file=String(item.name??('item-'+index)).replace(/[^a-zA-Z0-9_-]/g,'_');
        const r=vm.evalCode('{'+item.source+'\n}', 'library/'+file+'.js');
        if(r.error){const e=readError(vm,describe,r.error);r.error.dispose();add('error',e.message,'library/'+file+'.js:'+(e.line||1));continue;}
        r.value.dispose();
      }
      const result = vm.evalCode(source, 'story.js');
      if (result.error) {
        try {
          return { error: interrupted
            ? { message: 'Execution time limit exceeded. Check for an infinite loop.' }
            : (()=>{const e=readError(vm,describe,result.error);add('error',e.message,'story.js:'+(e.line||1));return failed().error;})() };
        } finally {
          result.error.dispose();
        }
      }
      result.value.dispose();
      if (interrupted) return { error: { message: 'Execution time limit exceeded. Check for an infinite loop.' } };
      if (runtime.hasPendingJob()) return { error: { message: 'Use synchronous Story Code. Promises and async tasks are not supported.' } };
      return issues.length?failed():{timeline:model.finish(),catalog:model.catalog,warnings};
    } finally {
      describe.dispose();
    }
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
