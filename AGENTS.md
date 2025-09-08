# Instructions
- Document major feature updates in this file.
- Keep imports and exports browser friendly for loading via **index.html**.
- The game needs to be able to run from a browser-like environment.
- Place story projects in **progress-data.js** near the chapter where they unlock.
- Tooltips should use a `<span class="info-tooltip-icon">&#9432;</span>` element with a descriptive `title`.
- Keep checks of the kind (typeof something === 'function') and if(resources && resources.special && resources.special.spaceships) to a minimum.  If the checks fail, the code fails and it is better to catch it than let it fail.
- All UI elements should be cached and reused instead of using querySelector.

# Overview of code
This repository contains a browser-based incremental game written in JavaScript. The
entry point **index.html** loads scripts that create resources, buildings, colonies,
projects and research items from parameter files. Weather and surface modelling are
driven by modules like **terraforming.js**, **physics.js** and the various cycle files.
Economy and colony management rely on **resource.js**, **building.js**, **colony.js** and
UI modules. Story progression is handled by **StoryManager** in **progress.js** while
**SpaceManager** tracks the current planet.

# Additional gameplay systems
- **skills.js** and **skillsUI.js** implement the H.O.P.E. skill tree.
- **life.js** and **lifeUI.js** allow custom lifeform design.
- **space.js** and **spaceUI.js** manage interplanetary travel.
- **gold-asteroid.js** spawns a temporary bonus event.
- **autobuild.js** automatically constructs buildings when enabled.
- **milestones.js** and **milestonesUI.js** track long term goals.
- **solis.js** and **solisUI.js** provide a shop and quest system.
- The ResearchManager persists between planets so only advanced research remains after travel.

## Prestige systems
Two reset layers control long term progression:

### New game
Calling `startNewGame()` fully recreates the game state and returns the player to Mars. Nothing carries over between playthroughs.  Care must be taken to ensure that if any value is set later in the game, it must be reset or set again properly when starting a new game.

### Planet travel
Selecting another world via `selectPlanet(key)` soft resets the colony while keeping meta systems. It awards one skill point on the first visit and calls `initializeGameState({ preserveManagers: true, preserveJournal: true })` so that:
* `ResearchManager` survives but `resetRegularResearch()` clears normal tech while advanced research and its resource are preserved.
* `SkillManager` retains unlocked skills and re‑applies their effects.  Gained when travelling.
* `SolisManager` keeps quests, points and shop upgrades.  Can also buy artifact and provides an upgrade for permanent researches.
* `SpaceManager` records which planets have been visited or terraformed.
* `StoryManager` continues tracking active events and re‑applies their rewards.
* The **Dyson Swarm Receiver** project's collector count persists across planets, but the receiver must be rebuilt to regain energy production.

When loading a save or switching planets, call each manager's `reapplyEffects` method so stored modifiers affect the newly created game objects.

## Dyson Swarm Receiver
Research unlocks a large orbital array followed by the **Dyson Swarm Receiver** mega
project. The receiver costs 10&nbsp;M metal, 1&nbsp;M components and 100&nbsp;k electronics and
builds over five minutes. Once complete, players may deploy orbital solar collectors.
Collectors consume glass, electronics and components and can be automated. Their total
count persists between planets and each adds **Dyson Swarm** energy production.

Other modules include **save.js**, **projects.js**, **projectsUI.js**, **spaceship.js**,
**day-night-cycle.js**, **journal.js**, **population.js** and **warning.js**.
Ore scanning logic now lives directly inside **ScannerProject**.

# Effectable entities
Gameplay objects that can receive temporary or permanent modifiers extend
`EffectableEntity` in **effectable-entity.js**. Each keeps a list of active effects and
boolean flags. `addEffect`, `replaceEffect` and `removeEffect` apply or update these
effects so that buildings, resources, projects and life all share the same system.

# Resource flow
Resources are created via `createResources` and updated each tick by
`produceResources`:
1. Calculate theoretical production rates.
2. Recalculate storage capacities.
3. Update building productivity based on conditions.
4. Reset trackers and accumulate production/consumption.
5. Apply funding, terraforming and life effects.
6. Clamp values by caps.
7. Aggregate total rates for display.
Helper functions like `checkResourceAvailability` help modules plan without consuming
resources immediately.

## Nanotechnology
The `nanotechManager` oversees a self-replicating swarm unlocked by **Nanotechnology Stage I** research. The UI remains hidden until `enable()` is called.

- Swarm growth requires surplus power beyond storage; each bot draws 1e-11 W.
- Maximum nanobots equal planetary land area (m²) × 1e19, and only 1e15 bots survive travel.
- The growth slider adds up to +0.15 % growth. Stage I sliders modify growth while:
  - **Silicon Consumption** grants up to +0.15 % growth and consumes silicon from current storage plus accumulated changes.
  - **Maintenance I** reduces metal, glass, and water maintenance by up to 50 % but subtracts up to 0.15 % growth.
  - **Glass Production** yields glass at 1e-20 t/s per bot and also subtracts up to 0.15 % growth.
- Per-second energy, silicon, maintenance, and glass rates appear beside each slider with brief descriptions.
- Travel text notes that H.O.P.E. can hide 1e15 nanobots from the Dead Hand Protocol.

