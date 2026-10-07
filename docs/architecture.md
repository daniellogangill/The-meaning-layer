# Enterprise blueprint and implementation plan

## Organisation
Redgum Resources is a **fully fictional** diversified Australian mining company. HQ Perth; sites Pilbara North (iron ore), Pilbara South (iron ore), Copper Ridge (copper), and Westport Processing (processing and logistics).

Functions (12): Executive, Operations, Maintenance, Engineering, Geology, HSE, Finance, Procurement, Supply Chain, Sales, People, Technology & Data.

Hierarchy: CEO → executives → general managers → managers → team leaders → individual contributors. Reporting lines are explicit, not inferred from email tone. Seniority is not equivalent to factual authority; each concept has a designated accountable steward.

## Systems and artefacts
Simulated source families: ERP, EAM/asset maintenance, CRM, HRIS, procurement, SCADA/historian, document management, email, Teams, Jira, Confluence, Microsoft Whiteboard and Mural-like boards. Formats later include EML, DOCX, PPTX, XLSX, CSV, JSON and board exports. Source names represent emulated systems, not actual integrations.

## Deliberate complexity
- Polysemy: production, downtime, availability, cost, customer, asset
- Synonyms and aliases across sites and systems
- Missing or stale records, duplicates, contradictory claims
- Temporal changes and superseded policies
- Organisational reporting lines and delegations
- Document owners, authors, stewards and approvers
- Access controls, confidential material and purpose limitation
- Provenance, evidence confidence and competing interpretations
- Structured and unstructured representations
- Unrecorded decisions and informal practices

## Ground truth / observed data
Ground truth stores canonical entity IDs, time-scoped facts, authoritative definitions and permission policies. Synthetic observations are derived from that truth with controlled noise and documented deviations. Evaluation must never expose hidden truth to retrieval agents.

## Pipeline contract
Source registration → metadata discovery → access approval → read-only extraction → normalisation → classification → proposed entity/relationship extraction → steward review → versioned semantic publication → permission-aware reasoning.

Agents propose; humans approve. Every answer must cite supporting source IDs and distinguish official policy from observed practice. Denied sources are not indexed into user-visible search.

## Hero experience
Question: “Why has production at Pilbara North fallen below plan, and what should management do?”
Show a baseline answer using fragmented sources, then a governed answer with resolved definitions, evidence trails, temporal context, caveats and authorised access. Score against withheld truth: entity matching, definition selection, citation precision, permission compliance and answer accuracy.

## Initial technical approach
Python deterministic generator, newline-delimited JSON source records, explicit schemas and repeatable seeds. Later: relational metadata and approval state, search index, semantic graph, LLM-assisted extraction, evaluation harness, Next.js presentation. Avoid choosing paid infrastructure until the seed and evaluation design are proven.

## Delivery gates
1. Deterministic seed and schema checks.
2. Measured source quality and contradiction coverage.
3. Auditability and access-denial tests.
4. Baseline versus governed evaluation on held-out questions.
5. Executive usability testing.

This is a prototype, not a claim of enterprise production readiness.