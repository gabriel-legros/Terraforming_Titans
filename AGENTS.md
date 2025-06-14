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
calculations from **physics.js**, **hydrology.js**, **water-cycle.js** and
**dry-ice-cycle.js**.

Economy and colony management rely on **resource.js**, **building.js** and
**colony.js** plus corresponding UI modules.  Story progression is configured in
**progress-data.js** and handled by **StoryManager** within **progress.js**.
The **SpaceManager** (space.js) tracks which planet is active and its
terraforming status.

Each planet is divided into tropical, temperate and polar zones via **zones.js**
which maintain their own temperature and surface conditions.  Various CSS and UI
scripts implement the tabs, pop-ups and other interface elements.

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

Tests covering helper utilities and physics functions reside in the `__tests__`
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
