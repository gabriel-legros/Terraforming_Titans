// Utility functions for terraforming calculations

const isNode = (typeof module !== 'undefined' && module.exports);
var ZONES_NODE, getZonePercentageNode, estimateCoverageFn;
var baseCalculateEvapSubl, baseCalculatePrecipFactor, baseCalculateMeltFreeze;

if (isNode) {
  const zonesMod = require('./zones.js');
  ZONES_NODE = zonesMod.ZONES;
  getZonePercentageNode = zonesMod.getZonePercentage;
  estimateCoverageFn = zonesMod.estimateCoverage;
  const waterCycle = require('./water-cycle.js');
  baseCalculateEvapSubl = waterCycle.calculateEvaporationSublimationRates;
  baseCalculatePrecipFactor = waterCycle.calculatePrecipitationRateFactor;
  const hydrology = require('./hydrology.js');
  baseCalculateMeltFreeze = hydrology.calculateMeltingFreezingRates;
} else {
  baseCalculateEvapSubl = globalThis.calculateEvaporationSublimationRates;
  baseCalculatePrecipFactor = globalThis.calculatePrecipitationRateFactor;
  // capture the base implementation from hydrology before defining our wrapper
  baseCalculateMeltFreeze = globalThis.calculateMeltingFreezingRates;
  estimateCoverageFn = globalThis.estimateCoverage;
}

function getZones() {
  return isNode ? ZONES_NODE : globalThis.ZONES;
}

function zonePercentage(zone) {
  return isNode ? getZonePercentageNode(zone) : globalThis.getZonePercentage(zone);
}

function calculateZonalCoverage(terraforming, zone, resourceType) {
  const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
  const zoneArea = totalSurfaceArea * zonePercentage(zone);
  if (zoneArea <= 0) return 0;

  let zonalAmount = 0;
  if (resourceType === 'liquidWater') {
    zonalAmount = terraforming.zonalWater[zone]?.liquid || 0;
  } else if (resourceType === 'ice') {
    zonalAmount = terraforming.zonalWater[zone]?.ice || 0; // exclude buried ice from coverage
  } else if (resourceType === 'buriedIce') {
    zonalAmount = terraforming.zonalWater[zone]?.buriedIce || 0;
  } else if (resourceType === 'biomass') {
    zonalAmount = terraforming.zonalSurface[zone]?.biomass || 0;
  } else if (resourceType === 'dryIce') {
    zonalAmount = terraforming.zonalSurface[zone]?.dryIce || 0;
  } else if (resourceType === 'liquidMethane') {
    zonalAmount = terraforming.zonalHydrocarbons[zone]?.liquid || 0;
  } else if (resourceType === 'hydrocarbonIce') {
    zonalAmount = terraforming.zonalHydrocarbons[zone]?.ice || 0;
  } else {
    console.warn(`calculateZonalCoverage called with invalid resourceType: ${resourceType}`);
    return 0;
  }

  let scale = 0.0001;
  if (resourceType === 'dryIce' || resourceType === 'ice' || resourceType === 'hydrocarbonIce') {
    scale *= 100;
  } else if (resourceType === 'biomass') {
    scale *= 1000;
  }

  return estimateCoverageFn(zonalAmount, zoneArea, scale);
}

function calculateAverageCoverage(terraforming, resourceType) {
  let weightedAverageCoverage = 0;
  for (const zone of getZones()) {
    const cov = calculateZonalCoverage(terraforming, zone, resourceType);
    const zonePct = zonePercentage(zone);
    weightedAverageCoverage += cov * zonePct;
  }
  return Math.max(0, Math.min(weightedAverageCoverage, 1.0));
}

// Derive surface fractions for albedo calculations. Biomass always claims its
// full portion of the surface. Water and ice then divide whatever area remains
// between them. If their combined coverage exceeds the leftover area, each is
// scaled proportionally so the total does not surpass 100% of the zone.
function calculateSurfaceFractions(waterCoverage, iceCoverage, biomassCoverage) {
  const biomass = Math.min(biomassCoverage, 1);
  const remaining = 1 - biomass;

  const water = Math.max(0, waterCoverage);
  const ice = Math.max(0, iceCoverage);
  const totalWI = water + ice;

  let waterFraction = water;
  let iceFraction = ice;

  if (totalWI > remaining && totalWI > 0) {
    const scale = remaining / totalWI;
    waterFraction = water * scale;
    iceFraction = ice * scale;
  }

  return {
    ocean: waterFraction,
    ice: iceFraction,
    biomass: biomass
  };
}

function calculateZonalEvaporationSublimationRates(terraforming, zone, dayTemp, nightTemp, waterVaporPressure, co2VaporPressure, avgAtmPressure, zonalSolarFlux) {
  const zoneArea = terraforming.celestialParameters.surfaceArea * zonePercentage(zone);
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

function calculateZonalPrecipitationRateFactor(terraforming, zone, waterVaporPressure, gravity, dayTemp, nightTemp) {
  const zoneArea = terraforming.celestialParameters.surfaceArea * zonePercentage(zone);
  return baseCalculatePrecipFactor({
    zoneArea,
    waterVaporPressure,
    gravity,
    dayTemperature: dayTemp,
    nightTemperature: nightTemp
  });
}

const calculateZonalMeltingFreezingRates = (terraforming, zone, temperature) => {
  const availableIce = terraforming.zonalWater?.[zone]?.ice || 0;
  const availableBuriedIce = terraforming.zonalWater?.[zone]?.buriedIce || 0;
  const availableLiquid = terraforming.zonalWater?.[zone]?.liquid || 0;
  return baseCalculateMeltFreeze(temperature, availableIce, availableLiquid, availableBuriedIce);
};

if (!isNode) {
  // expose wrappers for browser usage without overwriting the captured bases
  globalThis.calculateAverageCoverage = calculateAverageCoverage;
  globalThis.calculateZonalCoverage = calculateZonalCoverage;
  globalThis.calculateSurfaceFractions = calculateSurfaceFractions;
  globalThis.calculateEvaporationSublimationRates = calculateZonalEvaporationSublimationRates;
  globalThis.calculatePrecipitationRateFactor = calculateZonalPrecipitationRateFactor;
  globalThis.calculateMeltingFreezingRates = calculateZonalMeltingFreezingRates;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAverageCoverage,
    calculateZonalCoverage,
    calculateSurfaceFractions,
    // expose with original names for consumers
    calculateEvaporationSublimationRates: calculateZonalEvaporationSublimationRates,
    calculatePrecipitationRateFactor: calculateZonalPrecipitationRateFactor,
    calculateMeltingFreezingRates: calculateZonalMeltingFreezingRates
  };
}
