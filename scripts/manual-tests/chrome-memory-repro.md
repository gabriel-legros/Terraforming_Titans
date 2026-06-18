# Chrome Memory Reproduction

This is a repeatable browser-memory run for the debug save at `test_saves/debug/memory_test_file.json`.

## Setup

Install Playwright once:

```sh
npm install --save-dev playwright
npx playwright install chromium
```

The script defaults to installed Google Chrome. To use Playwright's bundled Chromium, pass `--channel bundled`.

## Default Run

```sh
node scripts/manual-tests/run-chrome-memory-repro.js
```

Defaults:

- loads `test_saves/debug/memory_test_file.json`
- opens Chrome headed
- cycles visible tabs and subtabs once
- waits 2 seconds
- samples for 10 seconds every 0.5 seconds
- writes JSON and CSV under `scripts/manual-tests/memory-reports/`

## Useful Variants

Short smoke run:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --headless
```

Long retained-growth run:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --duration 1800 --sample 10
```

Bundled Chromium:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --channel bundled
```

Pin a panel before sampling:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --channel bundled --final-tab space --final-subtab space-artificial
```

Freeze the game loop before sampling:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --channel bundled --headless --freeze-loop
```

Force garbage collection before each sample. This is useful for separating allocation churn from retained growth:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --force-gc --duration 600 --sample 5
```

## Reading The Report

The JSON report contains:

- `summary.heapDeltaBytes`: retained or unreclaimed heap trend across the sampled window.
- `summary.domNodeDelta`: net DOM node growth.
- `samples[]`: time series for heap, DOM nodes, listener count, observer counters, and DOM creation counters.
- `finalProbe.topAdded`: most frequently inserted node signatures during the run.
- `finalProbe.topRemoved`: most frequently removed node signatures during the run.
- `finalProbe.topOperations`: hottest DOM creation/replacement call stacks during the run.
- `topHeapAllocations`: hottest V8 allocation sampling sites during the run.
- `consoleMessages` and `pageErrors`: browser errors captured during the run.

If normal samples trend up but `--force-gc` samples stay flat, the game is probably doing allocation churn rather than retaining objects.
If both runs trend up, look first at `domNodeDelta`, listener growth, `connectedExtraCount`, and the top inserted signatures.
