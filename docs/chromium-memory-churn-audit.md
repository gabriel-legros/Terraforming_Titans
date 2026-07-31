# Chromium Memory and DOM Churn Audit

## Goal

Exercise the game in real Chromium across its major UI and lifecycle states, identify retained-memory growth and avoidable recurring DOM work, fix confirmed problems, and rerun the same scenarios to verify the result.

## Scope

The audit covers:

- every visible main tab and subtab in a late-game save;
- every registered building and project that the save can render, including grouped and shared project cards;
- repeated card interactions such as collapse/expand, step changes, reversible toggles, selects, and tooltips;
- the live game loop at normal speed and the render loop while paused;
- repeated save/load cycles;
- travel followed by another complete UI sweep, then reload and repeat;
- listener counts, DOM-node counts, detached references exposed by game caches, element creation/removal/movement, text and class writes, DOM queries, JavaScript heap, console errors, and page errors.
- optional heap-snapshot embedder/native bytes and Chromium browser/renderer/GPU/service working-set and private-memory totals for cases where OS memory diverges from the JavaScript heap.

## Method

1. Record a forced-GC idle baseline using `test_saves/debug/memory_test_file.json`.
2. Extend the repository-owned Playwright/CDP harness with named, repeatable scenarios and per-phase measurements.
3. Inventory runtime coverage and fail the audit when registered entities or visible panels are skipped unexpectedly.
4. Run the complete matrix before production fixes and archive the ignored JSON reports under `scripts/manual-tests/memory-reports/`.
5. Rank findings by retained growth first, then repeated connected-node moves/replacements, listener growth, element creation, and redundant writes/queries.
6. Fix findings in small batches. After each batch, rerun the scenario that exposed it.
7. Run the full matrix again, compare before/after metrics, inspect representative UI screenshots, run syntax checks, and run the Windows Jest command.

## Scenario Matrix

| Scenario | Running | Paused | Repeated | Coverage target |
| --- | ---: | ---: | ---: | --- |
| Idle render | yes | yes | sampled window | heap, nodes, listeners, recurring writes |
| Main tabs/subtabs | yes | yes | multiple rounds | every visible tab/subtab |
| Building cards | yes | yes | multiple rounds | every registered/renderable building |
| Project cards | yes | yes | multiple rounds | every registered/renderable project/group row |
| Save/load | yes | yes | multiple cycles | full rebuild and post-load sweep |
| Planet travel | yes | yes | multiple cycles from clean reload | full rebuild and post-travel sweep |

## Triage Rules

- Treat forced-GC heap, DOM-node, document, or listener growth across repeated identical cycles as a leak suspect.
- Treat identical inserted and removed signatures under the same parent as bad churn even when final node count is flat.
- Ignore one-time nodes that correspond to a newly unlocked or first-opened feature, but verify that the second and later passes are stable.
- Attribute fixes to browser stacks and report signatures; do not make speculative broad rewrites.
- Preserve keyed reconciliation, focus, scroll position, event listeners, and tooltip ownership.

## Progress Log

### 2026-07-16 - Inventory and baseline

- Confirmed a clean starting worktree.
- Found the existing CDP harness at `scripts/manual-tests/run-chrome-memory-repro.js`, the page-side DOM probe at `scripts/dom-leak`, and the JSDOM late-game leak harness at `__tests__/late-game-ui-memory-leaks.test.js`.
- Ran the existing late-game Chromium harness headlessly with bundled Chromium, forced GC, a 10-second sample window, and heap/string profiling disabled for a low-noise churn baseline.
- Baseline report: `scripts/manual-tests/memory-reports/chrome-memory-2026-07-16T23-13-44-929Z.json` (ignored by Git).
- Forced-GC heap was flat (`-203,852` bytes) and DOM count was broadly flat (`-18` nodes), but the probe observed `43,746` added and `43,740` removed elements, `34,972` `textContent` writes, `25,146` class-list writes, and `19,110` DOM queries.
- The largest recurring signature was the Save & Settings achievement list. Its stable rows were appended again and all text/classes were rewritten on every render, producing most of the apparent remove/add traffic.
- Runtime inventory found 8 main tabs, 41 subtabs, 52 buildings, 8 colonies, and 109 project definitions in the late-game browser state.
- Added the named audit matrix to the existing harness and captured its first full before-fix report at `chrome-memory-2026-07-16T23-30-38-492Z.json`.

