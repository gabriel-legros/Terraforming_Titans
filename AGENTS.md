#Instructions
All imports and exports need to be done with the fact this game will be run in a browser from index.html in mind.

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
- **space.js** and **spaceUI.js** provide interplanetary travel once a planet is fully terraformed. The SpaceManager keeps per-planet status.
- **gold-asteroid.js** spawns a temporary event that awards large production multipliers when clicked.
- **autobuild.js** automatically constructs buildings based on population ratios when auto-build is enabled.
- **milestones.js** and **milestonesUI.js** track long term objectives and unlock rewards.
- **solis.js** and **solisUI.js** manage the Solis shop and quest system which grants Solis points for completing delivery quests.
- **save.js** manages localStorage save slots and autosaving of resources, structures, research and story progress.
- **projects.js** and **projectsUI.js** handle special missions such as asteroid mining, cargo exports and other repeatable tasks.
- **spaceship.js** with **spaceshipUI.js** allows producing spaceships and assigning them to projects.
- **day-night-cycle.js** updates a UI progress bar showing planetary time and affects building productivity.
- **journal.js** maintains a log of story messages with typing effects and history display.
- **population.js** together with colony modules controls growth, worker allocation and happiness.
- **ore-scanning.js** searches for underground resource deposits using adjustable scanning strength.
- **warning.js** displays urgent alerts like colonist deaths or extreme greenhouse conditions.

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

#Testing

jest and jsdom are installed globally
Create new tests for any newly implemented feature
Run tests with npm test
Describe how many tests have passed/failed and describe any tests that failed if you cannot fix it.
