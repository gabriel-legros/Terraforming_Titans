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
- Nanocolony growth, production, consumption, and maintenance effects fully shut down when global average temperature exceeds `700°C` (`973.15 K`), and the colony card shows a red warning using the current temperature unit.

### Warp Gate Command
- Team/operation progression persists across planets.
- Operation logs are not saved (save-size control).
- R&D supports shift-click bulk purchase.
- Superalloy Fusion Efficiency upgrade exists (+1% per level, high cap).

### Space Mirror Facility
- Zonal mirror/lantern assignment with advanced oversight and reversible mirror mode; advanced oversight now stores mirror assignments as signed counts (`negative = reverse/cooling`) and derives reverse mode from the solved assignments instead of tracking a separate reverse-state decision through the solver.
- Advanced oversight binary searches must guard against JS number precision stalls at extreme mirror counts (for example `10Sp`), and should stop when the midpoint no longer changes instead of assuming `high - low > 1` guarantees progress.
- After advanced oversight solves assignments, restore the pre-solve current temperature state but keep the solved trend/equilibrium and zonal-flux fields so the oversight UI reflects the final solved direction instead of a stale pre-solve trend snapshot.
- Starless worlds support day-night period control when lanterns are unlocked.
- Focused melting, advanced auto-assignment, and quick-build integration are supported.
- Ringworlds disable Space Mirror Facility and Planetary Thrusters and hide related research/UI.

### Random World Generator
- Seeded world generation with lockable options and equilibration requirement before travel.
- Preserve compatibility: append new generation logic at the end only.
- Supports dominion selector and dominion-specific terraforming requirements.
- Some dominions/world types are story/sector gated.
- Special seeds can define world-specific effects (project/building flags), are replayable by seed, and surface effect descriptions in RWG world details.
- Poseidon chapter `poseidon.38.5` unlocks RWG type `molten`: a core-heat-driven world with randomized `coreHeatFlux` in the `150,000-300,000 W/m²` band set before radius scaling, strong geothermal identity, and terraforming rewards of `+10%` energy production each for Geothermal Generators, Fusion Reactors, and Superalloy Fusion Reactors.

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
- Greenhouse optical depth now weakens on very hot worlds based on pre-greenhouse radiative equilibrium temperature and also soft-caps to a temperature-dependent maximum, preventing runaway near-IR trapping while preserving existing Mars/Venus/Titan balance.
- Temperature-based maintenance penalties now rise linearly above 373.15 K, then switch to exponential growth beginning at 973.15 K, doubling every 100 K and capping at `1e9`; on worlds above 1 atm, mitigated building maintenance and aerostat colony maintenance cannot drop below the dry-adiabatic 1 atm temperature penalty floor.
- Celestial parameters can now set `coreHeatFlux` in W/m^2; temperature treats it as a flat global surface heat source and the temperature UI shows it when present.
- Worlds with `coreHeatFlux > 0` disable Ore Mine, Sand Quarry, and the related early ore research unlocks (`Efficient Ore Processing`, `Ore Scanning Satellite`, `Deep ore mines`, `Android-assisted deeper mining`, `Underground Land Expansion`); `Advanced Alloys` remains available.
- Terraforming history charts include a rolling 500-year window and phase diagrams (Water, CO2, Methane, Ammonia, O2, N2).
- Oxygen and nitrogen now have full phase-change cycles.
- Phase-change cycles now include rapid boiling (liquid -> gas) above local boiling points, tracked as a separate `boiling` rate/tooltip channel, with rate `current liquid × 1e-7 × (temperature - boiling point)`.
- Hydrology, phase transitions, and zonal resource synchronization were refactored for stability and consistency.

