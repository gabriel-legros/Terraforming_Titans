# AGENTS.md

## Purpose
This file is the working contract for contributors and coding agents. Keep it current, concise, and organized by system.

## Core Rules
- Always ask for clarification before proceeding with significant changes.
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
- Do not add try/catch or fallback shim code just to probe required globals/functions from ordered script includes. If a function is required by load order, call it directly and fix tests/harnesses instead of weakening the runtime code.
- Do not add trivial wrapper helpers that only rename, "resolve", "normalize", or "get" already-available values unless they contain real shared logic. Avoid helper chains where a module calls another tiny helper that just reads globals, clamps one value, or forwards arguments unchanged.
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
- Do not leave generated test result artifacts in the worktree. If you create temporary files such as `tmp-jest-results*.json`, remove them before finishing.
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

## Localization
- Do not add new player-facing English strings directly in HTML or JS. Put them in `src/js/lang/current-language.js`.
- Keep internal ids, save keys, automation ids, resource ids, project ids, and effect ids stable and in English-like code form. Localize display text only.
- For static HTML in `index.html`, use `data-i18n` and related localization attributes instead of hardcoding visible text.
- For JS UI text, use `t(key, vars, fallback)` or a small local wrapper such as `getXText(...)` near the top of the file.
- For parameter/catalog files, keep the data objects in place and localize their display fields through the language file and centralized apply logic in `src/js/lang/localization.js`.
- Prefer full-sentence keys with placeholders like `{value}` or `{name}` over string concatenation.
- Keep tooltip text in the language file too. Build the tooltip icon in code/HTML, then pass the localized text to `attachDynamicInfoTooltip(...)`.
- When adding a new system with UI, add its localization keys under a matching namespace in `current-language.js` such as `ui.colony.*`, `ui.buildings.*`, or `catalogs.projects.*`.
- If a localized string is needed before the language layer is guaranteed to exist, use a fallback string through `t(...)` rather than hardcoding separate logic paths.
- After moving or adding localized strings, run the Windows test command and report pass/fail counts.

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
- Shared productivity availability now uses stored stock plus same-tick production, so consumers can hold 100% throughput while inventory buffers last and only throttle once the buffer is no longer sufficient for the tick.
- Surface land now keeps a fixed-point `BigInt` reservation/value ledger under the normal resource fields, so building/autobuild checks, hazard reservations, UI, and save/load stay stable on giant artificial worlds.

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
- Random worlds that bypass equilibration now delay Hazardous Biomass tuning/allocation until after travel and the first live terraforming update tick, so the hazard calibrates against the world's actual post-travel temperature state instead of placeholder generation temperatures.
- Live dynamic geometry now uses explicit celestial baselines (`baseMass`, `baseRadius`, `baseGravity`, `baseLand`) and is gated by `specialAttributes.dynamicMass`; RWG worlds set it on generation, while story/artificial worlds stay fixed unless a world-specific override opts in.
- Dynamic-mass worlds now also maintain a direct planetary-mass ledger beyond normal resource deltas: Resource Disposal can target `Planetary Mass`, while ore/silica space mining can route imports directly into planetary mass instead of colony storage. These direct mass changes affect both gravity and radius; metal imports use metal density, silica imports use silica density, and planetary-mass disposal removes volume using the world's current bulk density.
- Dynamic-mass worlds now track three explicit mass streams: persistent planetary bulk mass, exact current surface mass (sum of tracked surface resources), and exact current atmospheric mass (sum of tracked atmospheric resources). Radius/land come from planetary bulk volume plus exact current surface volume, while gravity uses total mass from all three streams.
- Dynamic-mass worlds expose `Planetary Mass` as an underground resource. It stays hidden unless `specialAttributes.dynamicMass` is enabled on that world, its value is synced from the planetary bulk mass stream initialized as generated world mass minus initial surface resources minus initial atmospheric resources, and direct import/disposal flows show visible rate changes on that bulk mass pool.
- RWG UI exposes a `Dynamic Mass` checkbox between the seed controls and dominion panel only when `rwgManager` boolean flag `enableDynamicMass` is set; it writes `specialAttributes.dynamicMass` onto the generated override and should stay seed-option reproducible.
- Preserve compatibility: append new generation logic at the end only.
- Supports dominion selector and dominion-specific terraforming requirements.
- Some dominions/world types are story/sector gated.
- Special seeds can define world-specific effects (project/building flags), are replayable by seed, and surface effect descriptions in RWG world details.
- RWG `Dynamic Mass` is no longer available by default; show that control only when `rwgManager` has boolean flag `enableDynamicMass`, and hide the RWG settings card when none of its controls are unlocked.
- Poseidon chapter `poseidon.38.5` unlocks RWG type `molten`: a core-heat-driven world with randomized `coreHeatFlux` in the `150,000-300,000 W/m²` band set before radius scaling, strong geothermal identity, and terraforming rewards of `+5%` energy production each for Geothermal Generators, Fusion Reactors, and Superalloy Fusion Reactors.

