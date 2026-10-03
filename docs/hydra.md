# Hydra challenge world

Hydra is an Atlas challenge on Lerna in the Typhon system. Its definition is disabled by default. When enabled, it appears between Sirius and ShadesNightmare. The world uses normal terraforming completion plus the `hydra` story project's permanent victory requirement. Lifters' Atmosphere Strip mode is disabled through the standard world effect `disableAtmosphereStripMode` and listed in Atlas rules.

## Console activation

```js
getSpecialSeedDefinition('hydra').enabled = true;
atlasManager.enable();
atlasManager.markUIDirty({ force: true });
```

Use Atlas to travel, or call `atlasManager.travelToChallengeWorld('hydra')` after random-world travel is unlocked. The enable flag is a runtime catalog change; it is not persisted as a user setting. Saves made on Hydra still restore its project state.

Geological access uses the starting `celestialParameters.coreHeatFlux` and the global `terraformingParameters.geometry.geologicalAccessCoreHeatFluxThresholdWm2` cutoff (100,000 W/m2). Lerna starts below the cutoff at 20,000 W/m2, allowing ore mines, sand harvesters and geological research/excavation even when Terra adds heat. Poseidon and Zeus remain blocked by their higher starting heat. Stellar fusion and retained stellar-remnant heat still block access. The former Hydra-only exemption is no longer used, including in saved worlds.

## Tuning

Edit `hydraOverrides` in `src/js/special-seeds.js`. These values are provisional tuning defaults, not a finished balance pass. All masses are tons, times are seconds unless a name says otherwise, pressures are Pa, temperatures are K, and heat flux is W/m2.

| Parameter group | Controls |
| --- | --- |
| `specialAttributes.hydra.cores` | Each core's starting mass, maximum mass and growth rate |
| `objective` | Equilibrated starting pressure, temperature and near-orbit density, with configurable deadbands for natural numerical drift |
| `siblingSupportFraction` | Repair output to each other core relative to a donor's potential replenishment; even a full donor can repair damaged siblings |
| `aether` | Outer swarm fraction, atmospheric drag sensitivity, laser damage to swarm and debris, ship capture, orbital-project slowdown, bombardment, gas imports and fusion-prevention stripping |
| `aero` | Pressure support, platform collapse, occupied aerostat capacity, hacking and atmospheric carbon recipes |
| `aqua` | Required ocean coverage, exposure losses, android hacking, excavation and gas/scrap/junk output recipe |
| `ignis` | Cold/hot temperatures, environmental suppression, Crusader damage, occupied land, scavenging/mining and emissions |
| `terra` | Added core heating, venting, excavation slowdown, mine coverage, mass-depletion threshold, undermining and dug-out suppression |
| `net` | Base and per-spaceship construction throughput, segment mass, maximum mass, per-ton colony costs, capture rate and attrition |
| `oceanKeys`, `debrisScrapFraction` | Aquatic habitats and the salvage split from destroyed infrastructure |

Aether's own mass is saved in `projectManager.projects.hydra.coreMass.aether`. Orbital debris is a separate rebuilding currency; clearing the debris alone does not defeat Aether. Laser Cannons keep their normal operating costs and, on Hydra, their successful operation damages both stocks at the configured rates. The distant fraction of Aether is immune to atmospheric drag and requires lasers.

Aero draws from all available carbon feedstocks in proportion to their available carbon, including pending resource changes. CO2 and methane both contribute when present; either can supply rebuilding alone. The non-carbon fraction returns as oxygen or hydrogen. Above the target pressure plus its tolerance, Aero disposes of all atmospheric gases in proportion to available inventories, including pending changes. Disposal is `aero.gasDisposalTonsPerSecond * strength * (pressure / target - 1 - tolerance)` tons/s, capped at available gas, and shows Dormant or Active. Ignis scavenges debris before mining. Aqua and Terra excavate the finite general planetary-mass reservoir. Recipe fractions must sum to one. Star lifting uses Aether's separately saved, finite stellar feedstock. When orbital debris cannot cover its repair budget, Aether also consumes that reserve for self-repair and sibling repair, capped at `aether.stellarRepairFraction` of the requested budget (10% by default). This repair fallback is independent of pressure and shares the reserve with gas imports. Continuous gas and surface transfers enter the existing resource accumulator so climate applies them in its normal substeps. Resource rates use `project:hydra:<core>` source ids and localized core names; sibling-repair costs belong to the supplying core. Net construction and worn-net salvage use `project:hydra:net`. Structure occupation effects retain the shared `project:hydra` source for cleanup. Aqua reserves ocean-covered geometric surface land through the `hydra` hazard share. Ignis independently reserves Underground Expansion land through the `hydra:ignis` land source, at `ignis.maximumLandFraction * strength` (90% at full strength). Underground land is capped project progress times land per completion; no underground expansion means no Ignis reservation. Both reservations are refreshed on enable and simulation updates and cleared on victory or travel.

