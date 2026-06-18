# Localization Checklist

This checklist tracks the remaining migration of non-story player-facing strings into `src/js/lang/current-language.js`.

Run the audit with:

```sh
npm run audit:localization
```

For machine-readable output:

```sh
node scripts/audit-localization.js --json
```

## Baseline

Baseline generated with `node scripts/audit-localization.js`.

| Category | Count | Meaning |
| --- | ---: | --- |
| `dom-static` | 6 | Static HTML text or attributes that may need `data-i18n*`. |
| `ui-runtime` | 278 | Runtime DOM text or browser prompts that may need `t(...)` or a local `getXText(...)` wrapper. |
| `catalog-data` | 223 | Display fields in data objects that may need language-file catalog entries and centralized apply logic. |
| `story-exempt` | 433 | Story files and story project data intentionally excluded from this non-story pass. |
| `ignore` | 538 | Icons, symbols, numeric controls, internal ids, already-localized fallbacks, debug-only entries, and other ignored candidates. |

The audit is heuristic. Before changing a file, inspect its findings and decide whether each candidate is player-facing text, an exempt internal value, or a false positive that should be documented or added to the script allowlist.

## Current Progress

Latest audit after Batch 5:

| Category | Count |
| --- | ---: |
| `dom-static` | 3 |
| `ui-runtime` | 10 |
| `catalog-data` | 23 |
| `story-exempt` | 433 |
| `ignore` | 617 |

Batch 1 removed all actionable findings under `src/js/automation/**` and reduced actionable counts by 33 total findings.
Batch 2 removed all actionable findings under the targeted artificial worlds, galaxy/WGC, RWG, and special seed files. It also taught the audit to ignore format-only runtime fragments, unit strings, icon escapes, nearby localized fallbacks, and documented special-seed physical identifiers.
Batch 3 localized terraforming category/effect labels, day-night status text, hazard effect names, and cycle rate labels. The remaining `planet-parameters.js` travel warning fallbacks are covered by planet catalog localization but remain visible for a broader planet catalog pass.
Batch 4 removed all actionable project-file findings from the audit top list, including Nuclear Alchemy recipe labels, Lifters harvest labels, project progress captions, and project-specific effect names. Project values that only contain localized variables, icons, or measurement units are classified as `ignore`.
Batch 5 cleared the targeted remaining runtime UI files: `lifeUI.js`, `structuresUI.js`, `resourceUI.js`, `journal.js`, `tab.js`, `gold-asteroid.js`, plus adjacent research/statistics/building/space one-offs. Remaining actionable findings are planet catalog fallbacks, nanotech/follower rate strings, static HTML shell text, and dev/internal catalog descriptions for the final pass.

## Migration Batches

- [x] Batch 1: Automation labels and script automation metadata.
  - Primary target: `src/js/automation/script-variable-registry.js`.
  - Also review automation builder presets and selectable labels surfaced in automation UI.
- [x] Batch 2: Artificial worlds, galaxy/WGC, RWG, and special seed catalog display strings.
  - Primary targets include `src/js/space/artificial.js`, `src/js/galaxy/galaxyConstants.js`, `src/js/galaxy/galaxyUI.js`, `src/js/rwg/rwg.js`, and `src/js/special-seeds.js`.
- [x] Batch 3: Terraforming cycle labels and requirement/process display strings.
  - Review cycle label arrays, terraforming requirement names/lore, and process labels that appear in summaries or tooltips.
- [x] Batch 4: Project-specific UI and catalog strings.
  - Review Matrioshka Brain, Nuclear Alchemy Furnace, Space Mirror Facility, Space Storage, Galactic Market, and related project files.
- [x] Batch 5: Remaining runtime UI text.
  - Review `lifeUI.js`, `structuresUI.js`, `resourceUI.js`, `journal.js`, `tab.js`, `gold-asteroid.js`, and small one-off files.
- [ ] Batch 6: Debug/dev-only strings.
  - Localize strings that are player-visible in debug-enabled UI, or document them as exempt and add script allowlist entries if the audit remains noisy.

## Exemptions

- Story content under `src/js/story/**` and story project data are out of scope for this non-story checklist.
- Internal ids, save keys, automation ids, resource ids, project ids, effect ids, CSS classes, selectors, file paths, and script tokens stay stable and English-like.
- Icons, symbols, arrows, punctuation, numeric step controls, units, and format-only strings do not need localization unless they include descriptive player-facing words.
- Runtime text that consists only of formatted numbers, localized variables, unit tokens, multipliers, or icon escapes is exempt; `scripts/audit-localization.js` classifies these as `ignore`.
- Entity-only icon HTML such as gear/warning symbols is exempt when it contains no visible words.
- Special seed override names for planets, stars, and parent bodies are exempt as stable physical/proper identifiers. The player-facing special seed catalog names, difficulties, effects, and rewards remain localized through `catalogs.specialSeeds.*`.
- Atmospheric-density layer names such as `lower`, `cold`, and `thermo` are internal model strata, not player-facing labels; the audit classifies them as `ignore`.
- Debug-only tooling may remain exempt when it is not part of normal player UI; document those decisions in this file or encode them in `scripts/audit-localization.js`.

## Verification

For each batch:

1. Run `npm run audit:localization` before and after the migration.
2. Confirm the relevant actionable count drops, or document why unchanged findings are exempt.
3. Run `node --check` on every touched JS file.
4. Run:

```sh
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm test"
```

Report the audit counts and Jest pass/fail counts when finishing the batch.
