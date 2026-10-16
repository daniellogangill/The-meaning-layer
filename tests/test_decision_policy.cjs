'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const evaluate=require('../lab/decision-policy.js').evaluate;
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../lab/data.json'),'utf8'));
test('each review outcome is deterministic, source-linked and never changes facts',()=>{
  const before=JSON.stringify(data);
  for(const scenario of ['production','finance','safety']){
    const seen=new Set();
    for(const decision of [null,'approve','defer','reject']){
      const outcome=evaluate(scenario,decision,data);
      assert.ok(outcome.label&&outcome.effect&&outcome.nextStep);
      assert.equal(outcome.sourceFactsChanged,false);
      assert.equal(outcome.isRealApproval,false);
      assert.ok(outcome.evidenceIds.length>=2);
      for(const id of outcome.evidenceIds)assert.ok(data.records.some(r=>r.id===id&&r.classification!=='restricted'));
      seen.add(outcome.label);
    }
    assert.equal(seen.size,4,'distinct review effects for '+scenario);
  }
  assert.equal(JSON.stringify(data),before);
});
test('approval endorses scope but never fabricates authority for finance or safety',()=>{
  const prod=evaluate('production','approve',data),finance=evaluate('finance','approve',data),safety=evaluate('safety','approve',data);
  assert.equal(prod.approvedMeaning,true);
  assert.equal(finance.heldForecast,true);
  assert.match(finance.effect,/Neither A\$13\.7m nor A\$14\.2m/);
  assert.equal(safety.mustAbstain,true);
  for(const decision of [null,'approve','defer','reject'])assert.equal(evaluate('safety',decision,data).mustAbstain,true);
  assert.match(evaluate('safety','reject',data).nextStep,/Do not authorise work/);
});
test('missing and restricted sources fail closed',()=>{
  assert.throws(()=>evaluate('invalid',null,data),/Unknown scenario/);
  assert.throws(()=>evaluate('production','invented',data),/Invalid review/);
  const missing={...data,records:data.records.filter(r=>r.id!=='PN-02')};
  assert.throws(()=>evaluate('production','approve',missing),/Missing or restricted/);
  const restricted={...data,records:data.records.map(r=>r.id==='PN-18'?{...r,classification:'restricted'}:r)};
  assert.throws(()=>evaluate('safety','approve',restricted),/Missing or restricted/);
});
