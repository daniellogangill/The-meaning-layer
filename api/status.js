'use strict';
const {ready,MODEL}=require('./_lib/budget');
function sameOrigin(origin,req){
  if(!origin)return false;
  try{
    const url=new URL(origin);
    const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'');
    return url.protocol==='https:' && url.host===host;
  }catch(_){return false;}
}
module.exports=(req,res)=>{
  const origins=new Set(['https://daniellogangill.github.io',
    'https://designmythinking.xyz','https://www.designmythinking.xyz']);
  const extras=String(process.env.MEANING_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
  extras.forEach(s=>s&&origins.add(s));
  const origin=String(req.headers?.origin||'');
  if(origin&&!origins.has(origin)&&!sameOrigin(origin,req)){
    res.statusCode=403;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({error:'Origin not permitted.'}));
    return;
  }
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'GET required.'}));return;}
  res.statusCode=200;
  res.end(JSON.stringify({
    available:ready(),
    mode:ready()?'experimental_llm':'deterministic_only',
    model:MODEL,
    strictMonthlyCeilingUSD:5,
    maxModelReservationUSD:3,
    note:ready()?'LLM output is experimental and requires human validation.':
      'Live AI remains off until source and spending controls are verified.'
  }));
};
