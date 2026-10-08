"""Narrative synthetic corpus: scenario-led evidence with disagreements and provenance.

Unlike the structural seed, this is a small, deliberately authored benchmark.
No real employee, company or customer data is used.
"""
import json,random
from pathlib import Path

EVENTS=[
 {"id":"EV-01","site":"Pilbara North","date":"2026-06-03","fact":"Crusher C-17 tripped twice, losing 7.5 scheduled production hours","metric":"downtime","owner":"Maintenance"},
 {"id":"EV-02","site":"Pilbara North","date":"2026-06-04","fact":"Haul truck availability fell to 81% against the 90% mechanical target","metric":"availability","owner":"Maintenance"},
 {"id":"EV-03","site":"Pilbara North","date":"2026-06-05","fact":"Operations counted 88% fleet readiness because a standby truck was available","metric":"availability","owner":"Operations"},
 {"id":"EV-04","site":"Pilbara North","date":"2026-06-06","fact":"Dispatch recorded 42,800 saleable tonnes; mine control recorded 48,100 tonnes mined","metric":"production","owner":"Operations"},
 {"id":"EV-05","site":"Pilbara North","date":"2026-06-07","fact":"Finance forecast included purchase commitments not yet recognised as expenses","metric":"cost","owner":"Finance"},
 {"id":"EV-06","site":"Pilbara North","date":"2026-06-08","fact":"The June board pack still quoted a superseded March throughput definition","metric":"throughput","owner":"Executive"}
]
TEMPLATES=[
 ("teams","Shift handover — {site}","Quick flag from {owner}: {fact}. Can someone check whether the dashboard uses the same {metric} boundary?"),
 ("email","Re: June variance / {site}","Morning team, the numbers don't reconcile. {fact}. Please confirm which {metric} definition applies before this goes to the GM."),
 ("meeting_minutes","Weekly performance review","Decision pending: {fact}. Action for {owner}: locate the governing definition of {metric} and provide source evidence."),
 ("operations_report","Site performance commentary","Exception recorded on {date}: {fact}. Metric label in this source: {metric}."),
 ("policy","Measurement convention memo","The reporting owner for {metric} is {owner}. A site report may use a different boundary from the consolidated corporate report.")
]
def generate(out,seed=42):
    out=Path(out);out.mkdir(parents=True,exist_ok=True);rng=random.Random(seed)
    records=[]
    for event in EVENTS:
        for j,(kind,title,body) in enumerate(TEMPLATES):
            rid=f"N-{event['id']}-{j+1:02d}"
            records.append({"id":rid,"event_id":event["id"],"source":kind,"title":title.format(**event),
                "body":body.format(**event),"site":event["site"],"author_function":event["owner"],
                "created_at":event["date"]+"T09:00:00+08:00",
                "classification":"restricted" if event["id"]=="EV-05" and j==1 else "internal",
                "provenance":{"system":kind,"record_id":rid},"status":"unverified_assertion"})
    rng.shuffle(records)
    (out/"narrative_evidence.jsonl").write_text("".join(json.dumps(r,sort_keys=True)+"\n" for r in records))
    (out/"narrative_truth.json").write_text(json.dumps({"events":EVENTS,"note":"Withhold this file from discovery"},indent=2))
    return {"events":len(EVENTS),"artefacts":len(records),"restricted":sum(r["classification"]=="restricted" for r in records)}
if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser();p.add_argument("--out",default="data/narrative");a=p.parse_args()
    print(json.dumps(generate(a.out),indent=2))
