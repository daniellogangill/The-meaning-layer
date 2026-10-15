'use strict';
/** Optional Vercel function for the public synthetic-data lab.
 * Disabled by default; no unauthenticated paid calls without a real quota store.
 */
const {validateQuestion,retrieve,buildRequest,parseResponse} = require('./_lib/meaning');
const {MODEL,ready,budgetConfiguration,reserveModelBudget,ensureTextEnvelope} = require('./_lib/budget');
const DEFAULT_ORIGINS=[
  'https://daniellogangill.github.io',
  'https://designmythinking.xyz',
  'https://www.designmythinking.xyz'
];
function getOriginAllowlist(){
  const extra=(process.env.MEANING_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS,...extra]);
}
function send(res,status,json){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(json));
}
async function queryModel(body){
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{
      Authorization:'Bearer '+process.env.OPENAI_API_KEY,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(22000)
  });
  if(!response.ok)throw new Error('Model request failed.');
  return response.json();
}
function sameOrigin(origin,req){
  if(!origin)return false;
  try{
    const url=new URL(origin);
    const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'');
    return url.protocol==='https:' && url.host===host;
  }catch(_){return false;}
}
module.exports=async function handler(req,res){
  const origin=String(req.headers?.origin||'');
  const allowed=getOriginAllowlist();
  if(origin && !allowed.has(origin) && !sameOrigin(origin,req))return send(res,403,{error:'Origin not permitted.'});
  if(origin){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  }
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
  if(req.method!=='POST')return send(res,405,{error:'POST required.'});
  // The endpoint cannot accidentally incur charges by a deployment alone.
  if(process.env.MEANING_PUBLIC_LLM_ENABLED!=='true')return send(res,503,
    {error:'Live AI is not enabled. The deterministic lab remains available.'});
  if(!ready())return send(res,503,{error:'Live AI is awaiting verified monthly spending protections.'});
  let body;
  try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}
  catch(_){return send(res,400,{error:'Request must contain valid JSON.'});}
  const question=body&&body.question;
  const validation=validateQuestion(question);
  if(validation)return send(res,400,{error:validation});
  const evidence=retrieve(question);
  if(!evidence.length)return send(res,200,{
    status:'insufficient',answer:'No relevant permitted synthetic evidence was found.',
    caveats:['Try a question about Pilbara North, C-17, June production, maintenance, finance, or safety.'],
    next_steps:[],citations:[],evidence:[],mode:'live-model-grounded'});
  const requestBody=buildRequest(question,evidence,MODEL);
  try{ensureTextEnvelope(requestBody);}
  catch(_){return send(res,413,{error:'Source context too long for the bounded model allocation.'});}
  let budget;
  try{budget=await reserveModelBudget(req);}
  catch(_){return send(res,503,{error:'Usage budget service unavailable; no model call was made.'});}
  if(!budget.allowed) return send(res,429,{error:
    budget.reason==='monthly_budget'?'Monthly AI allocation reached. Try again next month.':
    'Public demonstration allowance reached. Try again tomorrow.'});
  try{
    const model=MODEL;
    const response=await queryModel(requestBody);
    const output=parseResponse(response,evidence);
    const used=output.citations.map(id=>evidence.find(r=>r.id===id)).filter(Boolean);
    return send(res,200,{...output,
      evidence:used.map(({id,source,site,date,function:department,text})=>({id,source,site,date,department,text})),
      mode:'live-model-grounded',
      model,allocation:{remainingUsDollars:Number((budget.remainingMonthlyMicro/1000000).toFixed(4)),monthlyModelLimitUsd:3,overallCeilingUsd:5},usage:{
        input_tokens:response.usage?.input_tokens||0,
        output_tokens:response.usage?.output_tokens||0
      }});
  }catch(_){return send(res,502,{error:'The model could not provide a validated answer. Please try another question.'});}
};
