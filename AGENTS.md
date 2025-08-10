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
Calling `startNewGame()` fully recreates the game state and returns the player to Mars. Nothing carries over between playthroughs.

### Planet travel
Selecting another world via `selectPlanet(key)` soft resets the colony while keeping meta systems. It awards one skill point on the first visit and calls `initializeGameState({ preserveManagers: true, preserveJournal: true })` so that:
* `ResearchManager` survives but `resetRegularResearch()` clears normal tech while advanced research and its resource are preserved.
* `SkillManager` retains unlocked skills and re‑applies their effects.
* `SolisManager` keeps quests, points and shop upgrades.
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
To ensure this works properly, every feature in the game that has an UI should have an enabled true/false attribute.  When updating its display, if the flag is true, the feature should be revealed.  If false, it should be hidden.  This flag should not saved/loaded.  Instead, story unlocks, researches and other things will re enable it as needed.

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
- Biodome stops producing if designed life can't survive in any zone.
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
- Project subtab alerts now clear when viewing the projects tab while that subtab is active.
- A grey "PAUSED" alert appears in the warning area whenever the game is paused.
- Adapted fission power now doubles reactor water usage.
- Resource tooltips show remaining time until cap or depletion based on current rates.
- Research lists only reveal the three cheapest available items per category. Others show ??? until unlocked.
- Terraforming calculations preserve provided surface and cross-section area values.
- Collapsed project cards now keep their reorder arrows visible so special projects can be moved without expanding them.
- Reorder arrows for special projects now ignore locked projects when determining movement limits.
- Atmosphere box shows a green check or red X for each gas requirement.
- Temperature unit preference now persists when traveling to another planet.
- Metal export projects now cap each export at max(terraformed planets, 1) billion metal.
- Time to full/empty tooltips now display 0s when a resource is already full or empty.
- Story project journal entries now include a separator line and prefix showing progress.
- Deeper mining supports android assignments for massive speed boosts.
- Android assignment UI initializes hidden and shows once the upgrade is researched.
- Android project speed multiplier now adds 1 to the calculation and updates active progress bars immediately. The display reads "Deepening speed boost" beside the controls.
- Deeper mining costs now scale with ore mines built. Android boost scales with built mines instead of deposits.
- Deeper mining now uses a dedicated class `DeeperMiningProject`.
- Project completions increase the average depth by one.
- Deeper mining tracks ore mines built and their average depth. It pulls the count from buildings after each construction, and ore mine costs no longer increase.
- Settings menu can disable the day-night cycle. Solar panels and Ice Harvesters operate at half strength and the progress bar hides.
- Day-night toggle also halves maintenance for those structures and skips the penalty on Ice Harvesters once Infrared Vision is researched.
- Restored the yellow/blue animation by re-linking the day-night cycle stylesheet.
- Day-night setting checkbox now updates when starting a new game or loading a save.
- Solis tab remains hidden in HTML until chapter 5.2 unlocks it.
- Solis subtab visibility now checks a saved enabled flag so loading earlier saves hides it again.
- Day-night effects no longer reapply each frame; they update only when toggling the setting or loading a save.
- Progress data split into per-planet files under src/js/story.
- progress-data.js now merges those files instead of storing all chapters inline.
- Added advanced research "Self Replicating Ships" unlocking an industry research
  of the same name that causes unused spaceships to duplicate at 0.1% per second
  up to one trillion units.
