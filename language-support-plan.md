# Language Support Implementation Plan

This document breaks localization work into 3 major implementation steps in delivery order.

## 1. UI

1. Add a global localization runtime loaded early in `index.html` with `t(key, vars)` and `setLanguage(code)`.
2. Add `gameSettings.language` in `src/js/globals.js` and persist it through save/load in `src/js/save.js`.
3. Add a Language selector in Settings (`index.html`, `src/js/settings.js`) and apply language changes immediately.
4. Localize static HTML labels with key-based attributes and a centralized DOM text refresh pass.
5. Localize JS-rendered UI strings, including button labels, status text, aria labels, and tooltip text.
6. Add one language-change refresh path that updates active UI and redraws text-heavy panels (projects, research, journal, WGC).
7. Migrate parameter-driven display text (buildings/projects/research/resources) to key-backed strings progressively.

## 2. Story

1. Keep chapter and event IDs stable; migrate display text (chapter titles, narratives, popup fields, objective descriptions) to localization keys.
2. Resolve story text at render time in `StoryEvent.trigger()` and objective display paths so language switching works mid-run.
3. Keep placeholder replacement after translation (`$WGC_TEAM...`, `$PROMETHEUS$`, diagnostic markers).
4. Localize journal chrome and chapter index labels (Journal title, Chapter labels, history window, toggle titles).
5. Rebuild journal entries from source references on language change using existing reconstruction flow instead of reusing rendered strings.
6. Localize `progressData.storyProjects` names, descriptions, and story steps so both project cards and journal project-step lines switch language.

## 3. WGC Operations (Procedural)

1. Introduce stable operation event keys/ids and stop using English display names as logic identifiers.
2. Localize all fixed WGC UI/system strings in `wgcUI.js` and summary/log templates in `wgc.js`.
3. Replace string-fragment log filtering (for story visibility) with structured log metadata so filtering is language-safe.
4. Load locale-specific operation story bundles with fallback to English.
5. Extend `wgc_operation_gen/wgc_gen.py` to generate locale-tagged bundles and enforce placeholder safety.
6. Define behavior for language switches during active operations and implement consistent rendering for existing + new log entries.

