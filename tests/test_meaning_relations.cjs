'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const inspect=require('../lab/meaning-relations.js').inspect;
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../lab/data.json'),'utf8'));
test('six comparisons are linked to real synthetic sources',()=>{
 const expected={production:['D-001','D-002'],finance:['D-003','D-004'],safety:['D-005','D-006']};
 for(const [scenario,ids] of Object.entries(expected)){
  const relations=inspect(scenario,data);assert.deepEqual(relations.map(x=>x.id),ids);
  for(const r of relations){
   assert.equal(r.approved,false);assert.equal(r.modelGenerated,false);
   assert.ok(r.reason&&r.concepts.length&&r.sources.length>=2);
   for(const id of r.sources)assert.ok(data.records.some(x=>x.id===id&&x.classification!=='restricted'));
   for(const c of r.concepts)assert.ok(r.sources.some(id=>data.records.find(x=>x.id===id).extraction.concepts.some(x=>x.id===c.id)));
  }
 }
 assert.equal(inspect('finance',data)[1].kind,'true-conflict');
 assert.equal(inspect('safety',data)[0].kind,'true-conflict');
});
test('missing, restricted and unlinked evidence fail closed',()=>{
 assert.throws(()=>inspect('unknown',data),/Unknown/);
 const missing={...data,records:data.records.filter(r=>r.id!=='PN-01')};
 assert.throws(()=>inspect('production',missing),/Missing or restricted/);
 const restricted={...data,records:data.records.map(r=>r.id==='PN-19'?{...r,classification:'restricted'}:r)};
 assert.throws(()=>inspect('safety',restricted),/Missing or restricted/);
 const unlinked={...data,records:data.records.map(r=>['PN-14','PN-15'].includes(r.id)?{...r,extraction:{...r.extraction,concepts:[]}}:r)};
 assert.throws(()=>inspect('finance',unlinked),/Missing concept link/);
});
test('inspector does not alter source data or simulate real approvals',()=>{
 const before=JSON.stringify(data);
 for(const scenario of ['production','finance','safety'])inspect(scenario,data);
 assert.equal(JSON.stringify(data),before);
});
