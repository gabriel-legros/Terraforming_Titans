function getDysonReceiverText(path, fallback, vars) {
  return t(path, vars, fallback);
}

class DysonReceiver extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.capActiveToDysonCapacity = false;
  }

  getReceiverEnergyPerBuilding() {
    return this.consumption?.space?.energy || this.production?.colony?.energy || 0;
  }

  getCollectorTotals() {
    const swarm = projectManager?.projects?.dysonSwarmReceiver;
    const sphere = projectManager?.projects?.dysonSphere;
    const swarmCollectors = swarm?.collectors || 0;
    const sphereCollectors = sphere?.isCompleted ? (sphere.collectors || 0) : 0;
    const swarmEnergy = swarmCollectors * (swarm?.energyPerCollector || 0);
    const sphereEnergy = sphere?.isCompleted
      ? (sphere.getTotalCollectorPower ? sphere.getTotalCollectorPower() : sphereCollectors * (sphere?.energyPerCollector || 0))
      : 0;
    return {
      swarmCollectors,
      sphereCollectors,
      totalCollectors: swarmCollectors + sphereCollectors,
      totalEnergy: swarmEnergy + sphereEnergy,
    };
  }

  getDysonCapacity() {
    const perBuilding = this.getReceiverEnergyPerBuilding();
    if (perBuilding <= 0) {
      return 0;
    }

    const { totalEnergy } = this.getCollectorTotals();
    if (totalEnergy <= 0) {
      return 0;
    }

    return Math.max(Math.floor(totalEnergy / perBuilding), 0);
  }

  getAutoBuildMaxModeLabel() {
    return 'Dyson Capacity';
  }

  hasAdjustableAutoBuildMaxTarget() {
    return true;
  }

  getAutoBuildMaxTargetCount() {
    const capacity = this.getDysonCapacity();
    if (capacity <= 0) {
      return 0;
    }
    const percent = Math.min(100, Math.max(0, this.autoBuildPercent || 0));
    return Math.ceil(capacity * percent / 100);
  }

  getAutoBuildMaxCount(reservePercent = 0, additionalReserves = null) {
    const base = super.getAutoBuildMaxCount(reservePercent, additionalReserves);
    if (this.autoBuildBasis !== 'max') {
      return base;
    }

    const target = this.getAutoBuildMaxTargetCount();
    if (target <= 0) {
      return 0;
    }

    const remaining = Math.max(target - this.countNumber, 0);
    return Math.min(base, remaining);
  }

  shouldClampSetActiveToSupported() {
    return this.capActiveToDysonCapacity === true;
  }

  getSupportedActiveCap() {
    return this.getDysonCapacity();
  }

  getClampedSetActiveTargetCount(targetCount, structureCount = this.countNumber) {
    const desiredActive = Math.min(targetCount, structureCount);
    if (!this.shouldClampSetActiveToSupported()) {
      return desiredActive;
    }
    return Math.min(desiredActive, this.getSupportedActiveCap());
  }

  initUI(autoBuildContainer, cache) {
    super.initUI?.(autoBuildContainer, cache);
    this._ensureCapActiveToDysonCapacityToggle(autoBuildContainer, cache);
  }

  updateUI(cache) {
    super.updateUI?.(cache);
    this._syncCapActiveToDysonCapacityToggle(cache);
  }

  _ensureCapActiveToDysonCapacityToggle(autoBuildContainer, cache = {}) {
    if (!autoBuildContainer) {
      return;
    }

    let container = cache.capActiveDysonCapacityContainer;
    let checkbox = cache.capActiveDysonCapacityCheckbox;

    if (!container || !container.isConnected || !checkbox) {
      container = document.createElement('div');
      container.classList.add('dyson-receiver-cap-active-supported-toggle');

      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${this.name}-cap-active-dyson-capacity-checkbox`;
      checkbox.classList.add('dyson-receiver-cap-active-supported-checkbox');
      checkbox.addEventListener('change', () => {
        this.capActiveToDysonCapacity = checkbox.checked;
        updateBuildingDisplay(buildings);
      });

      const text = document.createElement('label');
      text.htmlFor = checkbox.id;
      text.textContent = getDysonReceiverText(
        'ui.buildings.dysonReceiver.capToDysonCapacity',
        'Cap to Dyson Capacity'
      );

      container.appendChild(checkbox);
      container.appendChild(text);

      cache.capActiveDysonCapacityContainer = container;
      cache.capActiveDysonCapacityCheckbox = checkbox;
    }

    const targetContainer = cache.autoBuildTargetContainer || autoBuildContainer;
    const reference = cache.setTargetButtonContainer || cache.reverseControl;
    if (container.parentElement !== targetContainer) {
      if (reference && reference.parentElement === targetContainer) {
        targetContainer.insertBefore(container, reference);
      } else {
        targetContainer.appendChild(container);
      }
    }

    this._syncCapActiveToDysonCapacityToggle(cache);
  }

  _syncCapActiveToDysonCapacityToggle(cache = {}) {
    const checkbox = cache.capActiveDysonCapacityCheckbox;
    if (!checkbox) {
      return;
    }
    checkbox.checked = this.capActiveToDysonCapacity === true;
  }

  saveState() {
    return {
      ...super.saveState(),
      capActiveToDysonCapacity: this.capActiveToDysonCapacity === true
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.capActiveToDysonCapacity = state.capActiveToDysonCapacity === true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DysonReceiver, dysonReceiver: DysonReceiver };
} else {
  if (typeof window !== 'undefined') {
    window.DysonReceiver = DysonReceiver;
    window.dysonReceiver = DysonReceiver;
  } else if (typeof global !== 'undefined') {
    global.DysonReceiver = DysonReceiver;
    global.dysonReceiver = DysonReceiver;
  }
}
