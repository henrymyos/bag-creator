// Share-image layout helpers in bag-card.js. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../bag-card.js', import.meta.url), 'utf8');
const { bagCardGroups, bagCardColumns } = vm.runInNewContext(`${src}\n({ bagCardGroups, bagCardColumns })`);
const plain = v => JSON.parse(JSON.stringify(v)); // copy out of the vm realm for deepEqual

const TYPES = [
  { key: 'putter', label: 'Putters', color: '#3fb950' },
  { key: 'midrange', label: 'Midranges', color: '#d29922' },
  { key: 'fairway', label: 'Fairway Drivers', color: '#a371f7' },
  { key: 'distance', label: 'Distance Drivers', color: '#f78166' },
];
const disc = (type, name, brand = 'innova') => ({ type, name, brand, speed: 2, glide: 3, turn: 0, fade: 1 });

test('groups by type in TYPES order, skips empty types, folds duplicates into qty', () => {
  const g = plain(bagCardGroups([disc('distance', 'Wraith'), disc('putter', 'Aviar'), disc('putter', 'Aviar'), disc('putter', 'Luna', 'discraft')], TYPES));
  assert.deepEqual(g.map(x => [x.label, x.count]), [['Putters', 3], ['Distance Drivers', 1]]);
  assert.deepEqual(g[0].items.map(i => [i.name, i.qty]), [['Aviar', 2], ['Luna', 1]]);
  assert.equal(g[0].items[0].flight, '2 | 3 | 0 | 1');
});

test('same mold name from two brands stays two rows', () => {
  const g = bagCardGroups([disc('putter', 'P2', 'discmania'), disc('putter', 'P2', 'innova')], TYPES);
  assert.equal(g[0].items.length, 2);
});

test('small bags use one column; big bags split into two balanced columns of whole groups', () => {
  const few = bagCardGroups([disc('putter', 'A'), disc('midrange', 'B')], TYPES);
  assert.equal(bagCardColumns(few).length, 1);
  const many = bagCardGroups(TYPES.flatMap(t => [1, 2, 3, 4, 5].map(i => disc(t.key, t.key + i))), TYPES);
  const cols = bagCardColumns(many);
  assert.equal(cols.length, 2);
  assert.deepEqual(plain(cols.map(c => c.length)), [2, 2]);
  assert.equal(cols.flat().length, many.length);
});

test('one huge group stays one full-width column', () => {
  const g = bagCardGroups(Array.from({ length: 20 }, (_, i) => disc('putter', 'P' + i)), TYPES);
  assert.equal(bagCardColumns(g).length, 1);
});

test('a heavy first group never leaves the first column empty', () => {
  const g = bagCardGroups([...Array.from({ length: 15 }, (_, i) => disc('putter', 'P' + i)), disc('distance', 'D')], TYPES);
  const cols = bagCardColumns(g);
  assert.deepEqual(plain(cols.map(c => c.length)), [1, 1]);
});
