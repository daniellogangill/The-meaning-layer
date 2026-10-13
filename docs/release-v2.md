# Meaning Layer Lab v2 — release notes and next research sprint

## What now works

The public homepage at https://daniellogangill.github.io/The-meaning-layer/
is an interactive **synthetic** experiment, not a live enterprise AI service.

**Seven workbenches:**
1. Executive intelligence: four executive scenarios, curated interpretation,
   naïve-versus-governed framing, source-linked retrieval and custom queries.
2. Source explorer: search and filter raw evidence by site, function and system;
   inspect extracted candidates and original source text.
3. Meaning studio: inspect concept definitions, aliases, owners and evidence.
4. Knowledge graph: browse a real concept-to-document projection, aggregated by site.
5. Conflict lab: inspect deterministic, source-linked assertion findings alongside
   authored comparisons of legitimate scope differences and true discrepancies.
6. Stewardship: approve, reject or defer seed proposals **locally in the browser**.
7. Pipeline & tests: honest reproducible metrics, provenance and open gaps.

The current generated public snapshot contains 139 source records, 18 seeded
business concepts, nine source families, 40 irrelevant/distractor records,
four metadata-only restricted placeholders and four executive scenarios.
The extractor proposes candidates from observed text without reading gold labels;
the hidden benchmark scores whether expected concepts were found in candidates.
These records are intentionally small enough to inspect interactively.

**Important distinctions:**
- Narrative recommendations are **curated** and are not automatically generated.
- Lexical concept discovery, retrieval, graph links and rule-based findings
  are **computed** from generated records.
- Terms start from a seeded dictionary: the system has not induced a novel
  ontology from scratch.
- Browser approvals are an interaction simulation; there is no authenticated
  publication service.
- No restricted content is shipped in the public JSON; this does not constitute
  production-grade authorisation.

## Reproduce locally

No third-party Python packages required:

    python -m unittest discover -s tests -v
    python -m src.meaning_lab --output lab/data.json
    python -m src.semantic_experiment --out data/experiment --seed 42
    python -m src.discover --root data/experiment --output data/results.json

To view the interactive site, serve the repo root (rather than opening a file):

    python -m http.server 8000

Then open http://localhost:8000.

Smoke-test frontend interactions in CI with Node 22 and jsdom 26.
The release pipeline refuses to commit the generated public dataset if tests fail.

## Next experiments, in priority order

### E1 — Genuine meaning *discovery* with held-out truth

Build a 50-concept benchmark of source conversations with no canonical terms
exposed to the extractor. Implement an optional tightly budgeted model step
that proposes names, aliases, definitions, relations and conflict scope with
evidence IDs. Compare against lexical and rules baselines. Report precision,
recall, evidence citation accuracy, abstentions and false positives. Include
source/version/time adversarial records. Seed corpus remains separate from
model prompts; no secrets committed.

**Done when:** at least 50 concepts, 200 independent variations, 1,000 source
records; reproducible evaluations with inspectable false positives and a
model-on/model-off comparison. All metrics must have a clear denominator.

### E2 — Governed publication workflow

Implement a backend schema containing concepts, definitions, source evidence,
aliases, approvals, effective dates, owners, tenant roles, and versioned decisions.
Use server-side auth and permission filtering *before* retrieval; store audit
events and allow rollback. Separate suggestions from published governance.

**Done when:** two role-bound reviewers can approve conflicting definitions
without any private data reaching an unauthorised browser or API caller.

### E3 — Multi-hop semantic question answering

An agent resolves query intent and scope, searches permission-filtered
evidence, checks time/authority, answers with citations, abstains when needed,
and proposes responsible actions. Measure answer consistency with an
independent adjudication set. Show each intermediate reasoning artefact in
the UI rather than a single opaque response.

**Done when:** custom questions beyond four seed scenarios are grounded in
retrieved evidence, with uncertainty and inspectable provenance.

### E4 — Enterprise scale

Extend beyond the current 139-record public slice into a 5,000-employee,
30+-system, 500–800-concept synthetic organisation. Increase source volume in
measurable stages (10k → 100k documents) using deterministic, reproducible
snapshots. Preserve independent hidden truth and realistic permission rules.
Prefer Postgres and batch processing initially over unnecessary infrastructure.

**Done when:** benchmark quality and query latency remain measurable at each
scale gate. Do not silently inflate examples with near-identical templates.

### E5 — Portfolio-quality public experience

Connect genuine experiment runs to the executive story with two clearly
labelled modes: **illustrative story** and **live experiment**. Show dataset
lineage, cost, accuracy, example successes/failures, graph evolution, and
steward decisions. Once reliable, integrate into designmythinking.xyz.

## Guardrails

All public content is fictional. Do not connect real corporate repositories.
Do not display an API key, real customer data or identifiable employee data.
Never describe predetermined narrative outcomes as model discoveries. A
public frontend must never rely on client-side hiding to protect restricted data.
