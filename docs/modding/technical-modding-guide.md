# Terraforming Titans Technical Modding Guide

This guide documents how to mod Terraforming Titans (this guide is written in collaboration with GPT 5.6 Sol.  Will expand and update as things change.)

## What mods can change

The current mod API supports:

- Declarative JSON patches for language data and supported parameter objects.
- New resources, buildings, projects, research, atlas worlds, skills, and other parameter-driven content.
- Additive classic JavaScript files for custom buildings and projects (including UI).
- Additive CSS and declared image, font, audio, or video assets.
- Complete replacement of permitted files.

Back up your saves when developing.

## How loading works

The launcher validates every discovered mod before the game window opens. For the selected loadout, the game then:

1. Selects one winning replacement for each replaced game path.
2. Loads the base or replaced language and parameter file.
3. Applies JSON patches at the explicit patch stage immediately after that file.
4. Loads additive styles after the game's styles.
5. Loads constructor scripts after the built-in classes and immediately before `src/js/game.js`.
6. Initializes game state from the final patched parameters and registered constructors.

The launcher's top-to-bottom order is the effective load order. Earlier mods apply first; later mods win replacement, patch-value, and normal CSS-cascade conflicts.

## Quick start: make an ore mine patch

This example changes the Ore Mine's metal cost to `5` and changes its name.

### 1. Create the folder

Create as a local mod in the local mods folder :

local-mods/
└── guide.cheaper-ore-mine/
    ├── terraforming-titans.mod.json
    └── patches/
        ├── buildings.json
        └── language.json