# UI refresh requirements
- **Starting a new game** – call `startNewGame()` which rebuilds game state.
- **Loading a save** – `loadGame()` invokes `initializeGameState({ skipStoryInitialization: true })` then applies the saved data.
- **Moving to another planet** – `selectPlanet(key)` switches the planet and
  calls `initializeGameState({ preserveManagers: true })` followed by `updateSpaceUI()`.
Failing to use these helpers may leave the DOM bound to outdated objects.
To ensure this works properly, every feature in the game that has an UI should have an enabled true/false attribute.  When updating its display, if the flag is true, the feature should be revealed.  If false, it should be hidden.  This flag should not be saved/loaded.  Instead, story unlocks, researches and other things will re enable it as needed.

# Testing
- Run `npm ci` to install dependencies before running tests.
- Save test output to a file so you don't have to rerun it just to read the results.
- Do not commit `test.log`; it is for local reference only and is ignored via `.gitignore`.
- Run tests **once** in non-watch mode with `CI=true npm test` and report how many passed or failed. Pipe the command to `tee` (e.g., `CI=true npm test 2>&1 | tee test.log`) so the results are both displayed and stored.
- Write tests for any new feature.
- Avoid asserting on exact story text; check IDs or prerequisites instead.

# Storytelling style
After Earth's destruction, prefix each character's dialogue with their name the
second time they speak in a chapter to help clarify who is talking.

# Character personalities
- **H.O.P.E.** – deadpan and literal AI, often classifying everything as a form of
  terraforming.
- **Martin** – whimsical and clever mentor figure.
- **Mary** – witty when times are good, serious when crisis strikes.
- **Adrien Solis** – sharp, opportunistic CEO with dark humor.
- **Dr. Evelyn Hart** – professional scientist behind Operation Sidestep.
- **Elias Kane** – charismatic cult leader secretly aiding the aliens.
- Atmospheric Water Collector unlocks via a hot, dry condition trigger treated as a
  prerequisite.
- Prerequisites can check conditions like objectives.
- Story events with chapter `-1` display in the current chapter without changing it.

## Warp Gate Command
Warp Gate Command provides a dedicated subtab for managing teams that embark on timed operations through the warp gate. Players recruit custom-named members with classes and skills, track their health, and choose operation difficulty. Operations grant experience and Alien artifacts, while R&D and Facilities menus offer equipment and training upgrades. Statistics and logs persist across planets so progress carries over between worlds.

## Space Mirror Facility
Space mirrors are overseen through sliders that distribute units across surface zones. Completing the Space Mirror Focusing research reveals an additional control that concentrates mirrors to melt surface ice into liquid water in the warmest zone with ice. The facility now handles zonal flux and melting calculations internally. The display now shows average and day temperature in each zone.
The temperature column header updates to match the current Celsius or Kelvin setting.
Oversight now includes a collapsible **Finer Controls** section for manual mirror and Hyperion Lantern assignments with adjustable step sizes and per‑zone auto‑assign checkboxes that funnel leftover units into the selected zones while locking sliders or buttons accordingly.
Unassigned mirrors or lanterns no longer affect luminosity, and lantern controls remain hidden until Hyperion Lanterns are unlocked.
calculateZoneSolarFluxWithFacility now respects the Unassigned slider so idle mirrors and lanterns contribute no flux.

## Random World Generator
The Random World Generator manager builds procedural planets and moons with lockable orbit and type options. Worlds must equilibrate before travel; a progress window tracks simulated time and allows canceling or ending early once the minimum fast-forward is reached. Seeds encode UI selections so players can revisit specific worlds, and the manager prevents travel to terraformed seeds while persisting star luminosity and other parameters through saves. Traveling from a fully terraformed world to a random world awards a skill point on the first visit, and planetary thrusters on these worlds use the host star's mass for orbital calculations.

