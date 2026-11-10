const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
(async()=>{
 const listeners={},stores=new Map([['shinromii-v09923-static',new Map()],['other-app',new Map()]]);
 const key=r=>typeof r==='string'?new URL(r,'https://example.test').href:r.url;
 let offline=false,control='public, max-age=0';
 const cache={async put(r,v){stores.get('shinromii-v106-static').set(key(r),v);},async match(r){return stores.get('shinromii-v106-static').get(key(r));},async delete(r){stores.get('shinromii-v106-static').delete(key(r));}};
 const caches={async open(n){if(!stores.has(n))stores.set(n,new Map());return cache;},async keys(){return [...stores.keys()];},async delete(n){return stores.delete(n);}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,Response,caches,fetch:async()=>{if(offline)throw new Error('offline');return new Response('public shell',{headers:{'cache-control':control}});}});
 let done;listeners.install({waitUntil:p=>done=p});await done;listeners.activate({waitUntil:p=>done=p});await done;
 assert.equal(stores.has('shinromii-v09923-static'),false);assert.equal(stores.has('other-app'),true);
 async function request(path,{mode='navigate',headers={},method='GET'}={}) {
  let response;listeners.fetch({request:{url:'https://example.test'+path,method,mode,headers:new Headers(headers)},respondWith:p=>response=p,waitUntil:()=>{}});return response;
 }
 for(const path of ['/admin','/admin/preview/setup','/api/feedback','/api/contact','/?adminKey=fake','/grades?_rsc=123','/unknown']) {assert.equal(await request(path),undefined);offline=true;assert.equal(await request(path),undefined);offline=false;}
 assert.equal(await request('/grades',{headers:{rsc:'1'}}),undefined);assert.equal(await request('/grades',{headers:{authorization:'Bearer fake'}}),undefined);
 assert.equal((await request('/grades')).status,200);offline=true;assert.equal(await(await request('/grades')).text(),'public shell');offline=false;
 for(const policy of ['no-store','private, max-age=0']) {control=policy;await request('/grades');offline=true;assert.equal((await request('/grades')).status,503);offline=false;}
 assert.equal([...stores.get('shinromii-v106-static').keys()].some(k=>k.includes('/admin')||k.includes('/api')||k.includes('?')),false);
 console.log('PASS SW: admin/API/query/RSC/auth bypass, old app-cache removal only, public offline shell, no-store/private eviction');
})().catch(e=>{console.error(e);process.exitCode=1});