```

### 2. Add the manifest

Create `terraforming-titans.mod.json`:

```json
{
  "schemaVersion": 1,
  "id": "guide.cheaper-ore-mine",
  "name": "Guide: Cheaper Ore Mine",
  "version": "1.0.0",
  "loadOrder": 0,
  "content": {
    "scripts": [],
    "styles": [],
    "assets": [],
    "patches": [
      {
        "target": "language.current",
        "file": "patches/language.json"
      },
      {
        "target": "parameters.buildings",
        "file": "patches/buildings.json"
      }
    ],
    "replacements": []
  }
}
```

### 3. Patch the building

Create `patches/buildings.json`:

```json
{
  "entries": {
    "oreMine": {
      "cost": {
        "colony": {
          "metal": 5
        }
      }
    }
  }
}
```

Objects merge recursively, so this changes only `oreMine.cost.colony.metal`. IMPORTANT : Every unmentioned Ore Mine property keeps its base-game value.

### 4. Patch the localized name

This is optional but is good to keep things organized and easier to localize later.
Create `patches/language.json`:

```json
{
  "catalogs": {
    "buildings": {
      "oreMine": {
        "name": "Ore Mine (Modded)"
      }
    }
  }
}
```

### 5. Launch and verify

In the launcher

1. Refresh the mod list if needed.
2. Enable **Guide: Cheaper Ore Mine**.
3. Launch a new game or a test save.
4. Confirm the card says **Ore Mine (Modded)** and displays the new cost.

## Manifest reference

Every mod needs a UTF-8 JSON file named exactly `terraforming-titans.mod.json` at its root.

```json
{
  "schemaVersion": 1,
  "id": "author.mod-name",
  "name": "Player-facing Mod Name",
  "version": "1.0.0",
  "loadOrder": 0,
  "content": {
    "scripts": [
      {
        "file": "scripts/custom-content.js",
        "stage": "constructors"
      }
    ],
    "styles": [
      "styles/mod.css"
    ],
    "assets": [
      "assets/icon.png"
    ],
    "patches": [
      {
        "target": "parameters.projects",
        "file": "patches/projects.json"
      }
    ],
    "replacements": [
      {
        "gamePath": "src/js/example.js",
        "file": "replacements/src/js/example.js"
      }
    ]
  }
}
```

| Field | Requirement |
| --- | --- |
| `schemaVersion` | Must currently be the number `1`. This represents the version of this schema here.|
| `id` | 3-80 lowercase letters, numbers, dots, underscores, or hyphens. Start with a letter or number. |
| `name` | The name as it will appear in the launcher. |
| `version` | The version as it will appear in the launcher. |
| `loadOrder` | Optional finite number; defaults to `0`. It controls only initial/default ordering. The launcher will manage this value itself when reordering mods.|
| `content.scripts` | Optional array of `{ "file", "stage" }` objects. The only current option is `constructors`. |
| `content.styles` | Optional array of CSS file paths. |
| `content.assets` | Optional array of asset file paths. |
| `content.patches` | Optional array of `{ "target", "file" }` objects. |
| `content.replacements` | Optional array of `{ "gamePath", "file" }` objects. |

All declared paths:

- Are relative to the mod root.
- Use `/` as the portable separator.
- Must point to existing regular files.
- Cannot contain empty, `.`, or `..` path segments.
- Cannot escape the mod root through a symlink.

The loader validates the manifest, paths, extensions, JSON syntax, and dangerous patch keys. It does not validate every gameplay field against a formal schema. A structurally valid patch can still fail later if the game receives an invalid parameter shape.

## JSON patch semantics

All parameters patches other than language normally use an `entries` object:

```json
{
  "entries": {
    "stableEntryId": {
      "property": "new value"
    }
  }
}
```

The patch rules are:

- Objects merge recursively.
- Strings, booleans, numbers, and `null` replace the old value.
- Arrays replace the complete old array.
- A missing property is left unchanged.
- Later mods see and can override earlier mods' results.

### Delete a property

Updating is actually easier than deleting.  To delete :

```json
{
  "entries": {
    "oreMine": {
      "autoBuildMaxOption": {
        "$delete": true
      }
    }
  }
}
```

Use `$delete` as the only member of that operation object.

### Replace a complete object or array

Because every update is a recursive merge, we have a special way to replace an entire object.  This avoids having to use delete everywhere.  This also allows replacing an entire building or project if needed.

```json
{
  "entries": {
    "oreMine": {
      "cost": {
        "$replace": {
          "colony": {
            "metal": 5
          }
        }
      }
    }
  }
}
```

Without `$replace`, the new `cost` is recursively merged with the existing cost.

### Represent non-JSON numbers

JSON cannot directly represent `Infinity`, `-Infinity`, or `NaN`. Use:

```json
{
  "$number": "Infinity"
}
```

The only supported `$number` strings are `Infinity`, `-Infinity`, and `NaN`.

This is useful for infinitely repeated projects.  For example :

```json
{
  "entries": {
    "authorMod_repeatableProject": {
      "maxRepeatCount": {
        "$number": "Infinity"
      }
    }
  }
}
```

## Supported patch targets

Use the source file in the last column as the current parameter-shape reference. Copy the smallest relevant entry and patch only the fields your mod owns.

| Target | Purpose | Current source of truth |
| --- | --- | --- |
| `language.current` | UI, catalogs, story, and other localized text | [`src/js/lang/current-language.js`](../../src/js/lang/current-language.js) and [`story-language.js`](../../src/js/lang/story-language.js) |
| `parameters.terraforming` | Global simulation defaults | [`terraforming-parameters.js`](../../src/js/terraforming/terraforming-parameters.js) |
| `parameters.planetResources` | Resource definitions | [`planet-resource-parameters.js`](../../src/js/planet-resource-parameters.js) |
| `parameters.planets` | Story world definitions | [`planet-parameters.js`](../../src/js/planet-parameters.js) |
| `parameters.specialSeeds` | Atlas worlds | [`special-seeds.js`](../../src/js/special-seeds.js) |
| `parameters.life` | Life Designer parameters | [`life-parameters.js`](../../src/js/life-parameters.js) |
| `parameters.buildings` | Building definitions | [`buildings-parameters.js`](../../src/js/buildings-parameters.js) |
| `parameters.colonies` | Colony definitions | [`colony-parameters.js`](../../src/js/colony-parameters.js) |
| `parameters.orbitals` | Orbital definitions | [`orbital-parameters.js`](../../src/js/colony/orbital-parameters.js) |
| `parameters.projects` | Project definitions | [`project-parameters.js`](../../src/js/project-parameters.js) |
| `parameters.research` | Research definitions grouped by category | [`research-parameters.js`](../../src/js/research-parameters.js) |
| `parameters.skills` | Skill definitions | [`skills-parameters.js`](../../src/js/skills-parameters.js) |
| `parameters.terraformingRequirements` | Terraforming victory requirements | [`terraforming-requirements.js`](../../src/js/terraforming/terraforming-requirements.js) |


### Terraforming defaults versus world overrides

`parameters.terraforming` changes global simulation defaults. Its stable top-level sections are:

- `physical`
- `atmosphere`
- `geometry`
- `phaseChange`
- `climate`
- `gameplay`
- `hazards`

World-specific celestial, resource, climate, or hazard differences belong in `parameters.planets` or `parameters.specialSeeds`.

Example:

```json
{
  "entries": {
    "gameplay": {
      "gravityPenalty": {
        "linearThresholdMS2": 12
      }
    },
    "phaseChange": {
      "water": {
        "equilibriumCondensationParameter": 0.2
      }
    }
  }
}
```

### Research is a special target

Due to spaghetti code, research is handled a bit differently and requires defining a category first.  Available categories are Energy, Industry, Colonization, Terraforming and Advanced.

```json
{
  "entries": {
    "colonization": {
      "authorMod_crystalResearch": {
        "name": "",
        "description": "",
        "cost": {
          "research": 1000
        },
        "prerequisites": [],
        "effects": []
      }
    }
  }
}
```

If the id exists, its object is merged in place. If it does not exist, the new research is appended to the category and receives the key as its `id`.

Delete one research:

```json
{
  "entries": {
    "colonization": {
      "authorMod_crystalResearch": {
        "$delete": true
      }
    }
  }
}
```

Replace a complete category array:

```json
{
  "entries": {
    "colonization": {
      "$replace": []
    }
  }
}
```

Replacing a category is a very extreme thing to do.

## Localization

Player-facing names and descriptions should preferrably live in a `language.current` patch, not in parameter data.

```json
{
  "entries": {
    "authorMod_crystalCondenser": {
      "name": "",
      "description": ""
    }
  }
}
```

The language patch supplies those fields:

```json
{
  "catalogs": {
    "buildings": {
      "authorMod_crystalCondenser": {
        "name": "Crystal Condenser",
        "description": "Condenses trace minerals into usable crystals."
      }
    }
  }
}
```

Language objects merge recursively; scalar values and arrays replace previous values. Patch operators such as `$delete`, `$replace`, and `$number` are not interpreted for `language.current`.

Common catalog paths include:

- `catalogs.buildings.<buildingId>`
- `catalogs.projects.<projectId>`
- `catalogs.resources.<resourceGroup>.<resourceId>`
- `catalogs.research.<categoryId>.<researchId>`
- `catalogs.colonies.<colonyId>`
- `catalogs.skills.<skillId>`
- `catalogs.planets.<planetId>`
- `catalogs.life.<lifeId>`
- `catalogs.orbitals.<orbitalId>`
- `catalogs.terraformingRequirements.<requirementId>`

Use [`current-language.js`](../../src/js/lang/current-language.js) for shared game and UI text and [`story-language.js`](../../src/js/lang/story-language.js) for story text. You may create multiple files.

## Example: add a resource, building, and research

This example shows how parameter-driven systems connect. Research unlocks a building and its resource; the building produces that resource.

Suggested files:

```text
guide.crystal-industry/
├── terraforming-titans.mod.json
└── patches/
    ├── buildings.json
    ├── language.json
    ├── research.json
    └── resources.json
