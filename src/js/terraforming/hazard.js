let hazardManager = null;
let getZonePercentageHelper;
let zonesList;

const HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER = 1;

try {
  window.hazardousBiomassRemovalConstant = HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER;
} catch (error) {
  try {
    global.hazardousBiomassRemovalConstant = HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER;
  } catch (innerError) {
    // Environment without window/global exposure (tests)
  }
}

if (typeof module !== 'undefined' && module.exports) {
  ({ getZonePercentage: getZonePercentageHelper, ZONES: zonesList } = require('./zones.js'));
} else if (typeof window !== 'undefined') {
  getZonePercentageHelper = window.getZonePercentage;
  zonesList = window.ZONES;
}

function cloneHazardParameters(parameters) {
  if (!parameters || typeof parameters !== 'object') {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(parameters));
  } catch (error) {
    console.error('Failed to clone hazard parameters.', error);
    return {};
  }
}

function isPlainObject(value) {
  return value !== null && value.constructor === Object;
}

function withHazardSeverity(entry, defaultSeverity = 1) {
  if (!isPlainObject(entry)) {
    return { value: entry, severity: defaultSeverity };
  }

  const result = { ...entry };
  if (!Object.prototype.hasOwnProperty.call(result, 'severity')) {
    result.severity = defaultSeverity;
  }

  return result;
}

function normalizeHazardPenalties(penalties) {
  const source = isPlainObject(penalties) ? penalties : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
    normalized[key] = withHazardSeverity(source[key]);
  });

  return normalized;
}

function normalizeHazardousBiomassParameters(parameters) {
  const source = isPlainObject(parameters) ? parameters : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
    if (key === 'penalties') {
      normalized.penalties = normalizeHazardPenalties(source.penalties);
      return;
    }

    normalized[key] = withHazardSeverity(source[key]);
  });

  if (!Object.prototype.hasOwnProperty.call(normalized, 'baseGrowth')) {
    normalized.baseGrowth = { value: 0, severity: 1, maxDensity: 0 };
  }

  if (!Object.prototype.hasOwnProperty.call(normalized.baseGrowth, 'maxDensity')) {
    normalized.baseGrowth.maxDensity = 0;
  }

  if (!Object.prototype.hasOwnProperty.call(normalized, 'invasivenessResistance')) {
    normalized.invasivenessResistance = { value: 0, severity: 1 };
  }

  if (!Object.prototype.hasOwnProperty.call(normalized, 'penalties')) {
    normalized.penalties = {};
  }

  return normalized;
}

function normalizeHazardParameters(parameters) {
  const source = isPlainObject(parameters) ? parameters : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (key === 'hazardousBiomass') {
      normalized[key] = normalizeHazardousBiomassParameters(value);
      return;
    }

    normalized[key] = value;
  });

  return normalized;
}

class HazardManager {
  constructor() {
    this.enabled = false;
    this.parameters = {};
    this.lastSerializedParameters = '';
    this.cachedHazardousBiomassControl = 0;
    this.cachedPenaltyMultipliers = {
      buildCost: 1,
      maintenanceCost: 1,
      populationGrowth: 1,
    };
  }

  enable() {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.updateUI();
  }

  disable() {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    this.updateHazardousLandReservation(null);
    this.updateUI();
  }

  initialize(parameters = {}) {
    const cloned = cloneHazardParameters(parameters);
    const normalized = normalizeHazardParameters(cloned);
    const serialized = JSON.stringify(normalized);
    const changed = serialized !== this.lastSerializedParameters;

    this.parameters = normalized;
    this.lastSerializedParameters = serialized;
    this.updateHazardousBiomassControl(this.cachedHazardousBiomassControl, true);

    const activeTerraforming = typeof terraforming !== 'undefined' ? terraforming : null;
    this.updateHazardousLandReservation(activeTerraforming);

    if (changed && this.enabled) {
      this.updateUI();
    }
  }

  updateUI() {
    if (typeof setTerraformingHazardsVisibility === 'function') {
      setTerraformingHazardsVisibility(this.enabled);
    }

    if (!this.enabled) {
      return;
    }

    if (typeof initializeHazardUI === 'function') {
      initializeHazardUI();
    }

    if (typeof updateHazardUI === 'function') {
      updateHazardUI(this.parameters);
    }
  }