### Artificial Worlds
- Managed via `ArtificialManager` (shell/ring/disk-ready architecture).
- Ringworld support includes custom controls, spin protocol, and low-gravity lock behavior.
- Construction supports prepay, 5-hour hard cap, persistence, resume/discard, rename.
- Artificial naming auto-increments by type.

## Major Feature Updates (Consolidated)
### Atmosphere, Physics, and Terraforming
- World-land semantics now have explicit helper support for immutable `baseLand` versus live geometric land derived from radius; RWG persists generated `baseLand`, `initialLand` remains a compatibility alias during migration, and systems can move case-by-case onto the correct land basis instead of assuming one meaning everywhere.
- Whole-world scaling now splits by system: hazard initialization can use `baseLand`; `Artificial Sky`, `Underground Expansion`, and Foundry World mining-cap scaling follow current world land; `Artificial Crust`, fixed base-land building caps, and Foundry World travel-point rewards stay on `baseLand`.
- Atmospheric density/exobase/drag heuristics now use bulk non-heavy-trace mass/pressure to avoid nonphysical Kessler-line behavior.
- Atmospheric layer boundaries now use exobase-relative heights for monotonic drag behavior.
- Water vapor saturation effects now reduce effective pressure, with cold trapping on cold worlds.
- Condensation/precipitation now includes a simple uplift-based saturation cap (adiabatic cooling to a representative lifted pressure), allowing condensation even when the surface is unsaturated.
- Cloud albedo now layers water, methane, sulfuric-acid, haze, and calcite reflectivity multiplicatively instead of summing cloud sources into one bucket; water-cloud coverage was retuned upward so Earth-like seeds stay near `0.30` Bond albedo while Venus keeps its high sulfuric-cloud albedo.
- Greenhouse optical depth now weakens on very hot worlds based on pre-greenhouse radiative equilibrium temperature and also soft-caps to a temperature-dependent maximum, preventing runaway near-IR trapping while preserving existing Mars/Venus/Titan balance.
- Temperature-based maintenance penalties now rise linearly above 373.15 K, then switch to exponential growth beginning at 973.15 K, doubling every 100 K and capping at `1e9`; on worlds above 1 atm, mitigated building maintenance and aerostat colony maintenance cannot drop below the dry-adiabatic 1 atm temperature penalty floor.
- Celestial parameters can now set `coreHeatFlux` in W/m^2; temperature treats it as a flat global surface heat source and the temperature UI shows it when present.
- Worlds with `coreHeatFlux > 0` disable Ore Mine, Sand Quarry, and the related early ore research unlocks (`Efficient Ore Processing`, `Ore Scanning Satellite`, `Deep ore mines`, `Android-assisted deeper mining`, `Underground Land Expansion`); `Advanced Alloys` remains available.
- Terraforming history charts include a rolling 500-year window and phase diagrams (Water, CO2, Methane, Ammonia, O2, N2).
- Oxygen and nitrogen now have full phase-change cycles.
- Phase-change cycles now include rapid boiling (liquid -> gas) above local boiling points, tracked as a separate `boiling` rate/tooltip channel, with rate `current liquid × 1e-7 × (temperature - boiling point)`.
- Hydrology, phase transitions, and zonal resource synchronization were refactored for stability and consistency.

