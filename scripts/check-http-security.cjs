// Run after npm run build. Synthetic admin key; no contact submissions or real user data.
const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3198'],{env:{...process.env,SHINROMII_ADMIN_PREVIEW_KEY:'synthetic-http-only'},stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
(async()=>{
 const base='http://127.0.0.1:3198';let ready=false;
 for(let i=0;i<60;i++){try {if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw new Error('Local server unavailable: '+log);
 const page=await fetch(base);assert.match(await page.text(),/Ver\.1\.06/);
 for(const [key,value] of [['x-frame-options','DENY'],['x-content-type-options','nosniff'],['referrer-policy','no-referrer']])assert.equal(page.headers.get(key),value);
 assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.match(page.headers.get('content-security-policy'),/script-src-attr 'none'/);
 for(const path of ['/admin','/admin/preview/setup','/admin/access','/api/feedback','/sw.js']) {
  const result=await fetch(base+path,{redirect:'manual'});assert.match(result.headers.get('cache-control'),/no-store/);
 }
 const denied=await fetch(base+'/admin');const deniedHtml=await denied.text();assert.ok(deniedHtml.includes('NEXT_REDIRECT'));assert.ok(!deniedHtml.includes('AdminClient'));
 const old=await fetch(base+'/admin/access?adminKey=synthetic-http-only');assert.ok(!old.url.includes('adminKey'));assert.ok(!(await old.text()).includes('synthetic-http-only'));
 assert.equal((await fetch(base+'/api/feedback',{method:'POST'})).status,410);
 const session=await fetch(base+'/admin/access/session',{method:'POST',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:'key=synthetic-http-only',redirect:'manual'});
 assert.equal(session.status,303);assert.equal(session.headers.get('location'),base+'/admin');assert.ok(session.headers.get('set-cookie').includes('HttpOnly'));
 const authorized=await fetch(base+'/admin',{headers:{cookie:session.headers.get('set-cookie').split(';')[0]}});assert.equal(authorized.status,200);const html=await authorized.text();assert.ok(html.includes('AdminClient'));assert.ok(!html.includes('NEXT_REDIRECT'));
 console.log('PASS HTTP: actual Next build/version, security headers, no-store admin/API/SW, old URL key scrubbing, disabled relay, POST admin cookie');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill('SIGTERM'));
