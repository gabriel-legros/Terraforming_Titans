#Instructions
Any major update to a feature present in this file should also be summarized and documented in this file (AGENTS.md).
All imports and exports need to be done with the fact this game will be run in a browser from index.html in mind.
- Story projects added in **progress-data.js** must be placed close to the chapter where they unlock.

#Overview of code
This repository hosts a browser‑based incremental game written in JavaScript.

The entry point **index.html** loads many scripts and stylesheets to build the
interface.  Gameplay logic runs in **game.js** using the Phaser framework.  At
startup the game creates resources, buildings, colonies, projects and research
items from parameter files.

Planet definitions and default resources live in **planet-parameters.js**.
Weather and surface modelling are implemented in **terraforming.js** with helper
calculations from **physics.js**, **hydrology.js**, **water-cycle.js**,
**dry-ice-cycle.js** and **hydrocarbon-cycle.js**.

- Surface fraction calculations for albedo now allocate biomass first and scale
  water and ice proportionally when their combined coverage exceeds remaining
  area.
- Melting mechanics cap available ice at zone surface area multiplied by ice
  coverage and 0.1 m when computing melt flow between zones or within a zone.
- Water and methane melting/freezing calculations now share a helper in
  **phase-change-utils.js** to avoid duplicate logic.
 - Condensation calculations now taper off near the pressure-dependent boiling
   point of each substance. `water-cycle.js` uses an Antoine-equation helper
   `boilingPointWater`. Methane temperatures rely on `boilingPointMethane`, a
   log-based approximation good for roughly 0.1–10 bar. Both feed into a
   `boilingPoint` parameter for `condensationRateFactor`.

The hydrocarbon cycle models methane in its liquid, ice and vapor forms.  It
uses Penman-based equations for evaporation and sublimation alongside flow and
melting logic in **hydrology.js**.

Economy and colony management rely on **resource.js**, **building.js** and
**colony.js** plus corresponding UI modules.  Story progression is configured in
**progress-data.js** and handled by **StoryManager** within **progress.js**.
The **SpaceManager** (space.js) tracks which planet is active and its
terraforming status.

Each planet is divided into tropical, temperate and polar zones via **zones.js**
which maintain their own temperature and surface conditions.  Various CSS and UI
scripts implement the tabs, pop-ups and other interface elements.

# Additional Gameplay Systems

- **skills.js** and **skillsUI.js** implement the H.O.P.E. skill tree which grants global bonuses as skill points are earned.
- **life.js** with **lifeUI.js** lets players design custom lifeforms by spending design points on attributes like temperature tolerance and radiation resistance.
- The moisture efficiency stat has been removed. Life now only grows when liquid water is present.
- **space.js** and **spaceUI.js** handle interplanetary travel once a planet is fully terraformed. `initializeSpaceUI` now renders planet entries once and `updateSpaceUI` simply toggles visibility and button text using SpaceManager status. The initializer checks for existing elements so loading a save doesn't duplicate the planet options.
- `game.js` now calls `updateSpaceUI()` each tick so newly enabled planets become visible right away.
- **gold-asteroid.js** spawns a temporary event that awards large production multipliers when clicked.
- **autobuild.js** automatically constructs buildings based on population ratios when auto-build is enabled.
- **milestones.js** and **milestonesUI.js** track long term objectives and unlock rewards.
- **solis.js** and **solisUI.js** manage the Solis shop and quest system which grants Solis points for completing delivery quests.
- The shop now offers a food upgrade granting +100 food per purchase.
- A colonist rocket upgrade increases colonists delivered per import rocket by 1 for each purchase.
- Resource upgrades now apply a base storage bonus effect to the purchased resource.
- Resources calculate their storage cap from active baseStorageBonus effects instead of modifying the baseCap value.
- The ResearchManager now persists between planets. Only advanced researches remain completed after travel; regular researches reset on each new planet.

## Dyson Swarm Receiver
The Dyson Swarm project begins with research into a large orbital array. An advanced research unlocks the concept and a follow-up energy research enables the **Dyson Swarm Receiver** special project. The receiver currently costs massive resources (10M metal, 1M components, 100k electronics) and takes five minutes to build but provides no effect yet.
- **save.js** manages localStorage save slots and autosaving of resources, structures, research and story progress.
- **projects.js** and **projectsUI.js** handle special missions such as asteroid mining, cargo exports and other repeatable tasks.
- Story project progress now stores which narrative steps have already been shown so repeating or reloading a project will never reprint earlier text.
- **spaceship.js** with **spaceshipUI.js** allows producing spaceships and assigning them to projects.
- **day-night-cycle.js** updates a UI progress bar showing planetary time and affects building productivity.
- **journal.js** maintains a log of story messages with typing effects and history display.
- **population.js** together with colony modules controls growth, worker allocation and happiness.
- **ore-scanning.js** searches for underground resource deposits using adjustable scanning strength.
- **warning.js** displays urgent alerts like colonist deaths or extreme greenhouse conditions.
- Sustain costs for active projects now register as 'project' consumption in resource rate tooltips.
- Projects requiring ongoing resources check if enough supplies exist for the next second rather than just the current frame.
- The luminosity box now shows both ground albedo (base plus black dust) and surface albedo derived from physics.js.
- Surface albedo deltas compare against the initial surface value on game start, defaulting to ground albedo if unavailable. Tooltip breakdowns list black dust, water, ice and biomass percentages.

# Effectable Entities Design

