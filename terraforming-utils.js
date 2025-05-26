// Utility functions for terraforming calculations

let ZONES;
var getZonePercentage;
let baseCalculateEvapSubl, baseCalculatePrecipFactor, baseCalculateMeltFreeze;

if (typeof module !== 'undefined' && module.exports) {
  ({ ZONES, getZonePercentage } = require('./zones.js'));
  const waterCycle = require('./water-cycle.js');
  baseCalculateEvapSubl = waterCycle.calculateEvaporationSublimationRates;
  baseCalculatePrecipFactor = waterCycle.calculatePrecipitationRateFactor;
  const hydrology = require('./hydrology.js');
  baseCalculateMeltFreeze = hydrology.calculateMeltingFreezingRates;
} else {
  ZONES = globalThis.ZONES;
  getZonePercentage = globalThis.getZonePercentage;
  baseCalculateEvapSubl = globalThis.calculateEvaporationSublimationRates;
  baseCalculatePrecipFactor = globalThis.calculatePrecipitationRateFactor;
  baseCalculateMeltFreeze = globalThis.calculateMeltingFreezingRates;
}

function calculateZonalCoverage(terraforming, zone, resourceType) {
  const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
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
  const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zone);
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
  const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zone);
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

