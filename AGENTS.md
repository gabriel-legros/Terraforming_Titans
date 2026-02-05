# Instructions
- Document major feature updates in this file, under the appropriate section.  You may add sections.
- Keep imports and exports browser friendly for loading via **index.html**.
- CRITICAL : The game runs from index.html and all includes happen there.  We must not redefine global variables or constants, we must assume things are included in the correct order.
- The game needs to be able to run from a browser-like environment.
- Place story projects in **progress-data.js** near the chapter where they unlock.
- Tooltips should use a `<span class="info-tooltip-icon">&#9432;</span>` element with a descriptive `title`.
- For long, browser-safe tooltips, create the info icon span and call `attachDynamicInfoTooltip(icon, text)` from `src/js/ui-utils.js` so the helper builds the child `.resource-tooltip.dynamic-tooltip` and wires `addTooltipHover` for viewport-aware placement.
- Keep the Warp Gate Command Teams tooltip updated whenever special rules change.
- Do not use typeof checks, or ifs to verify if a variable or object is not null, or checks for whether or not a constant is a number.  These are very frustrating to read and only make the code worse.
- All UI elements should be cached and reused instead of using querySelector.
- Building-specific logic resides in dedicated subclasses under `src/js/buildings/`. To add a new building type, create a subclass and register it in `initializeBuildings`.
- Do not use globalThis.  It never ever ends up working out because the objects you are looking for are never actually attached to it.  Use the global variable directly instead, or adapt your test accordingly.
- Keep code short, concise and easily readable.  Avoid any unnecessary checks for objects that should obviously exist.
- When taking screenshots, if you want it to succeed, you must modify DEBUG_MODE from src/js/debug_constants.js to true, otherwise you will not be able to skip the intro cutscene.

# Testing
- Run `npm ci` to install dependencies before running tests.
- Save test output to a file so you don't have to rerun it just to read the results.
- Do not commit `test.log`; it is for local reference only and is ignored via `.gitignore`.
- Run tests **once** in non-watch mode with `CI=true npm test` and report how many passed or failed. Pipe the command to `tee` (e.g., `CI=true npm test 2>&1 | tee test.log`) so the results are both displayed and stored.
- Do not write tests for new features unless prompted.

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

# Recent updates
- Incoming attack cards now show the enemy success chance, and the space tab alert turns green when all active attacks have a 0% success chance.
- Golden asteroid visuals now stay loaded and hide between spawns to prevent image load failures.
- Golden asteroid save loading now clears any lingering countdown notifications before restoring the saved timer.
- Ringworld setup now includes a target flux slider (1200–1500 W/m²).
- Tartarus chapter 32 now enables ringworld construction in the Artificial Manager.
- Random World Generator now clears the equilibration flag whenever a world is regenerated so the Equilibrate step is required again before travel.
- Terraforming history charts now display a rolling 500-year window.
- Ringworld construction cost now scales linearly with ringworld land area.
- Ringworld construction cost now scales linearly with radius and quadratically with width.
- Ringworld construction now requires metal equal to the superalloy cost.
- Ringworld Auto now targets the cheapest build that finishes just under 5 hours.
- Ringworld planet visualizer now renders metallic shade panels that cover half the ring and drift to create a moving day-night band over clouds.
- Ringworld terraforming adds Shading Controls with a configurable strength slider and tropical flux readout, preserving the setting on travel when project settings are saved.
- Ringworld terraforming now includes Auto Shade targeting (average/day/night trend) with a temperature goal and travel persistence.
- Magnetic Shield and Space Elevator costs now scale by world size using radius (minimum 1x at Earth radius).
- Building production entries now show tooltips with base output and named multiplier sources.
- Fusion Reactor and Superalloy Fusion Reactor now support water and hydrogen fuel recipes, with the hydrogen option unlocked in Venus chapter 19.4.
- Ship automation now locks Import Resources assignment buttons while automation is active.
- Ship automation no longer offers All Remaining steps; legacy saves migrate them to Capped by largest max.
- Ship automation steps can now be reordered with up/down arrows.
- Ship automation now supports a Resource Disposal (mass drivers included) target that counts mass drivers as 10 ships and assigns them before ships.
- Research concept unlocks now enable specific research entries directly instead of relying on research manager boolean flags.
- Story-gated research unlocks now enable their research entries directly instead of using requiredFlags.
- Atmospheric density upper-atmosphere molar-mass heuristics now use bulk/hydrostatic mean molecular weight (excluding heavy trace like SF6/aerosols), and upper-atmosphere temperature/column-mass heuristics now use bulk (non-heavy-trace) pressure/mass so adding safe GHG can’t lower the Kessler drag line via thermosphere cooling heuristics.
- Exobase height estimation for atmospheric density now uses bulk (non-heavy-trace) atmospheric mass so heavy trace additions don’t shift upper-atmosphere layer boundaries.
- Atmospheric density layer boundaries now use exobase-relative heights to keep the Kessler drag line monotonic in surface temperature for fixed composition/pressure.
- Atmospheric density now reduces effective surface pressure when water vapor exceeds saturation to penalize condensation, and cold-traps water so it doesn't inflate the upper-atmosphere drag line on cold worlds.
- Underworld mining no longer creates geothermal deposits on worlds without geothermal activity.
- Autobuild now supports % land share targets for structures that consume land.
- Info tooltips created via `attachDynamicInfoTooltip` are now click-pinnable by default (click icon to keep open; click elsewhere to close).
- Deeper Mining and Underground Expansion now support auto-assigning androids by percentage.
- Android project auto-assign inputs now accept two-decimal percentages.
- Deeper Mining superalloy drill speed now locks per run in non-continuous mode, so slider changes apply to the next deepening cycle.
- Warp Gate Command R&D purchase tooltip now lists available upgrades with their max levels.
- Kessler Skies now caps Solis storage bonuses at 1,000 per resource.
- Kessler building warnings now show a tooltip with debris added, multiplier shift, and small/large project failure deltas.
- Game loop now derives delta time from performance.now(), clamped to 1s, instead of Phaser’s provided delta.
- Life automation auto-purchase thresholds now accept two-decimal percentages from 0–100%.
- Life automation now supports an As Needed mode for radiation tolerance based on magnetosphere status.
- Nanotechnology Stage III now unlocks biomass-powered growth (trash recycling), electronics maintenance reduction, and electronics fabrication; energy growth scaling now doubles per stage (0.25 → 0.50 → 1.00).
- Random World Effects card now reinitializes after the Random subtab rebuilds so the effects list stays visible.
- Magnetic Shield research now hides on worlds with a natural magnetosphere.
- Patience now banks at 2 seconds per second per world from arrival, is claimed on terraform completion, continues earning until a 3-hour world cap, and the Patience UI shows a dedicated terraforming patience card.
- GHG factory automation now offers an avg T vs optical depth target selector, and optical depth mode ignores calcite while clearing it before building up GHG.
- Research cards now include per-item Hide/Unhide controls, and the completed toggle now shows or hides hidden entries.
- Workers now display percent of free workers in the resource rate slot.
- Atmospheric resource tooltips now estimate time to reach target pressure when below the minimum target.
- Oxygen and nitrogen now have phase-change cycles (like water/CO₂/methane/ammonia), enabling liquid/ice surface oxygen plus liquid/ice surface nitrogen (tracked via Inert Gas).
- Artificial world construction now supports prepaying costs; cost rows show prepaid amounts and the start button updates to Insufficient/Prepay/Start Construction based on remaining resources.
- Artificial world selection now locks after any prepay until the prepay is discarded or construction completes.
- Artificial world blueprint selections now persist across saves and planet travel.
- Heat capacity calculations now include all liquid surface resources via a shared liquid configuration list.
- Artificial world prepay now persists through selection changes; only the discard action clears it.
- Story effects now respect an `onTravel: false` flag during planet travel reapply, and Umbra 21.1 tab/subtab activation uses it to avoid forcing the UI on travel.
- Galactic Market cost/gain estimates now ignore productivity and use a fixed 1x rate.

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

## UI input pattern: string-backed numeric fields
When adding an input that should accept user strings (scientific notation/suffixes) but still display formatted numbers when not editing (like Galactic Market, space storage reserve, and Nanocolony energy allocation):
- Use `parseFlexibleNumber(value)` from `src/js/numbers.js` to convert the user’s text into a number.
- Use `wireStringNumberInput(input, { ... })` from `src/js/ui-utils.js`:
  - Provide `parseValue` that clamps/normalizes the parsed number for the specific feature (e.g., min 0, max 100).
  - Provide `formatValue` that returns a display string for the parsed value (often `formatNumber(value, true, 3)` for large values, otherwise `String(value)`).
  - In `onValue`, write the parsed value into the owning object’s state (do not continuously overwrite the input’s `.value` while editing).
