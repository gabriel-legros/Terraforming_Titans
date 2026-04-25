let calculateAverageCoverageHelper;
let applyPostEquilibrationHazardTuningForMachineryHelper;

try {
  ({ calculateAverageCoverage: calculateAverageCoverageHelper } = require('../terraforming-utils.js'));
} catch (error) {
  try {
    calculateAverageCoverageHelper = calculateAverageCoverage;
  } catch (innerError) {
    calculateAverageCoverageHelper = null;
  }
}

try {
  ({ applyPostEquilibrationHazardTuning: applyPostEquilibrationHazardTuningForMachineryHelper } = require('../../rwg/rwgHazardHelper.js'));
} catch (error) {
  try {
    applyPostEquilibrationHazardTuningForMachineryHelper = applyPostEquilibrationHazardTuning;
  } catch (innerError) {
    applyPostEquilibrationHazardTuningForMachineryHelper = null;
  }
}

function getHazardousMachineryText(path, fallback, vars) {
  try {
    return t(`ui.terraforming.hazardsUi.hazardousMachinery.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function isPlainObject(value) {
  return value !== null && value.constructor === Object;
}

function withHazardSeverity(entry, defaultSeverity = 0) {
  if (!isPlainObject(entry)) {
    return { value: entry, severity: defaultSeverity };
  }

  const result = { ...entry };
  if (!Object.prototype.hasOwnProperty.call(result, 'severity')) {
    result.severity = defaultSeverity;
  }
  return result;
}

function normalizeHazardRangeEntry(entry, defaultUnit = '') {
  if (!isPlainObject(entry)) {
    return { unit: defaultUnit, severity: 0 };
  }

  const result = { ...entry };
  if (!Object.prototype.hasOwnProperty.call(result, 'unit') && defaultUnit) {
    result.unit = defaultUnit;
  }
  if (
    !Object.prototype.hasOwnProperty.call(result, 'severity') &&
    !Object.prototype.hasOwnProperty.call(result, 'severityBelow') &&
    !Object.prototype.hasOwnProperty.call(result, 'severityHigh')
  ) {
    result.severity = 0;
  }
  return result;
}

function normalizeBaseGrowthEntry(entry) {
  const normalized = withHazardSeverity(entry ?? { value: 0 }, 1);
  normalized.value = Math.max(0, normalized.value ?? 0);
  return normalized;
}

function normalizeInvasivenessPreference(source) {
  if (isPlainObject(source.invasivenessPreference)) {
    return normalizeHazardRangeEntry(source.invasivenessPreference);
  }

  const legacy = withHazardSeverity(source.invasivenessDecay ?? { value: 30, severity: 0 }, 0);
  return normalizeHazardRangeEntry({
    min: 0,
    max: Number.isFinite(legacy.value) ? legacy.value : 30,
    severityHigh: Number.isFinite(legacy.severity) ? legacy.severity : 0
  });
}

function normalizeTemperaturePreference(source) {
  if (isPlainObject(source.temperaturePreference)) {
    return normalizeHazardRangeEntry(source.temperaturePreference, 'C');
  }

  return normalizeHazardRangeEntry({
    max: Number.isFinite(source.temperatureDecayThresholdC) ? source.temperatureDecayThresholdC : 500,
    unit: 'C',
    severityHigh: Math.max(0, source.temperatureDecayCoefficient ?? 0)
  }, 'C');
}

function normalizeOxygenPreference(source) {
  if (isPlainObject(source.oxygenPreference)) {
    const entry = normalizeHazardRangeEntry(source.oxygenPreference, 'kPa');
    const unit = `${entry.unit || 'kPa'}`.trim().toLowerCase();
    if (unit !== 'ton') {
      return entry;
    }

    const pressurePerTonKPa = getCurrentPlanetPressurePerTonKPa();
    if (!(pressurePerTonKPa > 0)) {
      return normalizeHazardRangeEntry({
        ...entry,
        unit: 'kPa'
      }, 'kPa');
    }

    const converted = {
      ...entry,
      unit: 'kPa'
    };
    if (Number.isFinite(converted.min)) {
      converted.min *= pressurePerTonKPa;
    }
    if (Number.isFinite(converted.max)) {
      converted.max *= pressurePerTonKPa;
    }
    if (Number.isFinite(converted.severity)) {
      converted.severity /= pressurePerTonKPa;
    }
    if (Number.isFinite(converted.severityBelow)) {
      converted.severityBelow /= pressurePerTonKPa;
    }
    if (Number.isFinite(converted.severityHigh)) {
      converted.severityHigh /= pressurePerTonKPa;
    }
    return converted;
  }

  const pressurePerTonKPa = getCurrentPlanetPressurePerTonKPa();
  const legacySeverity = Math.max(0, source.oxygenDecayCoefficient ?? 1e-24);
  return normalizeHazardRangeEntry({
    max: 0,
    unit: 'kPa',
    severityHigh: pressurePerTonKPa > 0 ? legacySeverity / pressurePerTonKPa : legacySeverity
  }, 'kPa');
}

function getCurrentPlanetPressurePerTonKPa() {
  const gravity = currentPlanetParameters?.celestialParameters?.gravity;
  const radius = currentPlanetParameters?.celestialParameters?.radius;
  if (!(gravity > 0) || !(radius > 0)) {
    return 0;
  }

  return (1000 * gravity) / (4 * Math.PI * Math.pow(radius * 1e3, 2) * 1000);
}

function clampRatio(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function interpolateDivisorMultiplier(minMultiplier, hazardStrength) {
  const minimum = Math.max(0, minMultiplier);
  if (!(minimum > 0) || minimum >= 1) {
    return minimum >= 1 ? 1 : 0;
  }

  const divisorAtFullHazard = 1 / minimum;
  const divisor = 1 + (divisorAtFullHazard - 1) * clampRatio(hazardStrength);
  return 1 / divisor;
}

function normalizeHazardousMachineryParameters(parameters = {}) {
  const source = isPlainObject(parameters) ? parameters : {};
  const penalties = isPlainObject(source.penalties) ? source.penalties : {};
  return {
    initialCoverage: clampRatio(source.initialCoverage ?? 1),
    maxCoverageBase: clampRatio(source.maxCoverageBase ?? 1),
    targetCoverage: Number.isFinite(source.targetCoverage) ? clampRatio(source.targetCoverage) : null,
    waterCoveragePenalty: Math.max(0, source.waterCoveragePenalty ?? 0.5),
    baseGrowth: normalizeBaseGrowthEntry(source.baseGrowth),
    invasivenessPreference: normalizeInvasivenessPreference(source),
    oxygenPreference: normalizeOxygenPreference(source),
    temperaturePreference: normalizeTemperaturePreference(source),
    crusaderRemovalPerSecond: Math.max(0, source.crusaderRemovalPerSecond ?? 0.5),
    researchToDisableCost: Math.max(1, source.researchToDisableCost ?? 10000),
    penalties: {
      availableAndroidDecayRate: Math.max(0, penalties.availableAndroidDecayRate ?? 0.05),
      nanoColonyGrowthMultiplier: Math.max(0, penalties.nanoColonyGrowthMultiplier ?? 0),
      researchMultiplier: Math.max(0, penalties.researchMultiplier ?? 0.1),
      buildCostMultiplier: Math.max(1, penalties.buildCostMultiplier ?? 1),
      electronicsMaintenanceMultiplier: Math.max(1, penalties.electronicsMaintenanceMultiplier ?? 100),
      shipWorkersPerAssignedShip: Math.max(0, penalties.shipWorkersPerAssignedShip ?? 5)
    }
  };
}

class HazardousMachineryHazard {
  constructor(manager) {
    this.manager = manager;
    this.pendingTravelTuning = false;
    this.hackBatchSize = 1;
    this.autoSpendIfClear = false;
  }

  normalize(parameters) {
    return normalizeHazardousMachineryParameters(parameters);
  }

  getResource() {
    try {
      return resources?.surface?.hazardousMachinery || null;
    } catch (error) {
      return null;
    }
  }

  hasConfiguredHazard(parameters) {
    return isPlainObject(parameters);
  }

  getTerraforming() {
    try {
      return terraforming;
    } catch (error) {
      return null;
    }
  }

  getInitialLand(terraforming) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }
    return this.manager.resolveInitialLandForHazards(terraforming, resourcesState?.surface?.land);
  }

  getWaterCoverage(terraforming) {
    if (!terraforming) {
      return 0;
    }
    if (calculateAverageCoverageHelper) {
      return clampRatio(calculateAverageCoverageHelper(terraforming, 'liquidWater'));
    }

    const cache = terraforming.zonalCoverageCache || {};
    const zones = terraforming.zoneKeys || ['tropical', 'temperate', 'polar'];
    let total = 0;
    zones.forEach((zone) => {
      const weight = terraforming.getZoneWeight ? terraforming.getZoneWeight(zone) : 0;
      total += (cache[zone]?.liquidWater || 0) * weight;
    });
    return clampRatio(total);
  }

  getMaxCoverageShare(terraforming, parameters) {
    const base = clampRatio(parameters?.maxCoverageBase ?? 1);
    const waterCoverage = this.getWaterCoverage(terraforming);
    const waterLimitedShare = clampRatio(base - waterCoverage * (parameters?.waterCoveragePenalty ?? 0.5));
    return Number.isFinite(parameters?.targetCoverage)
      ? Math.min(waterLimitedShare, clampRatio(parameters.targetCoverage))
      : waterLimitedShare;
  }

  getFullCoverageAmount(terraforming) {
    return this.getInitialLand(terraforming);
  }

  getMaxAmount(terraforming, parameters) {
    return this.getFullCoverageAmount(terraforming) * this.getMaxCoverageShare(terraforming, parameters);
  }

  getInitialAmount(terraforming, parameters) {
    const startShare = Math.min(
      clampRatio(parameters?.initialCoverage ?? 1),
      this.getMaxCoverageShare(terraforming, parameters)
    );
    return this.getFullCoverageAmount(terraforming) * startShare;
  }

  hasHazard() {
    const resource = this.getResource();
    return (resource?.value || 0) > 0;
  }

  isCleared() {
    return !this.hasHazard();
  }

  ensureCrusaderPresence() {
    let crusaders = null;
    try {
      crusaders = resources?.special?.crusaders || null;
    } catch (error) {
      crusaders = null;
    }
    if (!crusaders || !crusaders.unlocked || !this.hasHazard()) {
      return;
    }
    if ((crusaders.value || 0) < 10) {
      crusaders.value = 10;
    }
  }

  getHazardStrength(terraforming, parameters, currentAmount = null) {
    const amount = currentAmount ?? (this.getResource()?.value || 0);
    const fullCoverageAmount = this.getFullCoverageAmount(terraforming);
    if (!(amount > 0) || !(fullCoverageAmount > 0)) {
      return 0;
    }
    return clampRatio(amount / fullCoverageAmount);
  }

  syncResource(terraforming, parameters, options = {}) {
    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return null;
    }

    const resource = this.getResource();
    if (!resource) {
      return null;
    }

    let unlock = null;
    try {
      unlock = unlockResource;
    } catch (error) {
      unlock = null;
    }

    resource.unlocked = true;
    if (unlock && unlock.call) {
      unlock(resource);
    }

    resource.initialValue = this.getInitialAmount(terraforming, parameters);

    if (!options.unlockOnly && !options.preserveValue && (options.resetValue === true || !(resource.value > 0))) {
      resource.value = resource.initialValue;
    }

    const maxAmount = this.getMaxAmount(terraforming, parameters);
    if (resource.value > maxAmount) {
      resource.value = maxAmount;
    }

    const initialLand = this.getInitialLand(terraforming);
    const effectiveAmount = Math.min(resource.value || 0, maxAmount);
    const share = initialLand > 0 ? clampRatio(effectiveAmount / initialLand) : 0;
    this.manager.setHazardLandReservationShare('hazardousMachinery', share);
    return {
      resource,
      maxAmount,
      initialLand,
      currentAmount: resource.value || 0
    };
  }

  initialize(terraforming, parameters, options = {}) {
    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return;
    }
    this.syncResource(terraforming, parameters, options);
  }

  syncPendingTravelTuning(hazardParameters, options = {}) {
    if (options.skipPendingTravelTuning) {
      this.pendingTravelTuning = false;
      return;
    }

    let specialAttributes = null;
    try {
      specialAttributes = currentPlanetParameters.specialAttributes;
    } catch (error) {
      specialAttributes = null;
    }

    this.pendingTravelTuning = !!(
      hazardParameters
      && specialAttributes
      && specialAttributes.deferHazardousMachineryTravelTuning === true
    );
  }

  applyPendingTravelTuning(terraforming) {
    if (!this.pendingTravelTuning || !terraforming || !applyPostEquilibrationHazardTuningForMachineryHelper) {
      return this.manager.parameters.hazardousMachinery;
    }

    this.pendingTravelTuning = false;

    if (currentPlanetParameters.specialAttributes) {
      delete currentPlanetParameters.specialAttributes.deferHazardousMachineryTravelTuning;
    }

    applyPostEquilibrationHazardTuningForMachineryHelper(currentPlanetParameters, terraforming);
    const tuned = this.normalize(currentPlanetParameters.hazards.hazardousMachinery);
    this.manager.parameters.hazardousMachinery = tuned;
    this.manager.lastSerializedParameters = JSON.stringify(this.manager.parameters);
    const tunedResource = currentPlanetParameters.resources?.surface?.hazardousMachinery;
    const resource = this.getResource();
    if (resource && Number.isFinite(tunedResource?.initialValue)) {
      resource.initialValue = Math.max(0, tunedResource.initialValue);
      resource.value = resource.initialValue;
    }
    return tuned;
  }

  clearEffectsOnTravel() {
    this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
  }

  getCrusaderDecayPerSecond(parameters) {
    let crusaders = null;
    try {
      crusaders = resources?.special?.crusaders || null;
    } catch (error) {
      crusaders = null;
    }
    if (!crusaders || !crusaders.unlocked) {
      return 0;
    }
    return Math.max(0, crusaders.value || 0) * Math.max(0, parameters?.crusaderRemovalPerSecond || 0);
  }

  getCounterHackCostPerMachinery(parameters) {
    return Math.max(1, parameters?.researchToDisableCost || 10000);
  }

  performCounterHack(terraforming, parameters, batchCount = 1) {
    if (!this.hasConfiguredHazard(parameters)) {
      return 0;
    }

    const resource = this.getResource();
    const research = resources?.colony?.research;
    if (!resource || !research || !(batchCount > 0)) {
      return 0;
    }

    const costPerMachinery = this.getCounterHackCostPerMachinery(parameters);
    const maxByResearch = Math.max(0, (research.value || 0) / costPerMachinery);
    const maxByMachinery = Math.max(0, resource.value || 0);
    const actual = Math.max(0, Math.min(batchCount, maxByResearch, maxByMachinery));
    if (!(actual > 0)) {
      return 0;
    }

    research.decrease(actual * costPerMachinery);
    resource.decrease(actual);
    this.syncResource(terraforming, parameters, { preserveValue: true });
    return actual;
  }

  autoSpendWouldClear(terraforming, parameters) {
    if (!this.autoSpendIfClear) {
      return 0;
    }

    const resource = this.getResource();
    const research = resources?.colony?.research;
    if (!resource || !research || !((resource.value || 0) > 0)) {
      return 0;
    }

    const requiredResearch = (resource.value || 0) * this.getCounterHackCostPerMachinery(parameters);
    if ((research.value || 0) + 1e-9 < requiredResearch) {
      return 0;
    }

    return this.performCounterHack(terraforming, parameters, resource.value || 0);
  }

  setHackBatchSize(value) {
    this.hackBatchSize = Math.max(1, Math.floor(value || 1));
    return this.hackBatchSize;
  }

  setAutoSpendIfClear(enabled) {
    this.autoSpendIfClear = enabled === true;
    return this.autoSpendIfClear;
  }

  getAvailableAndroids() {
    try {
      if (populationModule?.getAndroidWorkerState) {
        return Math.max(0, populationModule.getAndroidWorkerState(false).availableAndroids || 0);
      }
    } catch (error) {
      // fall through
    }

    try {
      const androids = Math.min(resources.colony.androids.value || 0, resources.colony.androids.cap || 0);
      const assigned = projectManager?.getAssignedAndroids ? projectManager.getAssignedAndroids() : 0;
      return Math.max(0, androids - assigned);
    } catch (error) {
      return 0;
    }
  }

  getLifeBiomassDensity(terraforming) {
    const surfaceArea = terraforming?.celestialParameters?.surfaceArea;
    if (!(surfaceArea > 0)) {
      return 0;
    }

    let biomass = 0;
    try {
      biomass = Math.max(0, resources?.surface?.biomass?.value || 0);
    } catch (error) {
      biomass = 0;
    }

    if (!(biomass > 0)) {
      return 0;
    }

    return biomass / surfaceArea;
  }

  getLifeDesignInvasiveness() {
    let designer = null;

    try {
      designer = lifeDesigner;
    } catch (error) {
      designer = null;
    }

    if (!designer || !designer.currentDesign || !designer.currentDesign.invasiveness) {
      return 0;
    }

    const value = designer.currentDesign.invasiveness.value;
    return Number.isFinite(value) ? value : 0;
  }

  computeRangePenalty(entry, currentValue) {
    if (!entry) {
      return 0;
    }

    const defaultSeverity = Number.isFinite(entry.severity) ? entry.severity : 0;
    const severityBelow = Number.isFinite(entry.severityBelow) ? entry.severityBelow : defaultSeverity;
    const severityHigh = Number.isFinite(entry.severityHigh) ? entry.severityHigh : defaultSeverity;
    const hasMin = Number.isFinite(entry.min);
    const hasMax = Number.isFinite(entry.max);
    const value = Number.isFinite(currentValue) ? currentValue : 0;

    if (hasMin && value < entry.min) {
      return severityBelow > 0 ? (entry.min - value) * severityBelow : 0;
    }

    if (hasMax && value > entry.max) {
      return severityHigh > 0 ? (value - entry.max) * severityHigh : 0;
    }

    return 0;
  }

  convertTemperatureFromKelvin(value, unit) {
    const normalizedUnit = unit ? `${unit}`.trim().toLowerCase() : 'k';
    const kelvin = Number.isFinite(value) ? value : 0;

    switch (normalizedUnit) {
      case 'c':
      case '°c':
      case 'celsius':
        return kelvin - 273.15;
      case 'f':
      case '°f':
      case 'fahrenheit':
        return (kelvin - 273.15) * 9 / 5 + 32;
      case 'k':
      case 'kelvin':
      default:
        return kelvin;
    }
  }

  convertPressureFromPa(value, unit) {
    const normalizedValue = Number.isFinite(value) ? value : 0;
    const normalizedUnit = `${unit || 'kPa'}`.trim().toLowerCase();

    switch (normalizedUnit) {
      case 'pa':
        return normalizedValue;
      case 'kpa':
        return normalizedValue / 1000;
      case 'mpa':
        return normalizedValue / 1_000_000;
      case 'bar':
        return normalizedValue / 100000;
      case 'mbar':
        return normalizedValue / 100;
      case 'atm':
        return normalizedValue / 101325;
      default:
        return normalizedValue / 1000;
    }
  }

  getCurrentPenaltyValues(terraforming, parameters) {
    if (!this.hasConfiguredHazard(parameters)) {
      return {
        currentAmount: 0,
        maxAmount: 0,
        fullCoverageAmount: this.getFullCoverageAmount(terraforming),
        initialLand: this.getInitialLand(terraforming),
        currentCoverageShare: 0,
        maxCoverageShare: 0,
        waterCoverage: this.getWaterCoverage(terraforming),
        hazardStrength: 0,
        baseGrowthEntry: parameters?.baseGrowth || { value: 0, severity: 1 },
        baseGrowthPercentPerSecond: Math.max(0, parameters?.baseGrowth?.value ?? 0) / 100,
        totalPenaltyPercentPerSecond: 0,
        netNaturalGrowthPercentPerSecond: Math.max(0, parameters?.baseGrowth?.value ?? 0) / 100,
        naturalGrowthRatePerSecond: 0,
        nanoColonyGrowthMultiplier: 1,
        researchMultiplier: 1,
        buildCostMultiplier: 1,
        electronicsMaintenanceMultiplier: 1,
        androidConsumptionDisabled: false,
        shipWorkersPerAssignedShip: 0,
        availableAndroids: this.getAvailableAndroids(),
        androidDecayRatePerSecond: 0,
        lifeDensity: 0,
        invasivenessEntry: parameters?.invasivenessPreference || null,
        invasivenessValue: this.getLifeDesignInvasiveness(),
        invasivenessRangePenalty: 0,
        invasivenessDecayPercentPerSecond: 0,
        invasivenessDecayRatePerSecond: 0,
        temperatureEntry: parameters?.temperaturePreference || null,
        temperatureC: 0,
        temperatureValue: 0,
        temperatureRangePenalty: 0,
        temperatureDecayPercentPerSecond: 0,
        temperatureDecayRatePerSecond: 0,
        oxygenEntry: parameters?.oxygenPreference || null,
        oxygenPressurePa: 0,
        oxygenPressureValue: 0,
        oxygenRangePenalty: 0,
        oxygenDecayPercentPerSecond: 0,
        oxygenDecayRatePerSecond: 0,
        crusaderDecayRatePerSecond: 0
      };
    }

    const resource = this.getResource();
    const currentAmount = Math.max(0, resource?.value || 0);
    const hazardStrength = this.getHazardStrength(terraforming, parameters, currentAmount);
    const maxAmount = this.getMaxAmount(terraforming, parameters);
    const baseGrowthEntry = parameters?.baseGrowth || { value: 0, severity: 1 };
    const baseGrowthPercentPerSecond = Math.max(0, baseGrowthEntry.value ?? 0) / 100;
    const penalties = parameters?.penalties || {};
    const nanoColonyGrowthMultiplier = 1 - hazardStrength * (1 - Math.max(0, penalties.nanoColonyGrowthMultiplier || 0));
    const researchMultiplier = interpolateDivisorMultiplier(
      Math.max(0, penalties.researchMultiplier ?? 0.1),
      hazardStrength
    );
    const buildCostMultiplier = 1 + hazardStrength * (Math.max(1, penalties.buildCostMultiplier || 1) - 1);
    const electronicsMaintenanceMultiplier = 1 + hazardStrength * (Math.max(1, penalties.electronicsMaintenanceMultiplier || 1) - 1);
    const androidConsumptionDisabled = hazardStrength > 0;
    const shipWorkersPerAssignedShip = hazardStrength > 0
      ? Math.max(0, penalties.shipWorkersPerAssignedShip || 0)
      : 0;
    const availableAndroids = this.getAvailableAndroids();
    const decayEligibleAndroids = availableAndroids >= 10 ? availableAndroids : 0;
    const androidDecayRatePerSecond = decayEligibleAndroids * Math.max(0, penalties.availableAndroidDecayRate || 0) * hazardStrength;
    const lifeDensity = this.getLifeBiomassDensity(terraforming);
    const invasivenessEntry = parameters?.invasivenessPreference || null;
    const invasivenessValue = this.getLifeDesignInvasiveness();
    const invasivenessRangePenalty = this.computeRangePenalty(invasivenessEntry, invasivenessValue);
    const invasivenessDecayPercentPerSecond = Math.max(0, lifeDensity * invasivenessRangePenalty) / 100;
    const invasivenessDecayRatePerSecond = Math.min(
      currentAmount,
      currentAmount * invasivenessDecayPercentPerSecond
    );
    const temperatureK = Math.max(0, terraforming?.temperature?.value || 0);
    const temperatureC = temperatureK - 273.15;
    const temperatureEntry = parameters?.temperaturePreference || null;
    const temperatureUnit = temperatureEntry?.unit || 'C';
    const temperatureValue = this.convertTemperatureFromKelvin(temperatureK, temperatureUnit);
    const temperatureRangePenalty = this.computeRangePenalty(temperatureEntry, temperatureValue);
    const rawTemperatureDecayPercentPerSecond = Math.max(0, temperatureRangePenalty) / 100;
    const temperatureDecayRatePerSecond = Math.min(
      currentAmount,
      currentAmount * rawTemperatureDecayPercentPerSecond
    );
    const temperatureDecayPercentPerSecond = currentAmount > 0
      ? Math.min(1, temperatureDecayRatePerSecond / currentAmount)
      : 0;

    let oxygenResource = null;
    try {
      oxygenResource = resources?.atmospheric?.oxygen || null;
    } catch (error) {
      oxygenResource = null;
    }
    const oxygenEntry = parameters?.oxygenPreference || null;
    const oxygenAmount = Math.max(0, oxygenResource?.value || 0);
    const oxygenPressurePa = Math.max(0, terraforming?.atmosphericPressureCache?.pressureByKey?.oxygen || 0);
    const oxygenUnit = oxygenEntry?.unit || 'kPa';
    const oxygenPressureValue = this.convertPressureFromPa(oxygenPressurePa, oxygenUnit);
    const oxygenRangePenalty = this.computeRangePenalty(oxygenEntry, oxygenPressureValue);
    const rawOxygenDecayPercentPerSecond = Math.max(0, oxygenRangePenalty) / 100;
    const oxygenDecayRatePerSecond = Math.min(
      currentAmount,
      oxygenAmount,
      currentAmount * rawOxygenDecayPercentPerSecond
    );
    const oxygenDecayPercentPerSecond = currentAmount > 0
      ? Math.min(1, oxygenDecayRatePerSecond / currentAmount)
      : 0;
    const totalPenaltyPercentPerSecond = invasivenessDecayPercentPerSecond
      + temperatureDecayPercentPerSecond
      + oxygenDecayPercentPerSecond;
    const netNaturalGrowthPercentPerSecond = baseGrowthPercentPerSecond - totalPenaltyPercentPerSecond;
    const naturalGrowthLogisticTerm = netNaturalGrowthPercentPerSecond > 0 && maxAmount > 0
      ? Math.max(0, 1 - currentAmount / maxAmount)
      : 1;
    const naturalGrowthRatePerSecond = currentAmount * netNaturalGrowthPercentPerSecond * naturalGrowthLogisticTerm;

    return {
      currentAmount,
      maxAmount,
      fullCoverageAmount: this.getFullCoverageAmount(terraforming),
      initialLand: this.getInitialLand(terraforming),
      currentCoverageShare: this.getFullCoverageAmount(terraforming) > 0
        ? clampRatio(currentAmount / this.getFullCoverageAmount(terraforming))
        : 0,
      maxCoverageShare: this.getMaxCoverageShare(terraforming, parameters),
      waterCoverage: this.getWaterCoverage(terraforming),
      hazardStrength,
      baseGrowthEntry,
      baseGrowthPercentPerSecond,
      totalPenaltyPercentPerSecond,
      netNaturalGrowthPercentPerSecond,
      naturalGrowthRatePerSecond,
      nanoColonyGrowthMultiplier,
      researchMultiplier,
      buildCostMultiplier,
      electronicsMaintenanceMultiplier,
      androidConsumptionDisabled,
      shipWorkersPerAssignedShip,
      availableAndroids,
      androidDecayRatePerSecond,
      lifeDensity,
      invasivenessEntry,
      invasivenessValue,
      invasivenessRangePenalty,
      invasivenessDecayPercentPerSecond,
      invasivenessDecayRatePerSecond,
      temperatureEntry,
      temperatureC,
      temperatureValue,
      temperatureRangePenalty,
      temperatureDecayPercentPerSecond,
      temperatureDecayRatePerSecond,
      oxygenEntry,
      oxygenPressurePa,
      oxygenPressureValue,
      oxygenRangePenalty,
      oxygenDecayPercentPerSecond,
      oxygenDecayRatePerSecond,
      crusaderDecayRatePerSecond: this.getCrusaderDecayPerSecond(parameters)
    };
  }

  getProjectWorkerAvailabilityRatio(project) {
    if (!project || !project.getHazardousMachineryWorkerRequirement || !(project.getHazardousMachineryWorkerRequirement() > 0)) {
      return 1;
    }
    try {
      return populationModule?.getWorkerAvailabilityRatio ? populationModule.getWorkerAvailabilityRatio(0) : 1;
    } catch (error) {
      return 1;
    }
  }

  getAdditionalWorkerRequirements() {
    if (!this.hasHazard()) {
      return { high: 0, normal: 0, low: 0 };
    }

    let total = 0;
    try {
      const projects = projectManager?.projects || {};
      Object.keys(projects).forEach((key) => {
        const project = projects[key];
        if (!project || project.isPermanentlyDisabled?.()) {
          return;
        }
        total += Math.max(0, project.getHazardousMachineryWorkerRequirement?.() || 0);
      });
    } catch (error) {
      total = 0;
    }

    return { high: 0, normal: total, low: 0 };
  }

  applyEffects(context = {}, parameters) {
    if (!this.hasConfiguredHazard(parameters)) {
      return false;
    }

    if (!this.hasHazard()) {
      return false;
    }

    const { addEffect, buildings = {}, colonies = {} } = context;
    if (!addEffect) {
      return false;
    }

    const values = this.getCurrentPenaltyValues(this.getTerraforming(), parameters);
    let applied = 0;
    const applyTrackedEffect = (effect) => {
      applied += 1;
      addEffect(effect);
    };

    if (values.nanoColonyGrowthMultiplier < 1) {
      applyTrackedEffect({
        effectId: 'hazardousMachinery-nanoColonyGrowth',
        target: 'nanotechManager',
        type: 'nanoColonyGrowthMultiplier',
        value: values.nanoColonyGrowthMultiplier,
        sourceId: 'hazardPenalties',
        name: getHazardousMachineryText('title', 'Hazardous Machinery')
      });
    }

    if (values.researchMultiplier < 1) {
      applyTrackedEffect({
        effectId: 'hazardousMachinery-research',
        target: 'researchManager',
        type: 'globalResearchBoost',
        value: values.researchMultiplier - 1,
        sourceId: 'hazardPenalties',
        name: getHazardousMachineryText('title', 'Hazardous Machinery')
      });
    }

    if (values.buildCostMultiplier > 1) {
      const applyBuildCostEffect = (target, targetId, cost) => {
        if (!cost) {
          return;
        }

        Object.keys(cost).forEach((category) => {
          const categoryCosts = cost[category];
          if (!categoryCosts) {
            return;
          }

          Object.keys(categoryCosts).forEach((resourceId) => {
            applyTrackedEffect({
              effectId: `hazardousMachinery-buildCost-${targetId}-${category}-${resourceId}`,
              target,
              targetId,
              type: 'resourceCostMultiplier',
              resourceCategory: category,
              resourceId,
              value: values.buildCostMultiplier,
              sourceId: 'hazardPenalties',
              name: getHazardousMachineryText('title', 'Hazardous Machinery')
            });
          });
        });
      };

      Object.keys(buildings).forEach((id) => {
        if (buildings[id]) {
          applyBuildCostEffect('building', id, buildings[id].cost);
        }
      });

      Object.keys(colonies).forEach((id) => {
        if (colonies[id]) {
          applyBuildCostEffect('colony', id, colonies[id].cost);
        }
      });
    }

    if (values.electronicsMaintenanceMultiplier > 1) {
      const applyElectronicsEffect = (target, targetId) => {
        applyTrackedEffect({
          effectId: `hazardousMachinery-electronicsMaintenance-${targetId}`,
          target,
          targetId,
          type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony',
          resourceId: 'electronics',
          value: values.electronicsMaintenanceMultiplier,
          sourceId: 'hazardPenalties',
          name: getHazardousMachineryText('title', 'Hazardous Machinery')
        });
      };

      Object.keys(buildings).forEach((id) => {
        if (buildings[id]) {
          applyElectronicsEffect('building', id);
        }
      });

      Object.keys(colonies).forEach((id) => {
        if (colonies[id]) {
          applyElectronicsEffect('colony', id);
        }
      });
    }

    Object.keys(colonies).forEach((id) => {
      if (colonies[id]) {
        applyTrackedEffect({
          effectId: `hazardousMachinery-disableAndroidConsumption-${id}`,
          target: 'colony',
          targetId: id,
          type: 'booleanFlag',
          flagId: 'hazardousMachineryDisablesAndroidConsumption',
          value: true,
          sourceId: 'hazardPenalties',
          name: getHazardousMachineryText('title', 'Hazardous Machinery')
        });
      }
    });

    return applied > 0;
  }

  save() {
    return {
      hackBatchSize: this.hackBatchSize,
      autoSpendIfClear: this.autoSpendIfClear === true
    };
  }

  load(data) {
    this.pendingTravelTuning = false;
    this.setHackBatchSize(data?.hackBatchSize || 1);
    this.setAutoSpendIfClear(data?.autoSpendIfClear === true);
  }

  update(deltaTime, terraforming, parameters) {
    if (this.pendingTravelTuning && deltaTime > 0) {
      parameters = this.applyPendingTravelTuning(terraforming);
    }

    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return;
    }

    const syncState = this.syncResource(terraforming, parameters, { preserveValue: true });
    if (!syncState) {
      return;
    }

    this.autoSpendWouldClear(terraforming, parameters);
    const resource = syncState.resource;
    if (!(resource.value > 0) || !(deltaTime > 0)) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const penaltyValues = this.getCurrentPenaltyValues(terraforming, parameters);
    let currentAmount = Math.max(0, resource.value || 0);
    const naturalGrowthDelta = penaltyValues.naturalGrowthRatePerSecond * deltaSeconds;

    if (naturalGrowthDelta > 0) {
      resource.increase(naturalGrowthDelta);
      resource.modifyRate?.(
        penaltyValues.naturalGrowthRatePerSecond,
        getHazardousMachineryText('rateLabels.baseGrowth', 'Self-Replication'),
        'hazard'
      );
      currentAmount += naturalGrowthDelta;
    } else if (naturalGrowthDelta < 0) {
      const naturalDecay = Math.min(currentAmount, Math.abs(naturalGrowthDelta));
      if (naturalDecay > 0) {
        resource.decrease(naturalDecay);
        resource.modifyRate?.(
          -Math.abs(penaltyValues.naturalGrowthRatePerSecond),
          getHazardousMachineryText('rateLabels.baseDecay', 'Natural Decay'),
          'hazard'
        );
        currentAmount -= naturalDecay;
      }
    }

    const oxygenResource = resources?.atmospheric?.oxygen || null;
    const oxygenDecay = Math.min(
      oxygenResource?.value || 0,
      penaltyValues.oxygenDecayRatePerSecond * deltaSeconds
    );
    if (oxygenDecay > 0) {
      oxygenResource.decrease(oxygenDecay);
      oxygenResource.modifyRate?.(
        -penaltyValues.oxygenDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.oxidation', 'Oxidation'),
        'hazard'
      );
    }

    const crusaderDecay = Math.min(
      currentAmount,
      penaltyValues.crusaderDecayRatePerSecond * deltaSeconds
    );
    if (crusaderDecay > 0) {
      resource.decrease(crusaderDecay);
      resource.modifyRate?.(
        -penaltyValues.crusaderDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.crusaders', 'Crusader Patrols'),
        'hazard'
      );
      currentAmount -= crusaderDecay;
    }

    const androidLoss = Math.min(
      penaltyValues.availableAndroids,
      penaltyValues.androidDecayRatePerSecond * deltaSeconds
    );
    if (androidLoss > 0) {
      resources.colony.androids.value = Math.max(0, (resources.colony.androids.value || 0) - androidLoss);
      resource.increase(androidLoss);
      resources.colony.androids.modifyRate?.(
        -penaltyValues.androidDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.androidDecay', 'Hazardous Machinery'),
        'hazard'
      );
      resource.modifyRate?.(
        penaltyValues.androidDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.androidDecay', 'Hazardous Machinery'),
        'hazard'
      );
    }

    const maxAmount = this.getMaxAmount(terraforming, parameters);
    if (resource.value > maxAmount) {
      resource.value = maxAmount;
    }

    this.syncResource(terraforming, parameters, { preserveValue: true });
  }
}

try {
  window.HazardousMachineryHazard = HazardousMachineryHazard;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = { HazardousMachineryHazard };
} catch (error) {
  // Module system not available in browser
}
