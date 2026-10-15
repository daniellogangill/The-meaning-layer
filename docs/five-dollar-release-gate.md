# The Meaning Layer: US$5/month release gate

**User budget, 15 October 2026:** No more than **US$5 of incremental spending per calendar month** for this prototype, including model and incremental hosting or rate-limit services. This is a maximum, not a target. Do not enable model traffic or create a paid service if the ceiling cannot be protected.

## Conservative budget allocation

| Category | Operational ceiling | Behaviour |
|---|---:|---|
| Token requests from /api/meaning and /api/discover | **US$3.00/month reserved, globally** | Redis Lua performs one atomic reservation BEFORE every paid provider call. Failed or cheaper calls are not refunded. |
| OpenAI project hard spending limit (secondary protection) | **US$4.00/month** | Must be configured in a dedicated project using Enforce a hard limit. Its enforcement may lag, so the application stops earlier. |
| Hosting, rate-limit store, ancillary costs | **US$2.00 remaining headroom** | Use only services already included in existing plans/free quotas; independently verify no incremental paid tier will be activated. |
| Total approved incremental cost | **US$5.00/month** | If conditions cannot be met, run free deterministic demo only. |

Provider project hard limits (not ordinary spend alerts) are documented at
https://developers.openai.com/api/docs/guides/spend-limits .
The provider cautions that usage may slightly exceed a provider hard limit during propagation; the application's US$3 allowance is purposely lower.

## Model

- Fixed model in code: **gpt-5.6-luna**. No environment or client override.
- Official pricing on 15 October 2026: US$0.20 per million text input and US$1.20 per million text output tokens (standard).
- Local accounting assumes conservatively US$0.25 and US$1.50 per million tokens.
- Maximum output per call is 650 tokens; maximum UTF-8 request bytes is 11,000, with an assumed maximum of 15,000 input tokens.
- Reserved at most 4,725 micro-USD (US$0.004725) per call. When US$3 is allocated, further calls are rejected before any model request.
- No tools, web search, embeddings, images, background jobs or retries are enabled by this gateway.
- Monthly buckets reset on UTC calendar month, not local calendar month. Daily visitor and global counters also use UTC.
- Current limits are 50 calls/day globally and three per visitor. The global monthly cap is shared across all routes and instances and cannot be raised with an env variable.

Pricing reference: https://developers.openai.com/api/docs/models/gpt-5.6-luna .

## Required before activation

In a **dedicated** OpenAI API project, set the provider hard limit to US$4/month and verify **Enforce a hard limit** (not notification-only). The project key must be used solely for Meaning Layer, so unrelated apps cannot draw from its allowance. Confirm the existing Vercel team and rate-limit store cannot create additional charges that breach the remaining headroom.

Set the following Vercel production **server-side** environment variables. Never expose their actual values in GitHub or browsers.

- OPENAI_API_KEY — dedicated Meaning Layer project key.
- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — an existing included/free-tier shared Redis instance.
- MEANING_IP_HASH_SALT — a unique random secret at least 20 characters.
- MEANING_PROJECT_HARD_CAP_CONFIRMED=true — only after verifying the provider project hard limit.
- MEANING_ZERO_ADDITIONAL_HOSTING_COST_CONFIRMED=true — only after verifying no new hosting/store fees.
- MEANING_PUBLIC_LLM_ENABLED=true — final switch; leave false until all earlier checks pass.

Redeploy after adding variables. Check /api/status; the workbench enables paid buttons only after backend readiness. Verify quota exhaustion, outage and model errors all fail closed. Independently monitor provider billing.

**Important:** Public websites and CORS alone do not protect against abuse. The atomic monthly reservation is the gateway's cost control, while the provider hard limit is a backstop. Never guarantee that providers cannot incur an overage independently.

## Current safe state

- The GitHub Pages deterministic lab and Design My Thinking landing page are public.
- The Vercel gateway can be deployed with /api/status returning available=false.
- Both live routes return HTTP 503 and consume zero model tokens until enabled.
- Synthetic evidence retrieval, graph, conflict checks and local browser approvals are free.

## Next quality gates

Compare real model proposals with the 50-concept held-out benchmark, including false positives, incorrect scope matches, abstentions and citation validity. Human steward approval is required before any definition is published.

Future cached responses must not leak visitor questions or private data. Any changes to the hardcoded token bounds, output cap or model price assumptions require new cost review and regression tests.