Suppression and regeneration use a common pre-step snapshot for environmental suitability. Donors pay for their own growth and sibling repairs. All donors share each recipient's remaining repair capacity, including current-step damage; only supplied repairs reserve that capacity, preventing overlapping repairs and wasted feedstock. Rebuilding capacity and Aether drag use instantaneous per-second rates multiplied by elapsed seconds. Repairs therefore match ongoing damage in the same step rather than dividing a previous tick's damage by the current tick duration. Rates can still change with mass, environment and feedstock availability. A destroyed core can revive until all five masses reach exactly zero in the same step. Saved positive defeat thresholds are ignored. Aero pressure collapse removes `maximumMass * collapsePerSecond * (1 - pressureSuitability)` tons per second, in addition to net capture. Aqua exposure removes `maximumMass * exposurePerSecond * (1 - oceanSuitability)` tons per second: 0.2% of maximum mass per second with no oceans by default. Terra dug-out or mass-depletion suppression removes `maximumMass * dugOutSuppressionPerSecond` tons per second. Damage and salvage are capped at available Aero, Aqua or Terra mass including incoming repairs, allowing exact depletion without excess salvage. Victory stops Hydra permanently, removes occupation/slowdown effects and returns core heat to its natural baseline. Aether blocks research-orbital assignment and production above `aether.researchOrbitalDisableAboveFraction` of maximum mass (10% by default). The block lifts at or below the threshold and returns if Aether rebuilds above it. Manual, automatic and weighted allocation share this restriction. Its follower effect is restored when the saved project is enabled and removed on victory or travel. Physical Kessler debris remains for normal cleanup. Core/net progress resets on travel; ordinary saves preserve it.

Each core card lists abilities and player penalties on separate lines. Threshold-based entries display Dormant, Waking, or Active using the same strict/inclusive trigger conditions as combat. Temperature and pressure entries use only Dormant or Active. For other thresholds, Waking means the trigger is not met but the current value is within 25% of the threshold; this is a display warning only. Destroyed cores and permanent victory display Dormant. Aether gas imports also remain Dormant when stellar feedstock is exhausted or atmosphere stripping takes precedence.

## Entanglement net construction

The net remains part of the Hydra story project. Hydra uses the standard project footer, progress renderer, Auto start checkbox, and `SpaceshipProject` assignment controls. Construction uses the shared `isActive`, `isPaused`, and `autoStart` fields; the shared duration and progress bar track one segment at the current build rate, using the partial segment in surviving net mass. The available-segments display tracks the whole net. Construction and combat still run in the woven resource step rather than the ordinary timed-project completion path. Victory belongs to the five-core objective, not to finishing the net.

`net.segmentMass` converts surviving net mass into segments. The display uses the standard segment-cost renderer, including resource shortfall tooltips. Costs remain `costPerTon * segmentMass`; changing the display unit does not change material efficiency. The same `getScaledCost()` supplies the cost display and shared project affordability checks for start, resume, and auto start. Resource exhaustion pauses construction until a segment can be afforded again. Construction speed is `buildTonsPerSecond + assignedSpaceships * shipBuildTonsPerSecond`, limited by available colony resources and remaining capacity. Defaults are 10,000 tons per segment, 100 tons/s base construction (equivalent to 100 ships), and 1 ton/s per assigned ship. With no assigned ships, one segment takes 100 seconds; 100 assigned ships reduce this to 50 seconds.

The shared project button starts construction up to capacity, pauses active construction, and resumes paused construction. Pausing also disables Auto start. Auto start uses the standard project automation unlock. Auto start replaces net mass consumed while capturing Aero, including restarting after reaching capacity. Surviving segments can therefore decrease during combat; partial segments retain their mass and effectiveness. The net displays actual capture and attrition from the latest combat step in tons/s, with attrition also converted to segments/s. Rates respect available Aero/net mass and reset on load and after victory. Assigned ships use the shared ship pool, persist in saves, and are subject to Aether's active-ship capture. Victory stops construction, disables auto assignment and returns the surviving assigned ships. Existing saves preserve net mass and construction state. Legacy `weaveNet` and `netBuilding` values migrate to shared project state and remain as compatibility save keys; new saves also use the standard project fields.

