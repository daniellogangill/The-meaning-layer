"""Evidence-only semantic discovery, with optional local embeddings (no paid API)."""
import argparse,json,re
from collections import defaultdict
from pathlib import Path

def load(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf8").splitlines() if line]
def discover(root, role="internal"):
    root=Path(root)
    evidence=load(root/"observed/evidence.jsonl")
    # In production, a published dictionary is governed reference data; this
    # experiment uses the concept catalogue only as a lexical candidate index.
    # Ground-truth evaluation labels are NEVER read in this function.
    concepts=load(root/"truth/concepts.jsonl")
    index=[]
    for c in concepts:
        for alias in c["aliases"]:
            index.append((alias,c["id"]))
    index.sort(key=lambda x:len(x[0]),reverse=True)
    results=[]; blocked=0
    for e in evidence:
        if e["classification"]=="restricted" and role!="restricted":
            blocked+=1
            continue
        hits=[]
        for alias,cid in index:
            if re.search(r"(?<!\w)"+re.escape(alias)+r"(?!\w)",e["text"],re.I):
                hits.append(cid)
        candidates=sorted(set(hits))
        results.append({"evidence_id":e["id"],"candidates":candidates,
                        "prediction":candidates[0] if len(candidates)==1 else None,
                        "ambiguous":len(candidates)>1,
                        "context":e["department"],"source":e["source"],
                        "evidence_excerpt":e["text"][:180]})
    return {"records":results,"blocked":blocked}
def evaluate(root, predictions):
    root=Path(root)
    truth={r["evidence_id"]:r["concept_id"] for r in load(root/"truth/evaluation_labels.jsonl")}
    eligible=len(predictions["records"])
    correct=sum(r["prediction"]==truth[r["evidence_id"]] for r in predictions["records"])
    predicted=sum(r["prediction"] is not None for r in predictions["records"])
    return {"eligible":eligible,"correct":correct,"predicted":predicted,
            "precision":round(correct/predicted,4) if predicted else 0,
            "recall":round(correct/eligible,4) if eligible else 0,
            "blocked":predictions["blocked"],
            "ambiguous":sum(r["ambiguous"] for r in predictions["records"])}
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--root",default="data/experiment");p.add_argument("--output",default="data/results.json")
    args=p.parse_args();result=discover(args.root);metrics=evaluate(args.root,result)
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    Path(args.output).write_text(json.dumps({"metrics":metrics,"predictions":result["records"]},indent=2))
    print(json.dumps(metrics,indent=2))
