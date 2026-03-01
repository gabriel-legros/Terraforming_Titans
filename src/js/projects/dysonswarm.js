let dysonSwarmManagerInstance = null;
let DysonContinuousExpansionBase = null;

if (typeof module !== 'undefined' && module.exports) {
  dysonSwarmManagerInstance = require('../dyson-manager.js');
} else if (typeof window !== 'undefined') {
  dysonSwarmManagerInstance = window.dysonManager || null;
}

try {
  DysonContinuousExpansionBase = ContinuousExpansionProject;
} catch (error) {}
try {
  DysonContinuousExpansionBase = require('./ContinuousExpansionProject.js');
} catch (error) {}
try {
  DysonContinuousExpansionBase = DysonContinuousExpansionBase || TerraformingDurationProject;
} catch (error) {}

class DysonSwarmReceiverProject extends DysonContinuousExpansionBase {
  constructor(config, name) {
    super(config, name);
    this.collectors = 0;
    this.baseCollectorDuration = 60000;
    this.collectorProgress = 0;
    this.autoContinuousOperation = false;
    Object.defineProperty(this, 'autoDeployCollectors', {
      configurable: true,
      enumerable: true,
      get: () => this.autoContinuousOperation === true,
      set: (value) => {
        this.autoContinuousOperation = value === true;
      }
    });
    this.collectorCost = {
      colony: { metal: 2500000, electronics: 1250000, components: 200000, glass: 40000,  }
    };
    this.energyPerCollector = 10000000000000;
    this.continuousThreshold = 1000; // Duration threshold in ms below which collector deployment becomes continuous
    this.fractionalCollectors = 0; // Track partial collectors in continuous mode
    this.collectorShortfallLastTick = false;
    this.lastCollectorColonyCost = null;
  }

  getCollectorCost() {
    return this.collectorCost;
  }

  getMaxCollectors() {
    return Infinity;
  }

  getCollectorHeadroom() {
    const maxCollectors = this.getMaxCollectors();
    if (maxCollectors === Infinity) {
      return Infinity;
    }
    return Math.max(maxCollectors - (this.collectors + this.fractionalCollectors), 0);
  }

  clampCollectorTotals() {
    const maxCollectors = this.getMaxCollectors();
    if (maxCollectors === Infinity) {
      return;
    }
    // Preserve legacy saves that already exceed the current cap.
    if (this.collectors >= maxCollectors) {
      this.fractionalCollectors = 0;
      return;
    }
    const remaining = maxCollectors - this.collectors;
    if (remaining <= 0) {
      this.fractionalCollectors = 0;
      return;
    }
    if (this.fractionalCollectors > remaining) {
      this.fractionalCollectors = remaining;
    }
  }

  isCollectorContinuous() {
    return this.collectorDuration < this.continuousThreshold;
  }

