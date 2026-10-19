"""Meaning Layer Lab: reproducible, provenance-aware synthetic discovery snapshot.

This module produces an open, shareable demonstration corpus. It does not
use an LLM. Its entity and concept candidates come from reading *observed*
text, while hidden ground-truth labels are used only for benchmark scoring.
The public snapshot never contains restricted record bodies.
"""
from __future__ import annotations
import argparse
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

SITES = ["Pilbara North", "Pilbara South", "Copper Ridge", "Perth HQ"]
SOURCES = ["Teams", "Email", "ERP", "Shift log", "Maintenance CMMS", "Meeting notes",
           "Policy library", "Procurement", "Safety register"]
FUNCTIONS = ["Operations", "Maintenance", "Finance", "Supply Chain", "HSE",
             "Technology", "People", "Commercial", "Legal", "Strategy", "Projects", "Geology"]
CONCEPTS = [
    {"id":"production-mined","name":"Mined tonnes","owner":"Operations","aliases":["tonnes mined","ore extracted","mined tonnes","mine production"],"definition":"Tonnes of ore physically extracted before processing or quality adjustment."},
    {"id":"production-dispatched","name":"Saleable tonnes dispatched","owner":"Supply Chain","aliases":["saleable tonnes","shipped ore","tonnes dispatched","saleable production"],"definition":"Finished saleable tonnes dispatched to customers after processing and quality checks."},
    {"id":"production-plan","name":"Dispatch plan","owner":"Strategy","aliases":["dispatch plan","shipment target","saleable tonnes target","dispatch target"],"definition":"Approved plan for saleable tonnes dispatched during the reporting window."},
    {"id":"mechanical-availability","name":"Mechanical availability","owner":"Maintenance","aliases":["mechanical availability","mechanical ready","equipment availability","fleet mechanical"],"definition":"Time-based mechanical capacity to operate, excluding operational readiness constraints."},
    {"id":"operational-readiness","name":"Operational readiness","owner":"Operations","aliases":["operational readiness","fleet readiness","ready-to-dispatch","standby coverage"],"definition":"Operational capability including shift allocation, standby and dispatch requirements."},
    {"id":"crusher-downtime","name":"Crusher downtime","owner":"Maintenance","aliases":["crusher downtime","crusher trip","unplanned stoppage","lost crushing hours"],"definition":"Scheduled crushing time unavailable because of a crusher fault or trip."},
    {"id":"ore-grade","name":"Ore grade","owner":"Geology","aliases":["ore grade","iron grade","fe assay","fe percentage"],"definition":"Measured iron content of feed material, under a stated assay method."},
    {"id":"recognized-expense","name":"Recognised expense","owner":"Finance","aliases":["recognised expense","actual expense","booked opex","posted cost"],"definition":"Expense recognised in the general ledger for the accounting period."},
    {"id":"purchase-commitment","name":"Purchase commitments","owner":"Supply Chain","aliases":["purchase commitments","committed spend","open purchase orders","committed cost"],"definition":"Approved financial obligations not necessarily recognised as expenses."},
    {"id":"forecast-commitment","name":"Forecast commitments","owner":"Finance","aliases":["forecast commitments","commitment forecast","june committed forecast"],"definition":"Expected commitments used for the forward-looking financial view."},
    {"id":"maintenance-backlog","name":"Maintenance backlog","owner":"Maintenance","aliases":["maintenance backlog","overdue work orders","deferred maintenance","backlog items"],"definition":"Open maintenance work not yet performed, assessed against priority and due date."},
    {"id":"spares-leadtime","name":"Spares lead time","owner":"Supply Chain","aliases":["spares lead time","parts lead time","vendor delivery window","replacement lead time"],"definition":"Expected number of calendar days until a critical replacement part is received."},
    {"id":"safety-nearmiss","name":"Near miss","owner":"HSE","aliases":["near miss","near-miss","unsafe occurrence","precursor event"],"definition":"Safety occurrence with potential to cause harm but no reportable injury."},
    {"id":"recordable-injury","name":"Recordable injury","owner":"HSE","aliases":["recordable injury","recordable incident","injury count","trifr event"],"definition":"Injury meeting the internal safety recording threshold; excludes near misses."},
    {"id":"isolation-permit","name":"Isolation permit status","owner":"HSE","aliases":["isolation permit","permit status","equipment isolation","permit closure"],"definition":"Governed safety authorisation status for an asset at a specific time."},
    {"id":"project-milestone","name":"Project milestone","owner":"Projects","aliases":["milestone","project gate","commissioning gate","stage approval"],"definition":"A dated delivery commitment or decision gate on a capital project."},
    {"id":"contract-obligation","name":"Customer obligation","owner":"Commercial","aliases":["contract obligation","delivery commitment","customer agreement","minimum delivery"],"definition":"Binding obligation based on an executed customer contract, distinct from sales aspiration."},
    {"id":"asset-identity","name":"Asset identity","owner":"Maintenance","aliases":["crusher c-17","c17 crusher","cr17","crusher 17"],"definition":"Canonical equipment identity across CMMS, finance asset register and shift systems."}
]
# Curated observed assertions: the hidden concept_id is discarded before discovery.
# Different semantic scopes deliberately reuse everyday words.
CLAIMS = [
 ("PN-01","Operations","Shift log","Pilbara North","production-mined","Mine control logged 48,100 tonnes mined in the June reporting period at Pilbara North.","2026-06-30"),
 ("PN-02","Supply Chain","ERP","Pilbara North","production-dispatched","Dispatch reconciled 42,800 saleable tonnes shipped during June at Pilbara North.","2026-06-30"),
 ("PN-03","Strategy","Meeting notes","Pilbara North","production-plan","The approved June dispatch target for Pilbara North remained 46,000 tonnes.","2026-06-30"),
 ("PN-04","Maintenance","Maintenance CMMS","Pilbara North","crusher-downtime","Crusher C-17 suffered two trips; lost crushing hours totalled 7.5 over 3–6 June.","2026-06-06"),
 ("PN-05","Maintenance","Maintenance CMMS","Pilbara North","mechanical-availability","Fleet mechanical availability averaged 81% in June against a 90% target.","2026-06-30"),
 ("PN-06","Operations","Teams","Pilbara North","operational-readiness","Dispatch reported fleet readiness at 88% in June after assigning the standby truck.","2026-06-30"),
 ("PN-07","Geology","Shift log","Pilbara North","ore-grade","June Fe assay for Pilbara North feed returned 58.1%, below the 60% planning assumption.","2026-06-30"),
 ("PN-08","Maintenance","Email","Pilbara North","asset-identity","Engineering confirmed CR17 and Crusher C-17 refer to the same machine; update the CMMS alias.","2026-06-09"),
 ("PN-09","Maintenance","Meeting notes","Pilbara North","maintenance-backlog","Four high-priority overdue work orders remain in the C-17 maintenance backlog.","2026-06-09"),
 ("PN-10","Supply Chain","Procurement","Pilbara North","spares-leadtime","The drive-unit vendor quoted a 12-day replacement lead time for C-17, not the requested five days.","2026-06-10"),
 ("PN-11","Operations","Email","Pilbara North","crusher-downtime","Shift supervisor says crusher trip losses appear material, but a causal contribution to the monthly shortfall is not yet quantified.","2026-06-11"),
 ("PN-12","Finance","ERP","Pilbara North","recognized-expense","Recognised expense for June stood at $12.4m in the finance ledger.","2026-06-30"),
 ("PN-13","Supply Chain","Procurement","Pilbara North","purchase-commitment","Open purchase orders and other committed spend reached $13.7m for June on a procurement basis.","2026-06-30"),
 ("PN-14","Finance","Email","Pilbara North","forecast-commitment","The June commitment forecast for Pilbara North was $13.7m as signed off in the 9am pack.","2026-06-30"),
 ("PN-15","Finance","Meeting notes","Pilbara North","forecast-commitment","The June commitment forecast was $14.2m in the revised 11am pack; finance has not reconciled the difference.","2026-06-30"),
 ("PN-16","HSE","Safety register","Pilbara North","safety-nearmiss","Three near-miss events were reported around the crusher walkway in June; no injury was recorded.","2026-06-30"),
 ("PN-17","HSE","Safety register","Pilbara North","recordable-injury","The June recordable injury count at Pilbara North was zero.","2026-06-30"),
 ("PN-18","HSE","Safety register","Pilbara North","isolation-permit","Isolation permit for Crusher C-17 was marked closed at 16:00 on 6 June.","2026-06-06"),
 ("PN-19","Maintenance","Teams","Pilbara North","isolation-permit","Handover at 16:00 on 6 June still describes the C-17 isolation permit as open. Verification required.","2026-06-06"),
 ("PN-20","Projects","Meeting notes","Pilbara North","project-milestone","The crusher reliability upgrade commissioning gate moved to 24 July pending instrumentation validation.","2026-06-14"),
 ("PN-21","Commercial","Email","Pilbara North","contract-obligation","Commercial warned the July minimum delivery obligation is 45,000 saleable tonnes, not mined tonnes.","2026-06-25"),
 ("PN-22","Operations","Teams","Pilbara North","production-dispatched","Operations chat used the phrase 'production' for the shipped ore figure of 42,800t; dispatch owns this boundary.","2026-06-30"),
 ("PN-23","Operations","Meeting notes","Pilbara North","production-mined","Operations used 'production' for 48,100 mined tonnes in the same June discussion; reporting boundaries must not be merged.","2026-06-30"),
 # Cross-functional synthetic records added to illustrate multi-hop, evidence-backed
 # connections between operational metrics, source systems and decisions.
 ("PN-24","Operations","Shift log","Pilbara North","production-mined","A June reconciliation distinguishes 48,100 mined tonnes from 42,800 saleable tonnes dispatched; the dispatch plan is a shipment target, not a mine extraction target.","2026-07-01"),
 ("PN-25","Maintenance","Maintenance CMMS","Pilbara North","crusher-downtime","Reliability review links Crusher C-17's lost crushing hours to a separate mechanical availability measure; the effect on saleable tonnes is unquantified.","2026-07-01"),
 ("PN-26","Supply Chain","Procurement","Pilbara North","spares-leadtime","The 12-day spares lead time for Crusher C-17 is being tracked with four overdue work orders in the maintenance backlog; no causal delay estimate was approved.","2026-06-12"),
 ("PN-27","Geology","Email","Pilbara North","ore-grade","The feed ore grade assumption and finished saleable tonnes dispatched are different measurements. Geology requested a reconciled yield report before blaming the dispatch variance on grade.","2026-07-01"),
 ("PN-28","Commercial","Email","Pilbara North","contract-obligation","July's minimum delivery commitment depends on saleable tonnes dispatched, not tonnes mined. Commercial requested a joint Operations and Supply Chain review of the customer obligation.","2026-07-02"),
 ("PN-29","Finance","ERP","Pilbara North","recognized-expense","The $12.4m recognised expense is an accounting posting measure. The commitment forecast and purchase commitments use different dates and reporting boundaries.","2026-07-01"),
 ("PN-30","Supply Chain","Procurement","Pilbara North","purchase-commitment","Procurement reported $13.7m of purchase commitments while Finance reviewed two versions of the June commitment forecast; approval status remains unresolved.","2026-07-01"),
 ("PN-31","Finance","Meeting notes","Pilbara North","forecast-commitment","Steward review action: reconcile the 9am $13.7m commitment forecast with the revised 11am $14.2m version before board reporting.","2026-07-01"),
 ("PN-32","HSE","Safety register","Pilbara North","isolation-permit","Safety assurance noted a disputed Crusher C-17 isolation permit status at 16:00 on 6 June. Three near-miss events are separate from the permit closure decision.","2026-07-01"),
 ("PN-33","Maintenance","Maintenance CMMS","Pilbara North","maintenance-backlog","The C-17 maintenance backlog includes four overdue work orders; work execution must not proceed based on an unverified isolation permit status.","2026-07-02"),
 ("PN-34","Projects","Meeting notes","Pilbara North","project-milestone","Crusher C-17 commissioning gate review requires evidence of the authorised isolation permit status as well as instrument sign-off; the milestone is not a safety authorisation.","2026-07-02"),
 ("PN-35","Technology","Policy library","Pilbara North","asset-identity","The CMMS alias CR17 resolves to Crusher C-17, but cross-system joins must preserve source identity, event time and stewardship instead of treating all observations as authoritative.","2026-07-01"),
 ("PS-01","Operations","Shift log","Pilbara South","production-mined","Pilbara South extracted 53,200 mined tonnes during June.","2026-06-30"),
 ("PS-02","Supply Chain","ERP","Pilbara South","production-dispatched","The southern plant dispatched 49,850 saleable tonnes over June.","2026-06-30"),
 ("PS-03","Maintenance","Maintenance CMMS","Pilbara South","mechanical-availability","Mechanical availability for the south fleet held at 93% in June.","2026-06-30"),
 ("PS-04","Geology","Shift log","Pilbara South","ore-grade","Ore grade for the Pilbara South June feed averaged 61.2% Fe.","2026-06-30"),
 ("CR-01","Operations","Shift log","Copper Ridge","production-mined","Copper Ridge recorded 21,600 tonnes mined from the open pit in June.","2026-06-30"),
 ("CR-02","Maintenance","Maintenance CMMS","Copper Ridge","maintenance-backlog","Copper Ridge has 11 overdue work orders classified medium-priority in the backlog.","2026-06-30"),
 ("HQ-01","Finance","ERP","Perth HQ","recognized-expense","The consolidated board pack lists $36.2m recognised expense across Australian operations.","2026-06-30"),
 ("HQ-02","Technology","Policy library","Perth HQ","asset-identity","Asset naming policy requires CMMS identity resolution before joining shift records to finance records.","2026-05-20"),
 ("HQ-03","Legal","Policy library","Perth HQ","contract-obligation","Contract interpretations must cite the signed agreement and effective-date schedule.","2026-05-20"),
 ("HQ-04","Strategy","Meeting notes","Perth HQ","production-plan","Corporate strategy calls the monthly dispatch plan a shipment target, not physical mine production.","2026-05-27")
]
CONTEXT_EXTRAS = [
 "Draft forwarded from the weekly operations pack; please check the definition before using it externally.",
 "This line has been discussed across teams and still needs an accountable owner.",
 "Note: the source system's label does not necessarily match the board dashboard's label.",
 "Please retain this source record for traceability; figures have not been signed off for executive use.",
 "Action from handover: check the date, site boundary and unit of measurement."
]
SOURCE_INTROS = {
 "Teams":["Quick update for the channel: ","From this morning's stand-up: ","Cross-team heads-up — "],
 "Email":["Team, for context: ","As requested, here's what I found: ","Follow-up from the shift call: "],
 "ERP":["Ledger extract: ","Operational transaction summary: ","Period-end reconciliation: "],
 "Shift log":["Shift-end entry: ","Night shift observation: ","Control room log: "],
 "Maintenance CMMS":["CMMS work-order note: ","Maintenance inspection record: ","Reliability review: "],
 "Meeting notes":["Minutes / unresolved action: ","Working session summary: ","Decision log: "],
 "Policy library":["Policy reference: ","Operating convention: ","Governance note: "],
 "Procurement":["Supplier desk update: ","Purchase-order review: ","Procurement escalation: "],
 "Safety register":["Register entry: ","Safety assurance record: ","HSE investigation note: "]
}
ENTITY_ALIASES = {
 "SITE-PN":["Pilbara North"],"SITE-PS":["Pilbara South"],"SITE-CR":["Copper Ridge"],
 "SITE-HQ":["Perth HQ"],"ASSET-C17":["Crusher C-17","C-17","CR17","C17 crusher"]
}
# Metadata-only records intentionally excluded from the public knowledge corpus.
RESTRICTED = [
 ("R-001","Legal","Email","Pilbara North","2026-06-21"),
 ("R-002","People","Teams","Perth HQ","2026-06-21"),
 ("R-003","Commercial","ERP","Pilbara North","2026-06-23"),
 ("R-004","HSE","Safety register","Pilbara North","2026-06-24")
]
QUESTIONS = [
 {"id":"production","title":"Why is production below plan?","ask":"Why did Pilbara North miss the June dispatch plan?",
  "intent":["production-dispatched","production-plan","production-mined","crusher-downtime","mechanical-availability","operational-readiness","ore-grade"],
  "lead":"June dispatch was 42,800 saleable tonnes against a 46,000-tonne plan: a shortfall of 3,200 tonnes (7.0%). Mine control's 48,100 tonnes mined is a different measure, not an opposing dispatch figure.",
  "insight":"Crusher C-17 lost 7.5 scheduled hours, mechanical availability averaged 81%, and feed grade was below assumption. These are plausible contributors, not a quantified causal attribution.",
  "decision":"Request Operations and Maintenance to quantify each driver and reconcile grade-to-saleable-tonnes losses before selecting a remedy."},
 {"id":"availability","title":"Is C-17 really available?","ask":"Why do Operations and Maintenance disagree on fleet availability?",
  "intent":["mechanical-availability","operational-readiness","crusher-downtime","spares-leadtime","maintenance-backlog","asset-identity"],
  "lead":"Maintenance reports 81% mechanical availability while Operations reports 88% fleet readiness. These have different operational boundaries, so the numbers should not be averaged or marked as a numerical contradiction.",
  "insight":"C-17 suffered two trips; four high-priority work orders remain overdue, while the vendor quoted a 12-day lead time. The current sources cannot prove the cause of either availability figure.",
  "decision":"Assign Maintenance ownership for the mechanical metric, Operations for readiness and Supply Chain for parts timing. Validate the CMMS alias CR17 → C-17."},
 {"id":"finance","title":"Why don't costs reconcile?","ask":"Why does Finance disagree with Procurement about costs?",
  "intent":["recognized-expense","purchase-commitment","forecast-commitment"],
  "lead":"$12.4m of recognised expense and $13.7m of purchase commitments are different accounting boundaries and need not match.",
  "insight":"Two separate June commitment-forecast records disagree ($13.7m versus $14.2m). Because they name the same metric, site and reporting period, this requires reconciliation of the version and approval history.",
  "decision":"Ask the Finance steward to identify the approved forecast version and record a governed effective date."},
 {"id":"safety","title":"Can we trust the safety position?","ask":"Were June safety records consistent for Crusher C-17?",
  "intent":["safety-nearmiss","recordable-injury","isolation-permit"],
  "lead":"Three near misses and zero recordable injuries are different event classes; there is no inherent numerical contradiction.",
  "insight":"The permit register says the C-17 isolation permit was closed at 16:00 on 6 June. A same-time handover says it remained open. This is an unresolved safety-critical assertion conflict.",
  "decision":"Escalate to the authorised HSE permit owner and verify the original sign-off before any operational reliance."}
]
REVIEW = [
 {"id":"P-001","concept":"production-mined","proposal":"Keep mined tonnes distinct from dispatched tonnes.","owner":"Operations","sources":["PN-01","PN-23"],"risk":"high"},
 {"id":"P-002","concept":"operational-readiness","proposal":"Treat fleet readiness as a separate scope from mechanical availability.","owner":"Operations","sources":["PN-05","PN-06"],"risk":"medium"},
 {"id":"P-003","concept":"forecast-commitment","proposal":"Hold the June commitment forecast pending source-version reconciliation.","owner":"Finance","sources":["PN-14","PN-15"],"risk":"high"},
 {"id":"P-004","concept":"isolation-permit","proposal":"Do not assert the permit status until the authorised register and handover are reconciled.","owner":"HSE","sources":["PN-18","PN-19"],"risk":"critical"},
 {"id":"P-005","concept":"asset-identity","proposal":"Resolve CR17 as an alias for Crusher C-17 after asset-steward validation.","owner":"Maintenance","sources":["PN-08","HQ-01"],"risk":"medium"}
]
CONFLICTS = [
 {"id":"D-001","kind":"different-definition","label":"Not a contradiction","concepts":["production-mined","production-dispatched"],"sources":["PN-01","PN-02"],"reason":"Mined tonnes and saleable tonnes are different process stages."},
 {"id":"D-002","kind":"different-definition","label":"Not a contradiction","concepts":["mechanical-availability","operational-readiness"],"sources":["PN-05","PN-06"],"reason":"Maintenance and Operations report different availability scopes."},
 {"id":"D-003","kind":"different-definition","label":"Not a contradiction","concepts":["recognized-expense","purchase-commitment"],"sources":["PN-12","PN-13"],"reason":"Recognised expense and financial commitment use different accounting treatments."},
 {"id":"D-004","kind":"true-conflict","label":"Requires reconciliation","concepts":["forecast-commitment"],"sources":["PN-14","PN-15"],"reason":"Same metric, site and reporting period; different forecast versions/amounts."},
 {"id":"D-005","kind":"true-conflict","label":"Safety-critical conflict","concepts":["isolation-permit"],"sources":["PN-18","PN-19"],"reason":"Opposing permit status claims at the same asset and timestamp."},
 {"id":"D-006","kind":"different-definition","label":"Not a contradiction","concepts":["safety-nearmiss","recordable-injury"],"sources":["PN-16","PN-17"],"reason":"Near misses are not recordable injuries."}
]
# Deliberately unrelated text creates a modest search/retrieval-noise challenge.
NOISE_TOPICS = [
 ("Technology","Teams","Copper Ridge","Network switch upgrade at the regional site is scheduled for the weekend."),
 ("People","Email","Perth HQ","The induction calendar for new starters has moved to the second Thursday."),
 ("Legal","Email","Perth HQ","Contract template review completed with no change to the signing delegation."),
 ("Projects","Meeting notes","Pilbara South","The workshop room booking for next month's project review has been confirmed."),
 ("Commercial","Teams","Perth HQ","Sales training materials for the new CRM release are available."),
 ("HSE","Safety register","Copper Ridge","Toolbox attendance has been recorded for the afternoon shift."),
 ("Geology","Email","Pilbara South","The sample courier pickup is delayed until Monday."),
 ("Supply Chain","Procurement","Copper Ridge","Stationery replenishment is waiting for purchase approval.")
]
def observed_records(seed=42, variants=3, noise=40):
    if not 1 <= variants <= 6: raise ValueError("variants must be 1..6")
    rng=random.Random(seed)
    records=[]
    truth={}
    for cid,function,source,site,concept,claim,date in CLAIMS:
        for variant in range(variants):
            record_id=cid if variant==0 else f"{cid}-V{variant}"
            choices=SOURCE_INTROS[source]
            # All variants retain the substantive, curated assertion, but
            # surrounding discourse comes from different system conventions.
            prefix=choices[(variant+len(cid))%len(choices)]
            suffix="" if variant==0 else " "+CONTEXT_EXTRAS[(variant+len(cid))%len(CONTEXT_EXTRAS)]
            body=prefix+claim+suffix
            if variant==2:
                body="Forwarded by "+function+" at "+site+". "+body
            records.append({"id":record_id,"title":f"{site} / {function} / {date}",
                "text":body,"site":site,"function":function,"source":source,
                "date":date,"classification":"internal","thread":cid,
                "author":f"{function} contributor {1+(len(cid)+variant)%37}",
                "document_url":None,"approved":False})
            truth[record_id]=concept
    for i in range(noise):
        fn,source,site,body=NOISE_TOPICS[i%len(NOISE_TOPICS)]
        rid=f"NOISE-{i+1:03d}"
        records.append({"id":rid,"title":f"{site} / general business update",
            "text":body+" Reference "+str(100+i)+".","site":site,
            "function":fn,"source":source,"date":"2026-06-20",
            "classification":"internal","thread":rid,"author":f"{fn} contributor",
            "document_url":None,"approved":False})
        truth[rid]=None
    rng.shuffle(records)
    return records,truth

