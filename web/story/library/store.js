let built,dbPromise;
const directory=new URL('../../library/',import.meta.url);
async function local(name,format){
  const response=await fetch(new URL(name,directory));if(!response.ok)throw Error('Cannot load bundled library file '+name);
  return response[format]();
}
export function builtins(){
  return built??=(async()=>Promise.all((await local('catalog.json','json')).map(async item=>({...item,builtin:true,source:await local(item.name+'.js','text')}))))().catch(e=>{built=null;throw e});
}
function db(){
  return dbPromise??=new Promise((resolve,reject)=>{
    const r=indexedDB.open('framecut-library-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'name'});
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
}
async function transaction(mode,fn){
  const database=await db();return new Promise((resolve,reject)=>{
    const tx=database.transaction('items',mode);let req=fn(tx.objectStore('items'));tx.oncomplete=()=>resolve(req?.result);tx.onabort=tx.onerror=()=>reject(tx.error);
  });
}
export const customItems=()=>transaction('readonly',s=>s.getAll());
export const allItems=async()=>{
  const defaults=await builtins(),custom=await customItems(),names=new Set(custom.map(item=>item.name));
  return [...defaults.filter(item=>!names.has(item.name)),...custom];
};
export const saveItems=items=>transaction('readwrite',s=>{for(const item of items)s.put(item)});
export const removeItem=name=>transaction('readwrite',s=>s.delete(name));
export const sources=items=>{
  const unique=new Map();
  for(const item of items)unique.set(item.name,item);
  return [...unique.values()].map(({name,source})=>({name,source}));
};
