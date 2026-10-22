# Dagon development controls

The encounter is disabled by default. On an eligible save, enable its arrival controls from the browser console:

```js
galaxyInvasionManager.dagon.enabled = true;
updateGalacticInvasionUI({ force: true });
```

This flag is saved. Set it to `false` to hide the arrival controls again; it does not cancel an encounter already in progress. The console flag does not bypass the story, conquest, world, or storage requirements. The button starts the encounter only once per save. New game resets it.

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

`GalacticInvasionManager` owns `DagonInvasion`, including the enable flag, progress, protection timers, repair state, and last unlocked scene. Its existing save/travel lifecycle persists these together. Galaxy state owns occupation, faction fleets, and operations. Dagon's specialized faction uses regular faction AI and recalculates capacity from twice UHF capacity, without adoption multipliers. Initial fleet power is filled only when the invasion starts, never on load.

Occupation uses rounded whole-sector groups: nearest 25% fully occupied, nearest 50% half occupied, remainder free. Core and R5-07 start free; R4-05 and R3-13 start fully occupied. Those starting guarantees do not grant lasting attack immunity.

While Dagon is active, all factions have zero base sector defense in combat and galaxy displays. Only assigned fleets contribute defensive power. World counts, sector values, and fleet assignments are preserved; normal base defense returns when the encounter ends.

While the encounter is active, a compact cached SVG version of the cutscene entity marks R3-13 on the galaxy map, including after that sector is retaken. Its gaze and tendrils animate through CSS, respect reduced-motion preferences, and move with map pan/zoom. The marker does not intercept sector clicks and disappears when Dagon is defeated. Capture it with `scripts/screenshot-setups/dagon-map.js` using the `.galaxy-map` selector.

The initial 1 Sx electronics and superalloys are availability requirements. Repairing Prometheus consumes both amounts from Space Storage and rechecks availability. Sector abilities appear in the selected sector's galaxy-map panel only while Dagon is active. They spend 900 seconds of current advanced-research production; zero production disables them. Protection lasts two hours of simulation time, cancels incoming operations, and blocks new hostile operations. Immediate conquest becomes available after repair and does not also grant protection.

The opening journal pauses after Hope says she needs to reboot. The `chapterA.reboot` story pop-up types the recovery sequence; dismissing it opens the galaxy map and resumes the journal with the attack and Tartarus objective. Saves already past the introduction do not replay it.

The cutscene card contains its canvas and progression buttons, without scene headings or dialogue. Advancing a new scene adds its localized dialogue to the journal using a `dagon` source and stable scene id. The journal handles typing, colors, history, and reconstruction from the saved scene position. Replaying animations does not duplicate entries. While the current scene's journal text is typing, its button reveals the text before advancing. The canvas stops animation while hidden and releases observers/listeners when the invasion UI resets. The screenshot fixture uses synthetic state and leaves `DEBUG_MODE` unchanged:

```powershell
npm run screenshot:ui -- --selector .dagon-campaign --setup scripts/screenshot-setups/dagon.js --theme darkBlue --viewport 1440x1600 --output artifacts/screenshots/dagon.png
```
