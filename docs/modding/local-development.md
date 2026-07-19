# Mod Development

The Terraforming Titans mod loader supports complete renderer-file replacements and declarative JSON patches from both local development folders and subscribed Steam Workshop items. In-game publishing, additive scripts, additive styles, dependencies, save isolation, and the Mods UI are not implemented yet.

## Steam Workshop subscriptions

Before downloads can work, enable **ISteamUGC for file transfer** under the app's Steam Workshop Configuration, configure the Steam Cloud quotas required by Workshop, and publish both configuration changes in Steamworks. Uploading an item alone does not enable client file transfer.

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

Every direct child folder is treated as one enabled local mod. Folders beginning with `_` or `.` are ignored. Loaded mods are ordered by numeric `loadOrder`, then by manifest id. Later replacements and patch values win.

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
    "patches": [],
    "replacements": []
  }
}
```

Ids use 3-80 lowercase letters, numbers, dots, underscores, or hyphens.

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
- `parameters.skills`
- `parameters.terraformingRequirements`

Language patches contain the language object directly rather than an `entries` wrapper.

## Generated Lorem ipsum language

Run the deterministic language generator with:

```powershell
npm run mod:generate-lorem
```

It evaluates the repository-owned `src/js/lang/current-language.js`, recursively replaces every string leaf, and writes the ready-to-load mod under `examples/local-mods/lorem-ipsum-language`. It preserves interpolation tokens such as `{value}` in their original order, changes empty and placeholder-only strings as well, and uses `la` for `meta.code` so the document language remains valid. Re-running the command updates the generated patch after localization keys change.

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

## Diagnostics

The renderer exposes the read-only session as `activeModSession` in DevTools. It lists active mods, their `local` or `workshop` source, validation errors, replacement conflicts, the deterministic session fingerprint, and Workshop download state under `activeModSession.workshop`. Invalid mods are skipped and reported there. Restart Electron after changing a local mod file or changing Workshop subscriptions.