- In the feature’s `updateUI`, only update `input.value` when the field is not focused (`document.activeElement !== input`), and set `input.dataset.<key>` to the parsed numeric string so other UI (like total-cost displays) can read the numeric value without reparsing.

## UI input pattern: step buttons (-1, +1, /10, x10)
These controls appear across structures, galaxy, and project panels. They share the same behavior:
- The -1/+1 buttons apply the current step to the target value (e.g., -step, +step). Label them with the active step size, such as `-5` and `+5`.
- The /10 and x10 buttons only adjust the step size. They must not change the target value. Clamp the step to the feature minimum (usually 1 for integers, or a feature-specific minimum for floats) and apply sane max limits.
- Store the step per item (per structure, sector, project, etc.) in the owning state or a cached map so each control remembers its last step. Default to 1 or the feature-specific default.
- Update the step button labels whenever the step changes, and use cached UI element references instead of new selectors.
- After applying a -/+ change, clamp the target value and refresh the UI so other dependent displays update consistently.

## UI input pattern: toggle switches
When adding an on/off toggle that should match automation styling:
- Use `createToggleButton({ onLabel, offLabel, isOn })` from `src/js/ui-utils.js` to build the button markup with the shared `.ui-toggle` styling.
- Call `setToggleButtonState(toggle, enabled)` when updating UI state; cache the returned toggle element for reuse.
- Disable the toggle with `toggle.disabled = true` when a feature is locked or unavailable.

## Nanotechnology
The `nanotechManager` oversees a self-replicating swarm unlocked by **Nanotechnology Stage I** research. The UI remains hidden until `enable()` is called.

- Swarm growth requires surplus power beyond storage; each bot draws 1e-11 W.
- Maximum nanobots equal planetary land area (m²) × 1e19, and only 1e15 bots survive travel.
- The growth slider adds up to +0.15 % growth. Stage I sliders modify growth while:
- **Silica Consumption** grants up to +0.15 % growth and consumes silica from current storage plus accumulated changes.
  - **Maintenance I** reduces metal, glass, and water maintenance by up to 50 % but subtracts up to 0.15 % growth.
  - **Glass Production** yields glass at 1e-20 t/s per bot and also subtracts up to 0.15 % growth.
- Per-second energy, silicon, maintenance, and glass rates appear beside each slider with brief descriptions.
- Silica and metal consumption now accept the same allocation limits as energy (percent of production or absolute cap), and they always consume at full intensity unless capped.
- When recycling is enabled, silica/metal caps use combined junk/scrap production, and artificial worlds clamp production-based caps to actual consumption rates.
- Glass and components output now require the same silica/metal provided that tick (including junk/scrap), so nanocolony output can never exceed the material consumed.
- Nanocolony recycling now includes Only Junk/Only Scrap toggles to restrict silica/metal consumption to recycled inputs, and allocation limit selectors include an uncapped option.
- Travel text notes that H.O.P.E. can hide 1e15 nanobots from the Dead Hand Protocol.

# UI refresh requirements
- **Starting a new game** – call `startNewGame()` which rebuilds game state.
- **Loading a save** – `loadGame()` invokes `initializeGameState({ skipStoryInitialization: true })` then applies the saved data.
- **Moving to another planet** – `selectPlanet(key)` switches the planet and
  calls `initializeGameState({ preserveManagers: true })` followed by `updateSpaceUI()`.
Failing to use these helpers may leave the DOM bound to outdated objects.
To ensure this works properly, every feature in the game that has an UI should have an enabled true/false attribute.  When updating its display, if the flag is true, the feature should be revealed.  If false, it should be hidden.  This flag should not be saved/loaded.  Instead, story unlocks, researches and other things will re enable it as needed.

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
- WGC operation logs are no longer saved into the savefile, so logs reset when loading to keep saves lean.
- WGC R&D adds Superalloy Fusion Efficiency, granting +1% Superalloy Fusion Reactor output per purchase (up to 9,900) once superalloy research is unlocked.
- WGC R&D purchases now support shift-click bulk buying with a tooltip hint beside the Purchase header.

## Space Mirror Facility
Space mirrors are overseen through sliders that distribute units across surface zones. Completing the Space Mirror Focusing research reveals an additional control that concentrates mirrors to melt surface ice into liquid water in the warmest zone with ice. The facility now handles zonal flux and melting calculations internally and the display shows both average and day temperatures for each zone. Column headers track the active Celsius or Kelvin setting so readouts stay consistent.

Rogue worlds display a Day-Night Period control in the Lantern Status section, allowing players to adjust the rotation period from 1 to 1000 hours. This control only appears when the world is rogue (starless) and Hyperion Lanterns are unlocked, enabling custom day-night cycles powered by artificial lighting.

Oversight now includes a collapsible **Finer Controls** section for manual mirror and Hyperion Lantern assignments with adjustable step sizes and per‑zone auto‑assign checkboxes that funnel leftover units into the selected zones while locking sliders or buttons accordingly. Slider totals are clamped so percentages always sum to 100 and the Unassigned slider keeps its width in sync with other controls when finer controls are enabled. The focusing slider carries an integrated reversal toggle to preserve layout, and reversal options only appear once Hyperion Lanterns are unlocked.

An advanced oversight mode prepares temperature and water targets, applies bisection to allocate mirrors and lanterns, and respects water melt targets when prioritizing zones. Reversed mirrors deduct flux while lanterns continue adding energy, and the luminosity tooltip explains the 6 µW/m² floor on outbound flux. Idle mirrors and lanterns contribute no flux because `calculateZoneSolarFluxWithFacility` now honours the Unassigned slider. A default‑on **Allow available to heat** checkbox beside Advanced Oversight lets any remaining mirrors or lanterns add warming when advanced controls need extra help to reach the target trend.

Once the Space Mirror Facility project completes, quick build buttons appear beneath mirror and lantern status cards to streamline construction. Manual slider edits, Any Zone assignments, and the reversible reflect mode all synchronise with advanced controls so assignments persist correctly across saves and travel.
Companion Mirror advanced research auto-completes the Space Mirror Facility project and grants 1,000 inactive space mirrors per terraformed world.
Focused melt now ignores mirror power on starless worlds, while lanterns can still concentrate heat.
- Ringworlds permanently disable the Space Mirror Facility and Planetary Thrusters projects, hide Space Mirrors and Hyperion Lanterns, and keep the Space Mirrors research from appearing there.

## Random World Generator
The Random World Generator manager builds procedural planets and moons with lockable orbit and type options. Worlds must equilibrate before travel; a progress window tracks simulated time and allows canceling or ending early once the minimum fast-forward is reached. Seeds encode UI selections so players can revisit specific worlds, and the manager prevents travel to terraformed seeds while persisting star luminosity and other parameters through saves. Traveling from a fully terraformed world to a random world awards a skill point on the first visit, and planetary thrusters on these worlds use the host star's mass for orbital calculations.

World archetypes now provide tangible bonuses: Titan-like planets shorten nitrogen harvesting, carbon worlds accelerate Carbon Asteroid Mining, icy moons hasten Ice and Water importation, Mars-like colonies gain a global 1 % population bonus, desert worlds boost ore production, desiccated deserts enhance sand quarries, ammonia-rich worlds grant a life design point, and Super-Earths reduce non-spaceship project duration by 1% each. Type dropdowns display friendly names matching these effects. Orbit presets include a new **Very Cold** range (10–100 W/m²), and completing Vega‑2 unlocks hot orbits along with a travel warning that must be acknowledged before departure. The generator logs visited seeds with their parameters and re-renders after travel to respect new locks or story progress.
The Random World Effects card can collapse to hide the bonus table when players need a cleaner view of other space systems.
- Random World Generator travel controls now include a Dominion selector (Human/Gabbagian/Fritizian/Oommaa) that applies the chosen terraforming requirement without affecting the seed (some dominions require fully controlled sectors to unlock).
- Terraforming liquid targets can now require multiple liquids (Oommaa: 50% water + 50% liquid CO2), and the terraforming Water box shows the extra liquid coverage readouts and targets.
- Galaxy sector panels now include a tooltip on "Restrict RWG here" to explain that Random World Generator results stay in the selected sector.

