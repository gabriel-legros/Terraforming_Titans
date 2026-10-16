# RWG equilibration quality audit

Verified on 2026-10-14 with Phase Change Heat disabled, using the repository Playwright harness and fresh browser contexts.

**Result: 107 passed, 0 failed.** Every case reports convergence within the unchanged 12,000-step budget and passes 2,000 ordinary 20 ms resource updates afterward. There are zero execution errors and zero converged-but-drifting cases.

| Measure | Previous adaptive solver | Conservative solver |
| --- | ---: | ---: |
| Quality passes | 23 / 107 | 107 / 107 |
| Budget exhaustion | 84 | 0 |
| Median budgeted work steps | 12,000 | 221 |
| Total budgeted work steps | 1,029,505 | 44,972 |
| Maximum budgeted work steps | 12,000 | 7,900 |

The same 107 requested seeds use 95.6% fewer total budgeted work steps. New work steps include implicit transfer-network updates and fixed-step physics evaluations, including correction trials. Their per-step cost differs from the previous explicit method, so this is a work-budget comparison rather than a wall-clock speedup claim. Both matrices used four workers; the new median solver time was 229.3 ms, versus 8962.9 ms previously. Concurrent timings depend on machine load.

Coverage includes all 13 registered random-world types against seven requested orbit presets (91 cases), both supported moon types against those presets (14 cases), and the two reported regression seeds. Generator orbit locks remain active. The table lists actual generated orbit presets.

| World type | Cases | Passes | Median work steps | Maximum work steps | Actual orbit presets |
| --- | ---: | ---: | ---: | ---: | --- |
| ammonia-rich | 7 | 7 | 840 | 7900 | cold, very-cold |
| carbon-planet | 7 | 7 | 243 | 1680 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| chthonian | 7 | 7 | 323 | 1438 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| cold-desert | 7 | 7 | 177 | 216 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| desiccated-desert | 7 | 7 | 201 | 251 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| icy-moon | 14 | 14 | 276 | 394 | cold, hz-inner, hz-mid, hz-outer, very-cold |
| jupiter-like | 8 | 8 | 351.5 | 952 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| mars-like | 8 | 8 | 196.5 | 1155 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| molten | 7 | 7 | 100 | 100 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| rogue | 7 | 7 | 153 | 155 | rogue |
| super-earth | 7 | 7 | 227 | 837 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| titan-like | 14 | 14 | 301 | 1106 | cold, hot, hz-inner, hz-mid, hz-outer, very-cold, very-hot |
| venus-like | 7 | 7 | 141 | 549 | hot, very-hot |

The reported Mars-like seed, `296949711|planet|mars-like|hz-inner`, previously exhausted 12,000 steps, then moved about 5.08485e+6 tons of dry ice and -0.0236124 K during verification. It now converges in 231 work steps; mean temperature drift over the same verification interval is 3.052e-11 K, and its worst drift/tolerance ratio is 0.005038. The original Jupiter-like regression also passes.

Verification reloads each returned override into real Resource objects and a new Terraforming instance. It runs ordinary 20 ms resource updates with normal heat capacity, inactive player buildings, and no hazard or terraforming-effect updates. It does not rerun equilibration. The 2,000 updates cover 40 simulated days.

Acceptance retains the original rate limits: zonal mean/day/night temperatures, all zonal inventories, and global atmospheric and surface inventories must remain within the solver's documented tolerances scaled to the verification duration. For 2,000 updates this permits 0.0004 K or the larger of 4 tons and 4e-10 of an inventory, plus floating-point resolution. Global land is excluded because initialization reconciles this geometric quantity. The solver itself uses a stricter one-tenth margin and 20 consecutive ordinary-update checks. Endpoint drift checks are finite-duration evidence rather than a proof of indefinite stability.

The harness observed 179,095 transfer-network outputs and correction candidates: zero non-finite values, negative inventories, or family-mass violations. Maximum observed relative mass discrepancy was 4.220e-16. Phase transfers conserve each family to floating-point precision; chemical reactions and hydrogen escape follow the existing model and can change family totals.

Seven difficult samples, including both user-reported seeds, the worst Titan temperature-drift case, the stubborn ammonia and carbon worlds, and a Titan-like moon, separately passed 20,000 ordinary updates (400 simulated days). All seven passed, with zero execution or conservation failures. These checks used the same solver checksum as the full matrix.

Nine control checks passed: synchronous completion, asynchronous completion, identical results across chunk scheduling, fixed work budget, `stepDays` override, Add steps, End Early, cancellation between chunks, and restoration after an injected simulation error. They verify both global bindings and unchanged live resource inventories. The fast Jest suites separately passed 186 tests across 23 suites, with zero failures.

The conservative solver derives its phase rates and chemistry from the existing model. Independent implicit step scales remove repeated coarse/fine cycling; finite-difference corrections settle residual balances. A cold buried reservoir may participate in mass-conserving redistribution when an exposed reservoir gives an ineffective correction. Trial states refresh heat-capacity and other climate caches, and failed trials restore the accepted state. The Phase Change Heat setting retains the explicit path and is outside this matrix's validated scope.

Reproduce:

```powershell
node scripts/manual-tests/benchmark-rwg-equilibration.js --matrix --jobs 4 --sync --invariants --check --output artifacts/screenshots/equilibration-matrix.json
node scripts/manual-tests/benchmark-rwg-equilibration.js --controls --output artifacts/screenshots/equilibration-controls-final.json
```

Use `--verification-steps 20000` and positional seeds for longer verification. The harness captures the solver source once per run, serves repository assets from memory, reports renderer crashes as failed executions, and starts each case in a fresh browser context.

Generated evidence (ignored by Git): [matrix](../artifacts/screenshots/equilibration-matrix.json), [summary](../artifacts/screenshots/equilibration-matrix.summary.json), [long verification](../artifacts/screenshots/equilibration-long-verification.json), [controls](../artifacts/screenshots/equilibration-controls-final.json), [previous matrix](../artifacts/screenshots/equilibration-matrix-isolated.json), [previous solver](../artifacts/screenshots/rwg-equilibrate-before-network.js).

Solver SHA-256: `f6a2f4b8d1f2e24072584a7e83fcbd93614cc37ce1409f27e7fbb481d7f13ed1`.

Terraforming-parameters SHA-256: `352cc33da4ba16c676a0bba13ebcc72e6f1352c4d871615be526f63a0b8d2414`.
