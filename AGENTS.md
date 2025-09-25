# Instructions
- Document major feature updates in this file.
- Keep imports and exports browser friendly for loading via **index.html**.
- The game needs to be able to run from a browser-like environment.
- Place story projects in **progress-data.js** near the chapter where they unlock.
- Tooltips should use a `<span class="info-tooltip-icon">&#9432;</span>` element with a descriptive `title`.
- Do not use typeof checks, or ifs to verify if a variable or object is not null, or checks for whether or not a constant is a number.  These are very frustrating to read and only make the code worse.
- All UI elements should be cached and reused instead of using querySelector.
- Building-specific logic resides in dedicated subclasses under `src/js/buildings/`. To add a new building type, create a subclass and register it in `initializeBuildings`.

# Overview of code
This repository contains a browser-based incremental game written in JavaScript. The
entry point **index.html** loads scripts that create resources, buildings, colonies,
projects and research items from parameter files. Weather and surface modelling are
driven by modules like **terraforming.js**, **physics.js** and the various cycle files.
Economy and colony management rely on **resource.js**, **building.js**, **colony.js** and
UI modules. Story progression is handled by **StoryManager** in **progress.js** while
**SpaceManager** tracks the current planet.

# Additional gameplay systems
- **skills.js** and **skillsUI.js** implement the H.O.P.E. skill tree.
- **life.js** and **lifeUI.js** allow custom lifeform design.
- **space.js** and **spaceUI.js** manage interplanetary travel.
- **gold-asteroid.js** spawns a temporary bonus event.
- **autobuild.js** automatically constructs buildings when enabled.
- **milestones.js** and **milestonesUI.js** track long term goals.
- **solis.js** and **solisUI.js** provide a shop and quest system.
- The ResearchManager persists between planets so only advanced research remains after travel.

## Prestige systems
Two reset layers control long term progression:

### New game
Calling `startNewGame()` fully recreates the game state and returns the player to Mars. Nothing carries over between playthroughs.  Care must be taken to ensure that if any value is set later in the game, it must be reset or set again properly when starting a new game.

### Planet travel
Selecting another world via `selectPlanet(key)` soft resets the colony while keeping meta systems. It awards one skill point on the first visit and calls `initializeGameState({ preserveManagers: true, preserveJournal: true })` so that:
* `ResearchManager` survives but `resetRegularResearch()` clears normal tech while advanced research and its resource are preserved.
* `SkillManager` retains unlocked skills and re‑applies their effects.  Gained when travelling.
* `SolisManager` keeps quests, points and shop upgrades.  Can also buy artifact and provides an upgrade for permanent researches.
* `SpaceManager` records which planets have been visited or terraformed.
* `StoryManager` continues tracking active events and re‑applies their rewards.
* The **Dyson Swarm Receiver** project's collector count persists across planets, but the receiver must be rebuilt to regain energy production.

When loading a save or switching planets, call each manager's `reapplyEffects` method so stored modifiers affect the newly created game objects.

## Dyson Swarm Receiver
Research unlocks a large orbital array followed by the **Dyson Swarm Receiver** mega
project. The receiver costs 10&nbsp;M metal, 1&nbsp;M components and 100&nbsp;k electronics and
builds over five minutes. Once complete, players may deploy orbital solar collectors.
Collectors consume glass, electronics and components and can be automated. Their total
count persists between planets and each adds **Dyson Swarm** energy production.

Other modules include **save.js**, **projects.js**, **projectsUI.js**, **spaceship.js**,
**day-night-cycle.js**, **journal.js**, **population.js** and **warning.js**.
Ore scanning logic now lives directly inside **ScannerProject**.

# Effectable entities
Gameplay objects that can receive temporary or permanent modifiers extend
`EffectableEntity` in **effectable-entity.js**. Each keeps a list of active effects and
boolean flags. `addEffect`, `replaceEffect` and `removeEffect` apply or update these
effects so that buildings, resources, projects and life all share the same system.

# Resource flow
Resources are created via `createResources` and updated each tick by
`produceResources`:
1. Calculate theoretical production rates.
2. Recalculate storage capacities.
3. Update building productivity based on conditions.
4. Reset trackers and accumulate production/consumption.
5. Apply funding, terraforming and life effects.
6. Clamp values by caps.
7. Aggregate total rates for display.
Helper functions like `checkResourceAvailability` help modules plan without consuming
resources immediately.

