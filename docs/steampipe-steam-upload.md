# Terraforming Titans Steam Upload Notes

## Target
Use this for the production Steam app, not the Playtest app.

- App: `Terraforming Titans`
- AppID: `4864000`
- Build script: `scripts/build-steam.sh`
- Build output: `dist/steam-win-unpacked`

The production Steam build script temporarily writes:

```js
const GAME_BUILD_TARGET = 'steam';
const STEAM_APP_ID = 4864000;
```

into `src/js/build-target.js` for packaging, then restores the source file. The packaged `resources/app/src/js/build-target.js` keeps those Steam values so `electron/main.cjs` initializes Steamworks against AppID `4864000`.

## Build
From the repo root:

```powershell
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && bash scripts/build-steam.sh"
```

Upload only the generated Electron runtime from:

```text
dist\steam-win-unpacked
```

Do not upload `dist\steam-playtest-win-unpacked` to the production app.
