# mines-odds implementation plan

Build the package in the current directory, as requested; do not run git.
Use the sibling verifier's small, dependency-free ESM style.

## Interfaces and decisions

- `binomial(n, k)` returns a BigInt; counts are nonnegative safe integer Numbers.
- `survivalProbability(n, m, k)` returns a reduced `{ numerator, denominator }`
  BigInt fraction, using uniform mine placement and distinct picks.
- `fairMultiplier(n, m, k)` returns its reciprocal, or `null` when impossible.
- `multiplierWithHouseEdge(n, m, k, edge = '0')` scales by `1 - edge`.
  Edge accepts decimal strings, finite Numbers, or BigInt fractions in [0, 1].
  Zero picks returns 1, representing the untouched stake.
- `generateTable(n, m, edge = '0')` returns rows for k=0 through n with
  `{ k, probability, fairMultiplier, multiplier }`, including impossible rows.
- `formatDecimal(fraction, digits = 6)` formats by integer division with
  truncation; exact fractions remain the primary result.
- CLI: `--tiles N --mines M [--picks K | --table] [--edge E] [--json]`.
  JSON fractions contain decimal integer strings; text shows exact fractions.

## Tasks

1. Write library tests with literal exact cases (25/3/2 = 77/100,
   fair 100/77, 1% edge 9/7), large binomials, boundaries, invalid inputs,
   exhaustive small-board enumeration, and decimal formatting. Run RED;
   implement browser-safe pure functions in src/index.js; run GREEN.
2. Write subprocess CLI tests for help, results, JSON, full table, and malformed
   arguments. Run RED; implement bin/mines-odds.js using manual argv parsing;
   run GREEN.
3. Add package metadata, MIT license, and README covering git installation,
   library/browser/CLI examples, formulas, edge and payout conventions,
   limitations, and responsible gambling. Include the requested guide URL
   exactly once as the sole prose link. No publishing configuration.
4. Run npm test, check executable CLI and package contents, and review all
   requirements against the files. No commits, worktrees, or git commands.

## Review focus

Protect zero-pick and impossible-pick semantics, exact edge parsing, large
fractions, input validation, output serialization, and CLI failure exit codes.

## Verification record

All four tasks completed. The 9 library tests and 6 CLI tests pass, as does
the required `npm test` command. CLI subprocess tests capture output through
temporary file descriptors because this sandbox rejects pipe capture.
Package dry-run, package-name imports, executable permissions, license text,
and the single README URL were checked. A read-only independent review found
no issues and compared 23,821 board/pick cases with the product formula.
No git commands were run. Live remote installation and actual browser
execution were not performed.
