const DYSON_POWER_PER_SPHERE = 5e25;
const DYSON_MAX_SPHERE_COUNT = 100_000_000_000;
const DYSON_OVERFLOW_SUPERALLOY_COST = 2_500_000;

class DysonSphereProject extends DysonSwarmReceiverProject {
  constructor(config, name) {
    super(config, name);
    this.baseCollectorDuration = Math.max(1, this.baseCollectorDuration / 100);
  }

  isAdditionalSpheresUnlocked() {
    return this.isBooleanFlagSet('additionalDysonSpheres');
  }

  getAllowedMaxSphereCount() {
    return this.isAdditionalSpheresUnlocked() ? DYSON_MAX_SPHERE_COUNT : 1;
  }

  getMaximumPowerValue() {
    return DYSON_POWER_PER_SPHERE * this.getAllowedMaxSphereCount();
  }

  getRawCollectorPower() {
    return (this.collectors || 0) * (this.energyPerCollector || 0);
  }

  getTotalCollectorPower() {
    return Math.min(this.getRawCollectorPower(), this.getMaximumPowerValue());
  }

  getDysonSphereCount() {
    if (!this.isCompleted) {
      return 0;
    }
    const power = this.getTotalCollectorPower();
    if (power <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(power / DYSON_POWER_PER_SPHERE));
  }

  getMaxCollectors() {
    const perCollector = this.energyPerCollector || 0;
    if (perCollector <= 0) {
      return 0;
    }
    return this.getMaximumPowerValue() / perCollector;
  }

  shouldApplyOverflowSurcharge() {
    if (!this.isAdditionalSpheresUnlocked()) {
      return false;
    }
    return this.getTotalCollectorPower() >= DYSON_POWER_PER_SPHERE;
  }

  getCollectorCost() {
    const baseCost = super.getCollectorCost();
    if (!this.shouldApplyOverflowSurcharge()) {
      return baseCost;
    }
    const adjusted = {};
    for (const category in baseCost) {
      adjusted[category] = { ...baseCost[category] };
    }
    if (!adjusted.colony) {
      adjusted.colony = {};
    }
    adjusted.colony.superalloys = (adjusted.colony.superalloys || 0) + DYSON_OVERFLOW_SUPERALLOY_COST;
    return adjusted;
  }

  absorbSwarmCollectors() {
    const swarmManager = (typeof projectManager !== 'undefined') ? projectManager : null;
    const swarm = swarmManager?.projects?.dysonSwarmReceiver;
    if (!swarm) {
      return;
    }
    const transferred = swarm.collectors || 0;
    if (transferred > 0) {
      this.collectors += transferred;
      this.clampCollectorTotals();
      swarm.collectors = 0;
    }
    if (typeof swarm.applyPermanentProjectDisable === 'function') {
      swarm.applyPermanentProjectDisable({ value: true });
    } else {
      swarm.permanentlyDisabled = true;
      swarm.isActive = false;
      swarm.isPaused = false;
    }
  }

  complete() {
    super.complete();
    this.absorbSwarmCollectors();
  }

  isVisible() {
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    return this.unlocked || this.collectors > 0 || this.isCompleted;
  }

  canStartCollector() {
    if (!this.isCompleted) {
      return false;
    }
    return super.canStartCollector();
  }

  update(delta) {
    super.update(delta);
    this.clampCollectorTotals();
  }

  renderUI(container) {
    if (typeof renderDysonSphereUI === 'function') {
      renderDysonSphereUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateDysonSphereUI === 'function') {
      updateDysonSphereUI(this);
    }
  }

  saveTravelState() {
    const state = {
      ...super.saveTravelState(),
      collectors: this.collectors,
    };
    if (typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart) {
      state.autoContinuousOperation = this.autoContinuousOperation;
      state.autoDeployCollectors = this.autoDeployCollectors;
    }
    return state;
  }

  loadState(state) {
    super.loadState(state);
    if (this.isCompleted) {
      this.absorbSwarmCollectors();
    }
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
    this.collectors = state.collectors || this.collectors || 0;
    if (
      typeof gameSettings !== 'undefined' &&
      gameSettings.preserveProjectAutoStart &&
      (typeof state.autoContinuousOperation !== 'undefined' || typeof state.autoDeployCollectors !== 'undefined')
    ) {
      this.autoContinuousOperation = state.autoContinuousOperation === true || state.autoDeployCollectors === true;
    }
    if (this.isCompleted || state.isCompleted) {
      this.isCompleted = true;
      if (typeof state.remainingTime === 'number') {
        this.remainingTime = state.remainingTime;
      } else {
        this.remainingTime = 0;
      }
      if (typeof state.startingDuration === 'number') {
        this.startingDuration = state.startingDuration;
      }
      this.absorbSwarmCollectors();
    }
  }
}

if (typeof window !== 'undefined') {
  window.DysonSphereProject = DysonSphereProject;
} else if (typeof global !== 'undefined') {
  global.DysonSphereProject = DysonSphereProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DysonSphereProject;
}
