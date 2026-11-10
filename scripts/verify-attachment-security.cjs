const assert = require('node:assert/strict');
const {runtime} = require('./security-test-runtime.cjs');
(async()=>{
 const {validateAttachmentBlob:validate}=runtime().load('@/lib/attachment-validation');
 const cases=[['a.pdf','application/pdf',[37,80,68,70,45,49,46,55]],['a.jpg','image/jpeg',[255,216,255,224]],['a.png','image/png',[137,80,78,71,13,10,26,10]],['a.webp','image/webp',[82,73,70,70,12,0,0,0,87,69,66,80]]];
 for(const [name,type,bytes] of cases) {
  for(const mime of [type,'','application/octet-stream']) assert.equal((await validate(new Blob([new Uint8Array(bytes)],{type:mime}),name)).type,type);
  await assert.rejects(validate(new Blob([new Uint8Array(bytes)],{type:'text/html'}),name));
  await assert.rejects(validate(new Blob(['<html><script>1</script>']),name));
  await assert.rejects(validate(new Blob([new Uint8Array(bytes)],{type}),name+'.html'));
 }
 for(const name of ['a.constructor','a.__proto__','a.toString']) await assert.rejects(validate(new Blob([new Uint8Array(cases[3][2])]),name));
 await assert.rejects(validate(new Blob(['<svg/>'],{type:'image/svg+xml'}),'bad.png'));
 await assert.rejects(validate(new Blob([]),'empty.pdf'));
 await assert.rejects(validate(new Blob([new Uint8Array(20*1024*1024+1)]),'large.pdf'));
 // IDB request success is insufficient: callers must wait for commit and see a later abort.
 async function scenario(abort) {
  let tx, request, closed=0;
  const db={objectStoreNames:{contains:()=>true},close:()=>closed++,transaction(){
   tx={objectStore:()=>({put(){request={};queueMicrotask(()=>request.onsuccess());return request;}})};return tx;
  }};
  const app=runtime({window:{indexedDB:{open(){const open={};queueMicrotask(()=>{open.result=db;open.onsuccess();});return open;}},sessionStorage:{getItem:()=>null}}});
  const {saveAttachmentBlob}=app.load('@/lib/shinromii-attachments');
  let resolved=false;
  const pending=saveAttachmentBlob({id:'synthetic'}).then(()=>{resolved=true;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(resolved,false);
  if(abort) {tx.onabort();await assert.rejects(pending);} else {tx.oncomplete();await pending;assert.equal(resolved,true);}
  assert.equal(closed,1);
 }
 await scenario(false);await scenario(true);
 console.log('PASS attachment: MIME/extension/signature consistency, old generic MIME, HTML/SVG rejection, size bounds, IDB commit/abort');
})().catch(e=>{console.error(e);process.exitCode=1});
