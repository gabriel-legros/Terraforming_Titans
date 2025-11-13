(function() {
  function clamp01(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    if (value <= 0) {
      return 0;
    }
    if (value >= 1) {
      return 1;
    }
    return value;
  }

  function buildHazardEquilibrationContext(override, terra) {
    if (!override) {
      return null;
    }

    const context = {};

    if (terra && terra.temperature && Number.isFinite(terra.temperature.value)) {
      context.meanTemperatureK = terra.temperature.value;
    } else if (override.finalTemps && Number.isFinite(override.finalTemps.mean)) {
      context.meanTemperatureK = override.finalTemps.mean;
    } else if (override.celestialParameters
      && override.celestialParameters.temperature
      && Number.isFinite(override.celestialParameters.temperature.mean)) {
      context.meanTemperatureK = override.celestialParameters.temperature.mean;
    } else if (override.classification && Number.isFinite(override.classification.TeqK)) {
      context.meanTemperatureK = override.classification.TeqK;
    }

    let gravity;
    if (override.celestialParameters && Number.isFinite(override.celestialParameters.gravity)) {
      gravity = override.celestialParameters.gravity;
    } else if (terra && terra.celestialParameters && Number.isFinite(terra.celestialParameters.gravity)) {
      gravity = terra.celestialParameters.gravity;
    }

    let radius;
    if (override.celestialParameters && Number.isFinite(override.celestialParameters.radius)) {
      radius = override.celestialParameters.radius;
    } else if (terra && terra.celestialParameters && Number.isFinite(terra.celestialParameters.radius)) {
      radius = terra.celestialParameters.radius;
    }

    let totalMassKg;
    let co2Fraction;
    if (terra && typeof terra.calculateAtmosphericComposition === 'function') {
      const compositionInfo = terra.calculateAtmosphericComposition();
      if (compositionInfo) {
        if (Number.isFinite(compositionInfo.totalMass) && compositionInfo.totalMass > 0) {
          totalMassKg = compositionInfo.totalMass;
        }
        if (compositionInfo.composition && Number.isFinite(compositionInfo.composition.co2)) {
          co2Fraction = compositionInfo.composition.co2;
        }
      }
    }

    const atmosphericResources = override.resources && override.resources.atmospheric
      ? override.resources.atmospheric
      : null;
    if ((!Number.isFinite(totalMassKg) || totalMassKg <= 0 || !Number.isFinite(co2Fraction)) && atmosphericResources) {
      let totalTons = 0;
      let co2Tons = 0;
      for (const key of Object.keys(atmosphericResources)) {
        const entry = atmosphericResources[key];
        const value = entry && Number.isFinite(entry.initialValue) ? entry.initialValue : 0;
        if (value > 0) {
          totalTons += value;
          if (key === 'carbonDioxide') {
            co2Tons += value;
          }
        }
      }
      if ((!Number.isFinite(totalMassKg) || totalMassKg <= 0) && totalTons > 0) {
        totalMassKg = totalTons * 1000;
      }
      if (!Number.isFinite(co2Fraction) && totalTons > 0) {
        co2Fraction = co2Tons / totalTons;
      }
    }

    if (Number.isFinite(totalMassKg)
      && totalMassKg > 0
      && Number.isFinite(gravity)
      && gravity > 0
      && Number.isFinite(radius)
      && radius > 0
      && typeof calculateAtmosphericPressure === 'function') {
      const pressurePa = calculateAtmosphericPressure(totalMassKg / 1000, gravity, radius);
      if (Number.isFinite(pressurePa) && pressurePa >= 0) {
        context.surfacePressureKPa = pressurePa / 1000;
      }
    }

    if ((!Number.isFinite(context.surfacePressureKPa))
      && override.celestialParameters
      && Number.isFinite(override.celestialParameters.surfacePressureKPa)) {
      context.surfacePressureKPa = override.celestialParameters.surfacePressureKPa;
    }

    if (Number.isFinite(context.surfacePressureKPa) && Number.isFinite(co2Fraction)) {
      const clampedFraction = Math.max(0, Math.min(1, co2Fraction));
      context.co2PressureKPa = context.surfacePressureKPa * clampedFraction;
    }

    let surfaceArea = 0;
    if (override.celestialParameters && Number.isFinite(override.celestialParameters.surfaceArea)) {
      surfaceArea = override.celestialParameters.surfaceArea;
    } else if (terra && terra.celestialParameters && Number.isFinite(terra.celestialParameters.surfaceArea)) {
      surfaceArea = terra.celestialParameters.surfaceArea;
    }

    const zonalCoverage = (terra && terra.zonalCoverageCache) || override.zonalCoverageCache || null;
    if (zonalCoverage) {
      let liquidArea = 0;
      let totalArea = 0;
      for (const zone of ZONE_KEYS) {
        const zoneData = zonalCoverage[zone] || {};
        let zoneArea = Number.isFinite(zoneData.zoneArea) ? zoneData.zoneArea : 0;
        if (zoneArea <= 0 && surfaceArea > 0) {
          let weight = 1 / ZONE_KEYS.length;
          if (typeof getZonePercentage === 'function') {
            const percentage = getZonePercentage(zone);
            if (Number.isFinite(percentage) && percentage > 0) {
              weight = percentage;
            }
          }
          zoneArea = surfaceArea * weight;
        }
        if (zoneArea <= 0) {
          continue;
        }
        totalArea += zoneArea;
        const liquidWater = clamp01(zoneData.liquidWater || 0);
        const liquidMethane = clamp01(zoneData.liquidMethane || 0);
        const liquidCO2 = clamp01(zoneData.liquidCO2 || 0);
        const coverage = Math.max(0, Math.min(1, liquidWater + liquidMethane + liquidCO2));
        liquidArea += coverage * zoneArea;
      }
      if (totalArea > 0) {
        context.isLiquidWorld = (liquidArea / totalArea) > 0.5;
      }
    }

    return context;
  }

  const ZONE_KEYS = ['tropical', 'temperate', 'polar'];

  let tuneHazardousBiomassForWorldFn = typeof tuneHazardousBiomassForWorld === 'function'
    ? tuneHazardousBiomassForWorld
    : null;
  if (!tuneHazardousBiomassForWorldFn && typeof module !== 'undefined' && module.exports) {
    try {
      const rwgModule = require('./rwg.js');
      if (rwgModule && typeof rwgModule.tuneHazardousBiomassForWorld === 'function') {
        tuneHazardousBiomassForWorldFn = rwgModule.tuneHazardousBiomassForWorld;
      }
    } catch (_) {}
  }

  let HazardManagerCtor = typeof HazardManager === 'function'
    ? HazardManager
    : null;
  if (!HazardManagerCtor && typeof module !== 'undefined' && module.exports) {
    try {
      const hazardModule = require('../terraforming/hazard.js');
      HazardManagerCtor = hazardModule && hazardModule.HazardManager ? hazardModule.HazardManager : HazardManagerCtor;
    } catch (_) {}
  }

  function applyPostEquilibrationHazardTuning(override, terra) {
    if (!override || !override.hazards || !override.hazards.hazardousBiomass) {
      return;
    }
    if (!tuneHazardousBiomassForWorldFn) {
      return;
    }
    const context = buildHazardEquilibrationContext(override, terra);
    if (!context) {
      return;
    }
    tuneHazardousBiomassForWorldFn({ hazards: override.hazards }, context);

    const hazardous = override.hazards.hazardousBiomass;
    const hazardManagerInstance = HazardManagerCtor ? new HazardManagerCtor() : null;
    const penaltyDetails = hazardManagerInstance
      ? hazardManagerInstance.calculateHazardousBiomassGrowthPenaltyDetails(hazardous, terra)
      : { globalPenalty: 0, zonePenalties: {} };

    const zoneSurface = override.zonalSurface || (override.zonalSurface = {});
    const zoneKeysSource = [];
    if (terra && terra.zonalSurface) {
      zoneKeysSource.push(...Object.keys(terra.zonalSurface));
    }
    zoneKeysSource.push(...Object.keys(zoneSurface));
    if (!zoneKeysSource.length) {
      zoneKeysSource.push(...ZONE_KEYS);
    }
    const zoneKeys = Array.from(new Set(zoneKeysSource));
    const zoneCount = zoneKeys.length || 1;

    const landCandidates = [
      terra ? terra.initialLand : null,
      override.resources && override.resources.surface && override.resources.surface.land
        ? override.resources.surface.land.initialValue
        : null,
    ];
    let landArea = 0;
    for (let index = 0; index < landCandidates.length; index += 1) {
      const candidate = landCandidates[index];
      if (Number.isFinite(candidate) && candidate > 0) {
        landArea = candidate;
        break;
      }
    }

    const surfaceAreaCandidate = terra && terra.celestialParameters
      ? terra.celestialParameters.surfaceArea
      : null;
    const surfaceArea = Number.isFinite(surfaceAreaCandidate) && surfaceAreaCandidate > 0
      ? surfaceAreaCandidate
      : 0;
    const getZonePercentageFn = globalThis.getZonePercentage || null;

    const resolveZoneArea = (zone) => {
      const cacheEntry = terra && terra.zonalCoverageCache ? terra.zonalCoverageCache[zone] : null;
      const cachedArea = cacheEntry && Number.isFinite(cacheEntry.zoneArea) ? cacheEntry.zoneArea : 0;
      if (cachedArea > 0) {
        return cachedArea;
      }

      if (landArea > 0) {
        if (getZonePercentageFn) {
          const percentage = getZonePercentageFn(zone);
          if (Number.isFinite(percentage) && percentage > 0) {
            return landArea * percentage;
          }
        }
        return landArea / zoneCount;
      }

      if (surfaceArea > 0) {
        if (getZonePercentageFn) {
          const percentage = getZonePercentageFn(zone);
          if (Number.isFinite(percentage) && percentage > 0) {
            return surfaceArea * percentage;
          }
        }
        return surfaceArea / zoneCount;
      }

      return 0;
    };

    const baseGrowth = hazardous.baseGrowth || {};
    const baseGrowthPercent = Number.isFinite(baseGrowth.value) ? baseGrowth.value : 0;
    const maxDensity = Number.isFinite(baseGrowth.maxDensity) && baseGrowth.maxDensity > 0
      ? baseGrowth.maxDensity
      : 0;

    const globalPenalty = Number.isFinite(penaltyDetails.globalPenalty) ? penaltyDetails.globalPenalty : 0;
    const zonePenaltyMap = penaltyDetails.zonePenalties || {};

    let totalBiomass = 0;
    for (let index = 0; index < zoneKeys.length; index += 1) {
      const zone = zoneKeys[index];
      const zoneOutput = zoneSurface[zone] || (zoneSurface[zone] = {});
      const zonePenalty = Number.isFinite(zonePenaltyMap[zone]) ? zonePenaltyMap[zone] : 0;
      const zoneGrowthPercent = baseGrowthPercent - globalPenalty - zonePenalty;
      const zoneArea = resolveZoneArea(zone);
      const hasPositiveGrowth = zoneGrowthPercent > 0 && zoneArea > 0 && maxDensity > 0;
      const zoneBiomass = hasPositiveGrowth ? zoneArea / 10000 * maxDensity : 0;

      zoneOutput.hazardousBiomass = zoneBiomass;
      if (terra && terra.zonalSurface && terra.zonalSurface[zone]) {
        terra.zonalSurface[zone].hazardousBiomass = zoneBiomass;
      }

      totalBiomass += zoneBiomass;
    }

    override.resources = override.resources || {};
    override.resources.surface = override.resources.surface || {};
    const hazardousResource = override.resources.surface.hazardousBiomass
      || (override.resources.surface.hazardousBiomass = {});
    hazardousResource.initialValue = totalBiomass;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { clamp01, buildHazardEquilibrationContext, applyPostEquilibrationHazardTuning };
  } else {
    globalThis.clamp01 = clamp01;
    globalThis.buildHazardEquilibrationContext = buildHazardEquilibrationContext;
    globalThis.applyPostEquilibrationHazardTuning = applyPostEquilibrationHazardTuning;
  }
})();