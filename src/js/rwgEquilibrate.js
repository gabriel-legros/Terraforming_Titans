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
    }
    return out;
  }

  function snapshotMetrics(sandboxResources) {
    const atmo = sandboxResources.atmospheric || {};
    const surf = sandboxResources.surface || {};
    function g(obj, k) { return obj[k] ? (obj[k].value || 0) : 0; }
    return [
      g(atmo,'carbonDioxide'), g(atmo,'inertGas'), g(atmo,'oxygen'), g(atmo,'atmosphericWater'), g(atmo,'atmosphericMethane'),
      g(surf,'ice'), g(surf,'liquidWater'), g(surf,'dryIce'), g(surf,'liquidMethane'), g(surf,'hydrocarbonIce')
    ];
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
   * options: { yearsMax, stepDays, checkEvery, absTol, relTol, chunkSteps, cancelToken, sync }
   * onProgress: fn(0..1, info)
   */
  function runEquilibration(override, options = {}, onProgress) {
    const yearsMax = options.yearsMax ?? 2000;
    const stepDays = options.stepDays ?? 365; // 1 step = 1 year
    const stepsMax = Math.ceil((yearsMax * 365) / stepDays);
    const checkEvery = options.checkEvery ?? 10;
    const absTol = options.absTol ?? 1e6; // tons
    const relTol = options.relTol ?? 1e-6; // relative
    const chunkSteps = options.chunkSteps ?? 20;
    const cancelToken = options.cancelToken;

    return new Promise((resolve, reject) => {
      try {
        const TF = TerraformingCtor || (typeof Terraforming === 'function' ? Terraforming : undefined);
        if (typeof TF !== 'function') {
          reject(new Error('Terraforming module unavailable'));
          return;
        }
        const fullParams = deepMerge(baseDefaultParams || (typeof defaultPlanetParameters !== 'undefined' ? defaultPlanetParameters : {}), override);
        const sandboxResources = buildSandboxResourcesFromOverride(fullParams.resources || {});

        // Guarded global swap-in (robust): track existence and previous values
        const hadCPP = ('currentPlanetParameters' in globalThis);
        const hadRes = ('resources' in globalThis);
        const prevCPP = hadCPP ? globalThis.currentPlanetParameters : undefined;
        const prevRes = hadRes ? globalThis.resources : undefined;
        Object.defineProperty(globalThis, 'currentPlanetParameters', { value: fullParams, configurable: true, writable: true });
        Object.defineProperty(globalThis, 'resources', { value: sandboxResources, configurable: true, writable: true });

        // Temporarily disable facility hooks that could contaminate equilibrium
        const prevFacilityFn = globalThis.calculateZoneSolarFluxWithFacility;
        globalThis.calculateZoneSolarFluxWithFacility = undefined;

        const terra = new TF(sandboxResources, fullParams.celestialParameters || {});
        terra.calculateInitialValues(fullParams);

        let stepIdx = 0;
        let stableCount = 0;
        let prevSnap = snapshotMetrics(sandboxResources);

        const stepMs = 1000 * stepDays; // 1 day per 1000 ms

        function finalize(ok) {
          // Restore globals without leaking sandbox
          if (!hadCPP) {
            try { delete globalThis.currentPlanetParameters; } catch(_) { globalThis.currentPlanetParameters = prevCPP; }
          } else {
            globalThis.currentPlanetParameters = prevCPP;
          }
          if (!hadRes) {
            try { delete globalThis.resources; } catch(_) { globalThis.resources = prevRes; }
          } else {
            globalThis.resources = prevRes;
          }
          globalThis.calculateZoneSolarFluxWithFacility = prevFacilityFn;
          if (!ok) return;
          const outOverride = copyBackToOverrideFromSandbox(override, sandboxResources, terra);
          resolve({ override: outOverride, steps: stepIdx });
        }

        function loopChunk() {
          if (cancelToken && cancelToken.cancelled) { finalize(false); reject(new Error('cancelled')); return; }
          const end = Math.min(stepIdx + chunkSteps, stepsMax);
          for (; stepIdx < end; stepIdx++) {
            // Mirror the essential parts of terraforming.update():
            // 1) update luminosity/flux, 2) update surface temperatures, 3) advance resources
            if (typeof terra.updateLuminosity === 'function') terra.updateLuminosity();
            if (typeof terra.updateSurfaceTemperature === 'function') terra.updateSurfaceTemperature();
            terra.updateResources(stepMs);
            if ((stepIdx + 1) % checkEvery === 0) {
              const snap = snapshotMetrics(sandboxResources);
              const small = deltaSmall(prevSnap, snap, absTol, relTol);
              stableCount = small ? (stableCount + 1) : 0;
              prevSnap = snap;
              if (onProgress) onProgress(Math.min(1, (stepIdx + 1) / stepsMax), { step: stepIdx + 1, stableCount });
              if (stableCount >= 5) { finalize(true); return; }
            }
          }
          if (stepIdx >= stepsMax) { finalize(true); return; }
          if (options.sync) { loopChunk(); return; }
          setTimeout(loopChunk, 0);
        }

        if (options.sync) loopChunk(); else setTimeout(loopChunk, 0);
      } catch (e) {
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