### Space, Projects, and Hazards
- Kessler Skies gained richer failure/debris modeling, warnings/tooltips, and capped Solis storage bonuses.
- Kessler cost multipliers and decay behaviors were tuned; hazard charts and bin diagnostics expanded.
- While Kessler Skies is active, Followers Orbitals are limited to `research`; non-research orbital outputs are disabled and the Orbitals card shows a warning banner.
- Pulsar hazard now has full clear paths on affected worlds: fully build all `Artificial Sky` segments or use Planetary Thrusters to `Go Rogue`; both clear pulsar hazard effects.
- Worlds with `coreHeatFlux > 0` now show infrastructure project `Artificial Crust`: total cost and segment count scale directly with planetary initial land, spaceship assignment accelerates construction, and completion proportionally suppresses core heat until it reaches zero.
- Mega Heat Sink now subtracts remaining post-`Artificial Crust` `coreHeatFlux` from the surface heat budget before applying any net cooling, so geothermal worlds can neutralize residual core heat without being pinned to the pre-sink trend floor; the Temperature box shows this net core heat flux and its tooltip explains the Mega Heat Sink interaction.
- Completing `Artificial Sky` now permanently disables the `Space Mirror` building on that world (this does not disable the `Space Mirror Facility` project).
- Completing `Artificial Sky` sets stellar output to `0` but keeps the world's `star` metadata object intact for systems that still need host-star details.
- `Artificial Sky` is now a segmented spaceship project: total segments are `ceil(initial land / 1000)`, each segment spends an equal share of the old full cost, base segment duration is 50,000s at 1 assigned ship, and it becomes continuous when effective duration drops below 1s.
- Pulsar hazard now triggers recurring Electromagnetic Storms (5s every 100s): storms apply temporary attrition to unassigned androids/electronics/nanobots, pause spaceship projects, and surface as active warning state in the Pulsar UI card.
- While Pulsar is active, hazard intensity scales down with Artificial Sky completion (land lock share, added radiation, and storm attrition), and Nanocolony max nanobot cap uses the higher of Underground Expansion ratio vs Artificial Sky completion ratio.
- Land reservation now uses a shared combined `hazards` source; world land usage takes the max share across Hazardous Biomass, Pulsar, and core-flux molten surface, and Artificial Crust proportionally reduces the core-flux share.
- Space storage resources are canonical under `resources.spaceStorage` (no parallel runtime usage map), support additional resource types, and keep per-resource cap controls.
- Resource Disposal can include Mass Drivers as ship-equivalent throughput.
- Dyson Swarm/Receiver/Sphere, Lifters, mega/giga projects, and continuous ops gained stronger persistence and UI clarity.
- Lifters now use per-recipe assignment controls (including Strip Atmosphere/Hydrogen/Methane/Ammonia/Star Lifting), with per-recipe complexity, auto-assignment weights, and per-recipe productivity/throughput handling so mixed allocations run simultaneously; `Star Lifting` also unlocks a saved/preset-aware supercharge slider (`x1` to `x10`) that scales lifter throughput linearly and energy per lifter cubically.
- Dyson collectors now always inject full output into `resources.space.energy`, and Dyson Receivers now convert `space.energy` into colony `energy` directly.
- Dyson Sphere now tracks a derived sphere count (`0` before frame completion, then `ceil(power / 5e25)`), enforces a default max of 1 sphere (max power `5e25`), unlocks expansion to 100 billion spheres via advanced research `Additional Dyson Spheres`, and adds a fixed superalloy surcharge to Dyson Sphere collector costs once expanding past 1-sphere power.
- Advanced research now includes `Space Antimatter Safety Regulations` (12M), unlocking mega project `Space Antimatter`: the project starts completed on unlock, battery builds are instant batch actions (`-`,`+`,`/10`,`x10`) costing metal/electronics/superconductors from colony or space storage per Space Storage mode, each battery adds `1e15` to `space.energy` storage cap, and battery count persists through travel.
- `Space Antimatter Safety Regulations` also unlocks an `Antimatter Farm` alternate recipe that converts colony `energy` into `space.energy` at a `1:1` ratio.
- Advanced research now includes `Nuclear Alchemy` (100M), unlocking the repeatable giga `Nuclear Alchemical Furnace`: furnace expansion scales with terraformed worlds and can go continuous, run mode assigns furnaces per output resource (Carbon/Graphite, Oxygen, Nitrogen, Silica, Metal), consumes space-storage hydrogen by assignment/complexity, and reports conversion rates in space-storage tooltips.
- Advanced research now includes `Manufacturing Worlds` (500M), unlocking a zero-cost world-specialization project (mutually exclusive with Bioworld/Foundry/Holy World): completed departures grant MP as `max(1, log10(population))`, then +10% per hazard on that world, bank departed population permanently as cumulative manufacturing potential, and enable global assignment-based space-storage manufacturing for Glass/Components/Electronics/Superconductors/Superalloys with MP-shop scaling (+1% production and consumption per level, max 900 each).
- Galactic Market uses fixed 1x estimates for cost/gain (ignores productivity).
- Projects can set `attributes.ignoreDurationModifiers: true` to lock runtime to base duration and ignore all project duration modifiers.

