class DysonSphereProject extends DysonSwarmReceiverProject {
  constructor(config, name) {
    super(config, name);
    this.baseCollectorDuration = Math.max(1, this.baseCollectorDuration / 100);
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
      swarm.collectors = 0;
    }
    if (typeof swarm.applyPermanentProjectDisable === 'function') {
      swarm.applyPermanentProjectDisable({ value: true });
    } else {
      swarm.permanentlyDisabled = true;
      swarm.isActive = false;
      swarm.isPaused = false;
    }
    if (typeof updateProjectUI === 'function') {
      updateProjectUI('dysonSwarmReceiver');
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
      typeof state.autoDeployCollectors !== 'undefined'
    ) {
      this.autoDeployCollectors = state.autoDeployCollectors;
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
