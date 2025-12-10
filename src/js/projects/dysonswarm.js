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
    this.continuousThreshold = 1000; // Duration threshold in ms below which collector deployment becomes continuous
    this.fractionalCollectors = 0; // Track partial collectors in continuous mode
    this.collectorShortfallLastTick = false;
  }

  isCollectorContinuous() {
    return this.collectorDuration < this.continuousThreshold;
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
    // In continuous mode, don't start discrete collectors
    if (this.isCollectorContinuous()) {
      return false;
    }
    if (this.canStartCollector()) {
      this.deductCollectorResources();
      this.collectorProgress = this.collectorDuration;
      return true;
    }
    return false;
  }

  update(delta) {
    super.update(delta);
    
    // Skip discrete collector logic in continuous mode - handled by applyCostAndGain
    if (this.isCollectorContinuous()) {
      return;
    }
    
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
    const totals = { cost: {}, gain: {} };
    
    // Only estimate if in continuous mode and auto-deploying
    if (!this.isCollectorContinuous() || !this.autoDeployCollectors) {
      return totals;
    }
    if (!this.isCompleted && this.collectors === 0) {
      return totals;
    }

    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    const duration = this.collectorDuration;
    const perSecondFactor = deltaTime > 0 ? 1000 / deltaTime : 0;
    const fraction = deltaTime / duration;
    
    for (const category in this.collectorCost) {
      if (!totals.cost[category]) totals.cost[category] = {};
      for (const resource in this.collectorCost[category]) {
        const baseCost = this.collectorCost[category][resource];
        const tickAmount = baseCost * fraction * (applyRates ? productivity : 1);
        if (applyRates && resources[category]?.[resource]) {
          const colonyAvailable = resources[category][resource].value;
          let colonyPortion = tickAmount;
          if (storageProj) {
            const key = resource === 'water' ? 'liquidWater' : resource;
            if (storageProj.prioritizeMegaProjects) {
              const storageAvailable = storageProj.getAvailableStoredResource(key);
              colonyPortion = Math.max(tickAmount - storageAvailable, 0);
            } else {
              colonyPortion = Math.min(colonyAvailable, tickAmount);
            }
          }
          const colonyRate = Math.min(colonyPortion, colonyAvailable) * perSecondFactor;
          if (colonyRate > 0) {
            resources[category][resource].modifyRate(
              -colonyRate,
              'Dyson Swarm Collectors',
              'project'
            );
          }
        }
        totals.cost[category][resource] =
          (totals.cost[category][resource] || 0) + baseCost * fraction;
      }
    }
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    // Only apply continuous mode if enabled and auto-deploying
    if (!this.isCollectorContinuous() || !this.autoDeployCollectors) {
      return;
    }
    if (!this.isCompleted && this.collectors === 0) {
      return;
    }

    this.collectorShortfallLastTick = false;
    const duration = this.collectorDuration;
    const fraction = deltaTime / duration;

    // Check if we have enough resources
    let shortfall = false;
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    
    for (const category in this.collectorCost) {
      for (const resource in this.collectorCost[category]) {
        const amount = this.collectorCost[category][resource] * fraction * productivity;
        let available = resources[category]?.[resource]?.value || 0;
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          available += storageProj.getAvailableStoredResource(key);
        }
        if (available < amount) {
          shortfall = true;
        }
      }
    }

    // Deduct resources proportionally
    for (const category in this.collectorCost) {
      for (const resource in this.collectorCost[category]) {
        let remaining = this.collectorCost[category][resource] * fraction * productivity;
        
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          if (storageProj.prioritizeMegaProjects) {
            const fromStorage = Math.min(storageProj.getAvailableStoredResource(key), remaining);
            if (fromStorage > 0) {
              storageProj.resourceUsage[key] -= fromStorage;
              storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
              if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
              remaining -= fromStorage;
            }
            if (remaining > 0) {
              if (accumulatedChanges) {
                if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
                if (accumulatedChanges[category][resource] === undefined) {
                  accumulatedChanges[category][resource] = 0;
                }
                accumulatedChanges[category][resource] -= remaining;
              } else {
                resources[category][resource].decrease(remaining);
              }
            }
          } else {
            const fromColony = Math.min(resources[category][resource].value, remaining);
            if (fromColony > 0) {
              if (accumulatedChanges) {
                if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
                if (accumulatedChanges[category][resource] === undefined) {
                  accumulatedChanges[category][resource] = 0;
                }
                accumulatedChanges[category][resource] -= fromColony;
              } else {
                resources[category][resource].decrease(fromColony);
              }
              remaining -= fromColony;
            }
            if (remaining > 0) {
              const fromStorage = Math.min(storageProj.getAvailableStoredResource(key), remaining);
              if (fromStorage > 0) {
                storageProj.resourceUsage[key] -= fromStorage;
                storageProj.usedStorage = Math.max(0, storageProj.usedStorage - fromStorage);
                if (storageProj.resourceUsage[key] <= 0) delete storageProj.resourceUsage[key];
              }
            }
          }
        } else {
          if (accumulatedChanges) {
            if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
            if (accumulatedChanges[category][resource] === undefined) {
              accumulatedChanges[category][resource] = 0;
            }
            accumulatedChanges[category][resource] -= remaining;
          } else {
            resources[category][resource].decrease(remaining);
          }
        }
      }
    }

    // Add fractional collectors
    const collectorGain = fraction * productivity;
    this.fractionalCollectors += collectorGain;
    
    // Convert fractional collectors to whole collectors
    while (this.fractionalCollectors >= 1) {
      this.fractionalCollectors -= 1;
      this.collectors += 1;
    }

    this.collectorShortfallLastTick = shortfall;
    
    if (storageProj && typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storageProj);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      collectors: this.collectors,
      collectorProgress: this.collectorProgress,
      autoDeployCollectors: this.autoDeployCollectors,
      fractionalCollectors: this.fractionalCollectors,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.collectors = state.collectors || 0;
    this.collectorProgress = state.collectorProgress || 0;
    this.autoDeployCollectors = state.autoDeployCollectors || false;
    this.fractionalCollectors = state.fractionalCollectors || 0;
  }

  saveTravelState() {
    const state = { ...super.saveTravelState(), collectors: this.collectors };
    if (typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart) {
      state.autoDeployCollectors = this.autoDeployCollectors;
    }
    return state;
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
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