### 2026-07-16/17 - Coverage and measurement harness

- The expanded harness now distinguishes true manual pause (`setGameSpeedChoice(0)`) from stopping the renderer, records listener adds/removes and connected-node moves, captures layout/style timing, scans known UI caches for detached nodes, and emits per-phase JSON/CSV results.
- Added an optional story-project sweep. It derives target worlds from the live project registry, invokes the real travel/reinitialization lifecycle for all 13 story worlds plus the `teebeepee` special-seed world, renders every category, and exercises every target-world and currently available project card. The audit setup enables the destination and target story cards, so this is exhaustive UI/lifecycle coverage rather than natural progression validation.
- Early deep-sweep report `chrome-memory-2026-07-16T23-45-50-799Z.json` reached 109/109 registered projects in aggregate and all 52 buildings, but the final passing exhaustive report below is the validation source of truth.
- Repeated navigation improved from 876 connected moves, 4,401 added/removed nodes, 24,170 text writes, and 17,764 class writes in the first matrix to 143 moves, 705 added/removed nodes, 12,616 text writes, and 11,919 class writes after the first batches.
- The idle Settings phase improved from 195 connected moves and 975 added/removed nodes to zero moves and zero added/removed nodes.
- The final story sweep intentionally makes the target world's story projects available inside the isolated audit setup. This lets sequential projects be rendered and interacted without changing production unlock rules.
- The lifecycle phases restore the same baseline JSON at the beginning of every cycle and record a forced-GC snapshot after every save/load or travel cycle. That avoids comparing different worlds or progressively advanced saves.

### 2026-07-17 - Final exhaustive and retained-growth passes

- Diagnostic six-cycle lifecycle report: `chrome-memory-2026-07-17T01-50-43-584Z.json`. Its exact +10 CDP nodes per load and apparent heap slope led to the retained-object census described below.
- Post-fix three-cycle lifecycle report: `chrome-memory-2026-07-17T02-11-05-419Z.json`.
- Final exhaustive report: `chrome-memory-2026-07-17T02-14-44-244Z.json`.
- Final detached-cache cleanup smoke report: `chrome-memory-2026-07-17T02-24-48-295Z.json`.
- The final exhaustive validator passed with 109/109 projects registered, relevant, rendered, and interacted in aggregate; all 52 buildings exercised; all 8 colonies rendered/inventoried; and 8 main tabs plus 41 total subtabs exercised. Forty subtabs are visible in the initial late-game state and the Story subtab is exercised after its story-world reveal.
- The story sweep completed real travel to Titan, Callisto, Ganymede, Vega 2, Venus, Umbra, Solis Prime, Gabbag, Hades, Poseidon, Styx, Zeus, and Olympus, plus the `teebeepee` special-seed world.
- No duplicate DOM ids, duplicate placeholder options, disconnected tooltip anchors, console errors, or page errors remained. After the final cache-ownership fixes, all 13 matrix phases also began and ended with zero detached references in the expanded known-cache scan.

### 2026-07-19 - Automation preset refactor smoke pass

- Post-refactor report: `chrome-memory-2026-07-19T23-03-39-639Z.json`.
- All 13 phases retained zero detached references in the known-cache scan, including both save/load and travel while running and manually paused. This covers the automation preset controllers and cached assignment rows that now rebind through weak manager identities and current-manager resolvers.
- Coverage validation failed only on disconnected project-cost tooltip anchors from the unchanged `projectsUI.js` cost path (`Energy: 10B / Required: 10B / Colony available: 0`). The count was already 1 in the first navigation phase and rose across save/load and travel; no automation tooltip or detached-cache finding was reported.
- The Buildings, Projects, and Colony automation cards were captured and inspected at `artifacts/screenshots/automation-buildings-refactor.png`, `artifacts/screenshots/automation-projects-refactor.png`, and `artifacts/screenshots/automation-colony-refactor.png`.

