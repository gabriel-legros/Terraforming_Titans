class SpaceMirrorAdvancedOversight {
  static advancedAssignmentInProgress = false;

  static runAssignments(project, settings) {
    if (!settings || !settings.advancedOversight) return;
    if (SpaceMirrorAdvancedOversight.advancedAssignmentInProgress) return;
    SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = true;
    const baselineAverageTemperature = terraforming?.temperature?.value;
    let snapshot = terraforming.saveTemperatureState();

    try {
      if (typeof terraforming === 'undefined' || typeof buildings === 'undefined') return;

      // ---------------- Config knobs (tune as needed) ----------------
      const K_TOL = 0.001;         // Temperature tolerance (K) for zones
      const WATER_REL_TOL = 0.00001; // Relative tol (1%) for water melt target
      const MAX_ACTIONS_PER_PASS = 100; // Commit at most this many batched moves per priority pass

      // Probe sizing for derivative estimates (NO per-mirror loops; single physics call per probe)
      const MIRROR_PROBE_MIN = 100;      // Minimum mirrors per probe (useful scale for "billions")
      const LANTERN_PROBE_MIN = 1;      // Min lanterns per probe
      const SAFETY_FRACTION = 1;        // Take only 50% of the "unitsNeeded" to reduce overshoot risk

      // If no resources left, allow reallocation from strictly lower priority zones
      const REALLOC_MIN = 1;           // At least this many units in a reallocation probe (mirrors/lanterns)

      // ---------------- Capability / flags ----------------
      const ZONES = ['tropical', 'temperate', 'polar'];

      const FOCUS_FLAG =
        (typeof projectManager !== 'undefined') &&
        (
          (projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('spaceMirrorFocusing')) ||
          (projectManager.projects &&
           projectManager.projects.spaceMirrorFacility &&
           typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
           projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFocusing'))
        );

      const REVERSAL_AVAILABLE = !!(project && project.reversalAvailable);

      // ---------------- Short-hands / accessors ----------------
      const assignM = settings.assignments.mirrors || (settings.assignments.mirrors = {});
      const assignL = settings.assignments.lanterns || (settings.assignments.lanterns = {});
      const reverse = settings.assignments.reversalMode || (
        settings.assignments.reversalMode = {
          tropical: false,
          temperate: false,
          polar: false,
          focus: false,
          any: false,
        }
      );

      const prio = settings.priority || { tropical: 1, temperate: 1, polar: 1, focus: 1 };
      const targets = settings.targets || { tropical: 0, temperate: 0, polar: 0, water: 0 };

      const totalMirrors = Math.max(0, buildings.spaceMirror?.active || 0);
      const totalLanterns = settings.applyToLantern ? Math.max(0, buildings.hyperionLantern?.active || 0) : 0;

      const usedMirrors = () => (assignM.tropical)+(assignM.temperate)+(assignM.polar)+(assignM.focus);
      const usedLanterns = () => (assignL.tropical)+(assignL.temperate)+(assignL.polar)+(assignL.focus);
      const mirrorsLeft = () => Math.max(0, totalMirrors - usedMirrors());
      const lanternsLeft = () => Math.max(0, totalLanterns - usedLanterns());

      const getZoneTemp = (z) => {
        const mode = settings.tempMode?.[z] || 'average';
        const data = terraforming?.temperature?.zones?.[z];
        if (!data) return NaN;
        if (mode === 'day') return data.day;
        if (mode === 'night') return data.night;
        return data.value;
      };

      const updateTemps = () => {
        if (typeof terraforming.updateSurfaceTemperature === 'function') {
          terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
        }
      };

      const readTemps = () => {
        const out = {};
        for (const z of ZONES) out[z] = getZoneTemp(z);
        return out;
      };

      const weightFor = (p) => Math.pow(2, (6 - Math.max(1, Math.min(5, p)))) ; // 32,16,8,4,2

      const allPriorities = [prio.tropical, prio.temperate, prio.polar, prio.focus].filter(x => typeof x === 'number');
      const minP = Math.min(...allPriorities);
      const maxP = Math.max(...allPriorities);

      const mirrorPowerPer = terraforming.calculateMirrorEffect?.().interceptedPower || 0;
      const lantern = typeof buildings !== 'undefined' ? buildings.hyperionLantern : null;
      const lanternPowerPer = lantern
        ? (lantern.powerPerBuilding || 0) * (typeof lantern.productivity === 'number' ? lantern.productivity : 1)
        : 0;

      // ---------------- Warm start ----------------
      // If we have a saved lastSolution, restore it (clamped to current availability).
      // Otherwise, keep whatever current assignments exist (they already reflect last tick).
      const restoreFromLast = () => {
        const last = settings.lastSolution;
        if (!last) return;
        const copy = (dst, src) => { for (const k of Object.keys(dst)) dst[k] = 0; for (const k of Object.keys(src)) dst[k] = Math.max(0, src[k]); };
        copy(assignM, last.mirrors || {});
        copy(assignL, last.lanterns || {});
        Object.assign(reverse, last.reversalMode || {});
        clampTo(assignM, totalMirrors);
        clampTo(assignL, totalLanterns);
      };

      const clampTo = (obj, max) => {
        let sum = 0;
        for (const k of Object.keys(obj)) sum += Math.max(0, obj[k]);
        if (sum <= max) return;
        // Reduce lowest priority first
        const entries = Object.keys(obj)
          .map(k => ({ k, v: Math.max(0, obj[k]), p: (k === 'focus' ? (prio.focus || 5) : (prio[k] || 5)) }))
          .sort((a, b) => b.p - a.p);
        let over = sum - max;
        for (const e of entries) {
          if (over <= 0) break;
          const take = Math.min(e.v, over);
          obj[e.k] = e.v - take;
          over -= take;
        }
      };

      // Apply warm start
      //restoreFromLast();
      // Make sure reversal is only used if available
      if (!REVERSAL_AVAILABLE) {
        reverse.tropical = reverse.temperate = reverse.polar = false;
      }
      reverse.any = false;

      // Determine reversal based on baseline (no mirrors/lanterns, no reversal):
      // Evaluate temperatures with 0 assignments and all reversal off, then
      // set reversal on zones where baseline temp is above the target, off otherwise.
      (function alignReversalFromBaseline() {
        // Save current state
        const savedAssignM = { ...assignM };
        const savedAssignL = { ...assignL };
        const savedReverse = { ...reverse };

        // Zero assignments and turn off all reversal for baseline evaluation
          assignM.tropical = 0; assignM.temperate = 0; assignM.polar = 0; assignM.focus = 0;
          assignL.tropical = 0; assignL.temperate = 0; assignL.polar = 0; assignL.focus = 0;
          reverse.tropical = false; reverse.temperate = false; reverse.polar = false; reverse.any = false;
        updateTemps();

        // Read baseline temps with no facility effect
        const baseline = readTemps();

        // Restore assignments
        assignM.tropical = savedAssignM.tropical || 0; assignM.temperate = savedAssignM.temperate || 0; assignM.polar = savedAssignM.polar || 0; assignM.focus = savedAssignM.focus || 0;
        assignL.tropical = savedAssignL.tropical || 0; assignL.temperate = savedAssignL.temperate || 0; assignL.polar = savedAssignL.polar || 0; assignL.focus = savedAssignL.focus || 0;

        // Set reversal based on baseline vs targets
        if (REVERSAL_AVAILABLE) {
          for (const z of ZONES) {
            const tgt = targets[z] || 0;
            if (tgt > 0 && isFinite(baseline[z])) {
              reverse[z] = baseline[z] > tgt; // above target -> cool (reversal on); else heat (off)
            } else {
              // If no meaningful target, keep previous setting from saved state (but ensure boolean)
              reverse[z] = !!savedReverse[z];
            }
          }
        } else {
          reverse.tropical = reverse.temperate = reverse.polar = false;
        }

        // Ensure 'any' remains off in advanced mode
        reverse.any = false;
        updateTemps();
      })();

      // ---------------- Objective ----------------
      const computeFocusMeltRate = () => {
        if (!FOCUS_FLAG) return 0;
        const m = assignM.focus;
        const l = assignL.focus;
        const focusPower = m * mirrorPowerPer + l * lanternPowerPer;

        // Energy to bring ice to 0°C and melt
        const C_P_ICE = 2100;    // J/kg·K
        const L_F_WATER = 334000;// J/kg
        const deltaT = Math.max(0, 273.15 - (baselineAverageTemperature ?? 0));
        const energyPerKg = C_P_ICE * deltaT + L_F_WATER; // J/kg
        if (energyPerKg <= 0) return 0;

        const meltKgPerSec = focusPower / energyPerKg;
        return Math.max(0, meltKgPerSec / 1000)*86400; // tons/sec
      };

      const objective = (passLevel) => {
        const temps = readTemps();
        let sum = 0;
        for (const z of ZONES) {
          const tgt = targets[z] || 0;
          if (!(tgt > 0)) continue;
          let w = 0;
          if ((prio[z] || 5) <= passLevel) w = weightFor(prio[z]);
          if ((prio[z] || 5) <  passLevel) w *= 32; // lock-in for higher priority
          if (w > 0) {
            const t = temps[z];
            if (!isFinite(t)) continue;
            const e = t - tgt;
            sum += w * e * e;
          }
        }
        if (FOCUS_FLAG && (targets.water || 0) > 0) {
          const melt = computeFocusMeltRate();
          const tgt = targets.water || 0;
          const relErr = tgt > 0 ? (tgt - melt) / tgt : 0;
          let w = 0;
          if ((prio.focus || 5) <= passLevel) w = weightFor(prio.focus);
          if ((prio.focus || 5) <  passLevel) w *= 32;
          sum += w * relErr * relErr;
        }
        return sum;
      };

      const tempsNeed = () => {
        const t = readTemps();
        return {
          heat: ZONES.filter(z => (targets[z]) > 0 && isFinite(t[z]) && t[z] < (targets[z]-K_TOL)),
          cool: ZONES.filter(z => (targets[z]) > 0 && isFinite(t[z]) && t[z] > (targets[z]+K_TOL))
        };
      };

      // Utility: run a temporary change, eval, then rollback
      const withTempChange = (changer, evaluator) => {
        const snapM = { ...assignM };
        const snapL = { ...assignL };
        const snapR = { ...reverse };
        const shallowEqual = (a, b) => {
          const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
          for (const k of keys) {
            if ((a[k] || 0) !== (b[k] || 0)) return false;
          }
          return true;
        };
        changer();
        const changed = !(shallowEqual(assignM, snapM) && shallowEqual(assignL, snapL) && shallowEqual(reverse, snapR));
        if (changed) {
          // Only recompute temps when something actually changed
          updateTemps();
          const out = evaluator();
          // Roll back and restore temps
          Object.assign(assignM, snapM);
          Object.assign(assignL, snapL);
          Object.assign(reverse, snapR);
          updateTemps();
          return out;
        } else {
          // No change; evaluate on current state without recomputing temps
          return evaluator();
        }
      };

      // Suggest a probe size given remaining units
      const probeSize = (remain, minAbs, frac) =>
        Math.max(1, Math.min(remain, Math.ceil(Math.max(minAbs, remain * frac))));

      // Build batched candidates for this pass
      const buildCandidates = (passLevel) => {
        const cands = [];
        updateTemps();
        const temps = readTemps();
        const baseScore = objective(passLevel);

        // Mirror/lantern add candidates (batched)
        for (const z of ZONES) {
          if ((prio[z] || 5) > passLevel) continue; // only optimize up to current pass
          const tgt = targets[z] || 0; if (!(tgt > 0)) continue;

          const needCool = temps[z] > tgt + K_TOL;
          const needHeat = temps[z] < tgt - K_TOL;

          // Mirrors (heating)
          // Only add heat when baseline-aligned reversal is OFF for this zone.
          if (mirrorsLeft() > 0 && !reverse[z]) {
            const k = MIRROR_PROBE_MIN;
            const score = withTempChange(() => { reverse[z] = false; assignM[z] = (assignM[z]) + k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            // Estimate units needed from zone error (local slope for this zone)
            const tAfter = withTempChange(() => { reverse[z] = false; assignM[z] = (assignM[z]) + k; },
                                          () => getZoneTemp(z));
            const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0;
            const dtPerUnit = dT / k;
            let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
            if (step > 0) cands.push({ kind:'mirror', zone:z, reverse:false, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }

          // Mirrors (cooling) via reversal
          // Only add cooling when baseline-aligned reversal is ON for this zone.
          if (REVERSAL_AVAILABLE && mirrorsLeft() > 0 && !!reverse[z]) {
            const k = MIRROR_PROBE_MIN;
            const score = withTempChange(() => { reverse[z] = true; assignM[z] = (assignM[z]) + k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const tAfter = withTempChange(() => { reverse[z] = true; assignM[z] = (assignM[z]) + k; },
                                          () => getZoneTemp(z));
            const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // will be negative
            const dtPerUnit = dT / k; // < 0 expected
            let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
            if (step > 0) cands.push({ kind:'mirror', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }

          // Lanterns (heating)
          if (lanternsLeft() > 0) {
            const k = LANTERN_PROBE_MIN;
            const score = withTempChange(() => { assignL[z] = (assignL[z]) + k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const tAfter = withTempChange(() => { assignL[z] = (assignL[z]) + k; }, () => getZoneTemp(z));
            const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0;
            const dtPerUnit = dT / k;
            let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
            if (step > 0) cands.push({ kind:'lantern', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }

          // Removal candidates when locked mode conflicts with need
          // - If reversal is ON (cooling) but zone needs heat, try removing cooling mirrors
          if (!!reverse[z] && (assignM[z] || 0) > 0) {
            const current = assignM[z] || 0;
            const evaluateProbe = (probeAmount) => {
              const actual = Math.max(1, Math.min(current, probeAmount));
              const candidateScore = withTempChange(() => { assignM[z] = current - actual; }, () => objective(passLevel));
              const tempAfter = withTempChange(() => { assignM[z] = current - actual; }, () => getZoneTemp(z));
              const delta = (isFinite(tempAfter) && isFinite(temps[z])) ? (tempAfter - temps[z]) : 0;
              return { actual, candidateScore, delta };
            };
            let probe = MIRROR_PROBE_MIN;
            if (probe > current) probe = current;
            let { actual, candidateScore, delta } = evaluateProbe(probe);
            while (delta <= 0 && actual < current) {
              const scaled = Math.min(current, actual * 10);
              if (scaled === actual) break;
              const result = evaluateProbe(scaled);
              actual = result.actual;
              candidateScore = result.candidateScore;
              delta = result.delta;
            }
            if (delta > 0) {
              const dPerUnit = (baseScore - candidateScore) / actual;
              const dtPerUnit = delta / actual;
              let unitsNeeded = dtPerUnit > 0 ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
              unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
              const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
              if (step > 0) cands.push({ kind:'mirror-remove', zone:z, kProbe:actual, kStep:step, gainPerUnit:dPerUnit });
            }
          }
          // - If reversal is OFF (heating) but zone needs cool, try removing heating mirrors
          if (!reverse[z] && (assignM[z] || 0) > 0) {
            const current = assignM[z] || 0;
            const k = MIRROR_PROBE_MIN;;
            const score = withTempChange(() => { assignM[z] = current - k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const tAfter = withTempChange(() => { assignM[z] = current - k; }, () => getZoneTemp(z));
            const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // expected < 0
            const dtPerUnit = dT / k;
            let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
            if (step > 0) cands.push({ kind:'mirror-remove', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }
          // - Lanterns only heat; if the zone needs cooling, try removing lanterns
          if ((assignL[z] || 0) > 0) {
            const current = assignL[z] || 0;
            const k = LANTERN_PROBE_MIN;;
            const score = withTempChange(() => { assignL[z] = current - k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const tAfter = withTempChange(() => { assignL[z] = current - k; }, () => getZoneTemp(z));
            const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // expected < 0
            const dtPerUnit = dT / k;
            let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
            if (step > 0) cands.push({ kind:'lantern-remove', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }
        }

        // Focus water (tons/sec)
        if (FOCUS_FLAG && (targets.water || 0) > 0 && (prio.focus || 5) <= passLevel) {
          const waterTarget = targets.water || 0;
          const baseMelt = computeFocusMeltRate();
          const wantMore = baseMelt < waterTarget * (1 - WATER_REL_TOL);
          if (wantMore) {
            if (mirrorsLeft() > 0) {
              const k = MIRROR_PROBE_MIN;
              const score = withTempChange(() => { assignM.focus = (assignM.focus) + k; }, () => objective(passLevel));
              const dPerUnit = (baseScore - score) / k;
              const meltAfter = withTempChange(() => { assignM.focus = (assignM.focus) + k; }, () => computeFocusMeltRate());
              const dMelt = Math.max(0, meltAfter - baseMelt);
              const dMeltPerUnit = dMelt / k;
              let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((waterTarget - baseMelt) / dMeltPerUnit) : 0;
              unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
              const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
              if (step > 0) cands.push({ kind:'mirror', zone:'focus', reverse:false, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
            }
            if (lanternsLeft() > 0) {
              const k = MIRROR_PROBE_MIN;
              const score = withTempChange(() => { assignL.focus = (assignL.focus) + k; }, () => objective(passLevel));
              const dPerUnit = (baseScore - score) / k;
              const meltAfter = withTempChange(() => { assignL.focus = (assignL.focus) + k; }, () => computeFocusMeltRate());
              const dMelt = Math.max(0, meltAfter - baseMelt);
              const dMeltPerUnit = dMelt / k;
              let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((waterTarget - baseMelt) / dMeltPerUnit) : 0;
              unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
              const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
              if (step > 0) cands.push({ kind:'lantern', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
            }
          }
          const wantLess = baseMelt > waterTarget * (1 + WATER_REL_TOL);
          if (wantLess) {
            if ((assignM.focus || 0) > 0) {
              const current = assignM.focus || 0;
              const k = MIRROR_PROBE_MIN;
              const score = withTempChange(() => { assignM.focus = current - k; }, () => objective(passLevel));
              const dPerUnit = (baseScore - score) / k;
              const meltAfter = withTempChange(() => { assignM.focus = current - k; }, () => computeFocusMeltRate());
              if(meltAfter >= waterTarget){
                const dMelt = Math.max(0, baseMelt - meltAfter);
                const dMeltPerUnit = dMelt / k;
                let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((baseMelt - waterTarget) / dMeltPerUnit) : 0;
                unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
                const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
                if (step > 0) cands.push({ kind:'mirror-remove', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
              }
            }
            if ((assignL.focus || 0) > 0) {
              const current = assignL.focus || 0;
              const k = LANTERN_PROBE_MIN;
              const score = withTempChange(() => { assignL.focus = current - k; }, () => objective(passLevel));
              const dPerUnit = (baseScore - score) / k;
              const meltAfter = withTempChange(() => { assignL.focus = current - k; }, () => computeFocusMeltRate());
              if(meltAfter >= waterTarget){
                const dMelt = Math.max(0, baseMelt - meltAfter);
                const dMeltPerUnit = dMelt / k;
                let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((baseMelt - waterTarget) / dMeltPerUnit) : 0;
                unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
                const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
                if (step > 0) cands.push({ kind:'lantern-remove', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
              }
            }
          }
        }

        // Reallocation candidates if out of resources
        const addReallocs = () => {
          const focusTarget = FOCUS_FLAG && (targets.water || 0) > 0 ? (targets.water) : 0;
          const baseFocusMelt = focusTarget > 0 ? computeFocusMeltRate() : 0;

          const resolveStep = (baseValue, targetValue, afterValue, donorAvailable, probe) => {
            if (!Number.isFinite(baseValue) || !Number.isFinite(afterValue)) return probe;
            const delta = targetValue - baseValue;
            const change = afterValue - baseValue;
            if (!change || delta === 0) return probe;
            if (delta * change <= 0) return probe;
            const unitsNeeded = Math.ceil(Math.abs(delta / change));
            if (!(unitsNeeded > 0)) return probe;
            const scaled = Math.max(probe, Math.ceil(SAFETY_FRACTION * unitsNeeded));
            return Math.min(donorAvailable, scaled);
          };

          if (mirrorsLeft() <= 0) {
            const donors = [...ZONES, 'focus'].filter(dz => (assignM[dz]) > 0)
              .filter(dz => (dz === 'focus' ? (prio.focus||5) : (prio[dz]||5)) > passLevel);
            const receivers = [...ZONES, 'focus'].filter(rz => {
              if (rz === 'focus') return FOCUS_FLAG && (targets.water)>0 && (prio.focus||5) <= passLevel;
              return (targets[rz]) > 0 && (prio[rz]||5) <= passLevel;
            });
            const baseScoreR = objective(passLevel);

            donors.forEach(dz => receivers.forEach(rz => {
              const donorHas = assignM[dz];
              if (!(donorHas > 0)) return;
              const probe = Math.max(1, Math.min(donorHas, REALLOC_MIN));
              const applyProbe = (amount, evaluator) => withTempChange(() => {
                assignM[dz] = donorHas - amount;
                assignM[rz] = (assignM[rz]) + amount;
              }, evaluator);
              const candidateScore = applyProbe(probe, () => objective(passLevel));
              const dPerUnit = (baseScoreR - candidateScore) / probe;
              if (dPerUnit <= 0) return;
              let step = probe;
              if (rz === 'focus') {
                if (focusTarget > 0) {
                  const meltAfter = applyProbe(probe, () => computeFocusMeltRate());
                  step = resolveStep(baseFocusMelt, focusTarget, meltAfter, donorHas, probe);
                }
              } else {
                const target = targets[rz] || 0;
                if (target > 0) {
                  const tempAfter = applyProbe(probe, () => getZoneTemp(rz));
                  step = resolveStep(temps[rz], target, tempAfter, donorHas, probe);
                }
              }
              if (step <= 0) return;
              cands.push({ kind:'mirror-realloc', from:dz, to:rz, kProbe:probe, kStep:step, gainPerUnit:dPerUnit });
            }));
          }

          if (lanternsLeft() <= 0) {
            const donors = [...ZONES, 'focus'].filter(dz => (assignL[dz]) > 0)
              .filter(dz => (dz === 'focus' ? (prio.focus||5) : (prio[dz]||5)) > passLevel);
            const receivers = [...ZONES, 'focus'].filter(rz => {
              if (rz === 'focus') return FOCUS_FLAG && (targets.water)>0 && (prio.focus||5) <= passLevel;
              const t = getZoneTemp(rz);
              return (targets[rz]) > 0 && (prio[rz]||5) <= passLevel && isFinite(t) && t < (targets[rz]-K_TOL);
            });
            const baseScoreR = objective(passLevel);

            donors.forEach(dz => receivers.forEach(rz => {
              const donorHas = assignL[dz];
              if (!(donorHas > 0)) return;
              const probe = Math.max(1, Math.min(donorHas, REALLOC_MIN));
              const applyProbe = (amount, evaluator) => withTempChange(() => {
                assignL[dz] = donorHas - amount;
                assignL[rz] = (assignL[rz]) + amount;
              }, evaluator);
              const candidateScore = applyProbe(probe, () => objective(passLevel));
              const dPerUnit = (baseScoreR - candidateScore) / probe;
              if (dPerUnit <= 0) return;
              let step = probe;
              if (rz === 'focus') {
                if (focusTarget > 0) {
                  const meltAfter = applyProbe(probe, () => computeFocusMeltRate());
                  step = resolveStep(baseFocusMelt, focusTarget, meltAfter, donorHas, probe);
                }
              } else {
                const target = targets[rz] || 0;
                if (target > 0) {
                  const tempAfter = applyProbe(probe, () => getZoneTemp(rz));
                  step = resolveStep(temps[rz], target, tempAfter, donorHas, probe);
                }
              }
              if (step <= 0) return;
              cands.push({ kind:'lantern-realloc', from:dz, to:rz, kProbe:probe, kStep:step, gainPerUnit:dPerUnit });
            }));
          }
        };
        addReallocs();

        // Rank by improvement per unit (descending)
        cands.sort((a, b) => (b.gainPerUnit || 0) - (a.gainPerUnit || 0));
        return cands;
      };

      const withinPassTolerance = (passLevel) => {
        const t = readTemps();
        for (const z of ZONES) {
          const tgt = targets[z] || 0;
          if (!(tgt > 0)) continue;
          if ((prio[z] || 5) <= passLevel) {
            if (!isFinite(t[z])) return false;
            if (Math.abs(t[z] - tgt) > K_TOL) return false;
          }
        }
        if (FOCUS_FLAG && (targets.water) > 0 && (prio.focus||5) <= passLevel) {
          const melt = computeFocusMeltRate();
          if (melt < (targets.water) || melt > (targets.water * (1 + WATER_REL_TOL))) return false;
        }
        return true;
      };

      // ---------------- Pass loop with batched actions ----------------
      updateTemps();

      for (let pass = minP; pass <= maxP; pass++) {
        const hasActive =
          ZONES.some(z => (targets[z]) > 0 && (prio[z]||5) <= pass) ||
          (FOCUS_FLAG && (targets.water) > 0 && (prio.focus||5) <= pass);
        if (!hasActive) continue;

        let actions = 0;

        while (actions < MAX_ACTIONS_PER_PASS) {
          if (withinPassTolerance(pass)) break;
          updateTemps();
          const cands = buildCandidates(pass);
          if (!cands.length || (cands[0].gainPerUnit || 0) <= 0) break; // no improving move

          // Commit top candidate
          const best = cands[0];
          if (best.kind === 'mirror') {
            const step = Math.min(best.kStep, mirrorsLeft());
            if (step <= 0) break;
            assignM[best.zone] = (assignM[best.zone]) + step;
          } else if (best.kind === 'lantern') {
            const step = Math.min(best.kStep, lanternsLeft());
            if (step <= 0) break;
            assignL[best.zone] = (assignL[best.zone]) + step;
          } else if (best.kind === 'mirror-realloc') {
            const step = Math.min(best.kStep, assignM[best.from]);
            if (step <= 0) break;
            assignM[best.from] = (assignM[best.from]) - step;
            assignM[best.to] = (assignM[best.to]) + step;
          } else if (best.kind === 'lantern-realloc') {
            const step = Math.min(best.kStep, assignL[best.from]);
            if (step <= 0) break;
            assignL[best.from] = (assignL[best.from]) - step;
            assignL[best.to] = (assignL[best.to]) + step;
          } else if (best.kind === 'mirror-remove') {
            const step = Math.min(best.kStep, assignM[best.zone]);
            if (step <= 0) break;
            assignM[best.zone] = (assignM[best.zone]) - step;
          } else if (best.kind === 'lantern-remove') {
            const step = Math.min(best.kStep, assignL[best.zone]);
            if (step <= 0) break;
            assignL[best.zone] = (assignL[best.zone]) - step;
          }

          actions++;
          updateTemps();
        }

        // Do not flip reversal every pass; it is fixed by baseline evaluation above.
      }

      // Final clamping (defensive)
      clampTo(assignM, totalMirrors);
      clampTo(assignL, totalLanterns);

      // Persist assignments (already in place) and save warm-start snapshot
      settings.assignments.mirrors = assignM;
      settings.assignments.lanterns = assignL;
      settings.assignments.reversalMode = reverse;

      settings.lastSolution = {
        mirrors: { ...assignM },
        lanterns: { ...assignL },
        reversalMode: { ...reverse }
      };

    } finally {
      SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = false;
    }
    terraforming.restoreTemperatureState(snapshot);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMirrorAdvancedOversight = SpaceMirrorAdvancedOversight;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpaceMirrorAdvancedOversight,
  };
}

