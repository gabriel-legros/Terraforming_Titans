# UI Development Guidelines

The game refreshes dense UI panels during rendering, travel, load, automation, and tooltip interactions. Preserve DOM identity in recurring paths to avoid layout work, flicker, focus loss, scroll jumps, stale listeners, and noisy mutation-observer results.

## Simulation and Rendering Boundary

- `updateLogic`, `produceResources`, manager `update(...)` methods, production code, automation, and state rebuilds mutate game state only.
- Do not call UI renderers, query/manipulate the DOM, attach tooltips, or read `document` from recurring simulation code.
- Recurring UI refresh belongs in `updateRender()` or a UI function it calls, gated by active tab/subtab state where useful.
- Pass changes to rendering through plain state such as dirty flags, cached summaries, active ids, or computed values.
- Explicit UI events and presentation lifecycle entry points may render: input handlers, `initialize...UI`, first-unlock reveal, load/travel final refresh, and `updateRender()`.

## Stable DOM and Reconciliation

- Build static layout once during `build...UI` or `initialize...UI`; update it in place during `update...UI`.
- Do not use `innerHTML = ''`, `replaceChildren()`, or unconditional element creation in frequently called updates.
- Cache reusable elements. Guard writes to text, values, disabled/hidden state, classes, attributes, and inline styles when the desired value is unchanged.
- Key repeated rows/cards by stable game ids, not list position, timestamps, random ids, or CSS position.
- Keep caches on the owning container or module, such as `container._rowCache` or a module-level `uiCache`.
- When intentionally rebuilding a subtree, clean its listeners and tooltips and invalidate its cache at the same time. Do not clean a broader parent that contains surviving controls.

For repeated children:

1. Reuse a `Map` from stable id to row or card.
2. Mark active ids from current data.
3. Update active items in the desired order.
4. Move an existing node only when its sibling position is wrong.
5. Hide or remove inactive items according to realistic reuse value.
6. Create only missing items.

Do not prewarm large pools of hidden rows. If ids can regenerate during travel/load, make stale rows reusable before processing current rows.

Project cards survive travel and `projectsUI.js` rebinds new project instances to existing cards. A subclass with custom cached UI references must declare those properties in its constructor before `renderUI()` fills them, or rebind cleanup may remove them as stale state.

## Lifecycle Ownership

- Managers that own document/window listeners keep the exact bound callback and remove it before replacement. Never call `.bind(...)` again when removing a listener.
- Reuse tab/subtab managers when their DOM survives. A stable handler must dispatch to the current manager rather than capture an obsolete instance.
- Rebind long-lived UI controllers and caches whenever their gameplay manager is replaced.
- Call the planet visualizer's full `dispose()` before replacement. It owns listeners, GPU resources, renderer/context state, canvas, and cached scene references.
- Cleanup for a transient child belongs to the same subtree that owns that child.
- Never set `textContent` or `innerHTML` on a control that owns a tooltip child. Put changing text in its own cached span.

## Selects and Inputs

- Use `syncAutomationSelectOptions(select, options, selectedValue)` for automation selects and follow the same reconciliation pattern elsewhere.
- Reuse `<option>` nodes by value; update only changed properties; remove duplicate placeholders; preserve stale unique values only for legacy/current selections; short-circuit unchanged signatures.
- Do not overwrite a focused select or input unless the user action requires it.
- Parse string-backed numbers with `parseFlexibleNumber(value)` and wire them with `wireStringNumberInput(input, { parseValue, formatValue, onValue })`.
- Store parsed values in `input.dataset.<key>` when dependent UI needs them.
- `-` and `+` change the target by the current step; `/10` and `x10` change the step itself. Clamp and store the step per item, then refresh its label.
- Create toggles with `createToggleButton({ onLabel, offLabel, isOn })` and refresh them with `setToggleButtonState(toggle, enabled)`.

## Tooltips

- Create an attached `<span class="info-tooltip-icon">&#9432;</span>` and call `attachDynamicInfoTooltip(icon, localizedText)`.
- Keep the icon and tooltip attached to their owning control. Avoid detached or body-level duplicates.
- For structured tooltips, cache the content and its rows/spans, update text in place, and hide unused optional rows.
- Before removing a tooltip-bearing subtree, call `cleanupDynamicTooltipsIn(...)` on that exact subtree and clear its cached tooltip references.

## Localization

- Shared game/UI text lives in `src/js/lang/current-language.js`. Chapter narrative, prompts, and story-project-specific text live in `src/js/lang/story-language.js`.
- Static HTML uses `data-i18n` attributes. JavaScript UI uses `t(key, vars, fallback)` or a small local text helper.
- Catalog objects stay in their parameter files; centralized logic in `src/js/lang/localization.js` applies localized display fields.
- Prefer complete sentences with placeholders over concatenated fragments.
- Keep internal ids stable and localize display text only.
- Use `npm run audit:localization`; actionable counts must improve or remain unchanged with a documented exemption. See [Localization checklist](localization-checklist.md).

## Status and Resource UI

- UI visibility is enabled through story/research/effects; do not persist derived UI-enabled flags in saves.
- Use `getStatusColor(...)` and `getStatusProgressBackground(...)` instead of hard-coded success/failure colors.
- Use localized `Resource.displayName` values for player-facing costs and labels.
- Resource-rate maps use stable source ids: `building:<id>`, `project:<id>`, or registered namespaced ids. Gameplay queries ids; only UI rendering calls `getRateSourceDisplayName`.
- Red building/project costs use a dynamic tooltip with relevant required and available amounts. Show reserve and shortfall details only when an expansion reserve applies.

## Verification and Triage

Repeated observer reports for identical inserted nodes are a performance defect unless the item is genuinely new. Prioritize high repeated counts beneath hot panels and stacks in `update...UI` or `updateRender`; discount one-time unlock and initialization nodes.

After a reconciliation change:

1. Run `node --check` on touched JavaScript files.
2. Run the Windows Jest command from [AGENTS.md](../AGENTS.md).
3. Use the relevant screenshot harness from [Visual testing](visual-testing.md).
4. For lifecycle or retention risk, use the [Chromium memory and DOM churn audit](chromium-memory-churn-audit.md).
