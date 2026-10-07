#!/usr/bin/env python3
"""Generate a deterministic synthetic enterprise seed using only the standard library."""
import argparse
import json
import random
from pathlib import Path

FUNCTIONS = ["Executive","Operations","Maintenance","Engineering","Geology","HSE","Finance","Procurement","Supply Chain","Sales","People","Technology & Data"]
SITES = ["Perth HQ","Pilbara North","Pilbara South","Copper Ridge","Westport Processing"]
SOURCES = ["Email","Teams","ERP","EAM","CRM","HRIS","SharePoint","Confluence","Jira","Whiteboard"]
TERMS = {
    "production": ("Saleable tonnes dispatched", "Tonnes mined before processing"),
    "downtime": ("Unplanned equipment stoppage", "Any time below planned throughput"),
    "availability": ("Mechanical availability", "Operational readiness including crews"),
    "cost": ("Recognised accounting expense", "Forecast committed spend"),
    "customer": ("Contracted buyer entity", "Ship-to delivery account"),
    "asset": ("Capitalised equipment", "Any maintainable component"),
}
def write_jsonl(path, rows):
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

def generate(out, employee_count, artifact_count, seed):
    if employee_count < 12 or artifact_count < 1:
        raise ValueError("Need at least 12 employees and one artefact")
    rng = random.Random(seed)
    out.mkdir(parents=True, exist_ok=True)
    employees = []
    for i in range(employee_count):
        if i == 0:
            level, manager = "CEO", None
        elif i < 12:
            level, manager = "Executive", "EMP-00000"
        elif i < 72:
            level, manager = "General Manager", f"EMP-{rng.randrange(1,12):05d}"
        elif i < 372:
            level, manager = "Manager", f"EMP-{rng.randrange(12,72):05d}"
        elif i < 1372:
            level, manager = "Team Leader", f"EMP-{rng.randrange(72,372):05d}"
        else:
            level, manager = "Individual Contributor", f"EMP-{rng.randrange(372,1372):05d}"
        employees.append({"id":f"EMP-{i:05d}","name":f"Synthetic Employee {i:05d}","level":level,
                          "manager_id":manager,"function":FUNCTIONS[i % len(FUNCTIONS)],
                          "site":SITES[i % len(SITES)]})
    write_jsonl(out/"employees.jsonl", employees)
    observations = []
    term_names = list(TERMS)
    for i in range(artifact_count):
        term = term_names[i % len(term_names)]
        canonical, alternative = TERMS[term]
        conflicting = i % 7 == 0
        employee = employees[rng.randrange(employee_count)]
        observations.append({
            "id":f"ART-{i:07d}","source":SOURCES[i % len(SOURCES)],
            "author_id":employee["id"],"site":employee["site"],"function":employee["function"],
            "term":term,"asserted_definition":alternative if conflicting else canonical,
            "body":f"In our reporting, {term} means {alternative if conflicting else canonical}.",
            "timestamp":f"2026-{1 + (i % 9):02d}-{1 + (i % 28):02d}T09:00:00+08:00",
            "classification":"restricted" if i % 19 == 0 else "internal",
            "is_deliberate_conflict":conflicting
        })
    write_jsonl(out/"artifacts.jsonl", observations)
    write_jsonl(out/"ground_truth.jsonl", [
        {"term":term,"canonical_definition":defs[0],"alternative_definition":defs[1],
         "steward_function":"Technology & Data"} for term, defs in TERMS.items()
    ])
    manifest = {"seed":seed,"employees":employee_count,"artifacts":artifact_count,
                "functions":len(FUNCTIONS),"sites":len(SITES),
                "note":"Synthetic structural seed; not realistic native enterprise files."}
    (out/"manifest.json").write_text(json.dumps(manifest, indent=2)+"\n",encoding="utf-8")
    return manifest

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out",type=Path,default=Path("data/seed"))
    p.add_argument("--employees",type=int,default=5000)
    p.add_argument("--artifacts",type=int,default=10000)
    p.add_argument("--seed",type=int,default=42)
    a=p.parse_args()
    print(json.dumps(generate(a.out,a.employees,a.artifacts,a.seed),indent=2))
