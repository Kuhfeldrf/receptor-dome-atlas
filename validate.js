#!/usr/bin/env node
/*
 * Rebuilds every structure figure the atlas publishes, from index.html and
 * data/pdb_resolutions.tsv alone, and fails loudly on any disagreement.
 *
 *   node validate.js
 *
 * No dependencies. Node 16 or newer.
 *
 * The point of this file is that you should not have to take the page's word
 * for anything. It re-derives the counts rather than reading them off the page.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

let E = 0;
const bad = m => { console.log('  ✗ ' + m); E++; };
const ok  = m => console.log('  ✓ ' + m);

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// ── pull the data blocks straight out of the page and evaluate them ──────────
const grab = (open, close) => {
  const a = html.indexOf(open); if (a < 0) throw new Error('block not found: ' + open);
  const b = html.indexOf(close, a); return html.slice(a, b + close.length);
};
const ctx = {};
vm.runInNewContext(
  [grab('const PDBM = {', '};'), grab('const PDB = {', '\n};'), grab('const RECEPTORS = [', '\n];')]
    .join('\n') + '\nthis.PDBM=PDBM; this.PDB=PDB; this.RECEPTORS=RECEPTORS;',
  ctx);
const { PDBM, PDB } = ctx;
// RECEPTORS is grouped for display; the cards are its items
const REC = [].concat(...ctx.RECEPTORS.map(g => g.items));

// ── 1. shape ────────────────────────────────────────────────────────────────
const ACC = /^[OPQA-Z][0-9][A-Z0-9]{3}[0-9]$/, ID = /^[0-9][A-Za-z0-9]{3}$/;
let rows = 0, solved = 0;
for (const [k, p] of Object.entries(PDB)) {
  if (!Array.isArray(p.a) || !Array.isArray(p.x)) { bad(k + ': malformed'); continue; }
  if (!p.a.length) bad(k + ': no accession');
  for (const a of p.a) if (!ACC.test(a)) bad(k + ': bad accession ' + a);
  const seen = new Set();
  for (const s of p.x) {
    const [id, m, r] = s;
    if (!ID.test(id)) bad(k + ': bad PDB id ' + id);
    if (seen.has(id)) bad(k + ': duplicate id ' + id);
    seen.add(id);
    if (!PDBM[m]) bad(k + ' ' + id + ': unknown method code ' + m);
    if (r !== null && !(typeof r === 'number' && r >= 0.5 && r <= 40)) bad(k + ' ' + id + ': resolution ' + r);
    if (r !== null && PDBM[m] === 'NMR') bad(k + ' ' + id + ': NMR with a numeric resolution');
    rows++;
  }
  if (p.x.length) solved++;
}
if (!E) ok(`shape: ${Object.keys(PDB).length} receptor cards, ${rows} structures, every id and method code well formed`);

// ── 2. the page must match the pull, card by card ───────────────────────────
const tsv = fs.readFileSync(path.join(__dirname, 'data', 'pdb_resolutions.tsv'), 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t'));
const byAcc = {};
for (const [a, id, m, r] of tsv) (byAcc[a] = byAcc[a] || []).push([id, m, r === 'NA' ? null : parseFloat(r)]);

let mismatch = 0, used = new Set();
for (const [k, p] of Object.entries(PDB)) {
  const want = new Map();
  for (const a of p.a) { used.add(a); for (const [id, m, r] of (byAcc[a] || [])) want.set(id, m + '|' + r); }
  const have = new Map(p.x.map(([id, m, r]) => [id.toUpperCase(), PDBM[m] + '|' + r]));
  const diff = [...have.keys()].filter(i => want.get(i) !== have.get(i))
    .concat([...want.keys()].filter(i => !have.has(i)));
  if (diff.length) { mismatch++; if (mismatch <= 5) bad(k + ': disagrees with the pull at ' + diff.slice(0, 3).join(', ')); }
}
const stranded = Object.keys(byAcc).filter(a => !used.has(a));
if (stranded.length) bad(stranded.length + ' accession(s) in the pull reach no card');
if (!mismatch && !stranded.length)
  ok(`provenance: all ${Object.keys(PDB).length} cards rebuilt from ${tsv.length} pulled records across ${used.size} accessions`);

// ── 3. every receptor card with an accession has a row, and vice versa ──────
const accOf = r => String(r.up || '').split(/[^A-Z0-9]+/).filter(x => ACC.test(x));
const missing = REC.filter(r => accOf(r).length && !PDB[r.n]).map(r => r.n);
if (missing.length) bad('cards with an accession but no structure row: ' + missing.join(', '));
const extra = Object.keys(PDB).filter(k => !REC.some(r => r.n === k));
if (extra.length) bad('structure rows naming no card: ' + extra.join(', '));
if (!missing.length && !extra.length)
  ok(`coverage: every one of the ${REC.length} receptors either carries a structure row or has no accession to resolve`);

// ── 4. the histogram is a partition at every threshold ──────────────────────
const BINS = [[0, 0, '0'], [1, 1, '1'], [2, 2, '2'], [3, 4, '3–4'], [5, 9, '5–9'],
              [10, 19, '10–19'], [20, 49, '20–49'], [50, 1e9, '50+']];
const hit = (s, t) => t > 50 ? true : (s[2] !== null && s[2] <= t);
const table = [];
for (const t of [1.5, 2, 2.5, 3, 3.5, 99]) {
  const c = BINS.map(() => 0);
  for (const p of Object.values(PDB)) {
    const n = p.x.filter(s => hit(s, t)).length;
    const i = BINS.findIndex(([a, b]) => n >= a && n <= b);
    if (i < 0) { bad('a count of ' + n + ' falls in no bin'); continue; }
    c[i]++;
  }
  const sum = c.reduce((a, b) => a + b, 0);
  if (sum !== Object.keys(PDB).length) bad('threshold ' + t + ': bins sum to ' + sum);
  const clears = Object.values(PDB).filter(p => p.x.some(s => hit(s, t))).length;
  if (c.slice(1).reduce((a, b) => a + b, 0) !== clears) bad('threshold ' + t + ': non-zero bins disagree with a direct count');
  table.push([t > 50 ? 'Any' : '≤' + t + ' Å', ...c, clears]);
}
if (!E) ok('histogram: 8 bins partition the cards at all 6 thresholds, non-zero bins agree with a direct count');

// ── what it found ───────────────────────────────────────────────────────────
const all = [].concat(...Object.values(PDB).map(p => p.x));
const res = all.map(s => s[2]).filter(r => r !== null).sort((a, b) => a - b);
const byM = {}; for (const s of all) byM[PDBM[s[1]]] = (byM[PDBM[s[1]]] || 0) + 1;
console.log('\n  ' + solved + ' of ' + Object.keys(PDB).length + ' receptors have at least one experimental structure, '
  + (Object.keys(PDB).length - solved) + ' have none');
console.log('  ' + rows + ' structures · ' + Object.entries(byM).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
console.log('  resolution ' + res[0].toFixed(2) + '–' + res[res.length - 1].toFixed(2) + ' Å, median '
  + res[Math.floor(res.length / 2)].toFixed(2) + ' Å · ' + (rows - res.length) + ' entries carry none');
console.log('\n  ' + 'threshold'.padEnd(11) + BINS.map(b => b[2].padStart(7)).join('') + '      ≥1');
for (const r of table) console.log('  ' + String(r[0]).padEnd(11) + r.slice(1, 9).map(v => String(v).padStart(7)).join('') + String(r[9]).padStart(9));

console.log(E ? `\nFAILED — ${E} error(s)` : '\nPASSED — no errors');
process.exit(E ? 1 : 0);
