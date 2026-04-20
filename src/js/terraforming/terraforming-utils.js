// Utility functions for terraforming calculations

const isNode = (typeof module !== 'undefined' && module.exports);
let ZONES_LIST, getZonePercentageFn, terraformUtilsWaterCycle, terraformUtilsMethaneCycle, terraformUtilsCo2Cycle, terraformUtilsAmmoniaCycle, terraformUtilsOxygenCycle, terraformUtilsNitrogenCycle;

if (isNode) {
  const zonesMod = require('./zones.js');
  ZONES_LIST = zonesMod.ZONES;
  getZonePercentageFn = zonesMod.getZonePercentage;
  ({ waterCycle: terraformUtilsWaterCycle } = require('./water-cycle.js'));
  ({ methaneCycle: terraformUtilsMethaneCycle } = require('./hydrocarbon-cycle.js'));
  ({ co2Cycle: terraformUtilsCo2Cycle } = require('./dry-ice-cycle.js'));
  ({ ammoniaCycle: terraformUtilsAmmoniaCycle } = require('./ammonia-cycle.js'));
  ({ oxygenCycle: terraformUtilsOxygenCycle } = require('./oxygen-cycle.js'));
  ({ nitrogenCycle: terraformUtilsNitrogenCycle } = require('./nitrogen-cycle.js'));
} else {
  ZONES_LIST = window.ZONES;
  getZonePercentageFn = window.getZonePercentage;
  terraformUtilsWaterCycle = window.waterCycle;
  terraformUtilsMethaneCycle = window.methaneCycle;
  terraformUtilsCo2Cycle = window.co2Cycle;
  terraformUtilsAmmoniaCycle = window.ammoniaCycle;
  terraformUtilsOxygenCycle = window.oxygenCycle;
  terraformUtilsNitrogenCycle = window.nitrogenCycle;
}

function calculateAverageCoverage(terraforming, resourceType) {
  const coverageMap = {
    liquidWater: { cycle: terraformUtilsWaterCycle, key: 'liquidWaterCoverage' },
    ice: { cycle: terraformUtilsWaterCycle, key: 'iceCoverage' },
    liquidMethane: { cycle: terraformUtilsMethaneCycle, key: 'liquidMethaneCoverage' },
    hydrocarbonIce: { cycle: terraformUtilsMethaneCycle, key: 'hydrocarbonIceCoverage' },
    dryIce: { cycle: terraformUtilsCo2Cycle, key: 'dryIceCoverage' },
    liquidCO2: { key: 'liquidCO2' },
    liquidHydrogen: { key: 'liquidHydrogen' },
    liquidAmmonia: { cycle: terraformUtilsAmmoniaCycle, key: 'liquidAmmoniaCoverage' },
    ammoniaIce: { cycle: terraformUtilsAmmoniaCycle, key: 'ammoniaIceCoverage' },
    liquidOxygen: { cycle: terraformUtilsOxygenCycle, key: 'liquidOxygenCoverage' },
    oxygenIce: { cycle: terraformUtilsOxygenCycle, key: 'oxygenIceCoverage' },
    liquidNitrogen: { cycle: terraformUtilsNitrogenCycle, key: 'liquidNitrogenCoverage' },
    nitrogenIce: { cycle: terraformUtilsNitrogenCycle, key: 'nitrogenIceCoverage' },
    fineSand: { key: 'fineSand' },
    biomass: { key: 'biomass' },
  };
  const mapping = coverageMap[resourceType];
  let weightedAverageCoverage = 0;
  const zones = (terraforming && Array.isArray(terraforming.zoneKeys) && terraforming.zoneKeys.length)
    ? terraforming.zoneKeys
    : ZONES_LIST;
  for (const zone of zones) {
    let cov = 0;
    if (mapping?.cycle && typeof mapping.cycle.getCoverage === 'function') {
      cov = mapping.cycle.getCoverage(zone, terraforming.zonalCoverageCache)[mapping.key] ?? 0;
    } else if (mapping) {
      cov = terraforming.zonalCoverageCache[zone]?.[mapping.key] ?? 0;
    }
    const zonePct = terraforming && terraforming.getZoneWeight
      ? terraforming.getZoneWeight(zone)
      : getZonePercentageFn(zone);
    weightedAverageCoverage += cov * zonePct;
  }
  return Math.max(0, Math.min(weightedAverageCoverage, 1.0));
}

function getCoverageTargetAmount(terraforming, coverageKey, targetCoverage) {
  if (!terraforming?.celestialParameters) {
    return 0;
  }

  let coverageScale = 0.0001;
  const configs = terraforming.zonalSurfaceResourceConfigs || [];
  for (const config of configs) {
    const coverageKeys = config.coverageKeys || [];
    if (!coverageKeys.includes(coverageKey)) {
      continue;
    }
    const coverageScales = config.coverageScales || {};
    coverageScale = coverageScales[coverageKey] || config.coverageScale || coverageScale;
    break;
  }

  const surfaceArea = terraforming.celestialParameters.surfaceArea;
  let total = 0;
  const zones = (terraforming && Array.isArray(terraforming.zoneKeys) && terraforming.zoneKeys.length)
    ? terraforming.zoneKeys
    : ZONES_LIST;
  for (const zone of zones) {
    const zonePct = terraforming && terraforming.getZoneWeight
      ? terraforming.getZoneWeight(zone)
      : getZonePercentageFn(zone);
    const zoneArea = surfaceArea * zonePct;
    total += estimateAmountForCoverage(targetCoverage, zoneArea, coverageScale);
  }
  return total;
}

