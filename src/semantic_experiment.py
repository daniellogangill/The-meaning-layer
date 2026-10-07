"""Deterministic vertical-slice semantic experiment. No external dependencies."""
import argparse, json, random, re
from pathlib import Path

CONCEPTS = {
 "Operations": ["production","throughput","ore grade","recovery","strip ratio","run of mine","stockpile","dispatch","plan","variance"],
 "Maintenance": ["downtime","availability","reliability","work order","asset","failure","inspection","backlog","preventive maintenance","mean time to repair"],
 "Finance": ["cost","capital expenditure","operating expenditure","forecast","actual","accrual","commitment","margin","revenue","budget"],
 "HSE": ["incident","hazard","near miss","risk","control","exposure","severity","recordable injury","permit","compliance"],
 "Supply Chain": ["customer","shipment","inventory","lead time","purchase order","supplier","delivery","freight","contract","demand"]
}
SOURCES=["email","teams","policy","work_order","meeting_minutes","operations_report"]
CONTEXTS=["Pilbara North","Pilbara South","Copper Ridge","Perth HQ"]
def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")
def dump(path, rows):
    path.write_text("".join(json.dumps(r,sort_keys=True)+"\n" for r in rows),encoding="utf8")
def build(out,seed=42):
    rng=random.Random(seed); out=Path(out); (out/"truth").mkdir(parents=True,exist_ok=True); (out/"observed").mkdir(exist_ok=True)
    concepts=[]; evidence=[]
    for department,terms in CONCEPTS.items():
        for term in terms:
            cid="C-"+slug(term)
            definitions=[
              {"context":department,"definition":f"{term.title()} as defined for {department} reporting, using the approved departmental measurement boundary.","valid_from":"2025-01-01"},
              {"context":"Operations" if department!="Operations" else "Finance","definition":f"{term.title()} measured for cross-functional operational decisions, with a different reporting boundary.","valid_from":"2025-01-01"}
            ]
            aliases=[term,term.upper(),term.replace(" ","-"),f"{term} metric"]
            concepts.append({"id":cid,"term":term,"owner":department,"aliases":aliases,"definitions":definitions})
            for j in range(12):
                d=definitions[j%2]; site=CONTEXTS[j%len(CONTEXTS)]
                source=SOURCES[j%len(SOURCES)]
                label=rng.choice(aliases)
                text=f"For {d['context']} at {site}, {label} means {d['definition']} This definition applies to the reporting period."
                if j==11: text=f"Historic note (superseded): {label} was once defined using an older reporting boundary."
                evidence.append({"id":f"E-{len(evidence)+1:05d}","source":source,"site":site,"department":d["context"],
                  "concept_hint":None,"text":text,"classification":"restricted" if j==10 else "internal",
                  "effective_date":"2024-06-01" if j==11 else "2026-06-01",
                  "is_superseded":j==11,"truth_concept_id":cid})
    dump(out/"truth"/"concepts.jsonl",concepts)
    # Strip truth labels before the discovery process sees the evidence.
    dump(out/"truth"/"evaluation_labels.jsonl",[{"evidence_id":x["id"],"concept_id":x["truth_concept_id"]} for x in evidence])
    dump(out/"observed"/"evidence.jsonl",[{k:v for k,v in x.items() if k!="truth_concept_id"} for x in evidence])
    manifest={"seed":seed,"concepts":len(concepts),"aliases":sum(len(x["aliases"]) for x in concepts),
              "contextual_definitions":sum(len(x["definitions"]) for x in concepts),"evidence":len(evidence),
              "restricted":sum(x["classification"]=="restricted" for x in evidence)}
    (out/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    return manifest
def baseline(out):
    out=Path(out)
    concepts=[json.loads(x) for x in (out/"truth"/"concepts.jsonl").read_text().splitlines()]
    records=[json.loads(x) for x in (out/"observed"/"evidence.jsonl").read_text().splitlines()]
    labels={x["evidence_id"]:x["concept_id"] for x in map(json.loads,(out/"truth"/"evaluation_labels.jsonl").read_text().splitlines())}
    aliases=sorted([(a.lower(),c["id"]) for c in concepts for a in c["aliases"]],key=lambda x:-len(x[0]))
    matched=correct=0
    for r in records:
        if r["classification"]=="restricted": continue
        text=r["text"].lower()
        prediction=next((cid for alias,cid in aliases if re.search(r"(?<!\w)"+re.escape(alias)+r"(?!\w)",text)),None)
        if prediction: matched+=1
        if prediction==labels[r["id"]]: correct+=1
    allowed=sum(r["classification"]!="restricted" for r in records)
    return {"eligible_evidence":allowed,"matched":matched,"correct":correct,
            "accuracy":round(correct/allowed,4) if allowed else None,
            "note":"Lexical baseline; NOT LLM discovery. Truth used only for scoring."}
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--out",default="data/experiment");p.add_argument("--seed",type=int,default=42)
    a=p.parse_args();print(json.dumps({"generated":build(a.out,a.seed),"baseline":baseline(a.out)},indent=2))
