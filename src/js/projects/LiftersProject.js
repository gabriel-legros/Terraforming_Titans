const LIFTER_MODES = {
  GAS_HARVEST: 'gasHarvest',
  ATMOSPHERE_STRIP: 'stripAtmosphere',
};

const DEFAULT_LIFTER_RECIPES = {
  hydrogen: {
    label: 'Hydrogen',
    storageKey: 'hydrogen',
    outputMultiplier: 1,
  },
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
    this.harvestRecipes = this.attributes?.lifterHarvestRecipes || DEFAULT_LIFTER_RECIPES;
    this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
    this.pendingHarvestRecipeKey = '';
    this.mode = LIFTER_MODES.GAS_HARVEST;
    this.isRunning = false;
    this.lastUnitsPerSecond = 0;
    this.lastEnergyPerSecond = 0;
    this.lastHarvestPerSecond = 0;
    this.lastHarvestResourceKey = this.getHarvestRecipe().storageKey;
    this.lastHydrogenPerSecond = 0;
    this.lastAtmospherePerSecond = 0;
    this.lastDysonEnergyPerSecond = 0;
    this.statusText = 'Idle';
    this.shortfallLastTick = false;
    this.costShortfallLastTick = false;
    this.expansionShortfallLastTick = false;
    this.expansionProgress = 0;
    this.continuousThreshold = 1000;
    this.operationPreRunThisTick = false;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  isExpansionContinuous() {
    return this.getEffectiveDuration() < this.continuousThreshold;
  }

  isContinuous() {
    return this.isExpansionContinuous();
  }

  isAtmosphereStripDisabled() {
    return this.isBooleanFlagSet('disableAtmosphereStripMode');
  }

  normalizeModeForFlags() {
    if (this.isAtmosphereStripDisabled() && this.mode === LIFTER_MODES.ATMOSPHERE_STRIP) {
      this.mode = LIFTER_MODES.GAS_HARVEST;
      return true;
    }
    return false;
  }

  getModeOptions() {
    const options = [
      { value: LIFTER_MODES.GAS_HARVEST, label: 'Gas Giant Harvest' },
    ];
    if (!this.isAtmosphereStripDisabled()) {
      options.push({ value: LIFTER_MODES.ATMOSPHERE_STRIP, label: 'Atmosphere Strip' });
    }
    return options;
  }

  getHarvestRecipeKeys() {
    return Object.keys(this.harvestRecipes || {});
  }

  isHarvestRecipeAvailable(recipe) {
    const requiredFlag = recipe?.requiresProjectFlag;
    return !requiredFlag || this.isBooleanFlagSet(requiredFlag);
  }

  getAvailableHarvestRecipeKeys() {
    return this.getHarvestRecipeKeys().filter((key) => this.isHarvestRecipeAvailable(this.harvestRecipes[key]));
  }

  getDefaultHarvestRecipeKey() {
    const available = this.getAvailableHarvestRecipeKeys();
    const fallback = this.getHarvestRecipeKeys();
    return available[0] || fallback[0] || 'hydrogen';
  }

  getHarvestRecipe() {
    this.applyPendingHarvestRecipe();
    const available = this.getAvailableHarvestRecipeKeys();
    const nextKey = available.includes(this.harvestRecipeKey)
      ? this.harvestRecipeKey
      : this.getDefaultHarvestRecipeKey();
    if (this.harvestRecipeKey !== nextKey) {
      this.harvestRecipeKey = nextKey;
    }
    return this.harvestRecipes[nextKey] || DEFAULT_LIFTER_RECIPES.hydrogen;
  }

  getHarvestOptions() {
    return this.getAvailableHarvestRecipeKeys().map((key) => {
      const recipe = this.harvestRecipes[key];
      return { value: key, label: recipe?.label || key };
    });
  }

  getCapacityPerLifter() {
    const recipe = this.getHarvestRecipe();
    const multiplier = recipe.outputMultiplier || 1;
    return this.mode === LIFTER_MODES.GAS_HARVEST
      ? this.unitRatePerLifter * multiplier
      : this.unitRatePerLifter;
  }

  getCapacityLabel() {
    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      const recipe = this.getHarvestRecipe();
      const label = recipe.label || 'Harvest';
      return `${label} / Lifter:`;
    }
    return 'Atmosphere / Lifter:';
  }

  setHarvestRecipe(value) {
    const available = this.getAvailableHarvestRecipeKeys();
    const next = available.includes(value) ? value : this.getDefaultHarvestRecipeKey();
    if (this.harvestRecipeKey !== next) {
      this.harvestRecipeKey = next;
      this.pendingHarvestRecipeKey = '';
      this.updateUI();
    }
  }

  applyPendingHarvestRecipe() {
    const pendingKey = this.pendingHarvestRecipeKey;
    if (!pendingKey) {
      return;
    }
    const available = this.getAvailableHarvestRecipeKeys();
    if (!available.includes(pendingKey)) {
      return;
    }
    this.pendingHarvestRecipeKey = '';
    this.harvestRecipeKey = pendingKey;
  }

  getUnitsPerSecond(productivity = 1) {
    return this.repeatCount * this.unitRatePerLifter * productivity;
  }

  getOperationProductivityForTick(defaultProductivity = 1, deltaTime = 1000) {
    if (!this.shouldOperate()) {
      return Math.max(0, Math.min(1, defaultProductivity));
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return Math.max(0, Math.min(1, defaultProductivity));
    }

    const maxUnits = this.getUnitsPerSecond(1) * seconds;
    if (!(maxUnits > 0)) {
      return 0;
    }

    let modeRatio = 1;
    let energyDemandUnits = maxUnits;
    if (this.mode === LIFTER_MODES.ATMOSPHERE_STRIP) {
      const previousShortfallReason = this.shortfallReason;
      const atmosphereLimit = this.getAtmosphereLimit();
      this.shortfallReason = previousShortfallReason;
      if (!(atmosphereLimit > 0)) {
        return 0;
      }
      const limitedUnits = Math.min(maxUnits, atmosphereLimit);
      modeRatio = Math.max(0, Math.min(1, limitedUnits / maxUnits));
      energyDemandUnits = limitedUnits;
    }
    if (!(energyDemandUnits > 0)) {
      return 0;
    }

    const energyRequired = energyDemandUnits * this.energyPerUnit;
    const dysonAvailable = this.getDysonOverflowPerSecond() * seconds;
    const colonyAvailable = this.isColonyEnergyAllowed()
      ? Math.max(resources?.colony?.energy?.value || 0, 0)
      : 0;
    const totalAvailable = dysonAvailable + colonyAvailable;
    const energyRatio = energyRequired > 0
      ? Math.max(0, Math.min(1, totalAvailable / energyRequired))
      : 1;

    const operationRatio = this.mode === LIFTER_MODES.ATMOSPHERE_STRIP
      ? modeRatio * energyRatio
      : energyRatio;
    return Math.max(0, Math.min(1, operationRatio));
  }

  shouldOperate() {
    if (this.isPermanentlyDisabled?.()) {
      return false;
    }
    if (this.mode === LIFTER_MODES.ATMOSPHERE_STRIP && this.isAtmosphereStripDisabled()) {
      return false;
    }
    return this.isRunning && this.repeatCount > 0;
  }

  setMode(value) {
    const next = value === LIFTER_MODES.ATMOSPHERE_STRIP && !this.isAtmosphereStripDisabled()
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
    storage?.reconcileUsedStorage();
    const freeSpace = Math.max((storage?.maxStorage || 0) - (storage?.usedStorage || 0), 0);
    if (freeSpace <= 0) {
      this.shortfallReason = storage ? 'Space storage is full' : 'Build space storage';
      return 0;
    }
    const recipe = this.getHarvestRecipe();
    const stored = storage?.getStoredResourceValue?.(recipe.storageKey) || 0;
    const capLimit = storage?.getResourceCapLimit?.(recipe.storageKey) ?? Infinity;
    const capRemaining = Math.max(0, capLimit - stored);
    if (capRemaining <= 0) {
      this.shortfallReason = 'Storage cap reached';
      return 0;
    }
    return Math.min(freeSpace, capRemaining);
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
    const recipe = this.getHarvestRecipe();
    const multiplier = recipe.outputMultiplier || 1;
    const adjustedLimit = multiplier > 0 ? limit / multiplier : 0;
    return Math.min(maxUnits, adjustedLimit);
  }

  storeHarvestedResource(resourceKey, amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }
    const storage = this.getSpaceStorageProject();
    storage?.reconcileUsedStorage();
    const freeSpace = Math.max((storage?.maxStorage || 0) - (storage?.usedStorage || 0), 0);
    const existing = storage?.getStoredResourceValue?.(resourceKey) || 0;
    const capLimit = storage?.getResourceCapLimit?.(resourceKey) ?? Infinity;
    const capRemaining = Math.max(0, capLimit - existing);
    const availableSpace = Math.min(freeSpace, capRemaining);
    const stored = Math.min(amount, availableSpace);
    this.shortfallReason = stored > 0
      ? ''
      : (!storage
        ? 'Build space storage'
        : (capRemaining <= 0 ? 'Storage cap reached' : 'Space storage is full'));
    if (!Number.isFinite(stored) || stored <= 0) {
      return 0;
    }
    storage.addStoredResource?.(resourceKey, stored);
    storage.reconcileUsedStorage?.();
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
    const poolAvailable = accumulatedChanges?.dysonSpaceEnergyInjected
      ? Math.max(accumulatedChanges.spaceEnergy || 0, 0)
      : null;
    const dysonAvailable = poolAvailable !== null
      ? poolAvailable
      : this.getDysonOverflowPerSecond() * seconds;
    const totalAvailable = availableColony + dysonAvailable;
    const energyUsed = Math.min(energyRequired, totalAvailable);
    const dysonEnergyUsed = Math.min(energyUsed, dysonAvailable);
    const colonyUsed = Math.min(Math.max(energyUsed - dysonEnergyUsed, 0), availableColony);
    const totalUsed = colonyUsed + dysonEnergyUsed;
    if (accumulatedChanges?.dysonSpaceEnergyInjected) {
      accumulatedChanges.spaceEnergy = Math.max((accumulatedChanges.spaceEnergy || 0) - dysonEnergyUsed, 0);
    }
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

  setLastTickStats(units = 0, energy = 0, harvest = 0, atmosphere = 0, dyson = 0, harvestKey = null) {
    this.lastUnitsPerSecond = units;
    this.lastEnergyPerSecond = energy;
    this.lastHarvestPerSecond = harvest;
    const resolvedKey = harvestKey || this.lastHarvestResourceKey || 'hydrogen';
    this.lastHarvestResourceKey = resolvedKey;
    this.lastHydrogenPerSecond = resolvedKey === 'hydrogen' ? harvest : 0;
    this.lastAtmospherePerSecond = atmosphere;
    this.lastDysonEnergyPerSecond = dyson;
  }

  updateStatus(text) {
    this.statusText = text || 'Idle';
    const operationShortfall = Boolean(text && text !== 'Running' && text !== 'Idle');
    this.shortfallLastTick = this.expansionShortfallLastTick || operationShortfall;
  }

  start(resources) {
    this.expansionProgress = 0;
    this.expansionShortfallLastTick = false;
    if (this.isExpansionContinuous()) {
      if (!this.canStart()) {
        return false;
      }
      this.isActive = true;
      this.isPaused = false;
      this.isCompleted = false;
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      return true;
    }
    return super.start(resources);
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.costShortfallLastTick = false;
    if(!this.autoStart){
      return;
    }
    this.expansionShortfallLastTick = false;
    if (!this.isExpansionContinuous() || !this.isActive) {
      return;
    }

    const duration = this.getEffectiveDuration();
    const limit = this.maxRepeatCount || Infinity;
    const completedExpansions = this.repeatCount + this.expansionProgress;
    if (completedExpansions >= limit) {
      this.isActive = false;
      this.isCompleted = true;
      this.expansionProgress = Math.max(0, limit - this.repeatCount);
      return;
    }

    if (this.startingDuration !== Infinity && this.remainingTime !== Infinity && this.startingDuration > 0) {
      const carried = (this.startingDuration - this.remainingTime) / this.startingDuration;
      if (carried > 0) {
        this.expansionProgress += Math.min(carried, Math.max(0, limit - (this.repeatCount + this.expansionProgress)));
      }
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
    }

    const remainingRepeats = limit === Infinity
      ? Infinity
      : Math.max(0, limit - (this.repeatCount + this.expansionProgress));
    if (remainingRepeats === 0) {
      this.isActive = false;
      this.isCompleted = true;
      this.expansionProgress = 0;
      return;
    }

    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage ? projectManager.projects.spaceStorage : null;
    const getStoragePending = (resourceKey) => accumulatedChanges?.spaceStorage?.[resourceKey] ?? 0;
    const storageState = storageProj
      ? {
          megaProjectResourceMode: storageProj.megaProjectResourceMode,
          getAvailableStoredResource: (resourceKey) => {
            const available = storageProj.getAvailableStoredResource(resourceKey);
            return Math.max(0, available + getStoragePending(resourceKey));
          },
          spendStoredResource: (resourceKey, amount) => {
            if (amount <= 0) {
              return 0;
            }
            if (!accumulatedChanges) {
              return storageProj.spendStoredResource(resourceKey, amount);
            }
            const available = Math.max(0, storageProj.getAvailableStoredResource(resourceKey) + getStoragePending(resourceKey));
            const spent = Math.min(amount, available);
            if (spent <= 0) {
              return 0;
            }
            accumulatedChanges.spaceStorage ||= {};
            if (accumulatedChanges.spaceStorage[resourceKey] === undefined) {
              accumulatedChanges.spaceStorage[resourceKey] = 0;
            }
            accumulatedChanges.spaceStorage[resourceKey] -= spent;
            return spent;
          },
        }
      : {
          getAvailableStoredResource: () => 0,
          spendStoredResource: () => 0,
          megaProjectResourceMode: MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST,
        };
    let shortfall = false;
    let canAffordBaseCost = true;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const res = resources[category][resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
        const availableTotal = getMegaProjectResourceAvailability(
          storageState,
          storageKey,
          res.value + pending
        );
        if (availableTotal < cost[category][resource]) {
          canAffordBaseCost = false;
        }
      }
    }
    if (!canAffordBaseCost) {
      this.expansionShortfallLastTick = true;
      this.costShortfallLastTick = true;
      return;
    }

    const progress = Math.min(deltaTime / duration, remainingRepeats);
    const seconds = deltaTime / 1000;
    if (progress <= 0) {
      return;
    }

    const applyColonyChange = (category, resource, amount) => {
      if (accumulatedChanges) {
        if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
        if (accumulatedChanges[category][resource] === undefined) {
          accumulatedChanges[category][resource] = 0;
        }
        accumulatedChanges[category][resource] -= amount;
      } else {
        resources[category][resource].decrease(amount);
      }
    };

    const spendFromStorage = (key, amount) => {
      if (amount <= 0) return 0;
      if (storageState.spendStoredResource) {
        return storageState.spendStoredResource(key, amount);
      }
      const availableFromStorage = storageState.getAvailableStoredResource(key);
      return Math.min(amount, availableFromStorage);
    };
    const spentColonyByCategory = {};
    const spentStorageByKey = {};

    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource] * progress;
        const res = resources[category][resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
        const availableTotal = getMegaProjectResourceAvailability(
          storageState,
          storageKey,
          res.value + pending
        );
        if (availableTotal < amount) {
          shortfall = true;
        }

        const colonyAvailable = Math.max(res.value + pending, 0);
        const allocation = getMegaProjectResourceAllocation(storageState, storageKey, amount, colonyAvailable);
        let spentFromStorage = 0;
        if (allocation.fromStorage > 0) {
          spentFromStorage = spendFromStorage(storageKey, allocation.fromStorage);
        }
        const remainingAfterStorage = Math.max(0, amount - spentFromStorage);
        const spendFromColony = Math.min(colonyAvailable, remainingAfterStorage);
        if (spendFromColony > 0) {
          applyColonyChange(category, resource, spendFromColony);
          spentColonyByCategory[category] ||= {};
          spentColonyByCategory[category][resource] =
            (spentColonyByCategory[category][resource] || 0) + spendFromColony;
        }
        if (spentFromStorage > 0) {
          spentStorageByKey[storageKey] = (spentStorageByKey[storageKey] || 0) + spentFromStorage;
        }
        if (spentFromStorage + spendFromColony + 1e-9 < amount) {
          shortfall = true;
        }
      }
    }

    if (seconds > 0 && this.showsInResourcesRate()) {
      for (const category in spentColonyByCategory) {
        for (const resource in spentColonyByCategory[category]) {
          const spent = spentColonyByCategory[category][resource];
          if (spent > 0) {
            resources[category][resource].modifyRate(
              -(spent / seconds),
              'Lifter expansion',
              'project'
            );
          }
        }
      }
      for (const storageKey in spentStorageByKey) {
        const spent = spentStorageByKey[storageKey];
        if (spent > 0) {
          resources?.spaceStorage?.[storageKey]?.modifyRate?.(
            -(spent / seconds),
            'Lifter expansion',
            'project'
          );
        }
      }
    }

    const totalProgress = this.expansionProgress + progress;
    const completed = Math.floor(totalProgress);
    this.expansionProgress = totalProgress - completed;

    if (completed > 0) {
      this.repeatCount += completed;
    }

    if (limit !== Infinity && this.repeatCount + this.expansionProgress >= limit) {
      this.expansionProgress = Math.max(0, limit - this.repeatCount);
      this.isActive = false;
      this.isCompleted = true;
    }

    this.expansionShortfallLastTick = shortfall;
    this.costShortfallLastTick = this.expansionShortfallLastTick;
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastTickStats();
      if (!this.repeatCount) {
        this.updateStatus('Complete at least one lifter');
      } else if (!this.isRunning) {
        this.updateStatus('Run disabled');
      } else if (this.mode === LIFTER_MODES.ATMOSPHERE_STRIP && this.isAtmosphereStripDisabled()) {
        this.updateStatus('Atmosphere strip disabled');
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (seconds <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      this.shortfallLastTick = false;
      return;
    }

    this.shortfallReason = '';
    const maxUnits = this.getUnitsPerSecond(productivity) * seconds;
    if (maxUnits <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      this.shortfallLastTick = false;
      return;
    }

    const limitedUnits = this.getModeLimit(maxUnits);
    if (limitedUnits <= 0 && this.mode !== LIFTER_MODES.GAS_HARVEST) {
      this.setLastTickStats();
      this.updateStatus(this.shortfallReason || 'Waiting for capacity');
      this.shortfallLastTick = true;
      return;
    }

    const energyDemandUnits = this.mode === LIFTER_MODES.GAS_HARVEST ? maxUnits : limitedUnits;
    const energyNeeded = energyDemandUnits * this.energyPerUnit;
    const energyResult = this.consumeEnergy(energyNeeded, deltaTime, accumulatedChanges);
    if (energyResult.energyUsed <= 0) {
      this.setLastTickStats();
      const stalled = energyResult.dysonAvailable > 0 ? 'Waiting for space storage' : 'Insufficient energy';
      this.updateStatus(stalled);
      this.shortfallLastTick = true;
      return;
    }

    const energyLimitedUnits = Math.min(maxUnits, energyResult.energyUsed / this.energyPerUnit);
    let processedUnits = Math.min(limitedUnits, energyLimitedUnits);
    let harvestRate = 0;
    let displayHarvestRate = 0;
    let atmosphereRate = 0;
    let harvestKey = null;

    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      const recipe = this.getHarvestRecipe();
      const multiplier = recipe.outputMultiplier || 1;
      displayHarvestRate = (energyLimitedUnits * multiplier) / seconds;
      resources?.spaceStorage?.[recipe.storageKey]?.modifyRate?.(
        displayHarvestRate,
        'Lifting',
        'project'
      );
      const outputUnits = processedUnits * multiplier;
      const storedUnits = this.storeHarvestedResource(recipe.storageKey, outputUnits);
      if (storedUnits <= 0) {
        this.adjustEnergyUsage(energyResult, energyResult.energyUsed, accumulatedChanges);
        this.setLastTickStats(0, 0, 0, 0, 0, recipe.storageKey);
        this.updateStatus(this.shortfallReason || 'Space storage is full');
        this.shortfallLastTick = true;
        return;
      }
      processedUnits = multiplier > 0 ? storedUnits / multiplier : 0;
      harvestRate = storedUnits / seconds;
      harvestKey = recipe.storageKey;
    } else {
      processedUnits = this.removeAtmosphere(processedUnits, accumulatedChanges, seconds);
      if (processedUnits <= 0) {
        this.adjustEnergyUsage(energyResult, energyResult.energyUsed, accumulatedChanges);
        this.setLastTickStats();
        this.updateStatus(this.shortfallReason || 'No atmosphere to strip');
        this.shortfallLastTick = true;
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
    this.setLastTickStats(unitPerSecond, energyPerSecond, harvestRate, atmosphereRate, dysonPerSecond, harvestKey);
    this.updateStatus('Running');
    this.shortfallLastTick = false;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    const operationAlreadyHandled = this.operationPreRunThisTick === true;
    this.operationPreRunThisTick = false;
    if (!operationAlreadyHandled) {
      this.applyOperationCostAndGain(deltaTime, accumulatedChanges, productivity);
    }
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);
    this.shortfallLastTick = this.shortfallLastTick || this.expansionShortfallLastTick;
  }

  mergeEstimateTotals(target, source) {
    for (const bucket of ['cost', 'gain']) {
      const sourceBucket = source?.[bucket] || {};
      for (const category in sourceBucket) {
        target[bucket][category] ||= {};
        for (const resource in sourceBucket[category]) {
          target[bucket][category][resource] =
            (target[bucket][category][resource] || 0) + sourceBucket[category][resource];
        }
      }
    }
    return target;
  }

  estimateCostAndGainByPhase(
    deltaTime = 1000,
    applyRates = true,
    productivity = 1,
    accumulatedChanges = null,
    includeExpansion = true,
    includeOperation = true
  ) {
    const totals = { cost: {}, gain: {} };
    const storageProj = this.attributes?.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    const getStoragePending = (resourceKey) => accumulatedChanges?.spaceStorage?.[resourceKey] ?? 0;
    const storageState = storageProj
      ? {
          megaProjectResourceMode: storageProj.megaProjectResourceMode,
          getAvailableStoredResource: (resourceKey) => {
            const available = storageProj.getAvailableStoredResource(resourceKey);
            return Math.max(0, available + getStoragePending(resourceKey));
          },
          spendStoredResource: () => 0,
        }
      : {
          getAvailableStoredResource: () => 0,
          spendStoredResource: () => 0,
          megaProjectResourceMode: MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST,
        };

    const expansionActive = includeExpansion && this.isActive && (!this.isExpansionContinuous() || this.autoStart);
    if (expansionActive) {
      const duration = this.getEffectiveDuration();
      const limit = this.maxRepeatCount || Infinity;
      const completedExpansions = this.repeatCount + this.expansionProgress;
      const remainingRepeats = limit === Infinity ? Infinity : Math.max(0, limit - completedExpansions);
      const progress = this.isExpansionContinuous()
        ? Math.min(deltaTime / duration, remainingRepeats)
        : (deltaTime / duration);
      const checkBaseCost = this.isExpansionContinuous();
      let canAffordBaseCost = true;
      const cost = this.getScaledCost();
      for (const category in cost) {
        for (const resource in cost[category]) {
          const storageKey = resource === 'water' ? 'liquidWater' : resource;
          const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
            const availableTotal = getMegaProjectResourceAvailability(
              storageState,
              storageKey,
              (resources?.[category]?.[resource]?.value || 0) + pending
            );
          if (checkBaseCost && availableTotal < cost[category][resource]) {
            canAffordBaseCost = false;
          }
        }
      }

      if (remainingRepeats > 0 && progress > 0 && canAffordBaseCost) {
        const perSecondFactor = deltaTime > 0 ? 1000 / deltaTime : 0;
        for (const category in cost) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in cost[category]) {
            const baseCost = cost[category][resource];
            const tickAmount = baseCost * progress;
            const res = resources?.[category]?.[resource];
            const storageKey = resource === 'water' ? 'liquidWater' : resource;
            const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
            const colonyAvailable = (res?.value || 0) + pending;
            const allocation = getMegaProjectResourceAllocation(
              storageState,
              storageKey,
              tickAmount,
              Math.max(colonyAvailable, 0)
            );
            const colonyPortion = allocation.fromColony;
            const colonyRate = Math.min(colonyPortion, colonyAvailable) * perSecondFactor;
            if (applyRates && colonyRate > 0) {
              res?.modifyRate?.(-colonyRate, 'Lifter expansion', 'project');
            }
            const storageRate = Math.max(allocation.fromStorage, 0) * perSecondFactor;
            if (applyRates && storageRate > 0) {
              resources?.spaceStorage?.[storageKey]?.modifyRate?.(
                -storageRate,
                'Lifter expansion',
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + baseCost * progress;
          }
        }
      }
    }

    if (!includeOperation || !this.shouldOperate()) {
      return totals;
    }
    const seconds = deltaTime / 1000;
    const maxUnits = this.getUnitsPerSecond(productivity);
    let cappedUnits = maxUnits;
    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      const recipe = this.getHarvestRecipe();
      const multiplier = recipe.outputMultiplier || 1;
      const limit = this.getGasModeCapacityLimit();
      const adjustedLimit = multiplier > 0 ? limit / multiplier : 0;
      cappedUnits = Math.min(maxUnits, adjustedLimit);
    } else {
      cappedUnits = Math.min(maxUnits, this.getAtmosphereLimit());
    }
    if (cappedUnits <= 0 || !this.isColonyEnergyAllowed()) {
      return totals;
    }
    const energyRate = cappedUnits * this.energyPerUnit;
    const colonyEnergy = resources?.colony?.energy;
    colonyEnergy?.modifyRate?.(-energyRate, 'Lifting', 'project');
    totals.cost.colony ||= {};
    totals.cost.colony.energy = (totals.cost.colony.energy || 0) + energyRate * seconds;
    return totals;
  }

  estimateExpansionCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateCostAndGainByPhase(
      deltaTime,
      applyRates,
      productivity,
      accumulatedChanges,
      true,
      false
    );
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateCostAndGainByPhase(
      deltaTime,
      applyRates,
      productivity,
      accumulatedChanges,
      false,
      true
    );
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const preRun = this.operationPreRunThisTick === true;
    const expansionApplyRates = preRun ? false : applyRates;
    const totals = this.estimateExpansionCostAndGain(deltaTime, expansionApplyRates, productivity, accumulatedChanges);
    if (preRun) {
      return totals;
    }
    const operationTotals = this.estimateOperationCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
    return this.mergeEstimateTotals(totals, operationTotals);
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

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    const modeChanged = this.normalizeModeForFlags();
    this.applyPendingHarvestRecipe();
    if (modeChanged) {
      this.updateUI();
    }
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      mode: this.mode,
      isRunning: this.isRunning === true,
      harvestRecipeKey: this.harvestRecipeKey
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'mode')) {
      this.mode = settings.mode || LIFTER_MODES.GAS_HARVEST;
    }
    this.normalizeModeForFlags();
    if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
      this.isRunning = settings.isRunning === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'harvestRecipeKey')) {
      this.pendingHarvestRecipeKey = settings.harvestRecipeKey || '';
      this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
      this.applyPendingHarvestRecipe();
      this.lastHarvestResourceKey = this.getHarvestRecipe().storageKey;
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      mode: this.mode,
      isRunning: this.isRunning,
      expansionProgress: this.expansionProgress,
      harvestRecipeKey: this.harvestRecipeKey,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
    this.normalizeModeForFlags();
    this.isRunning = state.isRunning || false;
    this.expansionProgress = state.expansionProgress || 0;
    this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
    this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
    this.applyPendingHarvestRecipe();
    this.lastHarvestResourceKey = this.getHarvestRecipe().storageKey;
    if (!this.isRunning) {
      this.setLastTickStats();
      this.updateStatus('Idle');
    }
  }

  saveTravelState() {
    const state = {
      repeatCount: this.repeatCount,
      mode: this.mode,
      expansionProgress: this.expansionProgress,
      harvestRecipeKey: this.harvestRecipeKey,
    };
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
    this.normalizeModeForFlags();
    this.expansionProgress = state.expansionProgress || 0;
    this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
    this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
    this.applyPendingHarvestRecipe();
    this.lastHarvestResourceKey = this.getHarvestRecipe().storageKey;
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
