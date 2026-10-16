# Prototype 4 sprint log

## Locked decisions
Guided five-stage executive journey first; progressive technical depth; enterprise AI decision reliability positioning. Only synthetic Redgum evidence. Curated versus computed versus live-model outputs must be distinguished. Maximum US$5/month **total incremental spend** (US$3 reserved model, US$2 infrastructure headroom); live model disabled until provider hard limit and infrastructure cost protections verified.

## Sprint 1 — 16 October 2026, 18:00 AEDT
Baseline: main 77b2495; no open PRs; GitHub Pages/UI/semantic CI green. Vercel production READY and /api/status reports deterministic_only, available=false.
Implemented standalone journey.html, responsive journey.css and journey.js: five-step navigation, Production/Finance/Safety scenarios, initial interpretation choice, original evidence inspector, seeded meaning cards, session-only simulated steward decisions and transparent curated comparison. Added guided entry from existing lab and jsdom regression tests.
Known limitation: steward review does **not yet** recompute curated interpretation. Do not claim causal or measured AI improvements. No paid services or model calls activated.
Validation: GitHub Actions UI smoke run 38865347131 passed, including JavaScript syntax and the new jsdom guided-journey regression tests. Vercel preview deployment for head 07b57c8 reports READY. Functional preview fetch could not be independently verified from the tool session; main and GitHub Pages remain unchanged. PR creation was blocked by tool safety checks, so the work remains on a reviewable feature branch, unmerged.

## Next
1. Improve source exploration, traceability and scope/authority filters.
2. Implement dependency-aware governance impact in comparison.
3. Improve independent quality measurement, mobile and accessibility tests.
4. Keep Vercel live-model gateway off until US$5 release gates pass.

## Sprint 2 — 16 October 2026, 19:00 AEDT
Baseline: branch 0c365fe, main unchanged at 77b2495, no open PRs. Existing UI CI green; Vercel production still deterministic-only.
Implemented source-evidence exploration in lab/journey.js: client-side search across scenario evidence text/title/IDs, filters for source system and business function, explicit result counts and no-match state, selection of two records for side-by-side original text comparison, and provenance (ID, site, date, function, source, classification, extracted lexical candidates). Scenario changes reset the local evidence selection. Meaning cards now show computed source-to-concept candidate links and distinguish these from approved meanings. Added responsive filter and comparison styling.
Validation: GitHub Actions UI runs 38870676858 and 38870702673 both succeeded, including node syntax and the existing jsdom guided-journey tests. Independently checked 12 referenced synthetic scenario records and seven feature contracts against the repository data; all 19 checks passed and 11 concepts have at least one candidate link in those records. Two additional source-integrity tests were committed in tests/test_evidence_smoke.cjs but are **not yet wired into the CI command**, so do not describe them as CI-passing. Latest feature preview reports READY; authenticated browser preview fetch remains unverified. PR creation and workflow modification were blocked by tool safety checks; work stays isolated on the feature branch, unmerged.
Costs: no model calls, paid services, new credentials or budget activation. Static GitHub Pages main remains unchanged.
Next: wire and run the new tests in CI if permitted; make simulated steward decisions have explicit, traceable impact on the comparison without claiming measured AI gains; complete responsive/browser verification.

## Sprint 3 — 16 October 2026, 20:00 AEDT
Baseline: main 77b2495 unchanged, branch e0a52b7; no open PRs. Previous guided UI CI succeeded; Vercel production /api/status remains deterministic_only and available=false.
Implemented an explicit, source-validated session-only stewardship policy in lab/decision-policy.js. The review action now changes a separate decision gate, not the fixed curated narrative or original records. Production approval endorses the mined-versus-dispatched distinction; Finance approval holds rather than resolves the competing forecasts; Safety remains abstain-and-escalate even when a visitor rejects the proposed hold. Added scenario review history, evidence and comparison IDs in the decision panel. No paid calls or real approvals.
Acceptance targets: all four review states across three scenarios, source-integrity and fail-closed tests, updated jsdom journey tests, and CI including previously unwired evidence-smoke tests. Browser-level preview verification and PR remain outstanding until confirmed.

## Sprint 4 — 16 October 2026, 21:00 AEDT
Baseline: branch 4205a7f, UI CI green (38878060277), Vercel preview READY, production /api/status deterministic_only and available=false, main GitHub Pages unchanged, no open PRs.
Implemented source-validated curated meaning relationships: two comparisons per scenario (six total). Step 3 shows scope distinctions versus true disagreements with definition, owner, reason and source IDs; Step 5 links the classification to its simulated governance gate. Added deterministic fail-closed tests and browser interaction coverage, wired to CI. This is authored classification over fictional records, not AI inference, approved ontology or measured model improvement.
No model calls, paid services, new credentials or infrastructure. Next: verify CI and authenticated preview, then improve accessibility and public integration without changing budget gates.
