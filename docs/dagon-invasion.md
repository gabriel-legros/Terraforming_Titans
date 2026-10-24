# Dagon development controls

The encounter is disabled by default. On an eligible save, enable its arrival controls from the browser console:

```js
galaxyInvasionManager.dagon.enabled = true;
updateGalacticInvasionUI({ force: true });
```

This flag is saved. Set it to `false` to hide the arrival controls again; it does not cancel an encounter already in progress. The console flag does not bypass the story, conquest, world, or storage requirements. The button starts the encounter only once per save. New game resets it.

After validating arrival requirements, starting Dagon writes the current state to the existing `pretravel` save slot before changing occupation, operations, or the story branch. This replaces the previous pre-travel checkpoint. If saving fails, the invasion does not start. Rejected or repeated start attempts do not overwrite the checkpoint.

To capture a sector for testing, use its display name or coordinate key:

```js
debugCaptureSector('R4-05');
debugCaptureSector('R3-13');
```

The helper grants full UHF control without spending resources or requiring Prometheus, cancels operations in that sector, and refreshes the UI. Story objectives advance normally when the game runs. It returns the sector and throws for an unknown name. It works outside Dagon too and does not require `DEBUG_MODE`.

The “????” box says “Something is coming...” without a header tooltip. Once enabled, the card shows its requirements; “It is here.” appears only when all are met. Story completion uses `gameCompleted`, the same saved flag that displays the save-slot star. A training invasion must finish or be cancelled first. Starting Dagon blocks further training invasions and all travel until the encounter is complete.

Travel is blocked at the `SpaceManager` story and random-world entry points, including artificial and Atlas destinations. Travel controls reflect the lock, and auto-travel stops before generating a destination. Completing the encounter releases the lock without changing automation preferences.

The unmet story-completion requirement offers a Skip button. Its Yes/No confirmation sets only `gameCompleted` when accepted, using the normal save lifecycle to persist that flag. It does not grant story rewards or bypass the other arrival requirements.

Chapter ? uses the existing journal and full-sector-control objectives. Its numeric ordering is 51, while its journal display title is Chapter ?. Starting Dagon selects the persisted `dagon` story branch: pending main-story events are retired without completion or rewards and cannot reactivate. Saves that already started Dagon select this branch on load. Completed-event history and chapter-independent unlock events are preserved. Its definitions are appended after `progress-data.js` and before story localization is applied. The cutscene is advanced manually in the invasion card; previous scenes remain replayable without repeating gameplay changes.

`GalacticInvasionManager` owns `DagonInvasion`, including the enable flag, progress, independent HOPE/Prometheus power pools, protection/logistics timers, severed tentacles, repair state, and last unlocked scene. Its existing save/travel lifecycle persists these together. Gameplay defaults live in `terraformingParameters.gameplay.dagon`. Galaxy state owns occupation, faction fleets, and operations. Dagon's specialized faction prioritizes eligible contested or neighboring sectors by hex distance from R3-13, retains regular border defense allocation, attempts one launch every ten seconds with a maximum of twelve ongoing Dagon attacks, and recalculates capacity from twice UHF capacity, without adoption multipliers. It launches only when its available fleet power is strictly above 50% of capacity. Each attack commits three times the target's defending power, with a minimum of 1% of Dagon's fleet capacity. Protected sectors, existing Dagon attacks, unaffordable commitments, and targets rejected by normal launch rules are skipped so another eligible sector can be tried in the same check. It never sends a smaller force to make an attack affordable. Initial fleet power is filled only when the invasion starts, never on load.

Occupation uses rounded whole-sector groups: nearest 25% fully occupied, nearest 50% half occupied, remainder free. Core and R5-07 start free; R4-05 and every tentacle sector start fully occupied. Five deterministic cube-rounded hex routes run from R3-13 to R5-14, R5-28, R6-25, R6-28, and R1-05. These same cached routes drive both map artwork and gameplay. Tentacle sectors count toward the fully occupied quarter.

Intact tentacles block offensive operations on every sector they cross, including R3-13. Launch validation rejects these targets even for external operations, and UHF auto-launch excludes them. Cutting an arm removes that whole arm and its targeting protection, without liberating its sectors. Shared sectors remain protected by any other intact arm. Once all five arms are cut, R3-13 can be conquered through regular offensive operations; instant capture never targets Dagon himself. Chapter ? requires cutting the arms and conquering R3-13 before its final cutscene. The world-unlock conquest notice is hidden once `gameCompleted` is true.

Saves record their known tentacle routes. On load, older active saves acquire only newly added routes and cancel operations targeting protected sectors. Existing severed arms stay severed. Saves already controlling R3-13 or playing the final cutscene instead treat the added arms as severed, preserving their progress. Subsequent loads restore occupation without reapplying the takeover.

