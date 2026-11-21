import {allItems,sources} from './library/store.js';
export async function execute(source,library) {
  try{library??=sources(await allItems());}catch(error){return {error:{message:error.message}};}
  return new Promise(resolve => {
    let worker;
    try {
      worker = new Worker(new URL('./runner-worker.js', import.meta.url), { type: 'module' });
    } catch {
      resolve({ error: { message: 'The browser could not start the Story Code worker.' } });
      return;
    }
    const settle = (result,terminate=true) => {
      clearTimeout(timer);
      if(terminate)worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => settle({ error: { message: 'Story Code worker timed out. Try again or simplify the script.' } }), 8000);
    worker.onmessage = ({ data }) => settle(data,false);
    worker.onerror = event => {
      event.preventDefault();
      settle({ error: { message: 'The Story Code worker failed to load. Reload and try again.' } });
    };
    worker.postMessage({source,library});
  });
}