- Replication logic now resides in self-replicating-ships.js and is invoked from resource.js.
- Removed unused Dyson Swarm JS files and updated tests to use the project versions.
- Added Planetary Thrusters special project placeholder.
- Planetary Thrusters script now loads in index.html so the hidden project is generated correctly.
- Planetary Thrusters project now shows spin and motion subcards with orbital and distance info.
- Spin and motion subcards only appear once the Planetary Thrusters project is completed.
- Moons now include parent body name, mass and orbit radius in planet-parameters.
- Parent body info now resides inside each planet's `celestialParameters` object.
- Loading a save now merges any new projects into the order so updates aren't skipped.
- Planetary Thrusters spin card includes a default 'Target : 1 day' field.
- The motion card warns moons to leave their parent's gravity well before altering solar distance.
- Celestial parameters now track their original values and reload from configuration when saving or loading games.
- Planetary Thrusters spin target is now an editable field that displays the energy required to change rotation.
- Planetary Thrusters motion card shows escape energy for moons or an orbital target field for planets.
- Loading a save now takes initial celestial parameters from configuration and fills missing current values from them.
- Moon thruster warning moved from the global warning box to a small notice within the Planetary Thrusters card.
- Numbers above sextillion now format as Sp, Oc and No up to 1e30.
- Planetary Thrusters project gains an energy investment UI with +/- buttons, 0, /10, x10 and Max. Invested energy drains every second and shows in resource rates.
- Spin and motion options now include an Invest checkbox. Only one can be active at a time and the selection persists when saving.
- Planetary thruster energy now alters spin or orbit when invested, and moons drift outward toward escape.
- Escaped moons replace their parent body with "Star" and no longer count as moons.
- Deeper mining costs now scale 90% with ore mines and 10% with average depth. A tooltip on the project card explains the formula.
- Android assignment speed tooltip now states "1 + sqrt(androids assigned / ore mines built)".
- Deeper mining projects track maximum depth instead of repeat count and display average depth in the UI.
- Deeper mining effects now reapply when average depth changes and old saves default depth to completions.
- Deeper mining now multiplies ore mine consumption and maintenance in step with its production bonus.
- Added Warp Gate Command manager with a WGC subtab (wgc.js and wgcUI.js). The subtab remains hidden until unlocked and the manager persists across planets.
- Planetary Thrusters now use continuous power with internal element references and save/load their investment state.
- Planetary Thrusters UI now calculates delta-v and energy using the entered targets and hides spiral Δv until moons escape.
- Spin, motion and thruster power cards stay hidden until the project is completed.
- Thruster power display now uses `formatNumber` and energy consumption registers in resource rates.
- Scanner projects can build multiple satellites at once using a quantity selector with 0, ±, x10 and /10 controls.
- Warp Gate Command UI now features an R&D section and team management cards.
- WGC layout is generated dynamically via wgcUI.js instead of hardcoded in index.html.
- WGC R&D menu lets players spend Alien artifacts on team equipment and factory efficiency upgrades.
- Quantity selector buttons display their effect: "+" and "-" show the current step (e.g. +1, -1, +10, -10). The x10 and /10 buttons multiply or divide the step, never dropping below 1, and the 0 button resets the count.
- Ore satellite build quantity now caps at the project's maximum repeat count.
- WGC team slots now open a recruit dialog for custom-named members with class and skill allocation.
- WGC team members now track Health and Max Health, both starting at 100. Max Health scales with level.
- Added Space Storage advanced research unlocking a SpaceStorageProject mega project.
- Androids produce research once Hive Mind Androids advanced research is completed.
- Added a new special resource "Alien artifact" which starts locked.
- WGC R&D shop displays a header row labelled "Upgrade" and "Cost (Alien Artifacts)".
- ProjectManager automatically initializes scanner projects and assigns the ore scanner instance.
- Scanner projects now set scanning strength based on total satellites built rather than incrementing per completion.
- Scanning stops and the progress display hides once deposits reach their planetary cap.

- D_current now initializes from the matching deposit resource value.
- Import colonists adds its colonist gain to resource rates when auto-started.
- Satellite projects show their scaled cost in resource rates when auto-started.
- WGC team member skill "Stamina" renamed to "Athletics".
- WGC teams can now start operations when fully staffed. The Start button shows a 10-minute progress bar that loops automatically.
- Operations now feature random weighted challenges each minute. Results are logged, grant XP and may yield Alien artifacts when successful.
- WGC tracks total operations completed, displaying the count under the R&D menu.
  Teams Beta, Gamma, and Delta remain locked until 100, 500, and
  1000 operations respectively.
