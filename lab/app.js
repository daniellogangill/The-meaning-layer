/* Meaning Layer Lab v2. A local interactive explorer over a reproducible synthetic
   snapshot. This is NOT an LLM service. Review decisions are local browser state. */
(function () {
  'use strict';
  const STOP = new Set('why what how can the and for from with have into this that are were has does did dids who when where about which during between their there have ours your ours below above june report records data meaning'.split(' '));
  const VIEWS = [
    ['executive','◈','Executive intelligence'],['sources','▤','Source explorer'],
    ['terms','⌘','Meaning studio'],['graph','◎','Knowledge graph'],
    ['conflicts','⚖','Conflict lab'],['stewards','✓','Steward review'],
    ['pipeline','◷','Pipeline & tests']
  ];
  let data = null;
  const state = { view:'executive', question:'production', answer:'governed', doc:null,
    sourceSearch:'', sourceSite:'all', sourceFunction:'all', sourceSystem:'all', sourcePage:0,
    term:null, graphSite:'Pilbara North', conflictFilter:'all', customQuery:'',
    reviewFilter:'all', stage:4, selectedConflict:null };
  let decisions = {};
  try { decisions = JSON.parse(localStorage.getItem('meaning-lab-decisions-v2') || '{}'); }
  catch (_) { decisions = {}; }
  const $ = (sel) => document.querySelector(sel);
  const esc = (val) => String(val == null ? '' : val).replace(/[&<>"']/g, (c) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique = (arr) => [...new Set(arr)];
  const fmt = (n) => Number(n || 0).toLocaleString('en-AU');
  const termById = (id) => data.concepts.find(c => c.id === id);
  const recordById = (id) => data.records.find(r => r.id === id);
  const decisionFor = (id) => decisions[id] || 'pending';
  const currentQuestion = () => data.questions.find(q => q.id === state.question) || data.questions[0];
  function badge(label, style) { return '<span class="pill ' + esc(style || 'gray') + '">' + esc(label) + '</span>'; }
  function docLink(id, label) {
    return '<button type="button" class="source-chip" data-action="doc" data-id="' + esc(id) + '">' + esc(label || id) + ' ↗</button>';
  }
  function countTerm(id, site) {
    return data.records.filter(r => (!site || r.site === site) &&
      r.extraction.concepts.some(c => c.id === id)).length;
  }
  function tokens(s) { return unique(String(s).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).filter(t => !STOP.has(t)); }
  function rankRecord(r, words, intents) {
    const hay = (r.text + ' ' + r.title + ' ' + r.function + ' ' + r.source).toLowerCase();
    const matched = words.reduce((sum,w) => sum + (hay.includes(w) ? 1 : 0), 0);
    const matchConcepts = r.extraction.concepts.filter(c => intents.includes(c.id)).length;
    const siteBonus = r.site === 'Pilbara North' ? 1 : 0;
    return matched + matchConcepts * 5 + siteBonus;
  }
  function evidenceFor(q, limit) {
    const words = tokens(q.ask);
    const candidates = data.records
      .map(r => ({r, score:rankRecord(r,words,q.intent)}))
      .filter(x => x.score > 2 && x.r.site === 'Pilbara North')
      .sort((a,b) => b.score - a.score || a.r.id.localeCompare(b.r.id));
    const seen = new Set(); const selected=[];
    for (const x of candidates) {
      if (!seen.has(x.r.thread)) {seen.add(x.r.thread);selected.push(x.r);}
      if (selected.length >= limit) break;
    }
    return selected;
  }
  function rawSearch(q) {
    const words=tokens(q);
    if (!words.length) return [];
    return data.records.map(r => {
      const hay=(r.text+' '+r.title+' '+r.function+' '+r.source+' '+
        r.extraction.concepts.map(c => (termById(c.id)||{}).name || '').join(' ')).toLowerCase();
      return {r,score:words.reduce((sum,w)=>sum+(hay.includes(w)?1:0),0)};
    }).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,15).map(x=>x.r);
  }
  function render() {
    if (!data) return;
    document.querySelectorAll('[data-view]').forEach(b => {
      b.classList.toggle('active',b.dataset.view === state.view);
      b.setAttribute('aria-current',b.dataset.view === state.view ? 'page' : 'false');
    });
    const current=VIEWS.find(v=>v[0]===state.view);
    $('#crumb').innerHTML='<b>Redgum Resources</b> / '+esc(current ? current[2] : 'Lab');
    const views={
      executive:renderExecutive,sources:renderSources,terms:renderTerms,
      graph:renderGraph,conflicts:renderConflicts,stewards:renderStewards,pipeline:renderPipeline
    };
    $('#content').innerHTML=views[state.view]();
    if (state.view==='graph') drawGraph();
  }
  function go(view) {
    state.view=view; render();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function summaryCards() {
    return '<div class="stat-grid">'+[
      [fmt(data.stats.records),'Public synthetic source records'],
      [fmt(data.stats.candidate_links),'Concept mentions extracted'],
      [fmt(data.concepts.length),'Seed dictionary concepts'],
      [fmt(data.stats.restricted_withheld),'Restricted bodies withheld']
    ].map(c=>'<div class="stat"><div class="value">'+c[0]+'</div><div class="caption">'+c[1]+'</div></div>').join('')+'</div>';
  }
  function hero() {
    return '<div class="hero"><div><span class="eyebrow">THE ENTERPRISE MEANING EXPERIMENT / V2</span>'+
      '<h1>From enterprise mess<br>to meaningful decisions<span style="color:var(--hot)">.</span></h1>'+
      '<p class="lead">Explore a fictional resources company as if you were its AI transformation lead. Inspect raw evidence, resolve business language, follow relationships and decide what a governed AI can responsibly say.</p>'+
      '<div class="row"><button class="btn primary" data-action="stage-next">Walk the discovery process →</button>'+
      '<button class="btn quiet" data-view="graph">Explore the knowledge graph ↗</button></div></div>'+
      '<div class="hero-art" aria-hidden="true"><div class="orb"></div><svg viewBox="0 0 430 240" preserveAspectRatio="xMidYMid meet">'+
      '<g stroke="#fc80b0" stroke-width="1" opacity=".5"><path d="M75 55 L204 116 L330 50 M92 184 L204 116 L341 186 M330 50 L341 186 M75 55 L92 184" fill="none"/></g>'+
      '<g fill="#111825" stroke="#7a91a1"><circle cx="75" cy="55" r="18"/><circle cx="330" cy="50" r="15"/><circle cx="92" cy="184" r="17"/><circle cx="341" cy="186" r="20"/></g>'+
      '<circle cx="204" cy="116" r="49" fill="#301a2c" stroke="#ff82b7" stroke-width="2"/>'+
      '<circle cx="204" cy="116" r="64" fill="none" stroke="#fc72a8" opacity=".3" stroke-dasharray="5 9"/>'+
      '<g fill="#ff9cbd"><circle cx="75" cy="55" r="4"/><circle cx="330" cy="50" r="4"/><circle cx="92" cy="184" r="4"/><circle cx="341" cy="186" r="4"/></g></svg>'+
      '<div class="center-word">GOVERNED <small>MEANING</small></div></div></div>';
  }
  const stepData=[
    ['Discover sources','Find the documents, emails and systems contributing evidence.','Source classification and source provenance are attached to each record.'],
    ['Read the language','Identify candidate business concepts from raw evidence.','A lexical candidate extractor scans observed text; terms are not automatically approved.'],
    ['Reconcile contexts','Distinguish scope differences from actual contradictions.','Compare mined versus saleable production, accounting bases, timestamps and source versions.'],
    ['Human stewardship','An accountable owner validates or rejects proposals.','Try the local steward queue. These browser-only decisions cannot publish enterprise definitions.'],
    ['Answer with evidence','Respond with definitions, uncertainty and source links.','Executive scenario narrative is curated; supporting evidence is retrieved from the generated corpus.']
  ];
  function renderExecutive() {
    const q=currentQuestion();
    const sourceEvidence=evidenceFor(q,8);
    const naive = state.answer === 'naive';
    const conflictCases=data.comparisons.filter(c=>c.concepts.some(id=>q.intent.includes(id)));
    const stage=stepData[state.stage];
    const sourceList=sourceEvidence.slice(0,7).map(r=>docLink(r.id,r.id)).join('');
    const stepMarkup='<div class="pipeline">'+stepData.map((step,i)=>
      '<button class="pipe" data-action="step" data-step="'+i+'" style="text-align:left;'+
      (state.stage===i?'border-color:var(--hot);background:#322538;':'')+'"><i>0'+(i+1)+'</i><strong>'+
      esc(step[0])+'</strong><small>'+esc(step[1])+'</small></button>').join('')+'</div>'+
      '<div class="notice" style="margin-top:12px"><strong>Stage '+(state.stage+1)+': '+esc(stage[0])+'.</strong> '+esc(stage[2])+'</div>';
    const answers=naive
      ? '<div class="answer"><p><strong>Illustrative naive response:</strong> The systems disagree on production and availability; management needs to resolve inconsistent data before acting.</p><p>This misses the fact that several figures describe different measurement boundaries. It also treats all source records as equally authoritative.</p></div>'+
        '<div class="notice amber"><b>Failure mode:</b> labels that look identical are merged without scope, time or governance.</div>'
      : '<div class="answer good"><p><strong>Interpreted position.</strong> '+esc(q.lead)+'</p><p>'+esc(q.insight)+'</p><p><strong>Recommended next step:</strong> '+esc(q.decision)+'</p></div>'+
        '<div class="notice"><b>Boundary:</b> This narrative is curated to explain the experiment. The citations below are selected by a running lexical retrieval algorithm against generated synthetic records; this is not an LLM answer or verified causal analysis.</div>';
    return hero()+summaryCards()+
      '<div class="panel" id="questionPanel"><div class="section-head"><div><span class="section-flag">01 / EXECUTIVE QUESTION</span><h2 style="margin-top:14px">How should enterprise AI answer?</h2><p>Choose a live retrieval scenario, then compare context-blind versus governed interpretation.</p></div>'+badge('Synthetic & explainable','green')+'</div>'+
      '<label class="input-label" for="questionSelect">Choose executive question</label>'+
      '<select id="questionSelect" style="width:100%;max-width:710px">'+data.questions.map(x=>
       '<option value="'+esc(x.id)+'" '+(x.id===state.question?'selected':'')+'>'+esc(x.ask)+'</option>').join('')+'</select>'+
      '<div class="question">'+esc(q.title)+'</div>'+
      '<div class="row"><button class="btn '+(naive?'active':'')+'" data-action="answer" data-value="naive">Without meaning</button>'+
      '<button class="btn '+(!naive?'active':'')+'" data-action="answer" data-value="governed">With contextual meaning</button></div>'+
      answers+'<div class="sep"></div><h4>Evidence retrieved from source records</h4><div class="trace">'+sourceList+'</div>'+
      '<p class="micro">'+sourceEvidence.length+' unique evidence threads retrieved; repeated source variants collapsed. Select any citation to inspect the raw record and discovered concepts.</p>'+
      '<h4>Scope and conflict checks</h4><div class="trace">'+conflictCases.map(c=>badge(c.kind==='true-conflict'?c.id+' · genuine dispute':c.id+' · distinct meanings',c.kind==='true-conflict'?'red':'green')).join('')+'</div></div>'+
      '<div class="panel" style="margin-top:16px"><div class="section-head"><div><span class="section-flag">02 / WORK THE PROCESS</span><h2 style="margin-top:14px">Follow the discovery pipeline</h2></div>'+badge((state.stage+1)+'/5 stages','pink')+'</div>'+stepMarkup+'</div>'+
      '<div class="panel" style="margin-top:16px"><div class="section-head"><div><span class="section-flag">03 / ASK YOUR OWN QUESTION</span><h2 style="margin-top:14px">Search the enterprise evidence</h2><p>Try “crusher C-17”, “June spend”, “isolation permit” or “shipment target”.</p></div>'+badge('Retrieval, not chat','amber')+'</div>'+
      '<div class="row"><input id="customQuery" class="control" style="flex:1;min-width:220px" placeholder="Ask about an asset, site, metric or issue…" value="'+esc(state.customQuery)+'">'+
      '<button class="btn primary" data-action="custom-search">Find supporting evidence →</button></div>'+
      '<div id="customResults">'+renderCustomResults()+'</div></div>';
  }
  function interpretQuery(question) {
    const lower=question.toLowerCase(),words=tokens(question);
    const umbrella={
      production:['production-mined','production-dispatched','production-plan'],
      availability:['mechanical-availability','operational-readiness'],
      costs:['recognized-expense','purchase-commitment','forecast-commitment'],
      cost:['recognized-expense','purchase-commitment','forecast-commitment'],
      safety:['safety-nearmiss','recordable-injury','isolation-permit'],
      downtime:['crusher-downtime','maintenance-backlog'],
      permit:['isolation-permit']
    };
    const ids=new Set();
    for (const [word,concepts] of Object.entries(umbrella)) {
      if (words.includes(word)) concepts.forEach(id=>ids.add(id));
    }
    for (const c of data.concepts) {
      const possible=[c.name,...c.aliases];
      if(possible.some(alias=>{
        const phrase=alias.toLowerCase(), parts=tokens(phrase);
        return lower.includes(phrase) || (parts.length>0 && parts.every(t=>words.includes(t)));
      })) ids.add(c.id);
    }
    const site=data.enterprise.sites.find(s=>lower.includes(s.toLowerCase()))||null;
    return {conceptIds:[...ids],site,words};
  }
  function renderCustomResults() {
    if (!state.customQuery.trim()) return '<p class="micro" style="margin:15px 0 0">This uses deterministic search of observed evidence and extracted concepts. It does not generate free-form AI answers.</p>';
    const interpretation=interpretQuery(state.customQuery);
    const relevant=new Set(interpretation.conceptIds);
    const issues=(data.analysis?.issues||[]).filter(item=>relevant.has(item.concept));
    const distinct=(data.analysis?.distinctions||[]).filter(item=>item.concepts.some(id=>relevant.has(id)));
    const ranked=data.records.map(r=>{
      const matchedConcepts=r.extraction.concepts.filter(c=>relevant.has(c.id)).length;
      const freeWords=interpretation.words.reduce((n,word)=>n+
        ((r.text+' '+r.title+' '+r.source).toLowerCase().includes(word)?1:0),0);
      const siteMatch=!interpretation.site||r.site===interpretation.site;
      return {r,score:siteMatch?(matchedConcepts*5+freeWords):0};
    }).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id));
    const seen=new Set(),docs=[];
    for(const x of ranked){
      if(!seen.has(x.r.thread)){docs.push(x.r);seen.add(x.r.thread);}
      if(docs.length===12)break;
    }
    const profiles=interpretation.conceptIds.map(id=>termById(id)).filter(Boolean);
    const conceptBlock=profiles.length?'<div class="notice" style="margin-bottom:15px"><b>'+profiles.length+
      ' concept candidates detected in your question.</b> '+(profiles.length>1?'More than one business definition may be relevant. Do not merge their units or scopes.':
      'Meaning matched against the curated dictionary; ownership and validity still need review.')+
      '<div class="trace">'+profiles.map(c=>'<button class="source-chip" data-action="open-term" data-id="'+esc(c.id)+'">'+
      esc(c.name)+' · '+esc(c.owner)+'</button>').join('')+'</div></div>':
      '<div class="notice amber" style="margin-bottom:15px">No governed term candidate matched the question. Results below use lexical evidence search only.</div>';
    const warnings=issues.map(i=>'<div class="notice amber" style="margin-bottom:10px"><b>Automatically flagged disagreement: '+
      esc(termById(i.concept)?.name||i.concept)+'</b><br>'+esc(i.assessment)+
      '<div class="trace">'+i.source_ids.map(id=>docLink(id)).join('')+'</div></div>').join('');
    const distinctions=distinct.length?'<p class="micro"><b>Scope warnings:</b> '+esc(distinct.map(d=>
      d.concepts.map(id=>termById(id)?.name||id).join(' vs ')).join(' · '))+'</p>':'';
    return '<div class="sep"></div><span class="section-flag">QUERY INTERPRETATION</span>'+
      '<h4 style="margin-top:14px">Detected site: '+esc(interpretation.site||'all sites')+
      ' · '+docs.length+' distinct evidence threads retrieved</h4>'+conceptBlock+warnings+distinctions+
      (docs.length?docs.slice(0,9).map(r=>'<div class="comparison-card"><div class="row">'+
      docLink(r.id,r.id)+' '+badge(r.source,'gray')+' '+badge(r.function,'pink')+'</div>'+
      '<p style="margin-top:9px">'+esc(r.text.slice(0,280))+'</p></div>').join(''):
      '<div class="empty">No permitted evidence matches the question. Try specifying a site, metric or equipment ID.</div>')+
      '<p class="micro">Retrieval and concept matching happen locally on the public synthetic snapshot. No network model is answering your question.</p>';
  }
  function sourceFiltered() {
    const q=state.sourceSearch.trim().toLowerCase();
    return data.records.filter(r =>
      (!q || (r.text+' '+r.title+' '+r.id+' '+r.source+' '+
        r.extraction.concepts.map(x=>x.id).join(' ')).toLowerCase().includes(q)) &&
      (state.sourceSite==='all'||r.site===state.sourceSite) &&
      (state.sourceFunction==='all'||r.function===state.sourceFunction) &&
      (state.sourceSystem==='all'||r.source===state.sourceSystem));
  }
  function options(values,chosen) {return '<option value="all">All</option>'+values.map(v=>
    '<option value="'+esc(v)+'" '+(chosen===v?'selected':'')+'>'+esc(v)+'</option>').join('');}
  function renderSources() {
    const filtered=sourceFiltered(),pageSize=18;const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
    state.sourcePage=Math.min(state.sourcePage,pages-1);
    const visible=filtered.slice(state.sourcePage*pageSize,(state.sourcePage+1)*pageSize);
    const rows=visible.map(r=>{
      const candidates=r.extraction.concepts.map(c=>termById(c.id)?.name||c.id).slice(0,2);
      return '<tr data-action="doc" data-id="'+esc(r.id)+'"><td><strong>'+esc(r.id)+'</strong>'+
        '<span class="sub">'+esc(r.date)+'</span></td><td>'+esc(r.source)+'</td><td>'+esc(r.site)+
        '<span class="sub">'+esc(r.function)+'</span></td><td>'+
        esc(r.text.slice(0,122))+(r.text.length>122?'…':'')+'</td><td>'+
        (candidates.length?candidates.map(x=>badge(x,'pink')).join(' '):badge('Unmapped','gray'))+'</td></tr>';
    }).join('');
    return '<div class="section-head"><div><span class="eyebrow">SOURCE LANDSCAPE</span><h1>Evidence, not just documents.</h1><p>Filter raw records across sites, systems and functions. Inspect what the extractor actually inferred, and see exactly where it came from.</p></div>'+badge(fmt(filtered.length)+' records visible','green')+'</div>'+
      '<div class="panel"><div class="filter-row"><input class="control" id="sourceSearch" aria-label="Search evidence" placeholder="Search text, IDs or terminology" value="'+esc(state.sourceSearch)+'">'+
      '<select id="sourceSite" aria-label="Filter site">'+options(data.enterprise.sites,state.sourceSite)+'</select>'+
      '<select id="sourceFunction" aria-label="Filter function">'+options(unique(data.records.map(r=>r.function)).sort(),state.sourceFunction)+'</select>'+
      '<select id="sourceSystem" aria-label="Filter source">'+options(unique(data.records.map(r=>r.source)).sort(),state.sourceSystem)+'</select></div>'+
      '<div class="table-wrap"><table class="table"><thead><tr><th>ID / date</th><th>Source</th><th>Context</th><th>Excerpt</th><th>Proposed meaning</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div>'+
      (!visible.length?'<div class="empty">No permitted records match the filters.</div>':'')+
      '<div class="row" style="justify-content:flex-end;margin-top:15px"><span class="micro">Page '+(state.sourcePage+1)+' of '+pages+'</span>'+
      '<button class="btn small" data-action="page" data-dir="-1" '+(state.sourcePage===0?'disabled':'')+'>Previous</button>'+
      '<button class="btn small" data-action="page" data-dir="1" '+(state.sourcePage===pages-1?'disabled':'')+'>Next</button></div></div>'+
      '<div class="panel" style="margin-top:17px"><h3>Permission boundary</h3><p>The public snapshot contains '+data.restricted_metadata.length+
      ' restricted record stubs with metadata only. Their text is not downloaded to your browser; changing client-side controls cannot reveal it.</p>'+
      '<div class="trace">'+data.restricted_metadata.map(r=>badge(r.id+' · '+r.source+' · withheld','red')).join('')+'</div>'+
      '<div class="notice amber">This demonstrates safe public data packaging, not production identity-based access control. A real system must enforce permissions on the server before retrieval.</div></div>';
  }
  function renderTerms() {
    const selected=termById(state.term)||data.concepts[0];state.term=selected.id;
    const related=data.records.filter(r=>r.extraction.concepts.some(c=>c.id===selected.id));
    const view='<div class="term-grid">'+data.concepts.map(c=>
      '<button class="term-card '+(selected.id===c.id?'active':'')+'" data-action="term" data-id="'+esc(c.id)+'">'+
      badge(c.owner,'gray')+'<strong>'+esc(c.name)+'</strong><small>'+countTerm(c.id)+' candidate source matches</small></button>').join('')+'</div>';
    const detail='<div class="panel term-detail"><div class="section-head"><div><span class="eyebrow">CANDIDATE TERM PROFILE</span><h2>'+esc(selected.name)+'</h2></div>'+badge('Steward: '+selected.owner,'pink')+'</div>'+
      '<p style="color:#edf2f6;font-size:17px">'+esc(selected.definition)+'</p>'+
      '<h4>Aliases / possible textual cues</h4><div class="trace">'+selected.aliases.map(a=>badge(a,'gray')).join('')+'</div>'+
      '<h4>Provenance — linked source records ('+related.length+')</h4><div class="trace">'+related.slice(0,13).map(r=>docLink(r.id,r.id)).join('')+'</div>'+
      '<div class="notice amber">Definition wording comes from a curated seed dictionary; evidence links are automatically extracted. A term has not become governed simply because it appears here.</div></div>';
    return '<div class="section-head"><div><span class="eyebrow">SEMANTIC DISCOVERY</span><h1>One organisation. Many meanings.</h1><p>Review concept candidates, the business owner, aliases and source evidence. The dictionary is a starting hypothesis, not a final ontology.</p></div>'+badge(data.concepts.length+' concepts','green')+'</div>'+view+detail;
  }
  function graphConcepts() {
    const site=state.graphSite;
    return data.concepts.map(c=>({...c,n:countTerm(c.id,site)})).filter(c=>c.n>0).sort((a,b)=>b.n-a.n).slice(0,17);
  }
  function renderGraph() {
    const selected=termById(state.term)||data.concepts[0];
    const related=data.records.filter(r=>r.site===state.graphSite && r.extraction.concepts.some(x=>x.id===selected.id));
    return '<div class="section-head"><div><span class="eyebrow">KNOWLEDGE GRAPH</span><h1>See the relationships.</h1><p>Interactive concept-to-site projection from extracted document mentions. Click a node to inspect its owner and supporting evidence.</p></div>'+
      '<div><label class="input-label" for="graphSite">Focus operating site</label><select id="graphSite">'+
      data.enterprise.sites.map(site=>'<option '+(site===state.graphSite?'selected':'')+'>'+esc(site)+'</option>').join('')+'</select></div></div>'+
      '<div class="graph-layout"><div class="graph-canvas" id="graphCanvas"><svg id="graphSvg" viewBox="0 0 760 540" role="img" aria-label="Graph of business concepts linked to the selected site"></svg></div>'+
      '<div class="panel"><span class="section-flag">SELECTED CONCEPT</span><h2 style="margin-top:16px">'+esc(selected.name)+'</h2>'+
      badge(selected.owner+' owner','pink')+'<p>'+esc(selected.definition)+'</p>'+
      '<h4>'+related.length+' evidence mentions at '+esc(state.graphSite)+'</h4>'+
      '<div class="trace">'+related.slice(0,8).map(r=>docLink(r.id,r.id)).join('')+'</div>'+
      '<div class="sep"></div><h4>Graph semantics</h4><p class="micro">Nodes represent candidate concepts; connection weight is the count of observed documents tagged by lexical extraction. This is not an automatically inferred causal graph.</p>'+
      '<button class="btn small" data-view="terms">View the concept dictionary →</button></div></div>';
  }
  function drawGraph() {
    const svg=$('#graphSvg');if(!svg)return;
    const concepts=graphConcepts();
    const cx=380,cy=260;
    const circles='<circle cx="'+cx+'" cy="'+cy+'" r="205" fill="none" stroke="#344a56" stroke-dasharray="3 8"/>'+
      '<circle cx="'+cx+'" cy="'+cy+'" r="126" fill="none" stroke="#2d4250" stroke-dasharray="2 9"/>';
    const pos=concepts.map((c,i)=>{
      const n=concepts.length;
      const a=(i/n)*Math.PI*2-Math.PI/2;
      const radius=i%3===0?209:183;
      return {...c,x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius};
    });
    const lines=pos.map(c=>'<line class="graph-edge '+(state.term===c.id?'highlight':'')+
      '" x1="'+cx+'" y1="'+cy+'" x2="'+c.x.toFixed(1)+'" y2="'+c.y.toFixed(1)+
      '" stroke-width="'+Math.min(4,.6+c.n*.14)+'"/>').join('');
    const nodes=pos.map(c=>'<g class="graph-node" data-action="graph-term" data-id="'+esc(c.id)+'" role="button" tabindex="0" aria-label="'+esc(c.name)+'">'+
      '<circle cx="'+c.x.toFixed(1)+'" cy="'+c.y.toFixed(1)+'" r="'+Math.min(29,16+c.n*.7)+'" fill="'+
      (c.id===state.term?'#69304c':'#233a4a')+'" stroke="'+(c.id===state.term?'#ff9fc8':'#4b7181')+'" stroke-width="1.4"/>'+
      '<text x="'+c.x.toFixed(1)+'" y="'+(c.y+3).toFixed(1)+'" text-anchor="middle" font-size="11">'+fmt(c.n)+'</text>'+
      '<text x="'+c.x.toFixed(1)+'" y="'+(c.y+(c.y>cy?46:-35)).toFixed(1)+'" text-anchor="middle">'+esc(c.name.length>23?c.name.slice(0,21)+'…':c.name)+'</text></g>').join('');
    svg.innerHTML=circles+lines+'<circle cx="'+cx+'" cy="'+cy+'" r="53" fill="#3e2743" stroke="#ff86bd" stroke-width="2"/>'+
      '<text x="'+cx+'" y="'+(cy-3)+'" text-anchor="middle" fill="#fff" style="font:700 15px Space Grotesk">'+esc(state.graphSite)+'</text>'+
      '<text x="'+cx+'" y="'+(cy+17)+'" text-anchor="middle" fill="#dcb8d3" style="font:11px DM Sans">Site context</text>'+nodes;
  }
  function renderConflicts() {
    const cases=data.comparisons.filter(c=>state.conflictFilter==='all'||c.kind===state.conflictFilter);
    const computed=data.analysis||{issues:[],distinctions:[],metrics:{}};
    const liveChecks='<div class="columns equal" style="margin:18px 0">'+
      '<div class="panel"><div class="row"><h3 style="margin:0">Detected assertion disagreements</h3><span class="spacer"></span>'+badge(computed.issues.length+' flagged','red')+'</div>'+
      '<p class="micro">Computed by parsing observed text and grouping a detected concept by site and reporting period. Every finding requires steward review.</p>'+
      computed.issues.map(i=>'<div class="comparison-card">'+badge(i.concept,'red')+' '+
        badge(i.period,'gray')+'<h4>'+esc(i.values.map(v=>v.value+' '+v.unit).join(' vs '))+'</h4>'+
        '<p>'+esc(i.assessment)+'</p><div class="trace">'+i.source_ids.map(id=>docLink(id)).join('')+'</div></div>').join('')+
      '</div><div class="panel"><div class="row"><h3 style="margin:0">Different measurement scopes</h3><span class="spacer"></span>'+badge(computed.distinctions.length+' distinctions','green')+'</div>'+
      '<p class="micro">Computed cross-concept checks identify where comparing two measures directly would be misleading.</p>'+
      computed.distinctions.map(i=>'<div class="comparison-card">'+
        '<h4>'+esc(i.concepts.map(id=>termById(id)?.name||id).join(' ≠ '))+'</h4>'+
        '<div class="trace">'+i.sources.map(id=>docLink(id)).join('')+'</div></div>').join('')+
      '</div></div>';
    return '<div class="section-head"><div><span class="eyebrow">CONFLICT ANALYSIS</span><h1>Conflicting figures ≠ conflicting facts.</h1>'+
      '<p>Distinguish legitimate scope differences from assertions that cannot both be true in the same context. Open each source and decide where human validation is essential.</p></div>'+
      badge(data.comparisons.filter(c=>c.kind==='true-conflict').length+' unresolved disputes','red')+'</div>'+
      liveChecks+
      '<div class="tabs">'+[['all','All comparisons'],['different-definition','Different definitions'],['true-conflict','True conflicts']].map(c=>
      '<button class="'+(state.conflictFilter===c[0]?'active':'')+'" data-action="conflict-filter" data-value="'+c[0]+'">'+c[1]+'</button>').join('')+'</div>'+
      '<div class="columns equal"><div class="panel"><h3>Side-by-side comparisons</h3>'+cases.map(c=>
      '<div class="comparison-card"><div class="row">'+badge(c.id,'gray')+
      badge(c.label,c.kind==='true-conflict'?'red':'green')+'</div><h4>'+esc(c.reason)+'</h4>'+
      '<div class="trace">'+c.sources.map(id=>docLink(id,id)).join('')+'</div>'+
      '<button class="btn small" data-action="compare" data-id="'+esc(c.id)+'">Explain semantic assessment →</button></div>').join('')+'</div>'+
      '<div class="panel"><span class="section-flag">ANALYST WORKBENCH</span><h3 style="margin-top:15px">What makes it a contradiction?</h3>'+
      (state.selectedConflict?renderConflictDetail(state.selectedConflict):
      '<p>Select a comparison to inspect its measurement scope and evidence.</p>')+
      '<div class="sep"></div><h4>Decision framework</h4><div class="timeline">'+[
       ['Term','Are we comparing the same conceptual definition?'],
       ['Context','Same site, asset, date and unit?'],
       ['Authority','Which system or steward governs the truth?'],
       ['Version','Could a record have been superseded?'],
       ['Decision','Publish a definition only after accountable review.']
      ].map(x=>'<div class="milestone"><strong>'+x[0]+'</strong><p>'+x[1]+'</p></div>').join('')+'</div></div></div>';
  }
  function renderConflictDetail(id) {
    const c=data.comparisons.find(x=>x.id===id);if(!c)return '';
    const concepts=c.concepts.map(x=>termById(x)).filter(Boolean);
    return badge(c.kind==='true-conflict'?'Unresolved, human validation needed':'Scope difference, not an inconsistency',c.kind==='true-conflict'?'red':'green')+
      '<p>'+esc(c.reason)+'</p>'+
      '<div class="sep"></div><h4>Compared source evidence</h4>'+
      c.sources.map(x=>{const r=recordById(x);return '<div class="comparison-card">'+docLink(x)+
        '<p style="margin-top:8px">'+esc(r?r.text:'Record unavailable')+'</p></div>';}).join('')+
      '<h4>Relevant business definitions</h4>'+concepts.map(x=>'<p><b>'+esc(x.name)+'</b> — '+esc(x.definition)+'</p>').join('');
  }
  function renderStewards() {
    const reviews=data.reviews.filter(r=>state.reviewFilter==='all'||decisionFor(r.id)===state.reviewFilter);
    const approved=data.reviews.filter(r=>decisionFor(r.id)==='approved').length;
    const pending=data.reviews.filter(r=>decisionFor(r.id)==='pending').length;
    return '<div class="section-head"><div><span class="eyebrow">ACCOUNTABLE GOVERNANCE</span><h1>AI proposes. People decide.</h1><p>Review model-like proposals against their cited sources, then approve, reject or defer. Decisions are stored only in this browser.</p></div>'+badge(pending+' proposals pending','amber')+'</div>'+
      '<div class="notice amber"><strong>Simulation guardrail:</strong> These buttons record local review decisions only. They do not grant permissions, modify the source records or publish a governed semantic layer.</div>'+
      '<div class="stat-grid">'+[
       [data.reviews.length,'Seed proposals'],[approved,'Approved locally'],
       [pending,'Awaiting a decision'],[data.reviews.filter(r=>decisionFor(r.id)==='rejected').length,'Rejected locally']
      ].map(c=>'<div class="stat"><div class="value">'+c[0]+'</div><div class="caption">'+c[1]+'</div></div>').join('')+'</div>'+
      '<div class="row" style="margin-bottom:15px"><label for="reviewFilter">Filter decisions</label><select id="reviewFilter">'+
      options(['pending','approved','rejected','deferred'],state.reviewFilter)+'</select>'+
      '<span class="spacer"></span><button class="btn small" data-action="reset-review">Reset local decisions</button></div>'+
      '<div class="columns"><div class="panel"><h3>Proposals requiring stewardship</h3>'+
      (reviews.map(r=>'<div class="review-item"><div class="row">'+badge(r.id,'gray')+badge(r.risk+' risk',r.risk==='critical'||r.risk==='high'?'red':'amber')+
        badge(decisionFor(r.id),decisionFor(r.id)==='approved'?'green':decisionFor(r.id)==='rejected'?'red':'gray')+'</div>'+
        '<h4>'+esc(r.proposal)+'</h4><p>Accountable owner: <strong>'+esc(r.owner)+'</strong></p>'+
        '<div class="trace">'+r.sources.map(id=>docLink(id)).join('')+'</div>'+
        '<div class="actions">'+[['approved','Approve'],['rejected','Reject'],['deferred','Defer']].map(a=>
          '<button class="btn small '+(decisionFor(r.id)===a[0]?'active':'')+'" data-action="review" data-id="'+esc(r.id)+'" data-value="'+a[0]+'">'+a[1]+'</button>').join('')+'</div></div>').join('')||
       '<div class="empty">No proposals in this filter.</div>')+'</div>'+
      '<div class="panel"><h3>What publishing would require</h3>'+
      '<div class="timeline">'+[
        ['Evidence collected','Candidate meaning linked to original source metadata.'],
        ['Steward review','Owner checks scope, business rules, dates, competing claims and access.'],
        ['Decision recorded','Approval includes actor, evidence citations, rationale and effective date.'],
        ['Versioned publication','An authenticated service publishes only validated definitions.'],
        ['Consumer control','AI answers resolve identities and permissions at query time.']
      ].map(x=>'<div class="milestone"><strong>'+esc(x[0])+'</strong><p>'+esc(x[1])+'</p></div>').join('')+'</div>'+
      '<div class="notice">Only the first two stages are approximated in this browser demonstration. Production governance requires identity, server-side audit logs and a database.</div></div></div>';
  }
  function renderPipeline() {
    const ev=data.evaluation,denom=ev.gold_labeled||1;
    const benchmarkPct=Math.round(100*ev.candidate_recall);
    return '<div class="section-head"><div><span class="eyebrow">ENGINEERING TRANSPARENCY</span><h1>Measured, not imagined.</h1><p>These numbers are generated by the Python source pipeline, not hard-coded into the dashboard. Interpretation matters: matching a seeded alias is not equivalent to understanding business truth.</p></div>'+badge('Seed '+data.seed+' · reproducible','green')+'</div>'+
      summaryCards()+'<div class="columns equal"><div class="panel"><h3>Dictionary candidate recall</h3>'+
      '<div style="font-size:44px;font-weight:800;font-family:Space Grotesk">'+benchmarkPct+'%</div>'+
      '<p>'+fmt(ev.gold_found_in_candidates)+' of '+fmt(ev.gold_labeled)+' expected concept labels appeared among extracted candidates.</p>'+
      '<div class="progress"><span style="width:'+benchmarkPct+'%"></span></div>'+
      '<p class="micro">Benchmark uses curated synthetic labels for scoring only. This is candidate recall, not precision, entity-resolution accuracy or reasoning quality.</p>'+
      '<div class="sep"></div><h4>Additional signals</h4>'+
      '<div class="keyline"><span>Documents tagged</span><strong>'+fmt(ev.records_with_candidates)+'</strong></div>'+
      '<div class="keyline"><span>Ambiguous results</span><strong>'+fmt(ev.ambiguous_records)+'</strong></div>'+
      '<div class="keyline"><span>Source systems</span><strong>'+fmt(data.stats.source_types)+'</strong></div>'+
      '<div class="keyline"><span>Restricted withheld</span><strong>'+fmt(data.stats.restricted_withheld)+'</strong></div></div>'+
      '<div class="panel"><h3>From ingestion to answer</h3>'+
      '<div class="timeline">'+[
        ['01 · Synthetic generation','Authored events, functions, sites, sources and realistic process-stage disagreements.'],
        ['02 · Read-only observed records','Evidence text extracted without passing gold concept labels to the extractor.'],
        ['03 · Candidate matching','A deterministic alias scanner proposes terminology and entities.'],
        ['04 · Graph projection','Concept-to-document and entity-to-document links are generated from results.'],
        ['05 · Evaluation','Hidden expected concept IDs are used only in benchmark scoring.'],
        ['06 · Governance boundary','Restricted document contents never enter this public dataset.'],
        ['07 · Executive interpretation','Curated explanatory text is linked to retrieved source evidence.']
      ].map(x=>'<div class="milestone"><strong>'+x[0]+'</strong><p>'+x[1]+'</p></div>').join('')+'</div></div></div>'+
      '<div class="panel" style="margin-top:16px"><h3>Engineering roadmap and honest gaps</h3>'+
      '<div class="columns equal"><div><h4>Working in this release</h4>'+
      '<p>Reproducible generated records, candidate discovery, provenance links, concept graph, lexical retrieval, a comparison workbench, browser-local stewardship and automatic tests.</p></div>'+
      '<div><h4>Not yet implemented</h4>'+
      '<p>Unsupervised ontology induction, actual LLM extraction running against enterprise data, authenticated source connectors, real user permissions, governed semantic publication, agentic reasoning, measured causal accuracy and scalable indexing.</p></div></div>'+
      '<a href="https://github.com/daniellogangill/The-meaning-layer/actions" target="_blank" rel="noopener" class="btn small" style="display:inline-block;margin-top:10px;text-decoration:none">View test runs on GitHub ↗</a></div>';
  }
  function openDocument(id) {
    const r=recordById(id),restricted=data.restricted_metadata.find(x=>x.id===id);
    const d=$('#docDialog');if(!d)return;
    if (!r && !restricted) return;
    if (restricted) {
      d.innerHTML='<div class="panel"><div class="row"><h3>Restricted record '+esc(id)+'</h3><span class="spacer"></span><button class="btn small" data-action="close-dialog">Close ✕</button></div>'+
        '<div class="notice amber">This source body was never included in the public download. Only metadata is available. Production access decisions require server-side identity checks.</div></div>';
    } else {
      d.innerHTML='<div class="panel" style="max-height:80vh;overflow:auto"><div class="row"><span class="section-flag">EVIDENCE INSPECTOR</span><span class="spacer"></span><button class="btn small" data-action="close-dialog">Close ✕</button></div>'+
        '<h2 style="margin-top:15px">'+esc(r.id)+'</h2><p>'+esc(r.title)+'</p>'+
        '<div class="row">'+badge(r.source,'pink')+badge(r.function,'gray')+badge(r.site,'gray')+badge(r.classification,'green')+'</div>'+
        '<div class="sep"></div><h4>Original observed content</h4><div class="doc-body">'+esc(r.text)+'</div>'+
        '<h4 style="margin-top:18px">Automatically proposed concepts</h4>'+
        (r.extraction.concepts.length?r.extraction.concepts.map(c=>'<div class="candidate"><div><strong>'+esc(termById(c.id)?.name||c.id)+'</strong>'+
        '<span class="sub">Lexical match: '+esc(c.trigger)+'</span></div><b>Candidate</b></div>').join(''):
        '<div class="notice amber">No concept was found by the lexical baseline.</div>')+
        '<div class="sep"></div><h4>Provenance</h4>'+
        [['System',r.source],['Function',r.function],['Site',r.site],['Document ID',r.id],
         ['Date',r.date],['Evidence thread',r.thread],['Extracted entities',r.extraction.entities.join(', ')||'None'],
         ['Source validation','Not verified']].map(x=>'<div class="keyline"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>').join('')+
        '</div>';
    }
    if (typeof d.showModal==='function') d.showModal();else d.setAttribute('open','');
  }
  function closeDialog(){const d=$('#docDialog');if(d && d.open){if(typeof d.close==='function')d.close();else d.removeAttribute('open');}}
  function handleAction(btn) {
    const action=btn.dataset.action;
    if(action==='doc'){openDocument(btn.dataset.id);return;}
    if(action==='close-dialog'){closeDialog();return;}
    if(action==='answer'){state.answer=btn.dataset.value;render();$('#questionPanel')?.scrollIntoView({block:'nearest'});return;}
    if(action==='step'){state.stage=Number(btn.dataset.step);render();return;}
    if(action==='stage-next'){state.stage=0;go('executive');$('#questionPanel')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(action==='custom-search'){state.customQuery=$('#customQuery')?.value||'';$('#customResults').innerHTML=renderCustomResults();return;}
    if(action==='page'){state.sourcePage=Math.max(0,state.sourcePage+Number(btn.dataset.dir));render();return;}
    if(action==='term'||action==='graph-term'){state.term=btn.dataset.id;render();return;}
    if(action==='open-term'){state.term=btn.dataset.id;go('terms');return;}
    if(action==='conflict-filter'){state.conflictFilter=btn.dataset.value;render();return;}
    if(action==='compare'){state.selectedConflict=btn.dataset.id;render();return;}
    if(action==='review'){
      decisions[btn.dataset.id]=btn.dataset.value;
      try{localStorage.setItem('meaning-lab-decisions-v2',JSON.stringify(decisions));}catch(_){}
      render();return;
    }
    if(action==='reset-review'){
      decisions={};try{localStorage.removeItem('meaning-lab-decisions-v2');}catch(_){}
      render();return;
    }
  }
  document.addEventListener('click',(ev)=>{
    const target=ev.target.closest('[data-action], [data-view]');
    if(!target)return;
    if(target.dataset.view){go(target.dataset.view);return;}
    if(target.dataset.action){handleAction(target);}
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Enter' && ev.target.id==='customQuery'){
      state.customQuery=ev.target.value;const box=$('#customResults');if(box)box.innerHTML=renderCustomResults();
    }
    const node=ev.target.closest('.graph-node');
    if(node && (ev.key==='Enter'||ev.key===' ')){ev.preventDefault();state.term=node.dataset.id;render();}
  });
  document.addEventListener('change',ev=>{
    const el=ev.target;
    if(el.id==='questionSelect'){state.question=el.value;render();}
    if(el.id==='sourceSite'){state.sourceSite=el.value;state.sourcePage=0;render();}
    if(el.id==='sourceFunction'){state.sourceFunction=el.value;state.sourcePage=0;render();}
    if(el.id==='sourceSystem'){state.sourceSystem=el.value;state.sourcePage=0;render();}
    if(el.id==='graphSite'){state.graphSite=el.value;render();}
    if(el.id==='reviewFilter'){state.reviewFilter=el.value;render();}
  });
  document.addEventListener('input',ev=>{
    if(ev.target.id==='sourceSearch'){
      state.sourceSearch=ev.target.value;state.sourcePage=0;
      const pos=ev.target.selectionStart;
      render();const input=$('#sourceSearch');if(input){input.focus();input.setSelectionRange(pos,pos);}
    }
  });
  async function start(){
    try {
      const res=await fetch('./lab/data.json?edition=2',{cache:'no-store'});
      if(!res.ok) throw new Error('Dataset HTTP '+res.status);
      data=await res.json();
      if(!Array.isArray(data.records)||!Array.isArray(data.concepts)||!data.evaluation)
        throw new Error('Dataset schema incomplete');
      $('#datasetStatus').textContent='Synthetic corpus loaded · '+fmt(data.stats.records)+' source records';
      $('#datasetStatus').classList.add('live');
      state.term=data.concepts[0].id;
      render();
    } catch(err) {
      $('#content').innerHTML='<div class="panel"><span class="section-flag">DATASET NOT READY</span>'+
        '<h2 style="margin-top:20px">The lab interface is deployed, but its generated data is not available.</h2>'+
        '<p>'+esc(err.message)+'</p><p>This is a build/deployment issue rather than a problem with your browser.</p>'+
        '<a href="https://github.com/daniellogangill/The-meaning-layer/actions" target="_blank" rel="noopener">Inspect the build run →</a></div>';
      $('#datasetStatus').textContent='Dataset unavailable';
    }
  }
  start();
})();
