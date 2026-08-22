# Visual Testing

Use the repository-owned Playwright harnesses. They start a temporary local server and isolated browser context, and write ignored screenshots under `artifacts/screenshots/` by default. Inspect every generated PNG before reporting results.

From WSL on the Windows checkout, use Windows Node as shown below.

## World Visualizer

```bat
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm run screenshot:visualizer -- --planet mars --biomass 100,0,100 --water 0,0,0 --ice 0,0,0 --clouds 0 --size 768 --output artifacts/screenshots/biomass-zones.png"
```

The harness drives the visualizer debug API, removes story overlays, fixes rotation, and captures only `#planet-visualizer`.

- Run `npm run screenshot:visualizer -- --help` for all scene overrides.
- Three-value surface arguments are ordered `tropical,temperate,polar` and use percentages from `0` to `100`.
- Use `--dust-colors <north-tropical,north-temperate,north-polar,south-tropical,south-temperate,south-polar>` with `--dust-coverage <percent>` for Dust Factory tint checks.
- Leave `DEBUG_MODE` unchanged. Set it to `true` only for an interactive manual capture that needs an intro-skip path, then restore it to `false`.
- If Playwright Chromium is missing after `npm ci`, install it with Windows Node:

  ```bat
  cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npx playwright install chromium"
  ```

## General UI

```bat
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && npm run screenshot:ui -- --selector #colony-sliders-container --setup scripts/screenshot-setups/colony-sliders.js --theme darkBlue --output artifacts/screenshots/colony-sliders.png"
```

- Use `--setup <path>` for page-side JavaScript that unlocks, navigates, or configures the capture state. Setup scripts call ordered game globals directly.
- Run `npm run screenshot:ui -- --help` for selector index, URL, theme, viewport, padding, settle time, timeout, full-page, and headed options.

## Visualizer Performance Audit

Run the focused visualizer benchmark against a representative save:

```bat
cmd.exe /c "cd /d C:\Users\gabri\Documents\Terraforming Titans && node scripts\manual-tests\benchmark-world-visualizer.js --save test_saves\mars_speedrun_record.json"
```

The measured interval should report zero canvas creation, zero crater generation, stable texture count, and no errors.

## Visualizer Rendering Invariants

- Spherical worlds keep their exact initial CPU surface, then lazily build deterministic terrain/noise bases and composite dynamic coverage into persistent GPU render targets. Do not restore recurring `generateCraterTexture` calls.
- Ring, disk, SMBH-shell, Earth-reconstruction, and unsupported-WebGL views retain their specialized CPU paths.
- Cloud coverage uploads its deterministic raw field once and recomposites alpha into a persistent GPU target on WebGL2; WebGL1 retains the exact CPU renderer. Preserve 8-bit alpha rounding, transparent-pixel RGB, wrapping, filtering, mipmaps, and UUID/random draw order.
- City lights use one `InstancedMesh` when supported and retain the mesh-per-light fallback. Preserve random-number and UUID draw order so seeded craters and city placement do not move.
- Game initialization synchronizes zonal coverage before the first surface texture. Save loading derives coverage from restored `zonalSurface` before forcing refresh.
- The first dynamic shader-basis transition bypasses the normal five-second throttle. Resetting the throttle must make the next update immediately eligible.
- Dynamic-mass worlds develop self-emission and two corona layers through the brown-dwarf transition. Stellar-stage worlds keep their stellar palette, suppress crater/molten overlays, fade ordinary inert-gas aura, and hide the external host-star marker.
- The Battle of Zeus animation loop runs only while its project card is connected and visible. Hidden transitions settle immediately; static frames reuse immutable unit arrays.

For broader retained-memory and DOM-churn work, see [Chromium memory and DOM churn audit](chromium-memory-churn-audit.md).