  save() {
    return {
      parameters: cloneHazardParameters(this.parameters)
    };
  }

  load(data) {
    this.initialize(currentPlanetParameters.hazards);
  }

  update(deltaTime = 0, terraforming = null) {
    const hazardResource = resources?.surface?.hazardousBiomass || null;
    let growthDelta = 0;
    let crusaderDelta = 0;
    const hazardous = this.parameters.hazardousBiomass;
    const growth = hazardous && hazardous.baseGrowth;
    const zoneKeys = Array.isArray(zonesList) && zonesList.length
      ? zonesList
      : Object.keys(terraforming.zonalSurface);
    const zoneEntries = zoneKeys
      .map((zone) => ({ zone, data: terraforming.zonalSurface[zone] }))
      .filter((entry) => entry.data);
    const deltaSeconds = deltaTime > 0 ? deltaTime / 1000 : 0;

    if (deltaTime && hazardous && growth && getZonePercentageHelper && zoneEntries.length) {
      const growthPercent = Number.isFinite(growth.value) ? growth.value : 0;
      const maxDensity = Number.isFinite(growth.maxDensity) ? growth.maxDensity : 0;
      const landArea = terraforming.initialLand;

      if (growthPercent && maxDensity > 0) {
        const penaltyDetails = this.calculateHazardousBiomassGrowthPenaltyDetails(hazardous, terraforming);
        const globalPenalty = penaltyDetails.globalPenalty;
        const zonePenaltyMap = penaltyDetails.zonePenalties || {};

        zoneEntries.forEach(({ zone, data }) => {
          const zoneData = data;

          const zoneArea = landArea * getZonePercentageHelper(zone);
          if (!zoneArea) {
            return;
          }

          const currentBiomass = Number.isFinite(zoneData.hazardousBiomass)
            ? zoneData.hazardousBiomass
            : 0;

          if (!currentBiomass) {
            return;
          }

          const carryingCapacity = zoneArea * maxDensity;
          if (!carryingCapacity) {
            return;
          }

          const zonePenaltyValue = Number.isFinite(zonePenaltyMap[zone]) ? zonePenaltyMap[zone] : 0;
          const adjustedGrowthPercent = growthPercent - globalPenalty - zonePenaltyValue;
          const growthRate = adjustedGrowthPercent / 100;
          const logisticTerm = growthRate > 0
            ? 1 - currentBiomass / carryingCapacity
            : 1;
          const deltaBiomass = growthRate * currentBiomass * logisticTerm * deltaSeconds;
          const nextBiomass = currentBiomass + deltaBiomass;
          const upperBound = carryingCapacity;

          if (nextBiomass <= 0) {
            growthDelta -= currentBiomass;
            zoneData.hazardousBiomass = 0;
            return;
          }

          if (nextBiomass > upperBound) {
            growthDelta += upperBound - currentBiomass;
            zoneData.hazardousBiomass = upperBound;
            return;
          }

          growthDelta += deltaBiomass;
          zoneData.hazardousBiomass = nextBiomass;
        });
      }
    }

    if (deltaSeconds > 0 && HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER > 0 && zoneEntries.length) {
      const crusaderCount = Number.isFinite(resources?.special?.crusaders?.value)
        ? resources.special.crusaders.value
        : 0;

      if (crusaderCount > 0) {
        const totalBiomass = zoneEntries.reduce((sum, entry) => {
          const zoneBiomass = Number.isFinite(entry.data.hazardousBiomass)
            ? entry.data.hazardousBiomass
            : 0;
          return zoneBiomass > 0 ? sum + zoneBiomass : sum;
        }, 0);

        if (totalBiomass > 0) {
          const totalReduction = HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER * crusaderCount * deltaSeconds;

          zoneEntries.forEach((entry) => {
            const zoneData = entry.data;
            const previousValue = Number.isFinite(zoneData.hazardousBiomass) ? zoneData.hazardousBiomass : 0;
            if (previousValue <= 0) {
              return;
            }

            const share = previousValue / totalBiomass;
            const reduction = totalReduction * share;
            const appliedReduction = reduction < previousValue ? reduction : previousValue;
            const nextValue = previousValue - appliedReduction;
            crusaderDelta -= appliedReduction;
            zoneData.hazardousBiomass = nextValue > 0 ? nextValue : 0;
          });
        }
      }
    }

    if (deltaSeconds > 0 && hazardResource && hazardResource.modifyRate) {
      if (growthDelta) {
        hazardResource.modifyRate(growthDelta / deltaSeconds, 'Hazard Growth', 'terraforming');
      }

      if (crusaderDelta) {
        hazardResource.modifyRate(crusaderDelta / deltaSeconds, 'Crusader Patrols', 'terraforming');
      }
    }

    this.updateHazardousLandReservation(terraforming);
  }

