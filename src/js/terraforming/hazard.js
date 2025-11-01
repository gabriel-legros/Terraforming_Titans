let hazardManager = null;

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
    normalized.baseGrowth = { value: 0, severity: 1 };
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