### Automation and UI
- Building/project cards support collapsible layouts and improved cached rendering.
- Travel now warns before leaving an unfinished world, using the same confirmation flow across story, random-world, and artificial-world travel.
- Aerostat details now include an android-space slider (0-10 per aerostat) that splits aerostat housing between colonists and androids, scales the related colonist-only consumptions by the colonist share, saves through load, and resets on travel.
- SpaceManager now maintains incremental cached world stats (terraformed totals, sector world counts, artificial world value/fleet contributions, and RWG type/hazard bonuses) that rebuild once on load and update through mutation setters/travel flows.
- `produceResources` now primes a per-tick building effect cache (multipliers, added consumption, maintenance cost) and reuses it across projected and actual production passes to reduce repeated `activeEffects` scans.
- GalaxyManager now caches controlled-sector reward world totals per faction and invalidates them with sector-control cache invalidation, so repeated terraformed-world/fleet-capacity reads avoid rescanning all sectors.
- HazardManager now skips neutral `applyHazardEffects` channels, tracks previously applied hazard channels, and performs one-time hazard effect cleanup/reapply on transitions so stale hazard effects are removed without per-tick neutral reapplication.
- Multiple automation systems expanded:
  - Ship automation reorder/limits/resource disposal support
  - Building preset combinations and travel application options
  - Project automation presets/combinations (non-story projects), with per-project control-only save/load and travel application options
  - Sensitive automation picker entries can use `automationRequiresEverEnabled`; they stay hidden until the building/project has been available once, and automation preserves that discovery through save/load/travel
  - Life automation presets and as-needed modes
  - GHG/calcite and dust factory automation targeting
- String numeric input handling standardized across major controls.
- GHG factory temperature-band automation now aims both greenhouse gas and calcite corrections at the selected band midpoint, then idles again while the projected trend remains inside the band.
- Tooltips were upgraded with dynamic/pinnable behavior and viewport-aware placement.
- Space Storage reserve controls are now per-resource in the resource settings dialog, with reserve modes for absolute amount, `% of resource cap`, and `% of max storage`; the old global strategic reserve was removed.
- Space Storage cap controls now include `By Weight`: amount/% caps are applied first, remaining storage is split proportionally across weighted resources, and resources with weight `0` or no cap setting get cap `0` while any weighted cap is used.
- Ship automation now excludes spaceship projects that are irrelevant on the current world and releases ships from stale preset entries instead of parking them on hidden world-specific projects.
- Resource panel now adds a Colony/Space view toggle (shown once any space-storage resource unlocks), and the Space view renders only `spaceStorage` resources.
- Colony now uses subtabs: Population unlocks with Colony tab, Nanocolony unlocks with Nanotechnology Stage I, and unlock transitions auto-focus the corresponding subtab.
- Hades chapter `hades.33.0` unlocks `followersManager`; when enabled, Colony shows a `Followers` subtab with Orbitals assignment (manual and weight modes), a live `Faith` panel, and the Holy World consecration/shop systems.
- Followers Orbitals also grant storage cap on assigned target resources: per assigned orbital cap bonus is `max(100, per-orbital production × 10)`, and this cap bonus is applied during storage-cap recalculation before orbital production runs.
- Faith tracks separate world and galactic believers: enabling seeds galactic believers to 10%, colonist imports blend world faith with galactic faith share, world conversion is exponential with a world cap of `galactic + 5%`, and at cap world+galactic faith increase together at 1/250 speed (Missionaries only boosts this post-cap galactic conversion).
- Faith bonuses scale from believer share: Pilgrim boosts population growth from galactic believer %, Zeal boosts colonist worker efficiency up to `x3` total from world believer %, Apostles boosts available orbitals above 10% galactic faith (up to +900%), and Missionaries boosts only galactic post-cap conversion power from world believer %.
- Settings include `Suppress Faith`: when enabled it hides Followers `Faith`/`Holy World` cards and force-disables all Faith and Holy World gameplay bonuses (Pilgrim/Zeal/Apostles/Missionaries plus Holy Shop effect outputs).
- Followers Orbitals include an `Art Gallery` subsection: Art Power is `sqrt(galactic population) * sqrt(artifacts invested) * sqrt(funding invested)`, and persistent Art Power grants `0.5 * log10(Art Power)%` happiness plus worker-per-colonist multiplier `1 + 5 * happiness bonus`.
- Holy World is now fully implemented in Followers: consecration requires no other active/completed world specialization, at least 80% initial land in Ecumenopolis districts, and at least 90% colonist occupancy; costs are per-initial-land and scale `2x` per consecration completion, consecration blocks starting Foundry/Bioworld on that world, and consecrated world departures grant 1 Holy Point.
- Holy Shop purchases persist through travel and support Respec; upgrades include +5s Festival/Golden Asteroid durations (max 18), +1 max patience (max 12), and +10% faith conversion power (max 100%).

