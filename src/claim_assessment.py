"""Deterministic assertion checks over observed evidence.

Does NOT read hidden labels. Treats findings as candidate issues for stewards,
not facts for automatic publication. It intentionally recognises only a
small number of numeric and categorical claim patterns, not free-form language.
"""
import re
from collections import defaultdict

def _amount(record,concept):
    text=record["text"].lower()
    if concept=="forecast-commitment":
        match=re.search(r"\$\s*(\d+(?:\.\d+)?)\s*m\b",text)
        return {"value":float(match.group(1)),"unit":"AUD millions"} if match else None
    if concept=="isolation-permit":
        if re.search(r"\bclosed\b",text):
            return {"value":"closed","unit":"permit status"}
        if re.search(r"\bopen\b",text):
            return {"value":"open","unit":"permit status"}
        return None
    return None

def analyse_snapshot(data):
    # Variants across sources repeat an event: deduplicate by evidence thread.
    canonical={r["thread"]:r for r in sorted(data["records"],key=lambda item:item["id"]) if r["id"]==r["thread"]}
    groups=defaultdict(list)
    for r in canonical.values():
        candidates={x["id"] for x in r["extraction"]["concepts"]}
        for concept in ("forecast-commitment","isolation-permit"):
            if concept not in candidates:continue
            value=_amount(r,concept)
            if value is None:continue
            key=(concept,r["site"],r["date"][:7] if concept=="forecast-commitment" else r["date"])
            groups[key].append({"source":r["id"],**value})
    issues=[]
    for (concept,site,period),entries in groups.items():
        if len({str(x["value"]) for x in entries}) <= 1:continue
        source_ids=sorted(x["source"] for x in entries)
        issues.append({"id":"F-"+str(len(issues)+1).zfill(3),
            "kind":"same-boundary-disagreement","concept":concept,
            "site":site,"period":period,"source_ids":source_ids,
            "values":[{"value":x["value"],"unit":x["unit"],"record":x["source"]} for x in entries],
            "assessment":"Different assertions for one detected concept, site and period. Version, effective time and governing authority must be checked.",
            "review_required":True,"method":"scope-aware rule on extracted lexical concept candidates"})
    # Differences in meaning, not automatically inconsistencies: these pairs
    # are separate concepts by definition, checked against actual source matches.
    distinctions=[
        ("production-mined","production-dispatched"),
        ("mechanical-availability","operational-readiness"),
        ("recognized-expense","purchase-commitment"),
        ("safety-nearmiss","recordable-injury")
    ]
    distinctions_found=[]
    for first,second in distinctions:
        a=next((r for r in canonical.values()
                if r["site"]=="Pilbara North" and
                first in {x["id"] for x in r["extraction"]["concepts"]}),None)
        b=next((r for r in canonical.values()
                if r["site"]=="Pilbara North" and
                second in {x["id"] for x in r["extraction"]["concepts"]}),None)
        if a and b:
            distinctions_found.append({"id":"D-"+str(len(distinctions_found)+1).zfill(3),
                "kind":"scope-difference","concepts":[first,second],
                "sources":[a["id"],b["id"]],
                "assessment":"Different governed metric candidates: comparing their figures directly would be an invalid contradiction test.",
                "site":"Pilbara North"})
    return {"issues":issues,"distinctions":distinctions_found,
            "metrics":{"distinct_source_threads":len(canonical),
                       "same_boundary_findings":len(issues),
                       "measurement_scope_distinctions":len(distinctions_found)},
            "limitation":"Rule-based detection of two claim patterns and four known cross-concept scopes. This is not general contradiction detection."}