## Nanotechnology
The `nanotechManager` oversees a self-replicating swarm unlocked by **Nanotechnology Stage I** research. The UI remains hidden until `enable()` is called.

- Swarm growth requires surplus power beyond storage; each bot draws 1e-11 W.
- Maximum nanobots equal planetary land area (m²) × 1e19, and only 1e15 bots survive travel.
- The growth slider adds up to +0.15 % growth. Stage I sliders modify growth while:
  - **Silicon Consumption** grants up to +0.15 % growth and consumes silicon from current storage plus accumulated changes.
  - **Maintenance I** reduces metal, glass, and water maintenance by up to 50 % but subtracts up to 0.15 % growth.
  - **Glass Production** yields glass at 1e-20 t/s per bot and also subtracts up to 0.15 % growth.
- Per-second energy, silicon, maintenance, and glass rates appear beside each slider with brief descriptions.
- Travel text notes that H.O.P.E. can hide 1e15 nanobots from the Dead Hand Protocol.

# UI refresh requirements
- **Starting a new game** – call `startNewGame()` which rebuilds game state.
- **Loading a save** – `loadGame()` invokes `initializeGameState({ skipStoryInitialization: true })` then applies the saved data.
- **Moving to another planet** – `selectPlanet(key)` switches the planet and
  calls `initializeGameState({ preserveManagers: true })` followed by `updateSpaceUI()`.
Failing to use these helpers may leave the DOM bound to outdated objects.
To ensure this works properly, every feature in the game that has an UI should have an enabled true/false attribute.  When updating its display, if the flag is true, the feature should be revealed.  If false, it should be hidden.  This flag should not be saved/loaded.  Instead, story unlocks, researches and other things will re enable it as needed.

# Testing
- Run `npm ci` to install dependencies before running tests.
- Save test output to a file so you don't have to rerun it just to read the results.
- Do not commit `test.log`; it is for local reference only and is ignored via `.gitignore`.
- Run tests **once** in non-watch mode with `CI=true npm test` and report how many passed or failed. Pipe the command to `tee` (e.g., `CI=true npm test 2>&1 | tee test.log`) so the results are both displayed and stored.
- Write tests for any new feature.
- Avoid asserting on exact story text; check IDs or prerequisites instead.

# Storytelling style
After Earth's destruction, prefix each character's dialogue with their name the
second time they speak in a chapter to help clarify who is talking.

# Character personalities
- **H.O.P.E.** – deadpan and literal AI, often classifying everything as a form of
  terraforming.
- **Martin** – whimsical and clever mentor figure.
- **Mary** – witty when times are good, serious when crisis strikes.
- **Adrien Solis** – sharp, opportunistic CEO with dark humor.
- **Dr. Evelyn Hart** – professional scientist behind Operation Sidestep.
- **Elias Kane** – charismatic cult leader secretly aiding the aliens.
- Atmospheric Water Collector unlocks via a hot, dry condition trigger treated as a
  prerequisite.
- Prerequisites can check conditions like objectives.
- Story events with chapter `-1` display in the current chapter without changing it.

## Warp Gate Command
Warp Gate Command provides a dedicated subtab for managing teams that embark on timed operations through the warp gate. Players recruit custom-named members with classes and skills, track their health, and choose operation difficulty. Operations grant experience and Alien artifacts, while R&D and Facilities menus offer equipment and training upgrades. Statistics and logs persist across planets so progress carries over between worlds.

## Space Mirror Facility
Space mirrors are overseen through sliders that distribute units across surface zones. Completing the Space Mirror Focusing research reveals an additional control that concentrates mirrors to melt surface ice into liquid water in the warmest zone with ice. The facility now handles zonal flux and melting calculations internally and the display shows both average and day temperatures for each zone. Column headers track the active Celsius or Kelvin setting so readouts stay consistent.