```

Manifest patch declarations:

```json
{
  "schemaVersion": 1,
  "id": "guide.crystal-industry",
  "name": "Guide: Crystal Industry",
  "version": "1.0.0",
  "loadOrder": 0,
  "content": {
    "patches": [
      {
        "target": "language.current",
        "file": "patches/language.json"
      },
      {
        "target": "parameters.planetResources",
        "file": "patches/resources.json"
      },
      {
        "target": "parameters.buildings",
        "file": "patches/buildings.json"
      },
      {
        "target": "parameters.research",
        "file": "patches/research.json"
      }
    ]
  }
}
```

`patches/resources.json`:

```json
{
  "entries": {
    "special": {
      "guideCrystals": {
        "name": "",
        "hasCap": false,
        "initialValue": 0,
        "unlocked": false
      }
    }
  }
}
```

`patches/buildings.json`:

```json
{
  "entries": {
    "guideCrystalIndustry_crystalCondenser": {
      "type": "Building",
      "name": "",
      "category": "resource",
      "description": "",
      "cost": {
        "colony": {
          "metal": 100,
          "components": 10
        }
      },
      "consumption": {
        "colony": {
          "energy": 1000
        }
      },
      "production": {
        "special": {
          "guideCrystals": 1
        }
      },
      "storage": {},
      "factoryHeatCoefficient": 0,
      "dayNightActivity": false,
      "canBeToggled": true,
      "requiresMaintenance": false,
      "requiresWorker": 0,
      "maintenanceFactor": 0,
      "unlocked": false
    }
  }
}
```

`patches/research.json`:

```json
{
  "entries": {
    "colonization": {
      "guideCrystalIndustry_crystalCondensation": {
        "name": "",
        "description": "",
        "cost": {
          "research": 1000
        },
        "prerequisites": [],
        "effects": [
          {
            "target": "building",
            "targetId": "guideCrystalIndustry_crystalCondenser",
            "type": "enable"
          },
          {
            "target": "resource",
            "resourceType": "special",
            "targetId": "guideCrystals",
            "type": "enable"
          }
        ]
      }
    }
  }
}
```

`patches/language.json`:

```json
{
  "catalogs": {
    "buildings": {
      "guideCrystalIndustry_crystalCondenser": {
        "name": "Crystal Condenser",
        "description": "Consumes colony energy to produce crystals."
      }
    },
    "resources": {
      "special": {
        "guideCrystals": {
          "name": "Crystals"
        }
      }
    },
    "research": {
      "colonization": {
        "guideCrystalIndustry_crystalCondensation": {
          "name": "Crystal Condensation",
          "description": "Unlock crystal condensers and the crystals resource."
        }
      }
    }
  }
}
```

This is the same integration pattern demonstrated by [`examples/local-mods/torment-nexus`](../../examples/local-mods/torment-nexus/). Parameter schemas are internal game contracts and can evolve, so compare new content with a current base-game entry of the same kind.

## Additive scripts and custom classes

There is a limit to what can be achieved from parameters alone.  Many buildings and projects in the game actually use custom classes.  Using a custom class grant you the full power of Javascript.

Declare a script:

```json
{
  "content": {
    "scripts": [
      {
        "file": "scripts/custom-classes.js",
        "stage": "constructors"
      }
    ]
  }
}
```

The only current script stage is `constructors`, and declared script files must use the `.js` extension.

### Custom building

```js
class FluxRefineryBuilding extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.fluxProductionMultiplier = config.fluxProductionMultiplier;
  }

  getEffectiveProductionMultiplier() {
    return super.getEffectiveProductionMultiplier()
      * this.fluxProductionMultiplier;
  }
}