Gameplay objects that can receive temporary or permanent modifiers extend
`EffectableEntity` defined in **effectable-entity.js**.  Each entity keeps an
array of `activeEffects` and a set of boolean flags.  Effects are lightweight
objects identified by `effectId` and `sourceId` describing the type of change to
apply.  Calling `addEffect` stores the effect and invokes `applyEffect` to
modify the entity immediately.  `replaceEffect` swaps an existing effect with
the same `effectId` while `removeEffect` clears effects from a given
`sourceId` and re-applies any remaining ones.

`applyEffect` dispatches on the effect's `type` to handlers such as
`applyResourceCostMultiplier`, `applyWorkerMultiplier` or boolean flag logic.
Building, resource, project and life-management modules all inherit from this
class so that the same effect system works across the game.  Helper functions
`addEffect` and `removeEffect` route an effect to the correct target instance
based on its `target` field, enabling data-driven gameplay adjustments.

All JavaScript sources now live under `src/js` while stylesheets are in
`src/css`.  Game assets such as images have moved to `assets/images`.  Tests
reside in the `tests` directory.  `index.html` loads files from these paths so
place any new code in the appropriate folder.

Tests covering helper utilities and physics functions reside in the `tests`
directory and run under Jest.

# Resource Flow

Resources are defined in **resource.js**.  Each instance stores its value,
optional storage cap and typed production/consumption rates.  Buildings and
other systems call `modifyRate(value, source, type)` to register production or
consumption.  Rates are tracked per source and per type (e.g. `building`,
`terraforming`, `life`, `funding`) so the UI can show a breakdown of where a
resource is coming from.

The global `resources` object is constructed via `createResources` from the
parameter files.  Every game tick `produceResources` performs the following
steps:

1. `calculateProductionRates` computes theoretical output of each building at
   100 % productivity and updates the typed rate data.
2. Storage capacities are recalculated by calling `updateStorageCap` on each
   resource.
3. Buildings update their actual productivity based on day/night and available
   inputs.
4. Production and consumption trackers are reset and actual changes are
   accumulated through `building.produce`, `building.consume` and maintenance
   costs.
5. Funding, terraforming and life modules modify the accumulated changes before
   they are applied to each resource.
6. Values are then clamped by caps and never drop below zero.
7. Finally `recalculateTotalRates` aggregates the rates for display.

Functions like `checkResourceAvailability` and `reserve` help other modules plan
actions without immediately consuming resources.

## UI refresh requirements

Certain actions recreate core game objects and therefore require the interface
to be redrawn so elements bind to the new instances.

- **Starting a new game** – call `startNewGame()` which sets the default planet
  back to Mars and internally invokes `initializeGameState()`. This function
  rebuilds resource displays, building/colony buttons and other UI sections.
- **Loading a save file** – `loadGame()` parses the saved state then calls
  `initializeGameState({ skipStoryInitialization: true })` to rebuild managers
  and UI before applying the loaded data. This prevents the introductory story
  event from triggering again during the load sequence.
- **Moving to another planet** – `selectPlanet(key)` in `spaceUI.js` first asks
  the `SpaceManager` to change the current planet, then calls
  `initializeGameState({preserveManagers: true})` followed by `updateSpaceUI()`
  so the Space tab reflects the new location.

Failing to use these helpers can leave the DOM tied to outdated objects and
cause inconsistent behaviour.  When creating new UI element, some thought should be had on how this will interact with any of these three.

#Testing

jest and jsdom are installed globally
Create new tests for any newly implemented feature
Run tests with npm test
Describe how many tests have passed/failed and describe any tests that failed if you cannot fix it.
Avoid asserting on the exact wording of story text in tests. Verify structural data like IDs or prerequisites instead so narrative phrasing can change without breaking tests.

# Storytelling Style
In chapters after the destruction of Earth, each character's name should prefix their dialogue the second time they speak in a chapter. This helps clarify who is speaking as the cast of characters expands.

# Character Personalities

This section outlines the personalities of the main characters in the story.

*   **H.O.P.E.:** A hyper-intelligent AI with a deadpan, serious, and literal personality. H.O.P.E.'s dialogue should always be straightforward and devoid of emotion or humor, with the exception of treating almost everything as some form of terraforming (e.g. aliens are "hazardous biomass").

*   **Martin:** The whimsical and clever head of the Mars Terraforming Committee. His dialogue should be lighthearted and witty, even when discussing serious topics. He acts as a mentor figure to H.O.P.E. in the early stages of the game.

*   **Mary:** Martin's daughter, a brilliant scientist who takes over communication with H.O.P.E. after her father. Her tone is situational. In good times, she's witty and clever, much like her father. In bad times, her dialogue becomes serious and focused as she grapples with the unfolding crisis.

*   **Adrien Solis:** The cynical and opportunistic CEO of Solis Corp. His dialogue is sharp, business-like, and often laced with a dark sense of humor. He sees the destruction of Earth as an opportunity but remains committed to helping humanity succeed.

*   **Dr. Evelyn Hart:** A brilliant and pragmatic scientist, Dr. Hart is the architect of Operation Sidestep. Her dialogue is professional, focused, and driven by the immense scientific and strategic pressures of the unfolding crisis. She is a master of contingency planning and secrecy.

*   **Elias Kane:** The charismatic and fanatical leader of the Cult of Three Wounds. He believes the aliens are saviors and that humanity's attempts to terraform are a blasphemy against a grand cosmic design. His dialogue is prophetic, manipulative, and aimed at undermining H.O.P.E.'s mission at every turn, as he is secretly following the aliens' orders.
\n- Atmospheric Water Collector building unlocks via a condition-based story trigger when the planet is hot and dry.
