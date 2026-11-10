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
 // Exercise the real async UI handler: old results must not cross editor sessions.
 const ts=require('typescript'), vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
 const source=ts.createSourceFile('OpenCampusClient.tsx',fs.readFileSync(path.join(__dirname,'../app/open-campus/OpenCampusClient.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const functions=new Map();
 function visit(node) {if(ts.isFunctionDeclaration(node)&&node.name) functions.set(node.name.text,node.getText(source));ts.forEachChild(node,visit);}
 visit(source);
 for(const transition of ['same-editor','closeEventEditor','openEditEvent','openCreateEvent','openEvaluationChooser','openEvaluationEditor','queued-update']) {
  let resolveValidation, state=['existing'], writes=0, warnings=0, alerts=0, updater;
  const revision={current:0};
  const scope={attachmentEditorRevisionRef:revision,attachmentsAvailable:true,
   collectPendingAttachments:()=>new Promise(resolve=>{resolveValidation=resolve;}),
   setPendingAttachments(value){writes++;if(typeof value==='function') updater=value;else state=value;},
   setAttachmentWarning(){warnings++;},window:{alert(){alerts++;}},
   createEmptyEventForm:()=>({id:'new'}),createEmptyEvaluation:()=>({}),formFromEvent:event=>event,
   findEvaluationEntry:()=>null,findCampusEvaluator:()=>({id:'viewer'}),formFromEvaluation:()=>({})};
  // Setters unrelated to the attachment race need no React renderer.
  for(const name of ['setIsCreatingEvent','setCreateIntent','setPendingEvalInviteId','setEditingEventId','setEditingEvaluationTarget','setEvaluationChooserEventId','setNewEvaluatorName','setSelectedId','setPendingScrollId','setPendingEvaluationSectionScrollId','setPendingEditScrollId','setPendingEvalScrollId','setEventForm','setEvaluationForm','setRemovedAttachmentIds','setDirectAttachmentMessage']) scope[name]=()=>{};
  const context=vm.createContext(scope);
  function run(name,args=[]) {
   const js=ts.transpileModule(functions.get(name),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
   return vm.runInContext(`(${js})`,context)(...args);
  }
  const pending=run('handleAttachmentFiles',[[{name:'synthetic.pdf'}]]);
  if(!['same-editor','queued-update'].includes(transition)) {
   run(transition,[{id:'event-b'},'viewer']);
   assert.equal(revision.current,1,transition+' invalidates the previous editor');
   state=['new-editor']; writes=warnings=alerts=0;
  }
  resolveValidation({nextPending:['new-file'],warningMessage:'synthetic warning'});
  await pending;
  if(transition==='same-editor') {
   assert.equal(writes,1);assert.equal(warnings,1);assert.equal(alerts,1);
   assert.equal(JSON.stringify(updater(state)),JSON.stringify(['existing','new-file']));
  } else if(transition==='queued-update') {
   revision.current++;const changed=['new-editor'];assert.equal(updater(changed),changed);
  } else {assert.equal(writes,0);assert.equal(warnings,0);assert.equal(alerts,0);}
 }
 console.log('PASS attachment: MIME/extension/signature consistency, old generic MIME, HTML/SVG rejection, size bounds, IDB commit/abort');
})().catch(e=>{console.error(e);process.exitCode=1});
