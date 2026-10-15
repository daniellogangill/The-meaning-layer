'use strict';
const assert = require('node:assert/strict');
const {test}=require('node:test');
const budget=require('../api/_lib/budget');
const {buildRequest,retrieve}=require('../api/_lib/meaning');

const ENV={
  MEANING_PUBLIC_LLM_ENABLED:'true',
  OPENAI_API_KEY:'test-never-used',
  UPSTASH_REDIS_REST_URL:'https://example.invalid',
  UPSTASH_REDIS_REST_TOKEN:'fake',
  MEANING_IP_HASH_SALT:'x'.repeat(64),
  MEANING_PROJECT_HARD_CAP_CONFIRMED:'true',
  MEANING_ZERO_ADDITIONAL_HOSTING_COST_CONFIRMED:'true'
};
const REQUEST={
  headers:{'x-vercel-forwarded-for':'192.0.2.48'},
  socket:{remoteAddress:'127.0.0.1'}
};
test('the application cannot exceed US$3 reserved model spend, keeping US$2 headroom',()=>{
  assert.equal(budget.MONTHLY_MODEL_MICRO_USD,3000000);
  assert.equal(budget.MODEL,'gpt-5.6-luna');
  assert.equal(budget.OUTPUT_TOKEN_MAX,650);
  assert.ok(budget.RESERVE_MICRO_USD>0);
  assert.ok(budget.RESERVE_MICRO_USD < 6000);
  assert.equal(Math.floor(budget.MONTHLY_MODEL_MICRO_USD/budget.RESERVE_MICRO_USD)*budget.RESERVE_MICRO_USD<=budget.MONTHLY_MODEL_MICRO_USD,true);
  assert.ok(budget.SCRIPT.includes("month+increment"));
  assert.ok(budget.SCRIPT.indexOf("month+increment")<budget.SCRIPT.indexOf("INCRBY"));
});
test('fails closed without all configuration confirmations, even if key is present',()=>{
  assert.equal(budget.ready({...ENV,MEANING_PROJECT_HARD_CAP_CONFIRMED:'false'}),false);
  assert.equal(budget.ready({...ENV,MEANING_ZERO_ADDITIONAL_HOSTING_COST_CONFIRMED:'false'}),false);
  assert.equal(budget.ready({...ENV,UPSTASH_REDIS_REST_TOKEN:''}),false);
  assert.equal(budget.ready({...ENV,MEANING_IP_HASH_SALT:'short'}),false);
  assert.equal(budget.ready({...ENV,MEANING_PUBLIC_LLM_ENABLED:'false'}),false);
  assert.equal(budget.ready(ENV),true);
});
test('reserves before model call with one atomic Redis EVAL transaction',async()=>{
  const seen=[];
  const fake=async (url,options)=>{
    seen.push({url,options,arguments:JSON.parse(options.body)});
    return {ok:true,json:async()=>({result:[1,budget.RESERVE_MICRO_USD,1,1,0]})};
  };
  const result=await budget.reserveModelBudget(REQUEST,{
    env:ENV,date:new Date('2026-10-15T23:59:59Z'),fetcher:fake
  });
  assert.equal(result.allowed,true);
  assert.equal(seen.length,1);
  assert.equal(seen[0].arguments[0],'EVAL');
  assert.equal(seen[0].arguments[2],'3');
  assert.equal(seen[0].arguments[3],'meaning:month:2026-10');
  assert.equal(seen[0].arguments[4],'meaning:day:2026-10-15');
  assert.ok(seen[0].arguments[5].startsWith('meaning:visitor:2026-10-15:'));
  assert.equal(seen[0].arguments[6],String(budget.RESERVE_MICRO_USD));
  assert.equal(seen[0].arguments[7],String(budget.MONTHLY_MODEL_MICRO_USD));
  assert.ok(!seen[0].options.body.includes('192.0.2.48'));
});
test('the same user is hashed and a new calendar month gets a fresh bucket',()=>{
  const old=budget.keysFor(REQUEST,new Date('2026-10-31T23:59:00Z'),ENV);
  const renewed=budget.keysFor(REQUEST,new Date('2026-11-01T00:00:01Z'),ENV);
  assert.equal(old[0],'meaning:month:2026-10');
  assert.equal(renewed[0],'meaning:month:2026-11');
  assert.notEqual(old[2],renewed[2]);
  assert.deepEqual(budget.keysFor(REQUEST,new Date('2026-10-31T23:59:00Z'),ENV),old);
});
test('denied quota returns explicit monthly reason with no payment call',async()=>{
  const result=await budget.reserveModelBudget(REQUEST,{env:ENV,
    fetcher:async()=>({ok:true,json:async()=>({result:[0,2999000,50,3,1]})})});
  assert.equal(result.allowed,false);
  assert.equal(result.reason,'monthly_budget');
  assert.equal(result.remainingMonthlyMicro,1000);
});
test('store outage fails closed, no in-memory fallback',async()=>{
  await assert.rejects(budget.reserveModelBudget(REQUEST,{env:ENV,
    fetcher:async()=>({ok:false})}),/Global budget store unavailable/);
  await assert.rejects(budget.reserveModelBudget(REQUEST,{env:ENV,
    fetcher:async()=>({ok:true,json:async()=>({result:null})})}),/did not confirm reservation/);
});
test('text-only request is capped by model and maximum UTF-8 envelope',()=>{
  const question='Why is production at Pilbara North under plan?';
  const payload=buildRequest(question,retrieve(question));
  payload.model=budget.MODEL;
  assert.ok(budget.ensureTextEnvelope(payload)>0);
  assert.throws(()=>budget.ensureTextEnvelope({...payload,model:'gpt-5.4-mini'}));
  assert.throws(()=>budget.ensureTextEnvelope({...payload,max_output_tokens:10000}));
  assert.throws(()=>budget.ensureTextEnvelope({...payload,
    input:[{role:'user',content:'a'.repeat(budget.MAX_REQUEST_UTF8_BYTES+1)}]}));
});
