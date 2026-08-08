const KESSLER_PARAMETERS = terraformingParameters.hazards.kessler;
const KESSLER_CLEAR_THRESHOLD_TONS = KESSLER_PARAMETERS.clearThresholdTons;
const SOLIS_RESOURCE_CAP = KESSLER_PARAMETERS.solisResourceCap;
const SOLIS_WATER_KEEP = KESSLER_PARAMETERS.solisWaterKeep;
const SOLIS_CAPPED_RESOURCES = KESSLER_PARAMETERS.solisCappedResources;
const KESSLER_FAILURE_BASE_DEBRIS_PER_LAND = KESSLER_PARAMETERS.failureBaseDebrisPerLand;
const SMALL_PROJECT_BASE_SUCCESS = KESSLER_PARAMETERS.smallProjectBaseSuccess;
const LARGE_PROJECT_BASE_SUCCESS = KESSLER_PARAMETERS.largeProjectBaseSuccess;
const PERIAPSIS_SAMPLE_COUNT = KESSLER_PARAMETERS.periapsisSampleCount;
const DEBRIS_DECAY_BASE_RATE = KESSLER_PARAMETERS.debrisDecayBaseRatePerSecond;
const DEBRIS_DENSITY_CENTER = KESSLER_PARAMETERS.debrisDensityCenter;
const DEBRIS_DENSITY_SEARCH_MAX = KESSLER_PARAMETERS.debrisDensitySearchMaximum;
const DEBRIS_DECAY_DENSITY_REFERENCE = KESSLER_PARAMETERS.debrisDecayDensityReference;
const DEBRIS_DISTRIBUTION_DRAG_LINE_MIN_METERS = KESSLER_PARAMETERS.distributionDragLineMinimumMeters;
const DEBRIS_DISTRIBUTION_MEAN_MIN_METERS = KESSLER_PARAMETERS.distributionMeanMinimumMeters;
const DEBRIS_DECAY_DENSITY_FLOOR = KESSLER_PARAMETERS.debrisDecayDensityFloor;
const DEBRIS_DECAY_MAX_MULTIPLIER = KESSLER_PARAMETERS.debrisDecayMaximumMultiplier;
const KESSLER_BIN_REGENERATION_CAP_EPSILON = KESSLER_PARAMETERS.binRegenerationCapEpsilon;
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

function calculateKesslerRadiusContext(terraforming, entry) {
  const referenceRadiusKm = entry?.referenceRadiusKm
    || terraforming?.initialCelestialParameters?.radius
    || terraforming?.celestialParameters?.radius
    || terraforming?.initialCelestialParameters?.baseRadius
    || terraforming?.celestialParameters?.baseRadius
    || 0;
  const currentRadiusKm = terraforming?.celestialParameters?.radius || referenceRadiusKm;
  return {
    referenceRadiusKm,
    currentRadiusKm,
    altitudeOffsetMeters: (referenceRadiusKm - currentRadiusKm) * 1000
  };
}

function getEffectivePeriapsisAltitudeMeters(entry, terraforming) {
  const radiusContext = calculateKesslerRadiusContext(terraforming, entry);
  return Math.max(0, entry.periapsisMeters + radiusContext.altitudeOffsetMeters);
}

function shouldRebaseKesslerRadiusReference(terraforming, referenceRadiusKm) {
  const initialRadiusKm = terraforming?.initialCelestialParameters?.radius || 0;
  const baseRadiusKm = terraforming?.celestialParameters?.baseRadius
    || terraforming?.initialCelestialParameters?.baseRadius
    || 0;
  return Boolean(
    initialRadiusKm
    && baseRadiusKm
    && referenceRadiusKm
    && Math.abs(referenceRadiusKm - baseRadiusKm) < 1e-6
    && initialRadiusKm > baseRadiusKm
  );
}

function normalizeKesslerRadiusReferences(terraforming, entries) {
  const referenceRadiusKm = calculateKesslerRadiusContext(terraforming).referenceRadiusKm;
  entries.forEach((entry) => {
    entry.referenceRadiusKm = entry.referenceRadiusKm || referenceRadiusKm;
    if (shouldRebaseKesslerRadiusReference(terraforming, entry.referenceRadiusKm)) {
      entry.referenceRadiusKm = terraforming.initialCelestialParameters.radius;
    }
  });
}