### Space, Projects, and Hazards
- Atlas featured challenge world `Hermes` now occupies the second featured slot and uses Mercury-accurate orbital/body data around star `Helios`; it disables Space Mirror Facility and Tractor Beams through reusable target effects rather than Pulsar-only hardcoding, and its completion reward unlocks RWG `Very Hot` orbits. RWG `Very Hot` is a distinct locked orbit preset above `Hot`.
- Kessler Skies gained richer failure/debris modeling, warnings/tooltips, and capped Solis storage bonuses.
- Kessler cost multipliers and decay behaviors were tuned; hazard charts and bin diagnostics expanded.
- While Kessler Skies is active, Followers Orbitals are limited to `research`; non-research orbital outputs are disabled and the Orbitals card shows a warning banner.
- `Kerati Hive` is a zero-cost custom project with its own hive-simulation UI and save state: colony food can be transferred into hive food, drones convert food into honey, builders spend honey on spawning pools, hunters consume biomass for hive food and claim `Kerati Territory` independently while free land remains, spawners produce larva, and batch `/10`/`x10` controls exist for every hatch and promotion action; completion requires Kerati Territory to reach `100%` of initial land.
- Pulsar hazard now has full clear paths on affected worlds: fully build all `Artificial Sky` segments or use Planetary Thrusters to `Go Rogue`; both clear pulsar hazard effects.
- Worlds with `coreHeatFlux > 0` now show infrastructure project `Artificial Crust`: total cost and segment count scale directly with planetary initial land, spaceship assignment accelerates construction, and completion proportionally suppresses core heat until it reaches zero.
- Mega Heat Sink now subtracts remaining post-`Artificial Crust` `coreHeatFlux` from the surface heat budget before applying any net cooling, so geothermal worlds can neutralize residual core heat without being pinned to the pre-sink trend floor; the Temperature box shows this net core heat flux and its tooltip explains the Mega Heat Sink interaction.
- Completing `Artificial Sky` now permanently disables the `Space Mirror` building on that world (this does not disable the `Space Mirror Facility` project).
- Completing `Artificial Sky` sets stellar output to `0` but keeps the world's `star` metadata object intact for systems that still need host-star details.
- `Artificial Sky` is now a segmented spaceship project: total segments are `ceil(initial land / 1000)`, each segment spends an equal share of the old full cost, base segment duration is 50,000s at 1 assigned ship, and it becomes continuous when effective duration drops below 1s.
- Pulsar hazard now triggers recurring Electromagnetic Storms (5s every 100s): storms apply temporary attrition to unassigned androids/electronics/nanobots, pause spaceship projects, and surface as active warning state in the Pulsar UI card.
- While Pulsar is active, hazard intensity scales down with Artificial Sky completion (land lock share, added radiation, and storm attrition), and Nanocolony max nanobot cap uses the higher of Underground Expansion ratio vs Artificial Sky completion ratio.
- Styx's Hazardous Machinery now gains an additional heat-decay channel above `500°C` global temperature, with the threshold and decay coefficient defined in the world's hazard parameters.
- Styx's Hazardous Machinery now supports biomass-style natural growth with a configurable base growth rate and average percent penalties, while water still only limits the hazard's maximum coverage.
- Land reservation now uses a shared combined `hazards` source; world land usage takes the max share across Hazardous Biomass, Pulsar, and core-flux molten surface, while molten-surface reservation uses the lower of the Artificial Crust share vs the global-temperature share (`100%` reserved at `1000°C`, `0%` reserved at `700°C`).
- Styx now uses hazard `Hazardous Machinery`: coverage is capped by `1 - water coverage / 2`, occupied land joins the shared hazard-reservation max rule, oxygen and Crusaders can clear it, dangerous hacking can spend electronics to recover androids from it, unassigned worker-androids decay into it, nanocolony growth and electronics maintenance scale with remaining machinery, and active assigned ships add a fixed worker requirement per ship while the hazard remains.
- Hazardous Machinery growth factors now use biomass-style range entries with severity for invasiveness, oxygen, and temperature; Styx keeps the separate water-based max-coverage cap and applies its machinery decay through those range preferences.
- Space storage resources are canonical under `resources.spaceStorage` (no parallel runtime usage map), support additional resource types, and keep per-resource cap controls.
- Advanced research `Artificial Ecosystems` (750M) requires `Biostorage`, adds a persisted Space Storage operations toggle, and lets stored biomass grow at `0.5%/s` toward its configured biomass cap by consuming stored water and carbon dioxide with the standard photosynthesis stoichiometry; oxygen output can overflow into the normal clamp.
- Resource Disposal can include Mass Drivers as ship-equivalent throughput.
- Dyson Swarm/Receiver/Sphere, Lifters, mega/giga projects, and continuous ops gained stronger persistence and UI clarity.
- Lifters now use per-recipe assignment controls (including Strip Atmosphere/Hydrogen/Methane/Ammonia/Star Lifting), with per-recipe complexity, auto-assignment weights, and per-recipe productivity/throughput handling so mixed allocations run simultaneously; `Star Lifting` also unlocks a saved/preset-aware supercharge slider (`x1` to `x10`) that scales lifter throughput linearly and energy per lifter cubically.
- Dyson collectors now always inject full output into `resources.space.energy`, and Dyson Receivers now convert `space.energy` into colony `energy` directly.
- Dyson Sphere now tracks a derived sphere count (`0` before frame completion, then `ceil(power / 5e25)`), enforces a default max of 1 sphere (max power `5e25`), unlocks expansion to 100 billion spheres via advanced research `Additional Dyson Spheres`, and adds a fixed superalloy surcharge to Dyson Sphere collector costs once expanding past 1-sphere power.
- Advanced research now includes `Space Antimatter Safety Regulations` (12M), unlocking mega project `Space Antimatter`: the project starts completed on unlock, battery builds are instant batch actions (`-`,`+`,`/10`,`x10`) costing metal/electronics/superconductors from colony or space storage per Space Storage mode, each battery adds `1e15` to `space.energy` storage cap, and battery count persists through travel.
- `Space Antimatter Safety Regulations` also unlocks an `Antimatter Farm` alternate recipe that converts colony `energy` into `space.energy` at a `1:1` ratio.
- Advanced research now includes `Nuclear Alchemy` (100M), unlocking the repeatable giga `Nuclear Alchemical Furnace`: furnace expansion scales with terraformed worlds and can go continuous, run mode assigns furnaces per output resource (Carbon/Graphite, Oxygen, Nitrogen, Silica, Metal), consumes space-storage hydrogen by assignment/complexity, and reports conversion rates in space-storage tooltips.
- Advanced research now includes `Gigafoundries` (10B), unlocking the repeatable giga `Superalloy Gigafoundry`: gigafoundry expansion scales with terraformed worlds and can go continuous, uses the Nuclear Alchemical Furnace assignment UI with a single Superalloy recipe, converts space-storage metal plus space energy into space-storage superalloys, runs at 1 batch/s per assigned gigafoundry (`1T` space metal and `1e19` space energy per second each before productivity throttling), and applies the same WGC superalloy output multiplier as the `Superalloy Foundry`.
- Advanced research now includes `Hyperlane` (15B), applying the same per-sector Warp Gate Network multiplier used for import caps to O'Neill cylinder capacity; each fully controlled sector contributes scaled cylinder cap, with a minimum base capacity of `1000` when no sectors are controlled.
- Advanced research now includes `Core Surgery` (20B), unlocking the giga `Apollo Planetary Core Surgery Plateform`: it builds once per world, then enables a 60s core-surgery activation that spends `1e28` space energy and permanently sets `hasNaturalMagnetosphere` on that story/random world after Kessler and Pulsar are both cleared; artificial worlds cannot use it.
- Advanced research now includes `Manufacturing Worlds` (500M), unlocking a zero-cost world-specialization project (mutually exclusive with Bioworld/Foundry/Holy World): completed departures grant MP as `max(1, log10(population))`, then +10% per hazard on that world, bank departed population permanently as cumulative manufacturing potential, and enable global assignment-based space-storage manufacturing for Glass/Components/Electronics/Superconductors/Superalloys with MP-shop scaling (+1% production and consumption per level, max 900 each).
- Galactic Market uses fixed 1x estimates for cost/gain (ignores productivity).
- Projects can set `attributes.ignoreDurationModifiers: true` to lock runtime to base duration and ignore all project duration modifiers.