# Changelogs
- Cargo rocket continuous mode only produces or consumes resources when the Run checkbox is enabled.
- The collector progress bar continues updating after the receiver is finished and controls stay disabled until the receiver completes.
- The solar collector UI remains hidden until the receiver is built.
- The collector cost now appears on the Dyson Swarm card.
- Sustain costs for active projects register as `project` consumption in tooltips.
- Projects with ongoing resources check supplies one second ahead.
- The luminosity box shows ground and surface albedo separately.
- Surface albedo deltas compare against initial values, listing black dust, water, ice and biomass percentages.
- Projects now save and load themselves with dedicated methods overridden by subclasses.
- Dyson Swarm collector duration scales with the number of terraformed planets and the button shows the time required.
- Day-night cycle duration derives from each planet's rotation period, treating one Earth day as one minute.
- Added a `system-pop-up` story event type for instant messages.
- Added a `setGameSpeed` console command to multiply time progression for the current session.
- Added Cloning Concept advanced research enabling energy-intensive cloning facilities to produce colonists.
- Planetary thruster Spin and Motion cards include Energy Spent columns that persist when investment is toggled; motion energy resets only after a moon escapes its parent.
- Planetary thruster invest selections persist through saves and reloads with checkboxes and targets restored on load.
- Satellite projects display discovered and maximum deposit counts.
- Dyson Swarm collectors contribute their generated energy to the colony instead of only displaying it.
- Moon-based planetary thrusters show an Escape Δv row and hide spiral Δv when bound to a parent body.
- Escaped bodies keep their parent reference but set `hasEscapedParent` to track the event.
- ProjectManager applies project gains each tick via `applyCostAndGain`, keeping `estimateCostAndGain` as a pure rate estimate.
- Spaceship projects now switch to proportional, per-ship continuous resource flow when more than 100 spaceships are assigned; smaller fleets resolve costs on start and gains on completion, and rates match at the 100-ship transition.
- Automation checkboxes pause continuous spaceship projects when resources or environmental thresholds fail and resume them once conditions recover.
- Ore and geothermal satellite UI split Amount and Deposits into separate columns with aligned controls and fonts matching space mining projects.
- Space Disposal project displays the expected temperature reduction when jettisoning greenhouse gases and shows per-second rates in continuous mode.
- Infrared Vision research immediately removes the day-night penalty on Ice Harvesters when the cycle is disabled.
- Android project assignments keep androids in storage and tooltips show worker and project usage.
- Androids above their storage cap no longer contribute workers, and excess project assignments are reduced.
- Worker and android resource tooltips reflect effective android counts when storage is over capacity.
- Auto-build percentages for buildings and colonies persist through planet travel while all auto-build checkboxes reset.
- Auto-build settings can target population or worker counts.
- Colonists slightly over their cap (by less than 0.01) are cropped to the cap instead of decaying.
- Repeatable projects clear their completed flag on load when more repetitions remain.
- Deeper mining proceeds without android assignments, running at normal speed.
- Colony upgrade cost text highlights only resources that are unaffordable.
- Solis tab features an Alien Artifact section unlocked by a flag, letting players donate artifacts for points and buy Research Upgrades that auto-research early infrastructure, including the Terraforming Bureau.
- Added a Pre-travel save slot that automatically stores the game state before planet travel and remains hidden when empty.
- Solis artifact donation uses the correct resource pool, properly displaying owned artifacts and enabling donations.
- Solis artifact donations grant 10 points per artifact instead of 100.
- Solis research upgrade lists upcoming technologies horizontally and crosses out each as it is purchased, clarifying that one tech is unlocked per purchase.
- Chapter 13.2 reward triggers a one-time alert on the Solis tab.
- Solis point rewards now scale with the square root of terraformed worlds and display two decimal places.
- Solis point display now shows two decimal places, and alien artifact trade points scale with the Solis point multiplier.
- Alien artifact donation UI displays Solis points per artifact based on the current terraformed world bonus.
- Fixed Dyson Swarm collectors resetting after planet travel; collector counts persist across worlds while the receiver must be rebuilt on each planet.
- Collector persistence is managed through ProjectManager travel state so only the Dyson Swarm's collector count carries over between planets.
- Space Storage allows storing glass and preserves its capacity and stored resources across planet travel using travel state save/load.
- Space Storage allows storing superalloys when the Superalloys research is completed.
- Skill points are granted only when traveling from a fully terraformed planet to one not yet terraformed.
- `getTerraformedPlanetCountIncludingCurrent` in SpaceManager avoids double counting the current planet when applying terraforming bonuses.
- Autosave slot can be manually overwritten through the Save button.
- Land resource tooltip notes that land can be recovered by turning off the corresponding building.
- Space UI shows original planetary properties for story worlds without seed or type.
- Cargo rocket ship purchases add a flat +1 funding cost per ship divided by previously terraformed worlds (excluding the current planet) and decay by 1% per second.
- Story world original properties list partial atmospheric pressures for key gases instead of a single total.
- Cargo rocket ship purchases raise future ship prices based on terraformed planets and decay by 1% per second.
- Metal export cap counts previously terraformed worlds excluding the current planet.
- SpaceManager exposes `getTerraformedPlanetCountExcludingCurrent` for modules needing previously terraformed world counts.
- Life design biodome points scale with active Biodomes instead of total built.
- Cargo rocket spaceship tooltip appears immediately to the right of the Spaceships label.
- Pre-travel saves no longer update SpaceManager's current world before travel.
- Space UI caches the last world key and seed to skip redundant detail rendering.
- Innovation Initiative boosts android research output.
- Alien artifact resource values persist across planet travel, mirroring advanced research.
- Resource tooltip timeline reserves space with a blank line when no time to full or empty is shown, preventing flicker.
- Radiation penalty values below 0.01% are hidden from the UI, and radiation display in the terraforming UI shows mSv/day without `formatNumber`, with values below 0.01 mSv/day appearing as 0.
- Water overflow counts as production and is included in resource totals instead of showing a separate overflow line.
- Star luminosity is a celestial parameter set during Terraforming construction, ensuring new games have correct solar flux.
- SpaceManager stores the random world seed as `currentPlanetKey` when visiting procedural planets, unifying key handling for story and procedural worlds.
- Optical depth tooltip lists contributions from each gas.
- Optical depth tooltip refreshes its gas contributions in real time while hovered.
- Optical depth tooltip uses resource display names.
- `getTerraformedPlanetCount` now counts terraformed procedural worlds via `getAllPlanetStatuses`.
- Space Storage withdraw mode shows an icon when colony storage is full.
- Advanced research production scales with the number of terraformed worlds.
- Planetary thrusters adjust day-night cycle duration when spin changes.
- Surface flow rates scale with planet radius, so larger planets experience faster hydrological movement.
- Spaceship projects in continuous mode display "Continuous" or "Stopped" instead of a progress bar.
- Continuous spaceship projects revert to discrete timing when assignments fall to 100 ships or fewer.
- Continuous spaceship projects display total gains as per-second rates.
- Continuous spaceship projects display total costs as per-second rates.
- Gas-importing space mining caps per-tick transfers at the configured pressure limit.
- Dynamic water-import space mining projects scale per-second gains with the assigned ship count.
- Space Storage project only marks ship transfers as continuous, leaving expansion progress discrete.
- Added a setting to preserve project auto-start selections between worlds.
- Water overflow no longer contributes to resource totals but remains displayed in tooltips.
- Project auto-start now runs within ProjectManager and requires the `automateSpecialProjects` flag.
- Carbon and nitrogen importation projects now start with configurable default pressure limits.
- Cargo Rocket project cannot start without selecting any resources.
- Space Storage continuous mode transfers resources each tick and is toggled by the Auto Start Ships checkbox.
- Space Storage displays transfer rate under Cost & Gain.
- Added Superalloys advanced research unlocking Superalloy Foundry, Superalloy Fusion Reactor, and Ecumenopolis District.
- Space Storage ship transfers scale with assigned ships, matching rates across the 100-ship transition.
- Space Storage transfers appear in resource tooltips as production or consumption.
- Space Storage expansion duration no longer decreases when ships are assigned; transfer duration scales separately with ship count.
- Space Storage ship transfer duration uses a fixed 100 s base unaffected by terraforming bonuses but scales with global duration multipliers, while expansion timing honors the same effects without depending on ship assignments.
- WGC shop offers a Superalloy production multiplier upgrade unlocked by Superalloys research, capped at 900 purchases, and increasing production by 100% per purchase.
- Added a maintenanceMultiplier attribute for resources; superalloys use a multiplier of 0 and maintenance costs scale with each resource's multiplier.
- Added placeholder Nanotechnology Stage I advanced research costing 125k.
- Ecumenopolis District coverage now reduces land available for life, lowers life terraforming requirements, and updates the life UI accordingly.
- Ecumenopolis District now provides 100M android storage.
- Colonies can upgrade to the Ecumenopolis District via the upgrade button and require full superalloy cost.
- The "Wait for full capacity" option only requires resources to fill a single ship.
- Self-replicating ship cap counts ships assigned to projects.
- Colony upgrade button scales with selected build count, showing 10 → 1 by default with costs and effects adjusted accordingly.
- Growth rate tooltip lists individual multipliers and hides neutral (+0/x1) entries.
=======
- Continuous spaceship and Dyson Swarm projects apply resource changes through resource.js accumulatedChanges.
- Continuous spaceship projects start without stored energy and scale resource flow to available amounts.
- Project productivity now sums costs and gains across all active projects and scales each by the worst resource ratio, so projects without costs (like the Dyson Swarm) still run at full output and ordering no longer matters.
- Project resource rates in tooltips display productivity-adjusted values.
- Continuous projects display "Stopped" when their auto-start checkbox is disabled.
- Auto start checkbox shows 'Run' when spaceship projects enter continuous mode and reverts when they return to discrete operation.
- Colony upgrades can be performed with fewer than ten buildings remaining, charging full cost for the final upgrade.
- Colony upgrade costs scale with missing lower-tier buildings, adding proportional water and land costs and increasing metal and glass requirements accordingly.
- Colony upgrades consume active colonies before inactive ones and require land for inactive replacements.
- Added a `treatAsBuilding` flag for certain projects like the Dyson Swarm Receiver so they contribute to building productivity and resource production loops.
- Population growth skill multiplier displays as 'Awakening' in the growth rate tooltip.
- Autobuild cost tracker preserves overflow milliseconds for accurate 10-second spending averages.
- Life designer shift-clicking ±1/±10 buttons spends or removes all available points.
- Projects with auto-start disabled skip cost/gain estimation, simplifying resource rate handling.
- Life designer ±1/±10 buttons include tooltips noting Shift spends or recovers all points.
- High-gravity worlds (>10 m/s²) show a warning in the random world generator and reduce colony happiness by 5% per m/s² above 10, capped at 100%.
- Worlds generated with a natural magnetosphere start with the magnetic shield effect and display as "Natural magnetosphere" in the terraforming summary.
- Random World Generator UI indicates whether a world has a magnetosphere.
- Added Underground Land Expansion research and android-assisted project for subterranean land growth.
- Underground Land Expansion project now operates even without androids, shows land expansion progress, and adds 0.1% of the planet's starting land per completion.
- Underground Land Expansion android speed scales with initial land and features a distinct tooltip from Deeper mining.
- Random World Generator temperature fields (Mean/Day/Night T) display '-' until the world is equilibrated.
- Added Orbital Rings advanced research unlocking a repeatable orbital ring megastructure that counts as additional terraformed worlds and can draw from space storage resources.
- Resource category headers include collapse triangles like special project cards.
- Orbital Ring project retains active status and remaining time through planet travel, continuing construction mid-journey.
- Worker resource can display negative values and hides its rate when `hideRate` is enabled in planet parameters.
- Resources with `hideRate` enabled no longer display a per-second rate in the resource list.
- Construction Office UI card unlocks with research and sits to the right of colony sliders.
- Construction Office card manages autobuilder status and strategic reserve, persisting settings through saves and travel.
- Strategic reserve input includes an info tooltip explaining its effect.
- Construction Office visibility updates dynamically based on research unlocks.
- Autobuilder respects a strategic reserve percentage, preventing builds that would dip resources below the configured reserve.
- Life UI checkmark table lists day and night temperatures for each zone.
- Buildings requiring workers can be prioritized via a checkbox, allocating workers to them before others.
- Geothermal power generation research only appears on worlds with geothermal deposits.
- Storage Depot maintenance cost reduced to 10% of its previous value.
- Self Replicating Ships research now costs 8M advanced research points.
- Dyson Swarm project displays when collectors exist even without receiver tech, hiding receiver energy output while allowing manual and automatic collector deployment.
- Cargo Rocket project applies rates only once by honoring the `applyRates` flag in `estimateProjectCostAndGain`.
- Cargo Rocket project becomes continuous after Ship trading research, immediately granting any pending gains and purchasing resources with funding over time.
- Cargo Rocket continuous mode displays a "Continuous" progress bar and a "Run" auto-start label.
- Milestone festival color changed to a warm green.
- Save-to-file default filenames include the current world name and timestamp.
- Carbon asteroid mining can auto-disable when O2 pressure exceeds a threshold (default 15 kPa), and space mining pressure controls now label gases like CO2 and N2.
- Terraforming Bureau oversight adds an auto-disable option for oxygen factories when O2 pressure exceeds a configurable threshold (default 15 kPa).
- Terraforming Bureau automation for GHG and oxygen factories now only operates once the Terraforming Bureau research is completed, preventing the checkboxes from functioning prematurely. Atmospheric Monitoring oversight for carbon and nitrogen space mining projects likewise requires its research before automation activates.
- GHG factory automation now produces only the greenhouse gas required to reach the target temperature using Newton's method.
- GHG factory automation supports automatic reversal: when reverse is enabled, it disables between two thresholds and removes greenhouse gases or calcite above the upper limit.
- GHG automation temperature thresholds maintain at least a 1 °C gap, adjusting the other threshold when one changes.
- Oxygen factory automation now produces only the oxygen required to reach the target pressure using Newton's method.
- Life designer day/night temperature rows display survival and growth status icons, and the separate survival temperature row has been removed.
- Production, consumption, and maintenance displays scale with selected build count.
- Life UI requirement icons display tooltips explaining failure when hovered.
- Nanotechnology system tracks a nanobot swarm with growth and Stage I sliders, consuming excess power, silicon, and producing glass while limiting maintenance. Silicon consumption draws from accumulated changes plus stored value, swarm size scales with land area, and only 1e15 bots survive travel.
- Nanobot growth rate displays turn orange when power limits prevent reaching the optimal rate.
- Nanobot silicon growth boost scales with actual silicon consumption rather than energy availability.
- Nanotech UI shows both optimal and actual energy and silicon consumption rates, highlighting shortfalls in orange.
- Nanotech swarm energy usage can be limited to a player-defined percentage of total energy production (default 10%).
- Nanotech energy limit input now supports percentage of power or absolute (MW) modes via a dropdown with an explanatory tooltip, multiplying absolute entries by one million.
- Story and random world travel now share preparation logic, saving Space Storage state and capping nanobots before initializing the new planet.
- Resource disposal and space export in continuous mode display total export as per-second rates.
- Space export and disposal projects use a shared `getShipCapacity` method so ship capacity effects scale assignment limits and per-ship amounts.
- Advanced Logistics skill now boosts Space Storage ship transfer capacity.
- Starting a new game now fully resets the nanotech swarm and its sliders.
- Projects can be reordered based on visibility rather than unlocked status, using a new `isVisible` method; Dyson Swarm has a custom implementation.
- Random world equilibration now weights final day and night temperatures by each zone's surface area percentage.
- Planetary thrusters clamp spin and motion changes to their targets, preventing overshoot.
- Planetary thrusters now apply delta v toward the target, accelerating or decelerating depending on whether the goal is lower or higher.
- Added Next-Generation Fusion research doubling Superalloy Fusion Reactor energy production.
- Temperature penalty for colonies now affects Ecumenopolis Districts.
- Colony energy penalty from temperature is continuous, scaling with distance below 15 °C or above 20 °C.
- WGC logs now format artifact gains with two decimal places.
- WGC team cards cache DOM nodes for buttons, inputs, selects, progress bars, logs and HP bars, rebuilding these caches when cards redraw or team counts change for faster updates.
- Methane melting and freezing now respect methane ice coverage.
- Planetary thrusters operate as a continuous project, drawing power from ongoing energy production instead of only stored energy.
- Projects with sustain costs draw from current production before dipping into stored resources so they can run continuously.
- Planetary thrusters appear in the Energy resource rate tooltip, listing their consumption.
- Freezing processes scale with liquid surface area and accept liquid coverage functions.
- Added decillion, undecillion, and duodecillion number units.
- Melting and freezing rate calculations use cached coverage values.
- Hydrology surface flow uses cached zonal coverage values.
- Evaporation and sublimation rate calculations use cached zonal coverage values.
- fastForwardToEquilibrium now checks zonal biomass and buried hydrocarbons for stability, matching equilibrate.
- Hydrology surface flow now uses durationSeconds instead of deltaTime to avoid floating point drift.
- `getTerraformedPlanetCountExcludingCurrent` now deducts the current world's orbital ring, if present, when tallying previously terraformed worlds.
- Story projects stop running and cannot be started on worlds other than their designated planet.
- Resource tooltips display total production and total consumption at the top of their tables.
- Atmospheric oxygen and methane above 1 Pa combust into water and carbon dioxide at a rate proportional to the world's surface area and the excess pressure product.
- Water overflow in resource tooltips now appears in its own section beneath Consumption and Maintenance.
- Surface ice and liquid water tooltips display overflow in a dedicated section.
- Added spacing before the Autobuild Cost section in resource tooltips.
- Surface albedo tooltip explains how biomass, water, and ice coverage percentages are determined.
- Water evaporation, condensation, and phase-change logic in `terraforming.js` now uses `waterCycle.processZone`.
 - Structures have an auto-set-active checkbox inside the "Set active to target" button to match target each tick, and its state persists through saves. The checkbox is unchecked by default.