- Jest setup now suppresses console output for quieter test runs.
- Operation logs are now kept per team with an expandable section in each card.
- Operation logs list dice rolls, DC and skill totals.
- Starting an operation now displays the default summary text "Setting out through Warp Gate".
- Failed Social Science challenges now trigger the next event as a Combat challenge at 25% higher difficulty.
- Logs now show each team's operation number and insert a blank line after every completion.
- Team member dismissal is disabled during ongoing operations.
- Individual challenges that roll a 20 are now critical successes granting 1 Alien artifact.
- Critical successes display "Critical Success" in operation logs.
- Operations include a difficulty setting that adds to all DCs (team DC +4×) and
  increases artifact rewards by 10% per level. Failed individual checks deal
  10HP damage per level to the chosen member while failed team checks damage all
  members for 10HP.
- Recalling a team mid-operation now increments the next operation number.
- Operations abort if any member's HP hits 0. Their HP resets to 1, the team is recalled and the journal notes the injury.
- WGC team cards now label the difficulty selector with "Difficulty" displayed above the input.
- Operation XP rewards now scale with difficulty as `1 + 0.1×difficulty`.
- Team members with the lowest total XP gain a 1.5× catch-up bonus until they match their highest teammate.
- Team members regenerate 1 HP per step or 5 HP per step when recalled.
- Individual challenge summaries now include the rolling member's name.
- Team leaders now add half of their relevant skill to all individual and science challenges.
- Natural Science challenges now grant double artifact rewards, configurable via the `artifactMultiplier` event field.
- WGC Equipment upgrade now adds 0.1% artifact chance per purchase up to a +90% bonus (100% total) and is limited to 900 buys.
- Team member class selection becomes locked once recruited.
- Added Hazardous Biomass stance control with Negotiation and Aggressive options adjusting combat and social event weights.
- Artifact Retrieval stance offers Neutral or Careful modes. Careful doubles artifact chance on Natural Science challenges and delays the next event by triple time.
- Difficulty selector tooltip updated: challenge DCs rise (team +4 per level, individual +1 per level) and rewards increase by 10% per level. Failed individual checks now deal 5 HP per level, failed team checks damage everyone for 2 HP per level and failed combat checks hit everyone for 5 HP per level.
- Aggressive stance now removes Social Science challenges entirely while doubling combat weight.
- Scientific Artifact Retrieval stance offers Neutral or Careful modes. Careful doubles artifact chance on Natural Science challenges and delays the next event by triple time.
- Difficulty selector now includes a tooltip explaining that it raises challenge DCs (+4 per level for team, +1 for individual), grants 10% more XP and artifacts per level, and causes failed individual checks to deal 10 HP damage per level while failed team checks damage everyone for 10 HP.
- WGC Statistics menu now lists total operations completed and artifacts collected.
- WGC R&D buttons now display their cost directly and equipment upgrades show a +x% artifact chance. Multipliers are aligned vertically.
- WGC layout stacks the Statistics menu below R&D while keeping Teams on the right.
- Added a Facilities menu to WGC offering hourly upgrades that boost recovery, XP and skills.
- WGC Facilities menu now displays tooltips describing each upgrade's effect.
- Operation logs now show the leader's half skill bonus in individual and science challenges.
- Operations now record the highest difficulty cleared and grant Alien artifact bonuses equal to each newly conquered difficulty level (e.g. clearing level 4 from 0 grants 1+2+3+4 artifacts).
- ResearchManager now skips hidden entries when revealing the next three researches.
- Bio Factory renamed to Biodome, and Life Designer UI now shows a Biodomes section displaying points from biodomes.
- Added TerraformedDurationProject base class; Space Storage and Dyson Swarm now scale duration with terraformed planets. Space Storage is repeatable with 1 trillion tons capacity per completion.
- Space Storage project now offers spaceship assignment with resource checkboxes and always displays storage stats with terraformed duration reduction.
- Biodomes now require 100 land each, and the Life Designer UI separates controls from biodomes with a new divider.
- Biodomes now generate life design points hourly at log10(10×Biodomes); points accumulate fractionally and increase max design points by their floored total. The Biodomes section displays current points, hourly rate and max with a detailed tooltip.
- Auto build now constructs as many buildings as available land allows when targets exceed land.
- Land resource tooltip lists land usage per building sorted by amount.
- Space Storage UI now removes base storage display, shows per-resource usage table and adds a second progress bar with its own auto-start.
- Land resource tooltip now includes land used by colonies.
- Biodome points display now shows fractional progress and no longer lists the maximum.
- Space Storage ships now reduce duration up to 100 assignments, apply multipliers beyond that, support deposit/withdraw toggling and always show a resource table with current amounts.
- Space Storage now features Store/Withdraw mode buttons with even capacity distribution and transfers calculated at launch.
- Space Storage expansion progress bar activates once its metal cost requirements are satisfied.
- Space Storage UI now combines resource checkboxes with usage in a single table and places spaceship assignment below storage controls.
- Dyson Swarm and other mega projects can draw costs from Space Storage, with an option to prioritize stored resources.
- Space Storage UI shows Used and Max storage side by side, includes expansion cost with terraforming tooltip, and displays spaceship assignment next to ship cost & gain.
- Space Storage progress buttons now read "Start ship transfers" and "Start storage expansion".
- Space Storage card now correctly displays the expansion metal cost.
- Space Storage UI now places expansion cost alongside spaceship assignment and cost & gain.
- Space Elevator no longer negates Space Storage expansion metal cost, applying its metal cost reduction only to ships.
- Space Storage card now uses a single spaceship assignment and cost/gain display with populated values.
- Space Storage automation settings now sit next to the expansion auto start, which is labeled "Auto Start Expansion".
- Space Storage automation checkboxes are now created via the generic project UI like other project-specific controls.
- Story objectives can now check the highest Warp Gate Command operation difficulty completed, and chapter 14.1 requires clearing a difficulty 0 operation.
- Chapter 14.0 now enables the Warp Gate Command and automatically switches to its subtab.
- Space tab now includes Story and Random subtabs with Random hidden by default.
- jumpToChapter now recursively completes prerequisite chapters, marks required special projects finished, skips typing animation and rebuilds the journal.
- Claimed milestones in dark mode use a brighter green for clearer status.
- Biodomes now always draw power via an `ignoreProductivity` consumption flag.
- Colony buildings now feature an upgrade arrow converting ten of a tier into one of the next at half the next tier's cost (excluding water).
- Colony upgrade buttons now allow fewer than ten buildings, scaling metal, glass, water and land costs for the missing structures.
- Resource tooltips now use static DOM nodes updated without rebuilding innerHTML.
- Project cost and gain displays now reuse list items and total cost updates a dedicated span.
- Special project costs now display on a single line like building costs.
- Skill buttons reuse child elements, updating text only when values change, and skill connections redraw only after layout or prerequisite changes.
- Warning messages now reuse a cached DOM node and update text content without touching innerHTML.
- Advanced research unlocks now highlight the Research tab and subtab until viewed.
- Recreated skill connector lines by clearing cached paths when rebuilding the skill tree.
- Skill connectors now render correctly when the skill tree is drawn while hidden.
- Resource tooltips show numeric years for time to full and time to empty instead of >1 year.
- Viewed research alerts remain cleared after loading a save.
- Geothermal generators now require reduced maintenance instead of none.
- Jumping to a chapter now reconstructs the journal after rewards and objectives are applied.
- Terraforming Others box now displays surface radiation using new radiation utilities and stores the value for later use.
- Terraforming Others box now shows orbital radiation assuming no atmospheric shielding.
- Terraforming Others box now displays radiation growth penalty and lifeforms mitigate it with radiation resistance.
- Moon parent bodies now include radius values for accurate distance-based radiation calculations.
- Thruster Power subcard now shows exhaust velocity with a tooltip explaining specific impulse and aligns it in a column with the continuous power display.
- Thruster Power subcard now keeps exhaust velocity beside continuous power and adds a Thrust/Power ratio column.
- Added Tractor Beams advanced research setting planetary thrusters to a thrust-to-power ratio of 1.
- Thruster power control buttons now appear in the Continuous column.
- Thruster Power controls now occupy a dedicated second column in a four-column layout.
- Planetary thruster delta v values update every tick and default to 1 AU/1 day when unset.
- Exhaust velocity displays as N/A when Tractor Beams are active.
- Moon-based planetary thrusters no longer show target AU or spiral Δv, assuming a 1 AU target with all energy devoted to escape.
- Added Cloning Concept advanced research enabling energy-intensive cloning facilities to produce colonists.
- Planetary thruster Spin and Motion cards now include Energy Spent columns that persist when investment is toggled; motion energy resets only after a moon escapes its parent.
- Planetary thrusters now display an Energy Spent section tracking energy used for spin and motion and resetting after a moon escape.
- Planetary thruster invest selections now persist through saves and reloads with checkboxes and targets restored on load.
- Satellite projects now display discovered and maximum deposit counts.
- Dyson Swarm collectors now contribute their generated energy to the colony instead of only displaying it.
- Moon-based planetary thrusters show an Escape Δv row and hide spiral Δv when bound to a parent body.
- Escaped bodies keep their parent reference but set `hasEscapedParent` to track the event.
- ProjectManager now applies project gains each tick via applyCostAndGain, keeping estimateCostAndGain as a pure rate estimate.
- Ore and geothermal satellite UI now split Amount and Deposits into separate columns with aligned controls and fonts matching space mining projects.
- Added Space Mirror Focusing advanced research applying a boolean flag to the space mirror facility.
- Space mirror oversight controls include a Focusing slider revealed when the Space Mirror Focusing flag is set.
- Focused mirror energy melts only surface ice into liquid water, prioritizing the warmest zone with ice and showing rates in resource tooltips.
- Space mirror facility now computes focused melting and zonal flux internally, keeping terraforming.js leaner.
- Space Disposal project now displays the expected temperature reduction when jettisoning greenhouse gases.
- Infrared Vision research now immediately removes the day-night penalty on Ice Harvesters when the cycle is disabled.
- Android project assignments now keep androids in storage and tooltips show worker and project usage.
- Androids above their storage cap no longer contribute workers, and excess project assignments are reduced.
- Worker and android resource tooltips now reflect effective android counts when storage is over capacity.
- WGC teams can now be renamed and team names persist through saves.
- WGC R&D now offers a food production efficiency upgrade boosting Hydroponic Farm output.
- Operation logs now add a "Recalled" entry when a team is recalled.
- WGC artifact statistics now display totals using formatNumber with two decimal places.
- WGC recruit dialog now updates HP and XP in real time when member stats change.
- WGC artifact statistics now display totals using formatNumber with two decimal places.
- WGC team slots reduced from five to four.
- Loading saves now trims WGC teams to four slots.
- Planetary thruster energy tracking now persists by category and resets only when their targets change.
- Warpgate Teams Equipment purchase now includes a tooltip explaining its artifact chance bonus.
- Space Disposal project displays a 0K temperature change when no greenhouse gases are jettisoned.
- Skill rolls in WGC operation logs now use formatNumber with two decimal places.
- Auto-build percentages for buildings and colonies now persist through planet travel while all auto-build checkboxes reset.
- Colonists slightly over their cap (by less than 0.01) are now cropped to the cap instead of decaying.
- Repeatable projects clear their completed flag on load when more repetitions remain.
- Deeper mining now proceeds without android assignments, running at normal speed.
- Colony upgrade cost text now highlights only resources that are unaffordable.
- Solis tab now features an Alien Artifact section unlocked by a flag, letting players donate artifacts for points and buy Research Upgrades that auto-research early infrastructure, including the Terraforming Bureau.
- Added a Pre-travel save slot that automatically stores the game state before planet travel and remains hidden when empty.
- WGC class descriptions now appear in the member details window instead of on the team card.
- Solis artifact donation now uses the correct resource pool, properly displaying owned artifacts and enabling donations.
- Solis artifact donations now grant 10 points per artifact instead of 100.
- Solis research upgrade now lists upcoming technologies horizontally and crosses out each as it is purchased, clarifying that one tech is unlocked per purchase.
- Chapter 13.2 reward now triggers a one-time alert on the Solis tab.
- Journal objective for Warp Gate Command now displays "Complete an Operation of Difficulty X" for clarity.
- Fixed Dyson Swarm collectors resetting after planet travel; collector counts now persist across worlds while the receiver must be rebuilt on each planet.
- Collector persistence is managed through ProjectManager travel state so only the Dyson Swarm's collector count carries over between planets.
- Space Storage now allows storing glass.
- Space Storage now preserves its capacity and stored resources across planet travel using travel state save/load.
- WGC team members now gain 10 Max Health per level instead of 1.
- Loading saves now recalculates WGC team members' Max Health from their level.
- Skill points are now granted only when traveling from a fully terraformed planet to one not yet terraformed.
- WGC Facilities section now displays a red exclamation mark when upgrades are ready.
- WGC highest difficulty objective displays and tracks difficulty starting from 1.
- Recalling a Warp Gate Command team no longer resets its difficulty.
- Introduced `getTerraformedPlanetCountIncludingCurrent` in SpaceManager to avoid double counting the current planet when
  applying terraforming bonuses.
