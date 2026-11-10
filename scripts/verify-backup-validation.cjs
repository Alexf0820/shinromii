const assert = require('node:assert/strict');
const { runtime } = require('./security-test-runtime.cjs');
const memory = new Map(); let writes = 0;
const {load} = runtime({ window: {localStorage: {getItem:k=>memory.get(k)??null,setItem:(k,v)=>{ writes++;memory.set(k,v); }},sessionStorage:{getItem:()=>null},dispatchEvent(){}}, CustomEvent: class{} });
const {buildShinromiiBackup, parseShinromiiBackupJson:parse} = load('@/lib/shinromii-backup');
const {createDemoSample} = load('@/lib/shinromii-demo-sample');
const sample = buildShinromiiBackup(createDemoSample());
function check(change, ok=false) { const data=structuredClone(sample);change(data);assert.equal(parse(JSON.stringify(data)).ok,ok); }
check(()=>{},true);
for (const version of [4,5,6,7,8,9]) check(b=> { b.storageVersion=version;b.data.version=version;delete b.data.identity;delete b.data.profile;delete b.data.campusEvaluators;delete b.data.gradePeriodSystem;delete b.data.schoolSubjects;for (const r of b.data.gradeRecords) {delete r.periodId;r.scores=[80,90];}},true);
for (const version of [0,-1,9.5,999]) check(b=>{b.storageVersion=version;b.data.version=version;});
check(b=>b.storageVersion=8);check(b=>b.createdAt='invalid');
check(b=>b.data.gradeRecords[0].subject={bad:true});
check(b=>b.data.universityCandidates[0].reason={bad:true});
for (const key of ['gradeRecords','qualifications','universityCandidates','aiNotes','openCampusEvents']) {check(b=>b.data[key].push(null));check(b=>b.data[key].push(b.data[key][0]));}
check(b=>b.data.openCampusEvents[0].links=[{id:'bad',label:'x',url:{bad:true},createdAt:'',updatedAt:''}]);
check(b=>b.data.openCampusEvents[0].attachments=[{id:'bad',ocId:'different',name:'a.pdf',mimeType:'application/pdf',size:5,createdAt:''}]);
check(b=>b.data.campusEvaluations=[]);check(b=>b.data.profile.displayName={bad:true});check(b=>b.data.identity.users=[null]);
check(b=>b.data.gradeRecords[0].memo='x'.repeat(200001));
check(b=>Object.defineProperty(b.data,'__proto__',{value:{polluted:true},enumerable:true}));
// Preserve invalid numeric grades: old data remains visible, excluded by the established calculation.
check(b=>b.data.gradeRecords[0].grade=9,true);
// A valid large export must not be blocked by the traversal budget below the 10MB file cap.
const large=structuredClone(sample);large.data.gradeRecords=Array.from({length:20000},(_,i)=>({...sample.data.gradeRecords[0],id:`large-${i}`,memo:'',scores:{midterm:80,final:90}}));
const compact=JSON.stringify(large);assert.ok(Buffer.byteLength(compact)<=10000000);assert.equal(parse(compact).ok,true);
const validator=load('@/lib/backup-validation').validateBackupStorage;
assert.equal(validator(sample.data,9),true);
const poisoned=JSON.parse(JSON.stringify(sample.data));Object.defineProperty(poisoned,'__proto__',{value:{polluted:true},enumerable:true});
assert.equal(validator(poisoned,9),false);delete poisoned.__proto__;
const parsed=parse(JSON.stringify(sample));assert.equal(parsed.ok,true);
assert.equal(JSON.stringify(parsed.storage.gradeRecords),JSON.stringify(sample.data.gradeRecords));
assert.equal(writes,0);assert.equal(memory.size,0);
console.log('PASS backup: valid/legacy round trips, field types, future/mismatched versions, duplicate IDs, attachment references, nesting/string bounds; no writes');