- calculateInitialValues now records initial solar flux so luminosity deltas compare against the baseline value.
- Luminosity tooltips and the Space Mirror Facility now display average solar flux (dividing day flux by four to account for day/night cycles and sunlight angle).
 - Autobuild now constructs structures inactive and the auto-set-active option is disabled by default, letting players queue builds without immediately increasing active counts.
- Autobuild now constructs structures inactive and the auto-set-active option (enabled by default) applies activation afterward, letting players queue builds without immediately increasing active counts.
- Added a Statistics section under Save and Settings showing total playtime across all planets.
- Added setting so enabling autobuild also toggles Set Active to Target, enabled by default.
- Autobuild priority and auto-active settings persist through planet travel.
- Settings page arranged in three columns with temperature and dark mode options first.
- Colony tab split into separate structures and controls sections, placing the Nanocolony below colony controls.
- Storage capacity display now scales with the selected build count.
- Added an Any Zone option to space mirror finer controls for global distribution based on slider percentages.
- Any Zone row now supports manual 0/±/Max assignment buttons for mirrors and lanterns.
- Satellites project now features an Auto Max option that raises build count to the current colonist cap.
- Space mirror oversight sliders now clamp values so none go negative and their total always sums to 100.
- Space disposal projects can auto-disable gas exports when atmospheric pressure falls below a configurable kPa threshold.
- Pressure automation controls on space mining and disposal projects now include a unit dropdown for kPa or Pa, defaulting to kPa.
- The Any Zone slider in the space mirror facility can be increased, taking percentage from the largest other sliders so the total remains 100%.
- Land usage recalculates on save load, and inactive structure construction checks land without reserving it.
- Space mirror facility now verifies slider percentages each tick, clamping out-of-range values and ensuring they total 100%.
- Space mirror facility now supports a reversible reflect mode with Toward World/Away From World selection.
- Reversed space mirrors now subtract flux from their zones while lanterns continue adding, and zonal flux is floored at 6 µW/m²; the luminosity tooltip notes this limit.
- Metal exportation project shows assigned ship count as current/maximum so players know remaining capacity.
- Space export project's max export capacity line includes a tooltip explaining Earth's metal purchase limit.
- Max export capacity tooltip is generated once and no longer updates each tick, making it readable.
- Max export capacity tooltip now displays an info icon so the explanation is visible.
- Space mirror finer controls show counts of unassigned mirrors and lanterns available for manual assignment.
- Space mirror reversal buttons again affect slider mode, and finer control checkboxes now flip flux per zone.
- Space mirror facility supports an advanced oversight mode that removes the Any Zone assignment and prepares temperature and water targets.
- Space storage water withdrawals can target colony water or surface via a withdraw-mode dropdown.
- Manual building toggle buttons now uncheck the Set active to target option when clicked.
- Colony and nanocolony sliders now share styling, differing only in width.
- Colony slider settings are managed by a `ColonySlidersManager` extending `EffectableEntity`.
- Production and consumption displays update existing DOM nodes without rebuilding, preventing orphaned elements.
- Nanobot growth rate now shows three decimal places, and the nanobot count and cap turn green when maxed.
- Cargo Rocket auto-start now saves selected cargo and clears selections when auto-start is off on load.
- Research UI caches DOM nodes for faster updates and rebuilds caches when research order changes.
- Space Storage project caches ship and expansion auto-start labels and rebuilds them when the automation UI is recreated.
- Project automation settings cache their child elements for faster visibility checks and refresh the cache when options change.
- Life UI caches modify buttons, temperature units, and status table cells, refreshing caches when designs change or the table rebuilds.
- Colony need boxes cache DOM references for faster updates and rebuild when colony needs or structures change.
- Project resource-selection grids cache their input elements for quicker cost calculations and rebuild those caches when grids are reset.
- Space UI caches Random World tab elements and rebuilds the cache when the tabs regenerate.
- Calcite aerosol decays with a 240 second half-life and its consumption appears in resource rates.
- Surface, actual albedo, and solar flux tooltips now refresh in real time with breakdowns.
- Luminosity box includes Cloud & Haze penalty applied to modified solar flux.
- Effective temperature without atmosphere uses the pre-penalty modified solar flux.
- Zonal solar panel multipliers apply the Cloud & Haze penalty for life energy calculations.
- Actual albedo tooltip lists per-zone values and component contributions; total is shown outside the tooltip.
- Ground albedo tooltip shows white dust albedo and coverage, hiding coverage lines when a dust type has 0%.
- Colony resource tooltips show a Net Change (including autobuild) line before production, subtracting the last 10 seconds of autobuild cost from the net rate. Other resources display Net Change without autobuild.
- Space storage tooltips separate transfer and expansion costs, and resource tooltips ignore consumption when costs are paid from space storage.
- Resource tooltips split into three columns when too tall to fit above or below the viewport, prioritizing below placement.
- Workers tooltip lists how many workers come from colonists above the android count.
- Resource tooltips only update while hovered, reducing unnecessary DOM work.
- GHG and oxygen factory settings now export from src/js/ghg-automation.js.
- Reverse button toggles dust or GHG factory recipes even when no factories are built.
- Random World Generator history lists visited worlds with names, types, seeds, states and departure times.
- Random world departures now log timestamp and Ecumenopolis land coverage.
- Space storage total cost display now shows cost per second in continuous mode.
- Random World Generator re-renders after travel to respect new travel locks.
- Space mirror facility advanced oversight now allocates mirrors and lanterns via bisection on zone temperature using `updateSurfaceTemperature`.
- Solis shop offers research points, and the advanced oversight upgrade now appears under Research Upgrades beneath the research auto-complete upgrade once `solisUpgrade1` is set.
- Space mirror reversal column hides until reversal is unlocked, removing its checkboxes when unavailable.
- Optical depth display now shows three decimal places.
- Added a `force` argument to `updateRender` to bypass tab visibility checks for a one-time UI update when pausing via Save & Settings.
- Journal reconstruction now resolves `$WGC_TEAM_LEADER$` placeholders using current team leader names when loading saves.
- Reversal buttons now appear immediately when unlocked by story effects, without requiring a reload.
- Productivity calculation now accounts for resource production gained from maintenance conversions.
- Project productivity now only considers continuous projects and ignores cost-free producers when determining available resources.
- Finer controls collapse toggle now uses triangle icons instead of a plus, matching resource lists.
- dayNightTemperaturesModel now forwards aerosol column mass to albedo calculations.
- Solis shop upgrades respect max purchase limits, hiding cost and buy buttons once the limit is reached.
- Life growth and decay now interpolate across a ±0.5 K band around survivable temperature limits, showing a warning icon when growth is reduced.
- Biomass resource display shows red exclamation marks for zones with net decay.
- Zonal resource changes now use nested maps grouped by resource, simplifying atmospheric and precipitation handling.
- Added ResourceCycle base class to centralize per-zone phase-change calculations.
- Introduced WaterCycle class extending ResourceCycle with an exported instance for evaporation and sublimation calculations.
- Added MethaneCycle and CO2Cycle subclasses extending ResourceCycle for hydrocarbon and dry ice modeling.
- Deprecated standalone condensation helpers in favor of using each cycle instance's `condensationRateFactor` method directly.
- Split water evaporation and sublimation calculations into separate `waterCycle.evaporationRate` and `waterCycle.sublimationRate` methods.
- Water, methane, and CO₂ cycle modules now import the shared `ResourceCycle` base class instead of defining it inline.
- index.html loads `resource-cycle.js` before cycle modules so subclasses can extend the base class in browser environments.
- Added `processZone` methods to water, methane, and CO₂ cycles, composing base helpers to generate zonal change objects.
- MethaneCycle constructor now accepts transitionRange, maxDiff, boilingPointFn, and boilTransitionRange options used during zonal processing.
- Resource panel margins are now configurable; default planet parameters add 5px spacing after workers, glass and food, and before androids.
- Subtabs now remember and restore their vertical scroll position when revisited.
- Special project subtabs also retain their individual scroll positions when switching categories.
- Space mirror facility adds an Unassigned slider leaving a portion of mirrors and lanterns idle.
- Introduced a reusable `SubtabManager` handling subtab activation, visibility, and scroll restoration across UI modules.
- Buildings now feature collapse arrows hiding cost, production, consumption, maintenance, description and advanced autobuild controls.
- Reducing a space mirror oversight slider now transfers the removed percentage to Unassigned.
- Space mirror oversight settings persist through save and load as part of the project state.
- Loading a saved game now triggers a one-time forced render to refresh the UI.
- Special project cards like Mirror Oversight, Planetary Thrusters, Space Storage, and Dyson Swarm now feature collapsible headers.
- Space storage strategic reserve and nanobot energy limit inputs now accept scientific notation (e.g., 1e3 for 1000).
- Space storage strategic reserve input includes a tooltip noting that mega projects respect the reserve while transfers do not, and explaining scientific notation support.
- Space mirror facility's unassigned slider matches the width of other sliders and locks when finer controls are enabled.
- Water melt target input in space mirror facility advanced oversight is wider and includes k/M/B scaling dropdown.
- Added `reinitializeDisplayElements` to Resource for resetting default display names and margins after travel.
- Resource `reinitializeDisplayElements` now pulls display defaults from `defaultPlanetParameters` instead of storing them on each resource.
- Life growth rate tooltip now reflects ecumenopolis land coverage and shows land reduction percentage.
- forceUnassignAndroids unassigns the ceiling of assigned androids minus effective capacity and only accepts integer counts.
- Building production and consumption displays color-code resources: green for production fixing deficits and orange for costs that would cause deficits.
- Resources with `marginTop` or `marginBottom` now show a thin separator line centered within that margin that only appears when the resource is visible.
- GHG factory temperature disable controls now accept decimal values.
- GHG factory temperature inputs no longer overwrite user edits while focused, enabling decimal adjustments.
- Solis shop displays "Purchased" instead of a count when an upgrade reaches its maximum purchases.
- Cargo rocket project resource selection now uses 0/-1/+1,/10,x10 controls for consistency.
- Space storage ship assignment multiplier persists through save and load.
- Cargo rocket x10 and /10 buttons adjust the ± buttons' increment instead of changing the current value.
- Cargo rocket ship price increase now persists through save/load and planetary travel.
- Added Mechanical Assistance advanced research adding a `mechanicalAssistance` boolean flag to colony sliders and unlocking a "Mechanical Assistance" slider ranging from 0 to 2 in 0.2 steps.
- Mechanical Assistance slider increases components consumption for all colonies by the slider's value.
- Mechanical Assistance slider displays a mitigation percentage and reduces gravity penalty for colony growth accordingly.
- Mechanical Assistance component costs now scale with colony tier using a 10^(tier-3) multiplier.
- Colonies gain a Components need box when Mechanical Assistance is above 0; it sits between Food and Electronics and scales the gravity mitigation by its fill level.
- Cargo rocket x10 and /10 buttons are now global controls in the resource selection header.
- Buildings and colonies can gain new consumption resources via an `addResourceConsumption` effect.
- Colony sliders UI now provides `updateColonySlidersUI` to toggle the Mechanical Assistance slider when its flag is unlocked.
- `updateColonySlidersUI` now reads the `mechanicalAssistance` flag from `ColonySlidersManager` rather than the settings object.
- Mechanical Assistance slider hides when no gravity penalty exists, only appearing on worlds with gravity above 10 m/s².
- Mechanical Assistance slider label includes an info tooltip explaining gravity penalty mitigation.
- Advanced oversight assignment now respects water melt targets when focusing, allocating mirrors and lanterns by priority.
- Random World Generator terraformed-type effects now grant bonuses; Titan-like worlds shorten Nitrogen harvesting project duration, Carbon planets speed Carbon Asteroid Mining, icy moons accelerate Ice and Water importation, and Mars-like worlds boost global population growth by 1% each.
- Random World Generator terraformed-type effects now grant bonuses; Titan-like worlds shorten Nitrogen harvesting project duration based on count.
- Random World Generator Super-Earths count as an additional terraformed world through a new effect.
- ProjectManager duration multiplier is now computed on demand via `getDurationMultiplier` instead of a stored attribute.
- Desert worlds grant +10% Ore Mine production per desert world terraformed, and desiccated deserts grant +10% Sand Quarry production per desiccated desert terraformed.
- Random world types now include display names used for the type dropdown and effects list.
- Added "Very Cold" orbit preset (10–100 W/m²) to the Random World Generator.
- Completing Vega-2 (chapter 17.5) now unlocks hot orbits in the Random World Generator.
- Fixed the chapter 17.5 reward so the Random World Generator actually unlocks the hot orbit.
- Cycle modules now expose `getCoverage(zone, cache)` helpers so `Terraforming.updateResources` pulls zonal coverage through each cycle instead of reading `zonalCoverageCache` directly.
- ResourceCycle now exposes an optional `redistributePrecipitation` hook implemented by
  WaterCycle and MethaneCycle, and Terraforming calls the hook for each cycle.
