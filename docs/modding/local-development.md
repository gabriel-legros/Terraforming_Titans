# Mod Development

The Terraforming Titans mod loader supports additive constructor scripts, styles, media assets, complete renderer-file replacements, and declarative JSON patches from both local development folders and subscribed Steam Workshop items. A pre-game launcher controls the active mod loadout and starting save, and opens Creator Tools for Workshop publishing. Cross-mod dependencies and save isolation are not implemented yet.

## Launch control

Electron starts in the Launch Control window before creating the game renderer. The launcher:

- Defaults to the newest valid save and also offers every valid slot and New Game.
- Keeps invalid JSON saves visible but prevents selecting them.
- Enables or disables installed local and Workshop mods without changing Workshop subscriptions.
- Reorders mods with drag-and-drop or the arrow buttons. The top mod loads first; lower mods load later and win conflicts.
- Displays Workshop installation progress and prevents launching while Steam is actively resolving subscriptions.

The saved loadout is `mods/loadout.json` under Electron's user-data directory. New mods are enabled by default and appended after the player's existing configured mods. The manifest's numeric `loadOrder` controls initial/default order only; after the player saves a custom list, launcher order is authoritative. Mod and save choices are fixed for the launched game session, so changing them requires restarting the game.

## Creator Tools

Open **Creator Tools** from the launcher. Publishing uses the signed-in Steam client through ISteamUGC; creators never enter Steam credentials or use SteamCMD.

1. Put the finished mod in the Local Mods folder and select it in Creator Tools.
2. Fix any manifest, patch, or replacement validation error shown by the tool.
3. Choose **Create a new Workshop item**, enter the title and description, choose visibility, and select a PNG, JPEG, or GIF preview image smaller than 1 MB. Creator Tools rejects an oversized preview before creating or updating a Steam item.
4. Select **Create & Upload**. The tool creates the Workshop item, records its ID, uploads the complete mod folder, and opens its Workshop page.
5. Accept the Steam Workshop legal agreement if Steam requests it. An item remains hidden until its author accepts the agreement.

For later releases, select the linked item, enter a change note, and choose **Update Workshop Item**. A new preview image is optional when updating. Creator Tools lists every item published by the signed-in Steam account for the current AppID, so an existing item can also be selected and linked to a local mod. Destructive management such as deleting an item remains on the Steam Workshop item page, opened with **Open Workshop Item**.

Creator links are stored outside the uploaded mod in `mods/creator-items.json` under Electron's user-data directory. This prevents machine-specific publishing data from entering Workshop content. Creator Tools never exposes absolute local or Workshop filesystem paths to renderer code.

Publishing targets the AppID of the running build. A production build publishes to the production Workshop; a Playtest build publishes to the Playtest Workshop. Uploading requires a packaged Steam build launched through Steam. Steam Family Sharing and temporary licenses cannot publish Workshop items.

## Steam Workshop subscriptions

Before uploads or downloads can work, enable **ISteamUGC for file transfer** under the app's Steam Workshop Configuration, configure the Steam Cloud quotas required by Workshop, and publish both configuration changes in Steamworks. Uploading an item alone does not enable client file transfer.

Steam builds automatically consume the current user's subscribed items at launch. The game:

1. Enumerates subscriptions for the game's AppID through Steamworks.
2. Requests a high-priority download for every missing or outdated item.
3. Waits up to 30 seconds for all pending downloads as one batch.
4. Loads only items Steam reports as fully installed and current.

Each Workshop item's content folder must contain `terraforming-titans.mod.json` at its root, using the same format as a local mod. A download that is still pending after the startup window is skipped for that session and retried on the next launch. Invalid Workshop mods are also skipped without changing their installed files.

The game does not guess Steam's library path. It uses `GetItemInstallInfo`, so subscriptions work across additional Steam library drives. Workshop mods participate in the same `loadOrder` and id ordering as local mods. If two loaded folders declare the same mod id, the first one is used and the duplicate is reported as an error.

## Mod folders

For local development, the Electron build scans these locations in order:

1. `TERRAFORMING_TITANS_MODS_DIR`, when set.
2. The `mods/local` folder under Electron's user-data directory.
3. `local-mods` in the repository when running unpackaged Electron.

Every direct child folder is treated as one discovered local mod. Folders beginning with `_` or `.` are ignored. Newly discovered mods default to enabled and use numeric `loadOrder`, then manifest id, for their initial order. The launcher can override both enabled state and order. Later replacements and patch values win.

For a quick test, copy a folder from `examples/local-mods` into `local-mods`. Launching Electron with `TERRAFORMING_TITANS_MODS_DIR` pointing at `examples/local-mods` enables all bundled examples together.

## Manifest

Each mod requires `terraforming-titans.mod.json`:

```json
{
  "schemaVersion": 1,
  "id": "author.my-mod",
  "name": "My Mod",
  "version": "1.0.0",
  "loadOrder": 0,
  "content": {
    "scripts": [],
    "styles": [],
    "assets": [],
    "patches": [],
    "replacements": []
  }
}
```

Ids use 3-80 lowercase letters, numbers, dots, underscores, or hyphens.

## Custom classes and additive files

Constructor scripts let a mod add new project and building subclasses without replacing a core game file. Scripts are classic browser scripts: do not use imports or exports. Declare each script with the `constructors` stage:

