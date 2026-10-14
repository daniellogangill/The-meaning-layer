# Lightweight LLM integration — launch plan

The existing GitHub Pages demonstration is public and fully independent of
the new optional gateway. This branch builds a **secure, off-by-default**
serverless endpoint for the first genuine model-augmented Q&A experiment.

## Architecture

1. The browser sends **only a short question** to \`POST /api/meaning\`.
2. The server retrieves at most **8 internal-classified synthetic records**
   from the published dataset. The browser cannot substitute its own evidence.
3. A compact, structured prompt asks a lightweight model to interpret the
   retrieved evidence with definitions, uncertainties and source IDs.
4. The server enforces **structured JSON**, cross-checks citation IDs against
   permitted source records and withholds unsupported answers.
5. The response includes an executive summary, caveats, possible next steps,
   source citations and token use. It is always labelled as *unvalidated*.
6. The LLM gateway runs on Vercel; the current public frontend stays
   available on GitHub Pages. When stable, place a Prototype link or embedded
   integration on designmythinking.xyz without exposing the API key.

**This does not yet run an LLM**, nor does it induce an ontology automatically:
it provides a prepared, secure integration contract with mocked tests.

## Why a backend is required

GitHub Pages is static; placing OPENAI_API_KEY in \`lab/app.js\` or any HTML
file would disclose it to the public. The secret must remain in server-side
Vercel environment variables. A model request is optional; the site continues
to work if the gateway is off.

## Deployment safeguards

The endpoint remains hard-disabled until \`MEANING_PUBLIC_LLM_ENABLED=true\`.
All four settings below are mandatory before any model requests can occur:

- \`OPENAI_API_KEY\`: stored only in the serverless project.
- \`UPSTASH_REDIS_REST_URL\` and \`UPSTASH_REDIS_REST_TOKEN\`:
  a shared Redis quota store. In-memory per-instance counters are unsafe.
- \`MEANING_IP_HASH_SALT\`: random server-side salt for quota keys.

Optional:
- \`MEANING_LLM_MODEL=gpt-5.4-nano\` (default); evaluate quality first.
- \`MEANING_DAILY_GLOBAL=100\`: hard global calls/day (maximum allowed
  by current configuration code: 1000).
- \`MEANING_DAILY_PER_IP=5\`: maximum calls/day per visitor (maximum 50).
- \`MEANING_ALLOWED_ORIGINS\`: comma-separated extra trusted webpage origins,
  e.g. a preview domain.

If shared quota storage fails, the endpoint refuses the call. Origin checks
are **not authentication** and may be spoofed by non-browser clients; both
global and per-IP quotas are mandatory. Add bot controls before wider promotion.
Do not treat a daily request limit as a direct provider billing limit:
set a separate spend threshold/alert on the provider account.

Request body:
\`\`\`json
{"question":"Why was Pilbara North below June dispatch plan?"}
\`\`\`
Expected endpoint: \`POST https://<vercel-project-domain>/api/meaning\`.

This route deliberately refuses to accept arbitrary documents or real
company records. It reads the committed synthetic evidence only.

## Minimal cost assessment (illustrative, not a quote)

Using GPT-5.4 Nano public API prices of approximately US$0.20 per million
input and US$1.25 per million output tokens, a 3,000-input/500-output answer
costs about US$0.001225 in raw model tokens. At 100 answers/day for 30 days,
the model-token estimate is around US$3.68, excluding extra token use,
retries, rate-limit services, hosting and taxes. Costs vary with use/model.

## Release acceptance checks

- Gateway remains unavailable until backend-only key and shared quotas exist.
- No real employee/customer data or API credentials are committed.
- JSON schema response is validated; invented citations removed.
- Four measured failure cases demonstrate when to abstain.
- Test both legitimate multi-scope differences and genuine source conflicts.
- Real model quality measured separately from the seeded lexical baseline.
- Publish first behind a labelled **Experimental AI** panel; preserve current
  deterministic mode and the original explanation.
- Public rollout gated by spend controls, abuse tests and cross-origin tests.

## Next milestone after integration

Add a **separate semantic-proposal mode** which takes permitted observed
source fragments and returns: candidate terms, definitions, aliases,
source evidence IDs, owner suggestions and uncertainty. Only a human steward
can approve or publish a proposed definition. Compare model-derived
proposals with the 50-concept held-out benchmark; report accuracy and
false positives rather than calling a mere retrieval summary "discovery".
