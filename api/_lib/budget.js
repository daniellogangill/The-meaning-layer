'use strict';

/**
 * Fail-closed global budget reservation.
 *
 * US$5/month is the user's ALL-IN ceiling, including any optional hosting.
 * We allocate at most US$3/month of conservative model-token reservations.
 * A separate provider PROJECT hard cap of US$4/month is required before live
 * enablement. No paid resource can be activated by this module.
 *
 * Calls reserve the full conservative possible charge before the LLM request
 * using ONE Redis Lua transaction shared by all serverless instances.
 * We deliberately do not refund failed or cheaper requests, so cumulative
 * *actual* model-token spend cannot exceed the conservative reservations under
 * the documented fixed model, output cap, and text-only input envelope.
 */

const crypto = require('node:crypto');

const MODEL = 'gpt-5.6-luna';
const OUTPUT_TOKEN_MAX = 650;
const INPUT_TOKEN_RESERVE = 15000;
// Conservative USD/million rates, above current official $0.20/$1.20.
// Charges in micro-USD per model token: 0.25 input, 1.50 output.
const INPUT_MICRO_USD_PER_TOKEN = 0.25;
const OUTPUT_MICRO_USD_PER_TOKEN = 1.50;
const RESERVE_MICRO_USD = Math.ceil(INPUT_TOKEN_RESERVE * INPUT_MICRO_USD_PER_TOKEN +
                                   OUTPUT_TOKEN_MAX * OUTPUT_MICRO_USD_PER_TOKEN);
// Model allocation: at most US$3.00 per UTC calendar month.
// Leaves US$2.00 of headroom within the US$5 overall constraint for
// unexpected cost or ancillary infrastructure, which must separately
// be verified to be free or covered within the remaining headroom.
const MONTHLY_MODEL_MICRO_USD = 3000000;
const MAX_REQUEST_UTF8_BYTES = 11000;
const DAILY_GLOBAL_MAX = 50;
const DAILY_VISITOR_MAX = 3;

const SCRIPT = [
  "local month=tonumber(redis.call('GET',KEYS[1]) or '0')",
  "local day=tonumber(redis.call('GET',KEYS[2]) or '0')",
  "local visitor=tonumber(redis.call('GET',KEYS[3]) or '0')",
  "local increment=tonumber(ARGV[1])",
  "if (month+increment)>tonumber(ARGV[2]) then return {0,month,day,visitor,1} end",
  "if day>=tonumber(ARGV[3]) then return {0,month,day,visitor,2} end",
  "if visitor>=tonumber(ARGV[4]) then return {0,month,day,visitor,3} end",
  "local next_month=redis.call('INCRBY',KEYS[1],increment)",
  "local next_day=redis.call('INCR',KEYS[2])",
  "local next_visitor=redis.call('INCR',KEYS[3])",
  "if month==0 then redis.call('EXPIRE',KEYS[1],4000000) end",
  "if day==0 then redis.call('EXPIRE',KEYS[2],172800) end",
  "if visitor==0 then redis.call('EXPIRE',KEYS[3],172800) end",
  "return {1,next_month,next_day,next_visitor,0}"
].join('\n');

