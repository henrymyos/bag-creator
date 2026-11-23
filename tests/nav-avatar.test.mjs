// applyNavAvatar in supabase-config.js. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../supabase-config.js', import.meta.url), 'utf8');

test('photo URL becomes an img src, never parsed as markup', () => {
  const els = { 'nav-avatar': { style: {} } };
  const document = {
    getElementById: id => els[id] ?? null,
    createElement: tag => ({ tag }),
  };
  els['nav-avatar'].replaceChildren = (...kids) => { els['nav-avatar'].kids = kids; };
  Object.defineProperty(els['nav-avatar'], 'innerHTML', { set() { throw new Error('innerHTML used'); } });
  const evil = 'x" onerror="alert(1)';
  vm.runInNewContext(`${src}\napplyNavAvatar('#39d353', ${JSON.stringify(evil)}, 'H')`, { document });
  const [img] = els['nav-avatar'].kids;
  assert.equal(img.tag, 'img');
  assert.equal(img.src, evil);
  assert.equal(img.alt, '');
});
