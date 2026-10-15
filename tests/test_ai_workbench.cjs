'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'lab/ai.html'),'utf8');
const script=fs.readFileSync(path.join(root,'lab/ai.js'),'utf8');
const dataset=JSON.parse(fs.readFileSync(path.join(root,'lab/data.json'),'utf8'));

async function openWorkbench(enabled=false,pageUrl='https://example.test/lab/ai.html'){
  const dom=new JSDOM(html,{url:pageUrl,
    runScripts:'outside-only',pretendToBeVisual:true});
  const apiBase=['daniellogangill.github.io','designmythinking.xyz','www.designmythinking.xyz'].includes(new URL(pageUrl).hostname)?'https://meaning-layer-lab.vercel.app':'';
  const calls=[];
  const errors=[];
  const w=dom.window;const d=w.document;
  w.addEventListener('error',e=>errors.push(e.message));
  w.fetch=async(url,init)=>{
    calls.push({url,init});
    if(url==='./data.json')return {ok:true,json:async()=>dataset};
    if(url===apiBase+'/api/status')return {ok:true,json:async()=>({available:enabled,model:'gpt-5.6-luna'})};
    if(url===apiBase+'/api/meaning')return {ok:true,json:async()=>({
      status:'answered',answer:'Synthetic evidence points to different measurement boundaries.',
      caveats:['Awaiting source steward validation'],next_steps:['Verify June dispatch'],
      citations:['PN-01'],evidence:[dataset.records.find(r=>r.id==='PN-01')],
      model:'gpt-5.6-luna'
    })};
    if(url===apiBase+'/api/discover')return {ok:true,json:async()=>({
      summary:'Potential scope-specific interpretations',status:'unapproved',
      proposals:[{term:'Mined tonnes',definition:'Extracted before processing',
        scope:'Operations',evidence_ids:['PN-01'],uncertainty:'Check site policy'}],
      unresolved:['Validate with Operations'],
      evidence:[dataset.records.find(r=>r.id==='PN-01')],model:'gpt-5.6-luna'
    })};
    throw new Error('Unexpected URL '+url);
  };
  w.eval(script);
  await new Promise(done=>setTimeout(done,15));
  return {dom,w,d,calls,errors};
}
test('static workbench stays interactive without any enabled model',async()=>{
  const {dom,d,calls,errors}=await openWorkbench(false);
  assert.equal(d.querySelector('#runModel').disabled,true);
  d.querySelector('#preview').click();
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.match(d.querySelector('#result').textContent,/source threads found/);
  assert.match(d.querySelector('#result').textContent,/NOT a model-generated answer/);
  assert.equal(calls.filter(x=>String(x.url).startsWith('/api/')&&x.url!=='/api/status').length,0);
  assert.deepEqual(errors,[]);
  dom.window.close();
});
test('live reasoning uses only server returned source citations',async()=>{
  const {dom,d,calls,errors}=await openWorkbench(true);
  assert.equal(d.querySelector('#runModel').disabled,false);
  d.querySelector('#runModel').click();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.match(d.querySelector('#result').textContent,/Synthetic evidence points/);
  assert.match(d.querySelector('#result').textContent,/PN-01/);
  assert.equal(calls.filter(x=>x.url==='/api/meaning').length,1);
  assert.deepEqual(errors,[]);
  dom.window.close();
});
test('live discovery visibly identifies proposals as unapproved',async()=>{
  const {dom,d,calls,errors}=await openWorkbench(true);
  d.querySelector('#modeDiscover').click();
  d.querySelector('#runModel').click();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.match(d.querySelector('#result').textContent,/UNAPPROVED MODEL PROPOSAL/);
  assert.match(d.querySelector('#result').textContent,/Mined tonnes/);
  assert.equal(calls.filter(x=>x.url==='/api/discover').length,1);
  assert.deepEqual(errors,[]);
  dom.window.close();
});

test('static-host routing uses the dedicated gateway without changing local fallback',async()=>{
  const gateway='https://meaning-layer-lab.vercel.app';
  const hosts=[
    'https://daniellogangill.github.io/The-meaning-layer/lab/ai.html',
    'https://designmythinking.xyz/prototypes/meaning-layer/lab/ai.html',
    'https://www.designmythinking.xyz/prototypes/meaning-layer/lab/ai.html'
  ];
  for(const host of hosts){
    const offline=await openWorkbench(false,host);
    assert.ok(offline.calls.some(x=>x.url===gateway+'/api/status'));
    assert.equal(offline.d.querySelector('#runModel').disabled,true);
    offline.d.querySelector('#preview').click();
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.match(offline.d.querySelector('#result').textContent,/NOT a model-generated answer/);
    assert.equal(offline.calls.filter(x=>String(x.url).startsWith(gateway+'/api/')&&x.url!==gateway+'/api/status').length,0);
    assert.deepEqual(offline.errors,[]);
    offline.dom.window.close();

    const live=await openWorkbench(true,host);
    assert.equal(live.d.querySelector('#runModel').disabled,false);
    live.d.querySelector('#runModel').click();
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(live.calls.filter(x=>x.url===gateway+'/api/meaning').length,1);
    live.d.querySelector('#modeDiscover').click();
    live.d.querySelector('#runModel').click();
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(live.calls.filter(x=>x.url===gateway+'/api/discover').length,1);
    assert.match(live.d.querySelector('#result').textContent,/UNAPPROVED MODEL PROPOSAL/);
    assert.deepEqual(live.errors,[]);
    live.dom.window.close();
  }
});
