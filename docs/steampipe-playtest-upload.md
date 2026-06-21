# Terraforming Titans Playtest SteamPipe Upload Plan

## Goal
Upload a Windows Electron build depot for `Terraforming Titans Playtest` (`AppID 4876760`) using SteamPipe.

The game still runs from `index.html`, but Steam needs an executable launch target. For Steam, use the Electron packaged build from:

`dist/win-unpacked`

Inside the packaged app, the project content should stay limited to the runtime files needed by the game:

- `index.html`
- `assets/`
- `src/js/`
- `vendor/`
- `LICENSES/`
- `electron/`
- `package.json`

The Steam depot itself must include the full generated Electron runtime from `dist/win-unpacked`, including `Terraforming Titans.exe`, DLLs, `.pak` files, locale files, `resources/app/`, and license files. The current Electron package uses `"asar": false`, so the app payload is a loose `resources/app/` directory rather than `resources/app.asar`.

## Open Steamworks Values
We already know:

- Playtest app: `Terraforming Titans Playtest`
- AppID: `4876760`

Still needed from Steamworks:

- Target branch, likely `default` unless we create a private beta branch

Depot:

- Depot ID: `4876761`
- Depot name: `Terraforming Titans Playtest Content`
- Configuration: `All`

## Important Launch Setup
Steam should launch the Electron executable from the installed depot:

`Terraforming Titans.exe`

Configure this in:

`Steamworks > Terraforming Titans Playtest > Steamworks Settings > Installation > General > Launch Options`

Use:

- Executable: `Terraforming Titans.exe`
- Operating system: Windows

## Licenses
Include licenses because the Steam depot ships both third-party browser libraries and Electron/Chromium runtime files.

The packaged app includes browser library licenses from this repo:

- `vendor/phaser-3.55.2.min.js` -> `LICENSES/phaser-3.55.2-MIT.txt`
- `vendor/three-0.158.0.min.js` -> `LICENSES/three-0.158.0-MIT.txt`

The depot must also include the Electron/Chromium license files generated in `dist/win-unpacked`:

- `LICENSE.electron.txt`
- `LICENSES.chromium.html`

## Local ContentBuilder Layout
Use a SteamPipe working directory outside the repo and without spaces:

`C:\SteamPipe\TerraformingTitansPlaytest`

Expected layout:

```text
C:\SteamPipe\TerraformingTitansPlaytest\
  builder\
    steamcmd.exe
  content\
    Terraforming Titans.exe
    LICENSE.electron.txt
    LICENSES.chromium.html
    LICENSES\
      phaser-3.55.2-MIT.txt
      three-0.158.0-MIT.txt
    locales\
    resources\
      app\
        index.html
        src\
        assets\
        vendor\
        electron\
        package.json
    *.dll
    *.pak
    *.bin
  output\
  scripts\
    app_build_4876760.vdf
    depot_build_4876761.vdf
```

Copy the `builder` folder from the Steamworks SDK:

`Steamworks SDK\tools\ContentBuilder\builder`

Current local SDK/workspace paths:

- SDK zip: `C:\Users\gabri\Documents\steamworks_sdk_164.zip`
- SDK extracted folder: `C:\Users\gabri\Documents\steamworks_sdk_164`
- SteamPipe workspace: `C:\SteamPipe\TerraformingTitansPlaytest`
- Installed SteamPipe builder: `C:\SteamPipe\TerraformingTitansPlaytest\builder\steamcmd.exe`

If starting from the downloaded SDK zip, install the builder with:

```powershell
$zip = "C:\Users\gabri\Documents\steamworks_sdk_164.zip"
$extractRoot = "C:\Users\gabri\Documents\steamworks_sdk_164"
$steamPipeRoot = "C:\SteamPipe\TerraformingTitansPlaytest"

Expand-Archive -LiteralPath $zip -DestinationPath $extractRoot -Force
New-Item -ItemType Directory -Force -Path $steamPipeRoot | Out-Null
robocopy "$extractRoot\sdk\tools\ContentBuilder\builder" "$steamPipeRoot\builder" /MIR
```

## Prepare Content
From the repo root, build the Steam-target Electron package. Use `scripts/build-steam.sh`, not raw `npm run dist:dir`, because the script temporarily writes `GAME_BUILD_TARGET = 'steam'` into `src/js/build-target.js` before packaging and restores the source file afterward.

```powershell
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && bash scripts/build-steam.sh"
```

Then mirror the generated Windows package into the SteamPipe content folder:

```powershell
$root = "C:\SteamPipe\TerraformingTitansPlaytest"
New-Item -ItemType Directory -Force -Path "$root\content", "$root\scripts", "$root\output" | Out-Null

robocopy "dist\win-unpacked" "$root\content" /MIR
```

