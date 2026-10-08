"""Build a self-contained executive experiment dashboard from measured results."""
import argparse,html,json
from pathlib import Path
def build(results, output):
    d=json.loads(Path(results).read_text())
    m=d["metrics"]
    rows="".join("<tr><td>"+html.escape(str(r["evidence_id"]))+"</td><td>"+html.escape(str(r["context"]))+"</td><td>"+html.escape(str(r["source"]))+"</td><td>"+html.escape(str(r["prediction"] or "Unresolved"))+"</td><td>"+html.escape(r["evidence_excerpt"])+"</td></tr>" for r in d["predictions"][:100])
    page="""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Meaning Layer — Experiment</title><style>
body{margin:0;background:#10141c;color:#f0f2f6;font:16px system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:40px 24px}
h1{font-size:clamp(32px,5vw,58px);margin-bottom:4px}p{color:#adb7c9;line-height:1.65}.eyebrow{color:#fc72bd;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin:30px 0}
.card{border:1px solid #303949;border-radius:14px;padding:22px;background:#1b2330}.num{font-size:34px;font-weight:800}.label{color:#b9c3d0}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:11px;border-bottom:1px solid #303949;text-align:left;vertical-align:top}
th{color:#fc72bd}section{overflow:auto}small{color:#b9c3d0}
</style><main><div class="eyebrow">REDGUM RESOURCES / SYNTHETIC ENTERPRISE</div>
<h1>The Meaning Layer</h1><p>From fragmented enterprise evidence to traceable meaning. This page shows actual results from a deterministic lexical baseline, not AI reasoning or production readiness.</p>
<div class="grid">
<div class="card"><div class="num">__ELIGIBLE__</div><div class="label">Authorised evidence records</div></div>
<div class="card"><div class="num">__PRECISION__%</div><div class="label">Concept-linking precision</div></div>
<div class="card"><div class="num">__RECALL__%</div><div class="label">Concept-linking recall</div></div>
<div class="card"><div class="num">__BLOCKED__</div><div class="label">Restricted records withheld</div></div>
</div><h2>Evidence trace</h2><p>First 100 permitted records, with proposed concept mappings and source context. Unresolved results require steward review.</p>
<section><table><thead><tr><th>ID</th><th>Context</th><th>Source</th><th>Prediction</th><th>Evidence excerpt</th></tr></thead><tbody>__ROWS__</tbody></table></section>
<p><small>Known limitations: synthetic templated evidence; catalogue-assisted lexical matching; no human review workflow or LLM extraction yet. The truth labels are held separately for evaluation.</small></p></main></html>"""
    for k,v in {"__ELIGIBLE__":m["eligible"],"__PRECISION__":round(100*m["precision"],1),"__RECALL__":round(100*m["recall"],1),"__BLOCKED__":m["blocked"],"__ROWS__":rows}.items():page=page.replace(k,str(v))
    Path(output).parent.mkdir(parents=True,exist_ok=True)
    Path(output).write_text(page,encoding="utf8")
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--results",default="data/results.json");p.add_argument("--output",default="data/dashboard.html")
    a=p.parse_args();build(a.results,a.output);print(a.output)