registerBuildingConstructor(
  'author.flux-industry.FluxRefineryBuilding',
  FluxRefineryBuilding
);
```

In this case, you need to specify in the parameters that your building must use this constructor.  This is done via the type attribute.

```json
{
  "entries": {
    "authorFluxIndustry_fluxRefinery": {
      "type": "author.flux-industry.FluxRefineryBuilding"
    }
  }
}
```

The abbreviated patch above assumes the rest of the required building fields already exist. For a new building, include the full shape shown in the earlier building example or copy a current compatible entry.

### Common building methods

Building subclasses normally change a small part of the standard building pipeline. Prefer the multiplier, limit, and visibility hooks over replacing the complete production or construction methods.

#### Building logic methods

| Signature | Purpose and return value |
| --- | --- |
| `constructor(config, buildingName)` | Runs when game state is initialized. Call `super(config, buildingName)` first, then initialize custom state and cached UI properties. |
| `isVisible()` | Returns whether the building should have a visible row. Combine custom conditions with `super.isVisible()`. |
| `getBuildLimit()` | Returns the maximum total number of this building that may exist. The base implementation derives a limit from required deposits or returns `Infinity`. |
| `getEffectiveProductionMultiplier()` | Returns the multiplier applied to every configured production output. Multiply the value from `super` to preserve research, skill, and other active effects. |
| `getEffectiveConsumptionMultiplier()` | Returns the multiplier applied to configured consumption. Multiply the value from `super` to preserve active effects. |
| `getEffectiveStorageMultiplier()` | Returns the multiplier applied to configured storage. Multiply the value from `super` to preserve active effects. |
| `getEffectiveCostMultiplier(resourceCategory, resourceId)` | Returns the construction-cost multiplier for one resource. This is usually safer than replacing `getEffectiveCost(buildCount)`. |
| `build(buildCount = 1, activate = true)` | Attempts construction and returns `true` on success. Call `super.build(...)` so affordability, land, deposits, storage, counts, and hazards remain correct. |
| `produce(accumulatedChanges, deltaTime)` | Adds this tick's production to `accumulatedChanges`. This is a low-level hook; call `super.produce(...)` unless replacing all normal configured output. |
| `consume(accumulatedChanges, deltaTime, accumulatedSpecialChanges)` | Adds this tick's consumption to the resource accumulators. This is a low-level hook; call `super.consume(...)` unless replacing the complete configured-consumption path. |
| `saveState()` / `loadState(state = {})` | Serializes and restores state in ordinary saves. Merge the result of `super.saveState()` and call `super.loadState(state)` first. |

For example, this building is hidden on rogue worlds, is capped at 25 copies, and receives an additional configured production multiplier:

```js
class CappedFluxRefineryBuilding extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.fluxProductionMultiplier = config.fluxProductionMultiplier;
  }

  isVisible() {
    return !currentPlanetParameters.celestialParameters.rogue
      && super.isVisible();
  }

  getBuildLimit() {
    return Math.min(super.getBuildLimit(), 25);
  }

  getEffectiveProductionMultiplier() {
    return super.getEffectiveProductionMultiplier()
      * this.fluxProductionMultiplier;
  }
}
```

Use `getEffectiveCostMultiplier(resourceCategory, resourceId)` when only one construction resource needs special scaling:

```js
getEffectiveCostMultiplier(resourceCategory, resourceId) {
  const multiplier =
    super.getEffectiveCostMultiplier(resourceCategory, resourceId);

  if (resourceCategory === 'colony' && resourceId === 'metal') {
    return multiplier * 0.5;
  }

  return multiplier;
}
```

Custom building state follows the same save pattern as project state:

```js
saveState() {
  return {
    ...super.saveState(),
    overdriveEnabled: this.overdriveEnabled
  };
}

