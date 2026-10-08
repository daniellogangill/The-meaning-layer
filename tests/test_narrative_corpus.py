import json,tempfile,unittest
from pathlib import Path
from src.narrative_corpus import generate
class NarrativeTests(unittest.TestCase):
 def test_determinism_and_provenance(self):
  with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
   self.assertEqual(generate(a),generate(b))
   self.assertEqual((Path(a)/"narrative_evidence.jsonl").read_bytes(),(Path(b)/"narrative_evidence.jsonl").read_bytes())
   rows=[json.loads(x) for x in (Path(a)/"narrative_evidence.jsonl").read_text().splitlines()]
   self.assertEqual(len(rows),30)
   self.assertEqual(len({r["id"] for r in rows}),30)
   self.assertTrue(all(r["provenance"]["record_id"]==r["id"] for r in rows))
if __name__=="__main__":unittest.main()
