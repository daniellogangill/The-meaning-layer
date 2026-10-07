# Sprint 2 — Semantic discovery experiment

## Objective
Demonstrate discovery of enterprise meaning from realistic synthetic evidence without leaking hidden ground truth.

## First vertical slice
Focus on Pilbara North production underperformance and the overlapping meanings of production, downtime, availability, throughput, asset, plan, cost, incident and customer.

## Implementation order
1. Curate 50 concepts across Operations, Maintenance, Finance, HSE, Supply Chain and Technology & Data. Assign stable IDs and context-scoped definitions.
2. Generate terms, synonyms, acronyms, temporal versions, calculation rules and source assertions. Validate referential integrity.
3. Render varied evidence: emails, Teams-style threads, work orders, policies, operating reports and meeting minutes. Add metadata, timestamps, owners and access labels.
4. Split canonical ground truth from observed evidence. Never expose the former to the discovery process.
5. Implement deterministic candidate extraction and matching baseline before adding LLM proposals.
6. Evaluate concept linking, ambiguous terms, legitimate contextual differences, actual contradictions, evidence citations and access-policy compliance.
7. Present an executive-friendly comparison of naive retrieval versus governed reasoning.

## Acceptance criteria
- At least 50 reviewed concepts and 150 lexical variants in the first vertical slice.
- At least 6 departments and 4 source families represented.
- Every generated assertion has a traceable source ID and effective timestamp.
- Access-denied records never appear in consumer answers.
- Reproducible generation and machine-checkable evaluation.
- Publish precision and recall scores with denominators; do not claim success from anecdotal examples.

## Scaling path
Expand to 500–800 concepts, 1,500–2,500 terms and 100–300 MB corpus only after the first slice is coherent. Add native Office formats and richer hierarchy-aware permission rules in subsequent increments.
