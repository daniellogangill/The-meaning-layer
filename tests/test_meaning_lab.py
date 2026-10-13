import json
import tempfile
import unittest
from pathlib import Path

from src.meaning_lab import CLAIMS, CONCEPTS, extract, observed_records, snapshot, write


class MeaningLabTests(unittest.TestCase):
    def test_deterministic_and_non_empty(self):
        a = snapshot(seed=42)
        b = snapshot(seed=42)
        self.assertEqual(a, b)
        self.assertGreaterEqual(len(a["records"]), 120)
        self.assertGreaterEqual(len(a["concepts"]), 15)
        self.assertGreaterEqual(a["stats"]["candidate_links"], 40)
        self.assertGreaterEqual(a["evaluation"]["candidate_recall"], 0.6)

    def test_truth_never_enters_document_extraction(self):
        documents, ground_truth = observed_records()
        self.assertEqual(len(documents), len(ground_truth))
        self.assertTrue(all("concept_id" not in r for r in documents))
        a = extract(documents)
        self.assertEqual(len(a), len(documents))
        self.assertTrue(all("truth" not in r for r in a))

    def test_public_snapshot_has_only_redacted_metadata(self):
        data = snapshot()
        self.assertEqual(len(data["restricted_metadata"]), 4)
        for record in data["restricted_metadata"]:
            self.assertTrue(record["redacted"])
            self.assertNotIn("text", record)
            self.assertNotIn("title", record)
        self.assertTrue(all(r["classification"] == "internal" for r in data["records"]))

    def test_provenance_integrity(self):
        data = snapshot()
        sources = {record["id"] for record in data["records"]}
        concepts = {concept["id"] for concept in data["concepts"]}
        nodes = {node["id"] for node in data["graph"]["nodes"]}
        self.assertEqual(len(sources), len(data["records"]))
        self.assertEqual(len(concepts), len(data["concepts"]))
        self.assertEqual(len(nodes), len(data["graph"]["nodes"]))
        for item in data["graph"]["edges"]:
            self.assertIn(item["from"], sources)
            self.assertIn(item["to"], nodes)
        for case in data["comparisons"]:
            self.assertTrue(set(case["sources"]).issubset(sources))
        for proposal in data["reviews"]:
            self.assertTrue(set(proposal["sources"]).issubset(sources))

    def test_relevant_evidence_and_decoys(self):
        data = snapshot()
        self.assertGreater(data["evaluation"]["records_with_candidates"], 0)
        self.assertLess(data["evaluation"]["records_with_candidates"], len(data["records"]))
        self.assertGreater(data["stats"]["source_types"], 5)
        self.assertEqual(data["evaluation"]["gold_labeled"], len(CLAIMS) * 3)

    def test_json_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "lab" / "data.json"
            result = write(path)
            self.assertTrue(path.exists())
            loaded = json.loads(path.read_text(encoding="utf8"))
            self.assertEqual(loaded["stats"]["records"], result["records"])
            self.assertNotIn('"restricted_text"', path.read_text(encoding="utf8"))


if __name__ == "__main__":
    unittest.main()
