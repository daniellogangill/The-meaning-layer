'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.resolve(__dirname, '../lab/journey.js'), 'utf8');
test('evidence explorer exposes source filters and comparison', () => { for (const name of ['evidenceSearch','evidenceSystem','evidenceTeam','evidenceComparison','renderEvidenceResults']) assert.ok(script.includes(name)); });
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../lab/data.json'), 'utf8'));
test('all guided scenario source records are public and have provenance', () => { const ids=['PN-01','PN-02','PN-05','PN-06','PN-12','PN-13','PN-14','PN-15','PN-16','PN-17','PN-18','PN-19']; for(const id of ids){ const r=data.records.find(x=>x.id===id); assert.ok(r,'missing '+id); assert.notEqual(r.classification,'restricted'); assert.ok(r.text && r.source && r.function && r.site && r.date); } });