def extract(records):
    """Read only document bodies and public metadata; no truth IDs are consulted."""
    out=[]
    for r in records:
        hay=r["text"].lower()
        scored=[]
        for c in CONCEPTS:
            matches=[alias for alias in c["aliases"]
                     if re.search(r"(?<!\w)"+re.escape(alias.lower())+r"(?!\w)",hay)]
            if matches:
                scored.append({"id":c["id"],"score":round(max(len(m) for m in matches)/24,2),
                               "trigger":max(matches,key=len)})
        scored.sort(key=lambda c:(-c["score"],c["id"]))
        entities=[key for key,aliases in ENTITY_ALIASES.items()
                  if any(re.search(r"(?<!\w)"+re.escape(alias.lower())+r"(?!\w)",hay) for alias in aliases)]
        if r["site"]=="Pilbara North" and "SITE-PN" not in entities: entities.append("SITE-PN")
        quantities=re.findall(r"(?<!\w)\$?\d[\d,]*(?:\.\d+)?\s*(?:%|m|t|hours?|days?)?\b",r["text"])
        out.append({"document_id":r["id"],"concepts":scored[:4],
                    "entities":entities,"quantity_strings":quantities[:8],
                    "ambiguous":len(scored)>1})
    return out

def score(predictions, truth):
    total=sum(v is not None for v in truth.values())
    selected=sum(bool(p["concepts"]) for p in predictions)
    correct=sum(truth.get(p["document_id"]) in {c["id"] for c in p["concepts"]}
                for p in predictions if truth.get(p["document_id"]) is not None)
    # Recall is micro recall over the (one) primary gold label per relevant doc.
    return {"gold_labeled":total,"records_with_candidates":selected,
            "gold_found_in_candidates":correct,
            "candidate_recall":round(correct/total,3) if total else 0,
            "ambiguous_records":sum(p["ambiguous"] for p in predictions),
            "method":"dictionary candidate extraction / curated synthetic benchmark",
            "not_a_measure_of":"LLM quality, causal accuracy, production readiness"}
