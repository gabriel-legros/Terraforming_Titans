const SOLIS_RESOURCE_CAP = 1000;
const SOLIS_WATER_KEEP = 1000;
const SOLIS_CAPPED_RESOURCES = ['food', 'components', 'electronics', 'glass', 'androids'];
const SMALL_PROJECT_BASE_SUCCESS = 0.5;
const LARGE_PROJECT_BASE_SUCCESS = 0.05;
const PERIAPSIS_SAMPLE_COUNT = 64;
const PERIAPSIS_MEAN_SCALE = 1.25;
const PERIAPSIS_MIN_METERS = 40000;
const PERIAPSIS_STD_RATIO = 0.5;
const DEBRIS_DECAY_BASE_RATE = 2e-6;
const DEBRIS_DECAY_DEPTH_METERS = 100000;

function buildPeriapsisDistribution(totalMass, meanMeters, stdMeters, samples = PERIAPSIS_SAMPLE_COUNT) {
  const count = Math.max(1, Math.floor(samples));
  const std = Math.max(1, stdMeters);
  const range = std * 6;
  const minPeriapsis = Math.max(0, meanMeters - range / 2);
  const maxPeriapsis = meanMeters + range / 2;
  const span = Math.max(1, maxPeriapsis - minPeriapsis);
  const entries = [];
  let weightTotal = 0;

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const periapsisMeters = minPeriapsis + t * span;
    const z = (periapsisMeters - meanMeters) / std;
    const weight = Math.exp(-0.5 * z * z);
    weightTotal += weight;
    entries.push({ periapsisMeters, weight });
  }

  const massPerWeight = weightTotal ? totalMass / weightTotal : 0;
  return entries.map((entry) => ({
    periapsisMeters: entry.periapsisMeters,
    massTons: entry.weight * massPerWeight
  }));
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
    this.decaySummary = {
      exobaseHeightMeters: 0,
      belowFraction: 0,
      decayTonsPerSecond: 0
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
      periapsisDistribution: this.periapsisDistribution
    };
  }

  load(data) {
    this.permanentlyCleared = Boolean(data && data.permanentlyCleared);
    this.periapsisDistribution = (data && data.periapsisDistribution) ? data.periapsisDistribution : [];
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

  ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass) {
    if (this.periapsisDistribution.length) {
      return;
    }
    let exobase = terraforming.exosphereHeightMeters || 0;
    if (!exobase) {
      terraforming.updateLuminosity();
      terraforming._updateExosphereHeightCache();
      exobase = terraforming.exosphereHeightMeters || 0;
    }
    const meanMeters = Math.max(PERIAPSIS_MIN_METERS, exobase * PERIAPSIS_MEAN_SCALE);
    const stdMeters = Math.max(1, exobase * PERIAPSIS_STD_RATIO);
    this.periapsisDistribution = buildPeriapsisDistribution(totalMass, meanMeters, stdMeters);
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
    const scale = totalMass / distributionTotal;
    this.periapsisDistribution.forEach((entry) => {
      entry.massTons *= scale;
    });
  }

  update(deltaSeconds, terraforming, kesslerParameters) {
    const resource = resources.special.orbitalDebris;
    const totalMass = resource.value || 0;
    if (!totalMass) {
      this.periapsisDistribution = [];
      this.decaySummary = {
        exobaseHeightMeters: terraforming.exosphereHeightMeters || 0,
        belowFraction: 0,
        decayTonsPerSecond: 0
      };
      return;
    }

    this.syncDistributionToResource(terraforming, kesslerParameters, totalMass);

    const exobase = terraforming.exosphereHeightMeters || 0;
    let belowMass = 0;
    let decayedTons = 0;
    this.periapsisDistribution.forEach((entry) => {
      const depth = exobase - entry.periapsisMeters;
      if (depth > 0) {
        const depthFactor = 1 + depth / DEBRIS_DECAY_DEPTH_METERS;
        const decayRate = DEBRIS_DECAY_BASE_RATE * depthFactor;
        const decayFraction = 1 - Math.exp(-decayRate * deltaSeconds);
        const removed = entry.massTons * decayFraction;
        entry.massTons = Math.max(0, entry.massTons - removed);
        decayedTons += removed;
        belowMass += entry.massTons;
      }
    });

    let updatedTotal = 0;
    this.periapsisDistribution.forEach((entry) => {
      updatedTotal += entry.massTons;
    });
    resource.value = Math.max(0, updatedTotal);
    const decayRate = deltaSeconds ? decayedTons / deltaSeconds : 0;
    resource.modifyRate(-decayRate, 'Debris decay', 'hazard');

    this.decaySummary = {
      exobaseHeightMeters: exobase,
      belowFraction: updatedTotal ? (belowMass / updatedTotal) : 0,
      decayTonsPerSecond: decayRate
    };
  }
}

try {
  window.KesslerHazard = KesslerHazard;
} catch (error) {
  try {
    global.KesslerHazard = KesslerHazard;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { KesslerHazard };
} catch (error) {
  // Module system not available in browser
}
