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
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const cat in this.collectorCost) {
      for (const res in this.collectorCost[cat]) {
        const required = this.collectorCost[cat][res];
        if (storageProj) {
          const key = res === 'water' ? 'liquidWater' : res;
          const stored = storageProj.resourceUsage[key] || 0;
          const available = resources[cat][res].value + stored;
          if (available < required) return false;
        } else if (resources[cat][res].value < required) {
          return false;
        }
      }
    }
    return true;
  }

  deductCollectorResources() {
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const cat in this.collectorCost) {
      for (const res in this.collectorCost[cat]) {
        let remaining = this.collectorCost[cat][res];
        if (storageProj) {
          const key = res === 'water' ? 'liquidWater' : res;
          if (storageProj.prioritizeMegaProjects) {
            const fromStorage = Math.min(storageProj.resourceUsage[key] || 0, remaining);
            if (fromStorage > 0) {
              storageProj.resourceUsage[key] -= fromStorage;
              storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
              if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
              remaining -= fromStorage;
            }
            if (remaining > 0) {
              resources[cat][res].decrease(remaining);
            }
          } else {
            const fromColony = Math.min(resources[cat][res].value, remaining);
            if (fromColony > 0) {
              resources[cat][res].decrease(fromColony);
              remaining -= fromColony;
            }
            if (remaining > 0) {
              const fromStorage = Math.min(storageProj.resourceUsage[key] || 0, remaining);
              if (fromStorage > 0) {
                storageProj.resourceUsage[key] -= fromStorage;
                storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
                if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
                remaining -= fromStorage;
              }
            }
          }
        } else {
          resources[cat][res].decrease(remaining);
        }
      }
    }
    if (storageProj && typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storageProj);
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

  estimateCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (this.isCompleted && this.collectors > 0) {
      const rate = this.collectors * this.energyPerCollector;
      resources.colony.energy.modifyRate(rate, 'Dyson Swarm', 'project');
      totals.gain.colony = { energy: rate * (deltaTime / 1000) };
    }
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = {}) {
    if (this.isCompleted && this.collectors > 0) {
      const rate = this.collectors * this.energyPerCollector;
      const energyGain = rate * (deltaTime / 1000) * (productivity.colony?.energy ?? 1);
      if (accumulatedChanges) {
        accumulatedChanges.colony.energy += energyGain;
      } else if (resources.colony?.energy) {
        resources.colony.energy.increase(energyGain);
      }
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

  saveTravelState() {
    return { collectors: this.collectors };
  }

  loadTravelState(state = {}) {
    this.collectors = state.collectors || 0;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DysonSwarmReceiverProject = DysonSwarmReceiverProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DysonSwarmReceiverProject;
}