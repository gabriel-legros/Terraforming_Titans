# Local Mod Development

The local loader is the first development slice of the Terraforming Titans mod system. It supports complete renderer-file replacements and declarative JSON patches. Steam Workshop discovery, publishing, additive scripts, additive styles, dependencies, save isolation, and the in-game Mods UI are not implemented yet.

## Mod folders

The Electron build scans these locations in order:

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

The renderer exposes the read-only session as `activeModSession` in DevTools. It lists active mods, validation errors, replacement conflicts, and the deterministic session fingerprint. Invalid mods are skipped and reported there. Restart Electron after changing any mod file.
