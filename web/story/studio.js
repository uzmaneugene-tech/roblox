import {execute} from './execute.js';
import { connectVideoExport } from './export-ui.js';
import { example } from './example.js';
import { setPreviewCharacters } from './character-preview.js?v=pages-tabs';
import { locateScene, MAX_SOURCE } from './timeline.js';

const HISTORY_KEY = 'framecut.story-history.v1';
const DRAFT_KEY = 'framecut.story-draft.v1';
function readDraft(){
  try{ const saved=localStorage.getItem(DRAFT_KEY);if(saved!==null&&saved.length<=MAX_SOURCE)return saved; }catch{}
  return null;
}
function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    if (Array.isArray(saved)) return saved.filter(code => typeof code === 'string' && code.length <= MAX_SOURCE).slice(0, 10);
  } catch { /* Storage can be unavailable in private browsing. */ }
  return [];
}

export function startStudio() {
  const $ = name => document.getElementById('story-' + name);
  const code = $('code'), run = $('run'), errors = $('errors'), errorText = $('error');
  const status = message => { $('status').textContent = message; };
  let history = readHistory(), timeline, filmViewer, raf = null;
  const updateExport=connectVideoExport({getTimeline:()=>timeline,pauseStory:stop});
  const scene = $('scene');
  const scrub = $('time'), play = $('play');
  code.value = readDraft() ?? history[0] ?? example;
  function saveDraft(){
    try{ if(code.value.length<=MAX_SOURCE)localStorage.setItem(DRAFT_KEY,code.value); }catch{}
  }
  code.addEventListener('input',saveDraft);

  function updateHistory() {
    $('history').replaceChildren(new Option('Recent versions', ''), ...history.map((value, i) =>
      new Option((i + 1) + '. ' + (value.trim().split('\n')[0].slice(0, 54) || 'Story Code'), i)));
  }
  function remember(source) {
    if (!source.trim() || source.length > MAX_SOURCE) return;
    history = [source, ...history.filter(item => item !== source)].slice(0, 10);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Keep this session's history. */ }
    updateHistory();
  }
  code.addEventListener('paste', () => setTimeout(() => remember(code.value), 0));
  $('history').onchange = () => {
    if ($('history').value !== '') code.value = history[Number($('history').value)];
    saveDraft();
  };
  $('import').onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_SOURCE * 4) return showError({ message: 'The .js file is too large.' });
    try {
      const value = await file.text();
      if (value.length > MAX_SOURCE) return showError({ message: 'The .js file is too large.' });
      code.value = value;
      saveDraft();
      remember(value);
      errors.hidden = true;
      status('Code imported. Press Run to rebuild the timeline.');
    } catch { showError({ message: 'Could not read the .js file.' }); }
  };
  $('export').onclick = () => {
    const href = URL.createObjectURL(new Blob([code.value], { type: 'text/javascript' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'story-code.js';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  function showError(error) {
    errorText.textContent = (error.line ? 'Line ' + error.line + ': ' : '') + error.message;
    errors.hidden = false;
  }
  $('copy-error').onclick = async () => {
    try {
      await navigator.clipboard.writeText(errorText.textContent);
      status('Error copied.');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(errorText);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      status('Error text selected. Use your browser’s Copy command.');
    }
  };
  function stop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    play.textContent = 'Play';
  }
  function seek(seconds) {
    scrub.value = seconds;
    const actual = Number(scrub.value);
    $('time-label').textContent = actual.toFixed(2) + ' / ' + timeline.duration.toFixed(2) + ' s';
    const active = locateScene(timeline, actual);
    if (active) { scene.value = active.scene.id; filmViewer?.render(actual); }
  }
  scrub.oninput = () => { stop(); seek(Number(scrub.value)); };
  scene.onchange = () => { stop(); seek(timeline.scenes.find(item => item.id === scene.value).start); };
  play.onclick = () => {
    if (raf !== null) return stop();
    const position = Number(scrub.value);
    const from = position >= timeline.duration ? 0 : position;
    const started = performance.now();
    let lastFrame=-1;
    play.textContent = 'Pause';
    const frame = now => {
      const seconds = Math.min(timeline.duration, from + (now - started) / 1000);
      const frameId = Math.floor(seconds * timeline.fps);
      if (frameId !== lastFrame || seconds >= timeline.duration) {
        lastFrame=frameId;
        seek(seconds);
      }
      if (seconds >= timeline.duration) stop();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
  addEventListener('hashchange',()=>{if(location.hash!=='#story')stop()});
  run.onclick = async () => {
    const source = code.value;
    errors.hidden = true;
    stop();
    if (!source.trim()) {
      status('');
      showError({ message: 'Paste Story Code before running it.' });
      return;
    }
    remember(source);
    run.disabled = true;
    status('Running Story Code…');
    try {
      const result = await execute(source);
      if (result.error) {
        status(timeline ? 'Run failed. The previous preview is still displayed.' : '');
        showError(result.error);
        return;
      }
      timeline = result.timeline;
      updateExport(timeline);
      scene.replaceChildren(...timeline.scenes.map(s => new Option(s.id, s.id)));
      setPreviewCharacters(timeline.characters);
      $('timeline').hidden = !timeline.scenes.length;
      scrub.max = timeline.duration;
      play.disabled = !timeline.scenes.length;
      $('frame').hidden = !timeline.scenes.length;
      if (timeline.scenes.length) {
        try {
          filmViewer ??= (await import('./story-view.js')).createStoryView($('film'), $('caption'));
          filmViewer.setTimeline(timeline);
        } catch (error) {
          $('frame').hidden = true;
          showError({ message: 'Story Preview could not render: ' + error.message });
        }
      }
      seek(0);
      status(timeline.title + ' · ' + timeline.scenes.length + ' scenes · ' + timeline.characters.length + ' characters');
    } finally {
      run.disabled = false;
    }
  };
  $('sample').onclick = () => { code.value = example; saveDraft(); errors.hidden = true; status('Sample loaded. Press Run to preview it.'); };
  updateHistory();
}
