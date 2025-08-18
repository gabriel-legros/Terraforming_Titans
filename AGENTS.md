# Instructions
- Document major feature updates in this file.
- Keep imports and exports browser friendly for loading via **index.html**.
- The game needs to be able to run from a browser-like environment.
- Place story projects in **progress-data.js** near the chapter where they unlock.
- Tooltips should use a `<span class="info-tooltip-icon">&#9432;</span>` element with a descriptive `title`.

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

# UI refresh requirements
- **Starting a new game** – call `startNewGame()` which rebuilds game state.
- **Loading a save** – `loadGame()` invokes `initializeGameState({ skipStoryInitialization: true })` then applies the saved data.
- **Moving to another planet** – `selectPlanet(key)` switches the planet and
  calls `initializeGameState({ preserveManagers: true })` followed by `updateSpaceUI()`.
Failing to use these helpers may leave the DOM bound to outdated objects.
To ensure this works properly, every feature in the game that has an UI should have an enabled true/false attribute.  When updating its display, if the flag is true, the feature should be revealed.  If false, it should be hidden.  This flag should not be saved/loaded.  Instead, story unlocks, researches and other things will re enable it as needed.

# Testing
- Run `npm ci` to install dependencies before running tests.
- Save tests output to a file so you don't have to rerun it just to read the results.
- Write tests for any new feature.
- Run tests with `npm test` and report how many passed or failed.
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
Space mirrors are overseen through sliders that distribute units across surface zones. Completing the Space Mirror Focusing research reveals an additional control that concentrates mirrors to melt surface ice into liquid water in the warmest zone with ice. The facility now handles zonal flux and melting calculations internally. The display now shows average temperature in each zone.

## Random World Generator
The Random World Generator manager builds procedural planets and moons with lockable orbit and type options. Worlds must equilibrate before travel; a progress window tracks simulated time and allows canceling or ending early once the minimum fast-forward is reached. Seeds encode UI selections so players can revisit specific worlds, and the manager prevents travel to terraformed seeds while persisting star luminosity and other parameters through saves. Traveling from a fully terraformed world to a random world awards a skill point on the first visit, and planetary thrusters on these worlds use the host star's mass for orbital calculations.

# Changelogs
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
- Construction Office visibility updates dynamically based on research unlocks.
- Autobuilder respects a strategic reserve percentage, preventing builds that would dip resources below the configured reserve.
- Life UI checkmark table lists day and night temperatures for each zone.
- Buildings requiring workers can be prioritized via a checkbox, allocating workers to them before others.
- Self Replicating Ships research now costs 8M advanced research points.
