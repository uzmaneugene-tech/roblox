const formatTime = seconds => {
  const n=Math.max(0,Math.ceil(seconds));
  return n<60?n+'s':Math.floor(n/60)+'m '+String(n%60).padStart(2,'0')+'s';
};

export function connectVideoExport({ getTimeline, pauseStory }) {
  const $ = id=>document.getElementById('export-'+id);
  const start=$('start'), cancel=$('cancel'), status=$('status'), download=$('download'), progress=$('progress');
  let controller,url;
  cancel.onclick=()=>{ status.textContent='Cancelling…';cancel.disabled=true;controller?.abort(); };
  start.onclick=async ()=>{
    const timeline=getTimeline();
    if(!timeline?.scenes.length||controller)return;
    const offset=$('offset').valueAsNumber;
    if(!Number.isFinite(offset)||offset<0){status.textContent='Enter a nonnegative voiceover start offset.';return;}
    const file=$('voice').files[0],effects=$('effects').checked;
    if(file&&offset>=timeline.duration){status.textContent='The voiceover start must be before the story ends.';return;}
    pauseStory();
    if(url){URL.revokeObjectURL(url);url=undefined;}
    download.removeAttribute('href');download.hidden=true;
    progress.value=0;progress.hidden=false;
    cancel.hidden=false;cancel.disabled=false;start.disabled=true;
    const abort=new AbortController();controller=abort;
    status.textContent='Preparing local export…';
    let audioContext;
    try{
      if((file||effects)&&globalThis.AudioContext){
        audioContext=new AudioContext();
        // Resume within the click gesture for browsers that restrict recording audio.
        audioContext.resume().catch(()=>{});
      }
      const {exportStoryVideo}=await import('./export-video.js');
      let last=-1;
      const result=await exportStoryVideo(timeline,{height:Number($('size').value),file,offset,effects,signal:abort.signal,audioContext,
        onProgress({processed,total,eta,mode}){
          const percent=Math.min(99,Math.floor(100*processed/total));
          if(last===percent)return;last=percent;
          progress.value=percent;
          const label=mode==='mp4'?'MP4':mode==='webm'?'WebM · frame by frame':'WebM · live recorder fallback';
          status.textContent=processed===total?'Finishing '+label+'…':label+' · '+percent+'%'
            +(eta===null?'':' · about '+formatTime(eta)+' left');
        },
      });
      progress.value=100;
      url=URL.createObjectURL(result.blob);
      download.href=url;download.download=result.filename;download.hidden=false;
      status.textContent='Ready · '+(result.blob.size/1e6).toFixed(2)+' MB · '+formatTime(result.elapsed)
        +(result.mode==='webm-realtime'?' · recorder timing may vary':' · '+result.frames+' frames');
    }catch(error){
      progress.hidden=true;
      status.textContent=abort.signal.aborted?'Export cancelled.':error.message||'Video export failed. Try 720p.';
    }finally{
      if(audioContext)await audioContext.close().catch(()=>{});
      controller=null;start.disabled=false;cancel.hidden=true;
    }
  };
  return data=>{ $('panel').hidden=!data?.scenes.length; };
}
