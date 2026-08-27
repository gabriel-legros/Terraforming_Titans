# System Architecture and Invariants

This document records durable ownership and cross-system constraints. Feature values and current behavior belong in parameters, implementation, and tests rather than a manual changelog.

## Runtime Layout

- `index.html` is the ordered classic-script entry point. Browser game files consume required upstream globals directly.
- `src/js/terraforming/terraforming.js` owns `Terraforming` construction and update orchestration. Adjacent ordered `terraforming-*.js` files attach status, resource stepping, climate, effects, and persistence behavior.
- Core simulation is centered on terraforming, physics, and cycle modules. Economy/colony behavior is centered on resources, buildings, colonies, and their UI modules.
- `StoryManager` in `progress.js` owns story progression. Story-only project classes live under `src/js/story/` and load after their base classes.
- `SpaceManager` owns planet travel/state.
- Per-artificial-world infrastructure completion belongs on the corresponding `SpaceManager.artificialWorldStatuses` entry. Project instances mirror the current entry and do not carry completion to another world through project travel state.
- `src/js/save-settings/settings.js` owns setting migration, runtime application, and UI synchronization. `save.js` passes the saved settings payload to it.
- `EffectableEntity` in `effectable-entity.js` supplies shared effect and flag behavior.

## Parameter and Constructor Ownership

- Physical, atmosphere, geometry, phase-change, climate, gameplay, and hazard defaults live in `src/js/terraforming/terraforming-parameters.js`.
- Dynamic-world surface gravity excludes atmospheric mass. Gravity penalties instead estimate gravity at the altitude where atmospheric pressure reaches 1 atm, including the atmosphere below that altitude.
- World-specific values live in planet or special-seed parameters. Derive dependent values only after mod patch stages have run.
- Specialized building, colony, and project constructors are selected through each parameter entry's `type`. Keep constructor selection data-driven.
- Building-specific logic belongs in a dedicated subclass under `src/js/buildings/`.
- World-specialization exclusion, warnings, and unlock checks use the shared helpers in `SpecializationProject.js`; do not introduce fixed specialization lists.

## New Game, Load, and Travel

### New Game

`startNewGame()` fully rebuilds state and returns to Mars. It preserves General settings, resets Difficulty settings and their lock state, and carries no gameplay progression forward. Any value initialized late in a session must also have an explicit new-game initialization path.

### Load

`loadGame()` rebuilds through `initializeGameState({ skipStoryInitialization: true })`. Difficulty settings reset to defaults before saved values are applied so absent legacy fields do not inherit the prior session.

### Travel

`selectPlanet(key)` performs a level-1 reset through `initializeGameState({ resetLevel: GAME_RESET_LEVEL.PLANET })`, then completes the UI refresh. `GAME_RESET_LEVEL` reserves ordered reset scopes: `PLANET` is `1`, `GALAXY` is `2`, and `NEW_GAME` is `100` so additional prestige layers can be inserted without renumbering the full reset.

Lifecycle state owners use three independent thresholds:

- `resetAt` replaces or resets the object when `resetLevel >= resetAt`. It defaults to `PLANET`.
- `travelStateResetAt` stops copying partial state into the replacement object when `resetLevel >= travelStateResetAt`. It defaults to `NEW_GAME`.
- `departureResetAt` stops departure rewards, conversions, and aggregation when `resetLevel >= departureResetAt`. It defaults to `GALAXY`.

Managers that currently persist across planet travel explicitly use `resetAt: GAME_RESET_LEVEL.NEW_GAME`, preserving existing behavior until a future prestige layer deliberately assigns lower thresholds. A surviving manager must rebind or reapply effects to newly created world objects. Non-effectable state owners declare equivalent threshold properties directly.

`prepareForTravel({ resetLevel })` captures transient gameplay state in one level-tagged `preparedTravelState` envelope before the world changes. It contains project state, preserved resources, structure autobuild controls, Construction Office settings, Life Designer state, follower transient state, and Hazardous Machinery travel settings. Initialization consumes the envelope only when its level exactly matches, then clears it. Full resets clear it without restoring. Each capture and restore path applies the owning object's `travelStateResetAt`; fields absent from a matching snapshot keep the replacement object's constructor defaults.

