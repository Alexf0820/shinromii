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
  const ctx = vm.createContext({structuredClone, CustomEvent: class CustomEvent {}, crypto: require('node:crypto').webcrypto, window: {
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
const S = app.storage;
const key = 'sample-high1-v1';
const template = app.load('@/lib/school-subject-templates').getSchoolSubjectsTemplate(key);
assert.equal(template.subjects.length, 14);
assert.deepEqual(Object.keys(template).sort(), ['course','grade','key','school','subjects','templateVersion','type'].sort());
const emptyBefore = new Map(local);
assert.equal(S.inspectSchoolTemplateTarget().hasGrades, false);
assert.deepEqual(local, emptyBefore, 'view/cancel must not save');
S.applySchoolSubjectsTemplate(key);
assert.equal(S.readSchoolSubjectSettings().subjects.length, 14);
assert.equal(S.shouldShowFirstSetup(), true, 'applying template must not skip onboarding');
assert.equal(S.readShinromiiStorageSnapshot().gradeRecords.length, 0);
app = runtime();
assert.equal(app.storage.readSchoolSubjectSettings().key, key);
app.storage.saveFirstSetupNotebook({...app.storage.createBlankShinromiiStorage(), setupCompleted:true});
assert.equal(app.storage.shouldShowFirstSetup(), false);
assert.equal(app.storage.readSchoolSubjectSettings().key, key);
const data = app.storage.readShinromiiStorageSnapshot();
const backup = app.backup.buildShinromiiBackup(data);
assert.equal(backup.backupVersion, 1); assert.equal(backup.storageVersion, 9);
const parsed = app.backup.parseShinromiiBackupJson(JSON.stringify(backup));
assert.equal(parsed.ok, true);
assert.equal(parsed.storage.schoolSubjects.key, key);
app.storage.saveShinromiiStorage(parsed.storage);
assert.equal(app.storage.readSchoolSubjectSettings().subjects.length, 14);
const plain = {...data}; delete plain.schoolSubjects;
assert.equal(app.backup.parseShinromiiBackupJson(JSON.stringify(app.backup.buildShinromiiBackup(plain))).ok, true);
const injected = {...template, profile: {displayName:'DO NOT COPY'}, subjects:['DO NOT COPY']};
assert(!JSON.stringify(app.load('@/lib/school-subject-templates').normalizeSchoolSubjectsTemplate(injected)).includes('DO NOT COPY'));
// Only synthetic grades. Must refuse without changing any bytes, including autosaves.
app.storage.saveShinromiiStorage({...data, gradeRecords:[{id:'synthetic-grade',schoolYear:'高1',term:'1学期',subject:'数学I',grade:3,memo:'',createdAt:'2026-09-11',updatedAt:'2026-09-11'}]});
const before = new Map(local);
assert.equal(app.storage.inspectSchoolTemplateTarget().hasGrades, true);
assert.throws(() => app.storage.applySchoolSubjectsTemplate(key));
assert.deepEqual(local, before);
app.mode.switchDemoMode(true);
app = runtime();
const demoBefore = new Map(local);
assert.throws(() => app.storage.applySchoolSubjectsTemplate(key));
assert.deepEqual(local, demoBefore);
assert.equal(app.storage.loadShinromiiStorage().openCampusEvents.length, 3);
console.log('PASS: public schema, 14 subjects, view/cancel no writes, apply/reload/onboarding, grade guard, demo guard, backup v1/storage v9 round trip, old backup compatibility, whitelist');
