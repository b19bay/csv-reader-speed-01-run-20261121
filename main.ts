// csv-reader-speed-01-run-20261121: the harness runs `node /bot/main.ts` (node22).
// It reads every case from /input/cases.json (a JSON array of {id, input}),
// answers each one alone with run() from solve.js, and writes
// /output/answers.json: a JSON array of the answers, one per case and in the
// cases' order. Outside a container MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /input and /output.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

// V8's incremental marking off, set before solve.js is imported so all of its work runs under it (the rules: the house
// baseline runs with --no-incremental-marking, and an entry may tune V8's flags too).
setFlagsFromString('--no-incremental-marking');

/** solve.js, imported by its URL (a .js module carries no types) and typed by its contract. */
const { run } = (await import(new URL('./solve.js', import.meta.url).href)) as { run: (input: unknown) => unknown };

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Authored validation (written for this entry, not copied from the driver) ---
//
// The harness hands main.ts whatever cases.json holds, so the shape is checked
// before any case is answered: the file must parse to an array, and every case
// must be an object carrying an `input` object with a `text` string. A case
// that fails the check stops the run with a named error instead of silently
// producing a wrong-length answers file. After answering, the answers are
// checked again: one answer per case, in order, before anything is written.

function validateCases(cases: unknown): { id: string; input: { text: string; header?: boolean } }[] {
  if (!Array.isArray(cases)) throw new Error('cases.json is not a JSON array');
  return cases.map((c, i) => {
    if (c === null || typeof c !== 'object') throw new Error(`case ${i} is not an object`);
    const input = (c as { input?: unknown }).input;
    if (input === null || typeof input !== 'object') throw new Error(`case ${i} carries no input object`);
    const text = (input as { text?: unknown }).text;
    if (typeof text !== 'string') throw new Error(`case ${i} input.text is not a string`);
    return c as { id: string; input: { text: string; header?: boolean } };
  });
}

function validateAnswers(cases: unknown[], answers: unknown[]): void {
  if (answers.length !== cases.length) {
    throw new Error(`answered ${answers.length} cases for ${cases.length} inputs`);
  }
}

const cases = validateCases(JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')));
const answers: unknown[] = [];
for (const c of cases) answers.push(run(c.input));
validateAnswers(cases, answers);
writeFileSync(join(OUTPUT_DIR, 'answers.json'), JSON.stringify(answers));
