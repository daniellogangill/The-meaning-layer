import json
import tempfile
import unittest
from pathlib import Path
from src.generate_seed import generate

class SeedTests(unittest.TestCase):
    def test_reproducible_and_consistent(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            generate(Path(a), 5000, 100, 42)
            generate(Path(b), 5000, 100, 42)
            for filename in ("employees.jsonl","artifacts.jsonl","ground_truth.jsonl","manifest.json"):
                self.assertEqual((Path(a)/filename).read_bytes(),(Path(b)/filename).read_bytes())
            employees=[json.loads(x) for x in (Path(a)/"employees.jsonl").read_text().splitlines()]
            ids={e["id"] for e in employees}
            self.assertEqual(len(ids),5000)
            self.assertTrue(all(e["manager_id"] is None or e["manager_id"] in ids for e in employees))
            self.assertTrue(all(int(e["manager_id"].split("-")[1]) < int(e["id"].split("-")[1]) for e in employees if e["manager_id"]))
if __name__ == "__main__":
    unittest.main()