Dagon has two independent ten-minute ability cooldowns, measured in simulation time and persisted with their active visual timers. The first tentacle pulse starts at five minutes; the first spectral laser begins charging at ten minutes. Subsequent casts remain staggered by five minutes. Older saves without cooldown fields start with these same delays. The AI Abilities panel contains only HOPE and Prometheus controls; Dagon's laser target/countdown is shown on the map. A miniature Dagon eye appears beside the Space tab during either 15-second warning, including while another tab is open; it coexists with the regular incoming-attack indicator.

- The pulse animates intact tentacles and their threatened neighboring hexes for 15 seconds, then transfers up to ten percentage points of each neighbor's control to Dagon. Shared neighbors are affected only once. The affected set is recomputed at resolution, so cutting an arm during the warning removes its coverage. All arms severed disables the pulse.
- The laser locks a random unprotected, fully UHF-controlled sector and charges for 15 seconds before capturing it and displaying a four-second spectral beam from R3-13. A dashed aiming line, targeting reticle, and countdown identify the locked sector; the reticle turns green when protected. Core, R5-07, and R4-05 are excluded. With no eligible target, the cast is skipped and its cooldown restarts. Charging progress and the locked target survive saving/loading; older saves with an already-fired beam finish that visual without another capture.
- HOPE protection blocks both abilities at the end of their warnings. Protecting the locked laser target cancels the shot without retargeting or refunding its cooldown. These takeovers bypass fleet combat without destroying fleets. Dagon operations targeting a newly fully captured sector are cancelled.

While Dagon is active, all factions have zero base sector defense in combat and galaxy displays. Only assigned fleets contribute defensive power. World counts, sector values, and fleet assignments are preserved; normal base defense returns when the encounter ends.

While the encounter is active, cached SVG artwork shows the entity at R3-13 and translucent spectral tentacles along its routes, with violet mist, interwoven pale filaments, and curling wisps. Its gaze, tendrils, and spectral filaments animate through CSS, respect reduced-motion preferences, and move with map pan/zoom. The artwork does not intercept sector clicks and disappears when Dagon is defeated. Capture it with `scripts/screenshot-setups/dagon-map.js` using the `.galaxy-map-wrapper` selector.

Starting the invasion requires 1 Sx each of electronics and superalloys in Space Storage. Repairing Prometheus consumes up to 1 Sx of each independently, or all remaining stock if less is available. Repair has no minimum resource requirement and can proceed with empty storage once its story objective is met. Advanced research is neither reset on arrival nor spent on abilities.

The lightning button immediately left of the crossed swords opens a dedicated, draggable AI abilities panel. It displays power even without a selection; actions require a selected sector. The toggle and panel are available only while Dagon is active. HOPE starts with 900 power and regenerates 1 per simulation second to a cap of 7,200. Prometheus has an independent pool with the same defaults; it becomes available and begins regenerating after repair. Sector protection spends 300 HOPE power; all other abilities spend 900 from their owner's pool.

- HOPE's protection requires UHF presence, lasts two hours, cancels incoming operations, and blocks new hostile operations. A green hexagonal perimeter marks each protected sector until its timer expires or the encounter ends.
- HOPE's Accelerated Logistics lasts two hours and sets UHF offensive operation duration in that sector to one minute. Existing operations are shortened while preserving their completed fraction. New operations launched during the effect keep their one-minute duration; expiry restores the normal duration for subsequent launches.
- Prometheus can instantly capture any sector without Dagon or an intact tentacle, cancelling operations there. Capture does not also grant protection.
- Prometheus can cut an intact arm only by selecting its root (the first route sector after R3-13), and only with full UHF control of at least one adjacent sector. The ability description lists the remaining roots. If arms share a root, each use cuts one arm in route order. Existing severed arms remain severed when loading.

The opening journal pauses after Hope says she needs to reboot. The `chapterA.reboot` story pop-up types the recovery sequence; dismissing it scrolls the Galaxy panel to the top, centers once on R3-13, and resumes the journal with the attack and Tartarus objective. Space subtabs have independent scrolling containers, so this does not change the Invasion panel's position. Subsequent renders and tab switches preserve the player's scroll and map pan/zoom. Saves already past the introduction do not replay it.

The cutscene card contains its canvas and progression buttons, without scene headings or dialogue. Advancing a new scene adds its localized dialogue to the journal using a `dagon` source and stable scene id. The journal handles typing, colors, history, and reconstruction from the saved scene position. Replaying animations does not duplicate entries. While the current scene's journal text is typing, its button reveals the text before advancing. The canvas stops animation while hidden and releases observers/listeners when the invasion UI resets. The screenshot fixture uses synthetic state and leaves `DEBUG_MODE` unchanged:

```powershell
npm run screenshot:ui -- --selector .dagon-campaign --setup scripts/screenshot-setups/dagon.js --theme darkBlue --viewport 1440x1600 --output artifacts/screenshots/dagon.png
```
