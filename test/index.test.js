import test from 'node:test';
import assert from 'node:assert/strict';
import * as odds from '../src/index.js';

const fraction = (numerator, denominator = 1n) => ({ numerator, denominator });

test('binomial computes exact coefficients including those beyond Number precision', () => {
  assert.equal(odds.binomial(0, 0), 1n);
  assert.equal(odds.binomial(5, 2), 10n);
  assert.equal(odds.binomial(5, 3), 10n);
  assert.equal(odds.binomial(5, 6), 0n);
  assert.equal(odds.binomial(100, 50), 100891344545564193334812497256n);
  assert.equal(odds.binomial(Number.MAX_SAFE_INTEGER, 1), 9007199254740991n);
});

test('survival uses distinct picks without replacement and reduces fractions', () => {
  assert.deepEqual(odds.survivalProbability(25, 3, 1), fraction(22n, 25n));
  assert.deepEqual(odds.survivalProbability(25, 3, 2), fraction(77n, 100n));
  assert.deepEqual(odds.survivalProbability(5, 2, 2), fraction(3n, 10n));
  assert.deepEqual(odds.survivalProbability(5, 2, 3), fraction(1n, 10n));
  assert.deepEqual(odds.survivalProbability(100, 50, 50),
    fraction(1n, 100891344545564193334812497256n));
  assert.deepEqual(odds.survivalProbability(Number.MAX_SAFE_INTEGER, 1, 1),
    fraction(9007199254740990n, 9007199254740991n));
});

test('empty, mine-free, all-mine and impossible boards have defined boundaries', () => {
  for (const [n, m, k, expected] of [
    [0, 0, 0, 1n], [5, 2, 0, 1n], [5, 0, 5, 1n],
    [5, 5, 0, 1n], [5, 5, 1, 0n], [5, 2, 4, 0n], [5, 2, 5, 0n],
  ]) assert.deepEqual(odds.survivalProbability(n, m, k), fraction(expected));
  assert.equal(odds.fairMultiplier(5, 2, 4), null);
  assert.equal(odds.multiplierWithHouseEdge(5, 2, 4, '1'), null);
});

test('fair and house multipliers are exact total returns including the stake', () => {
  assert.deepEqual(odds.fairMultiplier(25, 3, 2), fraction(100n, 77n));
  for (const edge of ['0.01', 0.01, fraction(1n, 100n), fraction(2n, 200n)]) {
    assert.deepEqual(odds.multiplierWithHouseEdge(25, 3, 2, edge), fraction(9n, 7n));
  }
  assert.deepEqual(odds.multiplierWithHouseEdge(5, 2, 2), fraction(10n, 3n));
  assert.deepEqual(odds.multiplierWithHouseEdge(5, 0, 1, '0.01'), fraction(99n, 100n));
  assert.deepEqual(odds.multiplierWithHouseEdge(5, 2, 2, 1), fraction(0n));
  assert.deepEqual(odds.multiplierWithHouseEdge(5, 2, 0, '0.9'), fraction(1n));
  assert.deepEqual(odds.multiplierWithHouseEdge(1, 0, 1, '0.00000000000000000001'),
    fraction(99999999999999999999n, 100000000000000000000n));
  assert.deepEqual(odds.multiplierWithHouseEdge(1, 0, 1, 1e-7), fraction(9999999n, 10000000n));
});

test('full table includes zero through all tiles, with impossible rows', () => {
  const table = odds.generateTable(3, 1, '0.1');
  assert.deepEqual(table, [
    { k: 0, probability: fraction(1n), fairMultiplier: fraction(1n), multiplier: fraction(1n) },
    { k: 1, probability: fraction(2n, 3n), fairMultiplier: fraction(3n, 2n), multiplier: fraction(27n, 20n) },
    { k: 2, probability: fraction(1n, 3n), fairMultiplier: fraction(3n), multiplier: fraction(27n, 10n) },
    { k: 3, probability: fraction(0n), fairMultiplier: null, multiplier: null },
  ]);
  assert.equal(odds.generateTable(0, 0).length, 1);
  const input = Object.freeze(fraction(1n, 10n));
  odds.generateTable(3, 1, input)[0].probability.numerator = 99n;
  assert.deepEqual(odds.generateTable(3, 1, input)[0].probability, fraction(1n));
});

test('small-board probabilities agree with exhaustive mine placement enumeration', () => {
  for (let n = 0; n <= 7; n++) {
    for (let m = 0; m <= n; m++) {
      for (let k = 0; k <= n; k++) {
        let total = 0n;
        let survivors = 0n;
        for (let mask = 0; mask < 2 ** n; mask++) {
          if (mask.toString(2).replaceAll('0', '').length !== m) continue;
          total++;
          if ((mask & (2 ** k - 1)) === 0) survivors++;
        }
        const p = odds.survivalProbability(n, m, k);
        assert.equal(p.numerator * total, survivors * p.denominator, `${n}/${m}/${k}`);
        assert.deepEqual(odds.generateTable(n, m)[k].probability, p);
      }
    }
  }
});

test('counts reject coercion, fractions, negatives, unsafe values and invalid board ranges', () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '5', 5n, null, undefined]) {
    assert.throws(() => odds.binomial(value, 0));
    assert.throws(() => odds.binomial(5, value));
    for (const args of [[value, 0, 0], [5, value, 0], [5, 0, value]]) {
      assert.throws(() => odds.survivalProbability(...args));
    }
  }
  for (const fn of [odds.survivalProbability, odds.fairMultiplier, odds.multiplierWithHouseEdge]) {
    assert.throws(() => fn(5, 6, 0), RangeError);
    assert.throws(() => fn(5, 2, 6), RangeError);
  }
  assert.throws(() => odds.generateTable(5, 6), RangeError);
});

test('house edge validates even when no picks or survival is impossible', () => {
  for (const edge of [-0.1, 1.1, NaN, Infinity, '', '1%', '1e-2', ' 0.1', '0.1\n', '0.1x',
    null, {}, [], true, 1n, fraction(-1n, 100n), fraction(2n, 1n),
    fraction(1n, 0n), fraction(1n, -2n), { numerator: 1, denominator: 100 }]) {
    for (const k of [0, 1, 5]) assert.throws(() => odds.multiplierWithHouseEdge(5, 2, k, edge));
    assert.throws(() => odds.generateTable(5, 2, edge));
  }
});

test('decimal formatting truncates exact integers without floating-point overflow', () => {
  assert.equal(odds.formatDecimal(fraction(9n, 7n)), '1.285714');
  assert.equal(odds.formatDecimal(fraction(2n, 3n), 2), '0.66');
  assert.equal(odds.formatDecimal(fraction(1n), 3), '1.000');
  assert.equal(odds.formatDecimal(fraction(999n, 100n), 0), '9');
  assert.equal(odds.formatDecimal(fraction(10n ** 400n, 3n), 2), `${'3'.repeat(400)}.33`);
  assert.equal(odds.formatDecimal(fraction(0n), 2), '0.00');
  for (const digits of [-1, 1.5, Infinity, '2']) {
    assert.throws(() => odds.formatDecimal(fraction(1n), digits));
  }
  for (const value of [null, {}, fraction(-1n), fraction(1n, 0n), { numerator: 1, denominator: 2 }]) {
    assert.throws(() => odds.formatDecimal(value));
  }
});