  updateHazardousLandReservation(terraforming) {
    if (typeof resources === 'undefined' || !resources || !resources.surface || !resources.surface.land) {
      this.updateHazardousBiomassControl(0);
      return;
    }

    const landResource = resources.surface.land;
    const hazardous = this.parameters.hazardousBiomass;
    const baseGrowth = hazardous && hazardous.baseGrowth;
    const maxDensity = baseGrowth && Number.isFinite(baseGrowth.maxDensity) && baseGrowth.maxDensity > 0
      ? baseGrowth.maxDensity
      : 0;

    let totalBiomass = 0;

    if (terraforming && terraforming.zonalSurface) {
      const zoneKeys = Array.isArray(zonesList) && zonesList.length
        ? zonesList
        : Object.keys(terraforming.zonalSurface);

      zoneKeys.forEach((zone) => {
        const zoneData = terraforming.zonalSurface[zone];
        if (!zoneData) {
          return;
        }

        const biomass = zoneData.hazardousBiomass;
        if (Number.isFinite(biomass) && biomass > 0) {
          totalBiomass += biomass;
        }
      });
    }

    const landCandidates = [
      terraforming?.initialLand,
      landResource.initialValue,
    ];

    let initialLand = 0;
    for (let index = 0; index < landCandidates.length; index += 1) {
      const candidate = landCandidates[index];
      if (Number.isFinite(candidate) && candidate > 0) {
        initialLand = candidate;
        break;
      }
    }

    const reservedLand = maxDensity > 0 ? Math.min(totalBiomass / maxDensity, initialLand) : 0;

    const carryingCapacity = maxDensity > 0 && initialLand > 0
      ? initialLand * maxDensity
      : 0;

    const controlShare = carryingCapacity > 0 ? totalBiomass / carryingCapacity : 0;
    this.updateHazardousBiomassControl(controlShare);

    if (typeof landResource.setReservedAmountForSource === 'function') {
      landResource.setReservedAmountForSource('hazardousBiomass', reservedLand);
    } else {
      const previous = landResource._hazardousBiomassReserved || 0;
      landResource.reserved = Math.max(0, landResource.reserved - previous + reservedLand);
      landResource._hazardousBiomassReserved = reservedLand;
    }
  }

  getHazardPenalties(key) {
    if (!key || !Object.prototype.hasOwnProperty.call(this.parameters, key)) {
      return {};
    }

    return cloneHazardParameters(this.parameters[key].penalties);
  }

  getPenaltyMultipliers() {
    if (!this.parameters || Object.keys(this.parameters).length === 0) {
      return this.cachedPenaltyMultipliers;
    }

    this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers(this.cachedHazardousBiomassControl);
    return this.cachedPenaltyMultipliers;
  }

  getHazardousBiomassControl() {
    return this.cachedHazardousBiomassControl;
  }

  updateHazardousBiomassControl(control, forceUpdate = false) {
    const normalized = this.normalizeHazardControl(control);
    const difference = Math.abs(normalized - this.cachedHazardousBiomassControl);

    this.cachedHazardousBiomassControl = normalized;

    if (forceUpdate || difference > 1e-9) {
      this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers(normalized);
    }
  }

  normalizeHazardControl(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return value >= 1 ? 1 : value;
  }

  calculatePenaltyMultipliers(control = 0) {
    const normalizedControl = this.normalizeHazardControl(control);

    return {
      buildCost: this.calculatePenaltyMultiplier('buildCost', (penalty) => 1 + penalty, normalizedControl),
      maintenanceCost: this.calculatePenaltyMultiplier('maintenanceCost', (penalty) => 1 + penalty, normalizedControl),
      populationGrowth: this.calculatePenaltyMultiplier('populationGrowth', (penalty) => 1 / (1 + penalty), normalizedControl),
    };
  }

