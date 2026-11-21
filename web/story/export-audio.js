const SAMPLE_RATE = 48000;
const MAX_UPLOAD = 30 * 1024 * 1024;

export async function prepareAudio(timeline, duration, file, offset, effects, signal) {
  const cues = effects ? timeline.scenes.flatMap(scene=>scene.sounds.map(cue=>({...cue, t:scene.start+cue.t}))) : [];
  if ((!file || offset >= duration) && !cues.length) return null;
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
      data[start+i]=sample*.86/channels.length;
    }
  }
  for (const {name,t} of cues) {
    signal.throwIfAborted();
    const id = [...name].reduce((n,ch)=>(n*31+ch.codePointAt(0))>>>0,0);
    const hz=270+(id%490), start=Math.round(t*SAMPLE_RATE), length=Math.min(data.length-start,Math.floor(SAMPLE_RATE*.23));
    for(let i=0;i<length;i++){
      const p=i/length, a=Math.min(p*10,1)*(1-p)**2*.13;
      data[start+i]=Math.max(-1,Math.min(1,data[start+i]+a*Math.sin(i/SAMPLE_RATE*hz*2*Math.PI)));
    }
  }
  return mix;
}
