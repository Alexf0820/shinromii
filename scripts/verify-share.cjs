const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('lib/share-shinromii.ts', 'utf8');
const component = fs.readFileSync('components/ShareShinromii.tsx', 'utf8');
const api = {};
const navigator = {};
const forbidden = () => { throw new Error('Private data accessed'); };
const context = {exports:api, navigator, Error};
for (const key of ['localStorage','sessionStorage','indexedDB','location','fetch']) Object.defineProperty(context,key,{get:forbidden});
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
(async()=>{
 assert.equal(await api.shareShinromii(),'copy');
 let captured;
 navigator.share=async payload=>{captured=JSON.parse(JSON.stringify(payload));};
 assert.equal(await api.shareShinromii(),'shared');
 assert.deepEqual(captured,{
  title:'SHINROMii（シンロミー）',
  text:'高校・大学選びの情報をまとめて整理できる進路ノートです。\n気になったら、デモだけでも見てみてください。',
  url:'https://www.shinromii.com'
 });
 navigator.share=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});};
 assert.equal(await api.shareShinromii(),'cancelled');
 navigator.share=async()=>{throw new Error('denied');};
 assert.equal(await api.shareShinromii(),'copy');
 navigator.canShare=()=>false;
 navigator.share=()=>{throw new Error('must not call');};
 assert.equal(await api.shareShinromii(),'copy');
 assert.doesNotMatch(source+component,/localStorage|sessionStorage|indexedDB|fetch\(|location\.|shinromii-storage|backup/);
 console.log('PASS exact public payload, no private data access, share, cancel, unsupported/denied fallback');
})().catch(e=>{console.error(e);process.exitCode=1});

// Exercise the actual component's clipboard fallback with isolated React hooks.
(async()=>{
 const componentApi={}; const states=[]; const refs=[]; let si=0,ri=0; let copied;
 const react={useState(initial){const i=si++; if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=v];},useRef(initial){const i=ri++;return refs[i]??=( {current:initial} );}};
 const jsx=(type,props)=>({type,props});
 const nav={clipboard:{writeText:async text=>{copied=text;}}};
 vm.runInNewContext(ts.transpileModule(component,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:componentApi,navigator:nav,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:{SHINROMII_SHARE:api.SHINROMII_SHARE,shareShinromii:async()=> 'copy'}});
 const render=()=>{si=ri=0;return componentApi.ShareShinromii();};
 const nodes=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];
 let tree=render(); await nodes(tree).find(n=>n.type==='button').props.onClick();
 tree=render(); let copy=nodes(tree).find(n=>n.props?.children==='URLをコピー'); assert.ok(copy); await copy.props.onClick();
 assert.equal(copied,'https://www.shinromii.com');
 assert.ok(nodes(render()).some(n=>n.props?.children==='URLをコピーしました。'));
 nav.clipboard.writeText=async()=>{throw new Error('denied');}; await copy.props.onClick();
 assert.ok(nodes(render()).some(n=>n.type==='input'&&n.props.readOnly&&n.props.value==='https://www.shinromii.com'));
 assert.ok(nodes(render()).some(n=>n.props?.children==='下のURLを長押し、または選択してコピーしてください。'));
 console.log('PASS component fallback, exact clipboard URL, copy success and denied/manual-copy UI');
})().catch(e=>{console.error(e);process.exitCode=1});