function budgetConfiguration(env = process.env) {
  return {
    enabled: env.MEANING_PUBLIC_LLM_ENABLED === 'true',
    hasProviderKey: Boolean(env.OPENAI_API_KEY),
    hasRedis: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
    hasSalt: Boolean(env.MEANING_IP_HASH_SALT && env.MEANING_IP_HASH_SALT.length >= 20),
    providerHardCapAcknowledged: env.MEANING_PROJECT_HARD_CAP_CONFIRMED === 'true',
    infrastructureCostAcknowledged: env.MEANING_ZERO_ADDITIONAL_HOSTING_COST_CONFIRMED === 'true',
    // No environment variable may override the model or increase the ceiling.
    model: MODEL
  };
}
function ready(env = process.env) {
  const c = budgetConfiguration(env);
  return c.enabled && c.hasProviderKey && c.hasRedis && c.hasSalt &&
    c.providerHardCapAcknowledged && c.infrastructureCostAcknowledged;
}
function nowPeriod(date = new Date()) {
  const iso = date.toISOString();
  return { month:iso.slice(0,7),day:iso.slice(0,10) };
}
function clientHash(req, env = process.env) {
  // The forwarding header is only trusted from the configured hosting
  // platform. Malicious spoofing can bypass a per-IP limit but NOT the
  // atomic global monthly or daily allowance.
  const ip = String(req.headers?.['x-vercel-forwarded-for'] ||
      req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .split(',')[0].slice(0,90).trim();
  return crypto.createHash('sha256')
    .update(env.MEANING_IP_HASH_SALT + ':' + ip).digest('hex').slice(0,32);
}
function ensureTextEnvelope(payload) {
  const bytes = Buffer.byteLength(JSON.stringify(payload),'utf8');
  if(bytes > MAX_REQUEST_UTF8_BYTES)
    throw new Error('Source context exceeds the bounded model input envelope.');
  if(payload.model !== MODEL || payload.max_output_tokens > OUTPUT_TOKEN_MAX)
    throw new Error('Unsupported model or token cap.');
  // This bound deliberately over-reserves input tokens relative to UTF-8
  // characters; the native text-only prompt is smaller than the byte cap.
  return bytes;
}
function keysFor(req,date,env) {
  const {month,day}=nowPeriod(date);
  return ['meaning:month:'+month,'meaning:day:'+day,
          'meaning:visitor:'+day+':'+clientHash(req,env)];
}

async function reserveModelBudget(req,{date=new Date(),env=process.env,fetcher=fetch}={}) {
  if(!ready(env))throw new Error('AI cost controls have not been fully activated.');
  const url=env.UPSTASH_REDIS_REST_URL.replace(/\/$/,'') + '/';
  const keys=keysFor(req,date,env);
  const response=await fetcher(url,{
    method:'POST',
    headers:{Authorization:'Bearer '+env.UPSTASH_REDIS_REST_TOKEN,
             'Content-Type':'application/json'},
    body:JSON.stringify(['EVAL',SCRIPT,'3',...keys,
      String(RESERVE_MICRO_USD),String(MONTHLY_MODEL_MICRO_USD),
      String(DAILY_GLOBAL_MAX),String(DAILY_VISITOR_MAX)]),
    signal:AbortSignal.timeout(5000)
  });
  if(!response.ok)throw new Error('Global budget store unavailable.');
  const result=await response.json();
  if(result.error || !Array.isArray(result.result) || result.result.length!==5)
    throw new Error('Global budget store did not confirm reservation.');
  const [allowed,usedMicro,dayCount,visitorCount,reason]=result.result.map(Number);
  if(![allowed,usedMicro,dayCount,visitorCount,reason].every(Number.isFinite))
    throw new Error('Invalid budget response.');
  return {
    allowed:allowed===1,
    reason:reason===1?'monthly_budget':reason===2?'global_daily_budget':
      reason===3?'visitor_daily_budget':'',
    monthUsedMicro:usedMicro,
    remainingMonthlyMicro:Math.max(0,MONTHLY_MODEL_MICRO_USD-usedMicro),
    today:dayCount,
    visitorToday:visitorCount
  };
}

module.exports={
  MODEL,OUTPUT_TOKEN_MAX,INPUT_TOKEN_RESERVE,RESERVE_MICRO_USD,
  MONTHLY_MODEL_MICRO_USD,MAX_REQUEST_UTF8_BYTES,DAILY_GLOBAL_MAX,
  DAILY_VISITOR_MAX,SCRIPT,ready,budgetConfiguration,nowPeriod,
  ensureTextEnvelope,keysFor,reserveModelBudget
};