### Automation and UI
- Building/project cards support collapsible layouts and improved cached rendering.
- Runtime building and colony `count`/`active` state now use `BigInt` internally; convert through the shared numeric cache (`countNumber`/`activeNumber`) when a system needs JS number math for rates, UI percentages, or other fractional calculations, while keeping save data numeric.
- Localization scaffold now loads a swappable language script through `index.html`; static shell text can use `data-i18n` attributes, and catalog/story localization is applied centrally before globals initialize. No in-game language selector exists yet.
- Travel now warns before leaving an unfinished world, using the same confirmation flow across story, random-world, and artificial-world travel.
- Atlas featured challenge completions (not community completions) now increase the max rank of every skill by 1 each; additive skills continue linearly past rank 5, while build cost, worker reduction, maintenance reduction, and project speed switch after rank 5 to asymptotic reduction curves that preserve the old rank-5 values and trend toward 62.5% / 75% caps.
- Aerostat details now include an android-space slider (0-10 per aerostat) that splits aerostat housing between colonists and androids, scales the related colonist-only consumptions by the colonist share, saves through load, and resets on travel.
- SpaceManager now maintains incremental cached world stats (terraformed totals, sector world counts, artificial world value/fleet contributions, and RWG type/hazard bonuses) that rebuild once on load and update through mutation setters/travel flows.
- RWG save/load now remembers only the current random world plus the 10 most recent inactive RWG worlds; older RWG worlds collapse into summary totals that preserve terraformed/ring counts, per-sector terraformed/ring pools, departed colonists, sector units, RWG type/hazard counts, specialization counts, and foundry bonuses without keeping old seeds replay-locked forever.
- Artificial world save/load now remembers only the current artificial world, all stored artificial worlds, and the 50 most recent inactive artificial histories; remembered terraformed artificial worlds are kept as lightweight history rows, remembered abandoned artificial worlds stay full-fidelity and travelable, and older inactive artificial worlds collapse away while preserving departed colonists plus the terraformed-world summaries needed for specialization/foundry bonuses, sector weighted counts, and per-sector/global artificial fleet-capacity value histograms so capped offensive values can still be reconstructed and the histogram can be removed later if the cap is ever fully uncapped.
- `produceResources` now primes a per-tick building effect cache (multipliers, added consumption, maintenance cost) and reuses it across projected and actual production passes to reduce repeated `activeEffects` scans.
- GalaxyManager now caches controlled-sector reward world totals per faction and invalidates them with sector-control cache invalidation, so repeated terraformed-world/fleet-capacity reads avoid rescanning all sectors.
- HazardManager now skips neutral `applyHazardEffects` channels, tracks previously applied hazard channels, and performs one-time hazard effect cleanup/reapply on transitions so stale hazard effects are removed without per-tick neutral reapplication.
- Multiple automation systems expanded:
  - Ship automation reorder/limits/resource disposal support
  - Building preset combinations and travel application options
  - Project automation presets/combinations (non-story projects), with per-project control-only save/load and travel application options
  - Colony automation presets/combinations mirror building automation for colony buildings, colony sliders, Construction Office, Nanocolony, and Orbitals, with autobuild available only for colony-building targets and journal sidebar deploy shortcuts for presets/combinations
  - Research automation adds Solis-unlocked preset management in the Hope automation tab without combinations; presets directly capture the Research tab's manual hidden state plus per-research auto-research toggle and priority, switching presets reapplies those saved research UI states, and a single preset can be queued for next travel with optional persistence
  - Sensitive automation picker entries can use `automationRequiresEverEnabled`; they stay hidden until the building/project has been available once, and automation preserves that discovery through save/load/travel
  - Life automation presets and as-needed modes
  - GHG/calcite and dust factory automation targeting
