import { actions, expressions, locations, props, shots, times } from './registry.js';

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
  return { scene, localTime: time - scene.start };
}

export function recorder() {
  const model = { title: 'Untitled story', aspect: '9:16', fps: 30, duration: 0, characters: [], scenes: [] };
  let current = null, commands = 0, hasStory = false;
  const handle = id => {
    assert(typeof id === 'string' && model.characters.some(c => c.id === id), 'Expected a handle returned by character().');
    return id;
  };
  const settings = {
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
      object(opts, 'character()', ['outfit', 'hair', 'skin']);
      const outfit = object(opts.outfit ?? {}, 'outfit', ['shirt', 'pants', 'hat', 'shirtText', 'shoes']);
      for (const [key, value] of Object.entries(outfit)) {
        if (value !== '') text(value, 'outfit.' + key, 80);
      }
      for (const key of ['hair', 'skin']) if (opts[key] !== undefined) text(opts[key], key, 80);
      const id = 'character:' + model.characters.length;
      model.characters.push({ id, name, outfit, hair: opts.hair, skin: opts.skin });
      return id;
    },
    open(id, opts) {
      assert(!current, 'Scenes cannot be nested.');
      assert(model.scenes.length < 100, 'Use at most 100 scenes.');
      text(id, 'Scene ID');
      assert(!model.scenes.some(s => s.id === id), 'Duplicate scene ID: ' + id);
      object(opts, 'scene()', ['location', 'time', 'duration']);
      const duration = number(opts.duration, 'Duration (seconds)', 0.01, 600);
      assert(model.duration + duration <= 600, 'The timeline must be at most 600 seconds.');
      current = {
        id, location: choice(opts.location, 'location', locations), time: choice(opts.time, 'time', times),
        start: model.duration, duration, placements: [], props: [], actions: [], cameras: [], captions: [], sounds: [],
      };
    },
    close() {
      assert(current, 'No active scene.');
      for (const list of ['actions', 'cameras', 'captions', 'sounds']) current[list].sort((a, b) => a.t - b.t);
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
      current.actions.push({ t: at(t), char: handle(char), action, arg });
    },
    cam(t, shot, opts = {}) {
      object(opts, 'cam()', ['from', 'look', 'target', 'face', 'side', 'ease', 'shake', 'cut']);
      for (const key of ['from', 'look']) if (opts[key] !== undefined) vector(opts[key], 'Camera ' + key);
      if (opts.target !== undefined) handle(opts.target);
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
    light(opts) {
      object(opts, 'light()', ['color', 'intensity', 'ambient']);
      if (opts.color !== undefined) text(opts.color, 'Light color', 80);
      if (opts.intensity !== undefined) number(opts.intensity, 'Light intensity', 0, 8);
      if (opts.ambient !== undefined) number(opts.ambient, 'Ambient light', 0, 5);
      current.light = opts;
    },
    sfx(t, name) { current.sounds.push({ t: at(t), name: text(name, 'Sound') }); },
  };
  return {
    record(command, args) {
      assert(++commands <= 4096, 'Story Code exceeded 4,096 API calls.');
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
