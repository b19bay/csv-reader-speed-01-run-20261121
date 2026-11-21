# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/b19bay/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/b19bay/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast drop-in for csv-reader 1.0.0: `solve.js` returns exactly csv-reader's
answer (`{columns, rows, errors}`) for every input, including its written
broken-row policy (BOM drop, LF/CRLF, stray CR, quote junk, unterminated quotes,
short/long rows). Speed comes from delimiter jumps and slice-based field
extraction instead of a per-character loop — one pass, no per-field allocation
on the clean path.

## Run it

```sh
MAKEFUN_INPUT_DIR=<dir with cases.json> MAKEFUN_OUTPUT_DIR=<dir> node main.ts
```

`main.ts` reads every case from `cases.json`, answers each with `run()` from
`solve.js`, and writes `answers.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=sshpf2pk&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
