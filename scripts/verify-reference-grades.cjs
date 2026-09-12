// Isolated, synthetic-data-only regression test; never opens a browser or real storage.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const local = new Map();
const session = new Map();
const touched = [];
const databases = [];
function runtime() {
  const cache = new Map();
  const wrap = (map, track = false) => ({
    getItem(key) { if (track) touched.push(key); return map.get(key) ?? null; },
    setItem(key, value) { if (track) touched.push(key); map.set(key, value); },
    removeItem(key) { if (track) touched.push(key); map.delete(key); },
  });
  const ctx = vm.createContext({CustomEvent: class CustomEvent {}, crypto: require('node:crypto').webcrypto, window: {
    dispatchEvent() {}, localStorage: wrap(local, true), sessionStorage: wrap(session), location: {replace(url) { assert.equal(url, '/'); }},
    indexedDB: { open(name) { databases.push(name); return {}; } },
  }});
  function load(name) {
    let file = path.join(root, name.replace(/^@\//, ''));
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports: {}};
    cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) { module.exports = JSON.parse(source); return module.exports; }
    const js = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true}}).outputText;
    vm.runInContext('(function(require,module,exports){' + js + '\n})', ctx)(load, module, module.exports);
    return module.exports;
  }
  return {load, mode: load('@/lib/shinromii-demo-mode'), storage: load('@/lib/shinromii-storage'), backup: load('@/lib/shinromii-backup')};
}

const app=runtime(), ref=app.load('@/lib/reference-grades'), form=app.load('@/lib/grade-form');
let id=0;
const row=(subject,grade,term='1学期',schoolYear='高1')=>({id:`test-${++id}`,schoolYear,term,subject,grade,memo:'',createdAt:'2026-09-12',updatedAt:'2026-09-12'});
const summarize=ref.summarizeReferenceGrades;
const invalid=[null,undefined,'',0,6,-1,'5',2.5,NaN,Infinity];
const input=[row('有効A',5),row('有効B',1),...invalid.map((v,i)=>row(`無効${i}`,v))];
assert.equal(summarize(input).latest.average,3);assert.equal(summarize(input).latest.count,2);
assert.equal(summarize(input).excluded,10);
assert.equal(summarize([row('A',5),row('B',1),row(' A ',5)]).latest.average,3);
const conflict=summarize([row('A',5),row('A',1),row('B',4)]);
assert.equal(conflict.latest.average,4);assert.equal(conflict.excluded,1);assert.equal(conflict.latest.conflicts,1);
const annual=summarize([row('A',1),row('A',3,'2学期'),row('A',5,'学年末'),row('B',2),row('B',4,'2学期')]);
assert.equal(annual.annual[0].average,4);assert.equal(annual.annual[0].count,2);assert.equal(annual.annual[0].supplemented,1);
assert.equal(summarize([row('A',4),row('A',null,'学年末')]).annual[0].average,4);
assert.equal(summarize([row('A',4),row('A',5,'学年末'),row('A',3,'学年末')]).annual[0].average,null);
assert.equal(summarize([row('A',4,'1学期','高1'),row('A',2,'1学期','高2')]).annual.length,2);
assert.equal(ref.formatReferenceAverage(null),'—');
const empty=form.createEmptyGradeForm();assert.equal(empty.grade,'');
assert.equal(form.buildGradeRecord({form:{...empty,subject:'A'},gradingMethod:'manual'}),null);
const selected={...empty,subject:'A',grade:5};
const scored=form.applyGradeScoreInput(selected,'finalScore','20','school-rule-a');assert.equal(scored.grade,5);
assert.equal(form.buildGradeRecord({form:scored,gradingMethod:'manual'}).grade,5);
assert.equal(form.buildGradeRecord({form:scored,gradingMethod:'school-rule-a'}).grade,5);
const notebook=app.storage.createBlankShinromiiStorage();notebook.gradeRecords=[row('A',null),row('B',4),row('B',2)];
const before=JSON.stringify(notebook);
summarize(notebook.gradeRecords);assert.equal(JSON.stringify(notebook),before);
const parsed=app.backup.parseShinromiiBackupJson(JSON.stringify(app.backup.buildShinromiiBackup(notebook)));
assert.equal(parsed.ok,true);assert.equal(parsed.storage.gradeRecords.length,3);assert.equal(parsed.storage.gradeRecords[0].grade,null);
assert.equal(summarize(parsed.storage.gradeRecords).excluded,2);
for(const f of ['app/HomeClient.tsx','app/grades/GradesClient.tsx']) {
 const source=fs.readFileSync(path.join(root,f),'utf8');assert(source.includes('summarizeReferenceGrades('));assert(!source.includes('function average('));
}
console.log('PASS: invalid/null excluded; identical/conflicting duplicates; annual priority/no double count; invalid year-end guard; past years; no mutation; blank/manual/score input; backup round trip; shared page aggregation');