Travel snapshots are deliberately separate from ordinary `saveState()`/`loadState()` persistence and do not change save keys or formats. Projects are reconstructed at `PLANET` and use `saveTravelState(resetLevel)` / `loadTravelState(state, resetLevel)` for partial preservation. Resources still require `preserveOnTravel`; that compatibility flag and `travelStateResetAt` must both permit capture. Presentation-only preferences such as hidden entries, navigation, and graph-window state follow their UI lifecycle and are not gameplay travel snapshots.

Departure has two phases. `prepareTravelState(resetLevel)` is progression finalization and runs only below the owner's `departureResetAt`; examples include specialization awards, population commits, and O'Neill conversion. `cleanupForReset(resetLevel)` removes old-world effects and references whenever the world is replaced, regardless of prestige level. Snapshot-only normalization belongs in `prepareTravelSnapshot(resetLevel)`, which runs whenever that object's transient snapshot is preserved. `SpaceManager.recordDepartureSnapshot({ resetLevel })` likewise skips world-status recording, galactic population aggregation, follower departure aggregation, and departure skill rewards at `GALAXY` or higher while leaving cleanup active.

Persistent meta systems include Research (with regular research reset), Skills, Solis, Space, Galactic Invasion, Story, and explicitly preserved manager-owned resources/state. Do not infer persistence merely because an object happens to survive one path.

UI controllers can outlive gameplay managers. Rebind their current manager context on every lifecycle initialization; do not retain the instance from the first build in a closure.

## Resource and Simulation Pipeline

The `produceResources` pipeline is:

1. Calculate theoretical production.
2. Recalculate storage.
3. Solve productivity.
4. Reset and accumulate production/consumption.
5. Apply funding, terraforming, and life effects.
6. Clamp caps.
7. Aggregate display rates.

Durable constraints:

- Game logic and terraforming use `terraformingParameters.gameplay.simulation.resourceSubstepMs` (default `20`) as the shared resource step. Calibration tools and settings copy read the same parameter.
- Continuous atmosphere, zonal-surface, and albedo deltas are applied proportionally inside fixed terraforming substeps. Do not defer them to a later frame boundary.
- Zonal transfers credit output only for input actually removed during the woven substeps so they remain mass-conserving when phase changes compete.
- Resource rate maps use stable, non-localized ids. Buildings use `building:<internal name>`, projects use `project:<internal name>`, and shared/mod processes register namespaced ids. Gameplay and automation query ids; UI resolves display names.
- Resource production uses its three-step productivity fixed point. Preserve ordered floating-point grouping in interim projections and end any assignment-normalization batch before actual resource application.
- `PreciseDecimal` is the immutable exact base-10 type for systems that explicitly need exact arithmetic across incompatible magnitudes. Ordinary physics and UI stay on `Number`.
- Runtime zonal surface state is resource-first: `terraforming.zonalSurface[resourceKey][zone]`. Use `ZonalResource.change(zone, delta)` for relative mutations and `set`/the property setter only for intentional replacement. Precision state belongs to the value; do not add parallel remainder stores.
- Surface land uses its existing fixed-point `BigInt` reservation/value ledger. Assignment systems that store `BigInt` counts convert to `Number` only at rate/formula boundaries.
- Molten-surface structure attrition belongs to `Terraforming` rather than `HazardManager`, so it remains active on worlds that disable optional hazard systems. It runs with environmental hazard updates after climate stepping unless the `disableMoltenSurfaceAttrition` difficulty setting is enabled. Geological lava or plasma must reserve all geometric land before attrition begins; temperature-maintenance immunity also grants molten-surface immunity. Operational Aerostats additionally protect their own colony and the active structures covered by existing direct-support and worker-capacity calculations.
- Every life metabolism growth/decay recipe must conserve mass. Validate coefficient arithmetic rather than tuning it by feel.
- Life Thermodynamics applies only to natural zonal surface-life growth. It caps chemical-energy storage against the canonical zonal surface solar flux after converting it to the zone-wide average for curvature and night, and contributes its signed zonal flux directly to the radiative temperature trend; direct biomass transfers and constructed or space-based growth do not participate.