### 2026-07-27 - World visualizer shader pass

- Matched Mars speedrun reports: before `chrome-memory-2026-07-27T21-39-00-389Z.json`, after `chrome-memory-2026-07-27T22-32-43-836Z.json`.
- Recurring `createElement canvas` operations fell from 201 to zero. The measured-window element-creation delta fell from 199 to zero, while connected element and listener totals did not grow.
- Normalized script time fell from `0.215` to `0.127` seconds per wall-clock second, about a 41% reduction. The after-run heap moved from `40,196,868` to `40,012,300` bytes and reported no console or page errors.
- A focused 15-second visualizer benchmark recorded zero canvas creations and zero crater-texture rebuilds after setup. Across 343 frames, CPU frame-submission duration had a `0.4 ms` p95 and `10.6 ms` maximum; GPU texture count stayed at 9.
- Deterministically seeded 768 px before/after captures of initial Zeus, clouded Venus, evolved Mars, partial/full ecumenopolis, and partial/full Nanoworld differed by at most one 8-bit channel value. No pixel exceeded that tolerance, including seam-facing full-coverage captures.

### 2026-07-30/31 - Zeus native/process-memory extension

- Added opt-in `--native-memory` coverage to the Chromium harness. It records matched heap-snapshot `extra_native_bytes`, renderer native-allocation profiles, and Windows working-set/private-byte totals for each Chromium browser, renderer, GPU, and service process. Simple samples and audit phase snapshots now carry those OS metrics into JSON and CSV.
- Native smoke report: `chrome-memory-2026-07-31T01-58-03-516Z.json`. The loaded Zeus save accounted for about `91 MiB` in the baseline heap snapshot but the Chromium process tree was already about `512 MiB` private and `732 MiB` working set. This confirms that the earlier JavaScript/DOM-only audit did not measure most of the memory visible to Chrome Task Manager or Windows.
- Diagnostic matrix report: `chrome-memory-2026-07-31T02-00-27-594Z.json`. It reached about `1,007 MiB` working set and `672 MiB` private after broad UI/lifecycle initialization, versus `684 MiB` working set and `507 MiB` private at baseline. The matched snapshot total rose only from `91.02` to `112.85 MiB`; `extra_native_bytes` rose from `6.04` to `8.47 MiB`. The process delta was concentrated in the renderer (`+131 MiB` private) with a smaller GPU contribution (`+32 MiB` private), demonstrating how a player can observe roughly 1-1.2 GB without a comparable live-JavaScript increase. This report is diagnostic rather than a passing coverage result because the Zeus save cannot perform the matrix's expected Olympus travel and contains pre-existing disconnected tooltip anchors.
- Focused post-initialization Zeus Story Projects hold: `chrome-memory-2026-07-31T02-04-26-973Z.json`. Across 121 seconds with forced GC, the JavaScript sample moved from `27.58` to `28.32 MiB`, DOM nodes changed by `+6`, Chromium private bytes fell `9.39 MiB`, and working set fell `19.51 MiB`. Matched endpoint snapshots fell from `100.43` to `98.70 MiB`, including `extra_native_bytes` from `8.05` to `7.98 MiB`; endpoint process private bytes fell `17.35 MiB`. The active Zeus project view therefore showed no continuing native, GPU, renderer, DOM, or JavaScript growth after its one-time UI initialization.
- Released bundled Chromium returned no measured-window native allocation stack samples in these runs, so native stack attribution remains opportunistic. The process breakdown and matched `extra_native_bytes` measurements remain usable when that profile is empty.

### 2026-07-31 - Fifteen-minute general exploration and allocation instrumentation