loadState(state = {}) {
  super.loadState(state);
  this.overdriveEnabled = state.overdriveEnabled === true;
}
```

#### Building UI methods

The building UI calls three optional hooks. `Building` itself does not provide base implementations for them, so do not blindly call `super.initUI()` or `super.updateUI()`. Call a UI method on `super` only when the class you directly extend implements it.

| Signature | When it is called |
| --- | --- |
| `initializeCustomUI(context = {})` | Called once while the main Controls column is built. `context` contains `leftContainer`, `hideButton`, and `cachedElements`. Use it for controls that belong beside the standard Hide action. |
| `initUI(autoBuildContainer, cachedElements)` | Called once after the standard automation controls are built. Use it to create custom status or automation elements. |
| `updateUI(cachedElements)` | Called during the generic building-row refresh. Update cached nodes in place and guard unchanged DOM writes. |

`cachedElements` is the stable cache owned by the building row. Store custom nodes on it instead of querying the document during each update:

```js
class FluxStatusBuilding extends Building {
  initUI(autoBuildContainer, cachedElements) {
    const status = document.createElement('span');
    status.classList.add('flux-refinery-status');
    autoBuildContainer.appendChild(status);
    cachedElements.fluxStatus = status;
  }

  updateUI(cachedElements) {
    const status = cachedElements.fluxStatus;
    const multiplier = this.getEffectiveProductionMultiplier();
    const text = t(
      'ui.authorFluxIndustry.outputMultiplier',
      { multiplier: formatNumber(multiplier, false, 2) },
      'Output: x{multiplier}'
    );

    if (status.textContent !== text) {
      status.textContent = text;
    }
  }
}
```

Use `initializeCustomUI(context)` instead when the element is an action button:

```js
initializeCustomUI({ leftContainer, cachedElements }) {
  const buildingName = this.name;
  const button = document.createElement('button');
  button.textContent = t(
    'ui.authorFluxIndustry.ventFlux',
    null,
    'Vent Flux'
  );
  button.addEventListener(
    'click',
    () => buildings[buildingName].ventFlux()
  );
  leftContainer.appendChild(button);
  cachedElements.ventFluxButton = button;
}
```

### Custom project with saved state

```js
class FluxCalibrationProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.customCompletionCount = 0;
  }

  complete() {
    super.complete();
    this.customCompletionCount += 1;
    const reward =
      this.attributes.customMetalReward * this.customCompletionCount;
    resources.colony.metal.increase(reward);
  }

  saveState() {
    return {
      ...super.saveState(),
      customCompletionCount: this.customCompletionCount
    };
  }

  loadState(state) {
    super.loadState(state);
    this.customCompletionCount = state.customCompletionCount || 0;
  }
}

