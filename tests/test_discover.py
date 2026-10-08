import tempfile,unittest
from pathlib import Path
from src.semantic_experiment import build
from src.discover import discover,evaluate
from src.build_dashboard import build as dashboard
import json
class DiscoveryTests(unittest.TestCase):
 def test_discovery_permissions_and_dashboard(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)/"experiment";build(root)
   predictions=discover(root)
   metrics=evaluate(root,predictions)
   self.assertEqual(metrics["eligible"],550)
   self.assertEqual(metrics["blocked"],50)
   self.assertTrue(0<=metrics["precision"]<=1)
   self.assertTrue(0<=metrics["recall"]<=1)
   self.assertTrue(all(r["evidence_id"] not in {"E-00011"} for r in predictions["records"]))
   result=Path(tmp)/"results.json";result.write_text(json.dumps({"metrics":metrics,"predictions":predictions["records"]}))
   output=Path(tmp)/"dashboard.html";dashboard(result,output)
   self.assertIn("The Meaning Layer",output.read_text())
if __name__=="__main__":unittest.main()