- Extended the simple sampler with `--explore-every` for scheduled full tab/subtab sweeps and `--allocation-timeline` for the same allocation-tracking mode used by Chrome's Allocation instrumentation on timeline. The latter records live-object fragments and streams/discards the final traced snapshot after extracting its header, avoiding a second copy of the full profile in the harness.
- Generic late-game ordinary exploration report: `chrome-memory-2026-07-31T02-26-02-242Z.json`. Seven complete UI sweeps across 917.7 seconds ended only `3.91 MiB` higher in Chromium private memory and `14.80 MiB` lower in working set. Matched snapshot-accounted memory changed from `82.98` to `84.03 MiB`; `extra_native_bytes` changed from `11.14` to `11.16 MiB`. GPU private memory fell `0.90 MiB`.
- Paused-render control report: `chrome-memory-2026-07-31T02-26-02-243Z.json`. Across 905 seconds, private memory fell `15.98 MiB`, working set fell `33.52 MiB`, JavaScript heap moved only `0.64 MiB`, DOM changed by one node, and matched snapshot memory fell from `82.60` to `80.29 MiB`.
- Forced-GC allocation-instrumentation report: `chrome-memory-2026-07-31T02-26-02-256Z.json`. During recording, private memory rose `20.91 MiB` while the tracked live size rose `3.85 MiB`; the second-half private slope was about `0.13 MiB/min`. After tracking stopped, the matched private checkpoint was only `3.63 MiB` above baseline.
- No-forced-GC allocation-instrumentation report: `chrome-memory-2026-07-31T02-45-50-144Z.json`. The renderer made one-time profiler bookkeeping steps from about `550` to `770 MiB` private while tracked live objects rose only `3.86 MiB`. Once tracking stopped, the matched process checkpoint was only `8.83 MiB` above baseline and working set was `4.49 MiB` below baseline. Roughly `211 MiB` was therefore released with the profiler itself. The traced snapshot was about `86.93 MiB`, with 2,371 trace functions and `11.21 MiB` of `extra_native_bytes`.
- Player-save Zeus exploration before the WGC UI fix: `chrome-memory-2026-07-31T03-02-50-970Z.json`. Seven sweeps across 909 seconds kept matched snapshot memory flat (`100.28` to `100.19 MiB`), `extra_native_bytes` slightly down, working set `6.81 MiB` down, and GPU private memory flat. The run did expose `+307` connected nodes/`+148` elements, dominated by hidden Warp Gate Command log lines and success/artifact spans.
- Warp Gate Command retains its existing 100-entry-per-team data cap but no longer formats or materializes log DOM while a team's log panel is hidden. Closing a log now releases its line/span subtree; reopening synchronously renders the latest capped history. A direct interaction check observed `0 -> 100 -> 0 -> 100` log lines across open, close, hidden update, and reopen, with the newest entry present and no page error.
- Post-fix short stress report: `chrome-memory-2026-07-31T03-19-49-385Z.json`. Ten rapid full UI sweeps left DOM and listeners flat and produced no connected added-node signature.
- Matched post-fix Zeus report: `chrome-memory-2026-07-31T03-20-57-333Z.json`. Seven sweeps across 908.9 seconds changed connected nodes by only `+2` and elements/listeners by `+1`, entirely from a legitimate newly appearing Golden Asteroid button. Matched snapshot memory fell `0.21 MiB`, `extra_native_bytes` was unchanged, private memory fell `1.93 MiB`, and working set fell `14.26 MiB`.
- None of the ordinary, paused, player-save, or allocation-instrumented fifteen-minute runs reproduced multi-gigabyte retained growth. The observed 1-1.2 GB high-water mark remains credible after broad initialization, while Allocation Timeline itself can add hundreds of MiB of temporary renderer memory. The supplied 9 GB observation is not attributable to a universal renderer, GPU, DOM, listener, or JavaScript leak in the exercised state; reproducing it requires a more specific player action/state or a substantially longer profiler recording.

## Findings and Fixes

### Retained listeners and lifecycle cleanup