registerProjectConstructor(
  'author.flux-industry.FluxCalibrationProject',
  FluxCalibrationProject
);
```

Select it as type in project parameters:

```json
{
  "entries": {
    "authorFluxIndustry_fluxCalibration": {
      "type": "author.flux-industry.FluxCalibrationProject",
      "name": "",
      "category": "infrastructure",
      "description": "",
      "cost": {
        "colony": {
          "metal": 100,
          "energy": 1000000
        }
      },
      "duration": 10000,
      "repeatable": true,
      "maxRepeatCount": {
        "$number": "Infinity"
      },
      "unlocked": true,
      "attributes": {
        "customMetalReward": 25
      }
    }
  }
}
```

Constructor registration is strict. An unknown parameter `type` or a duplicate type registered to a different constructor stops initialization with an error. A namespaced type such as `author.flux-industry.FluxCalibrationProject` avoids collisions with the game and other mods.

The complete, tested pattern is in [`examples/local-mods/custom-classes`](../../examples/local-mods/custom-classes/).

### Common project methods

Projects have a timed logic lifecycle and optional UI hooks. The manager calls `update(deltaTime)` for every relevant project, including inactive and completed projects, so custom update logic must check the state it needs.

#### Project logic methods

| Signature | Purpose and return value |
| --- | --- |
| `constructor(config, name)` | Runs during game initialization. Call `super(config, name)` first, then declare all custom state and UI caches. |
| `isVisible()` | Returns whether the project card should be rendered. Combine custom conditions with `super.isVisible()`. |
| `canStart()` | Returns whether the project can start or resume. Call `super.canStart()` first to retain unlock, completion, hazard, cost, and resource checks. |
| `getEffectiveCostMultiplier(resourceCategory, resourceId)` | Returns the multiplier for one resource in the base project cost. Multiply the value from `super` to retain ordinary effects and megaproject difficulty scaling. |
| `getEffectiveCost(buildCount = 1)` | Returns cost after per-resource effects. Prefer overriding `getEffectiveCostMultiplier(...)` or `getScaledCost()` unless the complete cost shape is custom. |
| `getScaledCost()` | Returns the cost used to start the next run, including repeat-count scaling. Call `super.getScaledCost()` and transform the returned object. |
| `getBaseDuration()` | Returns the duration before active duration multipliers. Call `super.getBaseDuration()` and apply the custom factor. Durations are milliseconds. |
| `getWarningState()` | Returns `null` or `{ blocksStart, blocksProgress, message, statusText }`. The base start/update logic and generic project UI both consume this state. |
| `start(resources)` | Attempts to start and returns a boolean. Call `super.start(resources)` before applying effects that should occur only after a successful start. |
| `update(deltaTime)` | Called from the simulation loop with elapsed milliseconds. Call `super.update(deltaTime)` to retain timed progress, sustain costs, pausing, hazards, and completion. Never update the DOM here.  This one is particularly useful if you just want your project to manage certain things every tick.  It runs regardless of whether or not the project has been started or is completed.  Some projects do not need an update() method at all, for example if they only have completion effects.|
| `complete()` | Runs when progress finishes. Call `super.complete()` to retain repeat handling, configured resource gains, completion effects, and story steps. |
| `resetProject()` | Resets a repeatable project for another run. Call `super.resetProject()` before adding custom reset state. |
| `saveState()` / `loadState(state)` | Serializes and restores ordinary save state. Extend the object returned by `super.saveState()` and call `super.loadState(state)`. |
| `saveTravelState()` / `loadTravelState(state = {})` | Serializes only the state that should survive planet travel. This is separate from ordinary save/load state. |

Add a custom start condition with `canStart()`:

```js
canStart() {
  if (!super.canStart()) {
    return false;
  }

  return resources.special.guideCrystals.value >= 10;
}
```

If the condition should also explain itself in the generic card, use `getWarningState()` instead. The base `canStart()` method consumes this state, so a separate `canStart()` override is unnecessary for this blocker:

```js
getWarningState() {
  if (resources.special.guideCrystals.value >= 10) {
    return null;
  }

  return {
    blocksStart: true,
    blocksProgress: false,
    message: t(
      'ui.authorFluxIndustry.needCrystals',
      null,
      'At least 10 crystals are required to begin calibration.'
    ),
    statusText: t(
      'ui.authorFluxIndustry.blockedByCrystals',
      null,
      'Blocked: requires 10 crystals'
    )
  };
}
```

`blocksStart` is checked by `canStart()`. `blocksProgress` pauses the countdown without cancelling the project. `message` appears in the warning row, while `statusText` replaces the normal progress-button text when supplied.

Use the return value from `super.start(resources)` before applying a start-side effect:

```js
start(resources) {
  const started = super.start(resources);
  if (!started) {
    return false;
  }

  this.timesStarted += 1;
  return true;
}
```

Add per-tick logic without bypassing standard project progress:

```js
update(deltaTime) {
  super.update(deltaTime);

  if (!this.isActive) {
    return;
  }

  this.activeTime += deltaTime;
}
```

To change duration while retaining all normal modifiers.:

```js
getBaseDuration() {
  const duration = super.getBaseDuration();
  return duration / Math.max(this.calibrationSpeed, 1);
}
```

#### Project UI methods

`Project` does not define base `renderUI()`, `renderAutomationUI()`, or `updateUI()` methods. Call the corresponding `super` method only if you extend a class that does.

| Signature | When it is called |
| --- | --- |
| `renderUI(container)` | Called once when the project card body is created. Append the project's static custom layout to `container` and cache every node needed later. |
| `renderAutomationUI(container)` | Called once when the generic Automation settings container is created (this is the footer below the project that persists when collapsed). Add project-specific automation controls here. |
| `updateUI()` | Called after the generic project UI refresh. Read simulation state and update cached nodes in place. |
| `shouldHideStartBar()` | Returns whether the generic cost/progress controls should be hidden for a fully custom project interface. The default is `false`. |

Declare the UI cache in the constructor so project-instance rebinding across load and travel can preserve it:

```js
class FluxMonitorProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.el = {};
  }

  renderUI(container) {
    const section = document.createElement('div');
    section.classList.add('project-section-container');

    const label = document.createElement('strong');
    label.textContent = t(
      'ui.authorFluxIndustry.storedFlux',
      null,
      'Stored Flux'
    );

    const value = document.createElement('span');
    section.append(label, ': ', value);
    container.appendChild(section);

    this.el.storedFlux = value;
  }

  updateUI() {
    const value = this.el.storedFlux;
    const text = formatNumber(resources.special.guideCrystals.value, true);
    if (value.textContent !== text) {
      value.textContent = text;
    }
  }
}
```

The generic project renderer creates and updates the normal name, description, cost, gain, progress, warning, and automation controls. A custom `renderUI(container)` should add only the project-specific portion unless the class deliberately returns `true` from `shouldHideStartBar()`.

### Class lifecycle rules

Custom subclasses participate in normal new-game, save/load, and planet-travel reconstruction.

- Call `super(config, id)` first in the constructor.
- Initialize every custom property in the constructor.
- Call the base implementation when overriding lifecycle methods such as `saveState()` and `loadState()`.
- Give newly added save properties a sensible default for older saves.
- Keep simulation methods free of DOM work.
- Build or update UI through the class's established render/update hooks.
- Cache UI elements and reconcile them in place; do not rebuild identical DOM every update tick.
- If a class holds cached UI references, declare those properties before `renderUI()` populates them so travel-time card rebinding uses the current instance correctly.  Otherwise this will cause churn and memory leaks.

The base implementations are the authoritative API references:

- [`Building`](../../src/js/building.js)
- [`Project` and `ProjectManager`](../../src/js/projects.js)
- Built-in specialized buildings under [`src/js/buildings`](../../src/js/buildings/)
- Built-in specialized projects under [`src/js/projects`](../../src/js/projects/)

Treat undocumented globals and internal methods as unstable. Prefer a small subclass override over copying a large core class.

### Tooltips and custom UI

The game has a built-in dynamic tooltip setup.  This is the text that appears when hovering certain things.  It is recommended to use this over browser tooltips.

```js
const infoIcon = document.createElement('span');
infoIcon.className = 'info-tooltip-icon';
infoIcon.innerHTML = '&#9432;';

