import { newQuickJSWASMModuleFromVariant, browserRelease } from './vendor/quickjs.mjs';
import { globals, sceneMethods } from './registry.js';
import { recorder, MAX_SOURCE, MAX_RECORD } from './timeline.js';

import {libraryAPI} from './library/guest.js';
let engine;
const api = (bridge, methods, library) => {
  const stringify = JSON.stringify;
  const ErrorType = Error;
  const startsWith = Function.call.bind(String.prototype.startsWith);
  const command = (name, args) => {
    const result = bridge(name, stringify(args));
    if (startsWith(result, '!')) throw new ErrorType(result.slice(1));
    return result || undefined;
  };
  const definitions = {
    story: options => command('story', options === undefined ? [] : [options]),
    character: (name, options) => command('character', options === undefined ? [name] : [name, options]),
    scene: (id, options, callback) => {
      if (typeof callback !== 'function') throw new ErrorType('scene() needs a callback: (s) => { ... }.');
      command('open', [id, options]);
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
  library(command, definitions);
  for (const name of Object.keys(definitions)) Object.defineProperty(globalThis, name, { value: definitions[name] });
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
    const file=/library\/([^:\n]+):(\d+)/.exec(stack);
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
  const model = recorder();
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
      try{describe = vm.unwrapResult(vm.callFunction(install, vm.undefined, bridge, methods, lib));}finally{lib.dispose();}
    } finally {
      methods.dispose();
      install.dispose();
      bridge.dispose();
    }
    try {
      if(!Array.isArray(library)||library.length>256||library.some(e=>typeof e.source!=='string'||e.source.length>MAX_SOURCE)||library.reduce((n,e)=>n+e.source.length,0)>1024*1024)return {error:{message:'Library exceeds its source limit.'}};
      for(const [index,item] of library.entries()){
        const file=String(item.name??('item-'+index)).replace(/[^a-zA-Z0-9_-]/g,'_');
        const r=vm.evalCode('{'+item.source+'\n}', 'library/'+file+'.js');
        if(r.error){try{return {error:readError(vm,describe,r.error)}}finally{r.error.dispose();}}
        r.value.dispose();
      }
      const result = vm.evalCode(source, 'story.js');
      if (result.error) {
        try {
          return { error: interrupted
            ? { message: 'Execution time limit exceeded. Check for an infinite loop.' }
            : readError(vm, describe, result.error) };
        } finally {
          result.error.dispose();
        }
      }
      result.value.dispose();
      if (interrupted) return { error: { message: 'Execution time limit exceeded. Check for an infinite loop.' } };
      if (runtime.hasPendingJob()) return { error: { message: 'Use synchronous Story Code. Promises and async tasks are not supported.' } };
      return { timeline: model.finish(), catalog:model.catalog };
    } finally {
      describe.dispose();
    }
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
