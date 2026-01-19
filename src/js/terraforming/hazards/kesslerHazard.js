const SOLIS_RESOURCE_CAP = 1000;
const SOLIS_WATER_KEEP = 1000;
const SOLIS_CAPPED_RESOURCES = ['food', 'components', 'electronics', 'glass', 'androids'];
const SMALL_PROJECT_BASE_SUCCESS = 0.3;
const LARGE_PROJECT_BASE_SUCCESS = 0.02;
const PERIAPSIS_SAMPLE_COUNT = 64;
const DEBRIS_DECAY_BASE_RATE = 1/(3.6e3);
const DEBRIS_DENSITY_CENTER = 1e-13;
const DEBRIS_DENSITY_SEARCH_MAX = 500000;
const DEBRIS_DECAY_DENSITY_REFERENCE = 1e-12;
const DEBRIS_DECAY_DENSITY_FLOOR = 1e-16;
const DEBRIS_DECAY_MAX_MULTIPLIER = 100;
const KESSLER_DECAY_CONSTANTS = {
  baseRate: DEBRIS_DECAY_BASE_RATE,
  densityFloor: DEBRIS_DECAY_DENSITY_FLOOR,
  maxMultiplier: DEBRIS_DECAY_MAX_MULTIPLIER
};

let getAtmosphericDensityModel = null;
try {
  ({ getAtmosphericDensityModel } = require('../atmospheric-density.js'));
} catch (error) {
  try {
    getAtmosphericDensityModel = window.getAtmosphericDensityModel;
  } catch (innerError) {
    try {
      getAtmosphericDensityModel = global.getAtmosphericDensityModel;
    } catch (lastError) {
      getAtmosphericDensityModel = null;
    }
  }
}

const densityFallbackModel = {
  getDensity: () => 0,
  getDensities: (altitudes = []) => altitudes.map(() => 0)
};

function resolveDensityModel(terraforming) {
  try {
    return getAtmosphericDensityModel(terraforming, { altitudeCacheStepMeters: 100 });
  } catch (error) {
    return densityFallbackModel;
  }
}

function buildPeriapsisDistribution(totalMass, meanMeters, stdMeters, maxMeters, samples = PERIAPSIS_SAMPLE_COUNT) {
  const count = Math.max(1, Math.floor(samples));
  const std = Math.max(1, stdMeters);
  const span = Math.max(1, maxMeters);
  const entries = [];
  let weightTotal = 0;
  const cutoff = meanMeters - 2 * std;

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const periapsisMeters = t * span;
    let weight = 0;
    if (periapsisMeters >= cutoff) {
      const z = (periapsisMeters - meanMeters) / std;
      weight = Math.exp(-0.5 * z * z);
    }
    weightTotal += weight;
    entries.push({ periapsisMeters, weight });
  }

  const massPerWeight = weightTotal ? totalMass / weightTotal : 0;
  return entries.map((entry) => {
    const massTons = entry.weight * massPerWeight;
    return {
      periapsisMeters: entry.periapsisMeters,
      massTons,
      maxSinceZero: massTons
    };
  });
}

