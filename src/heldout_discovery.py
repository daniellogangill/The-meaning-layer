"""Held-out synthetic semantic-discovery evaluation; no LLM or external dependencies.

Induction and inference only read observed JSONL. Only score() reads gold.
"""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

def _normal(text):
    return re.sub(r'\s+', ' ', text.strip().lower())

def load(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8').splitlines() if line.strip()]

# Generic language patterns, not a seeded concept dictionary.
PATTERNS=[
    re.compile(r"measurement note for ([\w ]+): '([^']+)' means (.+?)\.$",re.I),
    re.compile(r"in the ([\w ]+) glossary, (.+?) is defined as (.+?)\.$",re.I),
    re.compile(r"scope: ([\w ]+)\. we use (.+?) to mean (.+?)\.$",re.I),
    re.compile(r"at ([\w ]+), the term (.+?) refers to (.+?)\.$",re.I),
]

def induce(observed_discovery):
    """Induce scoped term candidates and definitions from observed text only."""
    groups=defaultdict(list); ignored=[]
    for row in load(observed_discovery):
        if row.get('classification')!='internal':continue
        matches=[pattern.search(row['body']) for pattern in PATTERNS]
        match=next((m for m in matches if m),None)
        if not match:
            ignored.append(row['id']);continue
        scope,alias,definition=(_normal(x) for x in match.groups())
        if len(alias)<3 or len(definition)<12:
            ignored.append(row['id']);continue
        groups[(scope,definition)].append({'alias':alias,'evidence_id':row['id'],
                                          'excerpt':row['body']})
    proposals=[]
    for n,((scope,definition),sources) in enumerate(sorted(groups.items()),1):
        proposals.append({'proposal_id':f'P-{n:03d}','scope':scope,'definition':definition,
                          'aliases':sorted({s['alias'] for s in sources}),
                          'evidence':sources,'status':'unreviewed'})
    return {'proposals':proposals,'unparsed_source_ids':ignored,
            'method':'pattern-induced scoped candidates; no gold dictionary or LLM'}

def _has_alias(text,alias):
    return bool(re.search(r'(?<!\w)'+re.escape(alias)+r'(?!\w)',text,re.I))

def infer(observed_holdout,induced,mode='scoped'):
    """Evaluate on unseen evidence; optional literal baseline ignores scope/negation."""
    predictions=[];blocked=0
    for row in load(observed_holdout):
        if row.get('classification')!='internal':
            blocked+=1;continue
        body=row['body'];scope=_normal(row.get('scope',''))
        candidates=[p for p in induced['proposals'] if any(_has_alias(body,a) for a in p['aliases'])]
        if mode=='scoped':
            if row.get('superseded') or re.search(r'\b(not a statement|do not classify|not a .* definition|NOT a .* metric)\b',body,re.I):
                candidates=[]
            else:
                # Prefer explicit definition over a coincidental alias in the
                # definition itself (e.g. 'freight' inside 'landed cost').
                definitions=[p for p in induced['proposals'] if p['scope']==scope and
                             p['definition'] in _normal(body)]
                candidates=definitions or [p for p in candidates if p['scope']==scope]
        selected=candidates[0] if len(candidates)==1 else None
        predictions.append({'evidence_id':row['id'],'prediction':selected['proposal_id'] if selected else None,
                            'candidates':[p['proposal_id'] for p in candidates],
                            'ambiguous':len(candidates)>1,'scope':row.get('scope'),
                            'evidence_excerpt':body[:200],'source':row['source'],
                            'supporting_definition_evidence':[s['evidence_id'] for s in selected['evidence']] if selected else []})
    return {'records':predictions,'blocked':blocked,'mode':mode}

def score(root,induced,predictions):
    """Independent evaluator; ONLY this function reads hidden truth files."""
    root=Path(root)
    concepts=load(root/'truth'/'concepts.jsonl')
    gold={x['evidence_id']:x for x in load(root/'truth'/'holdout_labels.jsonl')}
    # Map a proposal to a gold concept by (scope, definition), never at inference.
    gold_key={(_normal(x['scope']),_normal(x['definition'])):x['id'] for x in concepts}
    mapped={p['proposal_id']:gold_key.get((p['scope'],p['definition'])) for p in induced['proposals']}
    tp=fp=fn=tn=0;negative_fp=wrong_links=0;errors=[];citations_ok=0;citations_total=0
    for pred in predictions['records']:
        label=gold[pred['evidence_id']];assert label['eligible']
        actual=label['concept_id'];guess=mapped.get(pred['prediction']) if pred['prediction'] else None
        if actual is not None and guess==actual:tp+=1
        elif actual is None and guess is None:tn+=1
        else:
            if guess is not None:fp+=1
            if actual is not None:fn+=1
            if actual is None and guess is not None:negative_fp+=1
            if actual is not None and guess is not None:wrong_links+=1
            errors.append({'evidence_id':pred['evidence_id'],'expected':actual,
                           'predicted':guess,'proposal_id':pred['prediction'],
                           'reason':label['reason'],'excerpt':pred['evidence_excerpt']})
        if pred['prediction']:
            citations_total+=1
            if pred['supporting_definition_evidence'] and mapped.get(pred['prediction']) is not None:
                citations_ok+=1
    positives=sum(x['eligible'] and x['concept_id'] is not None for x in gold.values())
    negatives=sum(x['eligible'] and x['concept_id'] is None for x in gold.values())
    assert len(predictions['records'])==positives+negatives
    return {'method':predictions['mode'],'concepts_induced':len(induced['proposals']),
            'true_positive':tp,'false_positive':fp,'false_negative':fn,'true_negative':tn,
            'precision':round(tp/(tp+fp),4) if tp+fp else 0,
            'recall':round(tp/(tp+fn),4) if tp+fn else 0,
            'false_positive_rate':round(negative_fp/negatives,4) if negatives else 0,
            'negative_record_false_positives':negative_fp,'wrong_concept_links':wrong_links,
            'abstentions':sum(p['prediction'] is None for p in predictions['records']),
            'ambiguous':sum(p['ambiguous'] for p in predictions['records']),
            'eligible':positives+negatives,'gold_positives':positives,'gold_negatives':negatives,
            'blocked_restricted':predictions['blocked'],
            'citation_presence_and_mapping':f'{citations_ok}/{citations_total}',
            'errors':errors,
            'limitations':'Gold was authored to generate the synthetic records; not independently human-labelled. Rule templates and literal definition overlap are not LLM or general semantic inference.'}

def run(root,output):
    from src.heldout_corpus import generate
    root=Path(root);manifest=generate(root)
    induced=induce(root/'observed'/'discovery.jsonl')
    results={mode:score(root,induced,infer(root/'observed'/'holdout.jsonl',induced,mode))
             for mode in ('literal','scoped')}
    report={'manifest':manifest,'discovery':{'proposals':induced['proposals'],
            'unparsed_source_ids':induced['unparsed_source_ids'],'method':induced['method']},
            'evaluations':results}
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',default='data/heldout')
    p.add_argument('--output',default='data/heldout-report.json');args=p.parse_args()
    result=run(args.root,args.output)
    print(json.dumps({'manifest':result['manifest'],
                      'metrics':{m:{k:v for k,v in r.items() if k not in ('errors','limitations')}
                                 for m,r in result['evaluations'].items()}},indent=2))
