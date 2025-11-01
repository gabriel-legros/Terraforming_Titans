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

function normalizeHazardousBiomassParameters(parameters) {
  const source = isPlainObject(parameters) ? parameters : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
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
    this.updateUI();
  }

  initialize(parameters = {}) {
    const cloned = cloneHazardParameters(parameters);
    const normalized = normalizeHazardParameters(cloned);
    const serialized = JSON.stringify(normalized);
    const changed = serialized !== this.lastSerializedParameters;

    this.parameters = normalized;
    this.lastSerializedParameters = serialized;

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
    this.disable();

    const incoming = data && typeof data === 'object' ? data.parameters || {} : {};
    this.initialize(incoming);
  }

  update(deltaTime = 0, terraforming = null) {
    if (!deltaTime || !terraforming || !terraforming.zonalSurface) {
      return;
    }

    const hazardous = this.parameters.hazardousBiomass;
    if (!hazardous || !hazardous.baseGrowth) {
      return;
    }

    const growth = hazardous.baseGrowth;
    const growthPercent = Number.isFinite(growth.value) ? growth.value : 0;
    const severity = Number.isFinite(growth.severity) ? growth.severity : 1;
    const maxDensity = Number.isFinite(growth.maxDensity) ? growth.maxDensity : 0;

    if (!growthPercent || maxDensity <= 0) {
      return;
    }

    const surfaceArea = terraforming.celestialParameters && terraforming.celestialParameters.surfaceArea;
    if (!surfaceArea || surfaceArea <= 0 || !getZonePercentageHelper) {
      return;
    }

    const growthRate = (growthPercent / 100) * severity;
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
      const deltaBiomass = growthRate * currentBiomass * logisticTerm * deltaTime;
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
