"""Optional LLM-assisted discovery. No ground-truth files are read.

Requires OPENAI_API_KEY and an installed openai package. No key is stored.
Runs only on authorised evidence; never automatically publishes model claims.
"""
import argparse,json,os
from pathlib import Path
from src.discover import load

def propose(root, limit=20, model="gpt-4.1-mini"):
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY must be configured in the runtime; do not commit credentials")
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("Install optional dependency: pip install openai") from exc
    client=OpenAI()
    records=[r for r in load(Path(root)/"observed/evidence.jsonl") if r["classification"]=="internal"][:limit]
    proposals=[]
    for r in records:
        response=client.responses.create(
            model=model,
            input=[
                {"role":"system","content":"You propose enterprise terms and context-specific definitions from evidence. Do not infer unprovided facts. Return concise JSON with keys term, proposed_meaning, context, uncertainty. This is a proposal, not governed truth."},
                {"role":"user","content":json.dumps({"source_id":r["id"],"department":r["department"],"text":r["text"]})}
            ])
        proposals.append({"source_id":r["id"],"status":"pending_steward_review","raw_proposal":response.output_text})
    return proposals

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--root",default="data/experiment");p.add_argument("--limit",type=int,default=20);p.add_argument("--model",default="gpt-4.1-mini");p.add_argument("--output",default="data/llm_proposals.json")
    a=p.parse_args();results=propose(a.root,a.limit,a.model)
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text(json.dumps(results,indent=2))
    print(f"Saved {len(results)} unapproved proposals")
