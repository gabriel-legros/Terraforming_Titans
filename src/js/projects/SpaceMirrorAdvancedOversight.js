class SpaceMirrorAdvancedOversight {
  static advancedAssignmentInProgress = false;

  static runAssignments(project, settings) {
    if (!settings || !settings.advancedOversight) return;
    if (SpaceMirrorAdvancedOversight.advancedAssignmentInProgress) return;
    SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = true;
    const baselineAverageTemperature = terraforming?.temperature?.value;
    let snapshot = terraforming.saveTemperatureState();
    let solvedSnapshot = null;

    try {
      if (typeof terraforming === 'undefined' || typeof buildings === 'undefined') return;

      // ---------------- Config knobs (tune as needed) ----------------
      const K_TOL = 0.001;         // Temperature tolerance (K) for zones
      const FLUX_TOL = 0.01;       // Flux tolerance (W/m^2) for zones
      const WATER_REL_TOL = 0.00001; // Relative tol (1%) for water melt target
      const MAX_ACTIONS_PER_PASS = 100; // Commit at most this many batched moves per priority pass
      const MAX_PRUNE_ACTIONS = 12; // Final cleanup only; pruning every pass is too expensive
      const MIN_ZONE_FLUX = 2.4e-5; // Floor used by calculateZoneSolarFluxWithFacility
      const NEAR_MIN_FLUX = MIN_ZONE_FLUX * 1.05;
      // Probe sizing for derivative estimates (NO per-mirror loops; single physics call per probe)
      const MIRROR_PROBE_BASE = 1;      // Minimum mirrors per probe (useful scale for "billions")
      const LANTERN_PROBE_BASE = 1;     // Minimum lanterns per probe (useful scale for "billions")
      const SAFETY_FRACTION = 1;        // Take only 50% of the "unitsNeeded" to reduce overshoot risk

      // If no resources left, allow reallocation from strictly lower priority zones
      const REALLOC_MIN = 1;           // At least this many units in a reallocation probe (mirrors/lanterns)

      // ---------------- Capability / flags ----------------
      const ZONES = getZones();

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
      const getMirrorValue = (zone) => Number(assignM[zone]) || 0;
      const getMirrorCount = (zone) => Math.abs(getMirrorValue(zone));
      const isMirrorReverse = (zone) => getMirrorValue(zone) < 0;
      const setMirrorCount = (zone, count, reverseMode) => {
        const nextCount = Math.max(0, count);
        assignM[zone] = nextCount === 0 ? 0 : (reverseMode ? -nextCount : nextCount);
      };
      const addMirrorCount = (zone, count, reverseMode) => {
        setMirrorCount(zone, getMirrorCount(zone) + count, reverseMode);
      };
      const adjustMirrorCount = (zone, delta) => {
        assignM[zone] = (Number(assignM[zone]) || 0) + delta;
        if (!assignM[zone]) assignM[zone] = 0;
      };
      const removeMirrorCount = (zone, count) => {
        setMirrorCount(zone, Math.max(0, getMirrorCount(zone) - count), isMirrorReverse(zone));
      };
      const transferMirrorCount = (from, to, count) => {
        const donorReverse = isMirrorReverse(from);
        const receiverReverse = isMirrorReverse(to);
        setMirrorCount(from, Math.max(0, getMirrorCount(from) - count), donorReverse);
        setMirrorCount(to, getMirrorCount(to) + count, receiverReverse);
      };
      const syncDerivedReverseState = () => {
        for (const zone of ZONES) {
          reverse[zone] = REVERSAL_AVAILABLE && isMirrorReverse(zone);
        }
        reverse.focus = false;
        reverse.any = false;
      };

      const prio = settings.priority || { tropical: 1, temperate: 1, polar: 1, focus: 1 };
      const targets = settings.targets || { tropical: 0, temperate: 0, polar: 0, water: 0 };

      if (!(targets.water > 0)) {
        assignM.focus = 0;
        assignL.focus = 0;
      }

      const totalMirrors = Math.max(
        0,
        Number.isFinite(buildings.spaceMirror?.activeNumber)
          ? buildings.spaceMirror.activeNumber
          : (typeof buildingCountToNumber === 'function'
            ? buildingCountToNumber(buildings.spaceMirror?.active)
            : Math.max(0, Math.floor(Number(buildings.spaceMirror?.active) || 0)))
      );
      const totalLanterns = settings.applyToLantern
        ? Math.max(
            0,
            Number.isFinite(buildings.hyperionLantern?.activeNumber)
              ? buildings.hyperionLantern.activeNumber
              : (typeof buildingCountToNumber === 'function'
                ? buildingCountToNumber(buildings.hyperionLantern?.active)
                : Math.max(0, Math.floor(Number(buildings.hyperionLantern?.active) || 0)))
          )
        : 0;

      const usedMirrors = () => getMirrorCount('tropical') + getMirrorCount('temperate') + getMirrorCount('polar') + getMirrorCount('focus');
      const usedLanterns = () => (assignL.tropical)+(assignL.temperate)+(assignL.polar)+(assignL.focus);
      const mirrorsLeft = () => Math.max(0, totalMirrors - usedMirrors());
      const lanternsLeft = () => Math.max(0, totalLanterns - usedLanterns());
      const mirrorDeltaCapacity = (zone, direction) => {
        const current = getMirrorValue(zone);
        const free = mirrorsLeft();
        if (direction > 0) {
          return current >= 0 ? free : Math.abs(current) + free;
        }
        if (direction < 0) {
          return current <= 0 ? free : current + free;
        }
        return 0;
      };

      const getZoneMode = (z) => settings.tempMode?.[z] || 'average';
      const getZoneTolerance = (z) => getZoneMode(z) === 'flux' ? FLUX_TOL : K_TOL;

      const getZoneTemp = (z) => {
        const mode = getZoneMode(z);
        if (mode === 'flux') {
          const flux = terraforming.calculateZoneSolarFlux(z);
          return Number.isFinite(flux) ? flux / 4 : NaN;
        }
        const data = terraforming?.temperature?.zones?.[z];
        if (!data) return NaN;
        if (mode === 'day') return data.day;
        if (mode === 'night') return data.night;
        return data.value;
      };

      const getZoneTrendTemp = (z) => {
        const mode = getZoneMode(z);
        if (mode === 'flux') return getZoneTemp(z);
        const data = terraforming?.temperature?.zones?.[z];
        if (!data) return NaN;
        const meanTrend = Number.isFinite(data.trendValue) ? data.trendValue : data.value;
        if (mode === 'day') {
          const offset = (Number.isFinite(data.day) && Number.isFinite(data.value)) ? (data.day - data.value) : 0;
          return meanTrend + offset;
        }
        if (mode === 'night') {
          const offset = (Number.isFinite(data.night) && Number.isFinite(data.value)) ? (data.night - data.value) : 0;
          return meanTrend + offset;
        }
        return meanTrend;
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

      const hasSearchGap = (low, high) => {
        if (!(high > low)) return false;
        const span = high - low;
        if (!(span > 1)) return false;
        const mid = Math.floor((low + high) / 2);
        return mid > low && mid < high;
      };

      const allPriorities = [prio.tropical, prio.temperate, prio.polar, prio.focus].filter(x => typeof x === 'number');
      const minP = Math.min(...allPriorities);
      const maxP = Math.max(...allPriorities);

      const mirrorPowerPer = terraforming.calculateMirrorEffect?.().interceptedPower || 0;
      const lantern = typeof buildings !== 'undefined' ? buildings.hyperionLantern : null;
      const lanternResourceFactor = Number.isFinite(lantern?._baseProductivity)
        ? lantern._baseProductivity
        : (Number.isFinite(lantern?.productivity) ? lantern.productivity : 1);
      const lanternPowerPer = lantern
        ? (lantern.powerPerBuilding || 0) * lanternResourceFactor
        : 0;
      const baseLand = resolveWorldBaseLand(terraforming);
      const MIRROR_PROBE_MIN = mirrorPowerPer > 0 ? Math.max(MIRROR_PROBE_BASE * (baseLand / mirrorPowerPer),1) : 1;
      const LANTERN_PROBE_MIN = lanternPowerPer > 0 ? Math.max(LANTERN_PROBE_BASE * (baseLand / lanternPowerPer),1) : 1;

      // ---------------- Warm start ----------------
      // If we have a saved lastSolution, restore it (clamped to current availability).
      // Otherwise, keep whatever current assignments exist (they already reflect last tick).
      const restoreFromLast = () => {
        const last = settings.lastSolution;
        if (!last) return;
        const copy = (dst, src) => { for (const k of Object.keys(dst)) dst[k] = 0; for (const k of Object.keys(src)) dst[k] = Number(src[k]) || 0; };
        copy(assignM, last.mirrors || {});
        copy(assignL, last.lanterns || {});
        if (last.reversalMode) {
          for (const zone of ZONES) {
            if (last.reversalMode[zone] && assignM[zone] > 0) {
              assignM[zone] = -assignM[zone];
            }
          }
        }
        clampMirrorsTo(totalMirrors);
        clampTo(assignL, totalLanterns);
        syncDerivedReverseState();
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
      const clampMirrorsTo = (max) => {
        let sum = 0;
        for (const k of Object.keys(assignM)) sum += Math.abs(assignM[k] || 0);
        if (sum <= max) return;
        const entries = Object.keys(assignM)
          .map(k => ({
            k,
            v: Math.abs(assignM[k] || 0),
            reverseMode: (assignM[k] || 0) < 0,
            p: (k === 'focus' ? (prio.focus || 5) : (prio[k] || 5))
          }))
          .sort((a, b) => b.p - a.p);
        let over = sum - max;
        for (const e of entries) {
          if (over <= 0) break;
          const take = Math.min(e.v, over);
          setMirrorCount(e.k, e.v - take, e.reverseMode);
          over -= take;
        }
      };

      // Apply warm start
      //restoreFromLast();
      // Make sure reversal is only used if available
      if (!REVERSAL_AVAILABLE) {
        for (const zone of ZONES) {
          if (isMirrorReverse(zone)) {
            setMirrorCount(zone, getMirrorCount(zone), false);
          }
        }
      }
      syncDerivedReverseState();

      const clearLanternsInReverseZones = () => {
        let changed = false;
        for (const zone of ZONES) {
          if (!isMirrorReverse(zone)) continue;
          if ((assignL[zone] || 0) > 0) {
            assignL[zone] = 0;
            changed = true;
          }
        }
        if (changed) updateTemps();
      };

      const trimReverseFloorOvershoot = () => {
        for (const zone of ZONES) {
          if (!isMirrorReverse(zone)) continue;
          const current = getMirrorCount(zone);
          if (!(current > 0)) continue;
          const currentFlux = terraforming.calculateZoneSolarFlux(zone);
          if (currentFlux > NEAR_MIN_FLUX) continue;

          const fluxFor = (count) => {
            const prior = assignM[zone] || 0;
            setMirrorCount(zone, count, true);
            const flux = terraforming.calculateZoneSolarFlux(zone);
            assignM[zone] = prior;
            return flux;
          };

          if (fluxFor(0) <= NEAR_MIN_FLUX) {
            assignM[zone] = 0;
            continue;
          }

          let low = 0;
          let high = current;
          while (hasSearchGap(low, high)) {
            const mid = Math.floor((low + high) / 2);
            if (fluxFor(mid) > NEAR_MIN_FLUX) {
              low = mid;
            } else {
              high = mid;
            }
          }
          setMirrorCount(zone, low, true);
        }
        syncDerivedReverseState();
      };

      // ---------------- Objective ----------------
      const computeFocusMeltRate = () => {
        if (!FOCUS_FLAG) return 0;
        const m = getMirrorCount('focus');
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
          if ((prio[z] || 5) <= passLevel) w = 1;
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
          if ((prio.focus || 5) <= passLevel) w = 1;
          if ((prio.focus || 5) <  passLevel) w *= 32;
          sum += w * relErr * relErr;
        }
        return sum;
      };

      // Utility: run a temporary change, eval, then rollback
      const withTempChange = (changer, evaluator) => {
        const snapM = { ...assignM };
        const snapL = { ...assignL };
        const shallowEqual = (a, b) => {
          const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
          for (const k of keys) {
            if ((a[k] || 0) !== (b[k] || 0)) return false;
          }
          return true;
        };
        changer();
        const changed = !(shallowEqual(assignM, snapM) && shallowEqual(assignL, snapL));
        if (changed) {
          // Only recompute temps when something actually changed
          updateTemps();
          const out = evaluator();
          // Roll back and restore temps
          Object.assign(assignM, snapM);
          Object.assign(assignL, snapL);
          syncDerivedReverseState();
          updateTemps();
          return out;
        } else {
          // No change; evaluate on current state without recomputing temps
          return evaluator();
        }
      };

      // Build batched candidates for this pass
      const buildCandidates = (passLevel) => {
        const cands = [];
        const temps = readTemps();
        const baseScore = objective(passLevel);

        // Mirror/lantern add candidates (batched)
        for (const z of ZONES) {
          if ((prio[z] || 5) > passLevel) continue; // only optimize up to current pass
          const tgt = targets[z] || 0; if (!(tgt > 0)) continue;
          const addMirrorDirectionCandidate = (direction) => {
            if (direction < 0 && !REVERSAL_AVAILABLE) return;
            const capacity = mirrorDeltaCapacity(z, direction);
            if (!(capacity > 0)) return;
            const probe = 1;
            const probeResult = withTempChange(() => { adjustMirrorCount(z, direction * probe); }, () => ({
              score: objective(passLevel),
              temp: getZoneTemp(z),
            }));
            const dPerUnit = (baseScore - probeResult.score) / probe;
            const dT = (isFinite(probeResult.temp) && isFinite(temps[z])) ? (probeResult.temp - temps[z]) : 0;
            const dtPerUnit = dT / probe;
            let unitsNeeded = 0;
            if (dtPerUnit > 0) {
              unitsNeeded = Math.ceil((targets[z] - temps[z]) / dtPerUnit);
            } else if (dtPerUnit < 0) {
              unitsNeeded = Math.ceil((temps[z] - targets[z]) / (-dtPerUnit));
            }
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, capacity));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), capacity));
            if (step > 0) {
              cands.push({
                kind: 'mirror-adjust',
                zone: z,
                delta: direction * step,
                kProbe: probe,
                kStep: step,
                gainPerUnit: dPerUnit
              });
            }
          };

          addMirrorDirectionCandidate(1);
          addMirrorDirectionCandidate(-1);

          // Lanterns (heating)
          if (lanternsLeft() > 0 && !isMirrorReverse(z)) {
            const k = LANTERN_PROBE_MIN;
            const probe = withTempChange(() => { assignL[z] = (assignL[z]) + k; }, () => ({
              score: objective(passLevel),
              temp: getZoneTemp(z),
            }));
            const dPerUnit = (baseScore - probe.score) / k;
            const dT = (isFinite(probe.temp) && isFinite(temps[z])) ? (probe.temp - temps[z]) : 0;
            const dtPerUnit = dT / k;
            let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
            if (step > 0) cands.push({ kind:'lantern', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }

          // Removal candidates when locked mode conflicts with need
          // - Lanterns only heat; if the zone needs cooling, try removing lanterns
          if ((assignL[z] || 0) > 0) {
            const current = assignL[z] || 0;
            const k = Math.max(1, Math.min(current, LANTERN_PROBE_MIN));
            const probe = withTempChange(() => { assignL[z] = current - k; }, () => ({
              score: objective(passLevel),
              temp: getZoneTemp(z),
            }));
            const dPerUnit = (baseScore - probe.score) / k;
            const dT = (isFinite(probe.temp) && isFinite(temps[z])) ? (probe.temp - temps[z]) : 0; // expected < 0
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
              const k = 1;
              const probe = withTempChange(() => { addMirrorCount('focus', k, false); }, () => ({
                score: objective(passLevel),
                melt: computeFocusMeltRate(),
              }));
              const dPerUnit = (baseScore - probe.score) / k;
              const dMelt = Math.max(0, probe.melt - baseMelt);
              const dMeltPerUnit = dMelt / k;
              let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((waterTarget - baseMelt) / dMeltPerUnit) : 0;
              unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
              const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
              if (step > 0) cands.push({ kind:'mirror-adjust', zone:'focus', delta: step, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
            }
            if (lanternsLeft() > 0) {
              const k = 1;
              const probe = withTempChange(() => { assignL.focus = (assignL.focus) + k; }, () => ({
                score: objective(passLevel),
                melt: computeFocusMeltRate(),
              }));
              const dPerUnit = (baseScore - probe.score) / k;
              const dMelt = Math.max(0, probe.melt - baseMelt);
              const dMeltPerUnit = dMelt / k;
              let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((waterTarget - baseMelt) / dMeltPerUnit) : 0;
              unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
              const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
              if (step > 0) cands.push({ kind:'lantern', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
            }
          }
          const wantLess = baseMelt > waterTarget * (1 + WATER_REL_TOL);
          if (wantLess) {
            if (getMirrorCount('focus') > 0) {
              const current = getMirrorCount('focus');
              const k = 1;
              const probe = withTempChange(() => { setMirrorCount('focus', current - k, false); }, () => ({
                score: objective(passLevel),
                melt: computeFocusMeltRate(),
              }));
              const dPerUnit = (baseScore - probe.score) / k;
              if (probe.melt >= waterTarget) {
                const dMelt = Math.max(0, baseMelt - probe.melt);
                const dMeltPerUnit = dMelt / k;
                let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil((baseMelt - waterTarget) / dMeltPerUnit) : 0;
                unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
                const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
                if (step > 0) cands.push({ kind:'mirror-remove', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
              }
            }
            if ((assignL.focus || 0) > 0) {
              const current = assignL.focus || 0;
              const k = 1;
              const probe = withTempChange(() => { assignL.focus = current - k; }, () => ({
                score: objective(passLevel),
                melt: computeFocusMeltRate(),
              }));
              const dPerUnit = (baseScore - probe.score) / k;
              if (probe.melt >= waterTarget) {
                const dMelt = Math.max(0, baseMelt - probe.melt);
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

          if (lanternsLeft() <= 0) {
            const donors = [...ZONES, 'focus'].filter(dz => (assignL[dz]) > 0)
              .filter(dz => (dz === 'focus' ? (prio.focus||5) : (prio[dz]||5)) > passLevel);
            const receivers = [...ZONES, 'focus'].filter(rz => {
              if (rz === 'focus') return FOCUS_FLAG && (targets.water)>0 && (prio.focus||5) <= passLevel;
              if (isMirrorReverse(rz)) return false;
              const t = getZoneTemp(rz);
              return (targets[rz]) > 0 && (prio[rz]||5) <= passLevel && isFinite(t) && t < (targets[rz] - getZoneTolerance(rz));
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
              const probeResult = applyProbe(probe, () => ({
                score: objective(passLevel),
                temp: rz === 'focus' ? NaN : getZoneTemp(rz),
                melt: rz === 'focus' ? computeFocusMeltRate() : NaN,
              }));
              const dPerUnit = (baseScoreR - probeResult.score) / probe;
              if (dPerUnit <= 0) return;
              let step = probe;
              if (rz === 'focus') {
                if (focusTarget > 0) {
                  step = resolveStep(baseFocusMelt, focusTarget, probeResult.melt, donorHas, probe);
                }
              } else {
                const target = targets[rz] || 0;
                if (target > 0) {
                  step = resolveStep(temps[rz], target, probeResult.temp, donorHas, probe);
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

      const findMaxSafeRemovalStep = (current, initialProbe, applyRemoval, passLevel) => {
        if (!(current > 0)) return 0;

        const isSafe = (amount) => withTempChange(() => {
          applyRemoval(amount);
        }, () => withinPassTolerance(passLevel));

        if (!isSafe(1)) return 0;

        let safe = 1;
        let probe = Math.max(1, Math.min(current, initialProbe));
        if (probe < safe) probe = safe;

        while (probe < current && isSafe(probe)) {
          safe = probe;
          const next = Math.min(current, probe * 10);
          if (next === probe) break;
          probe = next;
        }

        if (probe === current && isSafe(current)) {
          return current;
        }

        let low = safe;
        let high = Math.max(safe + 1, Math.min(current, probe));
        while (high <= current && isSafe(high)) {
          low = high;
          if (high === current) return current;
          const next = Math.min(current, high * 10);
          if (next === high) break;
          high = next;
        }

        while (hasSearchGap(low, high)) {
          const mid = Math.floor((low + high) / 2);
          if (isSafe(mid)) {
            low = mid;
          } else {
            high = mid;
          }
        }
        return low;
      };

      const buildPruneCandidates = (passLevel) => {
        const cands = [];
        if (mirrorsLeft() > 0 && lanternsLeft() > 0) return cands;
        if (!withinPassTolerance(passLevel)) return cands;
        const surfaceArea = terraforming?.celestialParameters?.surfaceArea || 0;
        const mirrorForcingPerUnit = surfaceArea > 0 ? (4 * mirrorPowerPer) / surfaceArea : 0;
        const lanternForcingPerUnit = surfaceArea > 0 ? (4 * lanternPowerPer) / surfaceArea : 0;

        const addRemovalCandidate = (kind, zone, current, probe, unitForcing, applyRemoval) => {
          const step = findMaxSafeRemovalStep(current, probe, applyRemoval, passLevel);
          if (!(step > 0)) return;
          const forcingReduction = unitForcing * step;
          if (forcingReduction > 0 && unitForcing > 0) {
            cands.push({ kind, zone, kStep: step, gainPerUnit: unitForcing, forcingReduction });
          }
        };

        for (const z of ZONES) {
          const mirrorCount = getMirrorCount(z);
          if (mirrorCount > 0) {
            const reverseMode = isMirrorReverse(z);
            addRemovalCandidate('mirror-remove', z, mirrorCount, MIRROR_PROBE_MIN, mirrorForcingPerUnit, (amount) => {
              setMirrorCount(z, mirrorCount - amount, reverseMode);
            });
          }

          const lanternCount = assignL[z] || 0;
          if (lanternCount > 0) {
            addRemovalCandidate('lantern-remove', z, lanternCount, LANTERN_PROBE_MIN, lanternForcingPerUnit, (amount) => {
              assignL[z] = lanternCount - amount;
            });
          }
        }

        const focusMirrors = getMirrorCount('focus');
        if (focusMirrors > 0) {
          addRemovalCandidate('mirror-remove', 'focus', focusMirrors, MIRROR_PROBE_MIN, mirrorForcingPerUnit, (amount) => {
            setMirrorCount('focus', focusMirrors - amount, false);
          });
        }

        const focusLanterns = assignL.focus || 0;
        if (focusLanterns > 0) {
          addRemovalCandidate('lantern-remove', 'focus', focusLanterns, LANTERN_PROBE_MIN, lanternForcingPerUnit, (amount) => {
            assignL.focus = focusLanterns - amount;
          });
        }

        cands.sort((a, b) => (b.forcingReduction || 0) - (a.forcingReduction || 0));
        return cands;
      };

      const commitCandidate = (best) => {
        if (best.kind === 'mirror-adjust') {
          const capacity = mirrorDeltaCapacity(best.zone, Math.sign(best.delta));
          const step = Math.min(Math.abs(best.delta), capacity);
          if (step <= 0) return false;
          adjustMirrorCount(best.zone, Math.sign(best.delta) * step);
          return true;
        }
        if (best.kind === 'lantern') {
          const step = Math.min(best.kStep, lanternsLeft());
          if (step <= 0) return false;
          assignL[best.zone] = (assignL[best.zone]) + step;
          return true;
        }
        if (best.kind === 'lantern-realloc') {
          const step = Math.min(best.kStep, assignL[best.from]);
          if (step <= 0) return false;
          assignL[best.from] = (assignL[best.from]) - step;
          assignL[best.to] = (assignL[best.to]) + step;
          return true;
        }
        if (best.kind === 'mirror-remove') {
          const step = Math.min(best.kStep, getMirrorCount(best.zone));
          if (step <= 0) return false;
          removeMirrorCount(best.zone, step);
          return true;
        }
        if (best.kind === 'lantern-remove') {
          const step = Math.min(best.kStep, assignL[best.zone]);
          if (step <= 0) return false;
          assignL[best.zone] = (assignL[best.zone]) - step;
          return true;
        }
        return false;
      };

      const withinPassTolerance = (passLevel) => {
        const t = readTemps();
        for (const z of ZONES) {
          const tgt = targets[z] || 0;
          if (!(tgt > 0)) continue;
          if ((prio[z] || 5) <= passLevel) {
            if (!isFinite(t[z])) return false;
            if (Math.abs(t[z] - tgt) > getZoneTolerance(z)) return false;
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

        trimReverseFloorOvershoot();

        let actions = 0;

        while (actions < MAX_ACTIONS_PER_PASS) {
          if (withinPassTolerance(pass)) break;
          const cands = buildCandidates(pass);
          if (!cands.length || (cands[0].gainPerUnit || 0) <= 0) break; // no improving move

          const best = cands[0];
          if (!commitCandidate(best)) break;

          actions++;
          updateTemps();
        }
      }

      let pruneActions = 0;
      while (pruneActions < MAX_PRUNE_ACTIONS) {
        if (!withinPassTolerance(maxP)) break;
        const pruneCands = buildPruneCandidates(maxP);
        if (!pruneCands.length || (pruneCands[0].gainPerUnit || 0) <= 0) break;
        if (!commitCandidate(pruneCands[0])) break;
        pruneActions++;
        updateTemps();
      }

      // Final clamping (defensive)
      clampMirrorsTo(totalMirrors);
      clampTo(assignL, totalLanterns);
      clearLanternsInReverseZones();
      syncDerivedReverseState();

      // Persist assignments (already in place) and save warm-start snapshot
      settings.assignments.mirrors = assignM;
      settings.assignments.lanterns = assignL;
      settings.assignments.reversalMode = reverse;

      settings.lastSolution = {
        mirrors: { ...assignM },
        lanterns: { ...assignL },
        reversalMode: { ...reverse }
      };

      updateTemps();
      solvedSnapshot = terraforming.saveTemperatureState();

    } finally {
      SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = false;
    }
    terraforming.restoreTemperatureState(snapshot);
    if (solvedSnapshot) {
      const solvedTemp = solvedSnapshot.temperature || {};
      const solvedLum = solvedSnapshot.luminosity || {};

      if (terraforming.temperature) {
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'trendValue')) {
          terraforming.temperature.trendValue = solvedTemp.trendValue;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'equilibriumTemperature')) {
          terraforming.temperature.equilibriumTemperature = solvedTemp.equilibriumTemperature;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'effectiveTempNoAtmosphere')) {
          terraforming.temperature.effectiveTempNoAtmosphere = solvedTemp.effectiveTempNoAtmosphere;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'emissivity')) {
          terraforming.temperature.emissivity = solvedTemp.emissivity;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'opticalDepth')) {
          terraforming.temperature.opticalDepth = solvedTemp.opticalDepth;
        }

        const targetContributions = terraforming.temperature.opticalDepthContributions || {};
        const solvedContributions = solvedTemp.opticalDepthContributions || {};
        for (const key of Object.keys(targetContributions)) {
          delete targetContributions[key];
        }
        for (const key of Object.keys(solvedContributions)) {
          targetContributions[key] = solvedContributions[key];
        }

        const zones = terraforming.temperature.zones || {};
        const solvedZones = solvedTemp.zones || {};
        for (const zoneKey of Object.keys(zones)) {
          const zone = zones[zoneKey];
          const solvedZone = solvedZones[zoneKey] || {};
          if (Object.prototype.hasOwnProperty.call(solvedZone, 'trendValue')) {
            zone.trendValue = solvedZone.trendValue;
          }
          if (Object.prototype.hasOwnProperty.call(solvedZone, 'equilibriumTemperature')) {
            zone.equilibriumTemperature = solvedZone.equilibriumTemperature;
          }
        }
      }

      if (terraforming.luminosity) {
        if (Object.prototype.hasOwnProperty.call(solvedLum, 'modifiedSolarFlux')) {
          terraforming.luminosity.modifiedSolarFlux = solvedLum.modifiedSolarFlux;
        }
        if (Object.prototype.hasOwnProperty.call(solvedLum, 'modifiedSolarFluxUnpenalized')) {
          terraforming.luminosity.modifiedSolarFluxUnpenalized = solvedLum.modifiedSolarFluxUnpenalized;
        }
        const targetZonalFluxes = terraforming.luminosity.zonalFluxes || {};
        const solvedZonalFluxes = solvedLum.zonalFluxes || {};
        for (const key of Object.keys(targetZonalFluxes)) {
          delete targetZonalFluxes[key];
        }
        for (const key of Object.keys(solvedZonalFluxes)) {
          targetZonalFluxes[key] = solvedZonalFluxes[key];
        }
      }
    }
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
