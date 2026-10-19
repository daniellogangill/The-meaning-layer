'use strict';
/* Synthetic, evidence-derived graph model. No AI inference or causal claims.
   Exported for Node tests and the browser. */
(function(root,factory){
  const value=factory();
  if(typeof module==='object'&&module.exports)module.exports=value;
  if(root)root.MeaningGraph=value;
})(typeof window!=='undefined'?window:null,function(){
  const LENSES={
    production:['production-mined','production-dispatched','production-plan','mechanical-availability','operational-readiness','crusher-downtime','ore-grade','asset-identity','maintenance-backlog','spares-leadtime','contract-obligation'],
    finance:['recognized-expense','purchase-commitment','forecast-commitment','production-dispatched','contract-obligation'],
    safety:['isolation-permit','safety-nearmiss','recordable-injury','asset-identity','crusher-downtime','maintenance-backlog']
  };
  const MAX_SOURCE_NODES=19;
  function build(data,{site='Pilbara North',lens='production'}={}){
    if(!data||!Array.isArray(data.records)||!Array.isArray(data.concepts))throw new Error('Missing graph evidence');
    if(!LENSES[lens])throw new Error('Unknown graph scenario');
    const all=new Map(data.concepts.map(c=>[c.id,c]));
    const candidates=LENSES[lens].filter(id=>all.has(id));
    const desired=new Set(candidates);
    const eligible=data.records.filter(r=>r.site===site&&r.classification==='internal'&&
      r.extraction&&Array.isArray(r.extraction.concepts)&&r.extraction.concepts.some(c=>desired.has(c.id)));
    // Select distinct source threads first. Prefer the original record over synthetically
    // generated versions and include multiple functions/systems before adding duplicates.
    const ordered=eligible.slice().sort((a,b)=>{
      const av=/-V\d+$/.test(a.id)?1:0,bv=/-V\d+$/.test(b.id)?1:0;
      return av-bv||a.id.localeCompare(b.id);
    });
    const used=new Set(),chosen=[];
    function take(r){
      const thread=r.thread||r.id;
      if(used.has(thread)||chosen.length>=MAX_SOURCE_NODES)return false;
      chosen.push(r);used.add(thread);return true;
    }
    // Critical comparison evidence is guaranteed a place in the graph.
    const comparisons=(data.comparisons||[]).filter(c=>
      c.concepts.some(id=>desired.has(id))&&
      (c.sources||[]).some(id=>eligible.some(r=>r.id===id)));
    for(const comparison of comparisons){
      for(const id of comparison.sources||[]){
        const r=ordered.find(x=>x.id===id);
        if(r)take(r);
      }
    }
    // At least one observation for every available concept, followed by breadth.
    for(const id of candidates){
      const match=ordered.find(r=>r.extraction.concepts.some(c=>c.id===id)&&!used.has(r.thread||r.id));
      if(match)take(match);
    }
    const sourceKinds=new Set(chosen.map(r=>r.source));
    for(const r of ordered){
      if(!sourceKinds.has(r.source)&&take(r))sourceKinds.add(r.source);
    }
    for(const r of ordered)take(r);
    const visibleConcepts=candidates.filter(id=>chosen.some(r=>r.extraction.concepts.some(c=>c.id===id)));
    const nodes=[],edges=[],nodeIds=new Set(),edgeIds=new Set();
    function addNode(n){if(nodeIds.has(n.id))return;nodes.push(n);nodeIds.add(n.id);}
    function link(from,to,kind,sourceIds=[]){
      if(from===to)return;
      const id=[from,to,kind].join('|');
      if(edgeIds.has(id))return;
      if(!nodeIds.has(from)||!nodeIds.has(to))return;
      edgeIds.add(id);edges.push({from,to,kind,sourceIds:[...new Set(sourceIds)]});
    }
    for(const cId of visibleConcepts){
      const c=all.get(cId);
      addNode({id:'term:'+cId,kind:'term',label:c.name,subtitle:c.owner,ref:cId});
    }
    for(const r of chosen){
      addNode({id:'doc:'+r.id,kind:'document',label:r.id,subtitle:r.source,ref:r.id,
        description:r.text,owner:r.function,date:r.date});
      for(const c of r.extraction.concepts){
        if(visibleConcepts.includes(c.id))link('doc:'+r.id,'term:'+c.id,'observed mention',[r.id]);
      }
    }
    const assetDocs=chosen.filter(r=>(data.graph?.edges||[]).some(e=>
      e.from===r.id&&e.to==='ASSET-C17'&&e.type==='identifies'));
    addNode({id:'ctx:site',kind:'context',label:site,subtitle:'Operating site'});
    for(const id of visibleConcepts){
      const ids=chosen.filter(r=>r.extraction.concepts.some(c=>c.id===id)).map(r=>r.id);
      link('term:'+id,'ctx:site','document site',ids);
    }
    if(assetDocs.length){
      addNode({id:'ctx:asset',kind:'context',label:'Crusher C-17',subtitle:'Observed asset'});
      for(const id of visibleConcepts){
        const citations=assetDocs.filter(r=>r.extraction.concepts.some(c=>c.id===id)).map(r=>r.id);
        if(citations.length)link('term:'+id,'ctx:asset','shared asset',citations);
      }
    }
    const shownComparisons=comparisons.filter(c=>c.concepts.some(id=>visibleConcepts.includes(id)));
    for(const c of shownComparisons){
      addNode({id:'issue:'+c.id,kind:'issue',label:c.kind==='true-conflict'?'Unresolved conflict':'Different definitions',
        subtitle:c.id,description:c.reason,ref:c.id,issueKind:c.kind});
      for(const id of c.concepts)if(visibleConcepts.includes(id))
        link('term:'+id,'issue:'+c.id,c.kind==='true-conflict'?'conflicting assertions':'curated scope distinction',c.sources);
      for(const id of c.sources)if(nodeIds.has('doc:'+id))
        link('doc:'+id,'issue:'+c.id,'comparison evidence',[id]);
      if(c.concepts.length===2&&c.concepts.every(id=>visibleConcepts.includes(id)))
        link('term:'+c.concepts[0],'term:'+c.concepts[1],'curated comparison',c.sources);
    }
    // Documents mentioning multiple concepts establish co-observation, not causation.
    for(const a of visibleConcepts)for(const b of visibleConcepts){
      if(a>=b)continue;
      const cited=chosen.filter(r=>r.extraction.concepts.some(c=>c.id===a)&&
        r.extraction.concepts.some(c=>c.id===b)).map(r=>r.id);
      if(cited.length)link('term:'+a,'term:'+b,'co-mentioned',[...cited]);
    }
    const q=(data.questions||[]).find(q=>q.id===lens);
    if(q){
      addNode({id:'decision:'+lens,kind:'decision',label:'Executive action',
        subtitle:'Curated recommendation',description:q.decision,ref:lens});
      for(const id of (q.intent||[]).filter(id=>visibleConcepts.includes(id)).slice(0,4))
        link('term:'+id,'decision:'+lens,'decision context',
          chosen.filter(r=>r.extraction.concepts.some(c=>c.id===id)).map(r=>r.id));
    }
    return {site,lens,nodes,edges,sourceCount:chosen.length,eligibleCount:eligible.length,
      conceptCount:visibleConcepts.length,comparisonCount:shownComparisons.length,
      evidence:chosen.map(r=>r.id)};
  }
  return {build,LENSES,MAX_SOURCE_NODES};
});