- `StoryManager` registered a bound `journalFinished` callback but attempted to remove a newly bound function. Repeated load/new-game cycles therefore retained old managers and callbacks. The manager now owns the exact bound callback, removes it in `destroy()`, and load/new-game replacement destroys the old instance first. A CDP event-listener check remains at one live listener after repeated loads, new game, and travel instead of growing from one to five.
- Dynamic tooltip anchors are now released before intentional Life Automation and Warp Gate Command subtree rebuilds. The corresponding controls do not use the tracked-listener registry, so only tooltip ownership is cleaned there.
- The deep sweep found stale `projectElements` references to a removed Space Storage cost subtree and removed Space Mining target options. Those exact cache references are now cleared with the DOM removal.
- Space and Settings subtab managers are reset and reused during game-state reconstruction instead of adding another click listener to every existing tab. The repeated lifecycle delta fell from 12 retained listeners per cycle to zero. Running travel removes two listeners because the destination legitimately exposes fewer controls; paused travel returns to zero delta.
- Planet visualizer disposal now removes its resize/debug handlers, disposes deduplicated geometries, materials, textures, uniform textures, renderer state, and the WebGL context, removes the old canvas, and clears cached scene references. A direct CDP lifecycle check created four renderers, observed three renderer/context disposals, and left one active canvas/debug surface.
- The two persistent structure-cost roots for Aerostat Colony and Space Mirror each accumulated three listener-cleanup closures per load. Each closure set retained a removed five-node inline cost-tooltip tree, explaining the exact +10 CDP-node step per load. The transient tooltip anchors now own those event listeners directly; `cleanupDynamicTooltipsIn()` removes the same handlers when the anchor is reconciled away.
- `GalaxyOperationUI` kept the manager passed during its first build, retaining exactly one obsolete Galaxy/operation/invasion graph after replacement. `updateGalaxyUI()` now rebinds the current manager context on every update. A six-generation WeakRef test collected all 18 replaced manager references, and CDP object queries reported exactly one current Galaxy and operation manager throughout a 16-load census.
- Artificial World start/cancel buttons and stash controls were replacing their own tooltip children with `textContent`, leaving eight cached tooltip nodes detached. Those controls now keep persistent label spans. Automation card headers likewise preserve their eight status spans instead of clearing them. The expanded cache scan fell from 16 stable detached references to zero in every phase.
- Life Designer rebuilds now clean dynamic tooltips and invalidate their UI cache before replacing the layout. This removed 30 disconnected tooltip anchors per initialization. Hazardous Machinery summary rows and their tooltip are reconciled in place instead of recreated on each update.
- Full Story, Space, and procedural-world equilibration state was being logged from repeatable lifecycle paths. With DevTools attached, Chromium retained those object graphs and produced an apparent 0.25-0.5 MiB/load heap slope. The state dumps were removed, and the audit discards already-captured console entries before forced-GC snapshots.

### Repeated UI churn

- Achievement rows retain their keyed position and update summary/text/class/style values only when changed.
- Research rendering updates only the active category during the recurring render path; category activation forces the newly selected category once. Repeated values and control states are guarded.
- Terraforming Summary keeps atmosphere rows in stable order and guards repeated water/pressure text, class, style, and HTML writes.
- Space Story no longer updates the hidden Artificial World UI every frame. Story planet rows and status controls now guard repeated values.
- Solis quest and shop labels/counts use persistent nodes instead of creating and replacing spans every frame. In the same four-second Chromium phase, node creation and add/remove traffic fell from 128/768 to zero; text writes fell from about 5,800 to 2,410 and class writes from about 5,200 to 1,413.
- Galaxy's empty selected-sector state no longer calls `replaceChildren()` every render. Map controls, popups, fleet shop, and attack-history rows guard repeated state writes.
- Galaxy operation forms, fleet-capacity tooltip rows, logistics values, and operation visibility now update only when their values change. In a matched panel run, text writes fell from 6,484 to 2,777 and class writes from 2,916 to 688 while element/listener totals stayed flat.
- Shared assignment controls now reconcile selected targets/options and guard labels, disabled states, values, and toggles. One targeted unchanged-disabled-state signature fell from 5,298 writes to 40.
- Artificial-world history and invasion summaries preserve stable keyed rows and order instead of re-appending unchanged entries.
- Warp Gate Command keeps its capped operation-log data without materializing or rebuilding the formatted line/span DOM for closed log panels. Opening renders the latest history immediately; closing releases it.
- Project-specific controls for infrastructure, manufacturing, import, disposal, specialization, lifters, Dyson construction, and related cards now reuse their controls and guard recurring value/class/style writes.
- A final steady-state render sample across the converted hot panels created, added, removed, or moved zero elements; only live resource values continued to change.

