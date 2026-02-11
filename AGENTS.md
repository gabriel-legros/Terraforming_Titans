# AGENTS.md

## Purpose
This file is the working contract for contributors and coding agents. Keep it current, concise, and organized by system.

## Core Rules
- Document major feature updates in this file under the appropriate section. Add sections when needed.
- Do not use import and exports.
- The game runs from `index.html` with ordered includes. Do not redefine globals/constants that are already defined upstream.
- Use global variables where needed.
- Code must run in a browser-like environment.
- Place story projects in `progress-data.js` near the chapter where they unlock.
- Tooltips must use an attached tooltip icon: create `<span class="info-tooltip-icon">&#9432;</span>` and always attach tooltip content with `attachDynamicInfoTooltip(icon, text)` from `src/js/ui-utils.js`.
- Keep tooltip copy browser-safe and readable; the attached dynamic tooltip is the default for both short and long help text.
- Keep the Warp Gate Command Teams tooltip updated when special rules change.
- Do not use `typeof` checks, null-guard boilerplate for objects that should exist, or numeric-type validation boilerplate.
- Cache and reuse UI elements. Do not repeatedly query the DOM with new selectors.
- Building-specific logic belongs in dedicated subclasses under `src/js/buildings/` and must be registered in `initializeBuildings`.
- Do not use `globalThis`; use the actual global variable directly.
- Keep code short, readable, and direct.
- For screenshots, set `DEBUG_MODE` to `true` in `src/js/debug_constants.js` so intro skip paths are available.

## Testing
- In this repo setup (WSL working on a Windows folder), run tests with Windows binaries:
  - `cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm test"`
- If Windows `node_modules` is missing, install dependencies with:
  - `cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm ci"`
- Report pass/fail counts.
- Do not add tests for new features unless explicitly requested.

## Project Overview
- Browser incremental game with script entry via `index.html`.
- Core simulation: `terraforming.js`, `physics.js`, cycle modules.
- Economy/colony: `resource.js`, `building.js`, `colony.js`, related UI modules.
- Story progression: `StoryManager` in `progress.js`.
- Planet travel/state: `SpaceManager`.

## Key Systems
- Skills: `skills.js`, `skillsUI.js`
- Life Designer: `life.js`, `lifeUI.js`
- Space travel/systems: `space.js`, `spaceUI.js`
- Autobuild: `autobuild.js`
- Milestones: `milestones.js`, `milestonesUI.js`
- Solis shop/quests: `solis.js`, `solisUI.js`
- Patience: `hope/patienceUI.js` (terraforming patience banking/claim UI)
- Gold asteroid event: `gold-asteroid.js`
- ResearchManager persists across travel; regular research is reset while advanced is retained.

## Reset and Travel Model
### New Game
- `startNewGame()` fully rebuilds state and returns to Mars.
- Nothing carries over; all late-set values must be reinitialized.

### Planet Travel
- `selectPlanet(key)` performs soft reset with manager persistence.
- Travel uses `initializeGameState({ preserveManagers: true, preserveJournal: true })`.
- On first visit, travel grants 1 skill point.
- Persisted meta systems:
  - `ResearchManager` (with `resetRegularResearch()`)
  - `SkillManager`
  - `SolisManager`
  - `SpaceManager`
  - `StoryManager`
  - Dyson Swarm collector count (receiver must still be rebuilt for output)
- On load/travel, call managers' `reapplyEffects` so saved modifiers apply to fresh objects.

## UI Requirements
- Features with UI must use an `enabled` flag to reveal/hide.
- Do not persist UI enabled flags in saves; re-enable via story/research/effects.
- Use refresh helpers correctly:
  - New game: `startNewGame()`
  - Load: `loadGame()` -> `initializeGameState({ skipStoryInitialization: true })`
  - Travel: `selectPlanet(key)` -> `initializeGameState({ preserveManagers: true })` then `updateSpaceUI()`

## Shared UI Input Patterns
### String-backed numeric inputs
- Parse with `parseFlexibleNumber(value)` from `src/js/numbers.js`.
- Wire with `wireStringNumberInput(input, { parseValue, formatValue, onValue })` from `src/js/ui-utils.js`.
- In `updateUI`, only overwrite `input.value` when unfocused.
- Store parsed numeric values in `input.dataset.<key>` for dependent UI reads.

### Step buttons (`-1`, `+1`, `/10`, `x10`)
- `-`/`+` changes target by current step.
- `/10` and `x10` change step only.
- Clamp step to feature bounds.
- Store step per item in feature state/cache and update labels whenever step changes.

### Toggle switches
- Use `createToggleButton({ onLabel, offLabel, isOn })`.
- Update with `setToggleButtonState(toggle, enabled)`.
- Disable toggles for locked/unavailable features.

## Gameplay System Notes
### Effectable entities
- `EffectableEntity` (`effectable-entity.js`) provides shared effect/flag behavior for buildings, resources, projects, life.

### Resource flow
`produceResources` pipeline:
1. Theoretical production
2. Storage recalculation
3. Productivity updates
4. Reset + accumulate production/consumption
5. Funding/terraforming/life effects
6. Cap clamping
7. Aggregate display rates

### Nanotechnology
- `nanotechManager` unlocks via Nanotechnology Stage I.
- Growth requires surplus power; max bots scale with land area; only `1e15` persist through travel.
- Sliders control growth tradeoffs (silica, maintenance, glass, later stage options).
- Silica/metal allocation supports production percent or absolute caps.
- Recycling supports junk/scrap filtering and uncapped selector.
- Output requires same-tick material input (prevents free output).

