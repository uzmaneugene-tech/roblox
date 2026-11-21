import { createStoryView } from './story-view.js';
import { prepareAudio } from './export-audio.js';
import { encodeTimelineFrames, exportName, exportPlan, EXPORT_FPS, frameTime, MAX_OUTPUT_BYTES } from './export-timing.js';

function surface(width,height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
function budget(bytes) {
  if(bytes>MAX_OUTPUT_BYTES) throw new Error('The video exceeded this browser’s memory budget. Choose 720p or split the story.');
}

async function encodeFrames(lib, mode, canvas, plan, audio, renderFrame, report, signal, audioCodec) {
  const {Output,BufferTarget,CanvasSource,AudioBufferSource,Mp4OutputFormat,WebMOutputFormat}=lib;
  const isMp4=mode==='mp4', target=new BufferTarget();
  const output=new Output({format:isMp4?new Mp4OutputFormat({fastStart:false}):new WebMOutputFormat(),target});
  let bytes=0, encoded=0;
  const video=new CanvasSource(canvas,{
    codec:isMp4?'avc':'vp8', bitrate:plan.bitrate, keyFrameInterval:2,
    onEncodedPacket(packet){bytes+=packet.data.byteLength;encoded++;},
  });
  output.addVideoTrack(video,{frameRate:EXPORT_FPS});
  const sound=audio&&new AudioBufferSource({codec:audioCodec,bitrate:96000});
  if(sound)output.addAudioTrack(sound);
  const stop=()=>{ output.cancel().catch(()=>{}); };
  signal.addEventListener('abort',stop,{once:true});
  let audioWork;
  try {
    signal.throwIfAborted();
    await output.start();
    let audioFailure;
    if(sound) audioWork=sound.add(audio).then(()=>sound.close()).catch(error=>{audioFailure=error;});
    await encodeTimelineFrames(plan,{
      signal, yieldTask:()=>pause(0),
      draw(i){if(audioFailure)throw audioFailure;renderFrame(i);},
      encode:(timestamp,duration)=>video.add(timestamp,duration),
      tick(i){budget(bytes);report(i,mode);},
    });
    video.close();
    await audioWork;
    if(audioFailure)throw audioFailure;
    signal.throwIfAborted();
    await output.finalize();
    signal.throwIfAborted();
    budget(target.buffer?.byteLength ?? bytes);
    if(encoded!==plan.frames)throw new Error('The encoder produced '+encoded+' of '+plan.frames+' frames. Try 720p or another browser.');
    return new Blob([target.buffer],{type:isMp4?'video/mp4':'video/webm'});
  } catch(error) {
    if(output.state!=='finalized')await output.cancel().catch(()=>{});
    signal.throwIfAborted();
    throw error;
  } finally {
    signal.removeEventListener('abort',stop);
  }
}

async function recordFrames(canvas, plan, audio, renderFrame, report, signal, audioContext) {
  if (!globalThis.MediaRecorder || !canvas.captureStream) throw new Error('This browser cannot export video. Try mobile Chrome or desktop Chromium.');
  const mimeType=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']
    .find(mime=>MediaRecorder.isTypeSupported(mime));
  if(!mimeType)throw new Error('This browser has no WebM recorder. Try Chrome or Edge.');
  const stream=canvas.captureStream(0), track=stream.getVideoTracks()[0];
  let source, recorder;
  try {
    if(!track?.requestFrame)throw new Error('This browser cannot capture the export canvas.');
    if(audio){
      if(!audioContext||audioContext.state!=='running'){
        throw new Error('Audio playback is blocked. Retry after tapping Export, or use a WebCodecs browser.');
      }
      const destination=audioContext.createMediaStreamDestination();
      source=audioContext.createBufferSource();source.buffer=audio;source.connect(destination);
      for(const input of destination.stream.getAudioTracks())stream.addTrack(input);
    }
    const data=[];let size=0, failure;
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:plan.bitrate});
    const finished=new Promise((resolve,reject)=>{
      recorder.ondataavailable=event=>{
        size+=event.data.size;
        if(size>MAX_OUTPUT_BYTES)failure=new Error('The video exceeded the memory budget. Choose 720p or split the story.');
        else if(event.data.size)data.push(event.data);
      };
      recorder.onstop=()=>resolve();
      recorder.onerror=event=>reject(event.error);
    });
    finished.catch(()=>{});
    renderFrame(0);
    recorder.start(500);
    source?.start();
    const start=performance.now();
    for(let i=0;i<plan.frames;i++){
      signal.throwIfAborted();
      if(failure)throw failure;
      if(recorder.state==='inactive'){await finished;throw new Error('The WebM recorder stopped early. Try 720p.');}
      if(i)renderFrame(i);
      track.requestFrame();
      report(i+1,'webm-realtime');
      await pause(Math.max(1,start+(i+1)*1000/EXPORT_FPS-performance.now()));
    }
    recorder.stop();
    await finished;
    signal.throwIfAborted();
    if(failure)throw failure;
    return new Blob(data,{type:'video/webm'});
  } finally {
    if(recorder&&recorder.state!=='inactive')recorder.stop();
    if(source){try{source.stop();}catch{}}
    for(const t of stream.getTracks())t.stop();
  }
}

