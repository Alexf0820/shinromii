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
let normal = runtime();
const fixture = normal.load('@/lib/shinromii-demo-sample').createDemoSample();
delete fixture.meta;
fixture.profile.displayName = '通常側の架空テスト';
normal.storage.saveShinromiiStorage(fixture);
normal.storage.loadShinromiiStorage(); // Existing normal maintenance, before the switch.
normal.storage.saveAiNotesSortOrder('oldest');
normal.storage.saveUniversitySortOrder('name');
const before = new Map(local);
normal.mode.switchDemoMode(true);
assert.equal(normal.mode.isDemoMode(), false, 'old document keeps original scope');
let demo = runtime();
assert.equal(demo.mode.isDemoMode(), true);
touched.length = 0;
let data = demo.storage.loadShinromiiStorage();
assert.equal(data.meta.isSample, true);
assert.equal(data.openCampusEvents.length, 3);
assert.equal(data.universityCandidates.length, 3);
assert.notEqual(data.profile.displayName, fixture.profile.displayName);
demo.storage.saveUserProfile({...data.profile, careerMemo: 'デモだけの編集'});
demo.storage.saveAiNotesSortOrder('helpful');
demo.storage.saveUniversitySortOrder('interest');
demo.storage.markResumeSetup();
demo.storage.clearResumeSetup();
assert.equal(demo.load('@/lib/shinromii-autosave').loadAutosaveHistory().length, 1);
assert(touched.every(key => key.endsWith('::demo')), 'demo must not read/write normal localStorage keys');
demo = runtime();
data = demo.storage.loadShinromiiStorage();
assert.equal(data.profile.careerMemo, 'デモだけの編集');
assert.equal(data.openCampusEvents.length, 3);
const exported = demo.backup.buildShinromiiBackup(data);
assert.equal(exported.data.meta.isSample, true);
const parsed = demo.backup.parseShinromiiBackupJson(JSON.stringify(exported));
assert.equal(parsed.ok, true);
demo.storage.saveShinromiiStorage(parsed.storage);
assert.equal(demo.storage.loadShinromiiStorage().openCampusEvents.length, 3);
const ordinaryBackup = normal.backup.buildShinromiiBackup(fixture);
assert.equal(demo.backup.parseShinromiiBackupJson(JSON.stringify(ordinaryBackup)).ok, false);
void demo.load('@/lib/shinromii-attachments').getAttachmentBlob('sample-only-test');
assert.equal(databases.at(-1), 'SHINROMII_ATTACHMENTS::demo');
demo.mode.switchDemoMode(false);
assert.equal(demo.mode.isDemoMode(), true, 'late demo callbacks stay in demo scope');
normal = runtime();
assert.equal(normal.mode.isDemoMode(), false);
assert.equal(normal.storage.loadShinromiiStorage().profile.displayName, '通常側の架空テスト');
assert.equal(normal.backup.parseShinromiiBackupJson(JSON.stringify(ordinaryBackup)).ok, true);
assert.equal(normal.storage.loadAiNotesSortOrder(), 'oldest');
assert.equal(normal.storage.loadUniversitySortOrder(), 'name');
for (const [key, value] of before) assert.equal(local.get(key), value, 'normal value changed: ' + key);
normal.mode.switchDemoMode(true);
demo = runtime();
assert.equal(demo.storage.loadShinromiiStorage().profile.careerMemo, 'デモだけの編集');
assert.equal(demo.storage.loadShinromiiStorage().openCampusEvents.length, 3);
// Another normal-mode tab remains independent of this tab's mode selection.
assert.equal(normal.mode.isDemoMode(), false);
console.log('PASS: switch, edit, reload, return, byte-for-byte normal preservation, re-enter, scoped history/sort/attachments, import/export and strict sample import guard');