### Warp Gate Command
- Team/operation progression persists across planets.
- Operation logs are not saved (save-size control).
- R&D supports shift-click bulk purchase.
- Superalloy Fusion Efficiency upgrade exists (+1% per level, high cap).

### Space Mirror Facility
- Zonal mirror/lantern assignment with advanced oversight and reversible mirror mode.
- Starless worlds support day-night period control when lanterns are unlocked.
- Focused melting, advanced auto-assignment, and quick-build integration are supported.
- Ringworlds disable Space Mirror Facility and Planetary Thrusters and hide related research/UI.

### Random World Generator
- Seeded world generation with lockable options and equilibration requirement before travel.
- Preserve compatibility: append new generation logic at the end only.
- Supports dominion selector and dominion-specific terraforming requirements.
- Some dominions/world types are story/sector gated.

### Artificial Worlds
- Managed via `ArtificialManager` (shell/ring/disk-ready architecture).
- Ringworld support includes custom controls, spin protocol, and low-gravity lock behavior.
- Construction supports prepay, 5-hour hard cap, persistence, resume/discard, rename.
- Artificial naming auto-increments by type.

## Major Feature Updates (Consolidated)
### Atmosphere, Physics, and Terraforming
- Atmospheric density/exobase/drag heuristics now use bulk non-heavy-trace mass/pressure to avoid nonphysical Kessler-line behavior.
- Atmospheric layer boundaries now use exobase-relative heights for monotonic drag behavior.
- Water vapor saturation effects now reduce effective pressure, with cold trapping on cold worlds.
- Terraforming history charts include a rolling 500-year window and phase diagrams (Water, CO2, Methane, Ammonia, O2, N2).
- Oxygen and nitrogen now have full phase-change cycles.
- Hydrology, phase transitions, and zonal resource synchronization were refactored for stability and consistency.

### Space, Projects, and Hazards
- Kessler Skies gained richer failure/debris modeling, warnings/tooltips, and capped Solis storage bonuses.
- Kessler cost multipliers and decay behaviors were tuned; hazard charts and bin diagnostics expanded.
- Added placeholder Pulsar hazard wiring (manager + minimal UI card) for Hades; gameplay effects are deferred.
- Land reservation now has a combined `hazards` source; hazard land usage uses the max share across hazard systems (currently Hazardous Biomass vs Pulsar).
- Space storage supports additional resources and per-resource cap controls.
- Resource Disposal can include Mass Drivers as ship-equivalent throughput.
- Dyson Swarm/Receiver/Sphere, Lifters, mega/giga projects, and continuous ops gained stronger persistence and UI clarity.
- Galactic Market uses fixed 1x estimates for cost/gain (ignores productivity).

### Automation and UI
- Building/project cards support collapsible layouts and improved cached rendering.
- Multiple automation systems expanded:
  - Ship automation reorder/limits/resource disposal support
  - Building preset combinations and travel application options
  - Life automation presets and as-needed modes
  - GHG/calcite and dust factory automation targeting
- String numeric input handling standardized across major controls.
- Tooltips were upgraded with dynamic/pinnable behavior and viewport-aware placement.
- Colony now uses subtabs: Population unlocks with Colony tab, Nanocolony unlocks with Nanotechnology Stage I, and unlock transitions auto-focus the corresponding subtab.
- Hades chapter `hades.33.0` unlocks `followersManager`; when enabled, Colony shows a `Followers` subtab with Orbitals assignment (manual and weight modes) and placeholder `Faith`/`Holy World` sections.
- Followers Orbitals also grant storage cap on assigned target resources: per assigned orbital cap bonus is `max(100, per-orbital production × 10)`, and this cap bonus is applied during storage-cap recalculation before orbital production runs.

### Story, Planets, and Progression
- Story effects support `onTravel: false`.
- New/expanded worlds and arcs include Umbra, Solis Prime, Tartarus/Gabbag placeholders, and Hades (airless pulsar world at 20 AU with placeholder chapters 33-35).
- Terraforming completion rewards and travel-point systems were extended (including dominion-specific rewards).
- Journal reconstruction and indexing were improved for story continuity.

### Specialized Systems
- Buildings moved toward dedicated subclass logic (e.g., GHG/Oxygen factories, Dyson receiver, biodome behavior).
- Random World effects/archetypes expanded with gameplay bonuses and hazard interactions.
- RWG moons now generate seeded gas-giant belt radiation parameters (`refDistance_Rp`, `parentBeltAtRef_mSvPerDay`, `beltFalloffExp`) so orbital/surface radiation follows the same parent-belt model as story moons.
- Radiation tolerance now uses quadratic mitigation (`points² × 0.01 mSv/day`) with a 100-point cap; life growth penalties are based on remaining dose after mitigation, and life UI/automation "As needed" behavior reflects this dose model.
- Pulsar hazard now injects additional orbital radiation when active; surface impact is derived by atmospheric attenuation from orbital dose.
- Artificial world flow matured with prepay persistence, lock states, and travel warnings.
- Warp Gate Command gained richer operation story/event handling and improved team management tools.

### Visual and UX
- Planet visualizer modularized (core/lighting/surfaces/clouds/ships/environment/debug).
- Ringworld rendering, cloud wrapping/noise, shoreline and terrain blending were improved.
- Multiple UI performance improvements reduce unnecessary DOM rebuilds and preserve subtab scroll/context.

## Maintenance Notes
- Keep this file deduplicated. If a new update supersedes an older bullet, replace the older bullet instead of appending near-duplicates.
- Group updates under the closest system heading to keep future edits discoverable.
- Prefer short, concrete bullets with the gameplay impact and, when useful, the owning manager/module.
