# E1 — held-out semantic-discovery evaluation (deterministic baseline)

This experiment runs **separately** from the working public v2 lab. It neither replaces the published dataset nor changes the seven existing workbenches. It uses fictional Redgum Resources-style evidence only. No network requests, employee records, API keys, or paid models.

## Design and leakage boundary

- 50 **authored synthetic** business concepts across Operations, Maintenance, Finance, HSE and Supply Chain; intentionally overlapping labels include *availability*, *cost* and *exposure*.
- 200 authored alias/surface variants appear in **200 discovery documents** (four independently named variants per concept). The induction engine reads these observed documents, but never the authoring cards or gold labels. It induces term, scope and a proposed definition using four general language patterns; each proposal carries four source IDs and unapproved status.
- 900 **held-out documents**: 600 positive mentions, 250 eligible negatives (negations, obsolete definitions and unrelated distractors), and 50 restricted records withheld from inference. Some positive mentions have no previously seen alias or have missing context.
- Independent *files* hold the gold concept identities and eligible/negative decisions. The test removes the truth directory before induction and inference to demonstrate separation. **The annotations are not independently human-judged**: the synthetic generator authors both the source scenario and its expected label. This is a reproducible engineering benchmark, not external validity.
- Inference is evaluated only against held-out documents. No gold dictionary, aliases, concept IDs or truth labels are passed to the extractor or linker. Gold files are opened exclusively by the scorer after predictions have been made.

## Reproduce

```bash
python -m unittest discover -s tests -v
python -m src.heldout_discovery --root data/heldout --output data/heldout-report.json
```

The report contains all proposed definitions, supporting discovery evidence, aggregate metrics and an inspectable list of false positives and misses. The workflow uploads the report and manifest but not raw hidden truth. The report contains **synthetic** source excerpts.

## Local baseline results (seed 73)

| Metric | Literal induced-alias lookup | Scoped, negation-aware baseline |
| --- | ---: | ---: |
| True positive links | 487 | 528 |
| False positive links (including wrong concepts) | 203 | 20 |
| False negatives (including wrong concepts) | 113 | 72 |
| Precision = TP / (TP + FP) | 70.58% | 96.35% |
| Recall = TP / (TP + FN) | 81.17% | 88.00% |
| False-positive rate on 250 negative records | 77.60% | 8.00% |
| Abstentions | 160 | 302 |
| Restricted documents excluded | 50 | 50 |

**Metric nuance:** Wrong-concept links count as both FP and FN, as in micro-averaged multiclass linking. True negatives and the false-positive rate use only the 250 gold-negative records. Precision and recall are *source-to-concept linking*, not an evaluation of whether a free-text definition is correct. All selected proposals carry observed discovery-source citations; their existence is not evidence that a real-world claim is true.

## What is actually implemented

The engine **induces a dictionary from observed definitional language** rather than reading a seeded concept catalogue at prediction time. It then applies observed aliases, scope, negation/supersession filters and literal definition overlap to held-out evidence. This is more demanding than a seeded lexical lookup, but it is **still deterministic, syntax-bound and not LLM semantic extraction**. In particular, it does not understand arbitrary paraphrases, infer ontology relationships, resolve missing scope, adjudicate conflicting authorities, or perform human review. The 50 concept cards and four discovery templates were deliberately designed for this test, so the results should not be interpreted as enterprise accuracy.

## Next meaningful acceptance gate

Introduce independently written and human-adjudicated held-out records, unseen terminology and adversarial document structures; freeze the benchmark before iterating on extraction. Compare this deterministic model against an optional local/offline model on identical evidence, and score definition quality, citation entailment, cross-document relations, temporal authority and permissions separately. Only after passing that gate should an experimental panel be linked into the public lab, clearly distinguished from its curated narrative.
