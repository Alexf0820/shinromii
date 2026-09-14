// Synthetic files and mocked browser handoff only. Never touches user storage or network.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const delivery = {};
let shared = [], clicked = 0, removed = 0, revoked = 0, timer;
const nav = {share: async data => {shared.push(data);},canShare: data => data.files[0].name.endsWith('.json')};
const file = new File(['{"sample":true}'],'SHINROMii_Backup_2026-09-13_1800.json',{type:'application/json'});
const link = {click(){ clicked++; },remove(){removed++;}};
const source = fs.readFileSync('lib/backup-delivery.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports:delivery,navigator:nav,Error,URL:{createObjectURL(f){assert.equal(f,file);return 'blob:test';},revokeObjectURL(url){assert.equal(url,'blob:test');revoked++;}},document:{createElement(tag){assert.equal(tag,'a');return link;},body:{appendChild(){}}},window:{setTimeout(fn,delay){assert.equal(delay,60000);timer=fn;}}
});
(async()=>{
 // Same capability check for iPhone Safari and installed PWA; no standalone-specific assumptions.
 for(const mode of ['Safari','PWA']){
  assert.equal(delivery.canShareBackupFile(file,nav),true,mode);
  assert.equal(await delivery.shareBackupFile(file),'handed-off');
 }
 assert(shared.every(data=>Object.keys(data).join(',')==='files' && data.files[0]===file));
 assert.equal(delivery.canShareBackupFile(file,{}),false);
 assert.equal(delivery.canShareBackupFile(file,{...nav,canShare:()=>false}),false);
 assert.equal(delivery.canShareBackupFile(file,{...nav,canShare:()=>{throw Error();}}),false);
 nav.share=async()=>{throw Object.assign(new Error(),{name:'AbortError'});};
 assert.equal(await delivery.shareBackupFile(file),'cancelled');assert.equal(clicked,0,'Cancel must not trigger a download');
 nav.share=async()=>{throw new Error('blocked');};await assert.rejects(()=>delivery.shareBackupFile(file));assert.equal(clicked,0);
 delivery.downloadBackupFile(file);assert.equal(clicked,1);assert.equal(removed,1);assert.equal(link.download,file.name);assert.equal(revoked,0);timer();assert.equal(revoked,1);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB/);
 console.log('PASS: Safari/PWA capability paths, exact file-only handoff, cancel/error without automatic fallback, desktop download filename and URL cleanup, no network');
})().catch(e=>{console.error(e);process.exitCode=1;});