When adding new generation to the Random World Generator, place the new generation at the end.  This is to ensure older seeds are still compatible.

## Artificial worlds
- ArtificialManager powers the Space > Artificial subtab, letting players pick shell/ring/disk archetypes (future-ready), core type, star context, and radius within per-core bounds; it seeds a star/flux when allowed.
- Ringworlds are now implemented behind `ArtificialManager.enableRingworld()`: they use a star-core selector (M/K unlocked by default), an orbital radius slider (AU), and a width slider (km). Ring construction currently costs **only superalloys** (shellworld scaling for now) and applies a ringworld-specific spaceship energy multiplier of 0.1 (1000 energy/ton) plus an added per-ton spin fee based on current gravity.
- Ringworlds unlock a dedicated Ringworld Terraforming Protocol infrastructure project that tracks energy investment for spin-up with a sustained energy draw.
- Ringworld Terraforming Protocol now derives spin energy requirements from total ringworld mass (construction cost + surface/atmosphere/colony tons), displays the mass, and credits partial investment when mass increases mid-spin.
- Ringworld Terraforming Protocol applies a low-gravity lock below 0.1g that pauses terraforming resource updates and life growth until spin-up completes enough gravity.
- While the low-gravity lock is active, surface temperature uses zero optical depth (no greenhouse), but GHG automation still simulates real optical depth for trend solving.
- Shellworld costs scale with radius³ from a 50B ha calibration and can pull payments from space storage first; launch stashes for metal/silicon cap at land area (1 per ha) and support Solis Bailout injections.
- Build time scales with terraformed world count, hard-blocks any project that would exceed five hours, and the duration tooltip explains the limit.
- The radius input now includes an Auto button that snaps to a 5-hour construction time to hit the maximum allowed build duration.
- Completed builds can be traveled to or discarded; construction history, progress bar, and sector auto-fill persist across sessions with terraformed-world value based on land/50B (min 1).
- Artificial world names can be edited during construction or while ready for travel, and the active project updates immediately.
- Constructed artificial worlds list now includes inline rename controls for stored entries.
- Default labels and placeholders use the neutral “artificial world” terminology rather than “shellworld” to cover current and future constructs.
- Leaving unfinished artificial worlds now records an Abandoned status with a resume Travel button plus enough snapshot data (including initial metal/silicon stockpiles) to rebuild their override on return.
- Traveling from an artificial world to a story world is allowed even before terraforming the artificial world.
- Artificial sector selection now sorts alphabetically and shows rich/poor resource bonuses in the dropdown.
- Ringworlds now disable the Space Elevator research and inherit its completion effects as permanent world effects.
- Artificial world default names now auto-number by type (Shellworld N / Ringworld N), ignoring discarded builds.

# Story and System Utilities
Story delivery gained a `system-pop-up` event type for immediate alerts, and Save & Settings now includes a Statistics panel that tracks total playtime across every planet. Designers can accelerate local testing with the `setGameSpeed` console command while Vega‑2 travel triggers a confirmation warning before the trip begins. Story projects are locked to their intended worlds and journal reconstruction fills in `$WGC_TEAM_LEADER$` placeholders when loading saves so narrative logs stay accurate. Journal reconstruction also restores story project step entries for completed chapters even if the live project state has moved on.

# Automation and Interface Enhancements
Buildings and special project cards feature collapsible headers, letting players hide cost and automation details when managing crowded screens. Structures include a persistent **Set active to target** checkbox, autobuild constructs them inactive by default, and enabling autobuild can auto-toggle target matching so queues fill without immediately raising active counts. The Settings view now uses a three-column layout, the Colony tab separates structure lists from sliders, and nanocolony controls sit directly beneath the primary colony panel. Manual toggles clear auto-targeting, storage capacity displays scale with the selected build quantity, and land usage recalculations on load keep construction requirements honest. Autobuild priorities and auto-active settings persist when travelling between planets so colony automation resumes seamlessly.
Autobuild now includes a Fixed target mode with formatted numeric input, and building automation presets/save data retain the fixed target value.
Autobuild now supports a % worker share mode for worker-requiring buildings, translating a worker allocation percentage into an equivalent target count.
Buildings automation now supports saving control/autobuild presets and applying them in a prioritized list, letting lower entries override higher presets per building and setting type.
Buildings automation now offers a "Combination on Next Travel" dropdown that applies the selected combination after travel.
Life Designer automation steps now support a **Max out** mode to spend all available points on the selected attribute in one pass.
Life automation now offers an **As needed** mode for minimum/maximum temperature tolerance with selectable zones (defaulting to tropical, temperate, and polar), and it can redeploy when freed tolerance points exceed the improve threshold.
Ship assignment automation steps now include a **Capped by largest max** limit mode alongside the smallest-cap option.
Underworld deep mining options now use reusable toggle switches in a two-column layout once depth unlocks.
Kessler-affected buildings now surface a warning under their headers showing the extra cost multiplier that generates debris.
Autobuild now respects sand availability, preventing Sand Harvesters from being constructed on worlds without sand.

The journal now features an index toggle beside its header, presenting a dedicated Primary Directive section with the three directives listed inline plus collapsible world-by-world chapter lists that jump straight to any unlocked entry.

Interface code caches frequently accessed DOM nodes—including research lists, lifeform editors, colony need boxes, automation panels, resource-selection grids, and Random World tabs—to reduce reflows when data changes. Production and consumption displays now reuse their existing nodes instead of rebuilding markup each tick. Subtabs remember their scroll positions (including special project subpanels), the broader UI can request a one-time forced render, and project automation settings refresh their cached children when options appear or disappear. Resource panels gained configurable margins, collapse toggles adopt triangle icons, and both colony and nanocolony sliders share consistent styling.

Solis storefront updates highlight new research-point offerings, mark completed upgrades as “Purchased,” and hide cost buttons once limits are reached. The advanced oversight upgrade now sits with other research improvements once `solisUpgrade1` is unlocked, ensuring related perks stay together.

# Resource Displays and Inputs
Resource presentation emphasises clarity: production entries turn green when they resolve deficits, risky consumption appears orange, and separator lines draw within custom margins. `reinitializeDisplayElements` pulls defaults from `defaultPlanetParameters` so travel resets names, spacing, and tooltips consistently. Tooltips lead with total production and consumption, include water overflow sections, and present net change lines that optionally incorporate autobuild costs. They collapse into three columns when tall, pause updates while not hovered, and list colonist-supplied workers separately. Luminosity panels now break out ground versus surface albedo, forward aerosol mass into temperature models, and document the Cloud & Haze penalty applied to solar flux. Additional panels explain albedo contributors, show average solar flux alongside day values, and track actual albedo by zone. Day-night cycle duration now derives from each planet's rotation period so averages stay accurate.
Spaceship resource tooltips now list total ships and break out per-project assignments so fleet usage is visible at a glance.

Inputs across the space layer support scientific notation for strategic reserves and nanobot energy limits, while advanced oversight melt targets include k/M/B dropdowns. Space storage tooltips separate transfer versus expansion costs, continuous modes display per-second totals, and water withdrawals can target colony stores or surface reserves. GHG factory controls accept decimal values without overwriting user edits, and their UI—along with oxygen factory pressure controls—now lives inside the respective building subclasses. Life growth tooltips reflect ecumenopolis land coverage, interpolate growth and decay across a ±0.5 K band, and display warnings or red biomass markers whenever ecosystems slip into net loss.
Galactic Market selections now render as left/right grids so sell details stay grouped while controls and buy inputs live in a separate column stack that wraps beneath on narrow screens.

# Space Logistics and Projects
Cargo rockets share unified 0/±1, ÷10, ×10 controls with a global increment selector, persist their increment count across sessions, and remember auto-start cargo choices. Ship price increases and strategic multipliers survive saves, while continuous mode only runs when explicitly toggled on. Space storage records ship-assignment multipliers, clarifies mega-project respect for strategic reserves, and exposes a tooltip explaining scientific notation. Export interfaces report assigned ships, provide stable max-capacity tooltips with info icons, and gate automation behind resource and environmental checks that pause or resume projects as conditions change. Project subclasses own their save/load routines, sustain costs appear as dedicated project consumption, and ongoing jobs validate resource availability one second ahead to prevent mid-tick stalls.