Oversight now includes a collapsible **Finer Controls** section for manual mirror and Hyperion Lantern assignments with adjustable step sizes and per‑zone auto‑assign checkboxes that funnel leftover units into the selected zones while locking sliders or buttons accordingly. Slider totals are clamped so percentages always sum to 100 and the Unassigned slider keeps its width in sync with other controls when finer controls are enabled. The focusing slider carries an integrated reversal toggle to preserve layout, and reversal options only appear once Hyperion Lanterns are unlocked.

An advanced oversight mode prepares temperature and water targets, applies bisection to allocate mirrors and lanterns, and respects water melt targets when prioritizing zones. Reversed mirrors deduct flux while lanterns continue adding energy, and the luminosity tooltip explains the 6 µW/m² floor on outbound flux. Idle mirrors and lanterns contribute no flux because `calculateZoneSolarFluxWithFacility` now honours the Unassigned slider.

Once the Space Mirror Facility project completes, quick build buttons appear beneath mirror and lantern status cards to streamline construction. Manual slider edits, Any Zone assignments, and the reversible reflect mode all synchronise with advanced controls so assignments persist correctly across saves and travel.

## Random World Generator
The Random World Generator manager builds procedural planets and moons with lockable orbit and type options. Worlds must equilibrate before travel; a progress window tracks simulated time and allows canceling or ending early once the minimum fast-forward is reached. Seeds encode UI selections so players can revisit specific worlds, and the manager prevents travel to terraformed seeds while persisting star luminosity and other parameters through saves. Traveling from a fully terraformed world to a random world awards a skill point on the first visit, and planetary thrusters on these worlds use the host star's mass for orbital calculations.

World archetypes now provide tangible bonuses: Titan-like planets shorten nitrogen harvesting, carbon worlds accelerate Carbon Asteroid Mining, icy moons hasten Ice and Water importation, Mars-like colonies gain a global 1 % population bonus, desert worlds boost ore production, desiccated deserts enhance sand quarries, and Super-Earths count as an additional terraformed world. Type dropdowns display friendly names matching these effects. Orbit presets include a new **Very Cold** range (10–100 W/m²), and completing Vega‑2 unlocks hot orbits along with a travel warning that must be acknowledged before departure. The generator logs visited seeds with their parameters and re-renders after travel to respect new locks or story progress.
The Random World Effects card can collapse to hide the bonus table when players need a cleaner view of other space systems.

When adding new generation to the Random World Generator, place the new generation at the end.  This is to ensure older seeds are still compatible.

# Story and System Utilities
Story delivery gained a `system-pop-up` event type for immediate alerts, and Save & Settings now includes a Statistics panel that tracks total playtime across every planet. Designers can accelerate local testing with the `setGameSpeed` console command while Vega‑2 travel triggers a confirmation warning before the trip begins. Story projects are locked to their intended worlds and journal reconstruction fills in `$WGC_TEAM_LEADER$` placeholders when loading saves so narrative logs stay accurate.

# Automation and Interface Enhancements
Buildings and special project cards feature collapsible headers, letting players hide cost and automation details when managing crowded screens. Structures include a persistent **Set active to target** checkbox, autobuild constructs them inactive by default, and enabling autobuild can auto-toggle target matching so queues fill without immediately raising active counts. The Settings view now uses a three-column layout, the Colony tab separates structure lists from sliders, and nanocolony controls sit directly beneath the primary colony panel. Manual toggles clear auto-targeting, storage capacity displays scale with the selected build quantity, and land usage recalculations on load keep construction requirements honest. Autobuild priorities and auto-active settings persist when travelling between planets so colony automation resumes seamlessly.

Interface code caches frequently accessed DOM nodes—including research lists, lifeform editors, colony need boxes, automation panels, resource-selection grids, and Random World tabs—to reduce reflows when data changes. Production and consumption displays now reuse their existing nodes instead of rebuilding markup each tick. Subtabs remember their scroll positions (including special project subpanels), the broader UI can request a one-time forced render, and project automation settings refresh their cached children when options appear or disappear. Resource panels gained configurable margins, collapse toggles adopt triangle icons, and both colony and nanocolony sliders share consistent styling.

Solis storefront updates highlight new research-point offerings, mark completed upgrades as “Purchased,” and hide cost buttons once limits are reached. The advanced oversight upgrade now sits with other research improvements once `solisUpgrade1` is unlocked, ensuring related perks stay together.

