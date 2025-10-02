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

// Derive surface fractions for albedo calculations. Biomass always claims its
// full portion of the surface. Water and ice then divide whatever area remains
// between them. If their combined coverage exceeds the leftover area, each is
// scaled proportionally so the total does not surpass 100% of the zone.
function calculateSurfaceFractions(waterCoverage, iceCoverage, biomassCoverage,
                                   hydrocarbonCoverage = 0,
                                   methaneIceCoverage = 0,
                                   dryIceCoverage = 0) {
  const biomass = Math.min(biomassCoverage, 1);
  const remaining = 1 - biomass;

  const surfaces = {
    ocean: Math.max(0, waterCoverage),
    ice: Math.max(0, iceCoverage),
    hydrocarbon: Math.max(0, hydrocarbonCoverage),
    hydrocarbonIce: Math.max(0, methaneIceCoverage),
    co2_ice: Math.max(0, dryIceCoverage)
  };

  const totalOther = Object.values(surfaces).reduce((a, b) => a + b, 0);

  let scale = 1;
  if (totalOther > remaining && totalOther > 0) {
    scale = remaining / totalOther;
  }

  for (const key in surfaces) {
    surfaces[key] *= scale;
  }

  return { ...surfaces, biomass };
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
