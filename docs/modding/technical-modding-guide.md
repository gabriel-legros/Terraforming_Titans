# Terraforming Titans Technical Modding Guide

This guide is for both first-time mod authors and JavaScript developers who want to extend Terraforming Titans. It covers the supported Electron/Steam mod loader, from a one-file balance patch to custom `Building` and `Project` subclasses.

For maintainer-facing loader behavior and Workshop setup, see [Local Mod Development](local-development.md). Working examples live under [`examples/local-mods`](../../examples/local-mods/).

## Contents

- [Quick start: make an ore mine patch](#quick-start-make-an-ore-mine-patch)
- [Manifest reference](#manifest-reference)
- [JSON patch semantics](#json-patch-semantics)
- [Supported patch targets](#supported-patch-targets)
- [Localization](#localization)
- [Example: add a resource, building, and research](#example-add-a-resource-building-and-research)
- [Additive scripts and custom classes](#additive-scripts-and-custom-classes)
- [Styles and assets](#styles-and-assets)
- [File replacements](#file-replacements)
- [Save and compatibility design](#save-and-compatibility-design)
- [Diagnostics](#diagnostics)
- [Testing checklist](#testing-checklist)
- [Steam Workshop publishing](#steam-workshop-publishing)
- [Security model](#security-model)
- [Bundled examples](#bundled-examples)

## What mods can change

The current mod API supports:

- Declarative JSON patches for language data and supported parameter objects.
- New resources, buildings, projects, research, planets, skills, and other parameter-driven content.
- Additive classic JavaScript files for custom building and project constructors.
- Additive CSS and declared image, font, audio, or video assets.
- Complete replacement of permitted renderer files.
- Local development folders and Steam Workshop subscriptions.

Mods run only in the Electron/Steam build. The browser build has no filesystem-backed mod catalog and starts with an empty `activeModSession`.

There are two important limits:

- Cross-mod dependencies are not declared or resolved.
- Saves are not isolated by mod loadout.

Back up an important save before testing a changing loadout. Removing a content mod can leave save data referring to content that no longer exists.

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

This example changes the Ore Mine's metal cost to `5` and marks its name so the result is easy to see.

### 1. Create the folder

When running the repository's unpackaged Electron app, create:

```text
local-mods/
└── guide.cheaper-ore-mine/
    ├── terraforming-titans.mod.json
    └── patches/
        ├── buildings.json
        └── language.json
```

In a packaged build, use **Open Local Mods** in Launch Control and create the same mod folder there.

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

Objects merge recursively, so this changes only `oreMine.cost.colony.metal`. Every unmentioned Ore Mine property keeps its base-game value.

### 4. Patch the localized name

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

Language patches contain the language object directly. Do not wrap them in `entries`.

### 5. Launch and verify

From the repository:

```powershell
npm run electron:dev
```

In Launch Control:

1. Refresh the mod list if needed.
2. Enable **Guide: Cheaper Ore Mine**.
3. Launch a new game or a test save.
4. Confirm the card says **Ore Mine (Modded)** and displays the new cost.

Restart Electron after changing a manifest, patch, script, style, or asset. A running game session does not hot-reload mods.

The repository already includes the equivalent complete example at [`examples/local-mods/cheaper-ore-mine`](../../examples/local-mods/cheaper-ore-mine/).

## Mod discovery and local development

Electron scans local mod roots in this order:

1. The directory in `TERRAFORMING_TITANS_MODS_DIR`, when set.
2. `mods/local` under Electron's user-data directory.
3. The repository's `local-mods` directory when Electron is unpackaged.

Each direct child directory is one mod. A nested directory is not discovered as a separate mod. Directory names beginning with `.` or `_` are ignored.

For a separate development workspace in PowerShell:

```powershell
$env:TERRAFORMING_TITANS_MODS_DIR = "C:\Modding\TerraformingTitans"
npm run electron:dev
```

Do not keep two discovered copies with the same manifest id. Duplicate ids are reported and only one copy can be active.

New mods initially sort by numeric `loadOrder` and then manifest id. Once the player saves a custom order in Launch Control, that launcher order is authoritative. Changing `loadOrder` does not override an existing saved order.

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
| `schemaVersion` | Must currently be the number `1`. |
| `id` | 3-80 lowercase letters, numbers, dots, underscores, or hyphens. Start with a letter or number. |
| `name` | Required non-empty player-facing string. |
| `version` | Required non-empty string. Semantic versioning is recommended but not enforced. |
| `loadOrder` | Optional finite number; defaults to `0`. It controls only initial/default ordering. |
| `content.scripts` | Optional array of `{ "file", "stage" }` objects. The only current stage is `constructors`. |
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

Non-language parameter patches normally use an `entries` object:

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

The keys `__proto__`, `prototype`, and `constructor` are rejected anywhere in patch JSON.

### Delete a property

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

For example, an indefinitely repeatable project can use:

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

### Replace an entire patch target

This is intentionally high-risk because it removes every base-game entry from that target:

```json
{
  "entries": {
    "$replace": {
      "onlyEntry": {
        "value": 1
      }
    }
  }
}
```

Prefer stable-key merges unless the mod deliberately owns the whole target.

## Supported patch targets

Use the source file in the last column as the current parameter-shape reference. Copy the smallest relevant entry and patch only the fields your mod owns.

| Target | Purpose | Current source of truth |
| --- | --- | --- |
| `language.current` | UI, catalogs, story, and other localized text | [`src/js/lang/current-language.js`](../../src/js/lang/current-language.js) and [`story-language.js`](../../src/js/lang/story-language.js) |
| `parameters.terraforming` | Global simulation defaults | [`terraforming-parameters.js`](../../src/js/terraforming/terraforming-parameters.js) |
| `parameters.planetResources` | Default resource definitions | [`planet-resource-parameters.js`](../../src/js/planet-resource-parameters.js) |
| `parameters.planets` | Planet and world definitions | [`planet-parameters.js`](../../src/js/planet-parameters.js) |
| `parameters.specialSeeds` | Special random-world seed definitions | [`special-seeds.js`](../../src/js/special-seeds.js) |
| `parameters.life` | Life Designer parameters | [`life-parameters.js`](../../src/js/life-parameters.js) |
| `parameters.buildings` | Building definitions | [`buildings-parameters.js`](../../src/js/buildings-parameters.js) |
| `parameters.colonies` | Colony definitions | [`colony-parameters.js`](../../src/js/colony-parameters.js) |
| `parameters.orbitals` | Orbital definitions | [`orbital-parameters.js`](../../src/js/colony/orbital-parameters.js) |
| `parameters.projects` | Project definitions | [`project-parameters.js`](../../src/js/project-parameters.js) |
| `parameters.research` | Research definitions grouped by category | [`research-parameters.js`](../../src/js/research-parameters.js) |
| `parameters.skills` | Skill definitions | [`skills-parameters.js`](../../src/js/skills-parameters.js) |
| `parameters.terraformingRequirements` | Terraforming victory requirements | [`terraforming-requirements.js`](../../src/js/terraforming/terraforming-requirements.js) |

Patch targets are fixed. A manifest using an unrecognized target is invalid.

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

The runtime stores research categories as arrays, but research patches address entries by stable id:

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

Replacing a category is highly incompatible with other mods and future game updates.

## Localization

Player-facing names and descriptions should live in a `language.current` patch, not in parameter data. Parameter entries commonly use an empty string until localization is applied:

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

Use [`current-language.js`](../../src/js/lang/current-language.js) for shared game and UI text and [`story-language.js`](../../src/js/lang/story-language.js) for story text. A translation mod may declare more than one `language.current` patch; they are merged in manifest order.

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

Use a custom class only when parameter data cannot express the behavior. Constructor scripts are classic browser scripts:

- Do not use `import` or `export`.
- Do not assume Node APIs are available.
- Use game globals already loaded before the `constructors` marker.
- Put scripts in dependency order inside the manifest.
- Namespace every registered type with your mod id.

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

Select the registered type from the building parameter entry:

```json
{
  "entries": {
    "authorFluxIndustry_fluxRefinery": {
      "type": "author.flux-industry.FluxRefineryBuilding",
      "fluxProductionMultiplier": 1.5
    }
  }
}
```

The abbreviated patch above assumes the rest of the required building fields already exist. For a new building, include the full shape shown in the earlier building example or copy a current compatible entry.

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

Select it in project parameters:

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

Constructor registration is strict. An unknown parameter `type` or a duplicate type registered to a different constructor stops initialization with an error. A namespaced type such as `author.flux-industry.FluxCalibrationProject` avoids collisions.

The complete, tested pattern is in [`examples/local-mods/custom-classes`](../../examples/local-mods/custom-classes/).

### Class lifecycle rules

Custom subclasses participate in normal new-game, save/load, and planet-travel reconstruction.

- Call `super(config, id)` first in the constructor.
- Initialize every custom property in the constructor.
- Call the base implementation when overriding lifecycle methods such as `saveState()` and `loadState()`.
- Give newly added save properties a sensible default for older saves.
- Keep simulation methods free of DOM work.
- Build or update UI through the class's established render/update hooks.
- Cache UI elements and reconcile them in place; do not rebuild identical DOM every update tick.
- If a class holds cached UI references, declare those properties before `renderUI()` populates them so travel-time card rebinding uses the current instance correctly.

The base implementations are the authoritative API references:

- [`Building`](../../src/js/building.js)
- [`Project` and `ProjectManager`](../../src/js/projects.js)
- Built-in specialized buildings under [`src/js/buildings`](../../src/js/buildings/)
- Built-in specialized projects under [`src/js/projects`](../../src/js/projects/)

Treat undocumented globals and internal methods as unstable. Prefer a small subclass override over copying a large core class.

### Tooltips and custom UI

Use the shared dynamic tooltip for mod-created help text. Create an attached info icon and localize its text:

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

Replacements map an existing logical renderer path to a file in the mod:

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
- `package.json`
- `src/js/build-target.js`
- `src/js/game-version.js`
- Everything under `electron/`
- Everything under `vendor/`
- Everything under `src/js/modding/`
- The generated `__mods__/` namespace

Installed game files are never overwritten. The trusted Electron protocol serves the winning replacement when the game requests that logical path.

If several enabled mods replace the same path, the later mod wins and the conflict appears in `activeModSession.conflicts`. JSON patches still apply after a winning replacement's parameter file executes, so a replacement must define the required global expected by its patch stage.

Replacements are the least compatible extension mechanism. They take ownership of a complete file and can miss upstream fixes or collide with another mod. Prefer a parameter patch or additive constructor whenever possible.

## Save and compatibility design

Mods share the base game's save format. There is no per-mod save namespace and the active loadout is not embedded as an enforced dependency set.

For safer updates:

- Keep manifest ids, parameter ids, constructor type ids, and saved property names stable.
- Namespace new ids to avoid collisions.
- Add fields compatibly instead of renaming or removing them.
- Default missing custom state when loading an older save.
- Do not reuse an old id for unrelated content.
- Test new game, save/load, travel away, and travel back.
- Test disabling the mod against a backup save.
- Document breaking changes in the Workshop change note.

Parameter ids can become DOM keys or selectors. Use DOM-safe ids containing letters, digits, `_`, and `-`, and start with a letter. Constructor type ids are not DOM ids and should use the full manifest namespace.

Active mods do not disable Steam achievement publication.

## Diagnostics

### Launch Control and Creator Tools

Launch Control displays invalid discovered mods and their validation errors. Creator Tools also validates a selected local mod even when Workshop publishing is unavailable.

Typical validation failures include:

- A missing or malformed manifest.
- An id that does not match the required lowercase format.
- Invalid JSON.
- An unsupported patch target or script stage.
- A missing declared file.
- An absolute path or a path containing `..`.
- An unsupported file extension.
- A protected or out-of-scope replacement path.
- A forbidden patch key.

### DevTools

Open Electron DevTools and inspect the read-only diagnostic global:

```js
activeModSession
```

Useful fields include:

```js
activeModSession.mods
activeModSession.errors
activeModSession.conflicts
activeModSession.replacements
activeModSession.fingerprint
activeModSession.workshop
```

Each active mod entry identifies its id, version, source (`local` or `workshop`), Workshop id when applicable, content hash, and declared script/style/asset virtual URLs. The session fingerprint changes when active mod identity, order, version, or declared content changes.

Keep console logging compact. Logging large live manager, save, or patch graphs can retain those object graphs in an attached DevTools session and distort memory investigation.

### Runtime failures

If validation succeeds but the game fails during initialization:

1. Check the DevTools console for the first error.
2. Confirm every new parameter entry matches a current entry of the same kind.
3. Confirm every custom `type` is registered before `game.js`.
4. Confirm the constructor type string exactly matches the registration string.
5. Disable other mods to rule out load-order conflicts.
6. Re-enable mods from top to bottom until the conflict returns.
7. Test a new game to distinguish initialization errors from old-save migration errors.

## Testing checklist

Before publishing:

- Launch with only the mod enabled.
- Launch with the mod last and first among likely compatibility partners.
- Start a new game.
- Load a save created before the mod was installed.
- Save, restart, and load again.
- Travel away from and back to a world affected by the mod.
- Exercise repeatable projects and custom saved state.
- Verify localized names, descriptions, costs, resource-rate source labels, and tooltips.
- Check every supported theme if the mod adds CSS.
- Check DevTools for errors.
- Verify every CSS, audio, font, and image reference is declared in `assets`.
- Increment the manifest version for the release.
- Test the exact folder that will be uploaded, not a separate working copy.

The repository's Jest suite tests the game, but there is no general semantic validator for arbitrary mod parameter data. A clean Launch Control validation is necessary, not sufficient.

## Steam Workshop publishing

Open **Creator Tools** from Launch Control. Publishing uses the signed-in Steam client; it does not ask for Steam credentials or use SteamCMD.

For a new item:

1. Select the validated local mod.
2. Choose **Create a new Workshop item**.
3. Enter its title and description.
4. Choose visibility.
5. Select a PNG, JPEG, or GIF preview smaller than 1 MB.
6. Choose **Create & Upload**.
7. Accept the Steam Workshop legal agreement on the opened item page if required.

For an update, select the linked item, enter a change note, and choose **Update Workshop Item**. A new preview is optional.

Publishing requires a packaged Steam build launched through Steam. It targets the AppID of that running build, so production and Playtest Workshop items are separate. Family Sharing and temporary licenses cannot publish.

Creator-to-item links stay in the game's user-data `mods/creator-items.json` and are not uploaded. The entire selected mod folder is uploaded as Workshop content, so remove private notes, source archives, and unrelated large files before publishing.

See [Local Mod Development](local-development.md#creator-tools) for Steamworks configuration and subscription download behavior.

## Security model

JSON-only mods are data, but additive JavaScript and JavaScript replacements execute as full-trust game renderer code. Install code mods only from authors you trust.

Electron still keeps:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`

Mods cannot replace the Electron main process, preload, mod runtime, `index.html`, or vendor code. These boundaries protect the application shell, but they do not make untrusted renderer JavaScript harmless. A code mod can read and change game state available to the renderer.

## Bundled examples

| Example | Demonstrates |
| --- | --- |
| [`cheaper-ore-mine`](../../examples/local-mods/cheaper-ore-mine/) | Small building and language patches plus a renderer-file replacement. |
| [`torment-nexus`](../../examples/local-mods/torment-nexus/) | A new resource, building, research, effects, and localization. |
| [`custom-classes`](../../examples/local-mods/custom-classes/) | Custom building/project classes, saved project state, CSS, and an SVG asset. |
| [`english-translation`](../../examples/local-mods/english-translation/) | A complete language pack structure. |
| [`ai-french-translation`](../../examples/local-mods/ai-french-translation/) | A second full language-pack example. |
| [`lorem-ipsum-language`](../../examples/local-mods/lorem-ipsum-language/) | Language replacement for visual testing. |

Start from the smallest example that matches the feature you need. Copying a large parameter file or class creates unnecessary maintenance work and makes compatibility harder.
