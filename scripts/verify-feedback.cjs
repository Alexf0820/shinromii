const assert = require('node:assert/strict');
const fs = require('node:fs');
const {runtime} = require('./security-test-runtime.cjs');
(async()=>{
 let sends=0;
 for(let instance=0;instance<2;instance++) {
  const route=runtime({fetch:async()=>{sends++;throw new Error('must not send');}}).load('@/app/api/feedback/route');
  const availability=await route.GET();assert.equal(availability.headers.get('cache-control'),'no-store');assert.equal((await availability.json()).available,false);
  for(let i=0;i<3;i++) assert.equal((await route.POST()).status,410);
 }
 assert.equal(sends,0);
 const component=fs.readFileSync('components/BetaFeedback.tsx','utf8');
 assert.match(component,/href="\/contact"/);assert.doesNotMatch(component,/fetch\(|localStorage|indexedDB|shinromii-storage|mailto:/);
 console.log('PASS feedback: retired relay never sends across instances; feedback uses shared contact flow; no notebook data access');
})().catch(e=>{console.error(e);process.exitCode=1});
