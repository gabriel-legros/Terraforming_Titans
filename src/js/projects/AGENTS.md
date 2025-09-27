# Instructions
This folder contains classes for repeatable projects. Any new module here should export an ES6 class and follow the existing naming convention of PascalCase filenames. Add unit tests in `tests` for any new functionality.

# Project overview
- **AndroidProject** – baseline for projects that assign android workers to accelerate progress.
- **CargoRocketProject** – launches chemical rockets with a custom resource payload; spaceship purchases raise funding cost temporarily.
- **DeeperMiningProject** – android‑assisted deepening of ore mines whose cost scales with mines built and average depth.
- **DysonSwarmReceiverProject** – builds the Dyson Swarm Receiver and deploys solar collectors that persist across planets.
- **OrbitalRingProject** – constructs repeatable orbital rings that count as terraformed worlds and may draw from space storage.
- **PlanetaryThrustersProject** – consumes energy continuously to change planetary rotation or orbit via spin and motion targets.
- **ScannerProject** – produces orbital scanners that slowly reveal underground deposits; build count scales with worker cap.
- **SpaceExportBaseProject** – shared spaceship logic for exporting or jettisoning resources, including optional capacity waiting and temperature automation.
- **SpaceExportProject** – sells selected resources for funding; export capacity scales with terraformed worlds.
- **SpaceDisposalProject** – jettisons selected resources and can remove greenhouse gases to cool the planet.
- **SpaceMiningProject** – sends ships to asteroids for metals, water, carbon or gases with optional pressure thresholds.
- **SpaceMirrorFacilityProject** – manages orbital mirrors and Hyperion Lantern oversight, allowing zonal energy distribution and focused melting.
- **SpaceStorageProject** – adds orbital warehouse capacity and runs ship transfers. The upper progress bar tracks discrete storage expansions while a second bar handles deposit or withdrawal operations using a fixed 100 s base duration that becomes continuous with more than 100 assigned ships; transfer rate appears under Cost & Gain.
- **SpaceshipProject** – base class for any project assigning spaceships; enters continuous mode above 100 ships and manages per‑ship costs, gains and disposal.
- **TerraformingDurationProject** – helper base that reduces project durations based on the number of terraformed worlds including the current one.
- **UndergroundExpansionProject** – android‑driven subterranean land growth; costs scale with initial land and progress displays total expanded land.
