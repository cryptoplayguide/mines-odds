#!/usr/bin/env node
import {
  survivalProbability, fairMultiplier, multiplierWithHouseEdge, generateTable, formatDecimal,
} from '../src/index.js';

const usage = `Usage:
  mines-odds --tiles N --mines M --picks K [--edge E] [--json]
  mines-odds --tiles N --mines M --table [--edge E] [--json]
  mines-odds --help

N, M, K: nonnegative safe integers; M and K must not exceed N.
E: house edge as a decimal fraction in [0, 1], e.g. 0.01 for 1% (default: 0).
--table: all pick counts from 0 through N, including impossible picks.
--json: exact fractions as numerator/denominator strings; undefined multipliers are null.
Text decimals are truncated to six places. Multipliers include the stake.
`;

function parse(args) {
  const values = new Set(['--tiles', '--mines', '--picks', '--edge']);
  const flags = new Set(['--table', '--json']);
  const options = new Map();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!values.has(arg) && !flags.has(arg)) throw new Error(`unknown argument: ${arg}`);
    if (options.has(arg)) throw new Error(`repeated argument: ${arg}`);
    if (flags.has(arg)) options.set(arg, true);
    else {
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${arg}`);
      options.set(arg, value);
    }
  }
  for (const required of ['--tiles', '--mines']) {
    if (!options.has(required)) throw new Error(`missing ${required}`);
  }
  if (options.has('--picks') === options.has('--table')) {
    throw new Error('supply exactly one of --picks or --table');
  }
  for (const name of ['--tiles', '--mines', '--picks']) {
    if (!options.has(name)) continue;
    const value = options.get(name);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error(`${name} must be a nonnegative safe integer`);
    }
    options.set(name, Number(value));
  }
  return options;
}

function display(value) {
  return value === null ? 'impossible' :
    `${value.numerator}/${value.denominator} (${formatDecimal(value)})`;
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    process.stdout.write(usage);
  } else {
    const options = parse(args);
    const n = options.get('--tiles');
    const m = options.get('--mines');
    const k = options.get('--picks');
    const edge = options.get('--edge') ?? '0';
    const result = options.has('--table') ? generateTable(n, m, edge) : {
      k, probability: survivalProbability(n, m, k),
      fairMultiplier: fairMultiplier(n, m, k),
      multiplier: multiplierWithHouseEdge(n, m, k, edge),
    };
    if (options.has('--json')) {
      process.stdout.write(JSON.stringify(result,
        (_, value) => typeof value === 'bigint' ? String(value) : value, 2) + '\n');
    } else {
      const rows = Array.isArray(result) ? result : [result];
      process.stdout.write('picks\tprobability\tfair multiplier\thouse multiplier\n' +
        rows.map(row => `${row.k}\t${display(row.probability)}\t${display(row.fairMultiplier)}\t${display(row.multiplier)}`)
          .join('\n') + '\n');
    }
  }
} catch (error) {
  process.stderr.write(`Error: ${error.message}\nRun mines-odds --help for usage.\n`);
  process.exitCode = 1;
}