Dyson Swarm management shows collector costs on the project card, continues progress visuals after completion, and feeds generated energy directly into the colony. Receiver projects can finish instantly once unlocked, the solar collector interface stays hidden until the receiver is operational, and collector durations scale with terraformed planet counts. Satellite dashboards split deposits from amounts, add an Auto Max control tied to colonist capacity, and ore/geothermal satellites now scale with worker cap. Planetary thrusters track energy spent, persist configuration, and show escape Δv for moons. ProjectManager applies gains every tick through `applyCostAndGain`, while spaceship projects switch to per-ship continuous flow above 100 craft so large fleets consume and produce smoothly. Project productivity readouts emphasise continuous operations, compute duration multipliers on demand, and keep automation reactive to environment-based pauses.
Continuous metal and silicon asteroid mining converts 25% of mined output into Kessler debris.

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
- Added a setting to uncheck colony autobuild when auto-upgrade is enabled.
- Planet visualizer now shows a sun on rogue worlds, scaling size/illumination with modified solar flux (hidden below 0.01, capped at 3x).
- Ringworlds now render in the planet visualizer as an interior band view aligned to their single tropical zone.
- Ringworld visualizer lighting now originates from the ring center and uses higher-resolution textures for crisper interior bands.
- Ringworld surface noise now wraps periodically around the ring to remove seam artifacts.
- Ringworld clouds now render as an interior band so cloud cover is visible inside the ring.
- Ringworld clouds now use periodic 2D noise so they sit evenly across the ring band.
- Ringworld cloud textures now render at higher resolution with a tighter edge fade.
- Magnetosphere panel now shows 0% radiation penalty when a natural or artificial shield is present.
- Galactic Market ignores project productivity when applying cost and gains so trades always run at base rate.
- O'Neill Cylinders now fires a one-time Space tab and Story subtab alert via a TabManager effect.
- Graphite is now a surface resource (hidden when small), and Bosch Reaction produces it alongside water.
- Graphene Mastery advanced research unlocks the Graphene Factory research and building to convert graphite into metal substitutes.
- Resource productivity now iterates multiple passes per tick so upstream shortages propagate through production chains.
- Space mining pressure limits now add same-tick life consumption estimates so imports still hit their targets after life runs.
- Tartarus chapter 32.1 now unlocks Underworld mining upgrades for Deeper Mining, adding superalloy drills for speed/max depth plus a Supercharged Mining slider that boosts ore output while cubing energy use.
- Solis now offers a permanent Android Manufacturing research unlock and a Buildings Automation upgrade gated by the Tartarus 30.4 story flags.
- Tartarus chapter 30.4 now grants Solis flags for permanent Android research and Buildings Automation, and a new tartarus.30.4b placeholder chapter sits between 30.4 and 30.5.
- Buildings Automation presets now apply on demand via the Preset Combination button instead of running continuously.
- Fusion Power Plants can upgrade 10:1 into Superalloy Fusion Reactors at half cost (superalloys paid in full), with manual and auto-upgrade controls.
- Buildings Automation now supports named preset combinations that save and restore the apply list.
- Buildings Automation now applies preset control/automation settings even while a building is hidden or locked, so settings are ready once it unlocks.
- Buildings Automation now supports applying presets automatically after the next planet travel via a dedicated checkbox.
- Random World Generator dominion selection now includes a Random option that rolls a requirement on travel.
- Foundry Worlds advanced research unlocks a new mega project with a shared specialized-worlds switcher and travel points tied to deeper mining depth.
- Foundry World shop upgrades now boost metal and silica import caps, ore and silica mining output, and deeper mining speed.
- Foundry World shops now include Galactic Everything Else to boost water/ice, carbon, and nitrogen import caps.
- Foundry World metal cap bonuses now scale by sqrt(initial land / 50B), matching metallurgy point gains.
- Foundry worlds now add +100B to the metal mining cap per completed world, excluding the current planet, and permanently disable new Ecumenopolis districts after completion.
- Foundry World metallurgy travel points now award 10 points times sqrt(initial land / 50B).
- Bioworld and Foundry World mega projects now require the current world to be fully terraformed before starting.
- Projects now expose an apply-effects hook so project-specific bonuses can be re-applied in a single pass after load or travel.
- Departure snapshots now record world specialization across story, random, and artificial worlds.
- Android Housing productivity now scales with used android storage after subtracting free and Solis-granted base capacity.
- Ecumenopolis District productivity now uses the higher of colonist or android fill ratios, with android housing capacity taking priority over ecumenopolis storage.
- Deeper Mining now includes deep mining settings (depth > 500) with two configurable options:
  - **Create geothermal deposits**: Generates geothermal deposits (default 1000 per mine per 250m level beyond 500m) when enabled during deepening. Tradeoff: doubles components cost.
  - **Underground Storage**: Provides storage capacity equivalent to storage depots (default 1 per mine per 250m level beyond 500m) without maintenance cost. Tradeoff: deepening time is slowed by 2x.
  - Both settings are disabled/greyed out until depth reaches 500m and their gain rates are configurable via `geothermalDepositsPerMinePerLevel` and `storageDepotsPerMinePerLevel` in project config.
