# Story World Equilibration

Use the repository calibrator to rewrite a registered story world's `zonalSurface` and `zonalTemperatures` overrides in `src/js/planet-parameters.js`:

```sh
npm run equilibrate:world -- --planet <key>
```

The calibrator preserves each phase family's total inventory, solves exposed liquid and solid reservoirs against exact 20 ms phase steps, stores displaced material in the largest buried reservoir (or atmosphere when none exists), reloads the edited source, and verifies 20,000 normal `produceResources(20, buildings)` updates. It restores the original source if verification fails.

## Solver Options

- `--threshold`, `--steps`, and `--passes` override the default `0.01` tons/s solve limit, 20,000 verification steps, and 50 coordinate passes.
- `--verification-threshold` sets a separate long-run acceptance rate for an intentionally approximate world without weakening the fixed-point solve.
- Repeat `--pressure-range <family>:<minimum-Pa>:<maximum-Pa>` to constrain volatile partial pressure throughout verification.
- Use `--solve-atmosphere <family>` when atmosphere mass, all exposed zones, and the largest buried reservoir must be solved together.
- Use `--preserve-exposed <family>` only when total exposed phase inventory is itself a required constraint.
- Use `--global-balance <family>` when zonal roots oscillate but atmosphere and solid-phase rates can be solved globally while preserving other exposed reservoirs.
- `--relax-steps` enables coarse-to-fine hydraulic relaxation; `--relax-refine-checks` controls how many unstable checks occur before each step-size refinement.
- Add `--adaptive-only` to save the relaxed state without applying the algebraic phase solver. Repeat `--adaptive-balance <family>` for a final one-dimensional, mass-conserving atmosphere/exposed-reservoir root.
- Use `--tune-condensation <family>` only to tune a global phase coefficient against its canonical physical-inventory world. Story worlds must not override condensation coefficients; cycles read them from `terraformingParameters.phaseChange`.

When a zone has no fixed point between zero and full exposed coverage, the calibrator can solve atmospheric amount for global balance while preserving the seeded zonal distribution. Displaced inventory remains in the largest buried reservoir, and the full long-run verification still applies.

## Canonical World Recipes

### Mars

Use unsnapped adaptive-only relaxation without a final algebraic or atmosphere-balance perturbation:

```sh
npm run equilibrate:world -- --planet mars --relax-steps 60000 --relax-refine-checks 1000 --adaptive-only --threshold 0.0001 --verification-threshold 0.0001 --pressure-range water:0.00005:0.00007 --pressure-range carbonDioxide:600:605
```

With H2O IR strength `20`, pressure remains near `631.289442 Pa`; across 20,000 updates, absolute water-ice drift stays below `2.3e-11` tons/s and dry-ice drift below `1.52e-6` tons/s.

### Titan

Titan is the methane reference world. The global methane coefficient is `3.586948746313331e-5`.

```sh
npm run equilibrate:world -- --planet titan --relax-steps 120000 --relax-refine-checks 1000 --adaptive-only --adaptive-balance methane --verification-threshold 3 --pressure-range methane:7000:8000
```

Methane remains near `7.522 kPa`, with absolute liquid-methane drift below `2.61` tons/s. Retain the `7-8 kPa` methane constraint. Nitrogen uses homogeneous atmospheric mixing for condensation; its nonzero global coefficient remains `0.002`.

### Callisto

```sh
npm run equilibrate:world -- --planet callisto --relax-steps 60000 --relax-refine-checks 1000 --adaptive-only --adaptive-balance water --adaptive-balance carbonDioxide
```

The atmosphere begins near `3e-6 Pa`; verified water/ice rates remain below `5.1e-5` tons/s and dry-ice rates below `0.000642` tons/s.

### Ganymede

```sh
npm run equilibrate:world -- --planet ganymede --relax-steps 60000 --relax-refine-checks 1000 --solve-atmosphere water --verification-threshold 0.0101
```

The atmosphere begins near `1.38e-4 Pa`, with about `8.27e6` tons of atmospheric water. Verified water/ice rates remain below `0.00357` tons/s and dry-ice rates below `0.000504` tons/s.

### Gabbag

```sh
npm run equilibrate:world -- --planet gabbag --relax-steps 60000 --relax-refine-checks 1000 --adaptive-only --verification-threshold 0.15
```

This preserves and settles the zonal oceans. Liquid-water drift remains at the `0.146484375` tons/s storage floor; other supported phase rates are zero.

### Tartarus

```sh
npm run equilibrate:world -- --planet tartarus --relax-steps 60000 --relax-refine-checks 1000 --adaptive-only --adaptive-balance water --adaptive-balance carbonDioxide
```

It begins near `589.837 Pa`, retains exposed water ice and polar dry ice, and keeps absolute water/ice rates below `0.000872` tons/s and dry-ice rates below `0.00864` tons/s.

### Styx

Styx is intentionally dynamic; preserve its seeded tropical and temperate oceans:

```sh
npm run equilibrate:world -- --planet styx --global-balance water --verification-threshold 5000000000
```

It begins near `192.364 kPa` and can peak near `4.09e9` tons/s. An exact static root does not exist because the model transports water continuously between warm oceans and the cold pole. Coarse hydraulic pre-relaxation worsens the cycle.

## Special Cases

- Umbra intentionally uses a degenerate stable water equilibrium: atmospheric and exposed water are zero, with about `3.717e14` tons stored as polar buried ice.
- Vega-2, Venus, Poseidon, Zeus, and airless Hades have no active supported condensable family at startup. Their passes normalize zonal fields and verify without coefficient changes.
- Olympus is not compatible with a static pass at H2O IR strength `20`. Leave its starting override unchanged until its dynamic ocean/atmosphere state has a dedicated mode.
- Solis Prime must retain its original exposed ice and zero atmospheric water near `3 K`. Do not accept the algebraic all-vapour endpoint caused by saturation-pressure underflow.

## Equilibrium Snapping

Snapping is disabled by default and controlled by `terraformingParameters.gameplay.simulation.equilibriumSnapEnabled`. With Phase Change Heat disabled, a global atmospheric remainder below `0.01` tons/s or the atmosphere reservoir's one-ULP storage resolution may be reconciled into dominant precipitation so displayed global rates match representable storage changes. Zonal changes snap only when every zonal remainder is within its rate/ULP tolerance. Phase Change Heat uses neither snap because transition-energy accounting must remain exact.
