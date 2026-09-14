// Execute the actual import handler with isolated UI/parser spies; no user storage.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('components/BackupFileActions.tsx', 'utf8');
const limit = source.match(/const MAX_BACKUP_FILE_BYTES = [\d_]+;/)[0];
const handler = source.slice(source.indexOf('  async function readBackup('), source.indexOf('  async function restore('));
(async () => {
  for (const mode of ['normal', 'demo']) {
    for (const size of [9_999_999, 10_000_000, 10_000_001]) {
      let reads = 0, parses = 0, pending = 0, panel = null, message = '', busy = false;
      const saved = JSON.stringify({ mode, value: 'unchanged synthetic data' });
      const ctx = { running: {current: false}, setBusy(v) {busy=v;}, setMessage(v) {message=v;}, setPending(){pending++;}, setPanel(v){panel=v;}, parseShinromiiBackupJson() {parses++;return {ok:true,backup:{createdAt:'2026-09-14'},storage:{}};}, selected:{size,name:'old-backup.json',async text(){reads++;return '{}';}} };
      vm.createContext(ctx);
      await vm.runInContext(ts.transpileModule(limit + handler + '\nreadBackup(selected)', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, ctx);
      const allowed = size <= 10_000_000;
      assert.equal(reads, +allowed); assert.equal(parses, +allowed); assert.equal(pending, +allowed);
      assert.equal(panel, allowed ? 'restore' : null);
      if (!allowed) assert.match(message,/大きすぎる/);
      assert.equal(busy,false);assert.equal(ctx.running.current,false);
      assert.equal(saved,JSON.stringify({mode,value:'unchanged synthetic data'}));
    }
  }
  assert.doesNotMatch(handler,/saveStorage|setItem/);
  console.log('PASS: actual handler at <=10MB and >10MB boundaries; oversized file never read/parsed/staged; no storage writes; mode-independent guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
