// Browser-safe, exact Mines arithmetic. No I/O or runtime dependencies.

function count(value, name) {
  if (typeof value !== 'number') throw new TypeError(`${name} must be a Number`);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a nonnegative safe integer`);
  }
}

function board(n, m, k = 0) {
  count(n, 'n');
  count(m, 'm');
  count(k, 'k');
  if (m > n) throw new RangeError('m must not exceed n');
  if (k > n) throw new RangeError('k must not exceed n');
}

function ratio(numerator, denominator = 1n) {
  let a = numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  return { numerator: numerator / a, denominator: denominator / a };
}

function validateFraction(value) {
  if (value === null || typeof value !== 'object' ||
      typeof value.numerator !== 'bigint' || typeof value.denominator !== 'bigint') {
    throw new TypeError('fraction must have BigInt numerator and denominator');
  }
  if (value.numerator < 0n || value.denominator <= 0n) {
    throw new RangeError('fraction must be nonnegative with a positive denominator');
  }
}

function houseEdge(value) {
  let edge;
  if (typeof value === 'number' || typeof value === 'string') {
    const numeric = typeof value === 'number';
    if (numeric && !Number.isFinite(value)) throw new RangeError('edge must be finite');
    const text = String(value);
    const pattern = numeric ? /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/ : /^(\d+)(?:\.(\d+))?$/;
    const match = pattern.exec(text);
    if (!match) throw new TypeError('edge must be a decimal fraction such as "0.01"');
    const decimals = match[2] ?? '';
    const scale = decimals.length - Number(match[3] ?? 0);
    const integer = BigInt(match[1] + decimals);
    edge = scale >= 0
      ? ratio(integer, 10n ** BigInt(scale))
      : ratio(integer * 10n ** BigInt(-scale));
  } else {
    validateFraction(value);
    edge = ratio(value.numerator, value.denominator);
  }
  if (edge.numerator > edge.denominator) throw new RangeError('edge must be between 0 and 1');
  return edge;
}

/** Exact C(n, k). Returns 0n when k > n. Counts are safe integer Numbers. */
export function binomial(n, k) {
  count(n, 'n');
  count(k, 'k');
  if (k > n) return 0n;
  const steps = Math.min(k, n - k);
  const bigN = BigInt(n);
  let result = 1n;
  for (let i = 1; i <= steps; i++) {
    const bigI = BigInt(i);
    result = result * (bigN - bigI + 1n) / bigI;
  }
  return result;
}

/** Probability of surviving k distinct picks with m uniformly placed mines. */
export function survivalProbability(n, m, k) {
  board(n, m, k);
  if (k > n - m) return ratio(0n);
  // The equivalent mine-placement formula avoids long loops for small m.
  return k <= m
    ? ratio(binomial(n - m, k), binomial(n, k))
    : ratio(binomial(n - k, m), binomial(n, m));
}

function fair(probability) {
  return probability.numerator === 0n ? null
    : ratio(probability.denominator, probability.numerator);
}

function adjusted(probability, k, edge) {
  if (probability.numerator === 0n) return null;
  if (k === 0) return ratio(1n);
  return ratio(probability.denominator * (edge.denominator - edge.numerator),
    probability.numerator * edge.denominator);
}

/** Fair total-return multiplier, or null when survival is impossible. */
export function fairMultiplier(n, m, k) {
  return fair(survivalProbability(n, m, k));
}

/** Apply an edge in [0, 1]; zero picks leaves the original stake untouched. */
export function multiplierWithHouseEdge(n, m, k, edge = '0') {
  const probability = survivalProbability(n, m, k);
  return adjusted(probability, k, houseEdge(edge));
}

/** Full table for k = 0..n, including impossible picks with null multipliers. */
export function generateTable(n, m, edge = '0') {
  board(n, m);
  const parsedEdge = houseEdge(edge);
  const rows = [];
  let probability = ratio(1n);
  for (let k = 0; k <= n; k++) {
    if (k > n - m) probability = ratio(0n);
    else if (k > 0) {
      probability = ratio(probability.numerator * BigInt(n - m - k + 1),
        probability.denominator * BigInt(n - k + 1));
    }
    rows.push({ k, probability, fairMultiplier: fair(probability),
      multiplier: adjusted(probability, k, parsedEdge) });
  }
  return rows;
}

/** Fixed decimal display, truncated (never rounded), using only integer math. */
export function formatDecimal(fraction, digits = 6) {
  validateFraction(fraction);
  count(digits, 'digits');
  const { numerator, denominator } = fraction;
  const integer = numerator / denominator;
  if (digits === 0) return String(integer);
  const decimals = (numerator % denominator) * 10n ** BigInt(digits) / denominator;
  return `${integer}.${String(decimals).padStart(digits, '0')}`;
}
