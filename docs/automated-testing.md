# Automated Testing

`npm test` runs the lightweight Node Jest suites. All suites that require jsdom, either directly or through a helper such as `jsdom-game-harness`, or load a save file must be skipped to keep routine testing fast.

Test discovery is scoped to the checkout's root `__tests__/` directory so nested worktrees do not run duplicate suites.

Exclude these suites through `jest.testPathIgnorePatterns` in `package.json`. Add an exclusion whenever a new or existing suite gains either dependency, including save-file tests that do not use jsdom. Keep the test files available for reference. Using only `describe.skip` or `test.skip` still evaluates top-level imports and can load jsdom, so it does not meet this requirement.

Run from PowerShell in the repository:

```powershell
npm test
```

From WSL on this Windows checkout, use Windows Node:

```bat
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm test"
```

If dependencies are missing, install them with `npm ci` using the same environment. Do not run Jest through WSL Node under `/mnt/c`.

Report pass/fail counts. Excluded suites are omitted from discovery and do not appear in Jest's skipped counts. Remove temporary test-result artifacts before finishing.

## Manual save compatibility audit

Run the standalone Chromium audit separately from Jest:

```powershell
node scripts/check-saves.js
```

The script recursively scans the repository, including ignored save folders, for `.json`, `.txt`, `.sav`, and `.save` files with game-state fields. Malformed files in save folders are included so parse failures are reported. It skips `.git`, `node_modules`, `dist`, and symlinks/junctions. It never rewrites saves.

Each save gets a fresh browser context and the real `index.html` script order. Automatic Phaser simulation updates are disabled before startup. The audit calls `loadGame` with its normal render path, restores saved enabled automation without the confirmation popup, then calls `updateLogic` once and forces a full UI refresh. One tick uses `terraformingParameters.gameplay.simulation.resourceSubstepMs` scaled by game speed; paused saves still receive a tick. Each stage waits another 50 ms for deferred errors. This checks load and the first tick, not extended simulation stability.

Uncaught exceptions, unhandled promise rejections, `console.error` messages, rejected loads, renderer crashes, and timeouts fail that save. The script continues after failures and exits with code `1` if any save fails. Startup, load, and tick results and error stacks are written incrementally to the ignored `artifacts/save-checks/report.json`.

Use `--list` to inspect discovery, `--filter <path substring>` for a subset, `--timeout <milliseconds>` to change the 30-second total limit per save, and `--output <path>` for a different JSON report. Run `node scripts/check-saves.js --help` for usage. Dependencies are the existing `playwright` package and its Chromium installation (`npx playwright install chromium` if missing).

Retry only the failed files from an earlier report, preserving the original results:

```powershell
node scripts/check-saves.js --failed artifacts/save-checks/report.json --output artifacts/save-checks/failures-after-fixes.json
```

`--failed` uses the report's file list directly rather than rescanning the repository. It also accepts `--filter` and `--list`.
