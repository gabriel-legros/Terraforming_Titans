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

  getModeOptions() {
    return [
      { value: LIFTER_MODES.GAS_HARVEST, label: 'Gas Giant Harvest' },
      { value: LIFTER_MODES.ATMOSPHERE_STRIP, label: 'Atmosphere Strip' },
    ];
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
    storage?.reconcileUsedStorage();
    const freeSpace = Math.max((storage?.maxStorage || 0) - (storage?.usedStorage || 0), 0);
    if (freeSpace <= 0) {
      this.shortfallReason = storage ? 'Space storage is full' : 'Build space storage';
      return 0;
    }
    const recipe = this.getHarvestRecipe();
    const stored = storage?.resourceUsage?.[recipe.storageKey] || 0;
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
    if (amount <= 0) {
      return 0;
    }
    const storage = this.getSpaceStorageProject();
    storage?.reconcileUsedStorage();
    const freeSpace = Math.max((storage?.maxStorage || 0) - (storage?.usedStorage || 0), 0);
    const existing = storage?.resourceUsage?.[resourceKey] || 0;
    const capLimit = storage?.getResourceCapLimit?.(resourceKey) ?? Infinity;
    const capRemaining = Math.max(0, capLimit - existing);
    const availableSpace = Math.min(freeSpace, capRemaining);
    const stored = Math.min(amount, availableSpace);
    this.shortfallReason = stored > 0
      ? ''
      : (!storage
        ? 'Build space storage'
        : (capRemaining <= 0 ? 'Storage cap reached' : 'Space storage is full'));
    if (stored <= 0) {
      return 0;
    }
    storage.resourceUsage[resourceKey] = (storage.resourceUsage[resourceKey] || 0) + stored;
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
    const storageState = storageProj || {
      getAvailableStoredResource: () => 0,
      resourceUsage: {},
      usedStorage: 0,
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

    const progress = Math.min((deltaTime / duration) * productivity, remainingRepeats);
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
      const availableFromStorage = storageState.getAvailableStoredResource(key);
      const spend = Math.min(amount, availableFromStorage);
      if (spend > 0) {
        storageState.resourceUsage[key] = (storageState.resourceUsage[key] || 0) - spend;
        if (storageState.resourceUsage[key] <= 0) {
          delete storageState.resourceUsage[key];
        }
        storageState.usedStorage = Math.max(0, storageState.usedStorage - spend);
      }
      return spend;
    };

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
        if (allocation.fromStorage > 0) {
          spendFromStorage(storageKey, allocation.fromStorage);
        }
        if (allocation.fromColony > 0) {
          applyColonyChange(category, resource, allocation.fromColony);
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

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);

    if (!this.shouldOperate()) {
      this.setLastTickStats();
      if (!this.repeatCount) {
        this.updateStatus('Complete at least one lifter');
      } else if (!this.isRunning) {
        this.updateStatus('Run disabled');
      }
      this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
      return;
    }

    const seconds = deltaTime / 1000;
    if (seconds <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
      return;
    }

    this.shortfallReason = '';
    const maxUnits = this.getUnitsPerSecond(productivity) * seconds;
    if (maxUnits <= 0) {
      this.setLastTickStats();
      this.updateStatus('Idle');
      this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
      return;
    }

    const limitedUnits = this.getModeLimit(maxUnits);
    if (limitedUnits <= 0) {
      this.setLastTickStats();
      this.updateStatus(this.shortfallReason || 'Waiting for capacity');
      this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
      return;
    }

    const energyNeeded = limitedUnits * this.energyPerUnit;
    const energyResult = this.consumeEnergy(energyNeeded, deltaTime, accumulatedChanges);
    if (energyResult.energyUsed <= 0) {
      this.setLastTickStats();
      const stalled = energyResult.dysonAvailable > 0 ? 'Waiting for space storage' : 'Insufficient energy';
      this.updateStatus(stalled);
      this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
      return;
    }

    let processedUnits = energyResult.energyUsed / this.energyPerUnit;
    let harvestRate = 0;
    let atmosphereRate = 0;
    let harvestKey = null;

    if (this.mode === LIFTER_MODES.GAS_HARVEST) {
      const recipe = this.getHarvestRecipe();
      const multiplier = recipe.outputMultiplier || 1;
      const outputUnits = processedUnits * multiplier;
      const storedUnits = this.storeHarvestedResource(recipe.storageKey, outputUnits);
      if (storedUnits <= 0) {
        this.adjustEnergyUsage(energyResult, energyResult.energyUsed, accumulatedChanges);
        this.setLastTickStats();
        this.updateStatus(this.shortfallReason || 'Space storage is full');
        this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
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
        this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
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
    this.shortfallLastTick = this.expansionShortfallLastTick || this.shortfallLastTick;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    const storageState = (this.attributes?.canUseSpaceStorage && projectManager?.projects?.spaceStorage) || {
      getAvailableStoredResource: () => 0,
      resourceUsage: {},
      usedStorage: 0,
      megaProjectResourceMode: MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST,
    };

    const expansionActive = this.isActive && (!this.isExpansionContinuous() || this.autoStart);
    if (expansionActive) {
      const duration = this.getEffectiveDuration();
      const limit = this.maxRepeatCount || Infinity;
      const completedExpansions = this.repeatCount + this.expansionProgress;
      const remainingRepeats = limit === Infinity ? Infinity : Math.max(0, limit - completedExpansions);
      const progress = this.isExpansionContinuous()
        ? Math.min((deltaTime / duration) * productivity, remainingRepeats)
        : (deltaTime / duration) * productivity;
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
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + baseCost * progress;
          }
        }
      }
    }

    if (!applyRates || !this.shouldOperate()) {
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
    this.applyPendingHarvestRecipe();
    this.updateUI();
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
