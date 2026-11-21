export const EXPORT_FPS = 30;
export const MAX_OUTPUT_BYTES = 192 * 1024 * 1024;

export function exportPlan(seconds, height) {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error('Export a story between 0 and 600 seconds.');
  if (height !== 1280 && height !== 1920) throw new Error('Choose 1080p or 720p.');
  const frames = Math.max(1, Math.ceil(seconds * EXPORT_FPS - 1e-8));
  const bitrate = height === 1920 ? 5_000_000 : 2_600_000;
  if ((bitrate + 96_000) * (frames / EXPORT_FPS) / 8 > MAX_OUTPUT_BYTES) {
    throw new Error('This export may run out of memory. Choose 720p or split the story into shorter parts.');
  }
  return { width: height * 9 / 16, height, frames, bitrate, duration: frames / EXPORT_FPS };
}

export function frameTime(index) {
  return index / EXPORT_FPS;
}

export function exportName(title, extension) {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim().slice(0, 130).replace(/[. ]+$/,'');
  return (clean || 'Framecut story') + '.' + extension;
}

export async function encodeTimelineFrames(plan, { draw, encode, tick, signal, yieldTask }) {
  for (let i=0;i<plan.frames;i++) {
    signal.throwIfAborted();
    draw(i);
    await encode(frameTime(i),1/EXPORT_FPS);
    tick(i+1);
    if(i%4===0)await yieldTask();
  }
}
