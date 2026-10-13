import json
import tempfile
import unittest
from pathlib import Path
from src.heldout_corpus import generate
from src.heldout_discovery import induce, infer, score, load


class HeldoutDiscoveryTests(unittest.TestCase):
    def test_reproducible_induction_without_gold_access(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            x=generate(a);y=generate(b)
            self.assertEqual(x,y)
            self.assertEqual(x['concepts'],50)
            self.assertEqual(x['independent_alias_variants'],200)
            self.assertEqual(x['discovery_sources'],200)
            self.assertEqual(x['holdout_sources'],900)
            self.assertEqual(x['eligible_holdout'],850)
            self.assertEqual((Path(a)/'observed/holdout.jsonl').read_bytes(),
                             (Path(b)/'observed/holdout.jsonl').read_bytes())
            self.assertNotIn('concept_id',(Path(a)/'observed/holdout.jsonl').read_text())
            # The extractor and inference are still functional with gold removed.
            gold=Path(a)/'truth'
            for file in gold.iterdir():file.unlink()
            gold.rmdir()
            proposals=induce(Path(a)/'observed/discovery.jsonl')
            self.assertEqual(len(proposals['proposals']),50)
            self.assertTrue(all(len(p['evidence'])==4 for p in proposals['proposals']))
            result=infer(Path(a)/'observed/holdout.jsonl',proposals)
            self.assertEqual(result['blocked'],50)
            self.assertEqual(len(result['records']),850)
            self.assertFalse(any(r['evidence_id'].endswith('-16') for r in result['records']))

    def test_scoped_outperforms_literal_with_auditable_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            generate(tmp)
            root=Path(tmp)
            induced=induce(root/'observed/discovery.jsonl')
            literal=score(root,induced,infer(root/'observed/holdout.jsonl',induced,'literal'))
            scoped=score(root,induced,infer(root/'observed/holdout.jsonl',induced,'scoped'))
            self.assertGreater(scoped['precision'],literal['precision'])
            self.assertGreater(scoped['recall'],literal['recall'])
            self.assertEqual(scoped['gold_positives'],600)
            self.assertEqual(scoped['gold_negatives'],250)
            self.assertEqual(scoped['blocked_restricted'],50)
            self.assertEqual(scoped['true_positive']+scoped['false_negative'],600)
            self.assertEqual(scoped['true_negative']+scoped['negative_record_false_positives'],250)
            self.assertEqual(len(scoped['errors']),scoped['false_negative']+scoped['negative_record_false_positives']-scoped['wrong_concept_links'])
            self.assertTrue(all(e['evidence_id'] for e in scoped['errors']))
            self.assertNotIn('C-001',json.dumps(induced))
            discovery_ids={r['id'] for r in load(root/'observed/discovery.jsonl')}
            for proposal in induced['proposals']:
                self.assertTrue(all(s['evidence_id'] in discovery_ids for s in proposal['evidence']))

    def test_ambiguous_terms_are_scoped_or_abstained(self):
        with tempfile.TemporaryDirectory() as tmp:
            generate(tmp)
            root=Path(tmp)
            induced=induce(root/'observed/discovery.jsonl')
            records={x['evidence_id']:x for x in infer(root/'observed/holdout.jsonl',induced)['records']}
            self.assertIsNone(records['H-011-12']['prediction'])
            self.assertIsNotNone(records['H-011-01']['prediction'])
            self.assertIsNotNone(records['H-002-01']['prediction'])
            self.assertNotEqual(records['H-011-01']['prediction'],records['H-002-01']['prediction'])
            self.assertIsNone(records['H-011-15']['prediction'])
            self.assertIsNone(records['H-011-13']['prediction'])

if __name__=='__main__':unittest.main()
