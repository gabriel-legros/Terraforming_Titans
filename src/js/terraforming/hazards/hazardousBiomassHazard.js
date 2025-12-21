let getZonePercentageHelper;
let zonesList;

const HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER = 5;

try {
  window.hazardousBiomassRemovalConstant = HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER;
} catch (error) {
  try {
    global.hazardousBiomassRemovalConstant = HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER;
  } catch (innerError) {
    // Environment without window/global exposure (tests)
  }
}

try {
  ({ getZonePercentage: getZonePercentageHelper, ZONES: zonesList } = require('../zones.js'));
} catch (error) {
  try {
    getZonePercentageHelper = getZonePercentage;
    zonesList = ZONES;
  } catch (innerError) {
    getZonePercentageHelper = null;
    zonesList = null;
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

class HazardousBiomassHazard {
  constructor(manager) {
    this.manager = manager;
  }

  normalize(parameters) {
    return normalizeHazardousBiomassParameters(parameters);
  }

  getReductionPerCrusaderPerSecond() {
    return HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER;
  }

  getZoneKeys(terraforming) {
    if (Array.isArray(zonesList) && zonesList.length) {
      return zonesList;
    }

    if (terraforming && terraforming.zonalSurface) {
      return Object.keys(terraforming.zonalSurface);
    }

    return [];
  }

  hasHazard(terraforming) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    if (terraforming && terraforming.zonalSurface) {
      const zoneKeys = this.getZoneKeys(terraforming);
      for (let index = 0; index < zoneKeys.length; index += 1) {
        const zone = zoneKeys[index];
        const biomass = terraforming.zonalSurface[zone]?.hazardousBiomass;
        if (Number.isFinite(biomass) && biomass > 0) {
          return true;
        }
      }
    }

    const hazardousResource = resourcesState?.surface?.hazardousBiomass;
    const hazardousValue = Number.isFinite(hazardousResource?.value) ? hazardousResource.value : 0;
    return hazardousValue > 0;
  }

  isCleared(terraforming) {
    return !this.hasHazard(terraforming);
  }

  ensureCrusaderPresence(terraforming) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const crusaders = resourcesState?.special?.crusaders;
    if (!crusaders || !crusaders.unlocked) {
      return;
    }

    if (!this.hasHazard(terraforming)) {
      return;
    }

    const currentValue = Number.isFinite(crusaders.value) ? crusaders.value : 0;
    if (currentValue < 10) {
      crusaders.value = 10;
    }
  }

  updateHazardousLandReservation(terraforming, hazardParameters) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const landResource = resourcesState?.surface?.land;
    if (!landResource) {
      this.manager.updateHazardousBiomassControl(0);
      return;
    }

    const baseGrowth = hazardParameters && hazardParameters.baseGrowth;
    const maxDensity = baseGrowth && Number.isFinite(baseGrowth.maxDensity) && baseGrowth.maxDensity > 0
      ? baseGrowth.maxDensity
      : 0;

    let totalBiomass = 0;

    if (terraforming && terraforming.zonalSurface) {
      const zoneKeys = this.getZoneKeys(terraforming);
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
    this.manager.updateHazardousBiomassControl(controlShare);

    if (landResource.setReservedAmountForSource && landResource.setReservedAmountForSource.call) {
      landResource.setReservedAmountForSource('hazardousBiomass', reservedLand);
      return;
    }

    const previous = landResource._hazardousBiomassReserved || 0;
    landResource.reserved = Math.max(0, landResource.reserved - previous + reservedLand);
    landResource._hazardousBiomassReserved = reservedLand;
  }

  update(deltaTime, terraforming, hazardParameters) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const hazardResource = resourcesState?.surface?.hazardousBiomass || null;
    let growthDelta = 0;
    let crusaderDelta = 0;
    const growth = hazardParameters && hazardParameters.baseGrowth;
    const zoneKeys = this.getZoneKeys(terraforming);
    const zoneEntries = zoneKeys
      .map((zone) => ({ zone, data: terraforming?.zonalSurface?.[zone] }))
      .filter((entry) => entry.data);
    const deltaSeconds = deltaTime > 0 ? deltaTime / 1000 : 0;

    if (deltaTime && hazardParameters && growth && getZonePercentageHelper && zoneEntries.length) {
      const growthPercent = Number.isFinite(growth.value) ? growth.value : 0;
      const maxDensity = Number.isFinite(growth.maxDensity) ? growth.maxDensity : 0;
      const landArea = terraforming.initialLand;

      if (growthPercent && maxDensity > 0) {
        const penaltyDetails = this.calculateGrowthPenaltyDetails(hazardParameters, terraforming);
        const globalPenalty = penaltyDetails.globalPenalty;
        const zonePenaltyMap = penaltyDetails.zonePenalties || {};

        zoneEntries.forEach(({ zone, data }) => {
          const zoneArea = landArea * getZonePercentageHelper(zone);
          if (!zoneArea) {
            return;
          }

          const currentBiomass = Number.isFinite(data.hazardousBiomass)
            ? data.hazardousBiomass
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
            data.hazardousBiomass = 0;
            return;
          }

          if (nextBiomass > upperBound) {
            growthDelta += upperBound - currentBiomass;
            data.hazardousBiomass = upperBound;
            return;
          }

          growthDelta += deltaBiomass;
          data.hazardousBiomass = nextBiomass;
        });
      }
    }

    if (deltaSeconds > 0 && HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER > 0 && zoneEntries.length) {
      const crusaderCount = Number.isFinite(resourcesState?.special?.crusaders?.value)
        ? resourcesState.special.crusaders.value
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
          let remainingReduction = totalReduction;

          const targetZone = this.manager.getCrusaderTargetZone();
          let focusEntry = null;

          if (targetZone && targetZone !== 'any') {
            for (let index = 0; index < zoneEntries.length; index += 1) {
              const candidate = zoneEntries[index];
              if (candidate && candidate.zone === targetZone) {
                focusEntry = candidate;
                break;
              }
            }
          }

          if (focusEntry) {
            const focusData = focusEntry.data;
            const previousValue = Number.isFinite(focusData.hazardousBiomass) ? focusData.hazardousBiomass : 0;
            if (previousValue > 0) {
              const appliedReduction = remainingReduction < previousValue ? remainingReduction : previousValue;
              const nextValue = previousValue - appliedReduction;
              if (appliedReduction > 0) {
                crusaderDelta -= appliedReduction;
                focusData.hazardousBiomass = nextValue > 0 ? nextValue : 0;
                remainingReduction -= appliedReduction;
              }
            }
          }

          if (remainingReduction > 0) {
            const availableBiomass = zoneEntries.reduce((sum, entry) => {
              const zoneBiomass = Number.isFinite(entry.data.hazardousBiomass)
                ? entry.data.hazardousBiomass
                : 0;
              return zoneBiomass > 0 ? sum + zoneBiomass : sum;
            }, 0);

            if (availableBiomass > 0) {
              const baseRemaining = remainingReduction;
              let sharedReduction = 0;

              zoneEntries.forEach((entry) => {
                const zoneBiomass = Number.isFinite(entry.data.hazardousBiomass)
                  ? entry.data.hazardousBiomass
                  : 0;
                if (zoneBiomass <= 0) {
                  return;
                }

                const share = zoneBiomass / availableBiomass;
                let desiredReduction = baseRemaining * share;
                if (desiredReduction > zoneBiomass) {
                  desiredReduction = zoneBiomass;
                }

                if (!desiredReduction) {
                  return;
                }

                const nextValue = zoneBiomass - desiredReduction;
                crusaderDelta -= desiredReduction;
                entry.data.hazardousBiomass = nextValue > 0 ? nextValue : 0;
                sharedReduction += desiredReduction;
              });

              if (sharedReduction > 0) {
                remainingReduction -= sharedReduction;
              }
            }
          }
        }
      }
    }

    if (deltaSeconds > 0 && hazardResource && hazardResource.modifyRate) {
      if (growthDelta) {
        const growthRate = growthDelta / deltaSeconds;
        const growthLabel = growthRate < 0 ? 'Hazard Decay' : 'Hazard Growth';
        hazardResource.modifyRate(growthRate, growthLabel, 'terraforming');
      }

      if (crusaderDelta) {
        hazardResource.modifyRate(crusaderDelta / deltaSeconds, 'Crusader Patrols', 'terraforming');
      }
    }

    this.updateHazardousLandReservation(terraforming, hazardParameters);
  }

  calculateGrowthPenalty(hazardParameters, terraforming) {
    return this.calculateGrowthPenaltyDetails(hazardParameters, terraforming).totalPenalty;
  }

  calculateGrowthPenaltyDetails(hazardousParameters, terraforming) {
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

  calculateLandPreferencePenaltyDetails(terraforming, entry, zoneKeys, zoneWeights) {
    const result = {
      totalPenalty: 0,
      zonePenalties: {}
    };

    if (!entry || !terraforming || !terraforming.zonalCoverageCache) {
      return result;
    }

    const preference = entry.value ? `${entry.value}`.trim().toLowerCase() : '';
    if (preference !== 'land' && preference !== 'liquid') {
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
      const penaltyCoverage = preference === 'land'
        ? combinedCoverage
        : Math.max(0, 1 - combinedCoverage);
      if (!penaltyCoverage) {
        return;
      }

      const rawPenalty = penaltyCoverage * severity;
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

    try {
      designer = lifeDesigner;
    } catch (error) {
      designer = null;
    }

    if (!designer) {
      try {
        designer = window.lifeDesigner;
      } catch (error) {
        designer = null;
      }
    }

    if (!designer) {
      try {
        designer = global.lifeDesigner;
      } catch (error) {
        designer = null;
      }
    }

    if (!designer || !designer.currentDesign || !designer.currentDesign.invasiveness) {
      return 0;
    }

    const value = designer.currentDesign.invasiveness.value;
    return Number.isFinite(value) ? value : 0;
  }

  getZoneWeight(zone, zoneCount) {
    if (getZonePercentageHelper && getZonePercentageHelper.call) {
      const percentage = getZonePercentageHelper(zone);
      if (Number.isFinite(percentage) && percentage > 0) {
        return percentage;
      }
    }

    return zoneCount > 0 ? 1 / zoneCount : 0;
  }
}

try {
  window.HazardousBiomassHazard = HazardousBiomassHazard;
} catch (error) {
  try {
    global.HazardousBiomassHazard = HazardousBiomassHazard;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = {
    HazardousBiomassHazard,
    HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER
  };
} catch (error) {
  // Module system not available in browser
}
