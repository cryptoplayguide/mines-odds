# mines-odds

Small, dependency-free ESM package for exact Mines probabilities and payout
multipliers. Uses BigInt combinatorics in Node.js 18+ and modern browsers.
All library functions are pure; there is no network access or game simulation.

For background on the formulas, read the
[Mines game odds explained guide](https://cryptoplay.guide/guides/mines-game-odds-explained/).

## Install from git

Use the clone URL of the repository hosting this source. Replace
`<repository-clone-url>` below with that URL, retaining the `git+` prefix:

```sh
npm install 'git+<repository-clone-url>'
```

No registry release is required. To run a local checkout, use Node directly;
there are no dependencies to install:

```sh
node bin/mines-odds.js --tiles 25 --mines 3 --picks 2 --edge 0.01
npm test
```

## Library usage

```js
import {
  binomial,
  survivalProbability,
  fairMultiplier,
  multiplierWithHouseEdge,
  generateTable,
  formatDecimal,
} from 'mines-odds';

binomial(25, 2);                         // 300n
survivalProbability(25, 3, 2);            // { numerator: 77n, denominator: 100n }
fairMultiplier(25, 3, 2);                 // { numerator: 100n, denominator: 77n }
const payout = multiplierWithHouseEdge(25, 3, 2, '0.01');
// { numerator: 9n, denominator: 7n }
formatDecimal(payout, 6);                 // '1.285714' (truncated)

const rows = generateTable(25, 3, { numerator: 1n, denominator: 100n });
// 26 rows, from k = 0 through k = 25
console.log(rows[2]);
// { k: 2,
//   probability: { numerator: 77n, denominator: 100n },
//   fairMultiplier: { numerator: 100n, denominator: 77n },
//   multiplier: { numerator: 9n, denominator: 7n } }
```

In a local checkout, import from `./src/index.js` instead. Browsers can load
the same file without a bundler or Node polyfills:

```html
<script type="module">
  import { survivalProbability, formatDecimal } from './src/index.js';
  const probability = survivalProbability(25, 3, 2);
  document.body.textContent = formatDecimal(probability, 2); // 0.77
</script>
```

## API and math

`n` is the number of tiles, `m` the number of mines, and `k` the number of
distinct tiles picked. Mine placements are uniform, picks are without
replacement, and no information about mine locations is available.

```text
P(survive k) = C(n - m, k) / C(n, k)
             = C(n - k, m) / C(n, m)
fair multiplier = 1 / P
house multiplier = (1 - edge) / P     (k > 0 and P > 0)
```

Multipliers are total returns including the stake; net profit per unit staked
is the multiplier minus one. For positive pick counts with nonzero survival
probability, expected total return is `1 - edge` before payout rounding or caps.
At zero picks, both multipliers are `1/1`, representing the untouched stake.
An operator's payout schedule may apply different rules, caps, or rounding.

| Function | Result |
| --- | --- |
| `binomial(n, k)` | Exact BigInt coefficient; `0n` if `k > n`. |
| `survivalProbability(n, m, k)` | Reduced fraction `{ numerator, denominator }` of BigInts. |
| `fairMultiplier(n, m, k)` | Exact reciprocal probability, or `null` if impossible. |
| `multiplierWithHouseEdge(n, m, k, edge = '0')` | Exact adjusted multiplier, or `null` if impossible. |
| `generateTable(n, m, edge = '0')` | Array of `{ k, probability, fairMultiplier, multiplier }` for every `k` from `0` to `n`. |
| `formatDecimal(fraction, digits = 6)` | Fixed decimal string, truncated toward zero using integer arithmetic. |

Counts must be nonnegative safe integer Numbers, with `m <= n` and `k <= n`
for board functions. `n = 0, m = 0, k = 0` is valid. Picking more than `n - m`
safe tiles is impossible: probability is `0/1` and multipliers are `null`.
Mine-free boards have survival probability `1/1`.

House edge is a fraction in `[0, 1]`, so `0.01` means 1%, not 0.01%.
Pass an unsigned decimal string such as `'0.01'`, a finite Number such as
`0.01`, or a fraction with BigInt fields. Fractions require a nonnegative
numerator and a positive denominator. Strings use ordinary decimal notation,
without whitespace, percent signs, or exponents. Numbers are interpreted via
their decimal string representation; use strings or fractions when exact
user-entered precision matters. Invalid types throw `TypeError`; out-of-range
counts and fractions throw `RangeError`.

`formatDecimal` takes a nonnegative BigInt fraction and a nonnegative safe
integer digit count. Decimal displays are approximations; retain fractions
for exact comparisons. Native `JSON.stringify` cannot serialize BigInts;
use a replacer such as `(_, v) => typeof v === 'bigint' ? String(v) : v`.

Binomial coefficients use multiplicative integer arithmetic rather than
factorials. The table advances probabilities incrementally. Large boards
or very long decimal output can still require substantial time and memory;
request a single probability when a full table is unnecessary.

## CLI usage

After installing from git, the executable is available as `mines-odds` in
npm scripts or through `npm exec --`:

```sh
npm exec -- mines-odds --tiles 25 --mines 3 --picks 2 --edge 0.01
npm exec -- mines-odds --tiles 25 --mines 3 --table --edge 0.01 --json
node bin/mines-odds.js --help
```

Supply `--tiles`, `--mines`, and exactly one of `--picks` or `--table`.
`--edge` defaults to `0`. Text output includes exact fractions and truncated
six-place decimals. `--json` outputs a single row or a table array, with
numerator and denominator encoded as integer strings and impossible
multipliers as `null`. Invalid arguments print an error to stderr and exit 1.

## Tests

```sh
npm test
```

Uses Node's built-in test runner. Tests cover exact known cases, large BigInt
coefficients, exhaustive small-board mine placements, input validation,
boundary cases, table consistency, decimal formatting, and CLI behavior.

## Responsible gambling

18+ only. No strategy beats the house edge. Treat gambling as entertainment,
set limits, and never chase losses. If gambling is causing harm, contact local
help resources such as your national gambling helpline, public health service,
or a licensed counselor.

## License

MIT. Copyright (c) 2026 CryptoPlay Guide.
