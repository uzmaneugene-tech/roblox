import {audioRate as SAMPLE_RATE,hasSceneAudio,renderSceneAudio} from './sound.js';
const MAX_UPLOAD = 30 * 1024 * 1024;

export async function prepareAudio(timeline, duration, file, offset, effects, signal) {
  const gains=timeline.audioSettings??{};
  const scenes=effects&&!gains.muted?timeline.scenes.filter(scene=>hasSceneAudio(scene,gains)):[];
  if(gains.muted||gains.voice===0)file=null;
  if ((!file || offset >= duration) && !scenes.length) return null;
  if (!Number.isFinite(offset)||offset<0) throw new Error('Voiceover offset must be a nonnegative number of seconds.');
  const mix = new AudioBuffer({length:Math.ceil(duration*SAMPLE_RATE),sampleRate:SAMPLE_RATE,numberOfChannels:1});
  const data = mix.getChannelData(0);
  if (file && offset < duration) {
    if (file.size>MAX_UPLOAD) throw new Error('Voiceover is over 30 MB. Trim or compress it and try again.');
    let voice;
    try {
      const decoder = new OfflineAudioContext(1,1,SAMPLE_RATE);
      voice = await decoder.decodeAudioData(await file.arrayBuffer());
    } catch (error) {
      if (error.name==='QuotaExceededError'||error.name==='RangeError') throw error;
      throw new Error('Could not decode this voiceover. Try an MP3, WAV, or M4A supported by your browser.');
    }
    signal.throwIfAborted();
    const start = Math.round(offset*SAMPLE_RATE);
    const channels = Array.from({length:voice.numberOfChannels},(_,i)=>voice.getChannelData(i));
    for(let i=0;i<Math.min(voice.length,data.length-start);i++) {
      let sample=0;
      for(const channel of channels)sample+=channel[i];
      data[start+i]=sample*.86*(gains.voice??1)/channels.length;
    }
  }
  for(const scene of scenes){
    signal.throwIfAborted();
    const start=Math.round(scene.start*SAMPLE_RATE);
    const end=Math.round((scene.start+scene.duration)*SAMPLE_RATE);
    renderSceneAudio(scene,data.subarray(start,end),SAMPLE_RATE,gains);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return mix;
}
