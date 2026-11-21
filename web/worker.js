import {modules,toData,MAX_BYTES} from './format.js';
// File reading, validation and serialization stay off the UI thread.
self.onmessage=async({data:{file,text,project}})=>{
  try{
    if((file?.size??text?.length??0)>MAX_BYTES)throw Error('Maximum input is 32 MiB');
    const source=project?toData(project):JSON.parse(file?await file.text():text);
    const files=modules(source);
    self.postMessage({files:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,new Blob([v],{type:'text/plain'})]))});
  }catch(error){self.postMessage({error:error.message})}
};
