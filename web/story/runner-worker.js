import { runStory } from './sandbox.js';

self.onmessage = async ({ data }) => {
  try {
    self.postMessage(await runStory(data));
  } catch {
    self.postMessage({ error: { message: 'The Story Code engine could not start. Reload and try again.' } });
  }
};
