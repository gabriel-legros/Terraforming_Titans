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
- Condensation/precipitation now includes a simple uplift-based saturation cap (adiabatic cooling to a representative lifted pressure), allowing condensation even when the surface is unsaturated.
- Terraforming history charts include a rolling 500-year window and phase diagrams (Water, CO2, Methane, Ammonia, O2, N2).
- Oxygen and nitrogen now have full phase-change cycles.
- Hydrology, phase transitions, and zonal resource synchronization were refactored for stability and consistency.

### Space, Projects, and Hazards
- Kessler Skies gained richer failure/debris modeling, warnings/tooltips, and capped Solis storage bonuses.
- Kessler cost multipliers and decay behaviors were tuned; hazard charts and bin diagnostics expanded.
- While Kessler Skies is active, Followers Orbitals are limited to `research`; non-research orbital outputs are disabled and the Orbitals card shows a warning banner.
- Pulsar hazard now has full clear paths on affected worlds: fully build all `Artificial Sky` segments or use Planetary Thrusters to `Go Rogue`; both clear pulsar hazard effects.
- Completing `Artificial Sky` now permanently disables the `Space Mirror` building on that world (this does not disable the `Space Mirror Facility` project).
- `Artificial Sky` is now a segmented spaceship project: total segments are `ceil(initial land / 1000)`, each segment spends an equal share of the old full cost, base segment duration is 50,000s at 1 assigned ship, and it becomes continuous when effective duration drops below 1s.
- Pulsar hazard now triggers recurring Electromagnetic Storms (5s every 100s): storms apply temporary attrition to unassigned androids/electronics/nanobots, pause spaceship projects, and surface as active warning state in the Pulsar UI card.
- While Pulsar is active, hazard intensity scales down with Artificial Sky completion (land lock share, added radiation, and storm attrition), and Nanocolony max nanobot cap uses the higher of Underground Expansion ratio vs Artificial Sky completion ratio.
- Land reservation now has a combined `hazards` source; hazard land usage uses the max share across hazard systems (currently Hazardous Biomass vs Pulsar).
- Space storage supports additional resources and per-resource cap controls.
- Resource Disposal can include Mass Drivers as ship-equivalent throughput.
- Dyson Swarm/Receiver/Sphere, Lifters, mega/giga projects, and continuous ops gained stronger persistence and UI clarity.
- Galactic Market uses fixed 1x estimates for cost/gain (ignores productivity).
- Projects can set `attributes.ignoreDurationModifiers: true` to lock runtime to base duration and ignore all project duration modifiers.

### Automation and UI
- Building/project cards support collapsible layouts and improved cached rendering.
- SpaceManager now maintains incremental cached world stats (terraformed totals, sector world counts, artificial world value/fleet contributions, and RWG type/hazard bonuses) that rebuild once on load and update through mutation setters/travel flows.
- Multiple automation systems expanded:
  - Ship automation reorder/limits/resource disposal support
  - Building preset combinations and travel application options
  - Project automation presets/combinations (non-story projects), with per-project control-only save/load and travel application options
  - Life automation presets and as-needed modes
  - GHG/calcite and dust factory automation targeting
- String numeric input handling standardized across major controls.
- Tooltips were upgraded with dynamic/pinnable behavior and viewport-aware placement.
- Space Storage reserve controls are now per-resource in the resource settings dialog, with reserve modes for absolute amount, `% of resource cap`, and `% of max storage`; the old global strategic reserve was removed.
- Colony now uses subtabs: Population unlocks with Colony tab, Nanocolony unlocks with Nanotechnology Stage I, and unlock transitions auto-focus the corresponding subtab.
- Hades chapter `hades.33.0` unlocks `followersManager`; when enabled, Colony shows a `Followers` subtab with Orbitals assignment (manual and weight modes), a live `Faith` panel, and the Holy World consecration/shop systems.
- Followers Orbitals also grant storage cap on assigned target resources: per assigned orbital cap bonus is `max(100, per-orbital production × 10)`, and this cap bonus is applied during storage-cap recalculation before orbital production runs.
- Faith tracks separate world and galactic believers: enabling seeds galactic believers to 10%, colonist imports blend world faith with galactic faith share, world conversion is exponential with a world cap of `galactic + 5%`, and at cap world+galactic faith increase together at 1/250 speed (Missionaries only boosts this post-cap galactic conversion).
- Faith bonuses scale from believer share: Pilgrim boosts population growth from galactic believer %, Zeal boosts colonist worker efficiency up to `x3` total from world believer %, Apostles boosts available orbitals above 10% galactic faith (up to +900%), and Missionaries boosts only galactic post-cap conversion power from world believer %.
- Followers Orbitals include an `Art Gallery` subsection: Art Power is `sqrt(galactic population) * sqrt(artifacts invested) * sqrt(funding invested)`, and persistent Art Power grants `0.5 * log10(Art Power)%` happiness plus worker-per-colonist multiplier `1 + 5 * happiness bonus`.
- Holy World is now fully implemented in Followers: consecration requires no other active/completed world specialization, at least 80% initial land in Ecumenopolis districts, and at least 90% colonist occupancy; costs are per-initial-land and scale `2x` per consecration completion, consecration blocks starting Foundry/Bioworld on that world, and consecrated world departures grant 1 Holy Point.
- Holy Shop purchases persist through travel and support Respec; upgrades include +5s Festival/Golden Asteroid durations (max 18), +1 max patience (max 12), and +10% faith conversion power (max 90%).

### Story, Planets, and Progression
- Story effects support `onTravel: false`.
- New/expanded worlds and arcs include Umbra, Solis Prime, Tartarus/Gabbag placeholders, and Hades (airless pulsar world at 20 AU with placeholder chapters 33-35).
- Terraforming completion rewards and travel-point systems were extended (including dominion-specific rewards).
- Journal reconstruction and indexing were improved for story continuity.

### Specialized Systems
- Buildings moved toward dedicated subclass logic (e.g., GHG/Oxygen factories, Dyson receiver, biodome behavior).
- Advanced research includes `Warp Storage` (75M), unlocking a Storage Depot alternate recipe with `10x` storage and `1M` energy consumption.
- Random World effects/archetypes expanded with gameplay bonuses and hazard interactions.
- RWG moons now generate seeded gas-giant belt radiation parameters (`refDistance_Rp`, `parentBeltAtRef_mSvPerDay`, `beltFalloffExp`) so orbital/surface radiation follows the same parent-belt model as story moons.
- Radiation tolerance now uses quadratic mitigation (`points² × 0.01 mSv/day`) with a 100-point cap; life growth penalties are based on remaining dose after mitigation, and life UI/automation "As needed" behavior reflects this dose model.
- Pulsar hazard now injects additional orbital radiation when active; surface impact is derived by atmospheric attenuation from orbital dose.
- RWG hazards now include selectable `pulsar` seeds, and hazardous biomass RWG tuning includes pulsar-added surface radiation when both hazards are selected.
- RWG rogue worlds selected with `pulsar` now generate a `Rogue Pulsar` star and use 10 W/m² flux (instead of starless rogue background flux), and they are not flagged as `celestialParameters.rogue`.
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