```json
{
  "scripts": [
    {
      "file": "scripts/SolarFoundryProject.js",
      "stage": "constructors"
    }
  ]
}
```

Constructor scripts run in active launcher order and then manifest order. The game loads them after all built-in constructors and their gameplay dependencies, immediately before `game.js` initializes the game. Within a mod, place a base class before scripts that extend it. Cross-mod dependencies are not currently declared or validated.

Register a namespaced constructor type and select it from the parameter entry's `type` field:

```js
class SolarFoundryProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.customCompletionCount = 0;
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

registerProjectConstructor('author.my-mod.SolarFoundryProject', SolarFoundryProject);
```

Buildings use the matching API:

```js
class SolarFoundryBuilding extends Building {
}

registerBuildingConstructor('author.my-mod.SolarFoundryBuilding', SolarFoundryBuilding);
```

Use namespaced constructor types to avoid registration collisions. Keep parameter entry ids DOM-safe, for example `authorMyMod_solarFoundry`. An unknown constructor type or duplicate registry entry stops initialization with a descriptive error instead of silently creating the base class.

Declare additive styles and every file they reference:

```json
{
  "styles": [
    "styles/solar-foundry.css"
  ],
  "assets": [
    "assets/solar-foundry.png"
  ]
}
```

Styles load after the game's styles and follow active launcher order, so later mods win normal CSS cascade conflicts. Relative CSS URLs work when the referenced asset is declared. Supported assets are images, fonts, audio, and video. JavaScript and CSS must use their dedicated manifest sections.

Script code can resolve a declared asset without knowing its generated virtual URL:

```js
const iconUrl = getModAssetUrl('author.my-mod', 'assets/solar-foundry.png');
```

All additive files are served from exact `tt-game://app/__mods__/...` mappings. Physical local and Workshop paths are never exposed to renderer code. Their content participates in the deterministic mod-session fingerprint.

The complete example under `examples/local-mods/custom-classes` adds a custom-class project and building, persists custom project state, applies additive styling, and loads a declared SVG asset.

## Parameter patches

Declare a patch in the manifest:

```json
{
  "target": "parameters.buildings",
  "file": "patches/buildings.json"
}
```

Then merge stable entry keys in the patch:

```json
{
  "entries": {
    "oreMine": {
      "cost": {
        "colony": {
          "metal": 25
        }
      }
    }
  }
}
```

Objects merge recursively. Scalars and arrays replace the existing value. Use `{ "$delete": true }` to delete a key, `{ "$replace": value }` to replace a whole subtree, and `{ "$number": "Infinity" }` for non-JSON numeric values. `null` is a normal replacement value.

Research patches group stable research ids under their category because the runtime research parameters use category arrays:

```json
{
  "entries": {
    "colonization": {
      "torment_nexus": {
        "cost": { "research": 5000000000 },
        "prerequisites": [],
        "effects": []
      }
    }
  }
}
```

An existing research id is merged in place, while a new id is appended to its category. Use `$delete` on a research id to remove it or `$replace` on a category to replace its complete array.

Supported targets are:

- `language.current`
- `parameters.planetResources`
- `parameters.planets`
- `parameters.specialSeeds`
- `parameters.life`
- `parameters.buildings`
- `parameters.colonies`
- `parameters.orbitals`
- `parameters.projects`
- `parameters.research`
- `parameters.skills`
- `parameters.terraforming`
- `parameters.terraformingRequirements`

Language patches contain the language object directly rather than an `entries` wrapper.

Terraforming patches provide global simulation defaults shared by all worlds. The stable sections are `physical`, `atmosphere`, `geometry`, `phaseChange`, `climate`, `gameplay`, and `hazards`. Keys with units include the unit in their name. World-specific celestial, resource, and hazard overrides remain under `parameters.planets` and `parameters.specialSeeds`.

For example, this changes the global gravity penalty and water condensation defaults:

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

## File replacements

Replacement declarations map an existing logical game path to a file inside the mod:

```json
{
  "gamePath": "src/js/buildings-parameters.js",
  "file": "replacements/src/js/buildings-parameters.js"
}
```

Allowed roots are `src/js`, `src/css`, and `assets`. The Electron main process, preload, `index.html`, vendor libraries, build metadata, and the packaged mod runtime are protected. Replacement files are served through the `tt-game://app` overlay; installed game files are never modified.

Patches are applied after the winning replacement file executes, so a full parameter-file replacement can still receive later mods' JSON patches. A replacement parameter file must continue to define the same required global.

## Trust and lifecycle requirements

Additive JavaScript and JavaScript replacements execute as full-trust game renderer code. Install code mods only from authors you trust. Electron keeps Node integration disabled, context isolation and the renderer sandbox enabled, and Electron/preload files outside the mod overlay.

Custom classes must follow the base class save, load, reset, and travel contracts. Call the base `saveState()` and `loadState()` when adding persistent properties. A project with cached UI references must declare those properties in its constructor before `renderUI()` fills them so travel-time card rebinding does not discard current-instance state.

## Diagnostics

The renderer exposes the read-only session as `activeModSession` in DevTools. It lists active mods, their `local` or `workshop` source, validation errors, replacement conflicts, the deterministic session fingerprint, and Workshop download state under `activeModSession.workshop`. Invalid mods are skipped and reported there. Restart Electron after changing a local mod file or changing Workshop subscriptions.