export async function exportStoryVideo(timeline, {height, file, offset=0, effects=false, signal, onProgress=()=>{}, audioContext}) {
  const start=performance.now();
  const plan=exportPlan(timeline.duration,height);
  let view;
  try {
    signal.throwIfAborted();
    const lib=await import('./vendor/mediabunny.mjs');
    const audio=await prepareAudio(timeline,plan.duration,file,offset,effects,signal);
    const capabilities={width:plan.width,height,bitrate:plan.bitrate,frameRate:EXPORT_FPS};
    const sound={sampleRate:48000,numberOfChannels:1,bitrate:96000};
    let mode='webm-realtime', audioCodec='aac';
    if(globalThis.VideoEncoder){
      const avc=await lib.canEncodeVideo('avc',capabilities);
      const aac=audio&&avc?await lib.canEncodeAudio('aac',sound):false;
      const opus=audio&&!aac?await lib.canEncodeAudio('opus',sound):false;
      const mp4Opus=opus&&document.createElement('video').canPlayType('video/mp4; codecs="avc1.42001f,opus"');
      if(avc&&(!audio||aac||mp4Opus)){mode='mp4';audioCodec=aac?'aac':'opus';}
      else if((!audio||opus||await lib.canEncodeAudio('opus',sound))&&await lib.canEncodeVideo('vp8',capabilities)){
        mode='webm';audioCodec='opus';
      }
    }
    signal.throwIfAborted();
    const renderCanvas=surface(plan.width,height), canvas=surface(plan.width,height);
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw new Error('Could not allocate a video canvas. Try 720p.');
    view=createStoryView(renderCanvas,null,{width:plan.width,height});
    view.setTimeline(timeline);
    function renderFrame(i){view.render(frameTime(i));ctx.drawImage(renderCanvas,0,0);}
    function report(processed,currentMode) {
      const elapsed=(performance.now()-start)/1000;
      onProgress({processed,total:plan.frames,elapsed,eta:processed?elapsed/processed*(plan.frames-processed):null,mode:currentMode});
    }
    report(0,mode);
    const blob=mode==='webm-realtime'
      ? await recordFrames(canvas,plan,audio,renderFrame,report,signal,audioContext)
      : await encodeFrames(lib,mode,canvas,plan,audio,renderFrame,report,signal,audioCodec);
    signal.throwIfAborted();
    if(!blob.size)throw new Error('The browser produced an empty video. Try 720p or another browser.');
    return {blob,filename:exportName(timeline.title,mode==='mp4'?'mp4':'webm'),frames:plan.frames,
      mode,elapsed:(performance.now()-start)/1000};
  } catch(error) {
    signal.throwIfAborted();
    if(error instanceof RangeError || error.name==='QuotaExceededError' || /out of memory|memory allocation|allocation failed/i.test(error.message)){
      throw new Error('Export ran out of memory. Close other tabs and try 720p, or split the story.');
    }
    throw error;
  } finally { view?.dispose(); }
}