// Derive surface fractions for albedo calculations. Liquid hydrogen claims its
// full surface share first; all other liquids and ice types then split the
// remaining area proportionally if needed. Biomass claims up to 75% of
// whatever area remains after those surface coverings.
function calculateSurfaceFractions(waterCoverage, iceCoverage, biomassCoverage,
                                   hydrocarbonCoverage = 0,
                                   methaneIceCoverage = 0,
                                   dryIceCoverage = 0,
                                   hydrogenCoverage = 0,
                                   ammoniaCoverage = 0,
                                   ammoniaIceCoverage = 0,
                                   oxygenCoverage = 0,
                                   oxygenIceCoverage = 0,
                                   nitrogenCoverage = 0,
                                   nitrogenIceCoverage = 0,
                                   fineSandCoverage = 0) {
  let ocean = Math.max(0, waterCoverage);
  let ice = Math.max(0, iceCoverage);
  let hydrocarbon = Math.max(0, hydrocarbonCoverage);
  let hydrocarbonIce = Math.max(0, methaneIceCoverage);
  let co2_ice = Math.max(0, dryIceCoverage);
  let hydrogen = Math.max(0, Math.min(1, hydrogenCoverage));
  let ammonia = Math.max(0, ammoniaCoverage);
  let ammoniaIce = Math.max(0, ammoniaIceCoverage);
  let oxygen = Math.max(0, oxygenCoverage);
  let oxygenIce = Math.max(0, oxygenIceCoverage);
  let nitrogen = Math.max(0, nitrogenCoverage);
  let nitrogenIce = Math.max(0, nitrogenIceCoverage);
  let fineSand = Math.max(0, fineSandCoverage);

  const remainingSurface = Math.max(0, 1 - hydrogen);
  let combinedOtherSurface = ocean + ice + hydrocarbon + hydrocarbonIce + co2_ice + ammonia + ammoniaIce + oxygen + oxygenIce + nitrogen + nitrogenIce + fineSand;
  if (combinedOtherSurface > remainingSurface && combinedOtherSurface > 0) {
    const scale = remainingSurface / combinedOtherSurface;
    ocean *= scale;
    ice *= scale;
    hydrocarbon *= scale;
    hydrocarbonIce *= scale;
    co2_ice *= scale;
    ammonia *= scale;
    ammoniaIce *= scale;
    oxygen *= scale;
    oxygenIce *= scale;
    nitrogen *= scale;
    nitrogenIce *= scale;
    fineSand *= scale;
    combinedOtherSurface = ocean + ice + hydrocarbon + hydrocarbonIce + co2_ice + ammonia + ammoniaIce + oxygen + oxygenIce + nitrogen + nitrogenIce + fineSand;
  }

  const combinedSurface = hydrogen + combinedOtherSurface;
  const remaining = Math.max(0, 1 - combinedSurface);
  const biomassMax = Math.max(0, Math.min(biomassCoverage, 1));
  const biomass = Math.min(biomassMax, remaining * 0.75);

  return {
    ocean,
    ice,
    hydrocarbon,
    hydrocarbonIce,
    co2_ice,
    hydrogen,
    ammonia,
    ammoniaIce,
    oxygen,
    oxygenIce,
    nitrogen,
    nitrogenIce,
    fineSand,
    biomass
  };
}

function calculateZonalSurfaceFractions(terraforming, zone) {
  const cache = terraforming.zonalCoverageCache[zone] || {};
  const { liquidWaterCoverage: water, iceCoverage: ice } = terraformUtilsWaterCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { liquidMethaneCoverage: hydro, hydrocarbonIceCoverage: hydroIce } = terraformUtilsMethaneCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { dryIceCoverage: dryIce } = terraformUtilsCo2Cycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const hydrogen = cache.liquidHydrogen ?? 0;
  const { liquidAmmoniaCoverage: ammonia, ammoniaIceCoverage: ammoniaIce } = terraformUtilsAmmoniaCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { liquidOxygenCoverage: oxygen, oxygenIceCoverage: oxygenIce } = terraformUtilsOxygenCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const { liquidNitrogenCoverage: nitrogen, nitrogenIceCoverage: nitrogenIce } = terraformUtilsNitrogenCycle.getCoverage(zone, terraforming.zonalCoverageCache);
  const fineSand = cache.fineSand ?? 0;
  const bio = cache.biomass ?? 0;
  return calculateSurfaceFractions(water, ice, bio, hydro, hydroIce, dryIce, hydrogen, ammonia, ammoniaIce, oxygen, oxygenIce, nitrogen, nitrogenIce, fineSand);
}

if (!isNode) {
  // expose helpers for browser usage
  window.calculateAverageCoverage = calculateAverageCoverage;
  window.calculateSurfaceFractions = calculateSurfaceFractions;
  window.calculateZonalSurfaceFractions = calculateZonalSurfaceFractions;
  window.getCoverageTargetAmount = getCoverageTargetAmount;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAverageCoverage,
    getCoverageTargetAmount,
    calculateSurfaceFractions,
    calculateZonalSurfaceFractions
  };
}