- Random World Generator adds the Chthonian archetype with the effect label "Suffering Enjoyment."
- Biodome consumption/production now mirrors the active life metabolism equation, with water inputs pulled from colony water.
- Biodome life design points now scale with worker availability while still ignoring other productivity shortages.
- Space Elevator, Planetary Thrusters, and Mega Heat Sink are disabled while Kessler debris remains, showing "Disabled by Kessler" on their progress bars until the debris clears.
- Spaceship projects and satellites now show Kessler failure risk warnings with live failure percentages based on their project size.
- Continuous spaceship operations now add Kessler debris for fractional ship losses.
- Resource Disposal now isolates Kessler risk to spaceship capacity only, letting mass drivers contribute without failure or debris.
- Kessler building cost multipliers now cap at 1e10.
- Atmospheric density calculations now clamp gravity to a minimum of 0.2g.
- Project productivity now uses available storage plus production only (no consumption offsets), matching building productivity calculations.
- Project and building productivity now share a resource availability ratio precomputed each tick from overall production/consumption rates.
- Kessler debris decay now uses the max-since-zero bin mass for decay at or below the drag line while higher orbits keep exponential decay on current mass.
- Kessler hazard bin hover text now includes per-bin decay rate and atmospheric density alongside debris amounts.
- Space storage resources now support per-resource caps set via gear settings (amount or % of max), display amount/cap values, and ship transfers honor the caps across saves and travel.
- Specialized world project cards now swap their header title to a dropdown when multiple transformations are available.
- Space storage cap menus now include a delete-over-cap action to clamp stored resources to the configured cap.
- Added a Laser Cannon energy research gated by Tartarus 32.2 and active Kessler hazard conditions, unlocking a waste-category Laser Cannon that consumes research and energy to clear orbital debris from the lowest periapsis bins.
- Added an Engineered Nitrogen Fixation research that doubles life growth at 10 kPa of nitrogen pressure.
- Gabbag chapter 29.8 now unlocks ammonia visibility and new chemical reactor recipes for Haber-Bosch and ammonia combustion.
- Added an ammonia resource with liquid/ice/gas cycles and updated terraforming physics to include its phase changes.
- Random World Generator dominion selection now includes the Fritizian option tied to ammonia requirements.
- Random World Generator dominions now include lore blurbs with a dedicated Lore window beside the dominion selector.
- Fritizian dominion unlocks once the galaxy has 5 fully controlled sectors, and the RWG dropdown shows the requirement while locked.
- RWG dominion requirements now read from terraforming requirement metadata so new dominions can define their own unlock rules.
- Completing terraforming now awards alien artifacts once per non-Human dominion, scaling across dominions at 500 per completion (Human and Gabbagian are excluded).
- Original world properties no longer show the dominion selector or lore display.
- Added an ammonia-based terraforming requirement with NH3/H2 atmosphere targets, high luminosity range, and an ammonia photosynthesis metabolism profile.
- Pretravel save capture now reuses the departure snapshot during planet travel so the pretravel slot keeps the departing planet key.
- Added a Settings checkbox to keep the tab active by playing a looped near-silent audio track.
- Added a setting to switch to scientific notation above a user-defined threshold (default 1e30).
- Added a muted looping silent audio track to keep the tab active for testing purposes.
- Replaced the silent keep-tab-running track with the new `assets/white_noise/weak_white_noise_-60dBFS_60s_22k.wav` loop (with the old data URI as a fallback) so Chrome/Edge can keep the tab alive.
- Waste processing buildings now snap their productivity to trend values instead of easing in.
- Waste processing resource displays now ignore waste input shortages while still respecting staffing and power limits.
- Added an Industrial Waste Processing research gated by the Gabbag chapter 29.8 flag that unlocks all waste buildings and enables scrap metal and junk.
- Added a Waste Workforce Automation research that reduces waste building worker requirements by 20% for 200k research points once the Gabbag waste processing flag is set.
- Terraforming Bureau now unlocks dust factory automation that targets rock albedo and clamps production or reversal at the desired mix.
- Projects can opt out of showing their cost/gain in the resource rate panel, with Orbital Ring hidden by default.
- Storage depot, water tank, and battery autobuild now use a % filled threshold (default 95%) to add storage when the most filled resource runs high.
- Storage depot fill mode adds primary/secondary resource selectors so players can target specific storage types.
- GHG/calcite factory automation now caps solver output so targets cannot be reached in under a second and reuses each solver result for one second.
- Hydrology surface flow now freezes liquid that enters sub-freezing zones, converting it to surface ice (FreezeOut) and reporting a dedicated **Freeze Out** resource rate entry.
- Added Umbra story planet orbiting Nyx-13 with new post-Venus chapters and progression rewards.
- Added a Dyson Sphere giga project with a persistent frame, 100x faster collector deployment, and a Giga subtab alongside mega projects.
- Dyson Swarm/Sphere collectors and Space Storage expansion now show an expansion-per-second readout in their UI.
- Kessler debris decay now uses exponential decay of the current debris mass instead of the initial baseline.
- Continuous expansion ticks for Dyson Swarm/Sphere collectors, Space Storage, and Lifters now require the full base expansion cost to be available.
- Artificial shellworld stockpiles now cap metal and silicon at 1 unit per hectare and surface the limit via tooltip.
- Added a Solis Bailout option on artificial shellworlds that trades 10 alien artifacts for 100M metal and silicon, bypassing stash caps.
- Traveling to an artificial world now warns if you depart without staging metal or silicon in the stockpile.
- Artificial stockpile controls gained a +Max button to fill remaining capacity in one click.
- Biostorage research now enables storing and withdrawing biomass through space storage with zonal-aware transfers.
- Refined the Nanocolony card with summary tiles and slider panels so growth, limits, and slider effects are easier to read without changing the neutral palette.
- Nanocolony energy allocation input now accepts flexible numeric strings (including 1e3/1M), formats when leaving the field, and defaults absolute mode to 1M W.
- Oxygen Factory now supports selectable recipes, including an energy-only Silicates -> Oxygen mode.
- Warp Gate Command edit member dialog now includes a Respec button that refunds all allocated skill points for rapid reassignment.
- Warp Gate Command skill editor gained an Auto assignment column that distributes points each tick according to player-provided ratios, updates live while the dialog is open, and ignores zero entries.
- Warp Gate Command difficulty changes made during an operation now apply to the next operation instead of the active run.
- High-gravity adaptation advanced research now automatically halves high-gravity happiness and population penalties, stacking with Mechanical Assistance to remove them entirely; Biostorage and Dyson Sphere remain placeholders at 4M/5M advanced research points.
- Warp Gate Command recruitment dialog now auto-rolls names for new members and adds a Roll button beside the name inputs, drawing from 100-name first/last pools.
- Warp Gate Command operations now assign solo athletics events to the most athletic member and adjust failure damage for power and wit challenges.
- Team athletics operations now ease the next challenge after a success or delay it after a failure, while team wits outcomes modify the next artifact payout.
- Hazardous Biomass stances gained a Recon option and artifact stances gained Rapid Extraction, adjusting event pacing, weights, and artifact odds.
- Hazardous biomass growth now applies per-zone penalties, the Zone Growth summary uses a dedicated table, Preferred Terrain shows the active preference with a tooltip explaining penalty math, and radiation defaults now use mSv/day across hazard systems.
- Garbage hazard UI now mirrors hazardous biomass styling with cleanup summaries, progress bars, and per-stream penalty readouts.
- Life growth now reallocates up to 1 ton of growth into zones under 1 ton of biomass when those zones can support growth, seeding them without changing total growth.
- Garbage hazard penalties now permanently clear once every stream reaches zero, keeping the hazard cleared even if garbage returns.
- Split hazard logic and UI into per-hazard modules so adding more hazards stays maintainable.
- Kessler Skies can now cause eligible space projects to fail after the first second, converting half of their non-energy cost into orbital debris.
- Kessler Skies now affects spaceship projects, scaling continuous gains by success chance and turning failed shipments plus lost ships into orbital debris.
- Added Solis Prime deep drilling and antimatter drilling story projects with three 10-minute steps gating chapter progress.
- Added a Solis Prime Beach Construction story project after chapter 26 that requires heavy silicon and water before the final terraforming objective.
- Wrapped up the Solis Prime contract with a final chapter that awards a 1.25x fleet capacity bonus.
- Finishing Solis Prime now unlocks starless Rogue random worlds; each terraformed Rogue divides Space Mirror and Hyperion Lantern build costs by 1 + 0.2 per world.
- Crusader Response now offers an Any/zone focus selector so crusaders prioritize the chosen zone before spreading the remaining cleanup.
- Added `wgc_operation_gen/wgc_gen.py` to generate validated 10-step Stargate-inspired Warp Gate Command micro stories (captured as arrays of newline-delimited strings) and append them to `wgc_operation_gen/generated/operation_stories.js`.
- Warp Gate Command operations now draw their ten-step event queues from `assets/wgc_ops/operation_stories.js` and log each story line before the existing roll summaries so the narrative plays out alongside the results.
- Autobuild options for Solar Panels and Wind Turbines now include the Max target mode.
- Unified zonal surface storage into a single `zonalSurface` map keyed by resource type, with legacy zonal data folded in during initialization and load.
- Wind mixing now applies a weighted three-zone blend per tick instead of pairwise passes for smoother temperature equalization.
- Warp Gate Command Teams card gained a Hide Story toggle that suppresses narrative log entries when enabled and remembers the setting between sessions.
- Warp Gate Command Teams header now includes a clipboard button that copies every team's roster, stats, and health to JSON on click.
- Editing a Warp Gate Command member now spends stat points immediately while Cancel restores the original stats to avoid conflicts with Auto allocation.
- Added Methane and Ammonia Lifting advanced research to unlock methane/ammonia space storage and lifter harvest recipes at 1/100 output.
- More Life Design Points now increases point shop and biodome gains by 20% per rank in addition to the flat bonus.
- Default planet resource definitions now live in `src/js/planet-resource-parameters.js`, and `src/js/planet-parameters.js` pulls from that file.
- Team Wits challenges now treat Natural and Social Scientists as contributing 1.5x Wit, with tooltips updated to explain the new bonus.
- Centralized terraforming gravity helpers in `src/js/terraforming/gravity.js` so apparent gravity and penalties reuse the same calculations.
- Galaxy factions now accumulate an irreversible UHF doctrine adaptation multiplier that scales with rising UHF threat and stacks with electronics adoption.
- Added Life Automation presets that auto-buy life design points by resource thresholds and auto-deploy improved designs once survivable.
- Life Automation now has a dedicated Solis upgrade and supports negative optimal growth temperature assignments.
- Life Automation presets can generate steps from the current design (metabolism last with remaining), enable auto purchase and auto design independently, and reorder auto-design steps, and the Solis unlock is now rewarded at gabbag.27.6.
- Split automation UI rendering into shared helpers plus dedicated ship and life UI modules.
- Added a `permanentProjectDisable` effect that removes projects from the UI and project manager updates when triggered.
- Added a Mega Particle Accelerator advanced research that unlocks an infinitely repeatable Particle Accelerator megaproject.
- Added a Surface Food Production research that lets surface biomass passively produce food once unlocked.
- Added a Next-generation bio-engineering advanced research that lets advanced research permanently fund life design points across planet travel.
- Self-replicating ships now scale their replication base from the metal import cap minus assigned metal import ships, with no hard cap on total replication.
- Galaxy sector details now highlight rich resources in green and poor resources in red.
- Colony consumption no longer generates garbage, junk, or scrap metal production.
- Continuous import/export projects can run in building-style mode at continuous ship counts, feeding productivity calculations and showing their productivity in the Continuous status label.
- Random World Generator honours per-archetype orbit lock lists, keeping Venus-like worlds in the hot band while preserving their sulfuric haze and parched atmosphere.
- Space Story subtab now mirrors the Random World Generator styling with card-based world summaries, highlighted travel states, and an inline warning pill for unfinished terraforming.
- Added a Space Story statistics panel that shows unique versus effective terraformed worlds with detailed tooltips explaining their calculations and gameplay effects.
- Introduced an O'Neill Cylinders advanced research that grows orbital habitats from effective worlds, adds their total to effective terraformed worlds, and reveals a dedicated stat column in the Space tab when unlocked.
- Made the Bioworkforce (bioworkers) conversion factor configurable per terraforming requirement via `lifeDesign.bioworkersPerBiomassPerPoint`.
- High-gravity worlds now apply compounded building and colony cost multipliers, and the Terraforming Others panel shows the current gravity alongside any active gravity penalty.
- Bioworlds advanced research now unlocks the Bioworld mega project, awarding evolution points on travel and a persistent evolution shop for life designer upgrades.
- Autobuild now highlights resources that stalled construction with an orange exclamation mark in the resource list.
- Space Mirror Facility sliders now rebalance more naturally: decreasing a zone returns share to **Any Zone** (not Unassigned), and increasing **Any Zone** reclaims Unassigned/focus allocations before reducing zonal shares.
- Added a Round building construction setting that rounds manual building and colony construction up to the selected build count increment while updating cost previews.
- Autobuild now tracks a prioritized reserve that protects resources earmarked for priority construction targets.
- Random World Generator hazard selection now uses a Hazards toggle with per-hazard checkboxes, encodes multi-hazard seeds, and unlocks the garbage hazard after Gabbag.
- Random World Generator now allows the Tartarus Kessler Skies hazard once it is unlocked.
- Metropolis and Ecumenopolis autobuild controls now include a Max option to push construction to the limit.
- Added a fullscreen loading overlay that displays while the game or a save file is loading.
- Added a setting to keep hidden buildings when travelling between worlds; it is off by default so hidden structures reappear unless enabled.
- Added a Gabbag Museum Construction story project to support the museum build after chapter 28.
- Milestones subtab remains hidden until Terraforming measurements research is completed.
- Added a Mass Driver building that is locked by default and costs ten times an oxygen factory.
- Import Colonists project now supports importing Crusaders when the crusaderImportEnabled flag is active.
- Added a hydrogen import special project mirroring nitrogen harvesting to gather atmospheric hydrogen when unlocked.
- Added the Kessler Skies hazard on Tartarus, spawning orbital debris per land and throttling Solis travel drops (surface water spillover plus 1,000-unit caps on other supplies).
- Kessler Skies now displays an orbital debris hazard bar and permanently clears once debris hits zero.
- Kessler Skies hazard UI now includes an Effects list starting with the Solis resource delivery limits.
- Kessler Skies now caps Galactic Market trade totals to 100 per second and Cargo Rocket payload totals to 100 × duration while active.
- Galactic Market and Cargo Rocket UIs now clamp over-limit selections under Kessler Skies and show a warning banner.
- Kessler Skies now reports small/large space project failure chances based on orbital debris density.
- Kessler Skies now tracks debris periapsis distributions and decays debris below the exobase faster the deeper it falls.
- Orbital debris is now a special resource and Kessler decay reports as a resource rate.
- Kessler Skies now renders a 64-bin debris histogram with an exobase marker, gaussian binning, and per-bar red shells that fill up from the bottom as blue when debris clears.
- Kessler Skies now inflates Space Mirror/Hyperion Lantern/Dyson Receiver build costs by success chance and converts half the extra (non-energy) cost into orbital debris distributed across current bins.
- Exosphere height calculation now lives in its own utility module and is cached each terraforming tick.
- Exobase temperature now blends surface and exosphere heating based on atmospheric column mass to keep thin atmospheres from inflating the exobase.
- Introduced Mass Driver Foundations research to unlock the launcher network and surface disposal integration once the massDriverUnlocked flag is earned.
- Resource disposal treats each active Mass Driver as a configurable number of spaceship equivalents (default 10) when calculating throughput.
- Added a Bosch Reactor building that performs the Bosch reaction once research gated by the boschReactorUnlocked flag is completed.
- Chemical Reactors now support multiple selectable recipes, including Bosch water synthesis, direct hydrogen-oxygen combination, and Sabatier methane production.
- Chemical Reactor automation now allows disabling reactors based on configurable input/output resource thresholds once the Terraforming Bureau is active.
- Planet visualizer debug sliders are hidden by default; use the `debug_mode(true)` console command to reveal them, and the setting persists in save files.
- Planet ice rendering now grows from either the poles or the tropics based on zonal coverage, blending smoothly with water-style noise for organic transitions.
- Autobuild now tracks a prioritized reserve that protects resources earmarked for priority construction targets.
- Added a fullscreen loading overlay that displays while the game or a save file is loading.
- Milestones subtab remains hidden until Terraforming measurements research is completed.
- Added a Mass Driver building that is locked by default and costs ten times an oxygen factory.
- Added a hydrogen import special project mirroring nitrogen harvesting to gather atmospheric hydrogen when unlocked.
- Introduced Mass Driver Foundations research to unlock the launcher network and surface disposal integration once the massDriverUnlocked flag is earned.
- Resource disposal treats each active Mass Driver as a configurable number of spaceship equivalents (default 10) when calculating throughput.
- Added a Bosch Reactor building that performs the Bosch reaction once research gated by the boschReactorUnlocked flag is completed.
- Chemical Reactors now support multiple selectable recipes, including Bosch water synthesis, direct hydrogen-oxygen combination, and Sabatier methane production.
- Planet visualizer debug sliders are hidden by default; use the `debug_mode(true)` console command to reveal them, and the setting persists in save files.
- Planet ice rendering now grows from either the poles or the tropics based on zonal coverage, blending smoothly with water-style noise for organic transitions.
- Solis Upgrade Two unlocks a Solis shop option to pre-purchase starting cargo ships for 100 points each.
- Added an Automation Upgrades Solis shop that offers an Auto Research purchase enabling automatic research assignment.
- The solisAutoResearch story flag now reveals the Automation Upgrades shop so the Auto Research purchase appears when unlocked.
- Added an Automation manager and HOPE Automation tab unlocked via the Solis Ship Assignment upgrade from Umbra chapter 23.4; purchasing it enables ship-assignment automation.
- Added spaceship automation presets with weighted step-based assignments, project exclusion toggles, and manual control locking while active.
- Oxygen factories now vent hydrogen alongside oxygen to reflect electrolysis byproducts.
- Colony research tiers two through six now grant aerostat colonies +10 comfort each via a new `addComfort` effect type.
- Adrien Solis now offers a permanent Terraforming measurements research unlock in his shop once chapter 18.4d is completed.
- Introduced an Antimatter Battery structure that stores a quadrillion units of energy for 1000 metal and 100 superconductors.
- Antimatter Battery now offers a Fill action that converts antimatter into stored energy at the same rate produced by antimatter farms.
- Added an Antimatter Farm energy building that converts 2 quadrillion energy into the new locked Antimatter special resource.
- Building and colony consumption now derive from a shared `getConsumption` helper so effect-driven upkeep is computed dynamica
  lly without mutating base data.