  isContinuous() {
    return false;
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
    const headroom = this.getCollectorHeadroom();
    if (headroom <= 0) return false;
    if (!this.isCollectorContinuous() && headroom < 1) return false;
    const collectorCost = this.getCollectorCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const cat in collectorCost) {
      for (const res in collectorCost[cat]) {
        const required = collectorCost[cat][res];
        const key = res === 'water' ? 'liquidWater' : res;
        const colonyAvailable = resources[cat][res].value;
        const available = getMegaProjectResourceAvailability(storageProj, key, colonyAvailable);
        if (available < required) return false;
      }
    }
    return true;
  }

  deductCollectorResources() {
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    const collectorCost = this.getCollectorCost();
    const colonyCost = {};
    for (const cat in collectorCost) {
      for (const res in collectorCost[cat]) {
        const amount = collectorCost[cat][res];
        let colonyUsed = amount;
        if (storageProj) {
          const key = res === 'water' ? 'liquidWater' : res;
          const colonyAvailable = resources[cat][res].value;
          const allocation = getMegaProjectResourceAllocation(storageProj, key, amount, colonyAvailable);
          colonyUsed = allocation.fromColony;
          if (allocation.fromColony > 0) {
            resources[cat][res].decrease(allocation.fromColony);
          }
          if (allocation.fromStorage > 0) {
            storageProj.spendStoredResource?.(key, allocation.fromStorage);
            storageProj.reconcileUsedStorage?.();
          }
        } else {
          resources[cat][res].decrease(amount);
        }
        if (colonyUsed > 0) {
          if (!colonyCost[cat]) colonyCost[cat] = {};
          colonyCost[cat][res] = (colonyCost[cat][res] || 0) + colonyUsed;
        }
      }
    }
    if (storageProj && typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storageProj);
    }
    return colonyCost;
  }

  startCollector() {
    // In continuous mode, don't start discrete collectors
    if (this.isCollectorContinuous()) {
      return false;
    }
    if (this.canStartCollector()) {
      this.lastCollectorColonyCost = this.deductCollectorResources();
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
        this.clampCollectorTotals();
        if (this.autoContinuousOperation && (this.isCompleted || this.collectors > 0)) this.startCollector();
      }
    } else if (this.autoContinuousOperation && (this.isCompleted || this.collectors > 0)) {
      this.startCollector();
    }
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges) {
    if (!accumulatedChanges) {
      return;
    }
    if (accumulatedChanges.dysonSpaceEnergyInjected === true) {
      return;
    }
    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return;
    }
    const collectorPowerPerSecond =
      dysonSwarmManagerInstance?.getTotalCollectorEnergyPerSecond?.()
      || dysonSwarmManagerInstance?.getOverflowEnergyPerSecond?.()
      || 0;
    const overflowAmount = Math.max(collectorPowerPerSecond * seconds, 0);
    accumulatedChanges.space ||= {};
    accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) + overflowAmount;
    if (collectorPowerPerSecond > 0) {
      resources?.space?.energy?.modifyRate?.(collectorPowerPerSecond, 'Dyson Collectors', 'project');
    }
    accumulatedChanges.dysonSpaceEnergyInjected = true;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    
    if (this.isCollectorContinuous()) {
      if (!this.autoContinuousOperation) {
        return totals;
      }
      if (!this.isCompleted && this.collectors === 0) {
        return totals;
      }
      const headroom = this.getCollectorHeadroom();
      if (headroom <= 0) {
        return totals;
      }
      const storageState = this.createExpansionStorageState(accumulatedChanges);
      const collectorCost = this.getCollectorCost();
      const duration = this.collectorDuration;
      const perSecondFactor = deltaTime > 0 ? 1000 / deltaTime : 0;
      const fraction = deltaTime / duration;
      const desiredCollectorGain = fraction * productivity;
      if (desiredCollectorGain <= 0) {
        return totals;
      }
      const requestedCollectorGain = Math.min(desiredCollectorGain, headroom);
      const collectorGain = this.getAffordableExpansionProgress(
        requestedCollectorGain,
        collectorCost,
        storageState,
        accumulatedChanges
      );
      if (collectorGain <= 0) {
        return totals;
      }
      const gainScale = collectorGain / desiredCollectorGain;
      
      for (const category in collectorCost) {
        if (!totals.cost[category]) totals.cost[category] = {};
        for (const resource in collectorCost[category]) {
          const baseCost = collectorCost[category][resource];
          const tickAmount = baseCost * fraction * (applyRates ? productivity * gainScale : 1);
          if (applyRates && resources[category]?.[resource]) {
            const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
            const colonyAvailable = resources[category][resource].value + pending;
            const key = resource === 'water' ? 'liquidWater' : resource;
            const allocation = getMegaProjectResourceAllocation(
              storageState,
              key,
              tickAmount,
              Math.max(colonyAvailable, 0)
            );
            const colonyPortion = allocation.fromColony;
            const colonyRate = Math.min(colonyPortion, colonyAvailable) * perSecondFactor;
            if (colonyRate > 0) {
              resources[category][resource].modifyRate(
                -colonyRate,
                'Dyson Collector',
                'project'
              );
            }
            const storagePortion = allocation.fromStorage;
            const storageRate = Math.max(storagePortion, 0) * perSecondFactor;
            if (storageRate > 0) {
              resources?.spaceStorage?.[key]?.modifyRate?.(
                -storageRate,
                'Dyson Collector',
                'project'
              );
            }
          }
          totals.cost[category][resource] =
            (totals.cost[category][resource] || 0) + baseCost * fraction * gainScale;
        }
      }
      return totals;
    }

    if (!this.autoContinuousOperation || this.collectorProgress <= 0) {
      return totals;
    }

    const colonyCost = this.lastCollectorColonyCost || {};
    const duration = this.collectorDuration;
    const perSecondRate = duration > 0 ? 1000 / duration : 0;
    for (const category in colonyCost) {
      const categoryCost = colonyCost[category];
      for (const resource in categoryCost) {
        const amount = categoryCost[resource];
        if (applyRates && resources[category]?.[resource]) {
          const rateValue = amount * perSecondRate;
          if (rateValue > 0) {
            resources[category][resource].modifyRate(
              -rateValue,
              'Dyson Collector',
              'project'
            );
          }
        }
      }
    }
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    // Only apply continuous mode if enabled and auto-deploying
    if (!this.isCollectorContinuous() || !this.autoContinuousOperation) {
      return;
    }
    if (!this.isCompleted && this.collectors === 0) {
      return;
    }
    const headroom = this.getCollectorHeadroom();
    if (headroom <= 0) {
      this.clampCollectorTotals();
      return;
    }

    this.collectorShortfallLastTick = false;
    const collectorCost = this.getCollectorCost();
    const duration = this.collectorDuration;
    const fraction = deltaTime / duration;
    const desiredCollectorGain = fraction * productivity;
    if (desiredCollectorGain <= 0) {
      return;
    }
    const requestedCollectorGain = Math.min(desiredCollectorGain, headroom);
    if (requestedCollectorGain <= 0) {
      this.clampCollectorTotals();
      return;
    }
    const storageState = this.createExpansionStorageState(accumulatedChanges, { reconcileOnDirectSpend: true });
    const collectorGain = this.getAffordableExpansionProgress(
      requestedCollectorGain,
      collectorCost,
      storageState,
      accumulatedChanges
    );
    let shortfall = collectorGain + 1e-9 < requestedCollectorGain;
    if (!(collectorGain > 0)) {
      this.collectorShortfallLastTick = shortfall;
      return;
    }
    const gainScale = collectorGain / desiredCollectorGain;

    // Deduct resources proportionally
    for (const category in collectorCost) {
      for (const resource in collectorCost[category]) {
        const amount = collectorCost[category][resource] * fraction * productivity * gainScale;
        
        if (storageState) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
          const colonyAvailable = Math.max(resources[category][resource].value + pending, 0);
          const allocation = getMegaProjectResourceAllocation(storageState, key, amount, colonyAvailable);
          let spentFromStorage = 0;
          if (allocation.fromStorage > 0) {
            spentFromStorage = storageState.spendStoredResource(key, allocation.fromStorage);
          }
          const remainingAfterStorage = Math.max(0, amount - spentFromStorage);
          const spendFromColony = Math.min(colonyAvailable, remainingAfterStorage);
          if (spendFromColony > 0) {
            if (accumulatedChanges) {
              if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
              if (accumulatedChanges[category][resource] === undefined) {
                accumulatedChanges[category][resource] = 0;
              }
              accumulatedChanges[category][resource] -= spendFromColony;
            } else {
              resources[category][resource].decrease(spendFromColony);
            }
          }
          if (spentFromStorage + spendFromColony + 1e-9 < amount) {
            shortfall = true;
          }
        } else {
          if (accumulatedChanges) {
            if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
            if (accumulatedChanges[category][resource] === undefined) {
              accumulatedChanges[category][resource] = 0;
            }
            accumulatedChanges[category][resource] -= amount;
          } else {
            resources[category][resource].decrease(amount);
          }
        }
      }
    }

    this.applyExpansionProgress(collectorGain, {
      completedField: 'collectors',
      progressField: 'fractionalCollectors',
      limit: this.getMaxCollectors(),
      deactivateOnCap: false,
      completeOnCap: false
    });
    this.clampCollectorTotals();

    this.collectorShortfallLastTick = shortfall;
    
    if (storageState?.storageProject && !accumulatedChanges && typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(storageState.storageProject);
    }
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      autoContinuousOperation: this.autoContinuousOperation === true
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'autoContinuousOperation')) {
      this.autoContinuousOperation = settings.autoContinuousOperation === true;
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      collectors: this.collectors,
      collectorProgress: this.collectorProgress,
      autoContinuousOperation: this.autoContinuousOperation,
      autoDeployCollectors: this.autoDeployCollectors,
      fractionalCollectors: this.fractionalCollectors,
      lastCollectorColonyCost: this.lastCollectorColonyCost,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.collectors = state.collectors || 0;
    this.collectorProgress = state.collectorProgress || 0;
    this.autoContinuousOperation = state.autoContinuousOperation === true || state.autoDeployCollectors === true;
    this.fractionalCollectors = state.fractionalCollectors || 0;
    this.lastCollectorColonyCost = state.lastCollectorColonyCost || null;
  }

  saveTravelState() {
    const state = { ...super.saveTravelState(), collectors: this.collectors };
    if (typeof gameSettings !== 'undefined' && gameSettings.preserveProjectAutoStart) {
      state.autoContinuousOperation = this.autoContinuousOperation;
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
      (typeof state.autoContinuousOperation !== 'undefined' || typeof state.autoDeployCollectors !== 'undefined')
    ) {
      this.autoContinuousOperation = state.autoContinuousOperation === true || state.autoDeployCollectors === true;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DysonSwarmReceiverProject = DysonSwarmReceiverProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DysonSwarmReceiverProject;
}
