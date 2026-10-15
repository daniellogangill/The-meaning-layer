'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/discover');
const status=require('../api/status');
const {retrieve}=require('../api/_lib/meaning');
const {MODEL}=require('../api/_lib/budget');

function res(){
  return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},
    end(x){this.value=x?JSON.parse(x):null;}};
}
function req(method='POST',body={question:'What is mechanical availability at Pilbara North?'},origin='https://daniellogangill.github.io'){
  return {method,body,headers:{origin}};
}
test('discovery schema never sees a hidden gold dictionary',()=>{
  const evidence=retrieve('What is mechanical availability at Pilbara North?');
  const payload=handler.buildDiscoveryRequest('What is mechanical availability at Pilbara North?',evidence);
  assert.equal(payload.model,MODEL);
  assert.equal(payload.store,false);
  assert.equal(payload.text.format.type,'json_schema');
  assert.ok(payload.input[1].content.includes(evidence[0].id));
  assert.ok(!payload.input[1].content.includes('ground_truth'));
  assert.match(payload.input[0].content,/untrusted instructions/);
});
test('discovery proposals drop invented source IDs and unsupported definitions',()=>{
  const evidence=retrieve('What is mechanical availability at Pilbara North?');
  const message={summary:'Candidate meanings differ',proposals:[
    {term:'availability',definition:'Mechanical readiness',scope:'Maintenance',
      evidence_ids:[evidence[0].id,'INVENTED-123'],uncertainty:'Needs steward approval'},
    {term:'fake',definition:'unsupported',scope:'none',evidence_ids:['MADE-UP'],uncertainty:'none'}
  ],unresolved:['Confirm measurement window']};
  const reply={output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(message)}]}]};
  const parsed=handler.parseProposals(reply,evidence);
  assert.equal(parsed.proposals.length,1);
  assert.deepEqual(parsed.proposals[0].evidence_ids,[evidence[0].id]);
  assert.equal(parsed.proposals[0].status,'unapproved-model-proposal');
});
test('public discovery cannot run paid request until monthly protections are ready',async()=>{
  const old=process.env.MEANING_PUBLIC_LLM_ENABLED;
  delete process.env.MEANING_PUBLIC_LLM_ENABLED;
  const r=res();await handler(req(),r);
  assert.equal(r.statusCode,503);
  assert.match(r.value.error,/spending|cost/i);
  if(old!==undefined)process.env.MEANING_PUBLIC_LLM_ENABLED=old;
});
test('status endpoint announces offline mode and financial ceilings',()=>{
  const r=res();status(req('GET'),r);
  assert.equal(r.statusCode,200);
  assert.equal(r.value.strictMonthlyCeilingUSD,5);
  assert.equal(r.value.maxModelReservationUSD,3);
  assert.equal(r.value.mode,'deterministic_only');
  assert.ok(!JSON.stringify(r.value).includes('OPENAI_API_KEY'));
});
test('bad origins and methods fail closed',async()=>{
  const origin=res();
  await handler(req('POST',{},'https://attacker.invalid'),origin);
  assert.equal(origin.statusCode,403);
  const method=res();
  await handler(req('GET'),method);
  assert.equal(method.statusCode,405);
  const statusBad=res();
  status(req('POST'),statusBad);assert.equal(statusBad.statusCode,405);
});