  calculatePenaltyMultiplier(key, transform, control = 0) {
    if (!control) {
      return 1;
    }

    let multiplier = 1;

    Object.keys(this.parameters).forEach((hazardKey) => {
      const hazard = this.parameters[hazardKey];
      if (!hazard || !hazard.penalties || !hazard.penalties[key]) {
        return;
      }

      const penalty = hazard.penalties[key];
      const penaltyValue = this.getPenaltyValue(penalty);
      if (!penaltyValue) {
        return;
      }

      const scaledPenalty = penaltyValue * control;
      if (!scaledPenalty) {
        return;
      }

      const transformed = transform(scaledPenalty);
      multiplier *= Number.isFinite(transformed) && transformed > 0 ? transformed : 1;
    });

    return multiplier;
  }

  calculateHazardousBiomassGrowthPenalty(hazardousParameters, terraforming) {
    return this.calculateHazardousBiomassGrowthPenaltyDetails(hazardousParameters, terraforming).totalPenalty;
  }

  calculateHazardousBiomassGrowthPenaltyDetails(hazardousParameters, terraforming) {
    const emptyResult = {
      totalPenalty: 0,
      globalPenalty: 0,
      zonePenalties: {}
    };

    if (!hazardousParameters || !terraforming) {
      return emptyResult;
    }

    const zoneSource = terraforming.zonalSurface
      || (terraforming.temperature && terraforming.temperature.zones)
      || terraforming.zonalCoverageCache
      || {};
    const configuredZones = Array.isArray(zonesList) && zonesList.length ? zonesList : Object.keys(zoneSource);
    if (!configuredZones.length) {
      let globalPenaltyOnly = 0;

      if (terraforming.atmosphericPressureCache) {
        const cache = terraforming.atmosphericPressureCache;
        globalPenaltyOnly += this.calculatePressureGrowthPenalty(cache, hazardousParameters.oxygenPressure, 'oxygen');
        globalPenaltyOnly += this.calculatePressureGrowthPenalty(cache, hazardousParameters.co2Pressure, 'carbonDioxide');
        globalPenaltyOnly += this.calculatePressureGrowthPenalty(cache, hazardousParameters.atmosphericPressure, null);
      }

      globalPenaltyOnly += this.calculateRadiationGrowthPenalty(terraforming, hazardousParameters.radiationPreference);

      return {
        totalPenalty: globalPenaltyOnly,
        globalPenalty: globalPenaltyOnly,
        zonePenalties: {}
      };
    }

    const zoneCount = configuredZones.length;
    const zoneWeights = {};
    configuredZones.forEach((zone) => {
      const weight = this.getZoneWeight(zone, zoneCount);
      zoneWeights[zone] = Number.isFinite(weight) && weight > 0 ? weight : 0;
    });

    const perZonePenalties = {};
    let weightedZoneTotal = 0;
    let globalPenalty = 0;

    const mergeZoneDetails = (details) => {
      if (!details) {
        return;
      }

      if (Number.isFinite(details.totalPenalty)) {
        weightedZoneTotal += details.totalPenalty;
      }

      if (!details.zonePenalties) {
        return;
      }

      Object.keys(details.zonePenalties).forEach((zone) => {
        const value = details.zonePenalties[zone];
        if (!Number.isFinite(value) || value === 0) {
          return;
        }
        const previous = perZonePenalties[zone] || 0;
        perZonePenalties[zone] = previous + value;
      });
    };

    if (terraforming.atmosphericPressureCache) {
      const cache = terraforming.atmosphericPressureCache;
      globalPenalty += this.calculatePressureGrowthPenalty(cache, hazardousParameters.oxygenPressure, 'oxygen');
      globalPenalty += this.calculatePressureGrowthPenalty(cache, hazardousParameters.co2Pressure, 'carbonDioxide');
      globalPenalty += this.calculatePressureGrowthPenalty(cache, hazardousParameters.atmosphericPressure, null);
    }

    mergeZoneDetails(this.calculateTemperatureGrowthPenaltyDetails(
      terraforming,
      hazardousParameters.temperaturePreference,
      configuredZones,
      zoneWeights
    ));

    globalPenalty += this.calculateRadiationGrowthPenalty(terraforming, hazardousParameters.radiationPreference);

    mergeZoneDetails(this.calculateLandPreferencePenaltyDetails(
      terraforming,
      hazardousParameters.landPreference,
      configuredZones,
      zoneWeights
    ));

    mergeZoneDetails(this.calculateInvasivenessGrowthPenaltyDetails(
      terraforming,
      hazardousParameters.invasivenessResistance,
      configuredZones,
      zoneWeights
    ));

    const totalPenalty = globalPenalty + weightedZoneTotal;

    return {
      totalPenalty,
      globalPenalty,
      zonePenalties: perZonePenalties
    };
  }

