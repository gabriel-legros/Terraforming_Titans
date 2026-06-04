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
const SPACE_STORAGE_IMPORT_LIMIT_RESOURCE_PROJECTS = {
  liquidWater: 'waterSpaceMining',
  carbonDioxide: 'carbonSpaceMining',
  inertGas: 'nitrogenSpaceMining',
  hydrogen: 'hydrogenSpaceMining'
};
const SPACE_STORAGE_PRESSURE_LIMIT_RESOURCES = {
  oxygen: 'oxygen',
  atmosphericMethane: 'atmosphericMethane',
  atmosphericAmmonia: 'atmosphericAmmonia'
};
const SPACE_STORAGE_DEFAULT_EXPANSION_RECIPE_KEY = 'standard';

function getSpaceStorageProjectText(path, vars, fallback = '') {
  try {
    return t(`ui.projects.spaceStorage.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

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
    this.shipBaseDuration = this.attributes.shipBaseDuration || 25_000;
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
    this.resourceTransferWeights = {};
    this.resourceImportLimitRespects = {};
    this.resourceBiomassDensityWithdrawLimits = {};
    this.resourcePressureWithdrawLimits = {};
    this.pendingTransfers = [];
    this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    this.megaProjectSpaceOnlyOnTravel = false;
    this.waterWithdrawTarget = 'colony';
    this.hydrogenTransferTarget = 'atmospheric';
    this.artificialEcosystemsEnabled = false;
    this.resourceStrategicReserves = {};
    this.usedStorageResyncTimer = 0;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerPending = false;
    this.shipOperationKesslerCost = null;
    this.transferMethod = 'spaceships';
    this.teleporterTransferRate = 0;
    this.teleporterTransferRateBasis = 'fixed';
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

  getEffectiveStorageCapacityMultiplier() {
    let bonus = 0;
    this.activeEffects.forEach((effect) => {
      if (effect?.type !== 'spaceStorageCapacityMultiplier') {
        return;
      }
      const value = Number(effect.value);
      if (Number.isFinite(value) && value > 0) {
        bonus += value;
      }
    });
    return Math.max(1, 1 + bonus);
  }

  get maxStorage() {
    return this.getTotalExpansions() * this.capacityPerCompletion * this.getEffectiveStorageCapacityMultiplier();
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

  getExpansionRateSourceLabel() {
    return 'Space storage expansion';
  }

  getHazardousMachineryWorkerLoadActive() {
    const hasShips = this.getActiveShipCount() > 0;
    const transferActive = this.shipOperationIsActive && !this.shipOperationIsPaused && hasShips;
    return transferActive;
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

  spendStoredResource(resourceKey, amount, scopeFilter = null) {
    const spend = Number(amount);
    if (!Number.isFinite(spend) || spend <= 0) return 0;
    const available = this.getAvailableStoredResource(resourceKey, scopeFilter);
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
    const mode = setting.mode === 'amount'
      || setting.mode === 'percent'
      || setting.mode === 'weight'
      || setting.mode === 'remaining'
      ? setting.mode
      : 'none';
    const parsedValue = Number(setting.value);
    let value = Number.isFinite(parsedValue) ? parsedValue : 0;
    if (mode === 'percent') {
      value = Math.max(0, Math.min(100, value));
    } else if (mode === 'weight') {
      value = Math.max(0, Math.floor(value));
    } else if (mode === 'remaining') {
      value = 0;
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
    let remainingCount = 0;
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
        return;
      }
      if (setting.mode === 'remaining') {
        remainingCount += 1;
      }
    });

    const remainingStorage = Math.max(0, this.maxStorage - fixedTotal);
    if (remainingCount > 0) {
      const splitCap = remainingStorage / remainingCount;
      keys.forEach((resourceKey) => {
        if (Object.prototype.hasOwnProperty.call(limits, resourceKey)) {
          return;
        }
        const setting = this.getResourceCapSettingFromSource(resourceKey, sourceCaps);
        limits[resourceKey] = setting.mode === 'remaining' ? splitCap : 0;
      });
      return limits;
    }

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
    const rawScope = setting.scope || {};
    const scope = {
      expansions: rawScope.expansions !== false,
      transfers: rawScope.transfers === true,
      consumption: rawScope.consumption === true,
    };
    return { mode, value, scope };
  }

  getResourceStrategicReserveAmount(resourceKey, scopeFilter = null) {
    const setting = this.getResourceStrategicReserveSetting(resourceKey);
    if (setting.mode === 'none') return 0;
    if (scopeFilter && !setting.scope[scopeFilter]) return 0;
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
        this.resourceStrategicReserves[resourceKey] = {
          mode: normalized.mode,
          value: normalized.value,
          scope: normalized.scope,
        };
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
    return this.isTeleporterTransferActive() || this.assignedSpaceships > 100;
  }

  isTeleporterTransferUnlocked() {
    return this.isBooleanFlagSet('teleporters');
  }

  isTeleporterTransferActive() {
    return this.isTeleporterTransferUnlocked() && this.transferMethod === 'teleporters';
  }

  setTransferMethod(method) {
    this.transferMethod = method === 'teleporters' && this.isTeleporterTransferUnlocked()
      ? 'teleporters'
      : 'spaceships';
    if (this.isTeleporterTransferActive()) {
      this.releaseTeleporterAssignedShips();
    }
  }

  setTeleporterTransferRate(rate) {
    const parsed = Number(rate);
    this.teleporterTransferRate = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    return this.teleporterTransferRate;
  }

  setTeleporterTransferRateBasis(basis) {
    this.teleporterTransferRateBasis = basis === 'workers' ? 'workers' : 'fixed';
  }

  getTeleporterWorkerCount() {
    return Math.max(
      resources.colony.workers.value || 0,
      resources.colony.workers.cap || 0,
      resources.colony.workers.potential || 0
    );
  }

  getTeleporterTransferRate() {
    const rate = Math.max(0, Number(this.teleporterTransferRate) || 0);
    if (this.teleporterTransferRateBasis === 'workers') {
      return rate * this.getTeleporterWorkerCount();
    }
    return rate;
  }

  releaseTeleporterAssignedShips() {
    if (this.assignedSpaceships > 0) {
      this.assignSpaceships(-this.assignedSpaceships);
    }
    this.autoAssignSpaceships = false;
    const elements = projectElements[this.name];
    if (elements && elements.autoAssignCheckbox) {
      elements.autoAssignCheckbox.checked = false;
    }
  }

  getMaxAssignableShips() {
    return this.isTeleporterTransferActive() ? 0 : Infinity;
  }

  shouldAutomationDisable() {
    return this.isTeleporterTransferActive();
  }

  calculateTransferAmount() {
    if (this.isTeleporterTransferActive()) {
      return this.getTeleporterTransferRate();
    }
    const perShip = this.getShipCapacity(this.attributes.transportPerShip || 0);
    const scalingFactor = this.isShipOperationContinuous()
      ? this.assignedSpaceships
      : 1;
    return perShip * scalingFactor;
  }

  getShipTransferModeForResource(resourceKey) {
    if (this.shipTransferMode === 'mixed') {
      return this.getResourceTransferMode(resourceKey);
    }
    return this.shipTransferMode;
  }

  hasContinuousTransferMode(mode) {
    if (!this.shipOperationIsActive || this.shipOperationIsPaused) {
      return false;
    }
    if (!this.isTeleporterTransferActive() && this.assignedSpaceships <= 0) {
      return false;
    }
    if (!this.isShipOperationContinuous()) {
      return false;
    }
    const selected = this.getUnlockedSelectedResources();
    for (let i = 0; i < selected.length; i += 1) {
      if (this.getShipTransferModeForResource(selected[i].resource) === mode) {
        return true;
      }
    }
    return false;
  }

  usesContinuousWithdrawalProductivity() {
    return !this.isWithdrawalDisabled() && this.hasContinuousTransferMode('withdraw');
  }

  getAvailableStoredResource(resourceKey, scopeFilter = null) {
    const stored = this.getStoredResourceValue(resourceKey);
    const reserve = this.getResourceStrategicReserveAmount(resourceKey, scopeFilter);
    return Math.max(0, stored - reserve);
  }

  getPendingResourceDelta(accumulatedChanges, category, resourceKey) {
    return accumulatedChanges?.[category]?.[resourceKey] || 0;
  }

  getResourceValueForTick(category, resourceKey, accumulatedChanges = null) {
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return 0;
    }
    return Math.max(0, resource.value + this.getPendingResourceDelta(accumulatedChanges, category, resourceKey));
  }

  getStoredResourceValueForTick(resourceKey, accumulatedChanges = null) {
    return Math.max(0, this.getStoredResourceValue(resourceKey) + this.getPendingResourceDelta(accumulatedChanges, 'spaceStorage', resourceKey));
  }

  getAvailableStoredResourceForTick(resourceKey, scopeFilter = null, accumulatedChanges = null) {
    const stored = this.getStoredResourceValueForTick(resourceKey, accumulatedChanges);
    const reserve = this.getResourceStrategicReserveAmount(resourceKey, scopeFilter);
    return Math.max(0, stored - reserve);
  }

  getUsedStorageForTick(accumulatedChanges = null) {
    let used = 0;
    const storageResources = resources?.spaceStorage;
    if (storageResources) {
      for (const resourceKey in storageResources) {
        const entry = storageResources[resourceKey];
        const value = Number(entry?.value);
        if (Number.isFinite(value) && value > 0) {
          used += value;
        }
      }
    }
    const pendingStorage = accumulatedChanges?.spaceStorage || null;
    if (!pendingStorage) {
      return Math.max(0, used);
    }
    for (const resourceKey in pendingStorage) {
      used += pendingStorage[resourceKey] || 0;
    }
    return Math.max(0, used);
  }

  getStorageFreeSpaceForTick(accumulatedChanges = null) {
    return Math.max(0, this.maxStorage - this.getUsedStorageForTick(accumulatedChanges));
  }

  getStorageCapRemainingForTick(resourceKey, accumulatedChanges = null) {
    const capLimit = this.getResourceCapLimit(resourceKey);
    if (!Number.isFinite(capLimit)) {
      return Infinity;
    }
    return Math.max(0, capLimit - this.getStoredResourceValueForTick(resourceKey, accumulatedChanges));
  }

  computeStorageIntakePlan(gainMap = null, accumulatedChanges = null, scale = 1) {
    const allowedByResource = {};
    const limitedResources = [];
    if (!gainMap || !(scale > 0)) {
      return {
        ratio: 1,
        desiredTotal: 0,
        allowedTotal: 0,
        allowedByResource,
        limitedResources,
      };
    }

    let ratio = 1;
    let desiredTotal = 0;
    let allowedTotal = 0;
    let remainingStorageSpace = this.getStorageFreeSpaceForTick(accumulatedChanges);

    for (const resourceKey in gainMap) {
      const baseAmount = gainMap[resourceKey];
      const desired = baseAmount * scale;
      if (!(desired > 0)) {
        allowedByResource[resourceKey] = 0;
        continue;
      }

      desiredTotal += desired;
      const perResourceRemaining = this.getStorageCapRemainingForTick(resourceKey, accumulatedChanges);
      const allowed = Math.max(0, Math.min(desired, perResourceRemaining, remainingStorageSpace));
      allowedByResource[resourceKey] = allowed;
      allowedTotal += allowed;
      remainingStorageSpace = Math.max(0, remainingStorageSpace - allowed);

      if (allowed + 1e-12 < desired) {
        limitedResources.push(resourceKey);
      }
      const resourceRatio = desired > 0 ? Math.max(0, Math.min(1, allowed / desired)) : 1;
      ratio = Math.min(ratio, resourceRatio);
    }

    return {
      ratio,
      desiredTotal,
      allowedTotal,
      allowedByResource,
      limitedResources,
    };
  }

  getTransferSourceAvailableForTick(entry, accumulatedChanges = null) {
    if (entry.resource === 'biomass') {
      return Math.max(0, resources.surface.biomass?.value || 0);
    }
    if (entry.resource === 'liquidWater' && entry.category === 'surface') {
      return Math.max(0, resources.surface.liquidWater?.value || 0);
    }
    return this.getResourceValueForTick(entry.category, entry.resource, accumulatedChanges);
  }

  getWaterTransferEndpoint(mode) {
    if (mode === 'withdraw') {
      return this.waterWithdrawTarget === 'surface'
        ? { category: 'surface', resource: 'liquidWater' }
        : { category: 'colony', resource: 'water' };
    }
    return this.waterWithdrawTarget === 'surface'
      ? { category: 'surface', resource: 'liquidWater' }
      : { category: 'colony', resource: 'water' };
  }

  getHydrogenTransferEndpoint() {
    return this.hydrogenTransferTarget === 'colony'
      ? { category: 'colony', resource: 'colonyHydrogen' }
      : { category: 'atmospheric', resource: 'hydrogen' };
  }

  getTransferEndpoint(entry, mode) {
    if (entry.resource === 'liquidWater') {
      return this.getWaterTransferEndpoint(mode);
    }
    if (entry.resource === 'hydrogen') {
      return this.getHydrogenTransferEndpoint();
    }
    return { category: entry.category, resource: entry.resource };
  }

  getTransferDestinationFreeForTick(category, resourceKey, accumulatedChanges = null) {
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return 0;
    }
    if (!resource.hasCap) {
      return Infinity;
    }
    if (!Number.isFinite(resource.cap)) {
      return Infinity;
    }
    return Math.max(0, resource.cap - this.getResourceValueForTick(category, resourceKey, accumulatedChanges));
  }

  getProductivityConsumerDemandForTick(category, resourceKey, deltaTime) {
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return 0;
    }
    return Math.max(0, resource.consumptionRate || 0) * deltaTime / 1000;
  }

  calculateContinuousWithdrawalRequiredCapacity(deltaTime, accumulatedChanges = null) {
    const selected = this.getUnlockedSelectedResources();
    if (selected.length === 0) {
      return 0;
    }
    const weightedSelected = selected.map((entry) => ({
      entry,
      weight: this.getResourceTransferWeight(entry.resource),
    }));
    const totalWeight = weightedSelected.reduce((sum, item) => sum + item.weight, 0);
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
      return 0;
    }
    let requiredCapacity = 0;
    weightedSelected.forEach(({ entry, weight }) => {
      if (weight <= 0 || this.getShipTransferModeForResource(entry.resource) !== 'withdraw') {
        return;
      }
      const target = this.getTransferEndpoint(entry, 'withdraw');
      const stored = this.getAvailableStoredResourceForTick(entry.resource, 'transfers', accumulatedChanges);
      if (!(stored > 0)) {
        return;
      }
      const storageDemand = this.getTransferDestinationFreeForTick(target.category, target.resource, accumulatedChanges);
      const consumerDemand = this.getProductivityConsumerDemandForTick(target.category, target.resource, deltaTime);
      const importLimitRemaining = this.getImportLimitRemainingForWithdrawal(entry.resource, target, accumulatedChanges);
      const biomassDensityRemaining = entry.resource === 'biomass'
        ? this.getBiomassWithdrawalDensityRemaining(accumulatedChanges)
        : Infinity;
      const requested = Math.min(stored, storageDemand + consumerDemand, importLimitRemaining, biomassDensityRemaining);
      if (!(requested > 0)) {
        return;
      }
      requiredCapacity = Math.max(requiredCapacity, requested * totalWeight / weight);
    });
    return requiredCapacity;
  }

  calculateContinuousTransferPlanForMode(mode, deltaTime, accumulatedChanges = null, productivity = 1) {
    const workerRatio = this.getHazardousMachineryWorkerAvailabilityRatio();
    const operationFraction = this.isTeleporterTransferActive()
      ? (deltaTime / 1000) * Math.max(0, productivity)
      : (deltaTime / this.getShipOperationDuration()) * workerRatio * Math.max(0, productivity);
    const assignedCapacity = this.calculateTransferAmount() * operationFraction;
    if (!(assignedCapacity > 0)) {
      return { plan: { transfers: [], total: 0 }, shipCompletionCount: 0 };
    }
    let capacity = assignedCapacity;
    if (mode === 'withdraw') {
      const requiredCapacity = this.calculateContinuousWithdrawalRequiredCapacity(deltaTime, accumulatedChanges);
      if (!(requiredCapacity > 0)) {
        return { plan: { transfers: [], total: 0 }, shipCompletionCount: 0 };
      }
      capacity = Math.min(capacity, requiredCapacity);
    }
    const plan = this.calculateTransferPlanForTick(capacity, accumulatedChanges, null, mode);
    const perShip = this.getShipCapacity(this.attributes.transportPerShip || 0);
    const shipCompletionCount = perShip > 0 ? plan.total / perShip : 0;
    return { plan, shipCompletionCount };
  }

  buildStoreEstimateAccumulatedChanges(deltaTime = 1000) {
    const seconds = deltaTime / 1000;
    const selected = this.getUnlockedSelectedResources();
    if (!(seconds > 0) || selected.length === 0) {
      return null;
    }
    const estimated = {};
    let hasEntries = false;
    selected.forEach((entry) => {
      if (this.getShipTransferModeForResource(entry.resource) !== 'store') {
        return;
      }
      const source = this.getTransferEndpoint(entry, 'store');
      const sourceResource = resources?.[source.category]?.[source.resource];
      if (!sourceResource) {
        return;
      }
      const projectedProductionRate = Math.max(0, sourceResource.productionRate || 0);
      if (!(projectedProductionRate > 0)) {
        return;
      }
      hasEntries = true;
      estimated[source.category] ||= {};
      estimated[source.category][source.resource] = (estimated[source.category][source.resource] || 0) + projectedProductionRate * seconds;
    });
    return hasEntries ? estimated : null;
  }

  estimateExpansionStorageGainForTick(deltaTime = 1000, productivity = 1) {
    if (!this.isActive || !this.isContinuous()) {
      return 0;
    }
    const tick = this.getContinuousExpansionTickState(deltaTime);
    if (!tick.duration || tick.duration === Infinity || !tick.ready) {
      return 0;
    }
    const requestedProgress = tick.requestedProgress * Math.max(0, productivity);
    if (!(requestedProgress > 0)) {
      return 0;
    }
    const storageState = this.createExpansionStorageState(null);
    const affordableProgress = this.getAffordableExpansionProgress(
      requestedProgress,
      this.getScaledCost(),
      storageState,
      null
    );
    if (!(affordableProgress > 0)) {
      return 0;
    }
    return affordableProgress * this.capacityPerCompletion * this.getEffectiveStorageCapacityMultiplier();
  }

  applyEstimatedExpansionStorageHeadroom(accumulatedChanges, deltaTime = 1000, productivity = 1) {
    if (!accumulatedChanges) {
      return accumulatedChanges;
    }
    const storageGain = this.estimateExpansionStorageGainForTick(deltaTime, productivity);
    if (!(storageGain > 0)) {
      return accumulatedChanges;
    }
    const selected = this.getUnlockedSelectedResources()
      .filter(entry => this.getShipTransferModeForResource(entry.resource) === 'store');
    if (selected.length === 0) {
      return accumulatedChanges;
    }
    accumulatedChanges.spaceStorage ||= {};
    if (selected.length === 1) {
      const key = selected[0].resource;
      accumulatedChanges.spaceStorage[key] = (accumulatedChanges.spaceStorage[key] || 0) - storageGain;
      return accumulatedChanges;
    }
    const weighted = selected.map((entry) => ({
      key: entry.resource,
      weight: Math.max(0, this.getResourceTransferWeight(entry.resource))
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    if (!(totalWeight > 0)) {
      const split = storageGain / selected.length;
      selected.forEach((entry) => {
        const key = entry.resource;
        accumulatedChanges.spaceStorage[key] = (accumulatedChanges.spaceStorage[key] || 0) - split;
      });
      return accumulatedChanges;
    }
    weighted.forEach((item) => {
      const amount = storageGain * (item.weight / totalWeight);
      if (amount > 0) {
        accumulatedChanges.spaceStorage[item.key] = (accumulatedChanges.spaceStorage[item.key] || 0) - amount;
      }
    });
    return accumulatedChanges;
  }

  cloneAccumulatedChangesForPlanning(accumulatedChanges = null) {
    if (!accumulatedChanges) {
      return {};
    }
    const clone = {};
    for (const category in accumulatedChanges) {
      const source = accumulatedChanges[category];
      clone[category] = source && typeof source === 'object' ? { ...source } : source;
    }
    return clone;
  }

  applyAccumulatedResourceDelta(category, resourceKey, amount, accumulatedChanges = null) {
    if (!(amount !== 0) || !accumulatedChanges) {
      return;
    }
    accumulatedChanges[category] ||= {};
    if (accumulatedChanges[category][resourceKey] === undefined) {
      accumulatedChanges[category][resourceKey] = 0;
    }
    accumulatedChanges[category][resourceKey] += amount;
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
    if (this.isTeleporterTransferActive()) {
      return 1000;
    }
    const base = this.calculateSpaceshipAdjustedDuration();
    return this.applyDurationEffects(base, { treatAsSpaceshipProject: true });
  }

  calculateTeleporterShipmentCost() {
    const costPerShip = this.attributes.costPerShip;
    const totalCost = {};
    const energyProjectMultiplier = (projectManager.activeEffects || []).reduce((value, effect) => {
      if (
        effect.type === 'spaceshipCostMultiplier' &&
        effect.resourceCategory === 'colony' &&
        effect.resourceId === 'energy'
      ) {
        return value * effect.value;
      }
      return value;
    }, 1);
    const energyPerTonCost = (projectManager.activeEffects || []).reduce((value, effect) => {
      if (
        effect.type === 'spaceshipCostPerTon' &&
        effect.resourceCategory === 'colony' &&
        effect.resourceId === 'energy'
      ) {
        return value + effect.value;
      }
      return value;
    }, 0);

    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        const baseCost = costPerShip[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource)
          * this.getEffectiveSpaceshipCostMultiplier(category, resource);
        let adjustedCost = baseCost * multiplier;
        if (resource === 'energy') {
          adjustedCost *= shipEfficiency * energyProjectMultiplier * 100;
          if (energyPerTonCost > 0) {
            adjustedCost += energyPerTonCost * this.getShipCapacity(this.attributes.transportPerShip || 0);
          }
        }
        if (adjustedCost > 0) {
          totalCost[category][resource] = adjustedCost;
        }
      }
      if (Object.keys(totalCost[category]).length === 0) {
        delete totalCost[category];
      }
    }

    return totalCost;
  }

  calculateSpaceshipCost() {
    if (this.isTeleporterTransferActive()) {
      return this.calculateTeleporterShipmentCost();
    }
    const totalCost = super.calculateSpaceshipCost();
    if (!(totalCost?.colony?.energy > 0)) {
      return totalCost;
    }
    const multiplier = (projectManager.activeEffects || []).reduce((value, effect) => {
      if (
        effect.type === 'spaceshipCostMultiplier' &&
        effect.resourceCategory === 'colony' &&
        effect.resourceId === 'energy'
      ) {
        return value * effect.value;
      }
      return value;
    }, 1);
    totalCost.colony.energy *= multiplier;
    const perTonCost = (projectManager.activeEffects || []).reduce((value, effect) => {
      if (
        effect.type === 'spaceshipCostPerTon' &&
        effect.resourceCategory === 'colony' &&
        effect.resourceId === 'energy'
      ) {
        return value + effect.value;
      }
      return value;
    }, 0);
    if (perTonCost > 0) {
      totalCost.colony.energy += perTonCost * this.getShipCapacity(this.attributes.transportPerShip || 0);
    }
    return totalCost;
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
    this.sanitizeTransferModes();
    this.getExpansionRecipeKey();
  }

  isWithdrawalDisabled() {
    return this.isBooleanFlagSet('disableWithdrawal');
  }

  sanitizeTransferModes() {
    if (!this.isWithdrawalDisabled()) return;

    if (this.shipTransferMode !== 'store') {
      this.shipTransferMode = 'store';
    }
    this.lastUniformTransferMode = 'store';
    this.resourceTransferModes = {};

    if (!Array.isArray(this.pendingTransfers) || this.pendingTransfers.length === 0) {
      return;
    }

    this.pendingTransfers = this.pendingTransfers.filter(transfer => transfer?.mode !== 'withdraw');
    if (this.pendingTransfers.length > 0) {
      return;
    }

    this.shipOperationIsActive = false;
    this.shipOperationIsPaused = false;
    this.shipOperationRemainingTime = 0;
    this.shipOperationStartingDuration = 0;
  }

  sanitizeTransferWeights() {
    const source = this.resourceTransferWeights || {};
    const sanitized = {};
    for (const resourceKey in source) {
      const parsed = Number(source[resourceKey]);
      sanitized[resourceKey] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
    }
    this.resourceTransferWeights = sanitized;
  }

  sanitizeImportLimitRespects() {
    const source = this.resourceImportLimitRespects || {};
    const sanitized = {};
    for (const resourceKey in SPACE_STORAGE_IMPORT_LIMIT_RESOURCE_PROJECTS) {
      if (source[resourceKey] === true) {
        sanitized[resourceKey] = true;
      }
    }
    this.resourceImportLimitRespects = sanitized;
  }

  sanitizeBiomassDensityWithdrawLimits() {
    const source = this.resourceBiomassDensityWithdrawLimits || {};
    const sanitized = {};
    if (source.biomass === true) {
      sanitized.biomass = true;
    }
    this.resourceBiomassDensityWithdrawLimits = sanitized;
  }

  sanitizePressureWithdrawLimits() {
    const source = this.resourcePressureWithdrawLimits || {};
    const sanitized = {};
    for (const resourceKey in SPACE_STORAGE_PRESSURE_LIMIT_RESOURCES) {
      const parsed = Number(source[resourceKey]);
      if (Number.isFinite(parsed) && parsed > 0) {
        sanitized[resourceKey] = parsed;
      }
    }
    this.resourcePressureWithdrawLimits = sanitized;
  }

  shouldRespectImportProjectLimits(resourceKey) {
    return this.resourceImportLimitRespects?.[resourceKey] === true;
  }

  setRespectImportProjectLimits(resourceKey, enabled) {
    if (!SPACE_STORAGE_IMPORT_LIMIT_RESOURCE_PROJECTS[resourceKey]) {
      return;
    }
    if (enabled === true) {
      this.resourceImportLimitRespects[resourceKey] = true;
    } else {
      delete this.resourceImportLimitRespects[resourceKey];
    }
  }

  exportImportLimitRespectsForAutomation() {
    const settings = {};
    for (const resourceKey in SPACE_STORAGE_IMPORT_LIMIT_RESOURCE_PROJECTS) {
      settings[resourceKey] = this.shouldRespectImportProjectLimits(resourceKey);
    }
    return settings;
  }

  shouldLimitWithdrawalsToMaxBiomassDensity(resourceKey) {
    return resourceKey === 'biomass' && this.resourceBiomassDensityWithdrawLimits?.[resourceKey] === true;
  }

  setLimitWithdrawalsToMaxBiomassDensity(resourceKey, enabled) {
    if (resourceKey !== 'biomass') {
      return;
    }
    if (enabled === true) {
      this.resourceBiomassDensityWithdrawLimits[resourceKey] = true;
    } else {
      delete this.resourceBiomassDensityWithdrawLimits[resourceKey];
    }
  }

  exportBiomassDensityWithdrawLimitsForAutomation() {
    return {
      biomass: this.shouldLimitWithdrawalsToMaxBiomassDensity('biomass')
    };
  }

  getPressureWithdrawLimitPa(resourceKey) {
    const parsed = Number(this.resourcePressureWithdrawLimits?.[resourceKey]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  setPressureWithdrawLimitPa(resourceKey, valuePa) {
    if (!SPACE_STORAGE_PRESSURE_LIMIT_RESOURCES[resourceKey]) {
      return;
    }
    const parsed = Number(valuePa);
    if (Number.isFinite(parsed) && parsed > 0) {
      this.resourcePressureWithdrawLimits[resourceKey] = parsed;
    } else {
      delete this.resourcePressureWithdrawLimits[resourceKey];
    }
  }

  exportPressureWithdrawLimitsForAutomation() {
    const settings = {};
    for (const resourceKey in SPACE_STORAGE_PRESSURE_LIMIT_RESOURCES) {
      settings[resourceKey] = this.getPressureWithdrawLimitPa(resourceKey);
    }
    return settings;
  }

  getPressureLimitMassFromPa(limitPa) {
    const gSurface = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const surfaceArea = terraforming.celestialParameters.surfaceArea || (4 * Math.PI * Math.pow(radius * 1000, 2));
    return (limitPa * surfaceArea) / (1000 * gSurface);
  }

  getPressureWithdrawLimitRemaining(resourceKey, target, accumulatedChanges = null) {
    if (!SPACE_STORAGE_PRESSURE_LIMIT_RESOURCES[resourceKey] || target.category !== 'atmospheric') {
      return Infinity;
    }
    const limitPa = this.getPressureWithdrawLimitPa(resourceKey);
    if (limitPa <= 0) {
      return Infinity;
    }
    const current = (resources.atmospheric[target.resource].value || 0)
      + (accumulatedChanges?.atmospheric?.[target.resource] || 0);
    return Math.max(0, this.getPressureLimitMassFromPa(limitPa) - current);
  }

  getBiomassWithdrawalDensityRemaining(accumulatedChanges = null) {
    if (!this.shouldLimitWithdrawalsToMaxBiomassDensity('biomass')) {
      return Infinity;
    }
    const design = lifeDesigner?.currentDesign;
    const maxDensity = design?.getMaxBiomassDensity ? Math.max(0, design.getMaxBiomassDensity()) : 0.1;
    const effectiveMaxDensity = maxDensity > 0 ? maxDensity : 0.1;
    const landAreaM2 = resolveWorldGeometricLand(terraforming, resources.surface.land) * 10000;
    const maxBiomass = landAreaM2 > 0 ? landAreaM2 * effectiveMaxDensity : 0;
    const currentBiomass = this.getResourceValueForTick('surface', 'biomass', accumulatedChanges);
    return Math.max(0, maxBiomass - currentBiomass);
  }

  getImportLimitProjectForResource(resourceKey) {
    const projectId = SPACE_STORAGE_IMPORT_LIMIT_RESOURCE_PROJECTS[resourceKey];
    return projectId ? projectManager?.projects?.[projectId] : null;
  }

  getImportLimitRemainingForWithdrawal(resourceKey, target, accumulatedChanges = null) {
    if (!this.shouldRespectImportProjectLimits(resourceKey)) {
      return this.getPressureWithdrawLimitRemaining(resourceKey, target, accumulatedChanges);
    }
    const project = this.getImportLimitProjectForResource(resourceKey);
    if (!project) {
      return this.getPressureWithdrawLimitRemaining(resourceKey, target, accumulatedChanges);
    }
    if (target.category !== 'atmospheric' && resourceKey !== 'liquidWater') {
      return Infinity;
    }
    return Math.min(
      project.getImportLimitRemainingForDelivery(resourceKey, target.category, target.resource, accumulatedChanges),
      this.getPressureWithdrawLimitRemaining(resourceKey, target, accumulatedChanges)
    );
  }

  getUnlockedSelectedResources() {
    if (!Array.isArray(this.selectedResources) || this.selectedResources.length === 0) {
      return [];
    }
    return this.selectedResources
      .map((entry) => {
        if (entry.resource === 'liquidWater' || entry.resource === 'biomass') {
          return { category: 'surface', resource: entry.resource };
        }
        return entry;
      })
      .filter(r => this.isResourceUnlocked(r.resource));
  }

  getResourceTransferMode(resourceKey) {
    if (this.isWithdrawalDisabled()) {
      return 'store';
    }
    const storedMode = this.resourceTransferModes[resourceKey];
    if (storedMode === 'store' || storedMode === 'withdraw') {
      return storedMode;
    }
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      return this.shipTransferMode;
    }
    return this.lastUniformTransferMode || 'store';
  }

  getResourceTransferWeight(resourceKey) {
    const parsed = Number(this.resourceTransferWeights?.[resourceKey]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 1;
    }
    return parsed;
  }

  setResourceTransferWeight(resourceKey, weight) {
    const parsed = Number(weight);
    const normalized = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
    this.resourceTransferWeights[resourceKey] = normalized;
    return normalized;
  }

  setShipTransferMode(mode) {
    if (mode !== 'store' && mode !== 'withdraw' && mode !== 'mixed') return;
    if (this.isWithdrawalDisabled() && mode !== 'store') {
      mode = 'store';
    }
    this.shipTransferMode = mode;
    if (mode === 'store' || mode === 'withdraw') {
      this.lastUniformTransferMode = mode;
      this.resourceTransferModes = {};
    }
  }

  setResourceTransferMode(resourceKey, mode) {
    if (mode !== 'store' && mode !== 'withdraw') return;
    if (this.isWithdrawalDisabled()) {
      mode = 'store';
    }
    this.resourceTransferModes[resourceKey] = mode;
  }

  updateShipTransferModeFromResources(resourceKeys) {
    if (this.isWithdrawalDisabled()) {
      this.setShipTransferMode('store');
      return;
    }
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

    const weightedSelected = selected.map((entry) => ({
      entry,
      weight: this.getResourceTransferWeight(entry.resource),
    }));
    const totalWeight = weightedSelected.reduce((sum, item) => sum + item.weight, 0);
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) return { transfers, total };
    let availableFreeSpace = Math.max(0, this.maxStorage - this.usedStorage);

    const resolveMode = (resourceKey) => {
      if (this.shipTransferMode === 'mixed') {
        return this.getResourceTransferMode(resourceKey);
      }
      return this.shipTransferMode;
    };

    const applyWithdrawForResource = (entry, weightedCapacity) => {
      const stored = this.getAvailableStoredResource(entry.resource, 'transfers');
      if (stored <= 0) return;
      const target = this.getTransferEndpoint(entry, 'withdraw');
      const targetRes = resources[target.category][target.resource];
      const destFree = targetRes && Number.isFinite(targetRes.cap) ? Math.max(0, targetRes.cap - targetRes.value) : Infinity;
      const importLimitRemaining = this.getImportLimitRemainingForWithdrawal(entry.resource, target);
      const biomassDensityRemaining = this.getBiomassWithdrawalDensityRemaining(null);
      const amount = Math.min(weightedCapacity, stored, destFree, importLimitRemaining, biomassDensityRemaining);
      if (!Number.isFinite(amount) || amount <= 0) return;
      transfers.push({ mode: 'withdraw', category: target.category, resource: target.resource, amount, storageKey: entry.resource });
      total += amount;
      availableFreeSpace += amount;
      if (!simulate) {
        this.removeStoredResource(entry.resource, amount);
        this.reconcileUsedStorage();
      }
    };

    const applyStoreForResource = (entry, weightedCapacity) => {
      if (!Number.isFinite(availableFreeSpace) || availableFreeSpace <= 0) return;
      const stored = this.getStoredResourceValue(entry.resource);
      const capLimit = this.getResourceCapLimit(entry.resource);
      const capRemaining = Math.max(0, capLimit - stored);
      if (capRemaining <= 0) return;
      let amount = 0;
      if (entry.resource === 'biomass') {
        const available = resources.surface.biomass?.value || 0;
        amount = Math.min(weightedCapacity, available, capRemaining, availableFreeSpace);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const removed = simulate ? amount : this.removeBiomassFromZones(amount);
        if (!Number.isFinite(removed) || removed <= 0) return;
        transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount: removed });
        total += removed;
        availableFreeSpace = Math.max(0, availableFreeSpace - removed);
        return;
      }
      if (entry.resource === 'liquidWater') {
        const source = this.getTransferEndpoint(entry, 'store');
        const sourceRes = resources[source.category][source.resource];
        const available = sourceRes.value;
        amount = Math.min(weightedCapacity, available, capRemaining, availableFreeSpace);
        if (!Number.isFinite(amount) || amount <= 0) return;
        let removed = amount;
        if (!simulate) {
          removed = source.category === 'surface'
            ? this.removeLiquidWaterFromZones(amount)
            : Math.min(amount, sourceRes.value);
          if (source.category === 'colony' && removed > 0) {
            sourceRes.decrease(removed);
          }
        }
        if (!Number.isFinite(removed) || removed <= 0) return;
        transfers.push({ mode: 'store', category: source.category, resource: source.resource, amount: removed, storageKey: entry.resource });
        total += removed;
        availableFreeSpace = Math.max(0, availableFreeSpace - removed);
        return;
      }
      if (entry.resource === 'hydrogen') {
        const source = this.getTransferEndpoint(entry, 'store');
        const sourceRes = resources[source.category][source.resource];
        const available = sourceRes.value;
        amount = Math.min(weightedCapacity, available, capRemaining, availableFreeSpace);
        if (!Number.isFinite(amount) || amount <= 0) return;
        transfers.push({ mode: 'store', category: source.category, resource: source.resource, amount, storageKey: entry.resource });
        total += amount;
        availableFreeSpace = Math.max(0, availableFreeSpace - amount);
        if (!simulate) {
          sourceRes.decrease(amount);
        }
        return;
      }
      const src = resources[entry.category][entry.resource];
      const available = src.value;
      amount = Math.min(weightedCapacity, available, capRemaining, availableFreeSpace);
      if (!Number.isFinite(amount) || amount <= 0) return;
      transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount });
      total += amount;
      availableFreeSpace = Math.max(0, availableFreeSpace - amount);
      if (!simulate) {
        src.decrease(amount);
      }
    };

    weightedSelected.forEach(({ entry, weight }) => {
      if (resolveMode(entry.resource) === 'withdraw') {
        applyWithdrawForResource(entry, (capacity * weight) / totalWeight);
      }
    });

    weightedSelected.forEach(({ entry, weight }) => {
      if (resolveMode(entry.resource) === 'store') {
        applyStoreForResource(entry, (capacity * weight) / totalWeight);
      }
    });

    return { transfers, total };
  }

  calculateTransferPlanForTick(capacityOverride = null, accumulatedChanges = null, selections = null, modeFilter = 'all') {
    const transfers = [];
    let total = 0;
    const selected = selections ?? this.getUnlockedSelectedResources();
    if (selected.length === 0) return { transfers, total };
    const capacity = capacityOverride != null ? capacityOverride : this.calculateTransferAmount();
    if (!Number.isFinite(capacity) || capacity <= 0) return { transfers, total };

    const weightedSelected = selected.map((entry) => ({
      entry,
      weight: this.getResourceTransferWeight(entry.resource),
    }));
    const totalWeight = weightedSelected.reduce((sum, item) => sum + item.weight, 0);
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) return { transfers, total };
    let availableFreeSpace = this.getStorageFreeSpaceForTick(accumulatedChanges);

    const resolveMode = (resourceKey) => {
      if (this.shipTransferMode === 'mixed') {
        return this.getResourceTransferMode(resourceKey);
      }
      return this.shipTransferMode;
    };

    const applyWithdrawForResource = (entry, weightedCapacity) => {
      const stored = this.getAvailableStoredResourceForTick(entry.resource, 'transfers', accumulatedChanges);
      if (stored <= 0) return;
      const target = this.getTransferEndpoint(entry, 'withdraw');
      const destFree = this.getTransferDestinationFreeForTick(target.category, target.resource, accumulatedChanges);
      const importLimitRemaining = this.getImportLimitRemainingForWithdrawal(entry.resource, target, accumulatedChanges);
      const biomassDensityRemaining = entry.resource === 'biomass'
        ? this.getBiomassWithdrawalDensityRemaining(accumulatedChanges)
        : Infinity;
      const amount = Math.min(weightedCapacity, stored, destFree, importLimitRemaining, biomassDensityRemaining);
      if (!Number.isFinite(amount) || amount <= 0) return;
      transfers.push({ mode: 'withdraw', category: target.category, resource: target.resource, amount, storageKey: entry.resource });
      total += amount;
      availableFreeSpace += amount;
    };

    const applyStoreForResource = (entry, weightedCapacity) => {
      if (!Number.isFinite(availableFreeSpace) || availableFreeSpace <= 0) return;
      const capRemaining = this.getStorageCapRemainingForTick(entry.resource, accumulatedChanges);
      if (capRemaining <= 0) return;
      const source = this.getTransferEndpoint(entry, 'store');
      const sourceEntry = { category: source.category, resource: source.resource };
      const available = this.getTransferSourceAvailableForTick(sourceEntry, accumulatedChanges);
      const amount = Math.min(weightedCapacity, available, capRemaining, availableFreeSpace);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (entry.resource === 'liquidWater' || entry.resource === 'hydrogen') {
        transfers.push({ mode: 'store', category: source.category, resource: source.resource, amount, storageKey: entry.resource });
      } else {
        transfers.push({ mode: 'store', category: entry.category, resource: entry.resource, amount });
      }
      total += amount;
      availableFreeSpace = Math.max(0, availableFreeSpace - amount);
    };

    weightedSelected.forEach(({ entry, weight }) => {
      if ((modeFilter === 'all' || modeFilter === 'withdraw') && resolveMode(entry.resource) === 'withdraw') {
        applyWithdrawForResource(entry, (capacity * weight) / totalWeight);
      }
    });

    weightedSelected.forEach(({ entry, weight }) => {
      if ((modeFilter === 'all' || modeFilter === 'store') && resolveMode(entry.resource) === 'store') {
        applyStoreForResource(entry, (capacity * weight) / totalWeight);
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
      const res = t.resource === 'liquidWater'
        ? resources.surface.liquidWater
        : resources[t.category][t.resource];
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
    const plan = this.calculateTransferPlan(true);
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
    const workerRatio = this.getHazardousMachineryWorkerAvailabilityRatio();
    const effectiveDeltaTime = deltaTime * workerRatio;
    if (this.shipOperationAutoStart) {
      const durationSeconds = this.shipOperationStartingDuration / 1000;
      if (durationSeconds > 0) {
        this.applyShipOperationRateTooltip(durationSeconds, true);
      }
    }
    const activeTime = Math.min(effectiveDeltaTime, this.shipOperationRemainingTime);
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
    this.shipOperationRemainingTime -= effectiveDeltaTime;
    if (this.shipOperationRemainingTime <= 0) {
      this.shipOperationRemainingTime = 0;
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
      tick.requestedProgress * productivity,
      this.getScaledCost(),
      accumulatedChanges,
      {
        applyRates: tick.seconds > 0 && this.showsInResourcesRate(),
        seconds: tick.seconds,
        rateSourceLabel: this.getExpansionRateSourceLabel()
      }
    );
    this.shortfallLastTick = result.shortfall;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1, accumulatedSpecialChanges = null) {
    const expansionProductivity = this.attributes?.continuousAsBuilding ? productivity : 1;
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, expansionProductivity);
    this.applyContinuousWithdrawals(deltaTime, accumulatedChanges, productivity, accumulatedSpecialChanges);
  }

  recordTentativeWithdrawal(accumulatedSpecialChanges, transfer, delivered, refundCostPerDelivered = null) {
    if (!accumulatedSpecialChanges || !(delivered > 0) || !transfer?.storageKey) {
      return;
    }
    accumulatedSpecialChanges.spaceStorageTentativeWithdrawals ||= {};
    const ledger = accumulatedSpecialChanges.spaceStorageTentativeWithdrawals;
    ledger.destinations ||= {};
    const destinationKey = `${transfer.category}:${transfer.resource}`;
    ledger.destinations[destinationKey] ||= {
      category: transfer.category,
      resource: transfer.resource,
      entries: []
    };
    ledger.destinations[destinationKey].entries.push({
      storageKey: transfer.storageKey,
      amount: delivered,
      refundCostPerDelivered
    });
  }

  applyTentativeWithdrawalRefunds(accumulatedSpecialChanges, overflowByResource, spaceStorageCapLimits = null, seconds = 0) {
    const destinations = accumulatedSpecialChanges?.spaceStorageTentativeWithdrawals?.destinations;
    if (!destinations || !resources?.spaceStorage) {
      return;
    }

    this.reconcileUsedStorage?.();
    let currentUsedStorage = Number(this.usedStorage) || 0;
    const maxStorage = Number(this.maxStorage);
    const hasFiniteMaxStorage = Number.isFinite(maxStorage);
    const refundedCostByResource = {};

    for (const destinationKey in destinations) {
      const destination = destinations[destinationKey];
      if (!destination?.entries?.length) {
        continue;
      }
      const overflow = overflowByResource?.[destination.category]?.[destination.resource] || 0;
      if (!(overflow > 0)) {
        continue;
      }
      const totalTentative = destination.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      if (!(totalTentative > 0)) {
        continue;
      }
      let refundRemaining = Math.min(overflow, totalTentative);
      for (let i = 0; i < destination.entries.length; i += 1) {
        const entry = destination.entries[i];
        if (!(refundRemaining > 0)) {
          break;
        }
        const storageKey = entry.storageKey;
        const storageResource = resources.spaceStorage[storageKey];
        if (!storageResource) {
          continue;
        }
        const entryAmount = entry.amount || 0;
        if (!(entryAmount > 0)) {
          continue;
        }
        const entryShare = i === destination.entries.length - 1
          ? refundRemaining
          : Math.min(refundRemaining, (entryAmount / totalTentative) * Math.min(overflow, totalTentative));
        if (!(entryShare > 0)) {
          continue;
        }
        let perResourceLimit = Infinity;
        if (spaceStorageCapLimits && Object.prototype.hasOwnProperty.call(spaceStorageCapLimits, storageKey)) {
          perResourceLimit = Number(spaceStorageCapLimits[storageKey]);
        } else if (this.getResourceCapLimit) {
          perResourceLimit = Number(this.getResourceCapLimit(storageKey));
        }
        const resourceFree = Number.isFinite(perResourceLimit)
          ? Math.max(0, perResourceLimit - storageResource.value)
          : Infinity;
        const sharedFree = hasFiniteMaxStorage
          ? Math.max(0, maxStorage - currentUsedStorage)
          : Infinity;
        const acceptedRefund = Math.max(0, Math.min(entryShare, resourceFree, sharedFree));
        if (!(acceptedRefund > 0)) {
          continue;
        }
        storageResource.value += acceptedRefund;
        const perDeliveredCosts = entry.refundCostPerDelivered || null;
        if (perDeliveredCosts) {
          for (const resourceKey in perDeliveredCosts) {
            const perDeliveredCost = Number(perDeliveredCosts[resourceKey]) || 0;
            if (!(perDeliveredCost > 0)) {
              continue;
            }
            refundedCostByResource[resourceKey] = (refundedCostByResource[resourceKey] || 0)
              + acceptedRefund * perDeliveredCost;
          }
        }
        currentUsedStorage += acceptedRefund;
        refundRemaining -= acceptedRefund;
      }
    }

    for (const resourceKey in refundedCostByResource) {
      const refundedAmount = refundedCostByResource[resourceKey] || 0;
      if (!(refundedAmount > 0)) {
        continue;
      }
      const colonyResource = resources?.colony?.[resourceKey];
      if (!colonyResource) {
        continue;
      }
      const nextValue = colonyResource.value + refundedAmount;
      if (colonyResource.hasCap && Number.isFinite(colonyResource.cap)) {
        colonyResource.value = Math.min(nextValue, colonyResource.cap);
      } else {
        colonyResource.value = nextValue;
      }
      if (seconds > 0) {
        colonyResource.modifyRate(refundedAmount / seconds, 'Space storage transfer', 'project');
      }
    }

    this.reconcileUsedStorage?.();
  }

  applyTransferPlanToAccumulated(plan, accumulatedChanges, successChance = 1, seconds = 0, options = null) {
    if (!plan?.transfers?.length) {
      return;
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
        this.applyAccumulatedResourceDelta('spaceStorage', t.storageKey, -t.amount, accumulatedChanges);
        if (t.resource === 'biomass') {
          this.addBiomassToZones(delivered);
          resources.surface.biomass?.modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        } else if (t.resource === 'liquidWater') {
          this.addLiquidWaterToZones(delivered);
          resources.surface.liquidWater.modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        } else {
          this.applyAccumulatedResourceDelta(t.category, t.resource, delivered, accumulatedChanges);
          resources[t.category][t.resource].modifyRate(deliveredRate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(-rate, 'Space storage transfer', 'project');
        }
        if (options?.recordTentativeWithdrawals === true) {
          this.recordTentativeWithdrawal(
            options.accumulatedSpecialChanges,
            t,
            delivered,
            options.refundCostPerDelivered || null
          );
        }
      } else if (t.mode === 'store') {
        if (t.resource === 'biomass') {
          const removed = this.removeBiomassFromZones(t.amount);
          if (removed > 0) {
            const deliveredRemoved = removed * successChance;
            resources.surface.biomass?.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
            this.applyAccumulatedResourceDelta('spaceStorage', t.resource, deliveredRemoved, accumulatedChanges);
            storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
          }
        } else if (t.storageKey === 'liquidWater') {
          if (t.category === 'surface' && t.resource === 'liquidWater') {
            const removed = this.removeLiquidWaterFromZones(t.amount);
            if (removed > 0) {
              const deliveredRemoved = removed * successChance;
              resources.surface.liquidWater.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
              this.applyAccumulatedResourceDelta('spaceStorage', t.storageKey, deliveredRemoved, accumulatedChanges);
              storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
            }
          } else {
            this.applyAccumulatedResourceDelta(t.category, t.resource, -t.amount, accumulatedChanges);
            this.applyAccumulatedResourceDelta('spaceStorage', t.storageKey, delivered, accumulatedChanges);
            resources[t.category][t.resource].modifyRate(-rate, 'Space storage transfer', 'project');
            storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
          }
        } else {
          this.applyAccumulatedResourceDelta(t.category, t.resource, -t.amount, accumulatedChanges);
          this.applyAccumulatedResourceDelta('spaceStorage', t.storageKey || t.resource, delivered, accumulatedChanges);
          resources[t.category][t.resource].modifyRate(-rate, 'Space storage transfer', 'project');
          storageResource?.modifyRate?.(deliveredRate, 'Space storage transfer', 'project');
        }
      }
    });
  }

  canCoverShipOperationCostForTick(totalCost, accumulatedChanges, costScale = 1) {
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const amount = totalCost[category][resource] * costScale;
        if (this.getResourceValueForTick(category, resource, accumulatedChanges) < amount) {
          return false;
        }
      }
    }
    return true;
  }

  getAffordableShipOperationCostScale(totalCost, accumulatedChanges, costScale = 1) {
    if (!(costScale > 0)) {
      return 0;
    }
    let affordableScale = costScale;
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const perScaleAmount = totalCost[category][resource];
        if (!(perScaleAmount > 0)) {
          continue;
        }
        const available = this.getResourceValueForTick(category, resource, accumulatedChanges);
        const maxScaleForResource = Math.max(0, available / perScaleAmount);
        if (maxScaleForResource < affordableScale) {
          affordableScale = maxScaleForResource;
        }
      }
    }
    return Math.max(0, Math.min(costScale, affordableScale));
  }

  applyShipOperationCostForTick(totalCost, accumulatedChanges, costScale = 1) {
    let nonEnergyCost = 0;
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const amount = totalCost[category][resource] * costScale;
        if (!(amount > 0)) {
          continue;
        }
        this.applyAccumulatedResourceDelta(category, resource, -amount, accumulatedChanges);
        if (resource !== 'energy') {
          nonEnergyCost += amount;
        }
      }
    }
    return nonEnergyCost;
  }

  applyContinuousWithdrawals(deltaTime, accumulatedChanges, productivity = 1, accumulatedSpecialChanges = null) {
    if (
      !this.shipOperationIsActive
      || this.shipOperationIsPaused
      || (!this.isTeleporterTransferActive() && this.assignedSpaceships <= 0)
      || !this.isShipOperationContinuous()
      || this.isWithdrawalDisabled()
    ) {
      return;
    }
    const { plan, shipCompletionCount } = this.calculateContinuousTransferPlanForMode(
      'withdraw',
      deltaTime,
      accumulatedChanges,
      productivity
    );
    if (!(plan.total > 0)) {
      return;
    }
    if (!(shipCompletionCount > 0)) {
      return;
    }
    const seconds = deltaTime / 1000;
    const totalCost = this.calculateSpaceshipTotalCost();
    const costScale = shipCompletionCount;
    const successChance = this.isTeleporterTransferActive() ? 1 : this.getKesslerSuccessChance();
    const failureChance = 1 - successChance;
    const nonEnergyCost = this.applyShipOperationCostForTick(totalCost, accumulatedChanges, costScale);
    const paidEnergy = Math.max(0, (totalCost?.colony?.energy || 0) * costScale);
    const paidMetal = Math.max(0, (totalCost?.colony?.metal || 0) * costScale);
    const deliveredTotal = plan.total * successChance;
    const refundCostPerDelivered = {};
    if (deliveredTotal > 0) {
      if (paidEnergy > 0) {
        refundCostPerDelivered.energy = paidEnergy / deliveredTotal;
      }
      if (paidMetal > 0) {
        refundCostPerDelivered.metal = paidMetal / deliveredTotal;
      }
    }
    this.applyTransferPlanToAccumulated(
      plan,
      accumulatedChanges,
      successChance,
      seconds,
      { recordTentativeWithdrawals: true, accumulatedSpecialChanges, refundCostPerDelivered }
    );
    this.reconcileUsedStorage();
    if (failureChance > 0) {
      const shipLoss = costScale * failureChance;
      this.applyContinuousKesslerDebris(nonEnergyCost * failureChance, shipLoss, seconds);
    }
  }

  applyPostProjectShipOperation(deltaTime, accumulatedChanges) {
    if (!this.shipOperationIsActive || this.shipOperationIsPaused || (!this.isTeleporterTransferActive() && this.assignedSpaceships <= 0)) {
      return;
    }
    if (this.isShipOperationContinuous()) {
      const fraction = this.isTeleporterTransferActive()
        ? deltaTime / 1000
        : (deltaTime / this.getShipOperationDuration()) * this.getHazardousMachineryWorkerAvailabilityRatio();
      const seconds = deltaTime / 1000;
      const successChance = this.isTeleporterTransferActive() ? 1 : this.getKesslerSuccessChance();
      const failureChance = 1 - successChance;
      const capacity = this.calculateTransferAmount() * fraction;
      if (capacity <= 0) {
        this.shipOperationIsActive = false;
        return;
      }
      const plan = this.calculateTransferPlanForTick(capacity, accumulatedChanges, null, 'store');
      if (plan.total > 0) {
        const perShip = this.getShipCapacity(this.attributes.transportPerShip || 0);
        const shipCompletionCount = perShip > 0 ? plan.total / perShip : 0;
        if (shipCompletionCount > 0) {
          const totalCost = this.calculateSpaceshipTotalCost();
          const affordableScale = this.getAffordableShipOperationCostScale(totalCost, accumulatedChanges, shipCompletionCount);
          if (!(affordableScale > 0)) {
            this.shipOperationIsActive = false;
            return;
          }
          const executionRatio = affordableScale / shipCompletionCount;
          if (executionRatio < 1) {
            plan.transfers.forEach((transfer) => {
              transfer.amount *= executionRatio;
            });
            plan.total *= executionRatio;
          }
          const nonEnergyCost = this.applyShipOperationCostForTick(totalCost, accumulatedChanges, affordableScale);
          this.applyTransferPlanToAccumulated(plan, accumulatedChanges, successChance, seconds);
          this.reconcileUsedStorage();
          if (failureChance > 0) {
            const shipLoss = affordableScale * failureChance;
            this.applyContinuousKesslerDebris(nonEnergyCost * failureChance, shipLoss, seconds);
          }
        }
      }
      this.shipOperationIsActive = true;
      return;
    }

    const operationCompleted = this.shipOperationRemainingTime <= 0;
    if (!operationCompleted) {
      return;
    }

    const durationSeconds = this.shipOperationStartingDuration / 1000;
    const totalCost = this.calculateSpaceshipTotalCost();
    const plan = this.calculateTransferPlanForTick(null, accumulatedChanges);
    this.pendingTransfers = plan.transfers;
    if (!this.pendingTransfers?.length) {
      this.shipOperationIsActive = false;
      return;
    }
    if (!this.canCoverShipOperationCostForTick(totalCost, accumulatedChanges, 1)) {
      this.shipOperationIsActive = false;
      this.pendingTransfers = [];
      return;
    }

    this.applyShipOperationCostForTick(totalCost, accumulatedChanges, 1);
    const reservePlan = { transfers: this.pendingTransfers };
    this.applyTransferPlanToAccumulated(reservePlan, accumulatedChanges, 1, durationSeconds);
    this.completeShipOperation();
  }

  completeShipOperation() {
    this.shipOperationIsActive = false;
    this.shipOperationRemainingTime = 0;
    this.shipOperationStartingDuration = 0;
    this.shipOperationIsPaused = false;
    this.shipOperationKesslerElapsed = 0;
    this.shipOperationKesslerPending = false;
    this.shipOperationKesslerCost = null;
    this.pendingTransfers = [];
  }

  addShipCompletionCostsToTotals(totals, shipCompletionCount, applyRates = true, seconds = 0) {
    if (!(shipCompletionCount > 0)) {
      return;
    }
    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      if (!totals.cost[category]) totals.cost[category] = {};
      for (const resource in costPerShip[category]) {
        const amount = costPerShip[category][resource] * shipCompletionCount;
        if (!(amount > 0)) {
          continue;
        }
        if (applyRates && seconds > 0) {
          resources[category][resource].modifyRate(
            -amount / seconds,
            'Space storage transfer',
            'project'
          );
        }
        totals.cost[category][resource] = (totals.cost[category][resource] || 0) + amount;
      }
    }
  }

  estimateProductivityCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (!this.usesContinuousWithdrawalProductivity()) {
      return totals;
    }
    const { shipCompletionCount } = this.calculateContinuousTransferPlanForMode('withdraw', deltaTime, null, 1);
    this.addShipCompletionCostsToTotals(totals, shipCompletionCount, false, deltaTime / 1000);
    return totals;
  }

  estimateShipTransferCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    const workerRatio = this.getHazardousMachineryWorkerAvailabilityRatio();
    const effectiveProductivity = productivity * workerRatio;
    if (!this.shipOperationIsActive) {
      return totals;
    }

    if (this.isShipOperationContinuous()) {
      const seconds = deltaTime / 1000;
      let planningChanges = this.cloneAccumulatedChangesForPlanning(accumulatedChanges);
      if (!accumulatedChanges) {
        const estimatedStoreSupply = this.buildStoreEstimateAccumulatedChanges(deltaTime);
        if (estimatedStoreSupply) {
          for (const category in estimatedStoreSupply) {
            planningChanges[category] ||= {};
            for (const resourceKey in estimatedStoreSupply[category]) {
              planningChanges[category][resourceKey] =
                (planningChanges[category][resourceKey] || 0) + estimatedStoreSupply[category][resourceKey];
            }
          }
        }
      }
      planningChanges = this.applyEstimatedExpansionStorageHeadroom(planningChanges, deltaTime, 1) || planningChanges;
      const withdrawalProductivity = this.usesContinuousWithdrawalProductivity()
        ? productivity
        : 1;
      const withdrawalPlan = this.calculateContinuousTransferPlanForMode(
        'withdraw',
        deltaTime,
        planningChanges,
        withdrawalProductivity
      );
      this.addShipCompletionCostsToTotals(totals, withdrawalPlan.shipCompletionCount, applyRates, seconds);
      if (this.hasContinuousTransferMode('store')) {
        const storePlan = this.calculateContinuousTransferPlanForMode('store', deltaTime, planningChanges, 1);
        this.addShipCompletionCostsToTotals(totals, storePlan.shipCompletionCount, applyRates, seconds);
      }
      return totals;
    }

    const duration = this.shipOperationStartingDuration || this.getShipOperationDuration();
    const rate = 1000 / duration;
    const fraction = (deltaTime / duration) * workerRatio;
    const cost = this.calculateSpaceshipTotalCost();
    for (const category in cost) {
      if (!totals.cost[category]) totals.cost[category] = {};
      for (const resource in cost[category]) {
        const rateValue = cost[category][resource] * rate * (applyRates ? effectiveProductivity : 1);
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
    return totals;
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (this.isActive) {
      const duration = this.getEffectiveDuration();
      const expansionProductivity = this.attributes?.continuousAsBuilding ? productivity : 1;
      const fraction = (deltaTime / duration) * expansionProductivity;
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
            sourceLabel: this.getExpansionRateSourceLabel()
          }
        );
        this.mergeResourceTotals(totals.cost, expansionCostTotals);
      }
    }
    const shipTotals = this.estimateShipTransferCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
    for (const category in shipTotals.cost) {
      totals.cost[category] ||= {};
      for (const resource in shipTotals.cost[category]) {
        totals.cost[category][resource] = (totals.cost[category][resource] || 0) + shipTotals.cost[category][resource];
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

  createSpaceshipAssignmentUI(container) {
    super.createSpaceshipAssignmentUI(container);
    const els = projectElements[this.name];
    const section = container.lastElementChild;
    section.classList.add('space-storage-assignment-section');
    const title = section.querySelector('.section-title');
    const assignmentContainer = section.querySelector('.spaceship-assignment-container');
    assignmentContainer.classList.add('space-storage-ship-assignment-controls');

    const transferMethodContainer = document.createElement('div');
    transferMethodContainer.classList.add('space-storage-transfer-method-container');

    const transferMethodLabel = document.createElement('label');
    transferMethodLabel.htmlFor = `${this.name}-transfer-method`;
    transferMethodLabel.textContent = getSpaceStorageProjectText('transferMethod', null, 'Transfer:');

    const transferMethodSelect = document.createElement('select');
    transferMethodSelect.id = `${this.name}-transfer-method`;
    const spaceshipOption = document.createElement('option');
    spaceshipOption.value = 'spaceships';
    spaceshipOption.textContent = getSpaceStorageProjectText('transferMethodSpaceships', null, 'Spaceships');
    const teleporterOption = document.createElement('option');
    teleporterOption.value = 'teleporters';
    teleporterOption.textContent = getSpaceStorageProjectText('transferMethodTeleporters', null, 'Teleporters');
    transferMethodSelect.append(spaceshipOption, teleporterOption);
    transferMethodSelect.addEventListener('change', (event) => {
      this.setTransferMethod(event.target.value);
      if (this.isTeleporterTransferActive()) {
        this.shipOperationRemainingTime = 0;
        this.shipOperationStartingDuration = 0;
        this.shipOperationKesslerElapsed = 0;
        this.shipOperationKesslerPending = false;
        this.shipOperationKesslerCost = null;
      }
      invalidateAutomationSettingsCache(this.name);
      this.updateUI();
    });

    transferMethodContainer.append(transferMethodLabel, transferMethodSelect);
    title.appendChild(transferMethodContainer);

    const teleporterContainer = document.createElement('div');
    teleporterContainer.classList.add('space-storage-teleporter-controls');
    const teleporterLabel = document.createElement('label');
    teleporterLabel.htmlFor = `${this.name}-teleporter-rate`;
    teleporterLabel.textContent = getSpaceStorageProjectText('teleporterRate', null, 'Transfer Rate:');

    const rateInput = document.createElement('input');
    rateInput.type = 'text';
    rateInput.inputMode = 'decimal';
    rateInput.id = `${this.name}-teleporter-rate`;
    rateInput.classList.add('space-storage-teleporter-rate-input');
    wireStringNumberInput(rateInput, {
      datasetKey: 'teleporterTransferRate',
      parseValue: (value) => Math.max(0, parseFlexibleNumber(value) || 0),
      formatValue: (parsed) => parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed),
      onValue: (parsed) => {
        this.setTeleporterTransferRate(parsed);
        invalidateAutomationSettingsCache(this.name);
        this.updateUI();
      }
    });

    const rateBasisSelect = document.createElement('select');
    const fixedOption = document.createElement('option');
    fixedOption.value = 'fixed';
    fixedOption.textContent = getSpaceStorageProjectText('teleporterBasisFixed', null, 'Fixed');
    const workersOption = document.createElement('option');
    workersOption.value = 'workers';
    workersOption.textContent = getSpaceStorageProjectText('teleporterBasisWorkers', null, 'workers');
    rateBasisSelect.append(fixedOption, workersOption);
    rateBasisSelect.addEventListener('change', (event) => {
      this.setTeleporterTransferRateBasis(event.target.value);
      invalidateAutomationSettingsCache(this.name);
      this.updateUI();
    });

    teleporterContainer.append(teleporterLabel, rateInput, rateBasisSelect);
    section.appendChild(teleporterContainer);
    els.transferMethodContainer = transferMethodContainer;
    els.transferMethodSelect = transferMethodSelect;
    els.shipAssignmentContainer = assignmentContainer;
    els.teleporterControls = teleporterContainer;
    els.teleporterRateInput = rateInput;
    els.teleporterRateBasisSelect = rateBasisSelect;
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
      elements.costPerShipElement.textContent = getSpaceStorageProjectText(
        'costPerShipment',
        { value: costPerShipText },
        `Cost per Shipment: ${costPerShipText}`
      );
    }

    if (elements.totalCostElement && this.assignedSpaceships != null) {
      const perSecond = this.isShipOperationContinuous();
      const totalCost = perSecond
        ? this.estimateShipTransferCostAndGain(1000, false, this.continuousProductivity ?? 1, null).cost
        : this.calculateSpaceshipTotalCost(false);
      const suffix = perSecond ? '/s' : '';
      const costParts = [];
      let hasShortfall = false;
      for (const category in totalCost) {
        for (const resource in totalCost[category]) {
          const requiredAmount = totalCost[category][resource];
          let availableAmount = getAvailableProjectCostAmount(this, category, resource);
          // Space storage ship operations always spend colony energy, never stored space energy.
          // Keep UI shortfall highlighting aligned with the real payment source.
          if (category === 'colony' && resource === 'energy') {
            availableAmount = resources.colony.energy.value;
          }
          const resourceDisplayName = resources[category][resource].displayName ||
            resource.charAt(0).toUpperCase() + resource.slice(1);
          costParts.push(`${resourceDisplayName}: ${formatNumber(requiredAmount, true)}${suffix}`);
          if (!hasShortfall && shouldHighlightProjectCost(this, category, resource, availableAmount, requiredAmount)) {
            hasShortfall = true;
          }
        }
      }
      const totalCostText = getProjectsUIText('ui.projects.totalCost', 'Total Cost: {items}', {
        items: costParts.join(', ')
      });
      if (elements._cachedTotalCostText !== totalCostText) {
        elements.totalCostElement.textContent = totalCostText;
        elements._cachedTotalCostText = totalCostText;
      }
      elements.totalCostElement.style.color = hasShortfall ? 'red' : '';
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
      elements.resourceGainPerShipElement.textContent = getSpaceStorageProjectText(
        'gainPerShipment',
        { value: gainPerShipText },
        `Gain per Shipment: ${gainPerShipText}`
      );
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
      elements.transferRateElement.textContent = getSpaceStorageProjectText(
        'transferRate',
        { value: formatNumber(rate, true) },
        `Transfer Rate: ${formatNumber(rate, true)}/s`
      );
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
    if (!this.isTeleporterTransferUnlocked()) {
      this.transferMethod = 'spaceships';
    } else if (this.transferMethod === 'teleporters' && this.assignedSpaceships > 0) {
      this.assignSpaceships(-this.assignedSpaceships);
    }
    this.usedStorageResyncTimer += deltaTime;
    while (this.usedStorageResyncTimer >= 1000) {
      this.usedStorageResyncTimer -= 1000;
      this.reconcileUsedStorage();
    }
    if (this.isShipOperationContinuous()) {
      this.shipOperationIsActive = this.shipOperationAutoStart === true;
      this.shipOperationIsPaused = false;
      this.pendingTransfers = [];
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
      resourceTransferWeights: { ...(this.resourceTransferWeights || {}) },
      resourceImportLimitRespects: this.exportImportLimitRespectsForAutomation(),
      resourceBiomassDensityWithdrawLimits: this.exportBiomassDensityWithdrawLimitsForAutomation(),
      resourcePressureWithdrawLimits: this.exportPressureWithdrawLimitsForAutomation(),
      transferMethod: this.transferMethod,
      teleporterTransferRate: this.teleporterTransferRate,
      teleporterTransferRateBasis: this.teleporterTransferRateBasis,
      megaProjectResourceMode: this.megaProjectResourceMode,
      megaProjectSpaceOnlyOnTravel: this.megaProjectSpaceOnlyOnTravel === true,
      waterWithdrawTarget: this.waterWithdrawTarget,
      hydrogenTransferTarget: this.hydrogenTransferTarget,
      artificialEcosystemsEnabled: this.artificialEcosystemsEnabled === true,
      ...capsAndReserveSettings
    };
  }

  saveCapsAndReserveAutomationSettings() {
    return {
      resourceStrategicReserves: JSON.parse(JSON.stringify(this.resourceStrategicReserves || {})),
      resourceCaps: JSON.parse(JSON.stringify(this.resourceCaps || {})),
      resourceTransferWeights: JSON.parse(JSON.stringify(this.resourceTransferWeights || {})),
      resourceImportLimitRespects: this.exportImportLimitRespectsForAutomation(),
      resourceBiomassDensityWithdrawLimits: this.exportBiomassDensityWithdrawLimitsForAutomation(),
      resourcePressureWithdrawLimits: this.exportPressureWithdrawLimitsForAutomation()
    };
  }

  saveOtherAutomationSettings() {
    const settings = this.saveAutomationSettings();
    delete settings.resourceStrategicReserves;
    delete settings.resourceCaps;
    delete settings.resourceTransferWeights;
    delete settings.resourceImportLimitRespects;
    delete settings.resourceBiomassDensityWithdrawLimits;
    delete settings.resourcePressureWithdrawLimits;
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
        .map((entry) => {
          if (entry.resource === 'liquidWater' || entry.resource === 'biomass') {
            return { category: 'surface', resource: entry.resource };
          }
          return { category: entry.category, resource: entry.resource };
        });
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
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceTransferWeights')) {
      this.resourceTransferWeights = { ...(settings.resourceTransferWeights || {}) };
      this.sanitizeTransferWeights();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceImportLimitRespects')) {
      this.resourceImportLimitRespects = { ...(settings.resourceImportLimitRespects || {}) };
      this.sanitizeImportLimitRespects();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceBiomassDensityWithdrawLimits')) {
      this.resourceBiomassDensityWithdrawLimits = { ...(settings.resourceBiomassDensityWithdrawLimits || {}) };
      this.sanitizeBiomassDensityWithdrawLimits();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourcePressureWithdrawLimits')) {
      this.resourcePressureWithdrawLimits = { ...(settings.resourcePressureWithdrawLimits || {}) };
      this.sanitizePressureWithdrawLimits();
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
    if (Object.prototype.hasOwnProperty.call(settings, 'hydrogenTransferTarget')) {
      this.hydrogenTransferTarget = settings.hydrogenTransferTarget === 'colony' ? 'colony' : 'atmospheric';
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'artificialEcosystemsEnabled')) {
      this.artificialEcosystemsEnabled = settings.artificialEcosystemsEnabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'transferMethod')) {
      this.transferMethod = settings.transferMethod === 'teleporters' ? 'teleporters' : 'spaceships';
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'teleporterTransferRate')) {
      this.setTeleporterTransferRate(settings.teleporterTransferRate);
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'teleporterTransferRateBasis')) {
      this.setTeleporterTransferRateBasis(settings.teleporterTransferRateBasis);
    }
    this.loadCapsAndReserveAutomationSettings(settings);
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      this.resourceTransferModes = {};
      this.lastUniformTransferMode = this.shipTransferMode;
    }
    if (this.megaProjectSpaceOnlyOnTravel) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY;
    }
    this.sanitizeTransferModes();
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
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceTransferWeights')) {
      this.resourceTransferWeights = settings.resourceTransferWeights
        ? JSON.parse(JSON.stringify(settings.resourceTransferWeights))
        : {};
      this.sanitizeTransferWeights();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceImportLimitRespects')) {
      this.resourceImportLimitRespects = settings.resourceImportLimitRespects
        ? JSON.parse(JSON.stringify(settings.resourceImportLimitRespects))
        : {};
      this.sanitizeImportLimitRespects();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceBiomassDensityWithdrawLimits')) {
      this.resourceBiomassDensityWithdrawLimits = settings.resourceBiomassDensityWithdrawLimits
        ? JSON.parse(JSON.stringify(settings.resourceBiomassDensityWithdrawLimits))
        : {};
      this.sanitizeBiomassDensityWithdrawLimits();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourcePressureWithdrawLimits')) {
      this.resourcePressureWithdrawLimits = settings.resourcePressureWithdrawLimits
        ? JSON.parse(JSON.stringify(settings.resourcePressureWithdrawLimits))
        : {};
      this.sanitizePressureWithdrawLimits();
    }
  }

  loadOtherAutomationSettings(settings = {}) {
    const filteredSettings = {};
    for (const key in settings) {
      if (key === 'resourceStrategicReserves' || key === 'resourceCaps' || key === 'resourceTransferWeights' || key === 'resourceImportLimitRespects' || key === 'resourceBiomassDensityWithdrawLimits' || key === 'resourcePressureWithdrawLimits') {
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
      hydrogenTransferTarget: this.hydrogenTransferTarget,
      artificialEcosystemsEnabled: this.artificialEcosystemsEnabled,
      resourceCaps: this.resourceCaps,
      resourceTransferWeights: this.resourceTransferWeights,
      resourceImportLimitRespects: this.resourceImportLimitRespects,
      resourceBiomassDensityWithdrawLimits: this.resourceBiomassDensityWithdrawLimits,
      resourcePressureWithdrawLimits: this.resourcePressureWithdrawLimits,
      transferMethod: this.transferMethod,
      teleporterTransferRate: this.teleporterTransferRate,
      teleporterTransferRateBasis: this.teleporterTransferRateBasis,
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
    this.hydrogenTransferTarget = state.hydrogenTransferTarget === 'colony' ? 'colony' : 'atmospheric';
    this.artificialEcosystemsEnabled = state.artificialEcosystemsEnabled === true;
    this.resourceCaps = state.resourceCaps || {};
    this.sanitizeResourceCaps();
    this.resourceTransferModes = state.resourceTransferModes || {};
    this.resourceTransferWeights = state.resourceTransferWeights || {};
    this.sanitizeTransferWeights();
    this.resourceImportLimitRespects = state.resourceImportLimitRespects || {};
    this.sanitizeImportLimitRespects();
    this.resourceBiomassDensityWithdrawLimits = state.resourceBiomassDensityWithdrawLimits || {};
    this.sanitizeBiomassDensityWithdrawLimits();
    this.resourcePressureWithdrawLimits = state.resourcePressureWithdrawLimits || {};
    this.sanitizePressureWithdrawLimits();
    this.transferMethod = state.transferMethod === 'teleporters' ? 'teleporters' : 'spaceships';
    this.setTeleporterTransferRate(state.teleporterTransferRate);
    this.setTeleporterTransferRateBasis(state.teleporterTransferRateBasis);
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
    this.sanitizeTransferModes();
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
      megaProjectResourceMode: this.megaProjectResourceMode,
      megaProjectSpaceOnlyOnTravel: this.megaProjectSpaceOnlyOnTravel,
      resourceStrategicReserves: this.resourceStrategicReserves,
      artificialEcosystemsEnabled: this.artificialEcosystemsEnabled,
      hydrogenTransferTarget: this.hydrogenTransferTarget,
      resourceCaps: this.resourceCaps,
      resourceTransferWeights: this.resourceTransferWeights,
      resourceImportLimitRespects: this.resourceImportLimitRespects,
      resourceBiomassDensityWithdrawLimits: this.resourceBiomassDensityWithdrawLimits,
      resourcePressureWithdrawLimits: this.resourcePressureWithdrawLimits,
      transferMethod: this.transferMethod,
      teleporterTransferRate: this.teleporterTransferRate,
      teleporterTransferRateBasis: this.teleporterTransferRateBasis,
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
    this.resourceStrategicReserves = state.resourceStrategicReserves || {};
    this.sanitizeResourceStrategicReserves();
    if (!state.resourceStrategicReserves && state.strategicReserve > 0) {
      this.applyLegacyStrategicReserve(state.strategicReserve);
    }
    this.artificialEcosystemsEnabled = state.artificialEcosystemsEnabled === true;
    this.hydrogenTransferTarget = state.hydrogenTransferTarget === 'colony' ? 'colony' : 'atmospheric';
    this.resourceCaps = state.resourceCaps || {};
    this.sanitizeResourceCaps();
    this.shipTransferMode = state.shipTransferMode || this.shipTransferMode;
    this.lastUniformTransferMode = state.lastUniformTransferMode || this.lastUniformTransferMode;
    this.resourceTransferModes = state.resourceTransferModes || {};
    this.resourceTransferWeights = state.resourceTransferWeights || {};
    this.sanitizeTransferWeights();
    this.resourceImportLimitRespects = state.resourceImportLimitRespects || {};
    this.sanitizeImportLimitRespects();
    this.resourceBiomassDensityWithdrawLimits = state.resourceBiomassDensityWithdrawLimits || {};
    this.sanitizeBiomassDensityWithdrawLimits();
    this.resourcePressureWithdrawLimits = state.resourcePressureWithdrawLimits || {};
    this.sanitizePressureWithdrawLimits();
    this.transferMethod = state.transferMethod === 'teleporters' ? 'teleporters' : 'spaceships';
    this.setTeleporterTransferRate(state.teleporterTransferRate);
    this.setTeleporterTransferRateBasis(state.teleporterTransferRateBasis);
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
    this.sanitizeTransferModes();
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
