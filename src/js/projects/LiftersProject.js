const LIFTER_MODES = {
  GAS_HARVEST: 'gasHarvest',
  ATMOSPHERE_STRIP: 'stripAtmosphere',
};

let dysonManagerInstance = null;

if (typeof module !== 'undefined' && module.exports) {
  dysonManagerInstance = require('../dyson-manager.js');
} else if (typeof window !== 'undefined') {
  dysonManagerInstance = window.dysonManager || null;
}

class LiftersProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.unitRatePerLifter = this.attributes.lifterUnitRate || 1_000_000;
    this.energyPerUnit = this.attributes.lifterEnergyPerUnit || 10_000_000;
    this.mode = LIFTER_MODES.GAS_HARVEST;
    this.isRunning = false;
    this.lastUnitsPerSecond = 0;
    this.lastEnergyPerSecond = 0;
    this.lastHydrogenPerSecond = 0;
    this.lastAtmospherePerSecond = 0;
    this.lastDysonEnergyPerSecond = 0;
    this.statusText = 'Idle';
    this.shortfallLastTick = false;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  getModeOptions() {
    return [
      { value: LIFTER_MODES.GAS_HARVEST, label: 'Gas Giant Harvest' },
      { value: LIFTER_MODES.ATMOSPHERE_STRIP, label: 'Atmosphere Strip' },
    ];
  }

  getUnitsPerSecond(productivity = 1) {
    return this.repeatCount * this.unitRatePerLifter * productivity;
  }

  shouldOperate() {
    if (this.isPermanentlyDisabled?.()) {
      return false;
    }
    return this.isRunning && this.repeatCount > 0;
  }

  setMode(value) {
    const next = value === LIFTER_MODES.ATMOSPHERE_STRIP
      ? LIFTER_MODES.ATMOSPHERE_STRIP
      : LIFTER_MODES.GAS_HARVEST;
    if (this.mode !== next) {
      this.mode = next;
      this.updateUI();
    }
  }

  setRunning(shouldRun) {
    const next = shouldRun === true;
    if (this.isRunning !== next) {
      this.isRunning = next;
      if (!next) {
        this.setLastTickStats();
      }
      this.updateUI();
    }
  }

  getSpaceStorageProject() {
    return projectManager?.projects?.spaceStorage || null;
  }

  getDysonOverflowPerSecond() {
    return dysonManagerInstance?.getOverflowEnergyPerSecond?.() || 0;
  }

  getGasModeCapacityLimit() {
    const storage = this.getSpaceStorageProject();
    if (!storage || storage.maxStorage <= storage.usedStorage) {
      this.shortfallReason = storage ? 'Space storage is full' : 'Build space storage';
      return 0;
    }
    return storage.maxStorage - storage.usedStorage;
  }

  getAtmosphereLimit() {
    const gases = this.getAtmosphericResources();
    if (!gases.length) {
      this.shortfallReason = 'No atmosphere to strip';
      return 0;
    }
    return gases.reduce((sum, gas) => sum + gas.value, 0);
  }

  getAtmosphericResources() {
    const atmospheric = resources?.atmospheric;
    if (!atmospheric) {
      return [];
    }
    return Object.keys(atmospheric)
      .map((key) => ({
        key,
        ref: atmospheric[key],
        value: atmospheric[key]?.value || 0,
      }))
      .filter((entry) => entry.value > 0);
  }

  getModeLimit(maxUnits) {
    if (this.mode === LIFTER_MODES.ATMOSPHERE_STRIP) {
      const limit = this.getAtmosphereLimit();
      return Math.min(maxUnits, limit);
    }
    const limit = this.getGasModeCapacityLimit();
    return Math.min(maxUnits, limit);
  }

  storeHydrogen(amount) {
    if (amount <= 0) {
      return 0;
    }
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      this.shortfallReason = 'Build space storage';
      return 0;
    }
    const freeSpace = Math.max(storage.maxStorage - storage.usedStorage, 0);
    const stored = Math.min(amount, freeSpace);
    if (stored <= 0) {
      this.shortfallReason = 'Space storage is full';
      return 0;
    }
    storage.resourceUsage.hydrogen = (storage.resourceUsage.hydrogen || 0) + stored;
    storage.usedStorage += stored;
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storage);
    }
    return stored;
  }

  removeAtmosphere(amount, accumulatedChanges, seconds) {
    if (amount <= 0) {
      return 0;
    }
    const gases = this.getAtmosphericResources();
    const total = gases.reduce((sum, gas) => sum + gas.value, 0);
    if (total <= 0) {
      this.shortfallReason = 'No atmosphere to strip';
      return 0;
    }
    let remaining = amount;
    const perSecond = seconds > 0 ? amount / seconds : 0;
    gases.forEach((gas, index) => {
      const proportion = gas.value / total;
      let removed = amount * proportion;
      if (index === gases.length - 1) {
        removed = Math.min(removed, remaining);
      }
      remaining -= removed;
      if (accumulatedChanges && accumulatedChanges.atmospheric) {
        accumulatedChanges.atmospheric[gas.key] -= removed;
      } else if (gas.ref) {
        gas.ref.value = Math.max(0, gas.ref.value - removed);
      }
      gas.ref?.modifyRate?.(-(removed > 0 && seconds > 0 ? removed / seconds : 0), 'Lifting', 'project');
    });
    return amount - Math.max(remaining, 0);
  }

  consumeEnergy(energyRequired, deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    if (energyRequired <= 0 || seconds <= 0) {
      return {
        energyUsed: 0,
        colonyUsed: 0,
        dysonEnergyUsed: 0,
        dysonAvailable: this.getDysonOverflowPerSecond() * seconds,
      };
    }
    const colonyEnergy = resources?.colony?.energy;
    const pending = accumulatedChanges?.colony?.energy || 0;
    const canUseColonyEnergy = this.isColonyEnergyAllowed();
    const availableColony = (!canUseColonyEnergy || !colonyEnergy)
      ? 0
      : Math.max((colonyEnergy.value || 0) + pending, 0);
    const dysonAvailable = this.getDysonOverflowPerSecond() * seconds;
    const totalAvailable = availableColony + dysonAvailable;
    const energyUsed = Math.min(energyRequired, totalAvailable);
    const dysonEnergyUsed = Math.min(energyUsed, dysonAvailable);
    const colonyUsed = Math.min(Math.max(energyUsed - dysonEnergyUsed, 0), availableColony);
    const totalUsed = colonyUsed + dysonEnergyUsed;
    if (colonyUsed > 0 && colonyEnergy) {
      if (accumulatedChanges) {
        accumulatedChanges.colony ||= {};
        accumulatedChanges.colony.energy = (accumulatedChanges.colony.energy || 0) - colonyUsed;
      } else if (typeof colonyEnergy.decrease === 'function') {
        colonyEnergy.decrease(colonyUsed);
      } else {
        colonyEnergy.value = Math.max(0, (colonyEnergy.value || 0) - colonyUsed);
      }
    }
    return { energyUsed: totalUsed, colonyUsed, dysonEnergyUsed, dysonAvailable };
  }

  refundColonyEnergy(amount, accumulatedChanges) {
    if (!amount) {
      return;
    }
    const colonyEnergy = resources?.colony?.energy;
    if (accumulatedChanges) {
      accumulatedChanges.colony ||= {};
      accumulatedChanges.colony.energy = (accumulatedChanges.colony.energy || 0) + amount;
    } else if (colonyEnergy && typeof colonyEnergy.increase === 'function') {
      colonyEnergy.increase(amount);
    } else if (colonyEnergy) {
      colonyEnergy.value = (colonyEnergy.value || 0) + amount;
    }
  }

  adjustEnergyUsage(result, refund, accumulatedChanges) {
    if (refund <= 0) {
      return;
    }
    let remaining = refund;
    if (result.colonyUsed > 0) {
      const colonyRefund = Math.min(remaining, result.colonyUsed);
      this.refundColonyEnergy(colonyRefund, accumulatedChanges);
      result.colonyUsed -= colonyRefund;
      remaining -= colonyRefund;
    }
    if (remaining > 0) {
      result.dysonEnergyUsed = Math.max(0, result.dysonEnergyUsed - remaining);
      remaining = 0;
    }
    result.energyUsed = result.colonyUsed + result.dysonEnergyUsed;
  }

  setLastTickStats(units = 0, energy = 0, hydrogen = 0, atmosphere = 0, dyson = 0) {
    this.lastUnitsPerSecond = units;
    this.lastEnergyPerSecond = energy;
    this.lastHydrogenPerSecond = hydrogen;
    this.lastAtmospherePerSecond = atmosphere;
    this.lastDysonEnergyPerSecond = dyson;
  }

  updateStatus(text) {
    this.statusText = text || 'Idle';
    this.shortfallLastTick = Boolean(text && text !== 'Running' && text !== 'Idle');
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastTickStats();
      if (!this.repeatCount) {
        this.updateStatus('Complete at least one lifter');
      } else if (!this.isRunning) {
        this.updateStatus('Run disabled');
      }
      return;
    }

    const seconds = deltaTime / 1000;
    if (seconds <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      return;
    }

    this.shortfallReason = '';
    const maxUnits = this.getUnitsPerSecond(productivity) * seconds;
    if (maxUnits <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      return;
    }

    const limitedUnits = this.getModeLimit(maxUnits);
    if (limitedUnits <= 0) {
      this.setLastTickStats();
      this.updateStatus(this.shortfallReason || 'Waiting for capacity');
      return;
    }

    const energyNeeded = limitedUnits * this.energyPerUnit;
    const energyResult = this.consumeEnergy(energyNeeded, deltaTime, accumulatedChanges);
    if (energyResult.energyUsed <= 0) {
      this.setLastTickStats();
      const stalled = energyResult.dysonAvailable > 0 ? 'Waiting for space storage' : 'Insufficient energy';
      this.updateStatus(stalled);
      return;
    }

    let processedUnits = energyResult.energyUsed / this.energyPerUnit;
    let hydrogenRate = 0;
    let atmosphereRate = 0;

    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      processedUnits = this.storeHydrogen(processedUnits);
      if (processedUnits <= 0) {
        this.adjustEnergyUsage(energyResult, energyResult.energyUsed, accumulatedChanges);
        this.setLastTickStats();
        this.updateStatus(this.shortfallReason || 'Space storage is full');
        return;
      }
      hydrogenRate = processedUnits / seconds;
    } else {
      processedUnits = this.removeAtmosphere(processedUnits, accumulatedChanges, seconds);
      if (processedUnits <= 0) {
        this.adjustEnergyUsage(energyResult, energyResult.energyUsed, accumulatedChanges);
        this.setLastTickStats();
        this.updateStatus(this.shortfallReason || 'No atmosphere to strip');
        return;
      }
      atmosphereRate = processedUnits / seconds;
    }

    const actualEnergy = processedUnits * this.energyPerUnit;
    if (actualEnergy < energyResult.energyUsed) {
      this.adjustEnergyUsage(energyResult, energyResult.energyUsed - actualEnergy, accumulatedChanges);
    }

    const energyPerSecond = energyResult.energyUsed / seconds;
    const dysonPerSecond = energyResult.dysonEnergyUsed / seconds;
    const unitPerSecond = processedUnits / seconds;
    this.setLastTickStats(unitPerSecond, energyPerSecond, hydrogenRate, atmosphereRate, dysonPerSecond);
    this.updateStatus('Running');
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    if (!applyRates || !this.shouldOperate()) {
      return { cost: {}, gain: {} };
    }
    const seconds = deltaTime / 1000;
    const maxUnits = this.getUnitsPerSecond(productivity);
    let cappedUnits = maxUnits;
    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      cappedUnits = Math.min(maxUnits, this.getGasModeCapacityLimit());
    } else {
      cappedUnits = Math.min(maxUnits, this.getAtmosphereLimit());
    }
    if (cappedUnits <= 0) {
      return { cost: {}, gain: {} };
    }
    const energyRate = cappedUnits * this.energyPerUnit;
    if (!this.isColonyEnergyAllowed()) {
      return { cost: {}, gain: {} };
    }
    const colonyEnergy = resources?.colony?.energy;
    colonyEnergy?.modifyRate?.(-energyRate, 'Lifting', 'project');
    return { cost: { colony: { energy: energyRate * seconds } }, gain: {} };
  }

  renderUI(container) {
    if (typeof renderLiftersUI === 'function') {
      renderLiftersUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateLiftersUI === 'function') {
      updateLiftersUI(this);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      mode: this.mode,
      isRunning: this.isRunning,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
    this.isRunning = state.isRunning || false;
    if (!this.isRunning) {
      this.setLastTickStats();
      this.updateStatus('Idle');
    }
  }

  saveTravelState() {
    const state = { repeatCount: this.repeatCount, mode: this.mode };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    if (this.attributes?.canUseDysonOverflow) {
      state.allowColonyEnergyUse = this.allowColonyEnergyUse === true;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.repeatCount = state.repeatCount || 0;
    this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
    this.isRunning = false;
    this.isCompleted = false;
    this.setLastTickStats();
    this.updateStatus('Idle');
    if (this.attributes?.canUseDysonOverflow) {
      this.allowColonyEnergyUse = state.allowColonyEnergyUse === true;
    }
    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
      return;
    }
    this.isActive = false;
    const duration = this.getEffectiveDuration();
    this.startingDuration = duration;
    this.remainingTime = duration;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiftersProject;
} else if (typeof window !== 'undefined') {
  window.LiftersProject = LiftersProject;
}