## Climate and Phase Change

- `Terraforming.calculateSurfaceSolarFlux()` and `calculateZonalSurfaceSolarFlux(zone)` are the canonical cloud/haze-adjusted light APIs. `calculateZonalAverageSurfaceSolarFlux(zone)` additionally applies each zone's projected illuminated-area ratio for curvature and night. Consumers must not reinterpret `modifiedSolarFlux` or world geometry independently.
- Solar-panel cooling conserves planet-wide power and distributes it by mirror-modified zonal sunlight after local surface albedo. Ordinary factory heat stays uniform.
- Life Thermodynamics cooling is zonal and trend-shifting. Keep it in the radiative balance with factory heat rather than in the trend-constrained phase-change path. Advanced Oversight trial projections hold cooling fixed below the solar cap; while the cap is active, they project the lesser of chemical-energy demand or the configured fraction of trial zonal surface flux so mirror assignments solve the coupled response without tick-to-tick swings.
- Boiling uses only the configured shallow liquid inventory: zone area times coverage times depth and density, capped by available liquid. It must not scale with the full ocean inventory.
- Temperature trends, meridional mixing, and Advanced Oversight projections exclude phase-change heat. The previous tick's phase heat may modify progress toward the phase-free trend but cannot reverse that motion or cross the trend.
- Mega Heat Sinks do not directly mitigate phase-change heat. Their unused cooling can absorb atmospheric-combustion and aerobraking heat before either raises temperature.
- Phase Change Heat keeps exact transition-energy accounting and does not use equilibrium snapping.
- Atmospheric oxidation tuning stays under `terraformingParameters.atmosphere.chemistry.oxidation`; aerobraking heat parameters stay under `terraformingParameters.atmosphere.aerobraking`.

## Advanced Oversight

- Solve ideal zonal flux and focus-melt demand first, then project that plan onto current mirror and Hyperion Lantern capacity by priority.
- Prepare one scoped projection context per terraforming substep and reuse its flux-invariant inputs across trial fluxes. Never retain that context across substeps.
- Run oversight after each woven climate-resource slice and immediately before its physics step.
- Keep solved UI projections separate from live terraforming trend fields.
- Preserve explicit signed mirror assignments on full restore (`negative` means reverse/cooling). Presets and travel restores retain the advanced-oversight assignment guard unless explicitly restoring assignments.
- Guard binary searches against number-precision stalls at extreme counts; stop when the midpoint no longer changes.

## Build Targets

- Browser and Steam/Electron builds share gameplay. Branch only platform capability and presentation through `src/js/build-target.js`, `GAME_FEATURES`, preload APIs, and release scripts.
- Do not persist build-target flags in saves or fork whole gameplay systems by platform.
- Electron entry points are `electron/main.cjs` and `electron/preload.cjs`. Packaged saves are file-backed under the Electron user-data `saves` directory. Serialized game-state JSON escapes non-ASCII code units so save data remains encoding-safe across browser storage, Electron IPC, files, and clipboard transfers.
- Background simulation in Electron depends on disabled Chromium background throttling/suspension; preserve that behavior.

## Mod Security and Patching

- Modded Electron sessions load through the protected `tt-game://app` overlay. Never expose local/Workshop filesystem paths to renderer code.
- Mods may not replace `electron/`, preload, `index.html`, vendor files, build metadata, or `src/js/modding/`.
- Keep `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`. Do not restore Chromium's `--no-sandbox` switch.
- Patch live parameter objects at the explicit stages in `index.html`; do not parse or splice JavaScript source. Object patches merge recursively, arrays/scalars replace, and `$delete`, `$replace`, and `$number` are reserved operations.
- Custom constructors register through `registerProjectConstructor(type, ctor)` and `registerBuildingConstructor(type, ctor)`. Type ids are namespaced and parameter ids are DOM-safe; unknown types and duplicate keys are errors.
- Active mods do not suppress Steam achievements. Log only compact mod ids and error counts, never full session or patch graphs.

See `docs/modding/local-development.md` for the local mod workflow.