- Exposed `resources` and `currentPlanetParameters` on `globalThis` so RWG equilibration can safely snapshot and restore live state.
- RWG equilibration now enforces a 30s timeout and always finalizes to restore state.
- RWG equilibration waits at least 10s, displays a progress window with a cancel button, and always finalizes on cancel.
- Equilibrate button in Random World Generator can now be used repeatedly.
- Fixed RWG UI crash by restoring the `attachEquilibrateHandler` function.
- RWG equilibrate progress bar now fills as the simulation advances.
- Random World Generator now includes a Travel button that remains disabled until the world is equilibrated at least once and shows a warning until then.
- Space Manager tracks random world seeds and colonist populations, blocks travel to terraformed seeds, and displays current world details.
- Autosave slot can now be manually overwritten through the Save button.
- Land resource tooltip now notes that land can be recovered by turning off the corresponding building.
- Space UI now shows original planetary properties for story worlds.
- Story world details no longer display seed or type in the Space UI.
- Random World Generator travel warning now displays inline with triangle icons next to the Travel button.
- Random World Generator equilibration timeout now counts as having used the button for enabling travel.
- Cargo rocket ship purchases now add a flat +1 funding cost per ship divided by previously terraformed worlds (excluding the current planet) and decay by 1% per second.
- Story world original properties now apply planet overrides and aggregate zonal surface data for accurate totals.
- Cargo rocket ship purchases now raise future ship prices based on terraformed planets and decay by 1% per second.
- Metal export cap now counts previously terraformed worlds excluding the current planet.
- Life design biodome points now scale with active Biodomes instead of total built.
- Cargo rocket spaceship tooltip now appears immediately to the right of the Spaceships label.
- Pre-travel saves no longer update SpaceManager's current world before travel.
- Random World Generator equilibration window now offers an End Early button after the minimum fast-forward, enabling travel with current planet parameters.
- Traveling from a fully terraformed world to a random world now awards a skill point on the first visit.
- Random World Generator equilibration window now offers an End Early button after the minimum fast-forward, enabling travel with current planet parameters.
- Space UI caches the last world key and seed to skip redundant detail rendering.
- Auto mode in Random World Generator no longer generates locked planet types.