- Introduced a Water Tank storage structure that specializes in water capacity, includes an Empty action to dump reserves onto the surface, and moved water capacity off the general Storage Depot.
- Antimatter is now produced automatically based on terraformed worlds and capped at ten hours of output.
- Antimatter stockpiles now persist when travelling between planets, matching alien artifact preservation.
- Planetary Thrusters motion controls now include a Go Rogue button that unlocks at 10000 AU to strip the star, flag the world as rogue, and remove the thrusters project.
- Introduced a Galactic Market Concordat advanced research that unlocks the Galactic Market project while permanently retiring cargo rockets and metal exports.
- Space storage now supports silicon and hydrogen stockpiles.
- Space storage transfer controls now support per-resource store/withdraw toggles plus a Mixed mode that splits shipments.
- Forbidden-melt rapid sublimation now blends linearly over 1 Pa near the triple pressure threshold instead of switching instantly.
- UHF fleet auto-defense now applies leftover power to border sectors and counts toward map and sector effective defense totals.
- Import resource assignments now honor an import cap manager that scales from 1B/10B caps to per-sector limits (with rich/poor modifiers) once the galaxy unlocks, and the Import Resources card includes a collapsible cap breakdown.
- Added Warp Gate Fabrication advanced research to grow per-sector Warp Gate Network levels from terraformed worlds, surfacing a Sector Management progress bar and scaling import caps with network level while showing per-project cap totals beside assignment.
- Kessler debris decay now scales with atmospheric density per periapsis bin, and the hazard UI tracks the drag threshold by density instead of exobase height.
- Kessler hazard charts now include an atmospheric density gradient strip aligned to debris bins.
- Kessler debris generation now centers its gaussian on the 0.1 pkg/m^3 altitude with 1 pkg/m^3 at one sigma.
- Kessler debris bins now span from altitude 0 to the gaussian tail so chart bins stay aligned.

