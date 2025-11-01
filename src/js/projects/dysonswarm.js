class DysonSwarmReceiverProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.collectors = 0;
    this.baseCollectorDuration = 60000;
    this.collectorProgress = 0;
    this.autoDeployCollectors = false;
    this.collectorCost = {
      colony: { metal: 2500000, electronics: 1250000, components: 200000, glass: 40000,  }
    };
    this.energyPerCollector = 10000000000000;
  }

  // Visible either when unlocked or when collectors already exist
  isVisible() {
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    return this.unlocked || this.collectors > 0;
  }

  get collectorDuration() {
    const duration = this.getDurationWithTerraformBonus(this.baseCollectorDuration);
    return this.applyDurationEffects(duration);
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
    if (this.collectorProgress > 0) return false;
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const cat in this.collectorCost) {
      for (const res in this.collectorCost[cat]) {
        const required = this.collectorCost[cat][res];
        if (storageProj) {
          const key = res === 'water' ? 'liquidWater' : res;
          const usable = storageProj.getAvailableStoredResource(key);
          const available = resources[cat][res].value + usable;
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
            const fromStorage = Math.min(storageProj.getAvailableStoredResource(key), remaining);
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
              const fromStorage = Math.min(storageProj.getAvailableStoredResource(key), remaining);
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
    if (this.collectorProgress > 0) {
      this.collectorProgress -= delta;
      if (this.collectorProgress <= 0) {
        this.collectorProgress = 0;
        this.collectors += 1;
        if (this.autoDeployCollectors && (this.isCompleted || this.collectors > 0)) this.startCollector();
      }
    } else if (this.autoDeployCollectors && (this.isCompleted || this.collectors > 0)) {
      this.startCollector();
    }
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    return { cost: {}, gain: {} };
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    // Dyson Swarm energy is now handled by the Dyson Receiver building.
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
    const state = { collectors: this.collectors };
    if (typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart) {
      state.autoDeployCollectors = this.autoDeployCollectors;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.collectors = state.collectors || 0;
    if (
      typeof gameSettings !== 'undefined' &&
      gameSettings.preserveProjectAutoStart &&
      typeof state.autoDeployCollectors !== 'undefined'
    ) {
      this.autoDeployCollectors = state.autoDeployCollectors;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DysonSwarmReceiverProject = DysonSwarmReceiverProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DysonSwarmReceiverProject;
}