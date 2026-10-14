'use strict';
/** Optional Vercel function for the public synthetic-data lab.
 * Disabled by default; no unauthenticated paid calls without a real quota store.
 */
const crypto=require('node:crypto');
const {validateQuestion,retrieve,buildRequest,parseResponse} = require('./_lib/meaning');
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
function envInt(name,fallback,max){
  const val=Number(process.env[name]||fallback);
  return Number.isSafeInteger(val)&&val>0&&val<=max?val:fallback;
}
async function acquireQuota(req){
  const url=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  const salt=process.env.MEANING_IP_HASH_SALT;
  if(!url||!token||!salt)throw new Error('Quota storage is not configured.');
  const ip=(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const hashed=crypto.createHash('sha256').update(salt+':'+ip).digest('hex').slice(0,32);
  const day=new Date().toISOString().slice(0,10);
  const keys=['meaning-lab:daily:'+day,'meaning-lab:ip:'+day+':'+hashed];
  const limitGlobal=envInt('MEANING_DAILY_GLOBAL',100,1000);
  const limitIp=envInt('MEANING_DAILY_PER_IP',5,50);
  const script=[
    "local total=redis.call('INCR',KEYS[1])",
    "if total==1 then redis.call('EXPIRE',KEYS[1],90000) end",
    "local own=redis.call('INCR',KEYS[2])",
    "if own==1 then redis.call('EXPIRE',KEYS[2],90000) end",
    "if total>tonumber(ARGV[1]) or own>tonumber(ARGV[2]) then return 0 end",
    "return 1"
  ].join(' ');
  const response=await fetch(url.replace(/\/$/,'')+'/',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(['EVAL',script,'2',...keys,String(limitGlobal),String(limitIp)]),
    signal:AbortSignal.timeout(5000)
  });
  if(!response.ok)throw new Error('Quota service unavailable.');
  const result=await response.json();
  if(result.error)throw new Error('Quota service returned an error.');
  return Number(result.result)===1;
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
module.exports=async function handler(req,res){
  const origin=String(req.headers?.origin||'');
  const allowed=getOriginAllowlist();
  if(origin && !allowed.has(origin))return send(res,403,{error:'Origin not permitted.'});
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
  if(!process.env.OPENAI_API_KEY||!process.env.UPSTASH_REDIS_REST_URL||
     !process.env.UPSTASH_REDIS_REST_TOKEN||!process.env.MEANING_IP_HASH_SALT)
    return send(res,503,{error:'Live AI configuration is incomplete.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const question=body&&body.question;
  const validation=validateQuestion(question);
  if(validation)return send(res,400,{error:validation});
  const evidence=retrieve(question);
  if(!evidence.length)return send(res,200,{
    status:'insufficient',answer:'No relevant permitted synthetic evidence was found.',
    caveats:['Try a question about Pilbara North, C-17, June production, maintenance, finance, or safety.'],
    next_steps:[],citations:[],evidence:[],mode:'live-model-grounded'});
  let allowedByBudget=false;
  try{allowedByBudget=await acquireQuota(req);}
  catch(_){return send(res,503,{error:'Live AI quota protection is temporarily unavailable.'});}
  if(!allowedByBudget)return send(res,429,{error:'The public demo allowance has been reached. Try again tomorrow.'});
  try{
    const model=process.env.MEANING_LLM_MODEL||'gpt-5.4-nano';
    const response=await queryModel(buildRequest(question,evidence,model));
    const output=parseResponse(response,evidence);
    const used=output.citations.map(id=>evidence.find(r=>r.id===id)).filter(Boolean);
    return send(res,200,{...output,
      evidence:used.map(({id,source,site,date,function:department,text})=>({id,source,site,date,department,text})),
      mode:'live-model-grounded',
      model,usage:{
        input_tokens:response.usage?.input_tokens||0,
        output_tokens:response.usage?.output_tokens||0
      }});
  }catch(_){return send(res,502,{error:'The model could not provide a validated answer. Please try another question.'});}
};
