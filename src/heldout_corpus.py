"""Synthetic corpus and gold labels. Never imported by the inference functions."""
import json, random
from pathlib import Path
from src.heldout_cards import CARDS, SOURCES

def write(path,rows):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(''.join(json.dumps(r,sort_keys=True)+'\n' for r in rows))

def generate(root,seed=73):
    root=Path(root);rng=random.Random(seed)
    discovery=[];holdout=[];labels=[];concepts=[]
    for i,(scope,term,definition,*other) in enumerate(CARDS,1):
        cid=f'C-{i:03d}';aliases=[term,*other]
        concepts.append(dict(id=cid,scope=scope,term=term,aliases=aliases,definition=definition))
        for j,alias in enumerate(aliases):
            bodies=[f"Measurement note for {scope}: '{alias}' means {definition}.",
                    f"In the {scope} glossary, {alias} is defined as {definition}.",
                    f"Scope: {scope}. We use {alias} to mean {definition}.",
                    f"At {scope}, the term {alias} refers to {definition}."]
            discovery.append(dict(id=f'D-{i:03d}-{j+1:02d}',scope=scope,source=SOURCES[(i+j)%6],
                                  body=bodies[j],effective_date='2026-06-01',classification='internal'))
        for j in range(16):
            alias=aliases[j%4]
            body=([f"June review: {alias} has moved since the previous reporting cut; reconcile the site number.",
                   f"Shift handover: can the owner verify {alias} before the pack is signed?",
                   f"Open item on {alias}; two reports appear to apply different boundaries."][j%3] if j<9 else
                  f"The {alias.upper()} measure needs a fresh owner sign-off this week." if j==9 else
                  f"Current note: {definition}; please identify the governing measure for this scope." if j==10 else
                  f"Can someone resolve {term} for this month? The department was not supplied." if j==11 else
                  f"Not a statement about {alias}; this note concerns cafeteria bookings only." if j==12 else
                  f"Please do not classify this as {alias}; the source is a training exercise." if j==13 else
                  f"Superseded 2024 glossary: {alias} used an obsolete measurement boundary." if j==14 else
                  f"Access-limited audit attachment mentions {alias}; not for this viewer.")
            rid=f'H-{i:03d}-{j+1:02d}'
            holdout.append(dict(id=rid,scope='Unspecified' if j==11 else scope,source=SOURCES[(i+j+2)%6],
                 body=body,effective_date='2024-01-01' if j==14 else '2026-07-01',
                 classification='restricted' if j==15 else 'internal',superseded=j==14))
            labels.append(dict(evidence_id=rid,concept_id=cid if j<12 else None,
                 eligible=j!=15,reason='positive' if j<12 else 'restricted' if j==15 else 'negative'))
    for j in range(100):
        rid=f'X-{j+1:03d}';term=('availability','cost','incident','plan','production')[j%5]
        body=(f"Visitor note: {term} dashboard screenshot shared for catering; no metric claim was made, ticket {j+1}."
              if j%5==0 else f"This is NOT a {term} definition or metric; unrelated visitor logistics ticket {j+1}.")
        holdout.append(dict(id=rid,scope=('Operations','Finance','HSE','Supply Chain','Maintenance')[j%5],
            source=SOURCES[j%6],body=body,effective_date='2026-07-01',classification='internal',superseded=False))
        labels.append(dict(evidence_id=rid,concept_id=None,eligible=True,reason='distractor'))
    rng.shuffle(discovery);rng.shuffle(holdout)
    for name,rows in [('observed/discovery.jsonl',discovery),('observed/holdout.jsonl',holdout),
                      ('truth/concepts.jsonl',concepts),('truth/holdout_labels.jsonl',labels)]:write(root/name,rows)
    manifest=dict(seed=seed,concepts=len(concepts),discovery_sources=len(discovery),holdout_sources=len(holdout),
        eligible_holdout=sum(x['eligible'] for x in labels),positive_holdout=sum(x['concept_id'] is not None and x['eligible'] for x in labels),
        negative_holdout=sum(x['concept_id'] is None and x['eligible'] for x in labels),
        restricted_holdout=sum(not x['eligible'] for x in labels),independent_alias_variants=sum(len(x['aliases']) for x in concepts))
    (root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest
