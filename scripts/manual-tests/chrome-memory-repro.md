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

Named running/paused, card-interaction, save/load, and travel matrix:

```sh
npm run audit:memory -- --channel bundled --headless --force-gc
```

Add the exhaustive project sweep. This invokes the real travel/reinitialization lifecycle for every story-project world plus each special-seed-only project world and reports aggregate registered/relevant/rendered/interacted UI coverage:

```sh
npm run audit:memory -- --story-projects --channel bundled --headless --force-gc
```

Audit mode exits nonzero when its coverage validator finds an unvisited visible panel, an unexercised building/project, an incorrect running/paused state, a missing lifecycle cycle/snapshot, a failed save/load or travel, a duplicate placeholder/DOM/data id, a disconnected tooltip anchor, a newly detached cache reference, or a page/console error. Save/load and travel cycles each restore the same input save before the lifecycle action, then validate their own post-lifecycle tab, subtab, building, and project sweep. The deep story-project pass validates travel plus target-world and currently available rendered/interacted cards per world before aggregating coverage across all worlds. It enables the target world and target story cards only inside the isolated audit setup so sequential cards can be exercised without changing gameplay unlock rules; this is UI/lifecycle coverage, not natural progression validation. The JSON report is still written and includes `audit.validation.issues`.

Use `--rounds` to control repetitions of each matrix action and `--phase-duration` to control the idle wait before the phase endpoint snapshot. A fast structural smoke run is:

```sh
npm run audit:memory -- --channel bundled --headless --rounds 1 --phase-duration 0 --settle 0 --no-heap-sampling --no-string-duplicates --no-stack-attribution
```

Short smoke run:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --headless
```

Long retained-growth run:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --duration 1800 --sample 10
```

Include Chromium-native and process memory:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --channel bundled --headless --force-gc --native-memory --duration 1800 --sample 10
```

`--native-memory` is a Windows-Node diagnostic mode for cases where Chrome Task Manager or the OS grows while the live JavaScript heap stays flat. It adds:

- matched baseline/final heap snapshots with node self-size, `extra_native_bytes`, and their combined snapshot-accounted total;
- Chromium process-tree working set, private bytes, handles, and per-process rows for the browser, renderer, GPU, network, audio, and other services;
- a process-memory time series in simple sampler JSON/CSV reports and before/after process totals in audit snapshots;
- renderer native-allocation sampling for the measured window, plus renderer/browser all-time profiles when Chromium supplies samples.

The mode takes two full heap snapshots, so it is intentionally opt-in and is not suitable for a fast structural smoke run. Native sampling is statistical and released Chrome builds may return few or no attributed native stacks; the matched `extra_native_bytes` and process totals still measure the otherwise missed memory. Change its average sampling interval with `--native-sampling-interval <bytes>`.

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

`--freeze-loop` is only for the simple sampler and is rejected in audit mode, which owns its running/manual-pause states.

Force garbage collection before each sample. This is useful for separating allocation churn from retained growth:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --force-gc --duration 600 --sample 5
```

Duplicate string summary options:

```sh
node scripts/manual-tests/run-chrome-memory-repro.js --headless --duplicate-string-min-length 32 --duplicate-string-limit 100
```

The duplicate string summary is enabled by default. Use `--no-string-duplicates` to skip the final heap snapshot if you only need time-series samples.

## Reading The Report

Audit reports contain:

- `audit.phases[]`: named before/after forced-GC snapshots, deltas, probe counters, and action coverage for each matrix phase.
- `audit.phases[].actionResult.snapshots`: forced-GC live-heap, DOM, listener, tooltip, and known-cache snapshots after every individual save/load or travel cycle.
- `audit.coverage`: current-world tab, subtab, building, colony, project, duplicate-id, and duplicate-placeholder inventory.
- `audit.projectCoverage`: aggregate project coverage; with `--story-projects`, every registered project is checked across the initial save, its target world, and other worlds where it is available.
- `audit.phases[].probe`: per-phase element creation/removal/movement, write/query, listener, and hot-signature counters. `addedNodeCount`, `removedNodeCount`, and `connectedExtraCount` count elements, not Text/Comment nodes.
- `finalProbe`: the last audit phase's probe only. Use each `audit.phases[].probe` when comparing phases.
- `nativeMemory` when enabled: matched snapshot/process baselines, final values, deltas, and native sampling profiles. `extraNativeBytes` is snapshot-accounted embedder/native memory; `chromiumPrivateBytes` and `chromiumWorkingSetBytes` are OS process-tree measurements and will normally be larger.
- `topHeapAllocations`, `duplicateStrings`, `consoleMessages`, and `pageErrors`: whole-run allocation/string/error diagnostics.

Before each forced-GC audit snapshot, the harness discards Chromium's stored console entries after its page listeners have captured errors. DevTools otherwise retains object arguments and can make repeated lifecycle logging look like a live game-object leak.

Simple sampler reports contain:

- `summary.heapDeltaBytes`: retained or unreclaimed heap trend across the sampled window.
- `summary.domNodeDelta`: net DOM node growth.
- `samples[]`: time series for heap, DOM nodes, listener count, observer counters, and DOM creation counters.
- `samples[].chromiumPrivateBytes` / `chromiumWorkingSetBytes` and browser/renderer/GPU breakdowns when `--native-memory` is enabled.
- `finalProbe.topAdded`, `topRemoved`, and `topOperations`: hottest element/signature and DOM-operation stacks over the sampled run.
- `topHeapAllocations`, `duplicateStrings`, `consoleMessages`, and `pageErrors`: allocation/string/error diagnostics.

If normal samples trend up but `--force-gc` samples stay flat, the game is probably doing allocation churn rather than retaining objects.
If both runs trend up, look first at `domNodeDelta`, listener growth, `connectedExtraCount`, and the top inserted signatures.

If the JavaScript heap stays flat but Chromium private bytes, working set, or `extra_native_bytes` grows monotonically, investigate the process breakdown next. Renderer growth points toward DOM/canvas/WebGL/media/embedder state; GPU growth points toward textures, buffers, command queues, or driver allocations; browser/service growth points outside the page heap. Working set can fall when pages are reclaimed, while private bytes more closely tracks committed process-private memory. Virtual address-space totals are diagnostic only and must not be interpreted as resident RAM.

For audit phases, compare repeated identical actions only after forced GC. Use the per-cycle lifecycle snapshots rather than just the phase endpoint. A world transition can legitimately change the live DOM and listener totals; the harness reloads the same baseline before each travel cycle so equal-index snapshots are comparable. The snapshots include connected all-node/Text/Comment counts to distinguish connected DOM from CDP's broader node counter. Treat heap movement as a confirmed leak only when it repeats and is supported by growing connected nodes/elements, listeners, detached references, tooltip anchors, or known caches.