- String numeric input handling standardized across major controls.
- GHG factory temperature-band automation now aims both greenhouse gas and calcite corrections at the selected band midpoint, then idles again while the projected trend remains inside the band.
- GHG factory automation target modes now support active-gas partial-pressure bands in addition to temperature and optical depth; pressure uses the same midpoint solver behavior as temperature for the current GHG/calcite recipe, while optical depth remains GHG-only and never drives calcite mode.
- Tooltips were upgraded with dynamic/pinnable behavior and viewport-aware placement.
- Space Storage reserve controls are now per-resource in the resource settings dialog, with reserve modes for absolute amount, `% of resource cap`, and `% of max storage`; the old global strategic reserve was removed. Each reserve also has scope checkboxes (`Expansions`, `Transfers`, `Consumption`) controlling which systems respect it; `Expansions` is checked by default, while `Transfers` and `Consumption` are opt-in. Consumption scope works at the productivity-calculation level in `resource.js` via `calculateResourceAvailabilityRatioWithReserve`, transfers scope is checked in the ship transfer plan, and expansions scope flows through `getAvailableStoredResource`/`spendStoredResource` with a `scopeFilter` parameter.
- Space Storage cap controls now include `By Weight`: amount/% caps are applied first, remaining storage is split proportionally across weighted resources, and resources with weight `0` or no cap setting get cap `0` while any weighted cap is used.
- Ship automation now excludes spaceship projects that are irrelevant on the current world and releases ships from stale preset entries instead of parking them on hidden world-specific projects.
- Resource Disposal now supports up to 10 configured disposal targets with per-target auto-start, wait-for-full-capacity, and monitoring thresholds; active auto-start targets split assigned spaceships and Mass Drivers evenly.
- Resource panel keeps the Colony/Space view toggle only when the `Show space resources in default resource panel` setting is off; with the setting on, the toggle is hidden and `Space Resources` render directly below `Colony` once space resources are actually unlocked.
- Colony now uses subtabs: Population unlocks with Colony tab, Nanocolony unlocks with Nanotechnology Stage I, and unlock transitions auto-focus the corresponding subtab.
- Save & Settings now uses four subtabs (`Save`, `Settings`, `Statistics`, `Credits`) so utility controls and metadata are split into smaller panels instead of one long page.
- Space now supports an `Atlas` subtab between `Artificial` and `Galaxy`: `atlasManager` preserves across travel/save-load, reveals curated challenge worlds with featured and collapsible community sections, tracks lightweight completion state separately from `randomWorldStatuses`, and special seeds are no longer entered through RWG.
- Atlas challenge worlds can grant persistent completion rewards as normal effects; Atlas must reapply earned reward effects on load/travel, and Titania specifically unlocks the RWG `Dynamic Mass` control via `rwgManager` boolean flag `enableDynamicMass`.
- Atlas challenge cards now show a `Fastest completion` line per challenge using each seed's best recorded world completion time, with real-time shown when available.
- Hades chapter `hades.33.0` unlocks `followersManager`; when enabled, Colony shows a `Followers` subtab with Orbitals assignment (manual and weight modes), a live `Faith` panel, and the Holy World consecration/shop systems.
- Followers Orbitals also grant storage cap on assigned target resources: per assigned orbital cap bonus is `max(100, per-orbital production × 10)`, and this cap bonus is applied during storage-cap recalculation before orbital production runs.
- Faith tracks separate world and galactic believers: enabling seeds galactic believers to 10%, colonist imports blend world faith with galactic faith share, world conversion is exponential with a world cap of `galactic + 5%`, and at cap world+galactic faith increase together at 1/250 speed (Missionaries only boosts this post-cap galactic conversion).
- Faith bonuses scale from believer share: Pilgrim boosts population growth from galactic believer %, Zeal boosts colonist worker efficiency up to `x3` total from world believer %, Apostles boosts available orbitals above 10% galactic faith (up to +900%), and Missionaries boosts only galactic post-cap conversion power from world believer %.
- Settings include `Suppress Faith`: when enabled it hides Followers `Faith`/`Holy World` cards and force-disables all Faith and Holy World gameplay bonuses (Pilgrim/Zeal/Apostles/Missionaries plus Holy Shop effect outputs).
- Followers Orbitals include an `Art Gallery` subsection: Art Power is `galactic population * artifacts invested * funding invested`, and persistent Art Power grants `0.25 * log10(Art Power)%` happiness plus worker-per-colonist multiplier `1 + 5 * happiness bonus`.
- Holy World is now fully implemented in Followers: consecration requires no other active/completed world specialization, at least 80% initial land in Ecumenopolis districts, and at least 90% colonist occupancy; costs are per-initial-land and scale `2x` per consecration completion, consecration blocks starting Foundry/Bioworld on that world, and consecrated world departures grant 1 Holy Point.
- Holy Shop purchases persist through travel and support Respec; upgrades include +5s Festival/Golden Asteroid durations (max 18), +1 max patience (max 12), and +10% faith conversion power (max 100%).