### Story, Planets, and Progression
- Story effects support `onTravel: false`.
- New/expanded worlds and arcs include Umbra, Solis Prime, Tartarus/Gabbag placeholders, and Hades (airless pulsar world at 20 AU with placeholder chapters 33-35).
- Poseidon placeholder story arc was added with chapters 36-38, using colonist milestone objectives from 10 up to 10 billion; Hades chapter 35 now bridges with a sector-conquest objective (`R5-10`) and a travel objective to Poseidon.
- Poseidon chapter `poseidon.38.0` grants aerostat flag `aerostats_collision_avoidance`, allowing Aerostat Colonies to build above the normal 25% initial-land cap with an added research build cost and matching research maintenance that scales by `+10` research per extra base-cap tier; gravity and temperature penalties do not increase that research upkeep.
- Poseidon applies a world effect that enables `Foundry`, a resource building capped by initial land that costs like an Ore Mine, needs 10 workers, produces 10 metal plus 10 silica, and only gets the metal half doubled by `Advanced Alloys`.
- Terraforming completion rewards and travel-point systems were extended (including dominion-specific rewards).
- Journal reconstruction and indexing were improved for story continuity.
- Terraforming requirements now support `appliedEffects` (applied on load/travel like other effects) and per-liquid coverage comparisons (`atLeast`/`atMost`), and `Others` can include requirement-level checks such as project completion.

### Specialized Systems
- Buildings moved toward dedicated subclass logic (e.g., GHG/Oxygen factories, Dyson receiver, biodome behavior).
- Ecumenopolis life-land penalty now has a Biodome floor: life land multiplier uses `max(1 - ecumenopolis land fraction, biodome land fraction)`, where biodome fraction is active biodome land over initial land.
- Advanced research includes `Warp Storage` (75M), unlocking a Storage Depot alternate recipe with `10x` storage and `1M` energy consumption, and a Space Storage expansion recipe selector (`Standard Storage`/`Warp Storage`) where Warp mode costs metal+components+electronics and runs Space Storage expansion `10x` faster; selection persists through save/load, travel, and project presets.
- `Foundry World` specialization normally requires Deeper Mining depth `50,000`, but worlds with base `coreHeatFlux > 5,000 W/m^2` count as having a thin crust and can start it without that mining depth.
- Random World effects/archetypes expanded with gameplay bonuses and hazard interactions.
- RWG moons now generate seeded gas-giant belt radiation parameters (`refDistance_Rp`, `parentBeltAtRef_mSvPerDay`, `beltFalloffExp`) so orbital/surface radiation follows the same parent-belt model as story moons.
- Radiation tolerance now uses quadratic mitigation (`points² × 0.01 mSv/day`) with a 100-point cap; life growth penalties are based on remaining dose after mitigation, and life UI/automation "As needed" behavior reflects this dose model.
- Pulsar hazard now injects additional orbital radiation when active; surface impact is derived by atmospheric attenuation from orbital dose.
- RWG hazards now include selectable `pulsar` seeds, and hazardous biomass RWG tuning includes pulsar-added surface radiation when both hazards are selected.
- RWG rogue worlds selected with `pulsar` now generate a `Rogue Pulsar` star and use 10 W/m² flux (instead of starless rogue background flux), and they are not flagged as `celestialParameters.rogue`.
- Artificial world flow matured with prepay persistence, lock states, travel warnings, and a `Store World` flow: completed worlds can be stored without immediate travel, preserve staged stockpiles, and appear in constructed-world history with travel actions (alongside abandoned worlds).
- Warp Gate Command gained richer operation story/event handling and improved team management tools.

### Visual and UX
- Planet visualizer modularized (core/lighting/surfaces/clouds/ships/environment/debug).
- Planet visualizer surface now transitions into a lava-world palette and molten glow between `900 K` and `1400 K` global mean surface temperature.
- Ringworld rendering, cloud wrapping/noise, shoreline and terrain blending were improved.
- Multiple UI performance improvements reduce unnecessary DOM rebuilds and preserve subtab scroll/context.

## Maintenance Notes
- Keep this file deduplicated. If a new update supersedes an older bullet, replace the older bullet instead of appending near-duplicates.
- Group updates under the closest system heading to keep future edits discoverable.
- Prefer short, concrete bullets with the gameplay impact and, when useful, the owning manager/module.
