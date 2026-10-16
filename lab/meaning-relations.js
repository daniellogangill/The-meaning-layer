/* Curated meaning comparisons over synthetic evidence. No LLM or approval. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MeaningRelations=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 const SCENARIOS={production:['D-001','D-002'],finance:['D-003','D-004'],safety:['D-005','D-006']};
 function inspect(scenario,data){
  if(!SCENARIOS[scenario])throw Error('Unknown scenario');
  if(!data||!Array.isArray(data.comparisons)||!Array.isArray(data.records)||!Array.isArray(data.concepts))throw Error('Missing dataset');
  return SCENARIOS[scenario].map(id=>{
   const c=data.comparisons.find(x=>x.id===id);
   if(!c||!['different-definition','true-conflict'].includes(c.kind)||!c.reason||!Array.isArray(c.sources)||c.sources.length<2)throw Error('Invalid comparison '+id);
   const records=c.sources.map(source=>data.records.find(r=>r.id===source));
   if(records.some(r=>!r||r.classification==='restricted'||!Array.isArray(r.extraction?.concepts)))throw Error('Missing or restricted evidence '+id);
   const concepts=c.concepts.map(concept=>data.concepts.find(x=>x.id===concept));
   if(concepts.some(x=>!x||!x.definition||!x.owner)||concepts.some(x=>!records.some(r=>r.extraction.concepts.some(t=>t.id===x.id))))throw Error('Missing concept link '+id);
   if(c.kind==='true-conflict'&&(concepts.length!==1||records.filter(r=>r.extraction.concepts.some(x=>x.id===concepts[0].id)).length<2))throw Error('Invalid same-scope comparison '+id);
   return {id,kind:c.kind,reason:c.reason,label:c.kind==='true-conflict'?'Unresolved same-scope disagreement':'Distinct definitions — not a contradiction',concepts:concepts.map(x=>({id:x.id,name:x.name,owner:x.owner,definition:x.definition})),sources:c.sources.slice(),approved:false,modelGenerated:false};
  });
 }
 return Object.freeze({inspect});
});