function buildPeriapsisDistribution(totalMass, meanMeters, stdMeters, maxMeters, referenceRadiusKm, samples = PERIAPSIS_SAMPLE_COUNT) {
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
      referenceRadiusKm,
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

function getKesslerBaselineMassForEntry(baseline, resource, entryCount) {
  if (baseline) {
    return Math.max(0, baseline.massTons || 0);
  }
  return entryCount > 0 ? (resource.initialValue || 0) / entryCount : 0;
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
    const initialLand = resolveWorldGeometricLand(terraforming, resources?.surface?.land);
    const calculatedValue = initialLand * perLand;
    const resource = resources.special.orbitalDebris;
    const unlockOnly = options.unlockOnly === true;

    resource.unlocked = true;
    resource.initialValue = calculatedValue;
    if (!unlockOnly && (options.resetValue === true || resource.value === 0) && calculatedValue > 0) {
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
    if (currentValue < KESSLER_CLEAR_THRESHOLD_TONS) {
      debris.value = 0;
      this.periapsisDistribution = [];
      this.decaySummary = {
        dragThresholdDensity: DEBRIS_DECAY_DENSITY_REFERENCE,
        dragThresholdHeightMeters: 0,
        dragFraction: 0,
        decayTonsPerSecond: 0,
        densityMin: 0,
        densityMax: 0
      };
      this.permanentlyCleared = true;
    }
    return this.permanentlyCleared;
  }

  save() {
    return {
      permanentlyCleared: this.permanentlyCleared,
      periapsisDistribution: this.periapsisDistribution.map((entry) => {
        const savedEntry = { ...entry };
        delete savedEntry.lastDecayTonsPerSecond;
        return savedEntry;
      }),
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

  clearEffectsOnTravel() {
    this.decaySummary = {
      dragThresholdDensity: DEBRIS_DECAY_DENSITY_REFERENCE,
      dragThresholdHeightMeters: 0,
      dragFraction: 0,
      decayTonsPerSecond: 0,
      densityMin: 0,
      densityMax: 0
    };
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
    const solisBonus = (waterResource.activeEffects || []).reduce((sum, effect) => {
      if (effect && effect.effectId === 'solisStorage-water') {
        return sum + (effect.value || 0);
      }
      return sum;
    }, 0);
    const keptWater = Math.min(totalWater, SOLIS_WATER_KEEP);
    const excessWater = totalWater - keptWater;
    const solisDrop = Math.max(0, solisBonus - SOLIS_WATER_KEEP);
    const dropAmount = Math.max(excessWater, solisDrop);

    waterResource.value = keptWater;
    waterResource.activeEffects = waterResource.activeEffects.filter((effect) => effect.effectId !== 'solisStorage-water');
    waterResource.updateStorageCap();

    if (dropAmount > 0) {
      const surfaceWater = resources.surface.liquidWater;
      ZONES.forEach((zone) => {
        const zoneShare = dropAmount * getZonePercentage(zone);
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
    const currentAmount = debris.value || 0;
    return this.getProjectFailureChancesForDebris(currentAmount);
  }

  getFailureDenominatorDebris() {
    const debris = resources.special.orbitalDebris;
    const initialAmount = debris.initialValue || 0;
    const normalizedParameters = this.normalize(this.manager.parameters.kessler);
    const perLand = normalizedParameters.orbitalDebrisPerLand || KESSLER_FAILURE_BASE_DEBRIS_PER_LAND;
    return initialAmount ? initialAmount * (KESSLER_FAILURE_BASE_DEBRIS_PER_LAND / perLand) : 0;
  }

  getProjectFailureChancesForDebris(totalDebris) {
    const denominator = this.getFailureDenominatorDebris();
    const ratio = denominator ? totalDebris / denominator : 0;
    const smallSuccess = Math.pow(SMALL_PROJECT_BASE_SUCCESS, ratio);
    const largeSuccess = Math.pow(LARGE_PROJECT_BASE_SUCCESS, ratio);
    return {
      smallFailure: 1 - smallSuccess,
      largeFailure: 1 - largeSuccess,
      smallSuccess,
      largeSuccess
    };
  }

  getSuccessChanceForDebris(totalDebris, isLarge) {
    const active = this.manager.parameters.kessler && !this.isCleared();
    if (!active) {
      return 1;
    }
    const chances = this.getProjectFailureChancesForDebris(totalDebris);
    return isLarge ? chances.largeSuccess : chances.smallSuccess;
  }

  getCostMultiplierForDebris(totalDebris, isLarge) {
    const successChance = Math.max(this.getSuccessChanceForDebris(totalDebris, isLarge), 1e-10);
    const multiplier = 1 / successChance;
    return Math.min(multiplier, 1e10);
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
    const successChance = Math.max(this.getSuccessChance(isLarge), 1e-10);
    const multiplier = 1 / successChance;
    return Math.min(multiplier, 1e10);
  }

  addDebris(addedTons) {
    if (addedTons <= 0) {
      return;
    }
    const resource = resources.special.orbitalDebris;
    resource.unlocked = true;
    this.permanentlyCleared = false;
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

  regenerateDebrisFromDisk(terraforming, kesslerParameters, deltaSeconds, ratePerBinPerSecond = 0, maxGeneratedTons = Infinity) {
    if (!(deltaSeconds > 0) || !(ratePerBinPerSecond > 0)) {
      return 0;
    }
    const resource = resources.special.orbitalDebris;
    resource.unlocked = true;
    if (!this.periapsisDistribution.length) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, resource.value || 0);
    }
    if (!this.periapsisDistribution.length) {
      return 0;
    }

    const additions = [];
    let rawRegeneration = 0;
    let startingTotal = 0;
    const baselineTotal = this.getBaselineTotalMass();
    for (let i = 0; i < this.periapsisDistribution.length; i += 1) {
      const entry = this.periapsisDistribution[i];
      startingTotal += entry.massTons || 0;
      const baselineMass = getKesslerBaselineMassForEntry(
        this.periapsisBaseline[i],
        resource,
        this.periapsisDistribution.length
      );
      const capEpsilon = baselineMass * KESSLER_BIN_REGENERATION_CAP_EPSILON;
      const binCapacity = (baselineMass - (entry.massTons || 0)) > capEpsilon
        ? Math.max(0, baselineMass - (entry.massTons || 0))
        : 0;
      const added = Math.min(
        binCapacity,
        Math.max(0, baselineMass * ratePerBinPerSecond * deltaSeconds)
      );
      additions.push(added);
      rawRegeneration += added;
    }

    if (baselineTotal > 0 && startingTotal >= baselineTotal * (1 - KESSLER_BIN_REGENERATION_CAP_EPSILON)) {
      this.clampDistributionToBaseline();
      return 0;
    }

    const generationScale = rawRegeneration > 0
      ? Math.min(1, maxGeneratedTons / rawRegeneration)
      : 0;
    let regenerated = 0;
    for (let i = 0; i < this.periapsisDistribution.length; i += 1) {
      const entry = this.periapsisDistribution[i];
      const added = additions[i] * generationScale;
      entry.massTons += added;
      entry.maxSinceZero = Math.max(entry.maxSinceZero || 0, entry.massTons);
      regenerated += added;
    }

    let updatedTotal = 0;
    this.periapsisDistribution.forEach((entry) => {
      updatedTotal += entry.massTons || 0;
    });
    if (baselineTotal > 0 && updatedTotal > baselineTotal) {
      let excess = updatedTotal - baselineTotal;
      for (let i = this.periapsisDistribution.length - 1; i >= 0 && excess > 0; i -= 1) {
        const entry = this.periapsisDistribution[i];
        const removed = Math.min(entry.massTons || 0, excess);
        entry.massTons -= removed;
        excess -= removed;
      }
      updatedTotal = baselineTotal;
    }
    regenerated = Math.max(0, updatedTotal - startingTotal);
    resource.value = Math.max(0, updatedTotal);
    if (regenerated > 0) {
      resource.modifyRate(
        regenerated / deltaSeconds,
        getLocalizedRateSource(
          'hazard:debrisDiskKesslerRegeneration',
          'ui.terraforming.hazardEffects.debrisDiskKesslerRegeneration',
          'Debris Disk Regeneration'
        ),
        'hazard'
      );
      this.permanentlyCleared = false;
    }
    return regenerated;
  }

  ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass) {
    if (this.periapsisDistribution.length) {
      normalizeKesslerRadiusReferences(terraforming, this.periapsisDistribution);
      normalizeKesslerRadiusReferences(terraforming, this.periapsisBaseline);
      return;
    }
    const densityModel = resolveDensityModel(terraforming);
    const referenceRadiusKm = calculateKesslerRadiusContext(terraforming).referenceRadiusKm;
    const searchMax = Math.max(terraforming.exosphereHeightMeters || 0, DEBRIS_DENSITY_SEARCH_MAX);
    const meanMeters = Math.max(
      DEBRIS_DISTRIBUTION_MEAN_MIN_METERS,
      findAltitudeForDensity(densityModel, DEBRIS_DENSITY_CENTER, searchMax)
    );
    const dragReferenceMeters = Math.max(
      DEBRIS_DISTRIBUTION_DRAG_LINE_MIN_METERS,
      findAltitudeForDensity(densityModel, DEBRIS_DECAY_DENSITY_REFERENCE, searchMax)
    );
    const sigmaMeters = Math.abs(meanMeters - dragReferenceMeters);
    const stdMeters = Math.max(1, sigmaMeters);
    const maxMeters = Math.max(1, meanMeters + stdMeters * 3);
    this.periapsisDistribution = buildPeriapsisDistribution(totalMass, meanMeters, stdMeters, maxMeters, referenceRadiusKm);
    if (!this.periapsisBaseline.length) {
      this.periapsisBaseline = this.periapsisDistribution.map((entry) => ({
        periapsisMeters: entry.periapsisMeters,
        referenceRadiusKm: entry.referenceRadiusKm,
        massTons: entry.massTons
      }));
    }
  }

  syncDistributionToResource(terraforming, kesslerParameters, totalMass) {
    if (!this.periapsisDistribution.length) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass);
    }
    normalizeKesslerRadiusReferences(terraforming, this.periapsisDistribution);
    normalizeKesslerRadiusReferences(terraforming, this.periapsisBaseline);
    let distributionTotal = 0;
    this.periapsisDistribution.forEach((entry) => {
      distributionTotal += entry.massTons;
    });
    if (!distributionTotal) {
      this.ensurePeriapsisDistribution(terraforming, kesslerParameters, totalMass);
      return;
    }
    if (totalMass < distributionTotal) {
      // Remove debris starting from the highest periapsis bins.
      let remaining = distributionTotal - totalMass;
      for (let i = this.periapsisDistribution.length - 1; i >= 0 && remaining > 0; i -= 1) {
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

  getBaselineTotalMass() {
    const resource = resources.special.orbitalDebris;
    const entryCount = this.periapsisDistribution.length;
    let baselineTotal = 0;
    for (let i = 0; i < entryCount; i += 1) {
      baselineTotal += getKesslerBaselineMassForEntry(this.periapsisBaseline[i], resource, entryCount);
    }
    return baselineTotal;
  }

  clampDistributionToBaseline() {
    const resource = resources.special.orbitalDebris;
    const entryCount = this.periapsisDistribution.length;
    let total = 0;
    for (let i = 0; i < entryCount; i += 1) {
      const entry = this.periapsisDistribution[i];
      const baselineMass = getKesslerBaselineMassForEntry(this.periapsisBaseline[i], resource, entryCount);
      if (baselineMass > 0 && entry.massTons > baselineMass) {
        entry.massTons = baselineMass;
      }
      total += entry.massTons || 0;
    }
    resource.value = Math.max(0, total);
    return total;
  }

  update(deltaSeconds, terraforming, kesslerParameters) {
    const resource = resources.special.orbitalDebris;
    const totalMass = resource.value || 0;
    const densityModel = resolveDensityModel(terraforming);
    if (totalMass < KESSLER_CLEAR_THRESHOLD_TONS) {
      this.isCleared();
      return;
    }

    this.syncDistributionToResource(terraforming, kesslerParameters, totalMass);

    const altitudes = this.periapsisDistribution.map((entry) => getEffectivePeriapsisAltitudeMeters(entry, terraforming));
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
      const densityFactor = Math.min(DEBRIS_DECAY_MAX_MULTIPLIER, Math.max(0, densityRatio));
      const decayRate = DEBRIS_DECAY_BASE_RATE * densityFactor;
      const decayFraction = 1 - Math.exp(-decayRate * deltaSeconds);
      const decayBasis = density >= DEBRIS_DECAY_DENSITY_REFERENCE ? entry.maxSinceZero : entry.massTons;
      const removed = Math.min(entry.massTons, decayBasis * decayFraction);
      entry.lastDecayTonsPerSecond = deltaSeconds ? removed / deltaSeconds : 0;
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
    if (resource.value < KESSLER_CLEAR_THRESHOLD_TONS) {
      decayedTons += resource.value;
      updatedTotal = 0;
      this.isCleared();
    }
    const decayRate = deltaSeconds ? decayedTons / deltaSeconds : 0;
    resource.modifyRate(
      -decayRate,
      getLocalizedRateSource('hazard:kesslerDebrisDecay', 'ui.resourceRates.sources.debrisDecay', 'Debris decay'),
      'hazard'
    );

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
