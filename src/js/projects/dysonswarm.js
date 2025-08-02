class DysonSwarmReceiverProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.collectors = 0;
    this.baseCollectorDuration = 60000;
    this.collectorProgress = 0;
    this.autoDeployCollectors = false;
    this.collectorCost = {
      colony: { metal: 250000, electronics: 125000, components: 20000, glass: 4000,  }
    };
    this.energyPerCollector = 1000000000000;
  }

  get collectorDuration() {
    return this.getDurationWithTerraformBonus(this.baseCollectorDuration);
  }

  renderUI(container) {
    if (typeof renderDysonSwarmUI === 'function') {
      renderDysonSwarmUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateDysonSwarmUI === 'function') {
      updateDysonSwarmUI(this);
    }
  }

  canStartCollector() {
    if (!this.isCompleted) return false;
    if (this.collectorProgress > 0) return false;
    for (const cat in this.collectorCost) {
      for (const res in this.collectorCost[cat]) {
        if (resources[cat][res].value < this.collectorCost[cat][res]) return false;
      }
    }
    return true;
  }

  deductCollectorResources() {
    for (const cat in this.collectorCost) {
      for (const res in this.collectorCost[cat]) {
        resources[cat][res].decrease(this.collectorCost[cat][res]);
      }
    }
  }

  startCollector() {
    if (this.canStartCollector()) {
      this.deductCollectorResources();
      this.collectorProgress = this.collectorDuration;
      return true;
    }
    return false;
  }

  update(delta) {
    super.update(delta);
    if (this.isCompleted) {
      if (this.collectorProgress > 0) {
        this.collectorProgress -= delta;
        if (this.collectorProgress <= 0) {
          this.collectorProgress = 0;
          this.collectors += 1;
          if (this.autoDeployCollectors) this.startCollector();
        }
      } else if (this.autoDeployCollectors) {
        this.startCollector();
      }
    }
  }

  estimateCostAndGain() {
    if (this.isCompleted && this.collectors > 0) {
      const rate = this.collectors * this.energyPerCollector;
      resources.colony.energy.modifyRate(rate, 'Dyson Swarm', 'project');
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      collectors: this.collectors,
      collectorProgress: this.collectorProgress,
      autoDeployCollectors: this.autoDeployCollectors,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.collectors = state.collectors || 0;
    this.collectorProgress = state.collectorProgress || 0;
    this.autoDeployCollectors = state.autoDeployCollectors || false;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DysonSwarmReceiverProject = DysonSwarmReceiverProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DysonSwarmReceiverProject;
}