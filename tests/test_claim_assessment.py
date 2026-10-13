import unittest
from src.meaning_lab import snapshot
from src.claim_assessment import analyse_snapshot

class ClaimAssessmentTests(unittest.TestCase):
    def test_detects_real_source_disagreements(self):
        dataset=snapshot()
        result=dataset["analysis"]
        topics={issue["concept"] for issue in result["issues"]}
        self.assertIn("forecast-commitment",topics)
        self.assertIn("isolation-permit",topics)
        for issue in result["issues"]:
            self.assertEqual(issue["site"],"Pilbara North")
            self.assertTrue(issue["review_required"])
            self.assertGreaterEqual(len(issue["source_ids"]),2)
            all_ids={record["id"] for record in dataset["records"]}
            self.assertTrue(set(issue["source_ids"]).issubset(all_ids))

    def test_distinguishes_different_measurements(self):
        result=snapshot()["analysis"]
        pairs=[set(item["concepts"]) for item in result["distinctions"]]
        self.assertIn({"production-mined","production-dispatched"},pairs)
        self.assertIn({"mechanical-availability","operational-readiness"},pairs)
        self.assertIn({"recognized-expense","purchase-commitment"},pairs)
        self.assertIn({"safety-nearmiss","recordable-injury"},pairs)

    def test_reproducible_and_no_truth_leak(self):
        d1=snapshot(seed=42)["analysis"]
        d2=snapshot(seed=42)["analysis"]
        self.assertEqual(d1,d2)
        self.assertFalse(any("truth" in k for issue in d1["issues"] for k in issue))

if __name__=="__main__":unittest.main()
