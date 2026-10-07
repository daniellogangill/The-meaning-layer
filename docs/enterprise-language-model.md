# Enterprise language model — expanded specification

The six terms in the seed generator are illustrative fixtures, not the target ontology.

## Scale targets (synthetic, subject to validation)
- 500–800 distinct concepts
- 1,500–2,500 lexical labels, aliases, acronyms and synonyms
- 1,000–2,000 contextual definitions
- 200–400 genuine conflicts requiring resolution
- 300–500 rules, exceptions and calculation conventions
- 2,000+ typed relationships

## Model objects
Concept (stable ID); term (literal and language); definition (meaning and scope); organisational context (function, site, process, system); policy/rule; source assertion; evidence; steward; effective date/version; approval state; permission scope; relationship; contradiction or equivalence claim.

## Do not conflate
- Polysemy: same label, different valid concepts (e.g. availability)
- Synonymy: different labels, same concept (e.g. equipment ID / asset number, context-dependent)
- Near equivalence: concepts overlap but are not identical
- True contradiction: incompatible assertions about the same concept, scope and effective period
- Version drift: historically correct definition now superseded
- Local variation: legitimate site- or system-specific meaning

## Generation approach
Create a curated concept catalogue first, with mining-specific functions and operations. Generate multiple context-specific definitions and labels, with explicit mappings to concepts. Produce observations and artefacts from this catalogue with controlled noise. Preserve a withheld ground-truth mapping for evaluation. Do not generate hundreds of random 'conflicts' by swapping definitions without a valid shared scope.

## Demonstration metrics
Coverage by function/site/system; ambiguity detection precision; concept-linking accuracy; valid versus false conflict detection; steward resolution rate; source provenance; time-scoped correctness; access-policy compliance.

## Release gates
Phase A: 50 hand-authored, reviewed concepts with rich variants.
Phase B: 500+ concepts and 1,500+ terms, with coherence and referential-integrity tests.
Phase C: evidence-backed semantic discovery from realistic multi-format artefacts.
