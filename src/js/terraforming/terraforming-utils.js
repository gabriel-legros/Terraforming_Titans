// Utility functions for terraforming calculations

const isNode = (typeof module !== 'undefined' && module.exports);
let ZONES_LIST, getZonePercentageFn, terraformUtilsWaterCycle, terraformUtilsMethaneCycle, terraformUtilsCo2Cycle;

if (isNode) {
  const zonesMod = require('./zones.js');
  ZONES_LIST = zonesMod.ZONES;
  getZonePercentageFn = zonesMod.getZonePercentage;
  ({ waterCycle: terraformUtilsWaterCycle } = require('./water-cycle.js'));
  ({ methaneCycle: terraformUtilsMethaneCycle } = require('./hydrocarbon-cycle.js'));
  ({ co2Cycle: terraformUtilsCo2Cycle } = require('./dry-ice-cycle.js'));
} else {
  ZONES_LIST = globalThis.ZONES;
  getZonePercentageFn = globalThis.getZonePercentage;
  terraformUtilsWaterCycle = globalThis.waterCycle;
  terraformUtilsMethaneCycle = globalThis.methaneCycle;
  terraformUtilsCo2Cycle = globalThis.co2Cycle;
}

function calculateAverageCoverage(terraforming, resourceType) {
  const coverageMap = {
    liquidWater: { cycle: terraformUtilsWaterCycle, key: 'liquidWaterCoverage' },
    ice: { cycle: terraformUtilsWaterCycle, key: 'iceCoverage' },
    liquidMethane: { cycle: terraformUtilsMethaneCycle, key: 'liquidMethaneCoverage' },
    hydrocarbonIce: { cycle: terraformUtilsMethaneCycle, key: 'hydrocarbonIceCoverage' },
    dryIce: { cycle: terraformUtilsCo2Cycle, key: 'dryIceCoverage' },
    liquidCO2: { key: 'liquidCO2' },
    biomass: { key: 'biomass' },
  };
  const mapping = coverageMap[resourceType];
  let weightedAverageCoverage = 0;
  for (const zone of ZONES_LIST) {
    let cov = 0;
    if (mapping?.cycle && typeof mapping.cycle.getCoverage === 'function') {
      cov = mapping.cycle.getCoverage(zone, terraforming.zonalCoverageCache)[mapping.key] ?? 0;
    } else if (mapping) {
      cov = terraforming.zonalCoverageCache[zone]?.[mapping.key] ?? 0;
    }
    const zonePct = getZonePercentageFn(zone);
    weightedAverageCoverage += cov * zonePct;
  }
  return Math.max(0, Math.min(weightedAverageCoverage, 1.0));
}

// Derive surface fractions for albedo calculations. Ice varieties claim their
// portion of the surface first. If they collectively exceed the whole planet,
// they are scaled proportionally so the total remains at 100%. Biomass then
// takes up to 75% of whatever surface is still available, leaving the remainder
// for liquid water and hydrocarbons.
function calculateSurfaceFractions(waterCoverage, iceCoverage, biomassCoverage,
                                   hydrocarbonCoverage = 0,
                                   methaneIceCoverage = 0,
                                   dryIceCoverage = 0) {
  let ice = Math.max(0, iceCoverage);
  let hydrocarbonIce = Math.max(0, methaneIceCoverage);
  let co2_ice = Math.max(0, dryIceCoverage);

  let totalIce = ice + hydrocarbonIce + co2_ice;
  if (totalIce > 1 && totalIce > 0) {
    const iceScale = 1 / totalIce;
    ice *= iceScale;
    hydrocarbonIce *= iceScale;
    co2_ice *= iceScale;
    totalIce = ice + hydrocarbonIce + co2_ice;
  }

  const remainingAfterIce = Math.max(0, 1 - totalIce);
  const biomassMax = Math.max(0, Math.min(biomassCoverage, 1));
  const biomass = Math.min(biomassMax, remainingAfterIce * 0.75);
  const remainingAfterBiomass = Math.max(0, remainingAfterIce - biomass);

  let ocean = Math.max(0, waterCoverage);
  let hydrocarbon = Math.max(0, hydrocarbonCoverage);
  const otherTotal = ocean + hydrocarbon;
  if (otherTotal > remainingAfterBiomass && otherTotal > 0) {
    const otherScale = remainingAfterBiomass / otherTotal;
    ocean *= otherScale;
    hydrocarbon *= otherScale;
  }

  return {
    ocean,
    ice,
    hydrocarbon,
    hydrocarbonIce,
    co2_ice,
    biomass
  };
}

function calculateZonalSurfaceFractions(terraforming, zone) {
  const cache = terraforming.zonalCoverageCache[zone] || {};
  const { liquidWaterCoverage: water, iceCoverage: ice } = terraformUtilsWaterCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { liquidMethaneCoverage: hydro, hydrocarbonIceCoverage: hydroIce } = terraformUtilsMethaneCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { dryIceCoverage: dryIce } = terraformUtilsCo2Cycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const bio = cache.biomass ?? 0;
  return calculateSurfaceFractions(water, ice, bio, hydro, hydroIce, dryIce);
}

if (!isNode) {
  // expose helpers for browser usage
  globalThis.calculateAverageCoverage = calculateAverageCoverage;
  globalThis.calculateSurfaceFractions = calculateSurfaceFractions;
  globalThis.calculateZonalSurfaceFractions = calculateZonalSurfaceFractions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAverageCoverage,
    calculateSurfaceFractions,
    calculateZonalSurfaceFractions
  };
}