## Kessler tuning

`hydraOverrides.hazards.kessler` separates physical mass from launch risk:

- `initialDebrisTons`: absolute starting orbital-debris currency, default `1e19`.
- `failureReferenceDebrisTons`: mass at which the configured base success chances apply, default `1e19`.
- `smallProjectBaseSuccess`, `largeProjectBaseSuccess`: default `0.7` and `0.5`, giving 30% and 50% starting failure.
- `maximumFailureChance`: default `0.85`; this also bounds the existing Kessler cost inflation.
- `outerOrbitMassFraction`: default `0.01` in a logarithmically spaced high-altitude tail.
- `outerOrbitMinimumMeters`, `outerOrbitMaximumMeters`: default `1e9` to `1e12` metres above the initial radius.
- `debrisDecayDensityFloor`: zero here, so a vacuum tail does not decay solely from the standard numerical density floor.

Change starting debris and the failure reference together to preserve starting failure percentages. Change only the starting mass to deliberately change risk. Normal worlds retain their existing per-land debris and success defaults. These options are normalized in the Kessler hazard, with defaults in `terraforming-parameters.js`.

On save load, Hydra refreshes `currentPlanetParameters.specialAttributes.hydra` from the current special-seed definition. This applies updated core, net, objective, and counterattack tuning without retravel. Saved core/net masses, stellar feedstock, orbital state, ship assignments, construction state, and victory status are preserved; atmosphere, climate, and Kessler parameters retain their saved state. For live experimentation, Hydra reads the refreshed object each step. Changing a starting mass does not rewrite an already-running core; use a fresh visit to apply starting inventories. Runtime Kessler options are on `hazardManager.parameters.kessler`; starting inventories and orbital distributions likewise require a fresh visit.

## Physical calibration

Hydra was inactive during calibration and verification. The stored starting climate is approximately 842.098 K with 809.638 MPa surface pressure and `9.713457989118672e22` tons of liquid hydrogen. All three zones retain a hydrogen ocean. Verified CO2, methane and hydrogen phase rates were zero across 20,000 normal 20 ms resource updates. Starting atmospheric CO2 and methane are each `1e19` tons, providing about `1.023e19` tons of carbon for Aero. Tune these through `hydraOverrides.resources.atmospheric.carbonDioxide.initialValue` and `atmosphericMethane.initialValue`, then recalibrate. Aether retains its pressure-triggered imports. Starting inventories apply on a fresh visit; existing saves retain their atmosphere. Hydra restores this starting climate when disturbed: pressure deficits trigger gas imports, excavation and venting; cooling triggers emissions and added geothermal heat. It does not actively refrigerate the planet. The pressure and temperature deadbands are 0.1% and 1 K. Near-orbit swarm drag applies only to density above the initial density plus its 1% deadband. Initial core masses equal their maximum masses, so undamaged cores consume no rebuilding feedstock. Occupation penalties still apply immediately.

The fixed `objective` values are stored in world parameters and therefore persist with the world save; they never follow the player's changing climate. Recalibrating the physical world also requires updating these objective values to the new initial climate and near-orbit density. Existing saves that predate the restoration objective receive the new objective and full-health capacity limits on initialization. Other saved tuning is preserved; use a fresh visit when testing changed defaults.

```sh
npm run equilibrate:world -- --special-seed hydra --relax-steps 60000 --relax-refine-checks 1000 --adaptive-only
```

The calibrator's special-seed mode writes `special-seeds.js`, leaves story projects inactive, and includes hydrogen in adaptive snapshots and phase-rate verification. It restores source files if verification fails. The stored zonal inventories take precedence over the coarse surface resource seeds.

## UI capture

```sh
npm run screenshot:ui -- --selector ".project-card[data-project-name=hydra]" --setup scripts/screenshot-setups/hydra.js --theme darkBlue --viewport 1440x2300 --output artifacts/screenshots/hydra.png
```

The setup uses an isolated world, pauses the simulation and removes story overlays. It does not change `DEBUG_MODE`.