### Story, Planets, and Progression
- Story effects support `onTravel: false`.
- New/expanded worlds and arcs include Umbra, Solis Prime, Tartarus/Gabbag placeholders, and Hades (airless pulsar world at 20 AU with placeholder chapters 33-35).
- Poseidon placeholder story arc was added with chapters 36-38, using colonist milestone objectives from 10 up to 10 billion; Hades chapter 35 now bridges with a sector-conquest objective (`R5-10`) and a travel objective to Poseidon.
- Styx placeholder story arc follows Poseidon with chapters 39-41, using colonist milestone objectives at each `1x` and `5x` step from `50` through `10 billion`.
- Terraforming dominions now include Kerati: a warm wet hydrogen-carbon dioxide hive species unlocked at 30 fully controlled sectors, requiring 20% liquid-water coverage plus completion of the `Kerati Hive` infrastructure project to finish terraforming.
- Poseidon and RWG molten worlds no longer start with atmospheric oxygen; the molten RWG atmosphere mix shifts that share into water vapor, and both Poseidon and RWG molten worlds set geothermal deposits equal to initial land while keeping ore deposits at zero.
- Poseidon chapter `poseidon.38.0` grants aerostat flag `aerostats_collision_avoidance`, allowing Aerostat Colonies to build above the normal 25% initial-land cap with an added research build cost and matching research maintenance that scales by `+10` research per extra base-cap tier; gravity and temperature penalties do not increase that research upkeep.
- Poseidon applies a world effect that enables `Foundry`, a resource building capped by initial land that costs like an Ore Mine, needs 10 workers, produces 10 metal plus 10 silica, and only gets the metal half doubled by `Advanced Alloys`.
- Terraforming completion rewards and travel-point systems were extended (including dominion-specific rewards).
- Journal reconstruction and indexing were improved for story continuity.
- Terraforming requirements now support `appliedEffects` (applied on load/travel like other effects) and per-liquid coverage comparisons (`atLeast`/`atMost`), and `Others` can include requirement-level checks such as project completion.