attachDynamicInfoTooltip(
  infoIcon,
  t(
    'ui.authorFluxIndustry.fluxTooltip',
    null,
    'Flux increases this refinery’s production.'
  )
);
```

Add the corresponding text to the mod's language patch:

```json
{
  "ui": {
    "authorFluxIndustry": {
      "fluxTooltip": "Flux increases this refinery’s production."
    }
  }
}
```

Create and attach the icon once while building the UI. Cache it with the owning card and update existing text, classes, attributes, and styles only when their desired values change. Repeatedly clearing and rebuilding a panel in an update hook causes focus loss, tooltip bugs, and unnecessary DOM churn.

## Styles and assets

Declare every additive stylesheet and every media file it uses:

```json
{
  "content": {
    "styles": [
      "styles/flux-industry.css"
    ],
    "assets": [
      "assets/flux-badge.svg",
      "assets/flux-hum.ogg"
    ]
  }
}
```

Supported asset extensions are:

```text
.avif .gif .ico .jpeg .jpg .mp3 .mp4 .ogg .otf .png .svg .ttf
.wav .webm .webp .woff .woff2
```

JavaScript and CSS are not assets; declare them under `scripts` and `styles`.

CSS can use a normal relative URL:

```css
[data-project-name="authorFluxIndustry_fluxCalibration"] .card-header {
  background-image: url("../assets/flux-badge.svg");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5rem 1.5rem;
  padding-right: 2.5rem;
}
```

Script code can resolve a declared asset without knowing its generated virtual URL:

```js
const badgeUrl = getModAssetUrl(
  'author.flux-industry',
  'assets/flux-badge.svg'
);
```

`getModAssetUrl` throws if either the mod id is not active or the exact file path was not declared in that mod's `assets` array.

Mod content is served through exact `tt-game://app/__mods__/...` mappings. The renderer never receives the physical local or Workshop folder path.

## File replacements

Replacement is modding at its full power.  You can replace entire files from the game.  Use at your own risk.

```json
{
  "content": {
    "replacements": [
      {
        "gamePath": "src/js/debug_constants.js",
        "file": "replacements/src/js/debug_constants.js"
      }
    ]
  }
}
```

Permitted replacement roots are:

- `src/js/`
- `src/css/`
- `assets/`

Protected content includes:

- `index.html`
