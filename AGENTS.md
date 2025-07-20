# Instructions
- Document major feature updates in this file.
- Keep imports and exports browser friendly for loading via **index.html**.
- Place story projects in **progress-data.js** near the chapter where they unlock.

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
Calling `startNewGame()` fully recreates the game state and returns the player to Mars. Nothing carries over between playthroughs.

### Planet travel
Selecting another world via `selectPlanet(key)` soft resets the colony while keeping meta systems. It awards one skill point on the first visit and calls `initializeGameState({ preserveManagers: true, preserveJournal: true })` so that:
* `ResearchManager` survives but `resetRegularResearch()` clears normal tech while advanced research and its resource are preserved.
* `SkillManager` retains unlocked skills and re‑applies their effects.
* `SolisManager` keeps quests, points and shop upgrades.
* `SpaceManager` records which planets have been visited or terraformed.
* `StoryManager` continues tracking active events and re‑applies their rewards.
* The **Dyson Swarm Receiver** project's collector count persists, maintaining its energy contribution across planets.

When loading a save or switching planets, call each manager's `reapplyEffects` method so stored modifiers affect the newly created game objects.

## Dyson Swarm Receiver
Research unlocks a large orbital array followed by the **Dyson Swarm Receiver** mega
project. The receiver costs 10&nbsp;M metal, 1&nbsp;M components and 100&nbsp;k electronics and
builds over five minutes. Once complete, players may deploy orbital solar collectors.
Collectors consume glass, electronics and components and can be automated. Their total
count persists between planets and each adds **Dyson Swarm** energy production.

Other modules include **save.js**, **projects.js**, **projectsUI.js**, **spaceship.js**,
**day-night-cycle.js**, **journal.js**, **population.js**, **ore-scanning.js** and
**warning.js**.

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

# Testing
- `jest` and `jsdom` are available globally.
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

# Changelogs
- The collector progress bar continues updating after the receiver is finished and
  controls stay disabled until the receiver completes.
- The solar collector UI remains hidden until the receiver is built.
- The collector cost now appears on the Dyson Swarm card.
- Sustain costs for active projects register as `project` consumption in tooltips.
- Projects with ongoing resources check supplies one second ahead.
- The luminosity box shows ground and surface albedo separately.
- Surface albedo deltas compare against initial values, listing black dust, water,
  ice and biomass percentages.
- Projects now save and load themselves with dedicated methods overridden by subclasses.
- Dyson Swarm collector duration now scales with the number of terraformed planets using a helper in SpaceManager, and the button shows the time required.
- Day-night cycle duration now derives from each planet's rotation period, treating one Earth day as one minute.
- Added a "system-pop-up" story event type for instant messages.
- Added a `setGameSpeed` console command that multiplies time progression for the current session.
- Bio Factory stops producing if designed life can't survive in any zone.
- Life growth rate shows 0 when no liquid water is present and its tooltip lists a moisture multiplier.
- Subtab alerts indicate available Solis quests and completable terraforming milestones.
- Space mirror power per unit area now uses cross-section area for accurate flux.
- Space mining water shipments now deliver liquid water to zones above freezing or ice if all zones are below 0°C.
- Melting and freezing rate calculations now use `calculateZonalCoverage` for ice so scale factors are correct.
- Hydrology wrappers no longer pass `estimateCoverage` to the melt/freeze util; they provide a `calculateZonalCoverage` function instead.
- Surface albedo now averages zonal albedos and the luminosity tooltip lists rock, water, ice and biomass percentages per zone.
- Hydrocarbon and dry ice coverage now contribute to surface albedo calculations and appear in the luminosity tooltip.
- Surface albedo tooltip now shows a detailed breakdown for each zone.
- Luminosity tooltip lists all albedo values and updates when the base albedo changes.
- Luminosity box now shows actual albedo including cloud fraction with a tooltip explaining the calculation.
- Actual albedo calculation now resides in physics.js and the luminosity box pulls the value from this helper with an updated tooltip.
- Actual albedo tooltip now explains cloud and haze contributions in plain language.
- Autobuild no longer records any cost when a structure can't be built due to missing land.
- Space mirror oversight now distributes mirrors across zones with sliders for each zone and an automatic "any zone" value.
- Overflowed colony water now pools as liquid only in warm zones, or as ice across all zones when none are above freezing.
- Overflow water splits proportionally among warm zones instead of using their global percentages.
- Modified solar flux now averages zonal solar flux values so the luminosity display reflects zone distribution.
- Resource disposal projects can now disable exports below a user-set temperature threshold when Atmospheric Monitoring is researched.
- Workers tooltip now shows the colonist worker ratio and lists assignments per building sorted by usage.
- Workers tooltip also lists android-provided workers.
- Demo branch ends after chapter6.3b with a system pop-up instead of unlocking Callisto.
- Buildings and special projects now show an exclamation mark when first unlocked. Alerts clear on visiting the relevant tab or subtab and can be disabled in settings.
- Project cards can be collapsed via the title to hide details except automation options.
- Collapsing a project card now keeps its title aligned on the left.
- Save screen includes a Pause button to stop game updates.
- Active building subtab alerts clear immediately when unlocking a structure while that subtab is open.
- Pause button now sets game speed to 0 so time does not advance when paused.
- Building subtab alerts now clear when switching subtabs.
- A grey "PAUSED" alert appears in the warning area whenever the game is paused.
- Adapted fission power now doubles reactor water usage.
- Resource tooltips show remaining time until cap or depletion based on current rates.
- Research lists only reveal the three cheapest available items per category. Others show ??? until unlocked.
- Terraforming calculations preserve provided surface and cross-section area values.
- Collapsed project cards now keep their reorder arrows visible so special projects can be moved without expanding them.
- Reorder arrows for special projects now ignore locked projects when determining movement limits.
- Temperature unit preference now persists when traveling to another planet.