### Specialized Systems
- Buildings moved toward dedicated subclass logic (e.g., GHG/Oxygen factories, Dyson receiver, biodome behavior).
- Advanced research includes `Bioships` (8B), unlocking a Life Designer attribute with up to 1000 points that linearly converts biomass into spaceships after life growth/decay, reaching 10% of biomass per second at max investment.
- Life Designer advanced-research point purchases now cost `1, 2, 4, 8, ...`; legacy saves convert old quadratic spend into the new purchase count and grant `+1` bonus advanced-research purchase when the save had any legacy advanced-research purchases.
- Ecumenopolis life-land penalty now has a Biodome floor: life land multiplier uses `max(1 - ecumenopolis land fraction, biodome land fraction)`, where biodome fraction is active biodome land over initial land.
- Advanced research includes `Warp Storage` (75M), unlocking a Storage Depot alternate recipe with `10x` storage and `1M` energy consumption, and a Space Storage expansion recipe selector (`Standard Storage`/`Warp Storage`) where Warp mode costs metal+components+electronics and runs Space Storage expansion `10x` faster; selection persists through save/load, travel, and project presets.
- `Biocortex-human integration` now gives completed Bioworlds a `x10` Metropolis production multiplier instead of a global research multiplier.
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
- Awakening supports hidden standalone bottom-row skills that stay invisible until Atlas completion rewards apply `skillManager` reveal effects; revealed nodes do not use prerequisite connectors.
- Multiple UI performance improvements reduce unnecessary DOM rebuilds and preserve subtab scroll/context.

## Maintenance Notes
- Keep this file deduplicated. If a new update supersedes an older bullet, replace the older bullet instead of appending near-duplicates.
- Group updates under the closest system heading to keep future edits discoverable.
- Prefer short, concrete bullets with the gameplay impact and, when useful, the owning manager/module.
