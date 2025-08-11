// RWG Equilibration: isolate terraforming simulation and fast-forward to a steady state
(function() {
  // Node compatibility: import Terraforming and default parameters if available
  let TerraformingCtor = (typeof Terraforming === 'function') ? Terraforming : undefined;
  let baseDefaultParams = (typeof defaultPlanetParameters !== 'undefined') ? defaultPlanetParameters : undefined;
  if (typeof module !== 'undefined' && module.exports) {
    try {
      // Ensure EffectableEntity exists for Terraforming class extension
      if (typeof globalThis.EffectableEntity === 'undefined') {
        try { globalThis.EffectableEntity = require('./effectable-entity.js'); } catch (_) {}
      }
      // Provide life parameters expected by terraforming
      if (typeof globalThis.lifeParameters === 'undefined') {
        try { globalThis.lifeParameters = require('./life-parameters.js'); } catch (_) {}
      }
      // Zones helpers required by terraforming calculations
      if (typeof globalThis.getZonePercentage === 'undefined') {
        try {
          const zones = require('./zones.js');
          globalThis.getZonePercentage = zones.getZonePercentage;
          if (typeof globalThis.getZoneRatio === 'undefined') globalThis.getZoneRatio = zones.getZoneRatio;
          if (typeof globalThis.ZONES === 'undefined') globalThis.ZONES = zones.ZONES;
        } catch (_) {}
      }
      // Physics helpers used by terraforming
      try {
        const physics = require('./physics.js');
        if (typeof globalThis.calculateEmissivity === 'undefined') globalThis.calculateEmissivity = physics.calculateEmissivity;
        if (typeof globalThis.calculateAtmosphericPressure === 'undefined') globalThis.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
        if (typeof globalThis.dayNightTemperaturesModel === 'undefined') globalThis.dayNightTemperaturesModel = physics.dayNightTemperaturesModel;
        if (typeof globalThis.effectiveTemp === 'undefined') globalThis.effectiveTemp = physics.effectiveTemp;
        if (typeof globalThis.calculateActualAlbedoPhysics === 'undefined') globalThis.calculateActualAlbedoPhysics = physics.calculateActualAlbedoPhysics || globalThis.calculateActualAlbedoPhysics;
        if (typeof globalThis.surfaceAlbedoMix === 'undefined') globalThis.surfaceAlbedoMix = physics.surfaceAlbedoMix || globalThis.surfaceAlbedoMix;
        if (typeof globalThis.cloudFraction === 'undefined') globalThis.cloudFraction = physics.cloudFraction || globalThis.cloudFraction;
      } catch (_) {}

      // Phase-change utils expect some constants defined in terraforming
      if (typeof globalThis.C_P_AIR === 'undefined') globalThis.C_P_AIR = 1004;
      if (typeof globalThis.EPSILON === 'undefined') globalThis.EPSILON = 0.622;

      // Ensure dry-ice and water cycle globals are available
      try {
        const dryIce = require('./dry-ice-cycle.js');
        if (typeof globalThis.sublimationRateCO2 === 'undefined') globalThis.sublimationRateCO2 = dryIce.sublimationRateCO2 || globalThis.sublimationRateCO2;
        if (typeof globalThis.rapidSublimationRateCO2 === 'undefined') globalThis.rapidSublimationRateCO2 = dryIce.rapidSublimationRateCO2 || globalThis.rapidSublimationRateCO2;
        if (typeof globalThis.calculateCO2CondensationRateFactor === 'undefined') globalThis.calculateCO2CondensationRateFactor = dryIce.calculateCO2CondensationRateFactor || globalThis.calculateCO2CondensationRateFactor;
      } catch (_) {}
      try {
        const water = require('./water-cycle.js');
        if (typeof globalThis.sublimationRateWater === 'undefined') globalThis.sublimationRateWater = water.sublimationRateWater || globalThis.sublimationRateWater;
        if (typeof globalThis.evaporationRateWater === 'undefined') globalThis.evaporationRateWater = water.evaporationRateWater || globalThis.evaporationRateWater;
        if (typeof globalThis.calculateEvaporationSublimationRates === 'undefined') globalThis.calculateEvaporationSublimationRates = water.calculateEvaporationSublimationRates || globalThis.calculateEvaporationSublimationRates;
        if (typeof globalThis.calculatePrecipitationRateFactor === 'undefined') globalThis.calculatePrecipitationRateFactor = water.calculatePrecipitationRateFactor || globalThis.calculatePrecipitationRateFactor;
      } catch (_) {}
      // Hydrology functions for surface flow
      try {
        const hydrology = require('./hydrology.js');
        if (typeof globalThis.simulateSurfaceWaterFlow === 'undefined') globalThis.simulateSurfaceWaterFlow = hydrology.simulateSurfaceWaterFlow;
        if (typeof globalThis.simulateSurfaceHydrocarbonFlow === 'undefined') globalThis.simulateSurfaceHydrocarbonFlow = hydrology.simulateSurfaceHydrocarbonFlow;
      } catch (_) {}
      // Require Terraforming after priming globals
      const TF = require('./terraforming.js');
      TerraformingCtor = TF && TF.default ? TF.default : TF;
    } catch (_) {}
    try {
      const PP = require('./planet-parameters.js');
      baseDefaultParams = PP && PP.defaultPlanetParameters ? PP.defaultPlanetParameters : baseDefaultParams;
    } catch (_) {}
  }
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

  function buildSandboxResourcesFromOverride(overrideResources) {
    const res = {};
    for (const cat of Object.keys(overrideResources)) {
      res[cat] = {};
      const bucket = overrideResources[cat];
      for (const key of Object.keys(bucket)) {
        const entry = bucket[key] || {};
        const initialValue = entry.initialValue || 0;
        res[cat][key] = {
          value: initialValue,
          modifyRate: function() {},
        };
      }
    }
    return res;
  }

  function copyBackToOverrideFromSandbox(override, sandboxResources, terra) {
    const out = JSON.parse(JSON.stringify(override));
    // Write atmospheric and surface resources back into override
    const atmoKeys = ['carbonDioxide','inertGas','oxygen','atmosphericWater','atmosphericMethane'];
    out.resources = out.resources || {};
    out.resources.atmospheric = out.resources.atmospheric || {};
    atmoKeys.forEach(k => {
      const v = sandboxResources.atmospheric && sandboxResources.atmospheric[k] ? sandboxResources.atmospheric[k].value || 0 : 0;
      out.resources.atmospheric[k] = out.resources.atmospheric[k] || {}; out.resources.atmospheric[k].initialValue = v;
    });
    const surfKeys = ['ice','liquidWater','dryIce','liquidMethane','hydrocarbonIce'];
    out.resources.surface = out.resources.surface || {};
    surfKeys.forEach(k => {
      const v = sandboxResources.surface && sandboxResources.surface[k] ? sandboxResources.surface[k].value || 0 : 0;
      out.resources.surface[k] = out.resources.surface[k] || {}; out.resources.surface[k].initialValue = v;
    });
    // Zonal structures copied from terraforming instance
    if (terra) {
      out.zonalWater = JSON.parse(JSON.stringify(terra.zonalWater || {}));
      out.zonalHydrocarbons = JSON.parse(JSON.stringify(terra.zonalHydrocarbons || {}));
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

      if (terra.temperature && terra.temperature.zones && typeof getZoneRatio === 'function') {
        const z = terra.temperature.zones;
        const ratios = {
          tropical: getZoneRatio('tropical'),
          temperate: getZoneRatio('temperate'),
          polar: getZoneRatio('polar')
        };
        const day = z.tropical.day * ratios.tropical + z.temperate.day * ratios.temperate + z.polar.day * ratios.polar;
        const night = z.tropical.night * ratios.tropical + z.temperate.night * ratios.temperate + z.polar.night * ratios.polar;
        out.finalTemps = { mean: terra.temperature.value, day, night };
      }
    }
    return out;
  }

  function snapshotMetrics(terra) {
    const atmo = terra.resources.atmospheric || {};
    const surf = terra.resources.surface || {};
    function g(obj, k) { return obj[k] ? (obj[k].value || 0) : 0; }
    const metrics = [
      g(atmo,'carbonDioxide'), g(atmo,'inertGas'), g(atmo,'oxygen'), g(atmo,'atmosphericWater'), g(atmo,'atmosphericMethane'),
      g(surf,'ice'), g(surf,'liquidWater'), g(surf,'dryIce'), g(surf,'liquidMethane'), g(surf,'hydrocarbonIce')
    ];
    const zones = ['tropical', 'temperate', 'polar'];
    for (const zone of zones) {
       const zw = terra.zonalWater[zone] || {};
       const zs = terra.zonalSurface[zone] || {};
       const zh = terra.zonalHydrocarbons[zone] || {};
       metrics.push(zw.liquid || 0, zw.ice || 0, zw.buriedIce || 0);
       metrics.push(zs.dryIce || 0, zs.biomass || 0);
       metrics.push(zh.liquid || 0, zh.ice || 0, zh.buriedIce || 0);
    }
    return metrics;
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
    let additionalRunMs = options.additionalRunMs ?? 60000;
    let timeoutMs = options.timeoutMs ?? (minRunMs + additionalRunMs);

    return new Promise((resolve, reject) => {
      const prevLum = typeof getStarLuminosity === 'function' ? getStarLuminosity() : 1;
      if (typeof setStarLuminosity === 'function') {
        setStarLuminosity(options.star?.luminositySolar || 1);
      }
      try {
        const TF = TerraformingCtor || (typeof Terraforming === 'function' ? Terraforming : undefined);
        if (typeof TF !== 'function') {
          reject(new Error('Terraforming module unavailable'));
          return;
        }
        const sandboxResources = buildSandboxResourcesFromOverride(fullParams.resources || {});

        // Guarded global swap-in (robust): track previous descriptors
        const cppDesc = Object.getOwnPropertyDescriptor(globalThis, 'currentPlanetParameters');
        const resDesc = Object.getOwnPropertyDescriptor(globalThis, 'resources');
        Object.defineProperty(globalThis, 'currentPlanetParameters', { value: fullParams, configurable: true, writable: true });
        Object.defineProperty(globalThis, 'resources', { value: sandboxResources, configurable: true, writable: true });

        // Temporarily disable facility hooks that could contaminate equilibrium
        const prevFacilityFn = globalThis.calculateZoneSolarFluxWithFacility;
        globalThis.calculateZoneSolarFluxWithFacility = undefined;

        const terra = new TF(sandboxResources, fullParams.celestialParameters || {});
        if (typeof terra.calculateInitialValues === 'function') {
          terra.calculateInitialValues(fullParams);
        }

        let stepIdx = 0;
        let stableCount = 0;
        let prevSnap = snapshotMetrics(terra);
        let refinementCount = 0;
        let refinementsFromInstability = 0;
        let lastUnstableCheckTime = 0;
        let totalSimulatedMs = 0;

        let stepMs = 1000 * stepDays; // 1 day per 1000 ms
        let timedOut = false;
        let timeoutHandle = setTimeout(() => { timedOut = true; }, timeoutMs);
        const startTime = Date.now();

        function finalize(ok) {
          terra._updateZonalCoverageCache();
          terra.updateLuminosity();
          terra.updateSurfaceTemperature();
          terra.synchronizeGlobalResources();
          clearTimeout(timeoutHandle);
          if (typeof setStarLuminosity === 'function') {
            setStarLuminosity(prevLum);
          }
          // Restore globals without leaking sandbox
          if (cppDesc) {
            Object.defineProperty(globalThis, 'currentPlanetParameters', cppDesc);
          } else {
            delete globalThis.currentPlanetParameters;
          }
          if (resDesc) {
            Object.defineProperty(globalThis, 'resources', resDesc);
          } else {
            delete globalThis.resources;
          }
          globalThis.calculateZoneSolarFluxWithFacility = prevFacilityFn;
          if (!ok) return;
          const outOverride = copyBackToOverrideFromSandbox(fullParams, sandboxResources, terra);
          console.log('Equilibration finished. Final terraforming object:', terra);
          resolve({ override: outOverride, steps: stepIdx });
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
            if (typeof terra.updateLuminosity === 'function') terra.updateLuminosity();
            if (typeof terra.updateSurfaceTemperature === 'function') terra.updateSurfaceTemperature();
            const noisyStepMs = stepMs * (0.95 + Math.random() * 0.1);
            if (typeof terra.flowMeltAmount === 'number' && typeof globalThis.simulateSurfaceWaterFlow === 'function') {
               const tempMap = {};
               for (const z of ['tropical', 'temperate', 'polar']) { tempMap[z] = terra.temperature.zones[z].value; }
               terra.flowMeltAmount = globalThis.simulateSurfaceWaterFlow(terra, noisyStepMs, tempMap);
            }
            if (typeof terra.flowMethaneMeltAmount === 'number' && typeof globalThis.simulateSurfaceHydrocarbonFlow === 'function') {
               const tempMap = {};
               for (const z of ['tropical', 'temperate', 'polar']) { tempMap[z] = terra.temperature.zones[z].value; }
               terra.flowMethaneMeltAmount = globalThis.simulateSurfaceHydrocarbonFlow(terra, noisyStepMs, tempMap);
            }
            terra.updateResources(noisyStepMs);
            totalSimulatedMs += noisyStepMs;
            if ((stepIdx + 1) % checkEvery === 0) {
              const snap = snapshotMetrics(terra);
              const small = deltaSmall(prevSnap, snap, absTol, relTol);
              const elapsedNow = Date.now() - startTime;
              stableCount = small ? (stableCount + 1) : 0;
              if (small) lastUnstableCheckTime = elapsedNow;
              prevSnap = snap;
              if (stableCount >= 100) {
                if (refinementCount < 20) {
                  refinementCount++;
                  stepDays /= 2;
                  relTol /= 4;
                  stepMs = 1000 * stepDays;
                  stableCount = 0; // Reset for next level of stability
                  console.log(`RWG_LOG: Stable for 100 steps. Reducing stepDays to ${stepDays}`);
                } else {
                  finalize(true);
                  return;
                }
              } else if (elapsedNow - lastUnstableCheckTime > 10000 && stableCount < 100) {
                // Alternative refinement: If it's been 10s since the last unstable check
                // and we're still not stable, reduce the time step.
                stepDays /= 2;
                stepMs = 1000 * stepDays;
                lastUnstableCheckTime = elapsedNow; // Reset the timer
                refinementsFromInstability++;
                console.log(`RWG_LOG: Unstable for 10s. Reducing stepDays to ${stepDays}`);
              }
              if (onProgress) {
                const inMinRun = elapsedNow < minRunMs;
                let progress = 0;
                let label = '';
                if (inMinRun) {
                  progress = Math.min(1, elapsedNow / minRunMs);
                  label = 'Minimum fast-forward';
                } else {
                  const remainingTime = Math.max(0, additionalRunMs);
                  const elapsedInPhase = Math.max(0, elapsedNow - minRunMs);
                  progress = remainingTime > 0 ? Math.min(1, elapsedInPhase / remainingTime) : 1;
                  label = 'Additional fast-forward';
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
            }
          }
          elapsed = Date.now() - startTime;
          if (options.sync) { loopChunk(); return; }
          setTimeout(loopChunk, 0);
        }

        if (options.sync) loopChunk(); else setTimeout(loopChunk, 0);
      } catch (e) {
        if (typeof setStarLuminosity === 'function') {
          setStarLuminosity(prevLum);
        }
        reject(e);
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runEquilibration, buildSandboxResourcesFromOverride };
  } else {
    globalThis.runEquilibration = runEquilibration;
  }
})();