Full staging command from this repo:

```powershell
$repo = "C:\Users\gabri\Documents\Terraforming Titans"
$root = "C:\SteamPipe\TerraformingTitansPlaytest"

cmd.exe /c "cd /d `"$repo`" && bash scripts/build-steam.sh"

New-Item -ItemType Directory -Force -Path "$root\content", "$root\scripts", "$root\output" | Out-Null
robocopy "$repo\dist\win-unpacked" "$root\content" /MIR
```

Do not copy source checkout folders directly into `content`:

- `node_modules/`
- loose repo root files outside `dist\win-unpacked`
- tests
- docs
- local save files
- generated zip files

## App Build VDF
Create:

`C:\SteamPipe\TerraformingTitansPlaytest\scripts\app_build_4876760.vdf`

PowerShell command:

```powershell
@'
"AppBuild"
{
  "AppID" "4876760"
  "Desc" "Terraforming Titans Playtest"
  "Preview" "0"
  "Local" ""
  "SetLive" ""
  "ContentRoot" "..\content\"
  "BuildOutput" "..\output\"
  "Depots"
  {
    "4876761" "depot_build_4876761.vdf"
  }
}
'@ | Set-Content -LiteralPath "C:\SteamPipe\TerraformingTitansPlaytest\scripts\app_build_4876760.vdf" -Encoding ASCII
```

```vdf
"AppBuild"
{
  "AppID" "4876760"
  "Desc" "Terraforming Titans Playtest"
  "Preview" "0"
  "Local" ""
  "SetLive" ""
  "ContentRoot" "..\content\"
  "BuildOutput" "..\output\"
  "Depots"
  {
    "4876761" "depot_build_4876761.vdf"
  }
}
```

Keep `"SetLive" ""` for the first upload so the build appears in Steamworks without automatically going live.

## Depot Build VDF
Create:

`C:\SteamPipe\TerraformingTitansPlaytest\scripts\depot_build_4876761.vdf`

PowerShell command:

```powershell
@'
"DepotBuildConfig"
{
  "DepotID" "4876761"
  "ContentRoot" "..\content\"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
'@ | Set-Content -LiteralPath "C:\SteamPipe\TerraformingTitansPlaytest\scripts\depot_build_4876761.vdf" -Encoding ASCII
```

```vdf
"DepotBuildConfig"
{
  "DepotID" "4876761"
  "ContentRoot" "..\content\"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
```

## Upload Command
Run from:

`C:\SteamPipe\TerraformingTitansPlaytest\builder`

```bat
steamcmd.exe +login Thratur +run_app_build ..\scripts\app_build_4876760.vdf +quit
```

PowerShell equivalent:

```powershell
cd "C:\SteamPipe\TerraformingTitansPlaytest\builder"
.\steamcmd.exe +login Thratur +run_app_build ..\scripts\app_build_4876760.vdf +quit
```

Do not put the password in a committed script. Let SteamCMD prompt for password and Steam Guard.

To smoke-test SteamCMD without uploading:

```powershell
cd "C:\SteamPipe\TerraformingTitansPlaytest\builder"
.\steamcmd.exe +quit
```

## After Upload
In Steamworks:

1. Open `Terraforming Titans Playtest`.
2. Go to `SteamPipe > Builds`.
3. Confirm the uploaded build contains the expected manifest.
4. Check the depot manifest includes:
   - `Terraforming Titans.exe`
   - `resources/app/index.html`
   - `resources/app/src/js/build-target.js`
   - Electron runtime DLLs and `.pak` files
   - `LICENSE.electron.txt`
   - `LICENSES.chromium.html`
5. Set the build live on the chosen branch only after launch settings are confirmed.
6. Install the playtest from Steam and run it.

## Verification Checklist
Before upload:

- `Terraforming Titans.exe` is present in `content`.
- `resources\app\index.html` is present in `content`.
- `resources\app\src\js\build-target.js` is present in `content` and contains `GAME_BUILD_TARGET = 'steam'`.
- `LICENSE.electron.txt` and `LICENSES.chromium.html` are present in `content`.
- `LICENSES\phaser-3.55.2-MIT.txt` and `LICENSES\three-0.158.0-MIT.txt` are present in `content`.
- `locales`, DLLs, `.pak` files, and Electron runtime files are present in `content`.
- No `node_modules`, test saves, docs, or loose repo source checkout are present in `content`.
- Depot ID in both VDF files is `4876761`.

After upload:

- Build appears under `SteamPipe > Builds`.
- Manifest paths match the expected install layout.
- Steam install downloads the expected files.
- Launch option starts `Terraforming Titans.exe` successfully.
