'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(projectRoot, 'lab/app.js'), 'utf8');
const graphScript = fs.readFileSync(path.join(projectRoot, 'lab/graph.js'), 'utf8');
const dataset = JSON.parse(fs.readFileSync(path.join(projectRoot, 'lab/data.json'), 'utf8'));

async function launch() {
  const dom = new JSDOM(html, {url: 'https://example.test/', runScripts:'outside-only',
    pretendToBeVisual:true});
  const {window} = dom;
  const errors=[];
  window.addEventListener('error', evt => errors.push(evt.message));
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.fetch = async () => ({ok:true,json:async()=>dataset});
  window.eval(graphScript);
  window.eval(script);
  await new Promise(resolve => setTimeout(resolve, 15));
  return {window, d:window.document, errors};
}
const click = (d,sel) => {
  const target=d.querySelector(sel);
  assert.ok(target,'Expected element '+sel);
  target.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true}));
};

test('loads reproducible snapshot and moves through all seven workbenches', async () => {
  const {window,d,errors} = await launch();
  assert.match(d.querySelector('#datasetStatus').textContent,/139 source records/);
  assert.ok(d.querySelector('h1').textContent.includes('enterprise mess'));
  for (const [view, headline] of [
    ['sources','Evidence, not just documents'],
    ['terms','One organisation'],
    ['graph','See the relationships'],
    ['conflicts','Conflicting figures'],
    ['stewards','AI proposes'],
    ['pipeline','Measured, not imagined'],
    ['executive','From enterprise mess']
  ]) {
    click(d,'nav [data-view="'+view+'"]');
    assert.match(d.querySelector('#content').textContent, new RegExp(headline));
  }
  assert.deepEqual(errors, []);
  window.close();
});

test('searches real synthetic records, opens provenance, preserves redactions', async () => {
  const {window,d,errors} = await launch();
  click(d,'nav [data-view="sources"]');
  const search=d.querySelector('#sourceSearch');
  search.value='Crusher';
  search.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(d.querySelector('#sourceSearch').value,'Crusher');
  assert.ok(d.querySelectorAll('tbody tr').length>0);
  click(d,'tbody tr[data-action="doc"]');
  const dialog=d.querySelector('#docDialog');
  assert.ok(dialog.hasAttribute('open'));
  assert.match(dialog.textContent,/Original observed content/);
  assert.match(dialog.textContent,/Provenance/);
  click(d,'[data-action="close-dialog"]');
  assert.ok(!dialog.hasAttribute('open'));
  assert.match(d.querySelector('#content').textContent,/Restricted record stubs|restricted record stubs|restricted record/);
  assert.deepEqual(errors, []);
  window.close();
});

test('renders interactive knowledge graph and discrepancy comparisons', async () => {
  const {window,d,errors} = await launch();
  click(d,'nav [data-view="graph"]');
  assert.ok(d.querySelectorAll('.graph-object').length>15);
  assert.ok(d.querySelectorAll('.graph-document').length>=10);
  assert.ok(d.querySelectorAll('.graph-issue').length>=1);
  assert.ok(d.querySelectorAll('.graph-link').length>20);
  click(d,'.graph-term');
  assert.ok(d.querySelectorAll('.graph-object').length>15);
  click(d,'nav [data-view="conflicts"]');
  assert.match(d.querySelector('#content').textContent,/True conflicts/);
  click(d,'[data-action="compare"]');
  assert.match(d.querySelector('#content').textContent,/Compared source evidence/);
  assert.deepEqual(errors, []);
  window.close();
});

test('steward decisions stay local and narrative citations respond to scenarios', async () => {
  const {window,d,errors} = await launch();
  click(d,'nav [data-view="stewards"]');
  click(d,'[data-action="review"][data-value="approved"]');
  assert.equal(Object.keys(JSON.parse(window.localStorage.getItem('meaning-lab-decisions-v2'))).length,1);
  assert.match(d.querySelector('#content').textContent,/Approved locally/);
  click(d,'nav [data-view="executive"]');
  const select=d.querySelector('#questionSelect');
  select.value='safety';select.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.match(d.querySelector('#content').textContent,/isolation permit/i);
  click(d,'[data-action="answer"][data-value="naive"]');
  assert.match(d.querySelector('#content').textContent,/Illustrative naive response/);
  click(d,'[data-action="answer"][data-value="governed"]');
  assert.match(d.querySelector('#content').textContent,/Interpreted position/);
  const input=d.querySelector('#customQuery');input.value='permit';
  click(d,'[data-action="custom-search"]');
  assert.match(d.querySelector('#customResults').textContent,/distinct evidence threads retrieved/);
  assert.match(d.querySelector('#customResults').textContent,/Automatically flagged disagreement/);
  assert.deepEqual(errors, []);
  window.close();
});


test('multilayer executive graph shows grounded source-to-meaning-to-decision paths',async()=>{
  const {window,d,errors}=await launch();
  const engine=require('../lab/graph.js');
  for(const lens of ['production','finance','safety']){
    const g=engine.build(dataset,{site:'Pilbara North',lens});
    assert.ok(g.sourceCount>=8,'evidence breadth for '+lens);
    assert.ok(g.conceptCount>=3,'semantic breadth for '+lens);
    assert.ok(g.edges.some(e=>e.kind==='observed mention'));
    assert.ok(g.edges.some(e=>e.kind==='decision context'));
    assert.ok(g.nodes.some(n=>n.kind==='issue'));
    assert.ok(g.nodes.some(n=>n.kind==='decision'));
    const permitted=new Set(dataset.records.filter(r=>r.classification==='internal').map(r=>r.id));
    for(const e of g.edges)for(const id of e.sourceIds||[])
      assert.ok(permitted.has(id),'link citation must resolve: '+id);
    assert.equal(g.nodes.filter(n=>n.kind==='document').length,new Set(g.nodes.filter(n=>n.kind==='document').map(n=>dataset.records.find(r=>r.id===n.ref).thread)).size);
  }
  click(d,'nav [data-view="graph"]');
  assert.match(d.querySelector('#content').textContent,/source records → business meanings/);
  assert.equal(d.querySelectorAll('.graph-document').length>0,true);
  click(d,'.graph-document');
  assert.ok(d.querySelector('#docDialog').hasAttribute('open'));
  click(d,'[data-action="close-dialog"]');
  click(d,'.graph-issue');
  assert.match(d.querySelector('.graph-detail').textContent,/Supporting source IDs/);
  const select=d.querySelector('#graphLens');
  select.value='safety';select.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.ok(d.querySelectorAll('.graph-issue').length>0);
  assert.match(d.querySelector('.graph-detail').textContent,/permit|Curated|source/i);
  assert.deepEqual(errors,[]);
  window.close();
});
