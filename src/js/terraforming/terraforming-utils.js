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
  let cycle = null;
  let key = resourceType;
  if (resourceType === 'liquidWater') {
    cycle = terraformUtilsWaterCycle;
    key = 'liquidWaterCoverage';
  } else if (resourceType === 'ice') {
    cycle = terraformUtilsWaterCycle;
    key = 'iceCoverage';
  } else if (resourceType === 'liquidMethane') {
    cycle = terraformUtilsMethaneCycle;
    key = 'liquidMethaneCoverage';
  } else if (resourceType === 'hydrocarbonIce') {
    cycle = terraformUtilsMethaneCycle;
    key = 'hydrocarbonIceCoverage';
  } else if (resourceType === 'dryIce') {
    cycle = terraformUtilsCo2Cycle;
    key = 'dryIceCoverage';
  } else if (resourceType === 'liquidAmmonia') {
    cycle = terraformUtilsAmmoniaCycle;
    key = 'liquidAmmoniaCoverage';
  } else if (resourceType === 'ammoniaIce') {
    cycle = terraformUtilsAmmoniaCycle;
    key = 'ammoniaIceCoverage';
  } else if (resourceType === 'liquidOxygen') {
    cycle = terraformUtilsOxygenCycle;
    key = 'liquidOxygenCoverage';
  } else if (resourceType === 'oxygenIce') {
    cycle = terraformUtilsOxygenCycle;
    key = 'oxygenIceCoverage';
  } else if (resourceType === 'liquidNitrogen') {
    cycle = terraformUtilsNitrogenCycle;
    key = 'liquidNitrogenCoverage';
  } else if (resourceType === 'nitrogenIce') {
    cycle = terraformUtilsNitrogenCycle;
    key = 'nitrogenIceCoverage';
  }
  let weightedAverageCoverage = 0;
  const zones = (terraforming && Array.isArray(terraforming.zoneKeys) && terraforming.zoneKeys.length)
    ? terraforming.zoneKeys
    : ZONES_LIST;
  for (const zone of zones) {
    let cov = 0;
    if (cycle && cycle.getCoverage) {
      cov = cycle.getCoverage(zone, terraforming.zonalCoverageCache)[key] ?? 0;
    } else if (key) {
      cov = terraforming.zonalCoverageCache[zone]?.[key] ?? 0;
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

  let coverageScale = terraformingParameters.gameplay.coverage.defaultScale;
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

// Global deposits remain global resources; their optical footprint is uniform.
function calculateZonalSurfaceCoverages(terraforming, zone) {
  const coverages = { ...terraforming.zonalCoverageCache[zone] };
  const area = terraforming.celestialParameters.surfaceArea;
  for (const key of Object.keys(terraformingParameters.climate.surfaceModel.materials)) {
    const scale = defaultPlanetResources.surface[key].coverageScale;
    if (scale !== undefined) {
      coverages[key] = estimateCoverage(terraforming.resources.surface[key].value, area, scale);
    }
  }
  return coverages;
}

function calculateZonalSurfaceFractions(terraforming, zone) {
  return calculateSurfaceFractions(calculateZonalSurfaceCoverages(terraforming, zone));
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