- ResourceCycle now provides `finalizeAtmosphere` to scale zonal atmospheric losses and apply precipitation consistently across cycles.
- ResourceCycle now offers a `runCycle` method that processes all zones, finalizes atmospheric changes and redistributes precipitation so terraformers can access zonal and total results.
- Cycle subclasses store default keys and parameters so `updateResources` only supplies dynamic values when running cycles.
- Water and methane cycles now run surface flow during `runCycle` via a shared `surfaceFlow` helper, removing standalone flow simulation from `updateResources`.
- ResourceCycle provides `applyZonalChanges` to update zonal surface stores and return totals, letting `runCycle` and its subclasses apply results without merge loops in `updateResources`.
- Resource cycles now update atmospheric/surface rates and terraforming total fields via `updateResourceRates`; `Terraforming.updateResources` simply delegates to each cycle.
- ResourceCycle now provides shared zone-processing and rate-update logic through configurable coverage and precipitation keys, optional surface flow hooks, and total-to-resource mappings.
- Cycle instances now carry atmospheric keys and process metadata and Terraforming loops over a `cycles` array to run them.
- Atmospheric chemistry module now handles methane–oxygen combustion and calcite aerosol decay.
- Added `buildAtmosphereContext` helper centralizing atmospheric pressure calculations for reuse in `Terraforming.updateResources`.
- Atmospheric chemistry now assigns resource rates internally, removing rate handling from `Terraforming.updateResources`.
- Removed rapid sublimation logic from WaterCycle, simplifying phase change calculations.
- Removed rapid sublimation mechanics from the methane hydrocarbon cycle.
- WaterCycle now sets distinct albedo defaults for liquid water evaporation and ice sublimation.
- WaterCycle now uses the Murphy & Koop (2005) saturation vapor pressure formulation via `saturationVaporPressureMK` and exposes updated helpers.
- Added liquid CO2 surface resource and zonal tracking.
- ResourceCycle converts melting into rapid sublimation when liquid water is forbidden, recording rates for ice and atmosphere as "Rapid Sublimation".
- Methane cycle converts melting into rapid sublimation when liquid methane is forbidden, tracking hydrocarbon ice and atmospheric methane as "Rapid Sublimation".
- Cargo rocket x10 and /10 increment count now persists through save and load.
- Added a sulfuric acid atmospheric resource integrated with physics.js and albedo cloud calculations.
- Zonal dry ice storage moved from `zonalSurface` to `zonalCO2.ice` and all interactions updated accordingly.
- Random World Effects card can now be collapsed to hide its table.