function findAltitudeForDensity(model, targetDensity, maxMeters) {
  const maxAlt = Math.max(1, maxMeters);
  const densityAtStart = model.getDensity(0);
  const densityAtEnd = model.getDensity(maxAlt);
  let low = 0;
  let high = maxAlt;

  if (densityAtStart <= targetDensity) {
    return 0;
  }
  if (densityAtEnd >= targetDensity) {
    return maxAlt;
  }

  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    const density = model.getDensity(mid);
    if (density > targetDensity) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function normalizeKesslerParameters(parameters = {}) {
  return {
    orbitalDebrisPerLand: parameters.orbitalDebrisPerLand ?? 100
  };
}

class KesslerHazard {
  constructor(manager) {
    this.manager = manager;
    this.permanentlyCleared = false;
    this.periapsisDistribution = [];
    this.periapsisBaseline = [];
    this.decaySummary = {
      dragThresholdDensity: DEBRIS_DECAY_DENSITY_REFERENCE,
      dragThresholdHeightMeters: 0,
      dragFraction: 0,
      decayTonsPerSecond: 0,
      densityMin: 0,
      densityMax: 0
    };
  }

  normalize(parameters = {}) {
    return normalizeKesslerParameters(parameters);
  }

  initializeResources(terraforming, kesslerParameters, options = {}) {
    const perLand = kesslerParameters.orbitalDebrisPerLand;
    const initialLand = terraforming.initialLand;
    const calculatedValue = initialLand * perLand;
    const resource = resources.special.orbitalDebris;
    const unlockOnly = options.unlockOnly === true;

    resource.unlocked = true;
    resource.initialValue = calculatedValue;
    if (!unlockOnly && resource.value === 0 && calculatedValue > 0) {
      resource.value = calculatedValue;
    }

    try {
      unlockResource(resource);
    } catch (error) {
      // ignore missing UI helpers in tests
    }

    if (!unlockOnly) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, resource.value || 0);
    }
  }

  isCleared() {
    const debris = resources.special.orbitalDebris;
    const currentValue = debris.value || 0;
    this.permanentlyCleared = this.permanentlyCleared || currentValue <= 0;
    return this.permanentlyCleared;
  }

  save() {
    return {
      permanentlyCleared: this.permanentlyCleared,
      periapsisDistribution: this.periapsisDistribution,
      periapsisBaseline: this.periapsisBaseline
    };
  }

  load(data) {
    this.permanentlyCleared = Boolean(data && data.permanentlyCleared);
    this.periapsisDistribution = (data && data.periapsisDistribution) ? data.periapsisDistribution : [];
    this.periapsisBaseline = (data && data.periapsisBaseline)
      ? data.periapsisBaseline
      : this.periapsisDistribution.map((entry) => ({
        periapsisMeters: entry.periapsisMeters,
        massTons: entry.massTons
      }));
  }

  applySolisTravelAdjustments(terraforming) {
    try {
      if (globalGameIsLoadingFromSave) {
        return;
      }
    } catch (error) {
      // ignore missing globals in tests
    }

    const waterResource = resources.colony.water;
    const totalWater = waterResource.value;
    const keptWater = Math.min(totalWater, SOLIS_WATER_KEEP);
    const excessWater = totalWater - keptWater;

    waterResource.value = keptWater;
    waterResource.activeEffects = waterResource.activeEffects.filter((effect) => effect.effectId !== 'solisStorage-water');
    waterResource.updateStorageCap();

    if (excessWater > 0) {
      const surfaceWater = resources.surface.liquidWater;
      ZONES.forEach((zone) => {
        const zoneShare = excessWater * getZonePercentage(zone);
        terraforming.zonalSurface[zone].liquidWater += zoneShare;
      });

      terraforming.synchronizeGlobalResources();
      terraforming._updateZonalCoverageCache();
      surfaceWater.unlocked = true;
      try {
        unlockResource(surfaceWater);
      } catch (error) {
        // ignore missing UI helpers in tests
      }
    }

    SOLIS_CAPPED_RESOURCES.forEach((resourceKey) => {
      const resource = resources.colony[resourceKey];
      if (resource.value > SOLIS_RESOURCE_CAP) {
        resource.value = SOLIS_RESOURCE_CAP;
      }
    });
  }

  getProjectFailureChances() {
    const debris = resources.special.orbitalDebris;
    const initialAmount = debris.initialValue || 0;
    const currentAmount = debris.value || 0;
    const ratio = initialAmount ? currentAmount / initialAmount : 0;
    const smallSuccess = Math.pow(SMALL_PROJECT_BASE_SUCCESS, ratio);
    const largeSuccess = Math.pow(LARGE_PROJECT_BASE_SUCCESS, ratio);
    return {
      smallFailure: 1 - smallSuccess,
      largeFailure: 1 - largeSuccess,
      smallSuccess,
      largeSuccess
    };
  }

  getDecaySummary() {
    return this.decaySummary;
  }

  getPeriapsisDistribution() {
    return this.periapsisDistribution;
  }

  getPeriapsisBaseline() {
    return this.periapsisBaseline;
  }

  getSuccessChance(isLarge) {
    const active = this.manager.parameters.kessler && !this.isCleared();
    const chances = this.getProjectFailureChances();
    const successChance = isLarge ? chances.largeSuccess : chances.smallSuccess;
    return active ? successChance : 1;
  }

  getCostMultiplier(isLarge) {
    const successChance = this.getSuccessChance(isLarge);
    return successChance > 0 ? 1 / successChance : 1;
  }

  addDebris(addedTons) {
    if (addedTons <= 0) {
      return;
    }
    const resource = resources.special.orbitalDebris;
    if (!this.periapsisDistribution.length) {
      this.ensurePeriapsisDistribution(terraforming, this.manager.parameters.kessler, resource.value || 0);
    }
    const distribution = this.periapsisDistribution;
    let totalMass = 0;
    distribution.forEach((entry) => {
      totalMass += entry.massTons;
    });

    let weights = this.periapsisBaseline;
    let weightTotal = 0;
    weights.forEach((entry) => {
      weightTotal += entry.massTons;
    });

    if (!weightTotal) {
      const perBin = addedTons / distribution.length;
      distribution.forEach((entry) => {
        entry.massTons += perBin;
      });
      resource.value += addedTons;
      return;
    }

    distribution.forEach((entry, index) => {
      const weight = weights[index]?.massTons ?? entry.massTons;
      entry.massTons += addedTons * (weight / weightTotal);
    });
    resource.value += addedTons;
  }

  ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass) {
    if (this.periapsisDistribution.length) {
      return;
    }
    const densityModel = resolveDensityModel(terraforming);
    const searchMax = Math.max(terraforming.exosphereHeightMeters || 0, DEBRIS_DENSITY_SEARCH_MAX);
    const meanMeters = findAltitudeForDensity(densityModel, DEBRIS_DENSITY_CENTER, searchMax);
    const sigmaMeters = Math.abs(
      meanMeters - findAltitudeForDensity(densityModel, DEBRIS_DECAY_DENSITY_REFERENCE, searchMax)
    );
    const stdMeters = Math.max(1, sigmaMeters);
    const maxMeters = Math.max(1, meanMeters + stdMeters * 3);
    this.periapsisDistribution = buildPeriapsisDistribution(totalMass, meanMeters, stdMeters, maxMeters);
    if (!this.periapsisBaseline.length) {
      this.periapsisBaseline = this.periapsisDistribution.map((entry) => ({
        periapsisMeters: entry.periapsisMeters,
        massTons: entry.massTons
      }));
    }
  }

  syncDistributionToResource(terraforming, kesslerParameters, totalMass) {
    if (!this.periapsisDistribution.length) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass);
    }
    let distributionTotal = 0;
    this.periapsisDistribution.forEach((entry) => {
      distributionTotal += entry.massTons;
    });
    if (!distributionTotal) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass);
      return;
    }
    if (totalMass < distributionTotal) {
      // Remove debris starting from the lowest periapsis bins.
      let remaining = distributionTotal - totalMass;
      for (let i = 0; i < this.periapsisDistribution.length && remaining > 0; i += 1) {
        const entry = this.periapsisDistribution[i];
        const removed = Math.min(entry.massTons, remaining);
        entry.massTons -= removed;
        remaining -= removed;
      }
      return;
    }
    const scale = totalMass / distributionTotal;
    this.periapsisDistribution.forEach((entry) => {
      entry.massTons *= scale;
    });
  }

  update(deltaSeconds, terraforming, kesslerParameters) {
    const resource = resources.special.orbitalDebris;
    const totalMass = resource.value || 0;
    const densityModel = resolveDensityModel(terraforming);
    if (!totalMass) {
      this.periapsisDistribution = [];
      this.decaySummary = {
        dragThresholdDensity: DEBRIS_DECAY_DENSITY_REFERENCE,
        dragThresholdHeightMeters: 0,
        dragFraction: 0,
        decayTonsPerSecond: 0,
        densityMin: 0,
        densityMax: 0
      };
      return;
    }

    this.syncDistributionToResource(terraforming, kesslerParameters, totalMass);

    const altitudes = this.periapsisDistribution.map((entry) => entry.periapsisMeters);
    const densities = densityModel.getDensities(altitudes);
    let maxAltitude = 0;
    for (let i = 0; i < altitudes.length; i += 1) {
      maxAltitude = Math.max(maxAltitude, altitudes[i]);
    }
    const dragThresholdHeightMeters = findAltitudeForDensity(
      densityModel,
      DEBRIS_DECAY_DENSITY_REFERENCE,
      Math.max(terraforming.exosphereHeightMeters || 0, DEBRIS_DENSITY_SEARCH_MAX, maxAltitude)
    );
    let dragMass = 0;
    let decayedTons = 0;
    let densityMin = 0;
    let densityMax = 0;
    this.periapsisDistribution.forEach((entry, index) => {
      const density = densities[index] || 0;
      if (!index || density < densityMin) {
        densityMin = density;
      }
      if (density > densityMax) {
        densityMax = density;
      }
      entry.maxSinceZero = entry.maxSinceZero ?? entry.massTons;
      if (!entry.massTons) {
        entry.maxSinceZero = 0;
      } else if (entry.maxSinceZero < entry.massTons) {
        entry.maxSinceZero = entry.massTons;
      }
      if (density >= DEBRIS_DECAY_DENSITY_REFERENCE) {
        dragMass += entry.massTons;
      }

      const densityRatio = Math.max(density, DEBRIS_DECAY_DENSITY_FLOOR) / DEBRIS_DECAY_DENSITY_REFERENCE;
      const densityFactor = Math.min(DEBRIS_DECAY_MAX_MULTIPLIER, Math.max(0, densityRatio + 1));
      const decayRate = DEBRIS_DECAY_BASE_RATE * densityFactor;
      const decayFraction = 1 - Math.exp(-decayRate * deltaSeconds);
      const decayBasis = density >= DEBRIS_DECAY_DENSITY_REFERENCE ? entry.maxSinceZero : entry.massTons;
      const removed = Math.min(entry.massTons, decayBasis * decayFraction);
      entry.massTons = Math.max(0, entry.massTons - removed);
      if (!entry.massTons) {
        entry.maxSinceZero = 0;
      }
      decayedTons += removed;
    });

    let updatedTotal = 0;
    this.periapsisDistribution.forEach((entry) => {
      updatedTotal += entry.massTons;
    });
    resource.value = Math.max(0, updatedTotal);
    const decayRate = deltaSeconds ? decayedTons / deltaSeconds : 0;
    resource.modifyRate(-decayRate, 'Debris decay', 'hazard');

    this.decaySummary = {
      dragThresholdDensity: DEBRIS_DECAY_DENSITY_REFERENCE,
      dragThresholdHeightMeters,
      dragFraction: updatedTotal ? (dragMass / updatedTotal) : 0,
      decayTonsPerSecond: decayRate,
      densityMin,
      densityMax
    };
  }
}

try {
  window.KesslerHazard = KesslerHazard;
  window.KESSLER_DECAY_CONSTANTS = KESSLER_DECAY_CONSTANTS;
} catch (error) {
  try {
    global.KesslerHazard = KesslerHazard;
    global.KESSLER_DECAY_CONSTANTS = KESSLER_DECAY_CONSTANTS;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { KesslerHazard, KESSLER_DECAY_CONSTANTS };
} catch (error) {
  // Module system not available in browser
}
