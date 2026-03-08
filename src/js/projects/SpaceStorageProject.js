const SPACE_STORAGE_RESOURCE_REQUIREMENTS = {
  superalloys: { requiresFlag: 'superalloyResearchUnlocked' },
  graphite: { requiresProjectFlag: 'graphiteStorage' },
  biomass: { requiresProjectFlag: 'biostorage' },
  atmosphericMethane: { requiresProjectFlag: 'methaneAmmoniaStorage' },
  atmosphericAmmonia: { requiresProjectFlag: 'methaneAmmoniaStorage' },
};
const SPACE_STORAGE_LEGACY_RESERVE_KEYS = [
  'metal',
  'silicon',
  'graphite',
  'glass',
  'components',
  'electronics',
  'superconductors',
  'superalloys',
  'liquidWater',
  'biomass',
  'carbonDioxide',
  'inertGas',
  'oxygen',
  'atmosphericMethane',
  'atmosphericAmmonia',
  'hydrogen'
];
const SPACE_STORAGE_RESOURCE_KEYS = [
  'metal',
  'silicon',
  'graphite',
  'glass',
  'components',
  'electronics',
  'superconductors',
  'superalloys',
  'liquidWater',
  'biomass',
  'carbonDioxide',
  'inertGas',
  'oxygen',
  'atmosphericMethane',
  'atmosphericAmmonia',
  'hydrogen'
];
const SPACE_TRAVEL_RESOURCE_KEYS = [
  'energy'
];
const SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY = 'standard';

let SpaceStorageContinuousExpansionHelpers = null;
try {
  SpaceStorageContinuousExpansionHelpers = ContinuousExpansionProject.prototype;
} catch (error) {
  SpaceStorageContinuousExpansionHelpers = require('./ContinuousExpansionProject.js').prototype;
}

class SpaceStorageProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.baseDuration = config.duration;
    this.shipBaseDuration = 50_000;
    this.capacityPerCompletion = 100_000_000_000;
    this.continuousThreshold = config.continuousThreshold || 1000;
    this.expansionRecipes = this.attributes.expansionRecipes || {};
    this.expansionRecipeKey = this.attributes.defaultExpansionRecipe || SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY;
    this.expansionProgress = 0;
    this.usedStorage = 0;
    this.selectedResources = [];
    this.shipOperationAutoStart = false;
    this.shipOperationIsActive = false;
    this.shipOperationIsPaused = false;
    this.shipOperationRemainingTime = 0;
    this.shipOperationStartingDuration = 0;
    this.shipTransferMode = 'store';
    this.lastUniformTransferMode = 'store';
    this.resourceTransferModes = {};
    this.pendingTransfers = [];
    this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    this.megaProjectSpaceOnlyOnTravel = false;
    this.waterWithdrawTarget = 'colony';
    this.resourceStrategicReserves = {};
    this.usedStorageResyncTimer = 0;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerPending = false;
    this.shipOperationKesslerCost = null;
    this.resourceCaps = {};
    // Override kesslerDebrisSize to null so expansion doesn't trigger Kessler
    // Only ship operations should generate debris
    this.kesslerDebrisSize = null;
  }

  isAutomationManuallyDisabled() {
    return this.shipOperationAutoStart === false;
  }

  getDurationWithTerraformBonus(baseDuration) {
    const count = spaceManager.getTerraformedPlanetCountIncludingCurrent();
    const total = Math.max(1, count + this.getWorldBonus());
    return baseDuration / total;
  }

  getTotalExpansions() {
    return this.repeatCount + this.expansionProgress;
  }

  get maxStorage() {
    return this.getTotalExpansions() * this.capacityPerCompletion;
  }

  getExpansionRecipeKeys() {
    return Object.keys(this.expansionRecipes || {});
  }

  getAvailableExpansionRecipeKeys() {
    const keys = this.getExpansionRecipeKeys();
    return keys.filter((key) => {
      const recipe = this.expansionRecipes[key] || {};
      const requiredFlag = recipe.requiresProjectFlag;
      return !requiredFlag || this.isBooleanFlagSet(requiredFlag);
    });
  }

  getDefaultExpansionRecipeKey() {
    const available = this.getAvailableExpansionRecipeKeys();
    if (available.includes(SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY)) {
      return SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY;
    }
    const allKeys = this.getExpansionRecipeKeys();
    if (available.length > 0) {
      return available[0];
    }
    if (allKeys.includes(SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY)) {
      return SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY;
    }
    return allKeys[0] || SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY;
  }

  hasExpansionRecipe(recipeKey) {
    return Object.prototype.hasOwnProperty.call(this.expansionRecipes || {}, recipeKey);
  }

  getExpansionRecipeKey() {
    if (!this.hasExpansionRecipe(this.expansionRecipeKey)) {
      this.expansionRecipeKey = this.getDefaultExpansionRecipeKey();
    }
    return this.expansionRecipeKey;
  }

  getResolvedExpansionRecipeKey() {
    const selectedKey = this.getExpansionRecipeKey();
    const available = this.getAvailableExpansionRecipeKeys();
    if (available.includes(selectedKey)) {
      return selectedKey;
    }
    return this.getDefaultExpansionRecipeKey();
  }

  setExpansionRecipe(recipeKey) {
    const available = this.getAvailableExpansionRecipeKeys();
    if (!available.includes(recipeKey) || recipeKey === this.expansionRecipeKey) {
      return false;
    }
    this.expansionRecipeKey = recipeKey;
    return true;
  }

  getCurrentExpansionRecipe() {
    const key = this.getResolvedExpansionRecipeKey();
    return this.expansionRecipes[key] || {};
  }

  getExpansionRecipeOptions() {
    const available = this.getAvailableExpansionRecipeKeys();
    return available.map((key) => {
      const recipe = this.expansionRecipes[key] || {};
      return {
        value: key,
        label: recipe.label || key
      };
    });
  }

  getCurrentExpansionRecipeCost() {
    const recipe = this.getCurrentExpansionRecipe();
    return recipe.cost || this.cost;
  }

  getCurrentExpansionRecipeSpeedMultiplier() {
    const recipe = this.getCurrentExpansionRecipe();
    const value = Number(recipe.expansionSpeedMultiplier);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return 1;
  }

  getEffectiveCost(buildCount = 1) {
    const expansionCost = this.getCurrentExpansionRecipeCost();
    const effectiveCost = {};

    for (const category in expansionCost) {
      effectiveCost[category] = {};
      for (const resource in expansionCost[category]) {
        const baseCost = expansionCost[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource);
        const finalCost = baseCost * multiplier * buildCount;
        if (finalCost > 0) {
          effectiveCost[category][resource] = finalCost;
        }
      }
      if (Object.keys(effectiveCost[category]).length === 0) {
        delete effectiveCost[category];
      }
    }

    return effectiveCost;
  }

  getSpaceStorageResource(resourceKey) {
    return resources?.spaceStorage?.[resourceKey] || null;
  }

  getStoredResourceValue(resourceKey) {
    const resource = this.getSpaceStorageResource(resourceKey);
    if (!resource) return 0;
    const value = Number(resource.value);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  setStoredResourceValue(resourceKey, amount) {
    const resource = this.getSpaceStorageResource(resourceKey);
    if (!resource) return 0;
    const value = Number(amount);
    resource.value = Number.isFinite(value) && value > 0 ? value : 0;
    return resource.value;
  }

  addStoredResource(resourceKey, amount) {
    const add = Number(amount);
    if (!Number.isFinite(add) || add <= 0) return 0;
    const current = this.getStoredResourceValue(resourceKey);
    this.setStoredResourceValue(resourceKey, current + add);
    return add;
  }

  removeStoredResource(resourceKey, amount) {
    const remove = Number(amount);
    if (!Number.isFinite(remove) || remove <= 0) return 0;
    const current = this.getStoredResourceValue(resourceKey);
    const used = Math.min(current, remove);
    this.setStoredResourceValue(resourceKey, current - used);
    return used;
  }

  spendStoredResource(resourceKey, amount) {
    const spend = Number(amount);
    if (!Number.isFinite(spend) || spend <= 0) return 0;
    const available = this.getAvailableStoredResource(resourceKey);
    const used = Math.min(available, spend);
    if (used > 0) {
      this.removeStoredResource(resourceKey, used);
    }
    return used;
  }

  sanitizeStoredResources() {
    const storageResources = resources?.spaceStorage;
    if (!storageResources) return;
    for (const resourceKey in storageResources) {
      const entry = storageResources[resourceKey];
      const value = Number(entry?.value);
      if (!Number.isFinite(value) || value < 0) {
        entry.value = 0;
      }
    }
  }

  reconcileUsedStorage() {
    this.sanitizeStoredResources();
    let total = 0;
    const storageResources = resources?.spaceStorage;
    if (storageResources) {
      for (const resourceKey in storageResources) {
        total += this.getStoredResourceValue(resourceKey);
      }
    }
    this.usedStorage = total;
  }

  syncSpaceStorageResourceUnlocks() {
    const storageResources = resources?.spaceStorage;
    if (!storageResources) return;
    const projectAvailable = this.unlocked && !this.isPermanentlyDisabled();
    for (const resourceKey in storageResources) {
      const resource = storageResources[resourceKey];
      if (!resource) continue;
      resource.unlocked = projectAvailable && this.isResourceUnlocked(resourceKey);
    }
  }

  getResourceCapSettingFromSource(resourceKey, sourceCaps = null) {
    const fallback = { mode: 'none', value: 0 };
    const caps = sourceCaps || this.resourceCaps;
    const setting = caps[resourceKey] || fallback;
    const mode = setting.mode === 'amount' || setting.mode === 'percent' || setting.mode === 'weight'
      ? setting.mode
      : 'none';
    const parsedValue = Number(setting.value);
    let value = Number.isFinite(parsedValue) ? parsedValue : 0;
    if (mode === 'percent') {
      value = Math.max(0, Math.min(100, value));
    } else if (mode === 'weight') {
      value = Math.max(0, Math.floor(value));
    } else {
      value = Math.max(0, value);
    }
    return { mode, value };
  }

  getResourceCapSetting(resourceKey) {
    return this.getResourceCapSettingFromSource(resourceKey, this.resourceCaps);
  }

  getAllSpaceStorageResourceKeys(additionalCaps = null) {
    const keys = new Set(SPACE_STORAGE_RESOURCE_KEYS);
    Object.keys(resources?.spaceStorage || {}).forEach(key => keys.add(key));
    Object.keys(this.resourceCaps || {}).forEach(key => keys.add(key));
    if (additionalCaps) {
      Object.keys(additionalCaps).forEach(key => keys.add(key));
    }
    return Array.from(keys);
  }

  getResourceCapLimits(capOverrides = null) {
    const sourceCaps = capOverrides
      ? { ...(this.resourceCaps || {}), ...capOverrides }
      : (this.resourceCaps || {});
    const keys = this.getAllSpaceStorageResourceKeys(sourceCaps);
    const limits = {};
    let fixedTotal = 0;
    let hasWeightCap = false;
    let totalWeight = 0;

    keys.forEach((resourceKey) => {
      const setting = this.getResourceCapSettingFromSource(resourceKey, sourceCaps);
      if (setting.mode === 'amount') {
        const limit = Math.max(0, setting.value || 0);
        limits[resourceKey] = limit;
        fixedTotal += limit;
        return;
      }
      if (setting.mode === 'percent') {
        const limit = Math.max(0, (this.maxStorage * (setting.value || 0)) / 100);
        limits[resourceKey] = limit;
        fixedTotal += limit;
        return;
      }
      if (setting.mode === 'weight') {
        hasWeightCap = true;
        if (setting.value > 0) {
          totalWeight += setting.value;
        }
      }
    });

    const remainingStorage = Math.max(0, this.maxStorage - fixedTotal);
    keys.forEach((resourceKey) => {
      if (Object.prototype.hasOwnProperty.call(limits, resourceKey)) {
        return;
      }
      const setting = this.getResourceCapSettingFromSource(resourceKey, sourceCaps);
      if (!hasWeightCap) {
        limits[resourceKey] = setting.mode === 'weight' ? 0 : Infinity;
        return;
      }
      if (setting.mode === 'weight' && setting.value > 0 && totalWeight > 0) {
        limits[resourceKey] = (remainingStorage * setting.value) / totalWeight;
      } else {
        limits[resourceKey] = 0;
      }
    });

    return limits;
  }

  getResourceCapLimit(resourceKey, capOverrides = null) {
    const limits = this.getResourceCapLimits(capOverrides);
    if (Object.prototype.hasOwnProperty.call(limits, resourceKey)) {
      return limits[resourceKey];
    }
    return Infinity;
  }

  getResourceStrategicReserveSetting(resourceKey) {
    const fallback = { mode: 'none', value: 0 };
    const setting = this.resourceStrategicReserves[resourceKey] || fallback;
    const mode = setting.mode === 'amount'
      || setting.mode === 'percentCap'
      || setting.mode === 'percentTotal'
      ? setting.mode
      : 'none';
    const parsedValue = Number(setting.value);
    let value = Number.isFinite(parsedValue) ? parsedValue : 0;
    if (mode === 'percentCap' || mode === 'percentTotal') {
      value = Math.max(0, Math.min(100, value));
    } else {
      value = Math.max(0, value);
    }
    return { mode, value };
  }

  getResourceStrategicReserveAmount(resourceKey) {
    const setting = this.getResourceStrategicReserveSetting(resourceKey);
    if (setting.mode === 'none') return 0;
    if (setting.mode === 'amount') {
      return Math.max(0, setting.value || 0);
    }
    if (setting.mode === 'percentTotal') {
      return Math.max(0, (this.maxStorage * (setting.value || 0)) / 100);
    }
    let capLimit = this.getResourceCapLimit(resourceKey);
    if (!Number.isFinite(capLimit)) {
      capLimit = this.maxStorage;
    }
    return Math.max(0, (capLimit * (setting.value || 0)) / 100);
  }

  sanitizeResourceStrategicReserves() {
    for (const resourceKey in this.resourceStrategicReserves) {
      const setting = this.resourceStrategicReserves[resourceKey];
      if (!setting) {
        delete this.resourceStrategicReserves[resourceKey];
        continue;
      }
      const normalized = this.getResourceStrategicReserveSetting(resourceKey);
      if (normalized.mode === 'none') {
        delete this.resourceStrategicReserves[resourceKey];
      } else {
        this.resourceStrategicReserves[resourceKey] = normalized;
      }
    }
  }

  sanitizeResourceCaps() {
    for (const resourceKey in this.resourceCaps) {
      const setting = this.resourceCaps[resourceKey];
      if (!setting) {
        delete this.resourceCaps[resourceKey];
        continue;
      }
      const normalized = this.getResourceCapSettingFromSource(resourceKey, this.resourceCaps);
      if (normalized.mode === 'none') {
        delete this.resourceCaps[resourceKey];
      } else {
        this.resourceCaps[resourceKey] = normalized;
      }
    }
  }

  applyLegacyStrategicReserve(legacyValue) {
    const parsed = Number(legacyValue);
    const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (amount <= 0) return;
    const keys = new Set(SPACE_STORAGE_LEGACY_RESERVE_KEYS);
    this.selectedResources.forEach(entry => keys.add(entry.resource));
    Object.keys(resources?.spaceStorage || {}).forEach(key => keys.add(key));
    Object.keys(this.resourceCaps).forEach(key => keys.add(key));
    Object.keys(this.resourceTransferModes).forEach(key => keys.add(key));
    keys.forEach((key) => {
      this.resourceStrategicReserves[key] = { mode: 'amount', value: amount };
    });
  }

  clampStoredResourceToLimit(resourceKey, capLimit) {
    if (capLimit === Infinity) return;
    this.reconcileUsedStorage();
    const stored = this.getStoredResourceValue(resourceKey);
    const clamped = Math.max(0, Math.min(stored, capLimit));
    if (clamped === stored) return;
    this.setStoredResourceValue(resourceKey, clamped);
    this.reconcileUsedStorage();
  }

  getBiomassZones() {
    const zones = getZones();
    const entries = zones.map(zone => ({
      zone,
      amount: (terraforming?.zonalSurface?.[zone]?.biomass) || 0,
      percentage: getZonePercentage(zone) || 0
    }));
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { entries, total };
  }

  removeBiomassFromZones(amount) {
    if (!terraforming || amount <= 0) return 0;
    const { entries, total } = this.getBiomassZones();
    if (total <= 0) return 0;
    const requested = Math.min(amount, total);
    entries.forEach(entry => {
      if (entry.amount <= 0) return;
      const take = requested * (entry.amount / total);
      const zoneData = terraforming.zonalSurface?.[entry.zone];
      if (zoneData) {
        zoneData.biomass = Math.max(0, zoneData.biomass - take);
      }
    });
    terraforming.synchronizeGlobalResources();
    return requested;
  }

  addBiomassToZones(amount) {
    if (!terraforming || amount <= 0) return 0;
    const zones = getZones();
    const design = lifeDesigner?.currentDesign;
    let growZones = [];
    let surviveZones = [];
    if (design && typeof design.getGrowableZones === 'function' && typeof design.temperatureSurvivalCheck === 'function') {
      const growable = design.getGrowableZones() || [];
      const survival = design.temperatureSurvivalCheck() || {};
      growZones = growable.filter(zone => survival?.[zone]?.pass);
      surviveZones = Object.keys(survival || {}).filter(zone =>
        zone !== 'global' && survival[zone]?.pass && !growZones.includes(zone));
    } else if (terraforming.biomassDyingZones) {
      growZones = Object.keys(terraforming.biomassDyingZones).filter(zone => !terraforming.biomassDyingZones[zone]);
    }
    const targets = growZones.length ? growZones : (surviveZones.length ? surviveZones : zones);
    const totalPercent = targets.reduce((sum, zone) => sum + (getZonePercentage(zone) || 0), 0) || targets.length;

    targets.forEach(zone => {
      const percent = getZonePercentage(zone) || 1;
      const add = amount * (percent / totalPercent);
      const zoneData = terraforming.zonalSurface?.[zone];
      if (zoneData) {
        zoneData.biomass = (zoneData.biomass || 0) + add;
      }
    });
    terraforming.synchronizeGlobalResources();
    return amount;
  }

  getLiquidWaterZones() {
    const zones = getZones();
    const entries = zones.map(zone => ({
      zone,
      amount: terraforming.zonalSurface[zone].liquidWater || 0,
      percentage: getZonePercentage(zone) || 0
    }));
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { entries, total };
  }

  removeLiquidWaterFromZones(amount) {
    if (amount <= 0) return 0;
    const { entries, total } = this.getLiquidWaterZones();
    if (total <= 0) return 0;
    const requested = Math.min(amount, total);
    entries.forEach(entry => {
      if (entry.amount <= 0) return;
      const take = requested * (entry.amount / total);
      const zoneData = terraforming.zonalSurface[entry.zone];
      zoneData.liquidWater = Math.max(0, zoneData.liquidWater - take);
    });
    terraforming.synchronizeGlobalResources();
    return requested;
  }

  addLiquidWaterToZones(amount) {
    if (amount <= 0) return 0;
    const zones = getZones();
    const weights = zones.map(zone => getZonePercentage(zone) || 0);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || zones.length;
    zones.forEach((zone, index) => {
      const portion = amount * (weights[index] / totalWeight);
      terraforming.zonalSurface[zone].liquidWater += portion;
    });
    terraforming.synchronizeGlobalResources();
    return amount;
  }

  getExpansionLimit() {
    return Number.isFinite(this.maxRepeatCount) ? this.maxRepeatCount : Infinity;
  }

  isShipOperationContinuous() {
    return this.assignedSpaceships > 100;
  }

  calculateTransferAmount() {
    const perShip = this.getShipCapacity(this.attributes.transportPerShip || 0);
    const scalingFactor = this.isShipOperationContinuous()
      ? this.assignedSpaceships
      : 1;
    return perShip * scalingFactor;
  }

  getAvailableStoredResource(resourceKey) {
    const stored = this.getStoredResourceValue(resourceKey);
    const reserve = this.getResourceStrategicReserveAmount(resourceKey);
    return Math.max(0, stored - reserve);
  }

  calculateSpaceshipAdjustedDuration() {
    const maxShipsForDurationReduction = 100;
    if (this.isShipOperationContinuous()) {
      return this.shipBaseDuration;
    }
    const ships = Math.min(
      Math.max(this.assignedSpaceships, 1),
      maxShipsForDurationReduction
    );
    return this.shipBaseDuration / ships;
  }

  getBaseDuration() {
    const base = this.getDurationWithTerraformBonus(this.baseDuration);
    const speedMultiplier = this.getCurrentExpansionRecipeSpeedMultiplier();
    return base / speedMultiplier;
  }

  getShipOperationDuration() {
    const base = this.calculateSpaceshipAdjustedDuration();
    return this.applyDurationEffects(base);
  }

  start(resources) {
    this.shortfallLastTick = false;
    this.expansionProgress = 0;
    return this.startContinuousExpansion(resources);
  }

  toggleResourceSelection(category, resource, isSelected) {
    const exists = this.selectedResources.some(
      (r) => r.category === category && r.resource === resource
    );
    if (isSelected && !exists) {
      this.selectedResources.push({ category, resource });
    } else if (!isSelected && exists) {
      this.selectedResources = this.selectedResources.filter(
        (r) => !(r.category === category && r.resource === resource)
      );
    }
  }

  isResourceUnlocked(resourceKey, requiresFlag = null, requiresProjectFlag = null) {
    const requirement = SPACE_STORAGE_RESOURCE_REQUIREMENTS[resourceKey];
    const researchFlag = requiresFlag || requirement?.requiresFlag;
    const projectFlag = requiresProjectFlag || requirement?.requiresProjectFlag;
    const hasResearchFlag = !researchFlag || researchManager?.isBooleanFlagSet?.(researchFlag);
    const hasProjectFlag = !projectFlag || this.isBooleanFlagSet?.(projectFlag);
    return Boolean(hasResearchFlag && hasProjectFlag);
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    this.getExpansionRecipeKey();
  }

  getUnlockedSelectedResources() {
    if (!Array.isArray(this.selectedResources) || this.selectedResources.length === 0) {
      return [];
    }
    return this.selectedResources.filter(r => this.isResourceUnlocked(r.resource));
  }

  getResourceTransferMode(resourceKey) {
    const storedMode = this.resourceTransferModes[resourceKey];
    if (storedMode === 'store' || storedMode === 'withdraw') {
      return storedMode;
    }
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      return this.shipTransferMode;
    }
    return this.lastUniformTransferMode || 'store';
  }

  setShipTransferMode(mode) {
    if (mode !== 'store' && mode !== 'withdraw' && mode !== 'mixed') return;
    this.shipTransferMode = mode;
    if (mode === 'store' || mode === 'withdraw') {
      this.lastUniformTransferMode = mode;
      this.resourceTransferModes = {};
    }
  }

  setResourceTransferMode(resourceKey, mode) {
    if (mode !== 'store' && mode !== 'withdraw') return;
    this.resourceTransferModes[resourceKey] = mode;
  }

  updateShipTransferModeFromResources(resourceKeys) {
    const uniformMode = this.getResourceTransferMode(resourceKeys[0]);
    let mixed = false;
    for (let i = 1; i < resourceKeys.length; i += 1) {
      if (this.getResourceTransferMode(resourceKeys[i]) !== uniformMode) {
        mixed = true;
        break;
      }
    }
    if (mixed) {
      this.shipTransferMode = 'mixed';
    } else {
      this.setShipTransferMode(uniformMode);
    }
  }

  calculateTransferPlan(simulate = false, capacityOverride = null, selections = null) {
    this.reconcileUsedStorage();
    const transfers = [];
    let total = 0;
    const selected = selections ?? this.getUnlockedSelectedResources();
    if (selected.length === 0) return { transfers, total };
    const capacity = capacityOverride != null ? capacityOverride : this.calculateTransferAmount();
    if (!Number.isFinite(capacity) || capacity <= 0) return { transfers, total };

    const perResourceCapacity = capacity / selected.length;
    if (!Number.isFinite(perResourceCapacity) || perResourceCapacity <= 0) return { transfers, total };
    let availableFreeSpace = Math.max(0, this.maxStorage - this.usedStorage);

    const resolveMode = (resourceKey) => {
      if (this.shipTransferMode === 'mixed') {
        return this.getResourceTransferMode(resourceKey);
      }
      return this.shipTransferMode;
    };

    const applyWithdrawForResource = (entry) => {
      const stored = this.getStoredResourceValue(entry.resource);
      if (stored <= 0) return;
      const target = entry.resource === 'liquidWater'
        ? (this.waterWithdrawTarget === 'surface'
          ? { category: 'surface', resource: 'liquidWater' }
          : { category: 'colony', resource: 'water' })
        : { category: entry.category, resource: entry.resource };
      const targetRes = resources[target.category][target.resource];
      const destFree = targetRes && Number.isFinite(targetRes.cap) ? Math.max(0, targetRes.cap - targetRes.value) : Infinity;
      const amount = Math.min(perResourceCapacity, stored, destFree);
      if (!Number.isFinite(amount) || amount <= 0) return;
      transfers.push({ mode: 'withdraw', category: target.category, resource: target.resource, amount, storageKey: entry.resource });
      total += amount;
      availableFreeSpace += amount;
      if (!simulate) {
        this.removeStoredResource(entry.resource, amount);
        this.reconcileUsedStorage();
      }
    };

    const applyStoreForResource = (entry) => {
      if (!Number.isFinite(availableFreeSpace) || availableFreeSpace <= 0) return;
      const stored = this.getStoredResourceValue(entry.resource);
      const capLimit = this.getResourceCapLimit(entry.resource);
      const capRemaining = Math.max(0, capLimit - stored);
      if (capRemaining <= 0) return;
      let amount = 0;
      if (entry.resource === 'biomass') {
        const available = resources.surface.biomass?.value || 0;
        amount = Math.min(perResourceCapacity, available, capRemaining, availableFreeSpace);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const removed = simulate ? amount : this.removeBiomassFromZones(amount);
        if (!Number.isFinite(removed) || removed <= 0) return;
        transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount: removed });
        total += removed;
        availableFreeSpace = Math.max(0, availableFreeSpace - removed);
        return;
      }
      if (entry.resource === 'liquidWater') {
        const available = resources.surface.liquidWater.value;
        amount = Math.min(perResourceCapacity, available, capRemaining, availableFreeSpace);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const removed = simulate ? amount : this.removeLiquidWaterFromZones(amount);
        if (!Number.isFinite(removed) || removed <= 0) return;
        transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount: removed });
        total += removed;
        availableFreeSpace = Math.max(0, availableFreeSpace - removed);
        return;
      }
      const src = resources[entry.category][entry.resource];
      const available = src.value;
      amount = Math.min(perResourceCapacity, available, capRemaining, availableFreeSpace);
      if (!Number.isFinite(amount) || amount <= 0) return;
      transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount });
      total += amount;
      availableFreeSpace = Math.max(0, availableFreeSpace - amount);
      if (!simulate) {
        src.decrease(amount);
      }
    };

    selected.forEach(entry => {
      if (resolveMode(entry.resource) === 'withdraw') {
        applyWithdrawForResource(entry);
      }
    });

    selected.forEach(entry => {
      if (resolveMode(entry.resource) === 'store') {
        applyStoreForResource(entry);
      }
    });

    return { transfers, total };
  }

  applyShipOperationRateTooltip(durationSeconds, includeWithdraw = false) {
    if (durationSeconds <= 0) return;
    this.pendingTransfers.forEach(t => {
      if (t.mode !== 'store' && (!includeWithdraw || t.mode !== 'withdraw')) return;
      if (!Number.isFinite(t.amount) || t.amount <= 0) return;
      const spaceResource = this.getSpaceStorageResource(t.storageKey || t.resource);
      const res = resources[t.category][t.resource];
      const rate = t.amount / durationSeconds;
      if (spaceResource?.modifyRate) {
        spaceResource.modifyRate(
          t.mode === 'store' ? rate : -rate,
          'Space storage transfer',
          'project'
        );
      }
      res.modifyRate(t.mode === 'store' ? -rate : rate, 'Space storage transfer', 'project');
    });
  }

  canStart() {
    const base = Object.getPrototypeOf(SpaceshipProject.prototype);
    return base.canStart.call(this);
  }

  canStartShipOperation() {
    if (this.shipOperationIsActive) return false;
    if (this.assignedSpaceships <= 0) return false;
    const activeSelections = this.getUnlockedSelectedResources();
    if (activeSelections.length === 0) return false;
    const transferPlan = this.calculateTransferPlan(true, null, activeSelections);
    if (transferPlan.total <= 0) return false;
    const totalCost = this.calculateSpaceshipTotalCost();
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        if (resources[category][resource].value < totalCost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  startShipOperation() {
    if (!this.canStartShipOperation()) return false;
    const totalCost = this.calculateSpaceshipTotalCost();
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        resources[category][resource].decrease(totalCost[category][resource]);
      }
    }
    const plan = this.calculateTransferPlan(false);
    this.pendingTransfers = plan.transfers;
    this.shipOperationRemainingTime = this.getShipOperationDuration();
    this.shipOperationStartingDuration = this.shipOperationRemainingTime;
    this.shipOperationIsActive = true;
    this.shipOperationIsPaused = false;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerPending = true;
    this.shipOperationKesslerCost = this.calculateSpaceshipTotalCost();
    const durationSeconds = this.shipOperationStartingDuration / 1000;
    if (durationSeconds > 0) {
      this.applyShipOperationRateTooltip(durationSeconds, this.shipOperationAutoStart);
    }
    return true;
  }

  resumeShipOperation() {
    if (this.shipOperationIsPaused) {
      this.shipOperationIsActive = true;
      this.shipOperationIsPaused = false;
      return true;
    }
    return false;
  }

  applyShipOperationKesslerFailure() {
    const cost = this.shipOperationKesslerCost || this.calculateSpaceshipTotalCost();
    const debris = this.getNonEnergyCostTotal(cost) * 0.5 + this.getKesslerShipDebrisPerShip();
    this.addKesslerDebris(debris);
    this.loseAssignedShips(1);
    this.pendingTransfers = [];
    this.shipOperationIsActive = false;
    this.shipOperationIsPaused = false;
    this.shipOperationRemainingTime = this.shipOperationStartingDuration || 0;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerPending = false;
    this.shipOperationKesslerCost = null;
  }

  updateShipOperation(deltaTime) {
    if (!this.shipOperationIsActive || this.shipOperationIsPaused) return;
    if (this.shipOperationAutoStart) {
      const durationSeconds = this.shipOperationStartingDuration / 1000;
      if (durationSeconds > 0) {
        this.applyShipOperationRateTooltip(durationSeconds, true);
      }
    }
    const activeTime = Math.min(deltaTime, this.shipOperationRemainingTime);
    if (this.shipOperationKesslerPending) {
      this.shipOperationKesslerElapsed += activeTime;
      if (this.shipOperationKesslerElapsed >= 1000 || this.shipOperationRemainingTime <= activeTime) {
        this.shipOperationKesslerPending = false;
        if (Math.random() > this.getKesslerSuccessChance()) {
          this.applyShipOperationKesslerFailure();
          return;
        }
        this.shipOperationKesslerCost = null;
      }
    }
    this.shipOperationRemainingTime -= deltaTime;
    if (this.shipOperationRemainingTime <= 0) {
      this.completeShipOperation();
    }
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;

    const tick = this.getContinuousExpansionTickState(deltaTime);
    if (!tick.duration || tick.duration === Infinity) {
      this.isActive = false;
      return;
    }
    if (!tick.ready) {
      return;
    }

    const result = this.applyRequestedExpansionProgress(
      tick.requestedProgress,
      this.getScaledCost(),
      accumulatedChanges
    );
    this.shortfallLastTick = result.shortfall;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);
  }

  applyContinuousShipOperation(deltaTime) {
    this.reconcileUsedStorage();
    this.shipOperationKesslerPending = false;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerCost = null;
    const duration = this.getShipOperationDuration();
    const fraction = deltaTime / duration;
    const seconds = deltaTime / 1000;
    const successChance = this.getKesslerSuccessChance();
    const failureChance = 1 - successChance;
    const capacity = this.calculateTransferAmount() * fraction;
    if (capacity <= 0) {
      this.shipOperationIsActive = false;
      return;
    }

    const totalCost = this.calculateSpaceshipTotalCost();
    let nonEnergyCost = 0;
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const amount = totalCost[category][resource] * this.assignedSpaceships * fraction;
        if (resources[category][resource].value < amount) {
          this.shipOperationIsActive = false;
          return;
        }
        if (resource !== 'energy') {
          nonEnergyCost += amount;
        }
      }
    }

    const plan = this.calculateTransferPlan(true, capacity);
    if (plan.total <= 0) {
      this.shipOperationIsActive = false;
      return;
    }

    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const amount = totalCost[category][resource] * this.assignedSpaceships * fraction;
        resources[category][resource].decrease(amount);
      }
    }

    plan.transfers.forEach(t => {
      if (!Number.isFinite(t.amount) || t.amount <= 0) {
        return;
      }
      const delivered = t.amount * successChance;
      const rate = seconds > 0 ? t.amount / seconds : 0;
      const deliveredRate = seconds > 0 ? delivered / seconds : 0;
      const storageResource = this.getSpaceStorageResource(t.storageKey || t.resource);
      if (t.mode === 'withdraw') {
        this.removeStoredResource(t.storageKey, t.amount);
        if (t.resource === 'biomass') {
          this.addBiomassToZones(delivered);
          resources.surface.biomass?.modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          this.addLiquidWaterToZones(delivered);
          resources.surface.liquidWater.modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        } else {
          const res = resources[t.category][t.resource];
          res.increase(delivered);
          res.modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        }
      } else if (t.mode === 'store') {
        if (t.resource === 'biomass') {
          const removed = this.removeBiomassFromZones(t.amount);
          if (removed > 0) {
            const deliveredRemoved = removed * successChance;
            resources.surface.biomass?.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
            this.addStoredResource(t.resource, deliveredRemoved);
            storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
          }
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          const removed = this.removeLiquidWaterFromZones(t.amount);
          if (removed > 0) {
            const deliveredRemoved = removed * successChance;
            resources.surface.liquidWater.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
            this.addStoredResource(t.resource, deliveredRemoved);
            storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
          }
        } else {
          const res = resources[t.category][t.resource];
          res.decrease(t.amount);
          res.modifyRate(-rate, 'Space storage transfer', 'project');
          this.addStoredResource(t.resource, delivered);
          storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
        }
      }
    });
    this.reconcileUsedStorage();

    if (failureChance > 0) {
      const shipLoss = this.assignedSpaceships * fraction * failureChance;
      this.applyContinuousKesslerDebris(nonEnergyCost * failureChance, shipLoss, seconds);
    }
    this.shipOperationIsActive = true;
  }

  completeShipOperation() {
    this.shipOperationIsActive = false;
    const durationSeconds = this.shipOperationStartingDuration / 1000;
    this.pendingTransfers.forEach(t => {
      if (!Number.isFinite(t.amount) || t.amount <= 0) {
        return;
      }
      if (t.mode === 'withdraw') {
        const storageResource = this.getSpaceStorageResource(t.storageKey || t.resource);
        this.removeStoredResource(t.storageKey, t.amount);
        if (t.resource === 'biomass') {
          this.addBiomassToZones(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            resources.surface.biomass?.modifyRate(rate, 'Space storage transfer', 'project');
            storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
          }
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          this.addLiquidWaterToZones(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            resources.surface.liquidWater.modifyRate(rate, 'Space storage transfer', 'project');
            storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
          }
        } else {
          const res = resources[t.category][t.resource];
          res.increase(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            res.modifyRate(rate, 'Space storage transfer', 'project');
            storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
          }
        }
      } else if (t.mode === 'store') {
        this.addStoredResource(t.resource, t.amount);
      }
    });
    this.reconcileUsedStorage();
    this.pendingTransfers = [];
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (this.isActive) {
      const duration = this.getEffectiveDuration();
      const fraction = deltaTime / duration;
      const cost = this.getScaledCost();
      const storageState = this.createExpansionStorageState(accumulatedChanges);
      const effectiveFraction = this.isContinuous()
        ? this.getAffordableExpansionProgress(fraction, cost, storageState, accumulatedChanges)
        : fraction;
      if (effectiveFraction > 0) {
        const expansionCostTotals = this.estimateExpansionCostForProgress(
          cost,
          effectiveFraction,
          deltaTime,
          accumulatedChanges,
          storageState,
          {
            applyRates,
            sourceLabel: 'Space storage expansion'
          }
        );
        this.mergeResourceTotals(totals.cost, expansionCostTotals);
      }
    }
    if (this.shipOperationIsActive) {
      if (this.isShipOperationContinuous()) {
        const perSecondCost = this.calculateSpaceshipTotalCost(true);
        for (const category in perSecondCost) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in perSecondCost[category]) {
            const rateValue = perSecondCost[category][resource] * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                'Space storage transfer',
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + perSecondCost[category][resource] * deltaTime / 1000;
          }
        }
      } else {
        const duration = this.shipOperationStartingDuration || this.getShipOperationDuration();
        const rate = 1000 / duration;
        const fraction = deltaTime / duration;
        const cost = this.calculateSpaceshipTotalCost();
        for (const category in cost) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in cost[category]) {
            const rateValue = cost[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                'Space storage transfer',
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + cost[category][resource] * fraction;
          }
        }
      }
    }
    return totals;
  }

  createProjectDetailsGridUI(container) {
    super.createProjectDetailsGridUI(container);
    const els = projectElements[this.name];
    const grid = els.totalGainElement ? els.totalGainElement.parentElement : null;
    if (grid) {
      const transferRate = document.createElement('div');
      transferRate.id = `${this.name}-transfer-rate`;
      projectElements[this.name].transferRateElement = transferRate;
      grid.appendChild(transferRate);
    }
  }

  updateCostAndGains(elements) {
    if (!elements) return;
    if (elements.costPerShipElement && this.attributes.costPerShip) {
      const costPerShip = this.calculateSpaceshipCost();
      const costPerShipText = Object.entries(costPerShip)
        .flatMap(([category, resourcesList]) =>
          Object.entries(resourcesList)
            .filter(([, adjustedCost]) => adjustedCost > 0)
            .map(([resource, adjustedCost]) => {
              const resourceDisplayName = resources[category][resource].displayName ||
                resource.charAt(0).toUpperCase() + resource.slice(1);
              return `${resourceDisplayName}: ${formatNumber(adjustedCost, true)}`;
            })
        )
        .join(', ');
      elements.costPerShipElement.textContent = `Cost per Shipment: ${costPerShipText}`;
    }

    if (elements.totalCostElement && this.assignedSpaceships != null) {
      const perSecond = this.isShipOperationContinuous();
      const totalCost = this.calculateSpaceshipTotalCost(perSecond);
      elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost, null, perSecond);
    }

    if (elements.resourceGainPerShipElement && this.attributes.resourceGainPerShip) {
      const gainPerShip = this.calculateSpaceshipGainPerShip();
      const gainPerShipText = Object.entries(gainPerShip)
        .flatMap(([category, resourcesList]) =>
          Object.entries(resourcesList)
            .filter(([, amount]) => amount > 0)
            .map(([resource, amount]) => {
              const resourceDisplayName = resources[category][resource].displayName ||
                resource.charAt(0).toUpperCase() + resource.slice(1);
              return `${resourceDisplayName}: ${formatNumber(amount, true)}`;
            })
        ).join(', ');
      elements.resourceGainPerShipElement.textContent = `Gain per Shipment: ${gainPerShipText}`;
    }

    if (elements.totalGainElement && this.assignedSpaceships != null) {
      const perSecond = this.isShipOperationContinuous();
      const totalGain = this.calculateSpaceshipTotalResourceGain(perSecond);
      if (Object.keys(totalGain).length > 0) {
        elements.totalGainElement.textContent = formatTotalResourceGainDisplay(totalGain, perSecond);
        elements.totalGainElement.style.display = 'block';
      } else {
        elements.totalGainElement.style.display = 'none';
      }
    }

    if (elements.transferRateElement) {
      const amount = this.calculateTransferAmount();
      const seconds = this.getShipOperationDuration() / 1000;
      const rate = seconds > 0 ? amount / seconds : 0;
      elements.transferRateElement.textContent = `Transfer Rate: ${formatNumber(rate, true)}/s`;
    }
  }

  renderUI(container) {
    projectElements[this.name] = projectElements[this.name] || {};

    const els = projectElements[this.name];
    if (els.costElement) {
      els.costElement.remove();
      delete els.costElement;
    }

    const topSection = document.createElement('div');
    topSection.classList.add('space-storage-top-section');
    if (typeof renderSpaceStorageUI === 'function') {
      renderSpaceStorageUI(this, topSection);
      if (typeof updateSpaceStorageUI === 'function') {
        updateSpaceStorageUI(this);
      }
    }
    container.appendChild(topSection);
    this.updateCostAndGains(projectElements[this.name]);
  }

  updateUI() {
    super.updateUI();
    this.syncSpaceStorageResourceUnlocks();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(this);
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.syncSpaceStorageResourceUnlocks();
    this.usedStorageResyncTimer += deltaTime;
    while (this.usedStorageResyncTimer >= 1000) {
      this.usedStorageResyncTimer -= 1000;
      this.reconcileUsedStorage();
    }
    if (this.isShipOperationContinuous()) {
      if (this.shipOperationAutoStart) {
        this.applyContinuousShipOperation(deltaTime);
      } else {
        this.shipOperationIsActive = false;
      }
    } else if (this.shipOperationIsActive) {
      this.updateShipOperation(deltaTime);
    } else if (this.shipOperationAutoStart && this.canStartShipOperation()) {
      this.startShipOperation();
    }
  }

  saveAutomationSettings() {
    const expansionRecipeKey = this.getExpansionRecipeKey();
    const capsAndReserveSettings = this.saveCapsAndReserveAutomationSettings();
    return {
      ...super.saveAutomationSettings(),
      expansionRecipeKey,
      selectedResources: Array.isArray(this.selectedResources)
        ? this.selectedResources.map(entry => ({
            category: entry.category,
            resource: entry.resource
          }))
        : [],
      shipOperationAutoStart: this.shipOperationAutoStart === true,
      shipTransferMode: this.shipTransferMode,
      lastUniformTransferMode: this.lastUniformTransferMode,
      resourceTransferModes: { ...(this.resourceTransferModes || {}) },
      megaProjectResourceMode: this.megaProjectResourceMode,
      megaProjectSpaceOnlyOnTravel: this.megaProjectSpaceOnlyOnTravel === true,
      waterWithdrawTarget: this.waterWithdrawTarget,
      ...capsAndReserveSettings
    };
  }

  saveCapsAndReserveAutomationSettings() {
    return {
      resourceStrategicReserves: JSON.parse(JSON.stringify(this.resourceStrategicReserves || {})),
      resourceCaps: JSON.parse(JSON.stringify(this.resourceCaps || {}))
    };
  }

  saveOtherAutomationSettings() {
    const settings = this.saveAutomationSettings();
    delete settings.resourceStrategicReserves;
    delete settings.resourceCaps;
    return settings;
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'expansionRecipeKey')) {
      this.expansionRecipeKey = settings.expansionRecipeKey || this.expansionRecipeKey;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'selectedResources')) {
      const selected = Array.isArray(settings.selectedResources) ? settings.selectedResources : [];
      this.selectedResources = selected
        .filter(entry => entry && entry.category && entry.resource)
        .map(entry => ({ category: entry.category, resource: entry.resource }));
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'shipOperationAutoStart')) {
      this.shipOperationAutoStart = settings.shipOperationAutoStart === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'shipTransferMode')) {
      let transferMode = settings.shipTransferMode;
      if (transferMode === 'deposit') {
        transferMode = 'store';
      }
      if (transferMode !== 'store' && transferMode !== 'withdraw' && transferMode !== 'mixed') {
        transferMode = 'store';
      }
      this.shipTransferMode = transferMode;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'lastUniformTransferMode')) {
      this.lastUniformTransferMode = settings.lastUniformTransferMode || this.lastUniformTransferMode;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceTransferModes')) {
      this.resourceTransferModes = { ...(settings.resourceTransferModes || {}) };
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'megaProjectResourceMode')) {
      if (MEGA_PROJECT_RESOURCE_MODE_MAP[settings.megaProjectResourceMode]) {
        this.megaProjectResourceMode = settings.megaProjectResourceMode;
      }
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'megaProjectSpaceOnlyOnTravel')) {
      this.megaProjectSpaceOnlyOnTravel = settings.megaProjectSpaceOnlyOnTravel === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'waterWithdrawTarget')) {
      this.waterWithdrawTarget = settings.waterWithdrawTarget || 'colony';
    }
    this.loadCapsAndReserveAutomationSettings(settings);
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      this.resourceTransferModes = {};
      this.lastUniformTransferMode = this.shipTransferMode;
    }
    if (this.megaProjectSpaceOnlyOnTravel) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY;
    }
    this.getExpansionRecipeKey();
  }

  loadCapsAndReserveAutomationSettings(settings = {}) {
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceStrategicReserves')) {
      this.resourceStrategicReserves = settings.resourceStrategicReserves
        ? JSON.parse(JSON.stringify(settings.resourceStrategicReserves))
        : {};
      this.sanitizeResourceStrategicReserves();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceCaps')) {
      this.resourceCaps = settings.resourceCaps ? JSON.parse(JSON.stringify(settings.resourceCaps)) : {};
      this.sanitizeResourceCaps();
    }
  }

  loadOtherAutomationSettings(settings = {}) {
    const filteredSettings = {};
    for (const key in settings) {
      if (key === 'resourceStrategicReserves' || key === 'resourceCaps') {
        continue;
      }
      filteredSettings[key] = settings[key];
    }
    this.loadAutomationSettings(filteredSettings);
  }

  exportSpaceStorageValues() {
    const values = {};
    for (let i = 0; i < SPACE_STORAGE_RESOURCE_KEYS.length; i += 1) {
      const key = SPACE_STORAGE_RESOURCE_KEYS[i];
      values[key] = this.getStoredResourceValue(key);
    }
    return values;
  }

  importSpaceStorageValues(values = {}, legacyResourceUsage = null) {
    const source = values && typeof values === 'object' ? values : {};
    const legacy = legacyResourceUsage && typeof legacyResourceUsage === 'object'
      ? legacyResourceUsage
      : null;
    for (let i = 0; i < SPACE_STORAGE_RESOURCE_KEYS.length; i += 1) {
      const key = SPACE_STORAGE_RESOURCE_KEYS[i];
      let amount = source[key];
      if (amount === undefined && legacy) {
        amount = legacy[key];
      }
      if (amount !== undefined) {
        this.setStoredResourceValue(key, amount);
      }
    }
    this.reconcileUsedStorage();
  }

  exportSpaceTravelResourceValues() {
    const values = {};
    const spaceResources = resources?.space || {};
    for (let i = 0; i < SPACE_TRAVEL_RESOURCE_KEYS.length; i += 1) {
      const key = SPACE_TRAVEL_RESOURCE_KEYS[i];
      values[key] = Number(spaceResources[key]?.value) || 0;
    }
    return values;
  }

  importSpaceTravelResourceValues(values = {}) {
    const source = values && typeof values === 'object' ? values : {};
    const spaceResources = resources?.space;
    if (!spaceResources) {
      return;
    }
    for (let i = 0; i < SPACE_TRAVEL_RESOURCE_KEYS.length; i += 1) {
      const key = SPACE_TRAVEL_RESOURCE_KEYS[i];
      if (source[key] === undefined || !spaceResources[key]) {
        continue;
      }
      const value = Number(source[key]);
      spaceResources[key].value = Number.isFinite(value) && value > 0 ? value : 0;
    }
  }

  saveState() {
    const expansionRecipeKey = this.getExpansionRecipeKey();
    return {
      ...super.saveState(),
      expansionRecipeKey,
      expansionProgress: this.expansionProgress,
      usedStorage: this.usedStorage,
      selectedResources: this.selectedResources,
      spaceResources: this.exportSpaceStorageValues(),
      pendingTransfers: this.pendingTransfers,
      megaProjectResourceMode: this.megaProjectResourceMode,
      megaProjectSpaceOnlyOnTravel: this.megaProjectSpaceOnlyOnTravel,
      resourceStrategicReserves: this.resourceStrategicReserves,
      waterWithdrawTarget: this.waterWithdrawTarget,
      resourceCaps: this.resourceCaps,
      shipTransferMode: this.shipTransferMode,
      lastUniformTransferMode: this.lastUniformTransferMode,
      resourceTransferModes: this.resourceTransferModes,
      shipOperation: {
        remainingTime: this.shipOperationRemainingTime,
        startingDuration: this.shipOperationStartingDuration,
        isActive: this.shipOperationIsActive,
        isPaused: this.shipOperationIsPaused,
        autoStart: this.shipOperationAutoStart,
        mode: this.shipTransferMode === 'withdraw'
          ? 'withdraw'
          : (this.shipTransferMode === 'mixed' ? 'mixed' : 'deposit'),
        kesslerElapsed: this.shipOperationKesslerElapsed,
        kesslerPending: this.shipOperationKesslerPending,
        kesslerCost: this.shipOperationKesslerCost
      },
    };
  }

  loadState(state) {
    super.loadState(state);
    this.expansionRecipeKey = state.expansionRecipeKey || this.expansionRecipeKey;
    this.expansionProgress = state.expansionProgress || 0;
    this.usedStorage = state.usedStorage || 0;
    this.selectedResources = state.selectedResources || [];
    this.importSpaceStorageValues(state.spaceResources, state.resourceUsage);
    this.pendingTransfers = state.pendingTransfers || [];
    if (MEGA_PROJECT_RESOURCE_MODE_MAP[state.megaProjectResourceMode]) {
      this.megaProjectResourceMode = state.megaProjectResourceMode;
    } else if (state.prioritizeMegaProjects === false) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.COLONY_FIRST;
    } else if (state.prioritizeMegaProjects === true) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    } else {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    }
    this.megaProjectSpaceOnlyOnTravel = state.megaProjectSpaceOnlyOnTravel === true;
    this.resourceStrategicReserves = state.resourceStrategicReserves || {};
    this.sanitizeResourceStrategicReserves();
    if (!state.resourceStrategicReserves && state.strategicReserve > 0) {
      this.applyLegacyStrategicReserve(state.strategicReserve);
    }
    this.waterWithdrawTarget = state.waterWithdrawTarget || 'colony';
    this.resourceCaps = state.resourceCaps || {};
    this.sanitizeResourceCaps();
    this.resourceTransferModes = state.resourceTransferModes || {};
    const ship = state.shipOperation || {};
    this.shipOperationRemainingTime = ship.remainingTime || 0;
    this.shipOperationStartingDuration = ship.startingDuration || 0;
    this.shipOperationIsActive = ship.isActive || false;
    this.shipOperationIsPaused = ship.isPaused || false;
    this.shipOperationAutoStart = ship.autoStart || false;
    let transferMode = state.shipTransferMode || ship.mode;
    if (transferMode === 'deposit') transferMode = 'store';
    if (transferMode !== 'store' && transferMode !== 'withdraw' && transferMode !== 'mixed') {
      transferMode = 'store';
    }
    this.shipTransferMode = transferMode;
    this.lastUniformTransferMode = state.lastUniformTransferMode || (transferMode === 'mixed' ? 'store' : transferMode);
    if (transferMode === 'store' || transferMode === 'withdraw') {
      this.resourceTransferModes = {};
    }
    this.shipOperationKesslerElapsed = ship.kesslerElapsed || 0;
    this.shipOperationKesslerPending = ship.kesslerPending === true;
    this.shipOperationKesslerCost = ship.kesslerCost || null;
    this.getExpansionRecipeKey();
    this.syncSpaceStorageResourceUnlocks();
    this.reconcileUsedStorage();
  }

  saveTravelState() {
    const expansionRecipeKey = this.getExpansionRecipeKey();
    return {
      repeatCount: this.repeatCount,
      expansionRecipeKey,
      expansionProgress: this.expansionProgress,
      usedStorage: this.usedStorage,
      spaceResources: this.exportSpaceStorageValues(),
      travelSpaceResources: this.exportSpaceTravelResourceValues(),
      megaProjectResourceMode: this.megaProjectResourceMode,
      megaProjectSpaceOnlyOnTravel: this.megaProjectSpaceOnlyOnTravel,
      resourceStrategicReserves: this.resourceStrategicReserves,
      resourceCaps: this.resourceCaps,
      shipTransferMode: this.shipTransferMode,
      lastUniformTransferMode: this.lastUniformTransferMode,
      resourceTransferModes: this.resourceTransferModes,
    };
  }

  loadTravelState(state = {}) {
    this.repeatCount = state.repeatCount || 0;
    this.expansionRecipeKey = state.expansionRecipeKey || this.expansionRecipeKey;
    this.expansionProgress = state.expansionProgress || 0;
    this.usedStorage = state.usedStorage || 0;
    this.importSpaceStorageValues(state.spaceResources, state.resourceUsage);
    this.importSpaceTravelResourceValues(state.travelSpaceResources);
    this.resourceStrategicReserves = state.resourceStrategicReserves || {};
    this.sanitizeResourceStrategicReserves();
    if (!state.resourceStrategicReserves && state.strategicReserve > 0) {
      this.applyLegacyStrategicReserve(state.strategicReserve);
    }
    this.resourceCaps = state.resourceCaps || {};
    this.sanitizeResourceCaps();
    this.shipTransferMode = state.shipTransferMode || this.shipTransferMode;
    this.lastUniformTransferMode = state.lastUniformTransferMode || this.lastUniformTransferMode;
    this.resourceTransferModes = state.resourceTransferModes || {};
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      this.resourceTransferModes = {};
      this.lastUniformTransferMode = this.shipTransferMode;
    }
    if (MEGA_PROJECT_RESOURCE_MODE_MAP[state.megaProjectResourceMode]) {
      this.megaProjectResourceMode = state.megaProjectResourceMode;
    } else if (state.prioritizeMegaProjects === false) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.COLONY_FIRST;
    } else if (state.prioritizeMegaProjects === true) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    }
    this.megaProjectSpaceOnlyOnTravel = state.megaProjectSpaceOnlyOnTravel === true;
    if (this.megaProjectSpaceOnlyOnTravel) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY;
    }
    this.getExpansionRecipeKey();
    this.syncSpaceStorageResourceUnlocks();
    this.reconcileUsedStorage();
  }
}

const SPACE_STORAGE_CONTINUOUS_METHODS = [
  'isExpansionContinuous',
  'isContinuous',
  'startContinuousExpansion',
  'getExpansionProgressField',
  'getExpansionCompletedField',
  'getExpansionProgressValue',
  'setExpansionProgressValue',
  'getExpansionCompletedValue',
  'setExpansionCompletedValue',
  'getExpansionCompletedTotal',
  'getContinuousExpansionTickState',
  'applyExpansionColonyChange',
  'applyExpansionCostForProgress',
  'applyExpansionSpentRates',
  'applyRequestedExpansionProgress',
  'estimateExpansionCostForProgress',
  'mergeResourceTotals',
  'createExpansionStorageState',
  'getAffordableExpansionProgress',
  'getRemainingExpansionCapacity',
  'applyFractionalProgress',
  'carryDiscreteExpansionProgress',
  'applyExpansionProgress',
];

SPACE_STORAGE_CONTINUOUS_METHODS.forEach((methodName) => {
  const method = SpaceStorageContinuousExpansionHelpers[methodName];
  if (!method) {
    throw new Error(`Missing continuous expansion method: ${methodName}`);
  }
  SpaceStorageProject.prototype[methodName] = method;
});

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
