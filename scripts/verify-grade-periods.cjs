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

let app = runtime();
const periods = app.load('@/lib/grade-periods');
const ref = app.load('@/lib/reference-grades');
const form = app.load('@/lib/grade-form');
const sample = app.load('@/lib/shinromii-demo-sample');
const row = (id, grade, term, periodId) => ({id, schoolYear:'高1', subject:'架空A', grade, term, ...(periodId ? {periodId} : {}), memo:'', createdAt:'2026-01-01', updatedAt:'2026-01-01'});
assert.equal(periods.normalizePeriodSystem(undefined), 'three-term');
assert.equal(periods.activePeriodIds('three-term').join(','),'period1,period2,period3,annual');
assert.equal(periods.activePeriodIds('two-term').join(','),'period1,period2,annual');
assert.equal(periods.gradePeriodLabel('period1','two-term'),'前期');
assert.equal(periods.gradePeriodLabel('period2','two-term'),'後期');
assert.equal(periods.gradePeriodLabel('annual'),'年間評定');
const rows = [row('one',2,'1学期'),row('two',4,'2学期','period2'),row('three',5,'3学期')];
const before=JSON.stringify(rows);
assert.equal(ref.summarizeReferenceGrades(rows,'three-term').annual[0].average,11/3);
const two=ref.summarizeReferenceGrades(rows,'two-term');
assert.equal(two.annual[0].average,3); assert.equal(two.latest.periodId,'period2');
assert.equal(two.periods.find(p=>p.periodId==='period3').count,0);
assert.equal(ref.summarizeReferenceGrades([...rows,row('end',1,'学年末','annual')],'two-term').annual[0].average,1);
assert.equal(JSON.stringify(rows),before);
assert.equal(ref.summarizeReferenceGrades([rows[0],row('duplicate',2,'1学期','period1')]).latest.count,1);
assert.equal(ref.summarizeReferenceGrades([rows[0],row('conflict',3,'1学期','period1')]).excluded,1);
const saved=form.buildGradeRecord({form:{...form.createEmptyGradeForm(),subject:'架空A',grade:4,term:'period2'},gradingMethod:'manual'});
assert.equal(saved.periodId,'period2'); assert.equal(saved.term,'2学期');
const normal=app.storage.createBlankShinromiiStorage();normal.gradeRecords=rows;
app.storage.saveShinromiiStorage(normal);
app.storage.saveGradePeriodSystem('two-term');
let loaded=app.storage.loadShinromiiStorage();
assert.equal(JSON.stringify(loaded.gradeRecords.map(r=>[r.id,r.term,r.periodId,r.grade])),JSON.stringify(rows.map(r=>[r.id,r.term,r.periodId,r.grade])));
assert.equal(loaded.gradePeriodSystem,'two-term');
let backup=app.backup.parseShinromiiBackupJson(JSON.stringify(app.backup.buildShinromiiBackup(loaded)));
assert.equal(backup.ok,true);assert.equal(backup.storage.gradePeriodSystem,'two-term');assert.equal(ref.summarizeReferenceGrades(backup.storage.gradeRecords,backup.storage.gradePeriodSystem).annual[0].average,3);
const old=app.backup.buildShinromiiBackup(normal);delete old.data.gradePeriodSystem;
assert.equal(app.backup.parseShinromiiBackupJson(JSON.stringify(old)).ok,true);
const normalRaw=local.get(app.storage.STORAGE_KEY);
// Upgrade an old built-in demo once without changing edited records or normal storage.
const oldDemo=sample.createDemoSample();oldDemo.gradeRecords=oldDemo.gradeRecords.filter(r=>r.periodId==='period1');delete oldDemo.meta.demoPeriodsVersion;
oldDemo.gradeRecords[0].grade=5;oldDemo.gradeRecords[0].memo='架空の編集';
local.set(app.mode.DEMO_STORAGE_KEY,JSON.stringify(oldDemo));app.mode.switchDemoMode(true);app=runtime();
let demo=app.storage.loadShinromiiStorage();assert.equal(demo.gradeRecords.length,28);assert.equal(demo.gradeRecords[0].grade,5);assert.equal(demo.gradeRecords[0].memo,'架空の編集');
app.storage.saveGradePeriodSystem('two-term');app=runtime();demo=app.storage.loadShinromiiStorage();assert.equal(demo.gradeRecords.length,28);assert.equal(demo.gradePeriodSystem,'two-term');
assert.equal(local.get(app.storage.STORAGE_KEY),normalRaw);
backup=app.backup.parseShinromiiBackupJson(JSON.stringify(app.backup.buildShinromiiBackup(demo)));assert.equal(backup.ok,true);assert.equal(backup.storage.meta.demoPeriodsVersion,2);assert.equal(backup.storage.meta.isSample,true);assert.equal(backup.storage.gradeRecords.length,28);
// Deletion after the one-time upgrade must not be automatically undone.
demo.gradeRecords.pop();app.storage.saveShinromiiStorage(demo);app=runtime();assert.equal(app.storage.loadShinromiiStorage().gradeRecords.length,27);
const fresh=sample.createDemoSample();const summary=ref.summarizeReferenceGrades(fresh.gradeRecords);
assert.equal(fresh.gradeRecords.length,28);assert.equal(summary.excluded,0);assert.equal(summary.periods.length,2);
assert.equal(ref.formatReferenceAverage(summary.periods.find(p=>p.periodId==='period1').average),'3.4');
assert.equal(ref.formatReferenceAverage(summary.periods.find(p=>p.periodId==='period2').average),'3.6');
assert.equal(ref.formatReferenceAverage(summary.annual[0].average),'3.5');
console.log('PASS: stable IDs, both systems, inactive period3 exclusion, annual priority/fallback, duplicate aliases, legacy records unchanged, backup v1/storage v9, two-term demo upgrade/edit/reload/isolation. Demo averages: 3.4 / 3.6 / annual 3.5');
