'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const api=require('../api/meaning');
const {data,validateQuestion,retrieve,buildRequest,parseResponse,MAX_EVIDENCE,MAX_CONTEXT_CHARS}=require('../api/_lib/meaning');

function request(method='POST',body={question:'Why was June production at Pilbara North below plan?'},origin='https://daniellogangill.github.io'){
  return {method,body,headers:{origin,'x-forwarded-for':'192.0.2.1'}};
}
function response(){
  return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},
  end(value){this.json=JSON.parse(value||'null');this.ended=true;}};
}
test('validation rejects missing and oversized questions',()=>{
  assert.ok(validateQuestion(null));
  assert.ok(validateQuestion('x'));
  assert.ok(validateQuestion('z'.repeat(241)));
  assert.equal(validateQuestion('Why is Pilbara North production below plan?'),null);
});
test('retrieval is bounded and only uses permitted observed evidence',()=>{
  const results=retrieve('Why was June production at Pilbara North below plan?');
  assert.ok(results.length>0);
  assert.ok(results.length<=MAX_EVIDENCE);
  assert.ok(results.every(r=>!('classification' in r)&&typeof r.text==='string'));
  assert.ok(results.every(r=>data.records.some(d=>d.id===r.id&&d.classification==='internal')));
  assert.ok(results.reduce((sum,r)=>sum+r.text.length,0)<=MAX_CONTEXT_CHARS);
  assert.equal(new Set(results.map(r=>r.id)).size,results.length);
  assert.deepEqual(retrieve('xxxxxxxxxxxxxxxxxxunmatchedzero'),[]);
});
test('request is structured and does not let browser submit evidence',()=>{
  const evidence=retrieve('Why has the crusher tripped at Pilbara North?');
  const out=buildRequest('Why has the crusher tripped at Pilbara North?',evidence);
  assert.equal(out.store,false);
  assert.equal(out.max_output_tokens,650);
  assert.equal(out.text.format.type,'json_schema');
  assert.ok(out.input[1].content.includes(evidence[0].id));
  assert.ok(out.input[0].content.includes('source evidence'));
});
test('rejects fabricated citations, does not emit unsupported source IDs',()=>{
  const evidence=retrieve('Explain mechanical availability at Pilbara North');
  const create=out=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(out)}]}]});
  const good=create({status:'answered',answer:'Availability differs by department.',caveats:[],next_steps:['Validate with owners'],citations:[evidence[0].id,'FAKE-ID']});
  const parsed=parseResponse(good,evidence);
  assert.deepEqual(parsed.citations,[evidence[0].id]);
  const bad=create({status:'answered',answer:'Fabricated claim.',caveats:[],next_steps:[],citations:['FAKE-ID']});
  assert.equal(parseResponse(bad,evidence).status,'insufficient');
});
test('public endpoint is hard-disabled unless explicitly enabled',async()=>{
  const old=process.env.MEANING_PUBLIC_LLM_ENABLED;
  delete process.env.MEANING_PUBLIC_LLM_ENABLED;
  const res=response();
  await api(request(),res);
  assert.equal(res.statusCode,503);
  assert.match(res.json.error,/not enabled/i);
  if(old!==undefined)process.env.MEANING_PUBLIC_LLM_ENABLED=old;
});
test('without quota storage or API secret live queries fail closed',async()=>{
  const saved={...process.env};
  process.env.MEANING_PUBLIC_LLM_ENABLED='true';
  delete process.env.OPENAI_API_KEY;
  const res=response();
  await api(request(),res);
  assert.equal(res.statusCode,503);
  assert.match(res.json.error,/monthly spending protections|incomplete/i);
  process.env.MEANING_PUBLIC_LLM_ENABLED=saved.MEANING_PUBLIC_LLM_ENABLED||'';
  if(saved.OPENAI_API_KEY!==undefined)process.env.OPENAI_API_KEY=saved.OPENAI_API_KEY;
});
test('unsupported method, malformed JSON and blocked origins do not reach API',async()=>{
  const method=response();await api(request('GET'),method);assert.equal(method.statusCode,405);
  const origin=response();await api(request('POST',{},'https://attacker.invalid'),origin);assert.equal(origin.statusCode,403);
  const malformed=response();await api(request('POST','{invalid'),malformed);
  assert.equal(malformed.statusCode,503); // disabled mode wins before body parsing
});
