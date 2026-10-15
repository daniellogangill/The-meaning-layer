'use strict';
(function () {
  const $=s=>document.querySelector(s);
  const API_BASE=['daniellogangill.github.io','designmythinking.xyz','www.designmythinking.xyz'].includes(window.location.hostname)?'https://meaning-layer-lab.vercel.app':'';

  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sourceData=null;
  let live=false;
  let mode='reason';
  let busy=false;
  const question=$('#question');
  const result=$('#result');
  const sample=document.querySelectorAll('[data-q]');
  const run=$('#runModel');
  const preview=$('#preview');

  function switchMode(next){
    mode=next;
    $('#modeReason').classList.toggle('active',mode==='reason');
    $('#modeDiscover').classList.toggle('active',mode==='discover');
    $('#modeReason').setAttribute('aria-pressed',String(mode==='reason'));
    $('#modeDiscover').setAttribute('aria-pressed',String(mode==='discover'));
    run.textContent=mode==='reason'?'Run live AI answer':'Run live AI discovery';
  }
  function loading(){
    result.innerHTML='<h3>Checking evidence…</h3><p>The workbench is processing the selected synthetic records.</p>';
  }
  function citations(items) {
    return (items||[]).map(item=>{
      const source=(sourceData?.records||[]).find(r=>r.id===item.id);
      return '<div class="evidence-row">'+
        '<div class="row"><span class="source-chip">'+esc(item.id)+'</span>'+
        '<span class="pill gray">'+esc(item.source||source?.source||'Source')+'</span>'+
        '<span class="pill gray">'+esc(item.site||source?.site||'Site')+'</span></div>'+
        '<p>'+esc(item.text||source?.text||'')+'</p></div>';
    }).join('');
  }
  function localEvidence(q) {
    if(!sourceData)return [];
    const words=(q.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>
      !['what','with','that','this','does','from','about','have','were','their',
        'your','would','could','june','where','they'].includes(w));
    const related=sourceData.records.map(r=>{
      const hay=(r.text+' '+r.title+' '+r.site+' '+r.function).toLowerCase();
      const termAliases=r.extraction.concepts.map(x=>sourceData.concepts
        .find(c=>c.id===x.id)?.name||'').join(' ').toLowerCase();
      const match=words.reduce((sum,w)=>sum+(hay.includes(w)||termAliases.includes(w)?1:0),0);
      return {r,score:match};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id));
    const used=new Set(),out=[];
    for(const x of related){
      if(used.has(x.r.thread))continue;
      used.add(x.r.thread);out.push(x.r);
      if(out.length===8)break;
    }
    return out;
  }
  async function previewEvidence(){
    const q=question.value.trim();
    if(q.length<8){result.innerHTML='<div class="ai-note warning">Enter a more specific question (at least 8 characters).</div>';return;}
    if(!sourceData){
      result.innerHTML='<div class="ai-note warning">The synthetic dataset could not be loaded, so evidence cannot be inspected.</div>';return;
    }
    const docs=localEvidence(q);
    const relatedConcepts=new Map();
    docs.forEach(r=>r.extraction.concepts.forEach(c=>{
      const concept=sourceData.concepts.find(item=>item.id===c.id);
      if(concept)relatedConcepts.set(concept.id,concept);
    }));
    let html='<span class="section-flag">LOCAL / DETERMINISTIC</span>'+
      '<h3 style="margin-top:15px">'+docs.length+' source threads found</h3>'+
      '<p class="ai-note">This is real search over the synthetic data, but NOT a model-generated answer. Terms below are candidates derived by lexical matching against the seed dictionary.</p>';
    if(relatedConcepts.size)html+='<h4>Business term candidates</h4><div class="trace">'+
      [...relatedConcepts.values()].slice(0,9).map(c=>'<span class="pill pink">'+esc(c.name)+' · '+esc(c.owner)+'</span>').join('')+'</div>';
    if(docs.length)html+='<h4 style="margin-top:14px">Inspect original evidence</h4>'+citations(docs);
    else html+='<div class="empty">No matching permitted evidence; try another question.</div>';
    result.innerHTML=html;
  }
  function modelRender(out){
    let html='<span class="section-flag">LIVE / EXPERIMENTAL MODEL</span>'+
      '<div class="ai-note warning" style="margin-top:12px">Model interpretation is unvalidated and must not be treated as governed truth.</div>';
    if(mode==='reason'){
      html+='<h3 style="margin-top:15px">Evidence-based interpretation</h3><p>'+esc(out.answer||'No answer returned.')+'</p>'+
        '<div class="trace"><span class="pill '+(out.status==='answered'?'green':'amber')+'">'+
        esc(out.status||'unknown')+'</span></div>';
      if(out.caveats?.length)html+='<h4>Uncertainty</h4><ul>'+out.caveats.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      if(out.next_steps?.length)html+='<h4>Suggested validation</h4><ul>'+out.next_steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    }else{
      html+='<h3 style="margin-top:15px">Proposed enterprise meanings</h3>'+
        '<p>'+esc(out.summary||'No proposals returned.')+'</p>';
      for(const p of out.proposals||[]){
        html+='<div class="prop-card"><span>UNAPPROVED MODEL PROPOSAL</span>'+
          '<h3>'+esc(p.term)+'</h3><p><strong>Scope:</strong> '+esc(p.scope)+'</p>'+
          '<p>'+esc(p.definition)+'</p><p><strong>Uncertainty:</strong> '+esc(p.uncertainty)+'</p>'+
          '<p class="micro">Supporting source IDs: '+esc((p.evidence_ids||[]).join(', '))+'</p></div>';
      }
      if(out.unresolved?.length)html+='<h4>Unresolved questions</h4><ul>'+
        out.unresolved.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      if(!out.proposals?.length)html+='<div class="notice amber">The model abstained from proposing meanings without adequate evidence.</div>';
    }
    if(out.evidence?.length)html+='<div class="ai-divider"></div><h4>Supporting source records</h4>'+citations(out.evidence);
    html+='<p class="micro">Model: '+esc(out.model||'unspecified')+
      '. This response comes from the live experimental gateway; the public question and permitted synthetic evidence were transmitted to the model. No personal or corporate source records are uploaded.</p>';
    result.innerHTML=html;
  }
  async function liveCall(){
    if(!live||busy)return;
    const q=question.value.trim();
    if(q.length<8||q.length>240){
      result.innerHTML='<div class="ai-note warning">Please enter a question between 8 and 240 characters.</div>';return;
    }
    busy=true;run.disabled=true;preview.disabled=true;loading();
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),25000);
      let res;
      try{
        res=await fetch(API_BASE+(mode==='reason'?'/api/meaning':'/api/discover'),{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({question:q}),signal:controller.signal
        });
      }finally{clearTimeout(timer);}
      const body=await res.json().catch(()=>({error:'Unusable response.'}));
      if(!res.ok)throw new Error(body.error||('Request failed with HTTP '+res.status));
      modelRender(body);
    }catch(err){
      result.innerHTML='<h3>Live model unavailable</h3><p class="danger">'+esc(err.message)+'</p>'+
        '<p class="ai-note">No unsupported AI answer will be shown. Local evidence inspection is still available.</p>';
    }finally{busy=false;run.disabled=!live;preview.disabled=false;}
  }
  async function load(){
    try{
      const response=await fetch('./data.json',{cache:'force-cache'});
      if(!response.ok)throw new Error('Synthetic data unavailable');
      sourceData=await response.json();
    }catch(_){sourceData=null;}
    try{
      const status=await fetch(API_BASE+'/api/status',{cache:'no-store'});
      if(!status.ok)throw new Error('No live gateway on this host');
      const info=await status.json();
      live=info.available===true;
      $('#statusText').textContent=live?'Model ready: '+(info.model||'lightweight LLM'):'Model offline · deterministic mode available';
      $('#apiChip').textContent=live?'Live AI available':'Deterministic mode';
      $('#statusDot').classList.toggle('live',live);
      run.disabled=!live;
      $('#guardMessage').textContent=live?
        'Each live question consumes a small share of a strict shared model budget. Answers and proposed definitions remain unvalidated.':
        'No model calls can be made until the provider hard limit and monthly budget controls are verified. Explore the dataset locally for free.';
    }catch(_){
      live=false;run.disabled=true;
      $('#apiChip').textContent='Live AI not connected';
      $('#statusText').textContent='Model offline · deterministic mode available';
      $('#guardMessage').textContent='This static demo does not have an enabled AI gateway. Explore the same synthetic source data for free.';
    }
  }
  sample.forEach(button=>button.addEventListener('click',()=>{
    question.value=button.dataset.q;question.focus();
  }));
  $('#modeReason').addEventListener('click',()=>switchMode('reason'));
  $('#modeDiscover').addEventListener('click',()=>switchMode('discover'));
  preview.addEventListener('click',previewEvidence);
  run.addEventListener('click',liveCall);
  switchMode('reason');
  load();
})();