### Simulation/render boundary

- Recurring project and automation logic no longer calls project, resource, Space Storage, or assignment UI refresh functions. The normal `updateRender()` path owns those updates.
- Spaceship-assignment and Golden Asteroid UI refreshes moved out of production/tick logic.
- Terraforming graph data collection remains in the simulation update, while canvas drawing now runs from the render path.
- Auto-travel checks UI-owned tab state without querying the DOM from automation logic.
- Open the Box no longer manipulates its DOM from its recurring project tick.

### World visualizer rendering

- Spherical planet surfaces now keep deterministic static terrain fields and composite changing water, ice, biomass, hazardous biomass, pressure, ecumenopolis, and Nanoworld coverage on the GPU. The original CPU renderer remains the exact fallback for special geometries, Earth reconstruction, and unsupported WebGL capabilities.
- Cloud density now updates through a persistent shader target fed by a one-time raw field upload, eliminating recurring canvas allocation on WebGL2. Transparent pixels and global UUID random draws preserve the original canvas path, which remains active on WebGL1.
- City lights use one instanced draw with per-instance dayside rejection instead of 1,000 cloned meshes and materials when instancing is available. The initialization sequence preserves the prior random-number and UUID consumption so seeded planet terrain and city placement remain unchanged.

## Verification Results

### Retention verdict

The post-fix three-cycle report forces GC after every normalized lifecycle cycle. Save/load while running held connected nodes at `64,033`, connected elements at `35,812`, connected Text nodes at `28,180`, and listeners at `16,046` for all three cycles. Its broader CDP counter made one +12-node lazy-initialization step, then stayed flat. Paused save/load was exactly flat at `63,990` connected nodes and `16,038` listeners. Running and paused travel were likewise exactly flat within each three-cycle series at `58,232`/`58,509` connected nodes and `14,495` listeners. Heap endpoints oscillated within normal forced-GC variation rather than climbing monotonically.

A separate retained-object census warmed ten full recreate loads, then measured sixteen more. Heap ended `1,164,208` bytes below baseline; the last-twelve regression was approximately +13 KiB/load inside roughly +/-0.4 MiB GC oscillation. CDP and connected node counts were exactly flat from measured loads 5-16, and listeners stayed at `10,389`. CDP object queries found exactly one live `GalaxyManager` and one `GalaxyOperationManager` at every snapshot. A second WeakRef test confirmed that every replaced Galaxy, operation, and invasion manager was collected immediately after the next load (18/18 old references dead).

The final structural smoke report records zero cached detached nodes, zero disconnected dynamic-tooltip anchors, and zero new detached references before and after all 13 phases. Together, the normalized lifecycle series, object census, and WeakRef result show no remaining retained game-generation, DOM, listener, tooltip, or scanned-cache growth in the exercised scenarios.

### Visual checks

Representative post-fix Chromium captures were inspected for Terraforming Summary, Solis, Galaxy, Projects, Artificial Worlds, and Automation:

- `artifacts/screenshots/memory-audit-summary.png`
- `artifacts/screenshots/memory-audit-solis.png`
- `artifacts/screenshots/memory-audit-galaxy.png`
- `artifacts/screenshots/memory-audit-projects.png`
- `artifacts/screenshots/memory-audit-artificial.png`
- `artifacts/screenshots/memory-audit-automation.png`

The layouts, card controls, map, status colours, persistent rows, tooltip-bearing Artificial World controls, and Automation headers remained visually intact.

### Final command checks

- JavaScript syntax checks: 62 changed JavaScript files plus the page-side screenshot setup passed.
- Localization audit: passed with 0 `dom-static`, 0 `ui-runtime`, and the unchanged 3 `catalog-data` findings in `special-seeds.js`.
- Windows Jest suite: 17 suites passed and 8 skipped; 160 tests passed and 42 skipped (202 total).
- `git diff --check`: passed.

## Reproduction

Use `npm run audit:memory -- --story-projects --channel bundled --headless --force-gc` for the complete matrix. See `scripts/manual-tests/chrome-memory-repro.md` for fast structural runs, phase controls, report fields, and interpretation guidance.
