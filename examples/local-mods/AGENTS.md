# AGENTS.md

## Scope
These instructions apply to every example mod under `examples/local-mods/`.

## Core Rule
- Never create, modify, regenerate, translate, reformat, or delete example-mod files unless the user explicitly requests changes to the example mods.
- Do not update example mods merely to mirror production source changes, new localization keys, schemas, validation rules, or tests.
- When an unrelated task reveals that an example mod is stale or invalid, report it without changing it.

## Translation Example Mods
- Language example mods live under `english-translation` and `ai-*-translation`.
- Their `patches/current-language.json` and `patches/story-language.json` files mirror `src/js/lang/current-language.js` and `src/js/lang/story-language.js` respectively so source and translation keys stay directly diffable.
- The English and AI-Russian examples are English-seeded, with only each locale's `meta.code` changed.
- Run `bash scripts/generate-base-english-language.sh` to generate the matching canonical English files under `artifacts/translation-work/base-english/`.
- Only when the user explicitly requests regeneration, run `npm run mod:seed-english-translations` to regenerate the placeholder mods while retaining each locale's `meta.code`, then run `npm run mod:validate-translations`.
