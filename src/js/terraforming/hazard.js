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
    const serialized = JSON.stringify(cloned);
    const changed = serialized !== this.lastSerializedParameters;

    this.parameters = cloned;
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
