/* Prototype 4 governance policy: deterministic, fictional, session-only.
 * A steward's simulated action changes decision readiness, never source facts.
 * Neither approval nor rejection can override unresolved safety evidence.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MeaningDecisionPolicy=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const POLICIES=Object.freeze({
    production:{
      review:'P-001',comparison:'D-001',
      outcomes:{
        approve:['Scoped distinction accepted','The simulated steward has accepted the mined-versus-dispatched boundary. The two measures can now be interpreted separately in this session.','Scope-aware interpretation is supported; the causes of the dispatch shortfall still require investigation.'],
        defer:['Scope review deferred','The proposed boundary has not been accepted. Treat the distinction as an evidence-backed candidate rather than governed meaning.','Keep the interpretation provisional and request steward confirmation.'],
        reject:['Scope proposal rejected','The proposed boundary is not endorsed in this simulation. The figures still refer to different described measures; rejecting a proposal does not make them numerically comparable.','Do not present this definition as governed. Return the proposal to the Operations steward.'],
        pending:['Scope awaiting review','The source records and curated distinction are visible, but no simulated steward has accepted the proposed definition.','Inspect the evidence and record a stewardship decision before treating the distinction as governed.']
      }
    },
    finance:{
      review:'P-003',comparison:'D-004',
      outcomes:{
        approve:['Forecast placed on hold','The simulated steward has accepted the hold proposal. Neither A$13.7m nor A$14.2m becomes the approved commitment forecast.','Block reliance on either forecast until Finance verifies the approved version and effective date.'],
        defer:['Forecast hold deferred','The hold proposal remains unapproved. The same-scope A$13.7m and A$14.2m forecasts still disagree.','Escalate version and authority checks; do not select a forecast value.'],
        reject:['Forecast hold rejected','The hold proposal is rejected, not the conflicting evidence. Neither forecast has been validated or made authoritative.','Seek an alternative authorised reconciliation; do not silently select the larger or newer value.'],
        pending:['Forecast conflict unresolved','No simulated review has addressed the conflicting commitment forecasts.','Request a Finance steward review of version, sign-off and effective date.']
      }
    },
    safety:{
      review:'P-004',comparison:'D-005',
      outcomes:{
        approve:['Safety abstention endorsed','The simulated HSE review accepts the recommendation to withhold a permit-status conclusion. This does not certify the permit as open or closed.','Do not authorise work; verify original permit sign-off with the authorised HSE owner.'],
        defer:['Safety review deferred','Permit records conflict at the same timestamp and the review remains open. No safe status can be inferred.','Do not authorise work; escalate for direct HSE verification.'],
        reject:['Safety proposal rejected — work still blocked','Rejecting the proposed abstention does not resolve the contradictory permit records or establish a safe status.','Do not authorise work; obtain verified permit status from the authorised HSE owner.'],
        pending:['Safety status unverified','The source conflict is unresolved. Without authoritative verification, the permit status is unknown.','Do not authorise work; escalate to the authorised HSE owner.']
      }
    }
  });
  const CHOICES=['approve','defer','reject'];
  function evaluate(scenario,decision,dataset){
    const policy=POLICIES[scenario];
    if(!policy)throw new Error('Unknown scenario');
    if(decision!==null&&!CHOICES.includes(decision))throw new Error('Invalid review decision');
    if(!dataset||!Array.isArray(dataset.reviews)||!Array.isArray(dataset.comparisons)||!Array.isArray(dataset.records))throw new Error('Missing evidence dataset');
    const review=dataset.reviews.find(x=>x.id===policy.review);
    const comparison=dataset.comparisons.find(x=>x.id===policy.comparison);
    if(!review||!comparison)throw new Error('Required review or comparison missing');
    if(review.concept!==comparison.concepts[0]&&scenario!=='production')throw new Error('Proposal scope mismatch');
    const ids=[...new Set([...(review.sources||[]),...(comparison.sources||[])])];
    if(ids.length<2||ids.some(id=>!dataset.records.some(r=>r.id===id&&r.classification!=='restricted')))throw new Error('Missing or restricted evidence');
    const outcome=policy.outcomes[decision||'pending'];
    return Object.freeze({
      scenario,decision,reviewId:review.id,comparisonId:comparison.id,
      status:decision||'pending',label:outcome[0],effect:outcome[1],nextStep:outcome[2],
      evidenceIds:Object.freeze(ids),comparisonReason:comparison.reason,
      comparisonKind:comparison.kind,
      approvedMeaning:scenario==='production'&&decision==='approve',
      heldForecast:scenario==='finance'&&decision==='approve',
      mustAbstain:scenario==='safety',
      isRealApproval:false,
      sourceFactsChanged:false
    });
  }
  return Object.freeze({evaluate});
});