  calculatePressureGrowthPenalty(cache, entry, gasKey) {
    if (!entry || !cache) {
      return 0;
    }

    const unit = entry.unit ? `${entry.unit}` : 'kPa';
    const pressurePa = gasKey ? cache.pressureByKey && cache.pressureByKey[gasKey] : cache.totalPressure;
    const pressureValue = this.convertPressureFromPa(Number.isFinite(pressurePa) ? pressurePa : 0, unit);

    return this.computeRangePenalty(entry, pressureValue);
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

  computeRangePenalty(entry, currentValue) {
    if (!entry) {
      return 0;
    }

    const defaultSeverity = Number.isFinite(entry.severity) ? entry.severity : 1;
    const severityBelow = Number.isFinite(entry.severityBelow) ? entry.severityBelow : defaultSeverity;
    const severityHigh = Number.isFinite(entry.severityHigh) ? entry.severityHigh : defaultSeverity;

    const hasMin = Number.isFinite(entry.min);
    const hasMax = Number.isFinite(entry.max);
    const value = Number.isFinite(currentValue) ? currentValue : 0;

    if (hasMin && value < entry.min) {
      const severity = Number.isFinite(severityBelow) ? severityBelow : 0;
      if (!severity) {
        return 0;
      }
      return (entry.min - value) * severity;
    }

    if (hasMax && value > entry.max) {
      const severity = Number.isFinite(severityHigh) ? severityHigh : 0;
      if (!severity) {
        return 0;
      }
      return (value - entry.max) * severity;
    }

    return 0;
  }

  calculateTemperatureGrowthPenalty(terraforming, entry) {
    return this.calculateTemperatureGrowthPenaltyDetails(terraforming, entry).totalPenalty;
  }

  calculateTemperatureGrowthPenaltyDetails(terraforming, entry, zoneKeys, zoneWeights) {
    const result = {
      totalPenalty: 0,
      zonePenalties: {}
    };

    if (!entry || !terraforming || !terraforming.temperature || !terraforming.temperature.zones) {
      return result;
    }

    const resolvedZones = Array.isArray(zoneKeys) && zoneKeys.length
      ? zoneKeys
      : (Array.isArray(zonesList) && zonesList.length
        ? zonesList
        : Object.keys(terraforming.temperature.zones));
    const zoneCount = resolvedZones.length || 1;
    const weights = zoneWeights || {};
    const unit = entry.unit ? `${entry.unit}` : 'K';

    resolvedZones.forEach((zone) => {
      const zoneData = terraforming.temperature.zones[zone];
      if (!zoneData || !Number.isFinite(zoneData.value)) {
        return;
      }

      const temperature = this.convertTemperatureFromKelvin(zoneData.value, unit);
      const rawPenalty = this.computeRangePenalty(entry, temperature);
      if (!rawPenalty) {
        return;
      }

      let weight = weights[zone];
      if (!Number.isFinite(weight) || weight <= 0) {
        weight = this.getZoneWeight(zone, zoneCount);
      }

      const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
      if (normalizedWeight) {
        result.totalPenalty += rawPenalty * normalizedWeight;
      }

      const previous = result.zonePenalties[zone] || 0;
      result.zonePenalties[zone] = previous + rawPenalty;
    });

    return result;
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

  calculateRadiationGrowthPenalty(terraforming, entry) {
    if (!entry || !terraforming || !Number.isFinite(terraforming.surfaceRadiation)) {
      return 0;
    }

    const radiation = Number.isFinite(terraforming.surfaceRadiation)
      ? terraforming.surfaceRadiation
      : 0;
    return this.computeRangePenalty(entry, radiation);
  }

  calculateLandPreferencePenalty(terraforming, entry) {
    return this.calculateLandPreferencePenaltyDetails(terraforming, entry).totalPenalty;
  }

  calculateLandPreferencePenaltyDetails(terraforming, entry, zoneKeys, zoneWeights) {
    const result = {
      totalPenalty: 0,
      zonePenalties: {}
    };

    if (!entry || !terraforming || !terraforming.zonalCoverageCache) {
      return result;
    }

    const preference = entry.value ? `${entry.value}`.trim().toLowerCase() : '';
    if (preference !== 'land') {
      return result;
    }

    const severity = Number.isFinite(entry.severity) ? entry.severity : 1;
    if (!severity) {
      return result;
    }

    const resolvedZones = Array.isArray(zoneKeys) && zoneKeys.length
      ? zoneKeys
      : (Array.isArray(zonesList) && zonesList.length
        ? zonesList
        : Object.keys(terraforming.zonalCoverageCache));
    const zoneCount = resolvedZones.length || 1;
    const weights = zoneWeights || {};

    resolvedZones.forEach((zone) => {
      const cache = terraforming.zonalCoverageCache[zone];
      if (!cache) {
        return;
      }

      const liquidWater = Number.isFinite(cache.liquidWater) ? cache.liquidWater : 0;
      const liquidCo2 = Number.isFinite(cache.liquidCO2) ? cache.liquidCO2 : 0;
      const liquidMethane = Number.isFinite(cache.liquidMethane) ? cache.liquidMethane : 0;
      const combinedCoverage = Math.min(1, Math.max(0, liquidWater + liquidCo2 + liquidMethane));
      if (!combinedCoverage) {
        return;
      }

      const rawPenalty = combinedCoverage * severity;
      if (!rawPenalty) {
        return;
      }

      let weight = weights[zone];
      if (!Number.isFinite(weight) || weight <= 0) {
        weight = this.getZoneWeight(zone, zoneCount);
      }

      const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
      if (normalizedWeight) {
        result.totalPenalty += rawPenalty * normalizedWeight;
      }

      const previous = result.zonePenalties[zone] || 0;
      result.zonePenalties[zone] = previous + rawPenalty;
    });

    return result;
  }

  calculateInvasivenessGrowthPenalty(terraforming, entry) {
    return this.calculateInvasivenessGrowthPenaltyDetails(terraforming, entry).totalPenalty;
  }

  calculateInvasivenessGrowthPenaltyDetails(terraforming, entry, zoneKeys, zoneWeights) {
    const result = {
      totalPenalty: 0,
      zonePenalties: {}
    };

    if (!entry || !terraforming || !terraforming.zonalSurface) {
      return result;
    }

    const severity = Number.isFinite(entry.severity) ? entry.severity : 1;
    if (!severity) {
      return result;
    }

    const invasivenessDifference = this.getLifeDesignInvasiveness() - (Number.isFinite(entry.value) ? entry.value : 0);
    if (!invasivenessDifference) {
      return result;
    }

    const resolvedZones = Array.isArray(zoneKeys) && zoneKeys.length
      ? zoneKeys
      : (Array.isArray(zonesList) && zonesList.length
        ? zonesList
        : Object.keys(terraforming.zonalSurface));
    const zoneCount = resolvedZones.length || 1;
    const weights = zoneWeights || {};

    resolvedZones.forEach((zone) => {
      const density = this.calculateZoneLifeDensity(terraforming, zone);
      if (!density) {
        return;
      }

      const rawPenalty = density * invasivenessDifference * severity;
      if (!rawPenalty) {
        return;
      }

      let weight = weights[zone];
      if (!Number.isFinite(weight) || weight <= 0) {
        weight = this.getZoneWeight(zone, zoneCount);
      }

      const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
      if (normalizedWeight) {
        result.totalPenalty += rawPenalty * normalizedWeight;
      }

      const previous = result.zonePenalties[zone] || 0;
      result.zonePenalties[zone] = previous + rawPenalty;
    });

    return result;
  }

  calculateZoneLifeDensity(terraforming, zone) {
    const zoneData = terraforming.zonalSurface && terraforming.zonalSurface[zone];
    if (!zoneData) {
      return 0;
    }

    const biomass = Number.isFinite(zoneData.biomass) ? zoneData.biomass : 0;
    if (!biomass) {
      return 0;
    }

    const surfaceArea = terraforming.celestialParameters && Number.isFinite(terraforming.celestialParameters.surfaceArea)
      ? terraforming.celestialParameters.surfaceArea
      : 0;
    if (!surfaceArea) {
      return 0;
    }

    const percentage = getZonePercentageHelper ? getZonePercentageHelper(zone) : 0;
    if (!percentage) {
      return 0;
    }

    const zoneArea = surfaceArea * percentage;
    if (!zoneArea) {
      return 0;
    }

    return biomass / zoneArea;
  }

  getLifeDesignInvasiveness() {
    let designer = null;

    if (typeof lifeDesigner !== 'undefined' && lifeDesigner) {
      designer = lifeDesigner;
    } else if (typeof window !== 'undefined' && window.lifeDesigner) {
      designer = window.lifeDesigner;
    } else if (typeof global !== 'undefined' && global.lifeDesigner) {
      designer = global.lifeDesigner;
    }

    if (!designer || !designer.currentDesign || !designer.currentDesign.invasiveness) {
      return 0;
    }

    const value = designer.currentDesign.invasiveness.value;
    return Number.isFinite(value) ? value : 0;
  }

  getZoneWeight(zone, zoneCount) {
    if (typeof getZonePercentageHelper === 'function') {
      const percentage = getZonePercentageHelper(zone);
      if (Number.isFinite(percentage) && percentage > 0) {
        return percentage;
      }
    }

    return zoneCount > 0 ? 1 / zoneCount : 0;
  }

  getPenaltyValue(penalty) {
    if (!penalty) {
      return 0;
    }

    const value = Number.isFinite(penalty.value) ? penalty.value : 0;
    const severity = Number.isFinite(penalty.severity) ? penalty.severity : 1;
    return value * severity;
  }

  applyHazardEffects(context = {}) {
    if (!context || typeof context.addEffect !== 'function') {
      return;
    }

    const {
      addEffect: applyEffect,
      structures = {},
      colonies = {},
      buildings = {},
      populationModule = null,
    } = context;

    const penaltyMultipliers = this.getPenaltyMultipliers();
    const buildCostMultiplier = penaltyMultipliers.buildCost;
    const maintenanceMultiplier = penaltyMultipliers.maintenanceCost;
    const populationMultiplier = penaltyMultipliers.populationGrowth;

    Object.keys(structures).forEach((id) => {
      const structure = structures[id];
      if (!structure || !structure.cost) {
        return;
      }

      const target = Object.prototype.hasOwnProperty.call(colonies, id)
        ? 'colony'
        : 'building';

      Object.keys(structure.cost).forEach((category) => {
        const categoryCosts = structure.cost[category];
        if (!categoryCosts) {
          return;
        }

        Object.keys(categoryCosts).forEach((resource) => {
          applyEffect({
            effectId: `hazardBuildCostPenalty-${category}-${resource}`,
            target,
            targetId: id,
            type: 'resourceCostMultiplier',
            resourceCategory: category,
            resourceId: resource,
            value: buildCostMultiplier,
            sourceId: 'hazardPenalties',
          });
        });
      });
    });

    Object.keys(buildings).forEach((id) => {
      if (!buildings[id]) {
        return;
      }

      applyEffect({
        effectId: 'hazardMaintenancePenalty',
        target: 'building',
        targetId: id,
        type: 'maintenanceMultiplier',
        value: maintenanceMultiplier,
        sourceId: 'hazardPenalties',
      });
    });

    Object.keys(colonies).forEach((id) => {
      applyEffect({
        effectId: 'hazardMaintenancePenalty',
        target: 'colony',
        targetId: id,
        type: 'maintenanceMultiplier',
        value: maintenanceMultiplier,
        sourceId: 'hazardPenalties',
      });
    });

    if (populationModule) {
      applyEffect({
        effectId: 'hazardPopulationPenalty',
        target: 'population',
        type: 'growthMultiplier',
        value: populationMultiplier,
        sourceId: 'hazardPenalties',
      });
    }
  }
}

function setHazardManager(instance) {
  hazardManager = instance;

  if (typeof window !== 'undefined') {
    window.hazardManager = hazardManager;
  } else if (typeof global !== 'undefined') {
    global.hazardManager = hazardManager;
  }

  return hazardManager;
}

if (typeof window !== 'undefined') {
  window.HazardManager = HazardManager;
  window.setHazardManager = setHazardManager;
} else if (typeof global !== 'undefined') {
  global.HazardManager = HazardManager;
  global.setHazardManager = setHazardManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HazardManager, setHazardManager };
}
