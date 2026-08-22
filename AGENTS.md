# AGENTS.md

## Purpose

This is the repository-wide working contract for contributors and coding agents. Keep it limited to durable rules; put system explanations, runbooks, and historical findings in `docs/`.

## Before Changing Code

- Always ask for clarification before proceeding with significant changes.
- Preserve unrelated work in a dirty worktree.
- Keep changes short, direct, and browser-compatible.
- Do not add tests for new features unless explicitly requested.
- Update the appropriate documentation when a change alters a durable workflow or architectural invariant. Do not append feature-history bullets here.

## Runtime and Code Structure

- The game starts from `index.html` and uses ordered classic-script includes. Do not add imports, exports, CommonJS modules, or `globalThis` to browser game code.
- Use required upstream globals directly. Do not redefine them or probe for them with `typeof`, try/catch, fallback shims, or null/type-validation boilerplate. Fix the include order or test harness instead.
- Do not add trivial wrappers that merely rename, resolve, normalize, clamp, read, or forward an existing value. Helpers must contain real shared logic.
- Building-specific behavior belongs in subclasses under `src/js/buildings/`. Building, colony, and project parameter entries select specialized classes through `type`; do not add hard-coded id-to-class maps during initialization.
- Story project definitions belong in `progress-data.js` or the relevant chapter file under `src/js/story/`. Load story-only project classes after their base classes in `index.html`.
- Keep physical and gameplay defaults in `src/js/terraforming/terraforming-parameters.js`; keep world-specific overrides in planet or special-seed parameters.
- Keep internal ids, save keys, automation ids, resource ids, project ids, and effect ids stable.

See [System architecture and invariants](docs/system-architecture.md) for subsystem ownership, lifecycle rules, simulation constraints, build targets, and mod security boundaries.

## UI and Localization

- Cache and reuse UI elements. Simulation and manager update paths mutate state; rendering belongs in `updateRender()` or explicit UI/lifecycle entry points.
- Reconcile frequently updated rows, cards, options, and tooltips by stable id. Do not clear and rebuild hot UI containers.
- Use an attached tooltip icon: `<span class="info-tooltip-icon">&#9432;</span>`, with content attached through `attachDynamicInfoTooltip(icon, text)` from `src/js/ui-utils.js`.
- Keep the Warp Gate Command Teams tooltip current when its special rules change.
- Do not hard-code new player-facing English in HTML or JavaScript. Shared UI text belongs in `src/js/lang/current-language.js`; story text belongs in `src/js/lang/story-language.js`.
- Localize initial creation and dynamic refresh paths. Use localized resource display names and stable, non-localized source ids for gameplay accounting.

See [UI development guidelines](docs/ui-development.md) and [Localization checklist](docs/localization-checklist.md).

## Testing

- In WSL on this Windows checkout, run tests with Windows Node:

  ```bat
  cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm test"
  ```

- Do not run `npm test` through WSL Node under `/mnt/c`; filesystem traversal is substantially slower.
- If Windows dependencies are missing, run the same command with `npm ci` instead of `npm test`.
- Report pass/fail counts.
- Remove temporary test artifacts such as `tmp-jest-results*.json` before finishing.
- Run `node --check` on changed JavaScript files when a focused syntax check is useful.

## Visual and Performance Verification

- Use repository-owned Playwright harnesses, not an in-app browser connection.
- Inspect every generated screenshot before reporting the result.
- Leave `DEBUG_MODE` unchanged for automated visualizer screenshots. Enable it only for an interactive manual capture that requires an intro-skip path, then restore it to `false`.

See:

- [Visual testing](docs/visual-testing.md)
- [Chromium memory and DOM churn audit](docs/chromium-memory-churn-audit.md)
- [Story world equilibration](docs/story-world-equilibration.md)

## Versioning and Releases

- `package.json` is the version source of truth. Keep `package-lock.json` and `src/js/game-version.js` synchronized through `scripts/update-game-version.js`.
- Use SemVer. Playtests use `-playtest.N`; never use a fourth numeric segment.
- Steam build/upload scripts advance versions unless `SKIP_VERSION_BUMP=1`; `SKIP_STEAM_BUILD=1` skips the build and does not change the version.
- Browser builds use the current stable portion without incrementing the source version.

See [Steam production upload](docs/steampipe-steam-upload.md) and [Steam playtest upload](docs/steampipe-playtest-upload.md).

## Documentation Maintenance

- Keep this file concise and deduplicated.
- Put commands and troubleshooting in runbooks, architectural constraints in the relevant system document, and investigation results in audit documents.
- Replace superseded guidance instead of appending a near-duplicate.
- Treat the implementation and tests as the source of truth for feature behavior; do not maintain a manual feature changelog here.
