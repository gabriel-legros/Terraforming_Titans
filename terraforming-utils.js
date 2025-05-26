// Utility functions for terraforming calculations

let baseCalculateEvapSubl, baseCalculatePrecipFactor, baseCalculateMeltFreeze;

  baseCalculateEvapSubl = calculateEvaporationSublimationRates;
  baseCalculatePrecipFactor = calculatePrecipitationRateFactor;
  baseCalculateMeltFreeze = calculateMeltingFreezingRates;

function resolveSurfaceArea(terraforming) {
  if (!terraforming || !terraforming.celestialParameters) return 0;
  const params = terraforming.celestialParameters;
  if (!params.surfaceArea) {
    if (typeof params.radius === 'number') {
      params.surfaceArea = 4 * Math.PI * Math.pow(params.radius * 1000, 2);
    } else {
      return 0;
    }
  }
  return params.surfaceArea;
}

function calculateZonalCoverage(terraforming, zone, resourceType) {
  const totalSurfaceArea = resolveSurfaceArea(terraforming);
  const zoneArea = totalSurfaceArea * getZonePercentage(zone);
  if (zoneArea <= 0) return 0;

  let zonalAmount = 0;
  if (resourceType === 'liquidWater') {
    zonalAmount = terraforming.zonalWater[zone]?.liquid || 0;
  } else if (resourceType === 'ice') {
    zonalAmount = terraforming.zonalWater[zone]?.ice || 0;
  } else if (resourceType === 'biomass') {
    zonalAmount = terraforming.zonalSurface[zone]?.biomass || 0;
  } else if (resourceType === 'dryIce') {
    zonalAmount = terraforming.zonalSurface[zone]?.dryIce || 0;
  } else {
    console.warn(`calculateZonalCoverage called with invalid resourceType: ${resourceType}`);
    return 0;
  }

  let resourceRatio = 0.00005 * zonalAmount / zoneArea;
  if (resourceType === 'dryIce') {
    resourceRatio *= 100;
  } else if (resourceType === 'biomass') {
    resourceRatio *= 1000;
  }

  let coverage;
  if (resourceRatio <= 0) {
    coverage = 0;
  } else if (resourceRatio <= 0.001) {
    coverage = 10 * resourceRatio;
    coverage = Math.max(coverage, 0.00001);
  } else if (resourceRatio < 1) {
    coverage = 0.143317 * Math.log(resourceRatio) + 1;
    const linearEndCoverage = 10 * 0.001;
    coverage = Math.max(linearEndCoverage, Math.min(coverage, 1.0));
  } else {
    coverage = 1;
  }
  return Math.max(0, Math.min(coverage, 1.0));
}

function calculateAverageCoverage(terraforming, resourceType) {
  let weightedAverageCoverage = 0;
  for (const zone of ZONES) {
    const cov = calculateZonalCoverage(terraforming, zone, resourceType);
    const zonePct = getZonePercentage(zone);
    weightedAverageCoverage += cov * zonePct;
  }
  return Math.max(0, Math.min(weightedAverageCoverage, 1.0));
}

function calculateEvaporationSublimationRates(terraforming, zone, dayTemp, nightTemp, waterVaporPressure, co2VaporPressure, avgAtmPressure, zonalSolarFlux) {
  const zoneArea = resolveSurfaceArea(terraforming) * getZonePercentage(zone);
  const liquidWaterCoverage = calculateZonalCoverage(terraforming, zone, 'liquidWater');
  const iceCoverage = calculateZonalCoverage(terraforming, zone, 'ice');
  const dryIceCoverage = calculateZonalCoverage(terraforming, zone, 'dryIce');
  return baseCalculateEvapSubl({
    zoneArea,
    liquidWaterCoverage,
    iceCoverage,
    dryIceCoverage,
    dayTemperature: dayTemp,
    nightTemperature: nightTemp,
    waterVaporPressure,
    co2VaporPressure,
    avgAtmPressure,
    zonalSolarFlux
  });
}

function calculatePrecipitationRateFactor(terraforming, zone, waterVaporPressure, gravity, dayTemp, nightTemp) {
  const zoneArea = resolveSurfaceArea(terraforming) * getZonePercentage(zone);
  return baseCalculatePrecipFactor({
    zoneArea,
    waterVaporPressure,
    gravity,
    dayTemperature: dayTemp,
    nightTemperature: nightTemp
  });
}

function calculateMeltingFreezingRates(terraforming, zone, temperature) {
  const availableIce = terraforming.zonalWater[zone].ice || 0;
  const availableLiquid = terraforming.zonalWater[zone].liquid || 0;
  return baseCalculateMeltFreeze(temperature, availableIce, availableLiquid);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAverageCoverage,
    calculateZonalCoverage,
    calculateEvaporationSublimationRates,
    calculatePrecipitationRateFactor,
    calculateMeltingFreezingRates
  };
}

