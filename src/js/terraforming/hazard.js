let hazardManager = null;
let getZonePercentageHelper;
let zonesList;

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
    this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers();

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

    const incoming = data && typeof data === 'object' ? data.parameters || {} : {};
    this.initialize(incoming);
  }

  update(deltaTime = 0, terraforming = null) {
    if (!terraforming || !terraforming.zonalSurface) {
      this.updateHazardousLandReservation(null);
      return;
    }

    const hazardous = this.parameters.hazardousBiomass;
    const growth = hazardous && hazardous.baseGrowth;

    if (deltaTime && hazardous && growth && getZonePercentageHelper) {
      const growthPercent = Number.isFinite(growth.value) ? growth.value : 0;
      const maxDensity = Number.isFinite(growth.maxDensity) ? growth.maxDensity : 0;
      const surfaceArea = terraforming.celestialParameters && terraforming.celestialParameters.surfaceArea;

      if (growthPercent && maxDensity > 0 && surfaceArea && surfaceArea > 0) {
        const growthRate = growthPercent / 100;
        const deltaSeconds = deltaTime / 1000;
        const zoneKeys = Array.isArray(zonesList) && zonesList.length
          ? zonesList
          : Object.keys(terraforming.zonalSurface);

        zoneKeys.forEach((zone) => {
          const zoneData = terraforming.zonalSurface[zone];
          if (!zoneData) {
            return;
          }

          const zoneArea = surfaceArea * getZonePercentageHelper(zone);
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

          const logisticTerm = 1 - currentBiomass / carryingCapacity;
          const deltaBiomass = growthRate * currentBiomass * logisticTerm * deltaSeconds / 1000;
          const nextBiomass = currentBiomass + deltaBiomass;
          const upperBound = carryingCapacity;

          if (nextBiomass <= 0) {
            zoneData.hazardousBiomass = 0;
            return;
          }

          zoneData.hazardousBiomass = nextBiomass > upperBound ? upperBound : nextBiomass;
        });
      }
    }

    this.updateHazardousLandReservation(terraforming);
  }

  updateHazardousLandReservation(terraforming) {
    if (typeof resources === 'undefined' || !resources || !resources.surface || !resources.surface.land) {
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

    const reservedLand = maxDensity > 0 ? totalBiomass / maxDensity : 0;

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

    this.cachedPenaltyMultipliers = this.calculatePenaltyMultipliers();
    return this.cachedPenaltyMultipliers;
  }

  calculatePenaltyMultipliers() {
    return {
      buildCost: this.calculatePenaltyMultiplier('buildCost', (penalty) => 1 + penalty),
      maintenanceCost: this.calculatePenaltyMultiplier('maintenanceCost', (penalty) => 1 + penalty),
      populationGrowth: this.calculatePenaltyMultiplier('populationGrowth', (penalty) => 1 / (1 + penalty)),
    };
  }

  calculatePenaltyMultiplier(key, transform) {
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

      const transformed = transform(penaltyValue);
      multiplier *= Number.isFinite(transformed) && transformed > 0 ? transformed : 1;
    });

    return multiplier;
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
