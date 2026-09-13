const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const source=fs.readFileSync('components/WelcomeGuide.tsx','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const key='SHINROMII::ui::welcomeVersion';
function mount(storage,allowAutomatic=true){
 const slots=[],events={},writes=[],api={};let cursor=0,dirty=false,tree,path='/',effects=[];
 const jsx=(type,props)=>({type,props});
 const effect=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j])){slots[i]=deps;effects.push(fn)}};
 const hooks={useId:()=> 'welcome',useRef(value){const i=cursor++;return slots[i]??={current:value}},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],v=>{if(v!==slots[i]){slots[i]=v;dirty=true}}]},useEffect:effect,useLayoutEffect:effect};
 const dialog={isConnected:true,open:false,showModal(){this.open=true}};
 vm.runInNewContext(compiled,{exports:api,Number,require:name=>name==='react'?hooks:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='next/navigation'?{usePathname:()=>path,useRouter:()=>({push:p=>{assert.equal(storage.get(key),'1');path=p}})}:{switchDemoMode(){assert.equal(storage.get(key),'1')}},window:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{writes.push(k);storage.set(k,v)}},addEventListener:(n,f)=>events[n]=f,removeEventListener(){}}});
 function render(){do{dirty=false;cursor=0;tree=api.WelcomeGuide({allowAutomatic});if(tree)tree.props.ref.current=dialog;else dialog.open=false;const jobs=effects;effects=[];jobs.forEach(f=>f())}while(dirty);return tree}
 const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
 render();return {visible:()=>!!tree&&dialog.open,close(){tree.props.onClose();render()},manual(){events['shinromii:open-welcome']();render()},click(text){nodes(tree).find(n=>n.type==='button'&&n.props.children===text).props.onClick();render()},writes};
}
const store=new Map([['private-notebook','unchanged']]);
let app=mount(store);assert.ok(app.visible(),'A initial normal');app.close();assert.equal(store.get(key),'1');
app=mount(store);assert.ok(!app.visible(),'B reload');
app=mount(store,false);assert.ok(!app.visible(),'C demo');app.manual();assert.ok(app.visible(),'D manual demo');app.close();assert.equal(app.writes.length,0);
app=mount(store);assert.ok(!app.visible(),'E return normal');app.manual();app.close();assert.equal(app.writes.length,0);
assert.ok(mount(new Map()).visible(),'F new storage');
for(const action of ['🎓 デモを見てみる','📖 使い方を見る','とりあえず閉じる']){const s=new Map();const a=mount(s);a.click(action);assert.equal(s.get(key),'1');assert.ok(!mount(s,false).visible());}
const unseenDemo=new Map();const demo=mount(unseenDemo,false);assert.ok(!demo.visible());demo.manual();demo.close();assert.equal(unseenDemo.size,0,'manual must not acknowledge unseen state');
assert.equal(store.get('private-notebook'),'unchanged');assert.doesNotMatch(source,/scopedStorageKey|sessionStorage|createPortal/);
const shell=fs.readFileSync('components/AppShell.tsx','utf8');assert.ok(shell.indexOf('if (!modeReady || switching)')<shell.indexOf('<WelcomeGuide'));
console.log('PASS A-F, all initial CTAs acknowledge before navigation, normal/demo shared UI key, manual no writes, notebook untouched, startup gate');
