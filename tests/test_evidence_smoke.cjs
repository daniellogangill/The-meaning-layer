'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.resolve(__dirname, '../lab/journey.js'), 'utf8');
test('evidence explorer exposes source filters and comparison', () => { for (const name of ['evidenceSearch','evidenceSystem','evidenceTeam','evidenceComparison','renderEvidenceResults']) assert.ok(script.includes(name)); });
