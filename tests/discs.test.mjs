// Catalog checks for discs.js. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// discs.js is a browser script with a top-level `const DISCS`; evaluate it and read the binding back.
const src = readFileSync(new URL('../discs.js', import.meta.url), 'utf8');
const DISCS = [...vm.runInNewContext(`${src}\nDISCS`)]; // copy into this realm so deepEqual compares plain arrays

// Same key the pages use (index.html / custom-bag.html discKey); saved and shared bags store it.
const discKey = d => `${d.brand}|${d.type}|${d.name}`;

test('catalog is non-empty', () => {
  assert.ok(Array.isArray(DISCS) && DISCS.length > 0);
});

test('every disc key is unique, so saved bags resolve to one disc', () => {
  const seen = new Set();
  const dupes = DISCS.map(discKey).filter(k => seen.has(k) || !seen.add(k));
  assert.deepEqual(dupes, []);
});

test('brand, type and stability use the values the filters know', () => {
  const brands = new Set(['innova', 'discraft', 'trilogy', 'mvp', 'discmania', 'prodigy']);
  const types = new Set(['putter', 'midrange', 'fairway', 'distance']);
  const stabilities = new Set(['very overstable', 'overstable', 'neutral', 'understable', 'very understable']);
  for (const d of DISCS) {
    assert.ok(brands.has(d.brand), `${discKey(d)}: brand`);
    assert.ok(types.has(d.type), `${discKey(d)}: type`);
    assert.ok(stabilities.has(d.stability), `${discKey(d)}: stability`);
    assert.ok(typeof d.name === 'string' && d.name.trim() === d.name && d.name, `${discKey(d)}: name`);
    assert.ok(typeof d.desc === 'string' && d.desc.length > 0, `${discKey(d)}: desc`);
  }
});

test('flight numbers are finite and in the usual ranges', () => {
  for (const d of DISCS) {
    const k = discKey(d);
    for (const f of ['speed', 'glide', 'turn', 'fade']) assert.ok(Number.isFinite(d[f]), `${k}: ${f}`);
    assert.ok(d.speed >= 1 && d.speed <= 15, `${k}: speed ${d.speed}`);
    assert.ok(d.glide >= 0 && d.glide <= 7, `${k}: glide ${d.glide}`);
    assert.ok(d.turn >= -5 && d.turn <= 2, `${k}: turn ${d.turn}`);
    assert.ok(d.fade >= 0 && d.fade <= 6, `${k}: fade ${d.fade}`);
  }
});