## Feature updates
- Autobuild basis drop-downs now include a Max option for ore mines, geothermal generators, and Dyson Swarm receivers so they chase the highest buildable count without relying on percentage targets.
- Added a silicon asteroid mining special project alongside metal extraction.
- Silica asteroid mining now requires the siliconMiningUnlocked research flag granted by story effects before Shipbuilding can enable it.
- Auto research now offers a P1–P4 priority selector beside each checkbox, saved across travel and saves to break ties when multiple researches qualify at once.

- Added a Galaxy subtab beneath Space, unlocked in Venus chapter 20.13 with a persistent GalaxyManager and placeholder UI.
- Galaxy sectors now track faction control through dedicated GalaxyFaction and GalaxySector classes, coloring the map by the dominant controller.
- Building and colony consumption now derive from a shared `getConsumption` helper so effect-driven upkeep is computed dynamica
  lly without mutating base data.
- Introduced a Water Tank storage structure that specializes in water capacity, includes an Empty action to dump reserves onto the surface, and moved water capacity off the general Storage Depot.
- Added a Galaxy subtab beneath Space, unlocked in Venus chapter 20.13 with a persistent GalaxyManager and placeholder UI.
- Galaxy sectors now track faction control through dedicated GalaxyFaction and GalaxySector classes, coloring the map by the dominant controller.
- Galaxy sector panels now show the selected sector name alongside a descending list of faction control shares.
- Added a Galaxy subtab beneath Space, unlocked in Venus chapter 20.13 with a persistent GalaxyManager and placeholder UI.
- Galaxy sectors now track faction control through dedicated GalaxyFaction and GalaxySector classes, coloring the map by the dominant controller.
- Galaxy map hexes now display zebra stripes combining the top two factions, scaling stripe width with the runner-up's control share.
- Galaxy hex visuals now refresh at most once per second so the map no longer re-renders every tick.
- Galaxy factions now track fleet capacity and power, with the UHF scaling from terraformed worlds and other factions drawing capacity from sector control.
- The Galaxy Upgrades pane now hosts a Fleet Logistics Shop where players invest advanced research, Solis points, alien artifacts, or skill points for stacking fleet capacity multipliers.
- Galaxy faction control caches only rebuild when sector ownership changes, and the galaxy map now displays shield badges on UHF sectors plus skull badges on contested or bordering alien sectors with sector power folded into each total.
- Sector details gained a Sector Management block (shown only when the UHF has control) summarising worlds, fleet defense, and combined strength alongside an Enemy Strength section that breaks out sector and fleet contributions to match the skull badge total.
- Logistics & Statistics now reports UHF threat coverage and lifetime successful operations with a placeholder tooltip while final copy is pending.
- Manual spaceship assignments can borrow ships from the active auto-assigned project when available, without disabling automation.
- Celestial parameters now store a galaxy sector identifier, and random worlds roll a sector assignment that appears when the Galaxy Manager is active.
- Galaxy sector base power values are configurable via `sector-parameters.js`, including a 1000 power core sector override.
- Boosted base power to 10000 for sectors R5-29, R5-19, R4-13, R4-09, and R6-05, and set their adjacent sectors to 2000 to reinforce nearby defenses.
- AI-controlled galaxy factions now stockpile surplus strength above a defensiveness threshold and launch randomized 5–15% capacity operations every minute once the reserve is met, still prioritizing contested or neighboring enemy sectors.
- UHF fleet defense now divides available border strength evenly instead of weighting distribution by threat levels.
- Galaxy operations now feature an Auto launch toggle beside the Launch button that automatically deploys eligible missions, and operations last five minutes by default.
- Galaxy operations panel now displays total mission duration and real-time remaining launch time to clarify commitments.
- Galaxy operations now target a single defender: AI assaults only contest their chosen faction, while player strikes auto-select the weaker defender and display the correct target and defense in the Operations panel.
- Mega Heat Sink completions now provide additional cooling power whenever zonal temperatures exceed their trend targets.
- Added a Mega Heat Sink project summary card that reports completed heat sinks and their current cooling rate.
- Mega Heat Sink projects now use worker batch capacity controls matching satellites and require 1 billion worker cap per heat sink.
- Mega Heat Sink controls now include a cooling on/off toggle, and manual amount buttons disable Auto Max.

- Particle Accelerator mega project now lets players set a custom radius with controls, scales material costs by circumference,
  and records the largest completed accelerator.
- Added a Mega Heat Sink advanced research that unlocks a repeatable mega project for accelerated planetary cooling.
- Introduced a Bioworkforce advanced research that unlocks a lifeManager flag for future bioworkforce integration.
- Added a Biocortex-human integration advanced research that grants a 10x global research multiplier once a Bioworld is complete.
- Added a Nanotechnology Stage II advanced research that enables the nanotech manager's stage2 flag.
- Nanocolony Stage II now adds metal consumption growth, a Maintenance II slider that cuts components and superconductor upkeep, and a components fabrication option.
- Galaxy sectors now advertise conquest rewards, with default Habitable World payouts configured in sector parameters.
- Encapsulated the Import Resources project UI in a dedicated ImportResourcesProjectUI class and delegated specialized rendering logic from projectsUI.
- Galaxy faction AI now scales defensive fleet reserves with their electronics adoption and UHF doctrine adaptation levels.
- Galaxy faction AI sector defense now scales with their electronics adoption and UHF doctrine adaptation levels.
- Kessler hazard chart bins now display current versus initial debris amounts on hover.
- Population growth now relies on separate starvation, energy, and high-gravity attrition rates while the Colony tab breaks out each contribution alongside base growth.
- Added a Hazards terraforming subtab managed by HazardManager with hazard.js and hazardUI.js modules.
- HazardManager now loads per-planet hazard definitions, including Umbra's hazardous biomass preferences.
- Hazard penalties now scale global build costs, maintenance, and population growth based on hazard definitions.
- Rebuilt the hazardous biomass UI with a battle-themed control bar, live crusader and penalty readouts, and per-zone growth factor breakdowns.
- Hazardous biomass growth summary now appears between crusader and penalty cards, while base growth and total penalty rows live under Growth Modifiers.
- Random worlds now tune hazardous biomass tolerances to their equilibrium climate and choose liquid terrain preferences on oceanic worlds.
- Added a depletion progress objective type that completes when resources are at or below the target amount.
- Added a Crusader Final Push story project on Umbra that unlocks after chapter 21.6b and awards alien artifacts for crusader deployments.
- Added a Lifting advanced research that unlocks repeatable Lifters mega projects which persist across planets and draw on space storage.
- Added the Hephaestus Megaconstruction Yard advanced research and giga project, with assignable yards that count as extra terraformed worlds for Dyson Swarm/Sphere, Space Storage, Lifters, and the yard itself (persisting across travel with step-button assignments).
- Lifters gained a Dyson-style control card with a Run toggle, gas giant hydrogen harvesting, atmosphere stripping, per-lifter capacity readouts, and explicit use of unused Dyson Swarm energy.
- Lifters now provide an automation toggle to permit colony energy usage when Dyson overflow energy cannot sustain operations.
- Random worlds that include hazards now grant double RWG effects when terraformed, and the RWG UI displays the hazard bonus as an added count.
- Random world archetype bonuses have been doubled across the board, and rogue worlds now reduce global maintenance by 2% each.
- Added a Warpnet advanced research that unlocks a permanent colony slider for global research boosts.
 - Rogue random world maintenance bonus now divides maintenance by (1 + 2% per rogue) instead of a flat subtraction.