def snapshot(seed=42, variants=3, noise=40):
    records,truth=observed_records(seed,variants,noise)
    predictions=extract(records)
    mapping={x["document_id"]:x for x in predictions}
    nodes=[]
    for c in CONCEPTS:
        nodes.append({"id":c["id"],"kind":"concept","label":c["name"],"group":c["owner"]})
    for entity,aliases in ENTITY_ALIASES.items():
        nodes.append({"id":entity,"kind":"entity","label":aliases[0],"group":"Asset" if entity.startswith("ASSET") else "Site"})
    edges=[]
    for p in predictions:
        for c in p["concepts"][:2]:
            edges.append({"from":p["document_id"],"to":c["id"],"type":"mentions","confidence":c["score"]})
        for entity in p["entities"]:
            edges.append({"from":p["document_id"],"to":entity,"type":"located_at" if entity.startswith("SITE") else "identifies"})
    public_records=[{**r,"extraction":mapping[r["id"]]} for r in records]
    restricted=[{"id":rid,"source":src,"function":fn,"site":site,"date":date,
                 "classification":"restricted","redacted":True}
                for rid,fn,src,site,date in RESTRICTED]
    from src.claim_assessment import analyse_snapshot
    result = {
       "schema_version":2,"seed":seed,
       "data_type":"synthetic","engine_type":"deterministic lexical candidate extraction",
       "notice":"Read-only browser lab. Curated question narratives; extraction metrics actually calculated from observed records. No live LLM or enterprise systems.",
       "enterprise":{"name":"Redgum Resources","employees_designed":5000,"sites":SITES,"functions":FUNCTIONS},
       "concepts":CONCEPTS,"records":public_records,"restricted_metadata":restricted,
       "graph":{"nodes":nodes,"edges":edges},
       "reviews":REVIEW,"comparisons":CONFLICTS,"questions":QUESTIONS,
       "evaluation":score(predictions,truth),
       "stats":{"records":len(records),"restricted_withheld":len(restricted),
                "source_types":len({r["source"] for r in records}),
                "sites":len(SITES),"concepts":len(CONCEPTS),
                "candidate_links":sum(len(p["concepts"]) for p in predictions)}
    }
    result["analysis"] = analyse_snapshot(result)
    return result

def write(path, seed=42):
    data=snapshot(seed=seed)
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    return {"path":str(path),**data["stats"],"evaluation":data["evaluation"]}
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default="lab/data.json")
    parser.add_argument("--seed",type=int,default=42)
    args=parser.parse_args()
    print(json.dumps(write(args.output,args.seed),indent=2))
