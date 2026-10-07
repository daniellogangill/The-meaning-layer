import tempfile,unittest,json
from pathlib import Path
from src.semantic_experiment import build,baseline
class SemanticExperimentTests(unittest.TestCase):
 def test_repeatability_and_permissions(self):
  with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
   x=build(a);y=build(b)
   self.assertEqual(x,y)
   self.assertEqual(x["concepts"],50)
   self.assertEqual(x["evidence"],600)
   self.assertEqual((Path(a)/"observed/evidence.jsonl").read_bytes(),(Path(b)/"observed/evidence.jsonl").read_bytes())
   observed=(Path(a)/"observed/evidence.jsonl").read_text()
   self.assertNotIn("truth_concept_id",observed)
   score=baseline(a)
   self.assertEqual(score["eligible_evidence"],550)
   self.assertLessEqual(score["correct"],score["eligible_evidence"])
if __name__=="__main__":unittest.main()
