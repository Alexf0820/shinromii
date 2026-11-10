const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
(async()=>{
 const listeners={},stores=new Map([['shinromii-v09923-static',new Map()],['other-app',new Map()]]);
 const key=r=>typeof r==='string'?new URL(r,'https://example.test').href:r.url;
 let offline=false,control='public, max-age=0',status=200,redirected=false,cacheFailure='',body='public shell';
 const current=()=>stores.get('shinromii-v106-static');
 const cache={async put(r,v){if(cacheFailure==='put')throw new Error('quota');current().set(key(r),v);},async match(r){return current().get(key(r));},async delete(r){if(cacheFailure==='delete')throw new Error('cache failure');current().delete(key(r));}};
 const caches={async open(n){if(cacheFailure==='open')throw new Error('unavailable');if(!stores.has(n))stores.set(n,new Map());return cache;},async keys(){return [...stores.keys()];},async delete(n){return stores.delete(n);}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,Response,caches,fetch:async()=>{if(offline)throw new Error('offline');const r=new Response(body,{status,headers:{'cache-control':control}});Object.defineProperty(r,'redirected',{value:redirected});return r;}});
 let done;listeners.install({waitUntil:p=>done=p});await done;listeners.activate({waitUntil:p=>done=p});await done;
 assert.equal(stores.has('shinromii-v09923-static'),false);assert.equal(stores.has('other-app'),true);
 async function request(path,{mode='navigate',headers={},method='GET'}={}) {
  let response;const tasks=[];
  listeners.fetch({request:{url:path.startsWith('https:')?path:'https://example.test'+path,method,mode,headers:new Headers(headers)},respondWith:p=>response=p,waitUntil:p=>tasks.push(p)});
  const result=await response;await Promise.all(tasks);return result;
 }
 for(const path of ['/admin','/admin/preview/setup','/api/feedback','/api/contact','/?adminKey=fake','/grades?_rsc=123','/unknown','https://other.test/grades']) {assert.equal(await request(path),undefined);offline=true;assert.equal(await request(path),undefined);offline=false;}
 for(const headers of [{rsc:'1'},{authorization:'Bearer fake'},{range:'bytes=0-100'},{'next-router-prefetch':'1'}])assert.equal(await request('/grades',{headers}),undefined);
 assert.equal(await request('/grades',{method:'POST'}),undefined);
 assert.equal((await request('/grades')).status,200);offline=true;assert.equal(await(await request('/grades')).text(),'public shell');offline=false;
 for(const policy of ['no-store','private, max-age=0']) {
  control='public';await request('/grades');assert.ok(current().has('https://example.test/grades'));
  control=policy;await request('/grades');assert.equal(current().has('https://example.test/grades'),false);
  offline=true;assert.equal((await request('/grades')).status,503);offline=false;
 }
 control='public';
 for(const path of ['/_next/static/test.js','/icon-192.png']) {await request(path,{mode:'cors'});offline=true;assert.equal((await request(path,{mode:'cors'})).status,200);offline=false;}
 offline=true;assert.equal((await request('/_next/static/missing.js',{mode:'cors'})).type,'error');offline=false;
 for(const change of ['status','redirect']) {
  await request('/grades');if(change==='status')status=503;else redirected=true;
  assert.equal((await request('/grades')).status,status);assert.equal(current().has('https://example.test/grades'),false);status=200;redirected=false;
 }
 for(const failure of ['put','delete','open']) {
  control='public';await request('/grades');cacheFailure=failure;body='fresh network';if(failure==='delete')control='no-store';
  assert.equal(await(await request('/grades')).text(),'fresh network');cacheFailure='';body='public shell';
 }
 console.log('PASS SW: all cache policy branches, real eviction, static offline cache/miss, cache open/put/delete failures preserve the fresh response');
})().catch(e=>{console.error(e);process.exitCode=1});