# Resource Displays and Inputs
Resource presentation emphasises clarity: production entries turn green when they resolve deficits, risky consumption appears orange, and separator lines draw within custom margins. `reinitializeDisplayElements` pulls defaults from `defaultPlanetParameters` so travel resets names, spacing, and tooltips consistently. Tooltips lead with total production and consumption, include water overflow sections, and present net change lines that optionally incorporate autobuild costs. They collapse into three columns when tall, pause updates while not hovered, and list colonist-supplied workers separately. Luminosity panels now break out ground versus surface albedo, forward aerosol mass into temperature models, and document the Cloud & Haze penalty applied to solar flux. Additional panels explain albedo contributors, show average solar flux alongside day values, and track actual albedo by zone. Day-night cycle duration now derives from each planet's rotation period so averages stay accurate.

Inputs across the space layer support scientific notation for strategic reserves and nanobot energy limits, while advanced oversight melt targets include k/M/B dropdowns. Space storage tooltips separate transfer versus expansion costs, continuous modes display per-second totals, and water withdrawals can target colony stores or surface reserves. GHG factory controls accept decimal values without overwriting user edits, and their UI—along with oxygen factory pressure controls—now lives inside the respective building subclasses. Life growth tooltips reflect ecumenopolis land coverage, interpolate growth and decay across a ±0.5 K band, and display warnings or red biomass markers whenever ecosystems slip into net loss.

# Space Logistics and Projects
Cargo rockets share unified 0/±1, ÷10, ×10 controls with a global increment selector, persist their increment count across sessions, and remember auto-start cargo choices. Ship price increases and strategic multipliers survive saves, while continuous mode only runs when explicitly toggled on. Space storage records ship-assignment multipliers, clarifies mega-project respect for strategic reserves, and exposes a tooltip explaining scientific notation. Export interfaces report assigned ships, provide stable max-capacity tooltips with info icons, and gate automation behind resource and environmental checks that pause or resume projects as conditions change. Project subclasses own their save/load routines, sustain costs appear as dedicated project consumption, and ongoing jobs validate resource availability one second ahead to prevent mid-tick stalls.

Dyson Swarm management shows collector costs on the project card, continues progress visuals after completion, and feeds generated energy directly into the colony. Receiver projects can finish instantly once unlocked, the solar collector interface stays hidden until the receiver is operational, and collector durations scale with terraformed planet counts. Satellite dashboards split deposits from amounts, add an Auto Max control tied to colonist capacity, and ore/geothermal satellites now scale with worker cap. Planetary thrusters track energy spent, persist configuration, and show escape Δv for moons. ProjectManager applies gains every tick through `applyCostAndGain`, while spaceship projects switch to per-ship continuous flow above 100 craft so large fleets consume and produce smoothly. Project productivity readouts emphasise continuous operations, compute duration multipliers on demand, and keep automation reactive to environment-based pauses.

Space disposal tools can automatically disable gas exports below configurable pressure thresholds, pressure automation toggles between kPa and Pa, and resource disposal subtracts zonal surface stores proportionally in both discrete and continuous modes. Metal export projects clarify Earth's purchase limits and keep their tooltips readable by computing them once. Any Zone mirror assignments and reversal mechanics stay in sync with advanced oversight, and idle mirrors respect slider clamping to maintain valid totals.

# Colony Management and Mechanical Assistance
Mechanical Assistance advanced research unlocks a new colony slider ranging from 0 to 2 in 0.2 steps. It raises component consumption, scales mitigation benefits with colony tier via a 10^(tier−3) multiplier, and displays the resulting gravity penalty reduction alongside an explanatory tooltip. Colonies gain a Components need when assistance is active, gravity-free worlds hide the slider entirely, and `ColonySlidersManager` with `updateColonySlidersUI` controls visibility based on the stored flag. The system also powers an `addResourceConsumption` effect so buildings and colonies can adopt new upkeep requirements.

Colony management quality-of-life includes worker priority triangles on building cost displays, Android alerts when idle capacity remains, and refined nanobot readouts that show three decimal places and highlight capped totals in green. `forceUnassignAndroids` enforces integer adjustments based on effective capacity, manual toggles interact correctly with auto-targeting, and colonies share consistent slider styling with nanocolonies. Aerostat colonies introduce a gravity-immune settlement option, broadening late-game population choices.

