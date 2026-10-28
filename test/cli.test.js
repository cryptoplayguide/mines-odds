import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = fileURLToPath(new URL('../bin/mines-odds.js', import.meta.url));
// File descriptors also work in sandboxes that disallow child-process pipes.
function run(...args) {
  const directory = mkdtempSync(join(tmpdir(), 'mines-odds-test-'));
  const stdoutPath = join(directory, 'stdout');
  const stderrPath = join(directory, 'stderr');
  try {
    const stdout = openSync(stdoutPath, 'w');
    const stderr = openSync(stderrPath, 'w');
    let result;
    try {
      result = spawnSync(process.execPath, [cli, ...args], { stdio: ['ignore', stdout, stderr] });
    } finally {
      closeSync(stdout);
      closeSync(stderr);
    }
    assert.ifError(result.error);
    return { status: result.status, stdout: readFileSync(stdoutPath, 'utf8'),
      stderr: readFileSync(stderrPath, 'utf8') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
const base = ['--tiles', '25', '--mines', '3', '--picks', '2'];

test('CLI prints help without needing board arguments', () => {
  for (const flag of ['--help', '-h']) {
    const result = run(flag);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /--edge/);
    assert.equal(result.stderr, '');
  }
});

test('CLI text includes exact probability and total-return multipliers', () => {
  const result = run(...base, '--edge', '0.01');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /77\/100/);
  assert.match(result.stdout, /100\/77/);
  assert.match(result.stdout, /9\/7/);
  assert.equal(result.stderr, '');
});

test('CLI serializes exact fractions as strings in JSON', () => {
  const result = run(...base, '--edge', '0.01', '--json');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    k: 2,
    probability: { numerator: '77', denominator: '100' },
    fairMultiplier: { numerator: '100', denominator: '77' },
    multiplier: { numerator: '9', denominator: '7' },
  });
  const large = run('--tiles', '100', '--mines', '50', '--picks', '50', '--json');
  assert.equal(large.status, 0);
  assert.equal(JSON.parse(large.stdout).probability.denominator, '100891344545564193334812497256');
});

test('CLI table covers all picks and represents impossible multipliers', () => {
  const result = run('--tiles', '3', '--mines', '1', '--table', '--json');
  assert.equal(result.status, 0);
  const rows = JSON.parse(result.stdout);
  assert.deepEqual(rows.map(row => row.k), [0, 1, 2, 3]);
  assert.equal(rows[3].fairMultiplier, null);
  assert.equal(rows[3].multiplier, null);
  const text = run('--tiles', '2', '--mines', '2', '--table');
  assert.equal(text.status, 0);
  assert.match(text.stdout, /impossible/);
  const empty = run('--tiles', '0', '--mines', '0', '--picks', '0', '--json');
  assert.equal(empty.status, 0);
  assert.equal(JSON.parse(empty.stdout).probability.numerator, '1');
});

test('CLI defaults to a zero edge and distinguishes zero picks from missing picks', () => {
  const result = run(...base, '--json');
  assert.equal(result.status, 0);
  const row = JSON.parse(result.stdout);
  assert.deepEqual(row.multiplier, row.fairMultiplier);
  const zero = run('--tiles', '5', '--mines', '2', '--picks', '0', '--edge', '0.5', '--json');
  assert.equal(zero.status, 0);
  assert.deepEqual(JSON.parse(zero.stdout).multiplier, { numerator: '1', denominator: '1' });
});

test('CLI rejects missing, unknown, repeated, conflicting and malformed arguments', () => {
  for (const args of [
    [], ['--tiles', '5'], ['--tiles', '5', '--mines', '2'],
    [...base, '--table'], [...base, '--oops'], [...base, '--json', '--json'],
    [...base, '--tiles', '10'], [...base, '--edge'], [...base, '--edge', '--json'],
    [...base, '--edge', '1%'], [...base, '--edge', '1.1'],
    ['--tiles', '-1', '--mines', '0', '--table'],
    ['--tiles', '2.5', '--mines', '0', '--table'],
    ['--tiles', '2x', '--mines', '0', '--table'],
    ['--tiles', '2\n', '--mines', '0', '--table'],
    ['--tiles', '1e2', '--mines', '0', '--table'],
    ['--tiles', '9007199254740992', '--mines', '0', '--table'],
    ['--tiles', '2', '--mines', '3', '--table'],
    ['--tiles', '2', '--mines', '1', '--picks', '3'],
    [...base, 'extra'], ['--tiles=25', '--mines', '3', '--picks', '2'],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Error:/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});
