// RWG Equilibration: isolate terraforming simulation and fast-forward to a steady state
(function() {
  function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
  function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        const t = target[key];
        const s = source[key];
        if (isObject(t) && isObject(s)) output[key] = deepMerge(t, s);
        else if (s !== undefined) output[key] = s;
      });
    }
    return output;
  }

  const ZONE_KEYS = ['tropical', 'temperate', 'polar'];
  const MIN_TERRAFORMING_SUBSTEP_MS = terraformingParameters.gameplay.simulation.resourceSubstepMs;

  function quantizeEquilibrationStepMs(stepMs) {
    const numericStep = Number(stepMs) || 0;
    if (numericStep <= MIN_TERRAFORMING_SUBSTEP_MS) {
      return MIN_TERRAFORMING_SUBSTEP_MS;
    }
    return Math.max(
      MIN_TERRAFORMING_SUBSTEP_MS,
      Math.round(numericStep / MIN_TERRAFORMING_SUBSTEP_MS) * MIN_TERRAFORMING_SUBSTEP_MS
    );
  }

  function ensureEquilibrationZones(terra) {
    const zonalSurface = terra.zonalSurface || (terra.zonalSurface = {});
    const resourceKeys = new Set();
    (terra.zonalSurfaceResourceConfigs || []).forEach((config) => {
      (config.keys || []).forEach((key) => resourceKeys.add(key));
    });
    resourceKeys.forEach((key) => {
      ZONE_KEYS.forEach((zone) => {
        if (zonalSurface[key][zone] === undefined) {
          zonalSurface[key][zone] = 0;
        }
      });
    });
  }

  function buildSandboxResourcesFromOverride(overrideResources) {
    const res = {};
    const mergedResources = deepMerge(defaultPlanetParameters.resources, overrideResources || {});
    for (const cat of Object.keys(mergedResources)) {
      res[cat] = {};
      const bucket = mergedResources[cat];
      for (const key of Object.keys(bucket)) {
        const entry = bucket[key] || {};
        const initialValue = entry.initialValue || 0;
        res[cat][key] = {
          value: initialValue,
          productionRateByType: {},
          consumptionRateByType: {},
          modifyRate: function(value, source, rateType) {
            if (!(value > 0) && !(value < 0)) {
              return;
            }
            const typeKey = rateType || 'unknown';
            const sourceKey = source || 'Unknown';
            if (value > 0) {
              const prod = this.productionRateByType;
              if (!prod[typeKey]) {
                prod[typeKey] = {};
              }
              prod[typeKey][sourceKey] = (prod[typeKey][sourceKey] || 0) + value;
              return;
            }
            const cons = this.consumptionRateByType;
            if (!cons[typeKey]) {
              cons[typeKey] = {};
            }
            cons[typeKey][sourceKey] = (cons[typeKey][sourceKey] || 0) - value;
          },
          zonalConfig: entry.zonalConfig,
        };
      }
    }
    return res;
  }


  function copyBackToOverrideFromSandbox(override, sandboxResources, terra) {
    const out = JSON.parse(JSON.stringify(override));
    // Write atmospheric and surface resources back into override
    const atmoKeys = ['carbonDioxide','inertGas','oxygen','atmosphericWater','greenhouseGas','atmosphericMethane','atmosphericAmmonia','hydrogen','sulfuricAcid','calciteAerosol','vanadiumAerosol'];
    out.resources = out.resources || {};
    out.resources.atmospheric = out.resources.atmospheric || {};
    atmoKeys.forEach(k => {
      const v = sandboxResources.atmospheric && sandboxResources.atmospheric[k] ? sandboxResources.atmospheric[k].value || 0 : 0;
      out.resources.atmospheric[k] = out.resources.atmospheric[k] || {}; out.resources.atmospheric[k].initialValue = v;
    });
    const surfKeys = ['ice','liquidWater','dryIce','liquidCO2','liquidHydrogen','liquidMethane','hydrocarbonIce','liquidAmmonia','ammoniaIce','liquidOxygen','oxygenIce','buriedOxygenIce','liquidNitrogen','nitrogenIce','buriedNitrogenIce'];
    out.resources.surface = out.resources.surface || {};
    surfKeys.forEach(k => {
      const v = sandboxResources.surface && sandboxResources.surface[k] ? sandboxResources.surface[k].value || 0 : 0;
      out.resources.surface[k] = out.resources.surface[k] || {}; out.resources.surface[k].initialValue = v;
    });
    // Zonal structures copied from terraforming instance
    if (terra) {
      out.zonalSurface = JSON.parse(JSON.stringify(terra.zonalSurface || {}));

      if (terra.celestialParameters) {
        out.celestialParameters = JSON.parse(JSON.stringify(terra.celestialParameters));
      }

      const eqT = terra.temperature && typeof terra.temperature.effectiveTempNoAtmosphere === 'number'
        ? terra.temperature.effectiveTempNoAtmosphere
        : undefined;
      if (eqT !== undefined) {
        out.classification = out.classification || {};
        out.classification.TeqK = Math.round(eqT);
      }

      if (terra.temperature && terra.temperature.zones && typeof getZonePercentage === 'function') {
        const z = terra.temperature.zones;
        const weights = {
          tropical: getZonePercentage('tropical'),
          temperate: getZonePercentage('temperate'),
          polar: getZonePercentage('polar')
        };
        const day = z.tropical.day * weights.tropical + z.temperate.day * weights.temperate + z.polar.day * weights.polar;
        const night = z.tropical.night * weights.tropical + z.temperate.night * weights.temperate + z.polar.night * weights.polar;
        out.finalTemps = { mean: terra.temperature.value, day, night };
      }
      if (terra?.temperature?.zones) {
        const prev = out.zonalTemperatures || {};
        const zonalTemps = {};
        const zones = ['tropical', 'temperate', 'polar'];
        for (const zone of zones) {
          const src = terra.temperature.zones[zone];
          if (!src && !prev[zone]) continue;
          const mean = (src && (src.value ?? src.initial)) ?? prev[zone]?.value;
          const day = (src && (src.day ?? src.value ?? src.initial)) ?? prev[zone]?.day ?? mean;
          const night = (src && (src.night ?? src.value ?? src.initial)) ?? prev[zone]?.night ?? mean;
          zonalTemps[zone] = { value: mean, day, night };
        }
        if (Object.keys(zonalTemps).length > 0) {
          out.zonalTemperatures = { ...prev, ...zonalTemps };
        }
      }
    }
    return out;
  }

  function snapshotMetrics(terra) {
    const atmo = terra.resources.atmospheric || {};
    const surf = terra.resources.surface || {};
    function g(obj, k) { return obj[k] ? (obj[k].value || 0) : 0; }
    const metrics = [
      g(atmo,'carbonDioxide'), g(atmo,'inertGas'), g(atmo,'oxygen'), g(atmo,'atmosphericWater'), g(atmo,'greenhouseGas'), g(atmo,'atmosphericMethane'), g(atmo,'atmosphericAmmonia'), g(atmo,'hydrogen'), g(atmo,'sulfuricAcid'), g(atmo,'calciteAerosol'), g(atmo,'vanadiumAerosol'),
      g(surf,'ice'), g(surf,'liquidWater'), g(surf,'dryIce'), g(surf,'liquidCO2'), g(surf,'liquidHydrogen'), g(surf,'liquidMethane'), g(surf,'hydrocarbonIce'), g(surf,'liquidAmmonia'), g(surf,'ammoniaIce'),
      g(surf,'liquidOxygen'), g(surf,'oxygenIce'), g(surf,'liquidNitrogen'), g(surf,'nitrogenIce')
    ];
    const zones = ['tropical', 'temperate', 'polar'];
    for (const zone of zones) {
       const zs = terra.zonalSurface;
       metrics.push(zs.liquidWater[zone] || 0, zs.ice[zone] || 0, zs.buriedIce[zone] || 0);
       metrics.push(zs.liquidCO2[zone] || 0, zs.dryIce[zone] || 0, zs.biomass[zone] || 0);
       metrics.push(zs.liquidHydrogen[zone] || 0);
       metrics.push(zs.liquidMethane[zone] || 0, zs.hydrocarbonIce[zone] || 0, zs.buriedHydrocarbonIce[zone] || 0);
       metrics.push(zs.liquidAmmonia[zone] || 0, zs.ammoniaIce[zone] || 0, zs.buriedAmmoniaIce[zone] || 0);
       metrics.push(zs.liquidOxygen[zone] || 0, zs.oxygenIce[zone] || 0, zs.buriedOxygenIce[zone] || 0);
       metrics.push(zs.liquidNitrogen[zone] || 0, zs.nitrogenIce[zone] || 0, zs.buriedNitrogenIce[zone] || 0);
    }
    return metrics;
  }

  function buildEquilibrationDiagnostics(terra) {
    terra._updateZonalCoverageCache();
    const atmosphericWater = terra.resources.atmospheric.atmosphericWater.value || 0;
    const surfaceArea = terra.celestialParameters.surfaceArea;
    const gravity = terra.celestialParameters.gravity;
    const zones = {};
    for (const zone of ZONE_KEYS) {
      zones[zone] = {
        temperatureK: terra.temperature.zones[zone].value,
        dayTemperatureK: terra.temperature.zones[zone].day,
        nightTemperatureK: terra.temperature.zones[zone].night,
        liquidWaterTons: terra.zonalSurface.liquidWater[zone] || 0,
        iceTons: terra.zonalSurface.ice[zone] || 0,
        liquidWaterCoverage: terra.zonalCoverageCache[zone].liquidWater || 0,
        iceCoverage: terra.zonalCoverageCache[zone].ice || 0
      };
    }
    return {
      temperatureK: terra.temperature.value,
      atmosphericWaterTons: atmosphericWater,
      atmosphericWaterPressurePa: calculateAtmosphericPressure(
        atmosphericWater,
        gravity,
        terra.celestialParameters.radius,
        surfaceArea
      ),
      ratesTonsPerDay: {
        evaporation: terra.totalEvaporationRate || 0,
        sublimation: terra.totalWaterSublimationRate || 0,
        boiling: terra.totalBoilingRate || 0,
        rainfall: terra.totalRainfallRate || 0,
        snowfall: terra.totalSnowfallRate || 0
      },
      zones
    };
  }

  function deltaSmall(prev, curr, absTol, relTol) {
    for (let i = 0; i < prev.length; i++) {
      const a = prev[i], b = curr[i];
      const diff = Math.abs(a - b);
      const scale = Math.max(1, Math.abs(a), Math.abs(b));
      if (diff > absTol && diff/scale > relTol) return false;
    }
    return true;
  }

  function normalizeEquilibrationStar(fullParams) {
    fullParams.celestialParameters = fullParams.celestialParameters || {};
    const star = fullParams.star || (fullParams.star = {});
    const lumFromStar = Number(star.luminositySolar);
    const lumFromCel = Number(fullParams.celestialParameters.starLuminosity);
    const luminosity = Number.isFinite(lumFromStar)
      ? lumFromStar
      : (Number.isFinite(lumFromCel) ? lumFromCel : 1);
    star.luminositySolar = luminosity;
    fullParams.celestialParameters.starLuminosity = luminosity;
  }

  /**
   * Run isolated equilibration.
   * options: { yearsMax, stepDays, checkEvery, absTol, relTol, chunkSteps, cancelToken, sync, timeoutMs, minRunMs }
   * onProgress: fn(0..1, info)
   */
  function runEquilibration(fullParams, options = {}, onProgress) {
    let stepDays = options.stepDays ?? 10;
    const checkEvery = options.checkEvery ?? 5;
    let absTol = options.absTol ?? 0.01; // tons
    let relTol = options.relTol ?? 1e-4; // relative
    const chunkSteps = options.chunkSteps ?? 1000;
    const cancelToken = options.cancelToken;
    const minRunMs = options.minRunMs ?? (options.sync ? 0 : 30000);
    const skipAdditionalFastForward = options.skipAdditionalFastForward === true;
    let additionalRunMs = options.additionalRunMs ?? 60000;
    let timeoutMs = options.timeoutMs ?? (minRunMs + additionalRunMs);
    const instabilityRefinementIntervalMs = options.instabilityRefinementIntervalMs ?? 5000;
    const instabilityRefinementEveryChecks = options.instabilityRefinementEveryChecks ?? 0;
    const maxSteps = options.maxSteps ?? 0;

    return new Promise((resolve, reject) => {
      const prevLum = getStarLuminosity();
      const previousPlanetParameters = currentPlanetParameters;
      const previousResources = resources;
      const previousFacilityFunction = calculateZoneSolarFluxWithFacility;
      let terra = null;
      let previousResourceSubstepMs = null;
      let previousMaxResourceSubsteps = null;
      try {
        isEquilibrating = true;
        normalizeEquilibrationStar(fullParams);
        const sandboxResources = buildSandboxResourcesFromOverride(fullParams.resources || {});

        currentPlanetParameters = fullParams;
        resources = sandboxResources;

        // Temporarily disable facility hooks that could contaminate equilibrium
        calculateZoneSolarFluxWithFacility = undefined;

        terra = new Terraforming(sandboxResources, fullParams.celestialParameters || {});
        terra.calculateInitialValues(fullParams);
        ensureEquilibrationZones(terra);

        let stepIdx = 0;
        let stableCount = 0;
        let prevSnap = snapshotMetrics(terra);
        let refinementCount = 0;
        let refinementsFromInstability = 0;
        let checksSinceInstabilityRefinement = 0;
        let lastUnstableCheckTime = 0;
        let totalSimulatedMs = 0;
        previousResourceSubstepMs = terra.resourceSubstepMilliseconds;
        previousMaxResourceSubsteps = terra.maxResourceSubsteps;
        function applyEquilibrationStep(nextStepMs) {
          const quantizedStepMs = quantizeEquilibrationStepMs(nextStepMs);
          stepDays = quantizedStepMs / 1000;
          terra.resourceSubstepMilliseconds = quantizedStepMs;
          terra.maxResourceSubsteps = Math.max(1, Math.ceil(quantizedStepMs / MIN_TERRAFORMING_SUBSTEP_MS));
          return quantizedStepMs;
        }

        let stepMs = applyEquilibrationStep(1000 * stepDays); // 1 day per 1000 ms
        let timedOut = false;
        let timeoutHandle = setTimeout(() => { timedOut = true; }, timeoutMs);
        const startTime = Date.now();

        function finalize(ok) {
          terra.resourceSubstepMilliseconds = previousResourceSubstepMs;
          terra.maxResourceSubsteps = previousMaxResourceSubsteps;
          terra._updateZonalCoverageCache();
          terra.updateLuminosity();
          terra.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
          terra.synchronizeGlobalResources();
          clearTimeout(timeoutHandle);
          isEquilibrating = false;
          setStarLuminosity(prevLum);
          // Restore globals without leaking sandbox
          currentPlanetParameters = previousPlanetParameters;
          resources = previousResources;
          calculateZoneSolarFluxWithFacility = previousFacilityFunction;
          if (!ok) return;
          const outOverride = copyBackToOverrideFromSandbox(fullParams, sandboxResources, terra);
          const diagnostics = buildEquilibrationDiagnostics(terra);
          const specialSeedKey = outOverride?.rwgMeta?.specialSeedKey || fullParams?.rwgMeta?.specialSeedKey;
          if (!specialSeedKey) {
            applyPostEquilibrationHazardTuning(outOverride, terra);
          }
          resolve({ override: outOverride, steps: stepIdx, diagnostics });
        }

        function loopChunk() {
          let elapsed = Date.now() - startTime;
          if (cancelToken && cancelToken.endEarly && elapsed >= minRunMs) { finalize(true); return; }
          if (timedOut) { finalize(true); return; }
          if (cancelToken && cancelToken.cancelled) { finalize(false); reject(new Error('cancelled')); return; }
          if (cancelToken && cancelToken.addTime) {
            const extra = cancelToken.addTime;
            additionalRunMs += extra;
            timeoutMs += extra;
            cancelToken.addTime = 0; // Consume it
            clearTimeout(timeoutHandle); // Clear the old timeout
            const remainingTime = timeoutMs - (Date.now() - startTime);
            if (remainingTime > 0) {
              timeoutHandle = setTimeout(() => { timedOut = true; }, remainingTime); // Set a new one
            }
          }
          const end = stepIdx + chunkSteps;
          for (; stepIdx < end; stepIdx++) {
            // Mirror the essential parts of terraforming.update():
            // 1) update luminosity/flux, 2) update surface temperatures, 3) advance resources
            terra.synchronizeGlobalResources();
            terra._updateZonalCoverageCache();
            terra.updateLuminosity();
            terra.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
            terra.updateResources(stepMs, {
              refreshStandaloneRates: true,
              ignoreSubstepping: true,
              skipTerraformingEffects: true,
              skipHazardUpdates: true
            });
            if (stepIdx < 5) {
              terra.setTemperatureValuesToTrend();
            }
            totalSimulatedMs += stepMs;
            if ((stepIdx + 1) % checkEvery === 0) {
              const snap = snapshotMetrics(terra);
              const small = deltaSmall(prevSnap, snap, absTol, relTol);
              const elapsedNow = Date.now() - startTime;
              stableCount = small ? (stableCount + 1) : 0;
              checksSinceInstabilityRefinement++;
              prevSnap = snap;
              if (stableCount >= 100) {
                if (refinementCount < 20) {
                  refinementCount++;
                  stepDays /= 2;
                  relTol /= 4;
                  stepMs = applyEquilibrationStep(1000 * stepDays);
                  lastUnstableCheckTime = elapsedNow;
                  checksSinceInstabilityRefinement = 0;
                  stableCount = 0; // Reset for next level of stability
                  console.log(`RWG_LOG: Stable for 100 steps. Reducing stepDays to ${stepDays}`);
                } else {
                  finalize(true);
                  return;
                }
              } else if (
                (
                  instabilityRefinementEveryChecks > 0
                    ? checksSinceInstabilityRefinement >= instabilityRefinementEveryChecks
                    : elapsedNow - lastUnstableCheckTime > instabilityRefinementIntervalMs
                )
                && stableCount < 100
                && stepMs > MIN_TERRAFORMING_SUBSTEP_MS
              ) {
                // Calibration can refine by a deterministic check count; UI runs use wall time.
                stepDays /= 2;
                stepMs = applyEquilibrationStep(1000 * stepDays);
                lastUnstableCheckTime = elapsedNow; // Reset the timer
                checksSinceInstabilityRefinement = 0;
                refinementsFromInstability++;
                console.log(`RWG_LOG: Unstable. Reducing stepDays to ${stepDays}`);
              }
              if (onProgress) {
                const inMinRun = elapsedNow < minRunMs;
                let progress = 0;
                let label = '';
                if (inMinRun) {
                  progress = Math.min(1, elapsedNow / minRunMs);
                  label = 'Minimum fast-forward (Game is paused)';
                } else {
                  const remainingTime = Math.max(0, additionalRunMs);
                  const elapsedInPhase = Math.max(0, elapsedNow - minRunMs);
                  progress = remainingTime > 0 ? Math.min(1, elapsedInPhase / remainingTime) : 1;
                  label = 'Additional fast-forward (Game is paused)';
                }
                onProgress(progress, {
                  step: stepIdx + 1,
                  stableCount,
                  label,
                  refinementsFromStability: refinementCount,
                  refinementsFromInstability,
                  simulatedMs: totalSimulatedMs
                });
              }
              if (maxSteps > 0 && stepIdx + 1 >= maxSteps) {
                finalize(true);
                return;
              }
              if (skipAdditionalFastForward && elapsedNow >= minRunMs) {
                finalize(true);
                return;
              }
            }
          }
          elapsed = Date.now() - startTime;
          if (options.sync) { loopChunk(); return; }
          setTimeout(loopChunk, 0);
        }

        if (options.sync) loopChunk(); else setTimeout(loopChunk, 0);
      } catch (e) {
        isEquilibrating = false;
        setStarLuminosity(prevLum);
        currentPlanetParameters = previousPlanetParameters;
        resources = previousResources;
        calculateZoneSolarFluxWithFacility = previousFacilityFunction;
        if (terra && previousResourceSubstepMs !== null && previousMaxResourceSubsteps !== null) {
          terra.resourceSubstepMilliseconds = previousResourceSubstepMs;
          terra.maxResourceSubsteps = previousMaxResourceSubsteps;
        }
        reject(e);
      }
    });
  }

  window.runEquilibration = runEquilibration;
})();