# Specialized Buildings and Research
Several buildings now operate through dedicated subclasses: `GhgFactory` and `OxygenFactory` manage temperature and pressure cutoffs internally, `Biodome` suspends productivity when life cannot survive anywhere, `DysonReceiver` caps orbital energy intake to swarm production, `SolarPanel` enforces a 10× initial land construction cap (documented via tooltip), and `OreMine` tracks deeper mining progress. High surface temperatures scale maintenance for most buildings, sparing mirrors, Hyperion Lanterns, and Dyson receivers. Companion Satellite research keeps one ore satellite per terraformed world and unlocks its infrastructure automatically, Ship Smelting doubles metal asteroid ship capacity, and Cloning Concept adds colonist-producing facilities. Regular researches remain visible after unlocking the space tab so players can continue planning their queue.

# Terraforming and Atmospheric Simulation
Terraforming underwent a major refactor built around a shared `ResourceCycle` base class. Cycle modules expose `getCoverage` helpers, configurable defaults, `processZone` methods, and hooks for redistributing precipitation or running surface flow so `Terraforming.updateResources` simply iterates over a `cycles` array. `applyZonalChanges`, `finalizeAtmosphere`, and `updateResourceRates` centralise atmospheric and surface bookkeeping, while methane and water cycles convert forbidden melts into tracked rapid sublimation. New helpers such as `buildAtmosphereContext`, `saturationVaporPressureMK`, and revised Penman/SVPCO₂ calculations improve numerical stability and avoid negative humidity deficits near critical temperatures.

The atmosphere model now handles methane–oxygen combustion, calcite aerosol decay, and a sulfuric acid gas resource tied into physics and albedo systems. Liquid CO₂ gains dedicated surface storage, dry ice tracking moved into `zonalCO2.ice`, and biomass tooltips flag zones with net decay. Fast-forward equilibrium checks include biomass and buried hydrocarbons, hydrology uses elapsed seconds to reduce drift, and terraforming totals honour terraform counts that exclude orbital rings when necessary. Fresh utility helpers compute mean molecular weight, specific lift, and nested zonal change maps so precipitation and atmospheric rates remain consistent across cycles.

# Planet Visualization
The planet visualiser has been modularised into files covering core setup, lighting, surfaces, clouds, ships, environments, and debug controls. This separation keeps rendering responsibilities focused and simplifies future extensions.

## Updates
- High-gravity worlds now apply compounded building and colony cost multipliers, and the Terraforming Others panel shows the current gravity alongside any active gravity penalty.
- Autobuild now highlights resources that stalled construction with an orange exclamation mark in the resource list.
- Added a fullscreen loading overlay that displays while the game or a save file is loading.
- Milestones subtab remains hidden until Terraforming measurements research is completed.
- Added a Mass Driver building that is locked by default and costs ten times an oxygen factory.
- Added a hydrogen import special project mirroring nitrogen harvesting to gather atmospheric hydrogen when unlocked.
- Introduced Mass Driver Foundations research to unlock the launcher network and surface disposal integration once the massDriverUnlocked flag is earned.
- Resource disposal treats each active Mass Driver as a configurable number of spaceship equivalents (default 10) when calculating throughput.
- Added a Bosch Reactor building that performs the Bosch reaction once research gated by the boschReactorUnlocked flag is completed.
- Chemical Reactors now support multiple selectable recipes, including Bosch water synthesis, direct hydrogen-oxygen combination, and Sabatier methane production.
- Planet visualizer debug sliders are hidden by default; use the `debug_mode(true)` console command to reveal them, and the setting persists in save files.
- Solis Upgrade Two unlocks a Solis shop option to pre-purchase starting cargo ships for 100 points each.
- Oxygen factories now vent hydrogen alongside oxygen to reflect electrolysis byproducts.
- Colony research tiers two through six now grant aerostat colonies +10 comfort each via a new `addComfort` effect type.
- Adrien Solis now offers a permanent Terraforming measurements research unlock in his shop once chapter 18.4d is completed.
- Introduced an Antimatter Battery structure that stores a quadrillion units of energy for 1000 metal and 100 superconductors.
