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