## Feature updates
- Colony unlocks now raise the same tab alert badge as buildings, respecting the Disable unlock alerts setting.
- Building production/consumption summaries now skip hidden or locked resources unless a structure sets always-show flags, which waste buildings now use to keep their output visible.
- Special project ordering now treats all import resource missions as one card, ignores hidden projects when showing arrows, and saves the grouped order across travel and saves.
- Space storage now uses a mega/giga project resource priority dropdown (prioritize or restrict to space/colony), and mega/giga spending respects the selection.
- Autobuild target counts now always display in compact k/M/B formatting; removed the related settings toggle.
- Autobuild basis dropdowns now include a % initial land option that targets terraforming.initialLand.
- Spaceship, android, and Import Resources assignment cards now use compact k/M/B formatting for available/assigned counts.
- Galactic Market controls now include -Max/+Max quick actions based on current net resource surplus, with an attached tooltip explaining the shortcuts.
- Galactic Market now has an "Enable extra settings" checkbox beside Run that shows or hides the -Max/+Max buttons and persists across saves and travel.
- Journal header now includes an automation gear toggle that reveals a synced quick-access panel for ship, life, and building automation presets.
- Buildings automation now includes an "All future travels" checkbox to keep the next-travel combination selection across travel.
- Added Solis Prime as a rogue story planet that relies on background radiation for luminosity.
- Galaxy map sectors that block story progress now show a journal icon until conquered and explain the required world milestone in the sector details.
- Added an Artificial space subtab managed by a new ArtificialManager and UI that only appears when the manager is enabled.
- Built a shellworld construction flow with radius-scaled costs, space-storage payments, launch stashes, travel/discard controls, and a persistent construction history.
- Refined artificial world drafting with RWG-inspired UI, terraformed-world build speed scaling, world naming, larger Super Earth shells, and stash steppers recommending 1B+ starting resources.
- Artificial world construction now blocks any job that would exceed five hours, and the duration tooltip warns that Humanity will not attempt projects longer than that. UI copy defaults to the broader “artificial world” terminology instead of “shellworld.”
- Planet parameter overrides can now apply effects on load/travel, and artificial worlds scale spaceship energy costs by radius.
- Artificial world drafting now shows an Effects section highlighting the spaceship energy cost penalty.
- Patience spending now also grants advanced research and O'Neill cylinder progress alongside superalloys.
- Spending patience also fast-forwards Warp Gate Command operations by the same duration in 60-second increments, and the patience preview notes the pending WGC advance.
- Patience now only grants its daily +3 hours when players save to file or export to clipboard, with the UI showing whether the daily claim is ready or claimed.
- The Patience panel includes Save to file and Export to clipboard shortcuts to claim the daily patience bonus from the same screen.
- Added a Repeatable AI Researches advanced unlock with stacking repeatable energy, industry, and colonization boosts that escalate research costs tenfold per purchase.
- Spaceship automation includes an "Unassigned Ships" target so presets can reserve a portion of the fleet for replication while keeping routes staffed.
- Clicking the `0` spaceship assignment button now also disables Auto assign for that project (including Import Resources missions).
- Added a placeholder Gabbag planet with population milestone chapters covering ten-through-five-billion colonist goals.
- Added a placeholder Tartarus story world with three chapters covering ten-through-five-billion colonist goals.
- Added Tartarus planet parameters with a custom star definition.
- Solis quest system now detects clock manipulation by checking if remaining cooldown time exceeds twice the normal quest interval (30 minutes), automatically resetting to normal cooldown when detected to prevent indefinite wait times from backward clock changes.
- Galactic Market buy/sell inputs now accept scientific notation (e.g. `1e6`) and suffix formatting (e.g. `3Qi`), and amounts >= 1M display in formatted form after using row controls or leaving the field.
- Terraforming requirements now include Life Designer baseline ranges, tolerances, and attribute caps, and the Life Designer reads these from the active requirement (defaulting to Human).
- Life growth/decay is now metabolism-driven: the Human requirement defines a Photosynthesis process (zonal surface inputs, global atmospheric inputs) and `LifeManager.updateLife` applies it from parameters for future extensibility.
- Added a Gabbagian terraforming requirement preset with methane/hydrogen atmosphere targets and a Methanogenesis-based metabolism (including anaerobic decay outputs).
- Life Designer now labels the efficiency attribute by active metabolism and shows the metabolism growth chemistry equation (with a detailed tooltip variant).
- Planets can now specify a `celestialParameters.terraformingRequirementId` (used by the Terraforming manager) so worlds like Gabbag can default to the Gabbagian requirement template.
- Hydrology surface flow now scales with √(liquid surface elevation difference) and latitude boundary length, while flow-melt is viscosity-independent and scales with glacier height and target-zone temperature above the melting point.
- Galaxy sector defense benefits and AI fleet capacity are now granted only to the last faction to fully control a sector (falling back to the sector’s original controller when no history exists), instead of being split across factions by partial control.
- Random World Generator now blocks moon archetypes via `orbit.moonTypeBlacklist` (defaulting Super-Earth to planet-only).
- Warp Gate Command now raises a WGC subtab alert when operations finish without auto-start enabled.
- Warp Gate Command facility cooldown alerts now clear once every facility is maxed, and the status text switches to Maxed instead of Ready.
- Trash Incinerator now supports a hazardous biomass recipe with zonal consumption distribution matching other surface resources.
- Added Hazardous Biomass Incineration advanced research to unlock the incinerator recipe and hide multi-recipe dropdowns until more than one option is available.
- Space disposal now groups multi-phase resources behind a type dropdown plus a phase selector, driven by shared phase definitions in `planet-resource-parameters.js`.
- Terraforming zonal resource synchronization and global-change distribution now read per-resource `zonalConfig` parameters for aggregation and spread behavior.
- Water import automation now offers a disable mode that stops when water+ice amounts exceed the terraforming target.
- Ship smelting now unlocks a water import target selector (Surface/Colony) that fills colony water before spilling to the surface, and the setting persists when preserving project settings on travel.
- Added Massive scale glass smelting research to double glass smelter production and consumption.
- Building UI updates now only refresh visible structures on the active buildings subtab to cut per-tick DOM work.
- Project UI updates now only refresh projects on the active projects subtab to cut per-tick DOM work.
- Rogue worlds now hide the sun mesh in the planet visualizer while keeping directional light active.
- Planet visualizer now adds a blue inert-gas aura that grows with inert pressure up to 80 kPa.
- Added a Save & Settings toggle to preserve most project settings on travel (import disable limits, Space Mirror Facility oversight, resource disposal selection), with a tooltip note about the stronger World 11 version.
- Buildings now force an immediate UI refresh when switching subtabs so reordering happens without a tick delay.
- Research entries that require the Kessler hazard now hide entirely when the hazard is absent instead of showing as unknown.
- Black Dust Factory now lets players pick a dust color to set black dust albedo between 0.05 and 0.80, saving and displaying the selection.
- Custom dust renames the Black Dust resource, drives planet visualizer rock tint up to full coverage, and makes automation fill to cap.
- Bioworld and Foundry World projects now hide their start bars when the other specialization is active or completed.
- Bioworld and Foundry World projects now remain adjacent in the project list ordering, even after reordering, saving, or travel.
- Bioworld and Foundry World specialization projects now share a common SpecializationProject base for shop UI, point accrual, and ecumenopolis disable logic.
- Travel now warns first when a Bioworld or Foundry World specialization is in progress before proceeding to story, random world, or artificial travel warnings.
- Bioworld and Foundry World projects now include the Uncheck on travelling automation option.
- Planet visualizer cloud textures now use softer thresholding with density falloff to reduce blocky edges.
- Artificial worlds now render with a metallic surface texture and skip crater noise in the planet visualizer.
- Planet visualizer terrain now highlights the top height-map band as mountain ridges.
- Biomass overlay now fades on high peaks so mountains stay visible through vegetation.
- Ocean masks now use a softened shoreline blend instead of a hard height cutoff.
- Planet surface textures now render at higher resolution to reduce pixelated coastlines.
- Planet visualizer clouds now copy edge pixels to eliminate the 360-degree seam.
- Cloud map generation now uses tileable noise so cloud textures wrap cleanly on the sphere.
- Cloud generation now samples 3D noise on the sphere for smoother, cloud-like coverage without seams.
- Terraforming summary now includes a history charts button with a left-hand graph picker, recording yearly snapshots (saved/loaded, cleared on travel) for temperature, atmosphere, water/ice, albedo, luminosity, and life coverage up to 500 years.
