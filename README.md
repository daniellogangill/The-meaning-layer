# The Meaning Layer

**What it really takes to make enterprise AI work.**

An executive-oriented, technically grounded demonstration of turning fragmented enterprise information into governed, traceable meaning.

## Fictional enterprise: Redgum Resources
- 5,000 synthetic employees
- Iron ore and copper operations across four sites
- 12 business functions and a hierarchical reporting structure
- Fragmented systems, contradictory definitions, permission boundaries and changing facts

All data is synthetic. Do not ingest real customer or employee records.

## Design
1. **Ground truth:** private canonical entities, roles, definitions, events and relationships.
2. **Enterprise mess:** generated documents, messages, records and conflicting assertions derived from ground truth.
3. **Governed discovery:** source inventory, access requests, approvals, read-only ingestion and audit trail.
4. **Meaning discovery:** entity resolution, term disambiguation, relationship proposals and contradiction detection.
5. **Human validation:** steward decisions, evidence and versioned publication.
6. **Consumption:** permission-aware answers with citations, uncertainty and before/after comparisons.

## First milestone
Run the small deterministic dataset generator:

```bash
python3 src/generate_seed.py --out data/seed --employees 5000 --artifacts 10000 --seed 42
```

Generated data under `data/` is ignored by Git. The first seed is structural, not a validated realistic enterprise corpus.

## Roadmap
- Sprint 1: enterprise blueprint, repeatable generator, schema and tests
- Sprint 2: native artefact formats and realistic conversations
- Sprint 3: governance and ingestion pipeline
- Sprint 4: ontology, semantic graph and measured reasoning
- Sprint 5: public executive walkthrough on Design My Thinking

See [architecture](docs/architecture.md).