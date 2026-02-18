const SPACE_STORAGE_RESOURCE_REQUIREMENTS = {
  superalloys: { requiresFlag: 'superalloyResearchUnlocked' },
  biomass: { requiresProjectFlag: 'biostorage' },
  atmosphericMethane: { requiresProjectFlag: 'methaneAmmoniaStorage' },
  atmosphericAmmonia: { requiresProjectFlag: 'methaneAmmoniaStorage' },
};
const SPACE_STORAGE_LEGACY_RESERVE_KEYS = [
  'metal',
  'silicon',
  'glass',
  'components',
  'electronics',
  'superconductors',
  'superalloys',
  'oxygen',
  'hydrogen',
  'atmosphericMethane',
  'atmosphericAmmonia',
  'carbonDioxide',
  'liquidWater',
  'inertGas',
  'biomass'
];

class SpaceStorageProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.baseDuration = config.duration;
    this.shipBaseDuration = 50_000;
    this.capacityPerCompletion = 100_000_000_000;
    this.expansionProgress = 0;
    this.usedStorage = 0;
    this.selectedResources = [];
    this.resourceUsage = {};
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

  sanitizeResourceUsage() {
    for (const resourceKey in this.resourceUsage) {
      const amount = this.resourceUsage[resourceKey];
      if (!Number.isFinite(amount) || amount <= 0) {
        delete this.resourceUsage[resourceKey];
      }
    }
  }

  reconcileUsedStorage() {
    this.sanitizeResourceUsage();
    this.usedStorage = Object.values(this.resourceUsage).reduce((sum, amount) => sum + amount, 0);
  }

  getResourceCapSetting(resourceKey) {
    const fallback = { mode: 'none', value: 0 };
    const setting = this.resourceCaps[resourceKey] || fallback;
    const mode = setting.mode === 'amount' || setting.mode === 'percent'
      ? setting.mode
      : 'none';
    const parsedValue = Number(setting.value);
    let value = Number.isFinite(parsedValue) ? parsedValue : 0;
    if (mode === 'percent') {
      value = Math.max(0, Math.min(100, value));
    }
    return { mode, value };
  }

  getResourceCapLimit(resourceKey) {
    const setting = this.getResourceCapSetting(resourceKey);
    if (setting.mode === 'amount') {
      return Math.max(0, setting.value || 0);
    }
    if (setting.mode === 'percent') {
      return Math.max(0, (this.maxStorage * (setting.value || 0)) / 100);
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

  applyLegacyStrategicReserve(legacyValue) {
    const parsed = Number(legacyValue);
    const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    if (amount <= 0) return;
    const keys = new Set(SPACE_STORAGE_LEGACY_RESERVE_KEYS);
    this.selectedResources.forEach(entry => keys.add(entry.resource));
    Object.keys(this.resourceUsage).forEach(key => keys.add(key));
    Object.keys(this.resourceCaps).forEach(key => keys.add(key));
    Object.keys(this.resourceTransferModes).forEach(key => keys.add(key));
    keys.forEach((key) => {
      this.resourceStrategicReserves[key] = { mode: 'amount', value: amount };
    });
  }

  clampStoredResourceToLimit(resourceKey, capLimit) {
    if (capLimit === Infinity) return;
    this.reconcileUsedStorage();
    const stored = this.resourceUsage[resourceKey] || 0;
    const clamped = Math.max(0, Math.min(stored, capLimit));
    if (clamped === stored) return;
    if (clamped > 0) {
      this.resourceUsage[resourceKey] = clamped;
    } else {
      delete this.resourceUsage[resourceKey];
    }
    this.usedStorage = Math.max(0, this.usedStorage - (stored - clamped));
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

  isExpansionContinuous() {
    return this.getEffectiveDuration() < 1000;
  }

  isContinuous() {
    return this.isExpansionContinuous();
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
    const stored = this.resourceUsage[resourceKey] || 0;
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
    return this.getDurationWithTerraformBonus(this.baseDuration);
  }

  getShipOperationDuration() {
    const base = this.calculateSpaceshipAdjustedDuration();
    return this.applyDurationEffects(base);
  }

  start(resources) {
    this.shortfallLastTick = false;
    if (this.isExpansionContinuous()) {
      if (!this.canStart()) {
        return false;
      }
      this.expansionProgress = 0;
      this.isActive = true;
      this.isPaused = false;
      this.isCompleted = false;
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      return true;
    }
    this.expansionProgress = 0;
    return Project.prototype.start.call(this, resources);
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
      const stored = this.resourceUsage[entry.resource] || 0;
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
        const remainingStored = stored - amount;
        if (remainingStored > 0) {
          this.resourceUsage[entry.resource] = remainingStored;
        } else {
          delete this.resourceUsage[entry.resource];
        }
        this.usedStorage = Math.max(0, this.usedStorage - amount);
      }
    };

    const applyStoreForResource = (entry) => {
      if (!Number.isFinite(availableFreeSpace) || availableFreeSpace <= 0) return;
      const stored = this.resourceUsage[entry.resource] || 0;
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
      const res = resources[t.category][t.resource];
      const rate = t.amount / durationSeconds;
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

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;

    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      this.isActive = false;
      return;
    }

    const limit = Number.isFinite(this.maxRepeatCount) ? this.maxRepeatCount : Infinity;
    const completedExpansions = this.repeatCount + this.expansionProgress;
    if (completedExpansions >= limit) {
      this.isActive = false;
      this.isCompleted = true;
      this.expansionProgress = Math.max(0, limit - this.repeatCount);
      return;
    }

    if (Number.isFinite(this.startingDuration) && Number.isFinite(this.remainingTime) && this.startingDuration > 0) {
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

    const progress = Math.min((deltaTime / duration) * productivity, remainingRepeats);
    if (progress <= 0) {
      return;
    }

    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage ? projectManager?.projects?.spaceStorage : null;
    let canAffordBaseCost = true;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const res = resources[category][resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const availableTotal = getMegaProjectResourceAvailability(storageProj, storageKey, res.value);
        if (availableTotal < cost[category][resource]) {
          canAffordBaseCost = false;
        }
      }
    }
    if (!canAffordBaseCost) {
      this.shortfallLastTick = true;
      return;
    }
    let shortfall = false;

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
      if (!storageProj || amount <= 0) return 0;
      const availableFromStorage = storageProj.getAvailableStoredResource(key);
      const spend = Math.min(amount, availableFromStorage);
      if (spend > 0) {
        storageProj.resourceUsage[key] = (storageProj.resourceUsage[key] || 0) - spend;
        if (storageProj.resourceUsage[key] <= 0) {
          delete storageProj.resourceUsage[key];
        }
        storageProj.usedStorage = Math.max(0, storageProj.usedStorage - spend);
      }
      return spend;
    };

    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource] * progress;
        const res = resources[category][resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const availableTotal = getMegaProjectResourceAvailability(storageProj, storageKey, res.value);
        if (availableTotal < amount) {
          shortfall = true;
        }

        const colonyAvailable = res.value;
        const allocation = getMegaProjectResourceAllocation(storageProj, storageKey, amount, colonyAvailable);
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

    if (Number.isFinite(limit) && this.repeatCount + this.expansionProgress >= limit) {
      this.expansionProgress = Math.max(0, limit - this.repeatCount);
      this.isActive = false;
      this.isCompleted = true;
    }

    this.shortfallLastTick = shortfall;
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
      if (t.mode === 'withdraw') {
        const stored = this.resourceUsage[t.storageKey] || 0;
        const remaining = stored - t.amount;
        if (remaining > 0) {
          this.resourceUsage[t.storageKey] = remaining;
        } else {
          delete this.resourceUsage[t.storageKey];
        }
        this.usedStorage = Math.max(0, this.usedStorage - t.amount);
        if (t.resource === 'biomass') {
          this.addBiomassToZones(delivered);
          resources.surface.biomass?.modifyRate(deliveredRate, 'Space storage transfer', 'project');
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          this.addLiquidWaterToZones(delivered);
          resources.surface.liquidWater.modifyRate(deliveredRate, 'Space storage transfer', 'project');
        } else {
          const res = resources[t.category][t.resource];
          res.increase(delivered);
          res.modifyRate(deliveredRate, 'Space storage transfer', 'project');
        }
      } else if (t.mode === 'store') {
        if (t.resource === 'biomass') {
          const removed = this.removeBiomassFromZones(t.amount);
          if (removed > 0) {
            const deliveredRemoved = removed * successChance;
            resources.surface.biomass?.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
            this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + deliveredRemoved;
            this.usedStorage += deliveredRemoved;
          }
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          const removed = this.removeLiquidWaterFromZones(t.amount);
          if (removed > 0) {
            const deliveredRemoved = removed * successChance;
            resources.surface.liquidWater.modifyRate(-removed / seconds, 'Space storage transfer', 'project');
            this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + deliveredRemoved;
            this.usedStorage += deliveredRemoved;
          }
        } else {
          const res = resources[t.category][t.resource];
          res.decrease(t.amount);
          res.modifyRate(-rate, 'Space storage transfer', 'project');
          this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + delivered;
          this.usedStorage += delivered;
        }
      }
    });

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
        if (t.resource === 'biomass') {
          this.addBiomassToZones(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            resources.surface.biomass?.modifyRate(rate, 'Space storage transfer', 'project');
          }
        } else if (t.resource === 'liquidWater' && t.category === 'surface') {
          this.addLiquidWaterToZones(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            resources.surface.liquidWater.modifyRate(rate, 'Space storage transfer', 'project');
          }
        } else {
          const res = resources[t.category][t.resource];
          res.increase(t.amount);
          if (!this.shipOperationAutoStart && durationSeconds > 0) {
            const rate = t.amount / durationSeconds;
            res.modifyRate(rate, 'Space storage transfer', 'project');
          }
        }
      } else if (t.mode === 'store') {
        this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + t.amount;
        this.usedStorage += t.amount;
      }
    });
    this.pendingTransfers = [];
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (this.isActive) {
      const duration = this.getEffectiveDuration();
      const rate = 1000 / duration;
      const fraction = deltaTime / duration;
      const cost = this.getScaledCost();
      let canAffordBaseCost = true;
      if (this.isContinuous()) {
        const storageProj = this.attributes.canUseSpaceStorage ? projectManager?.projects?.spaceStorage : null;
        for (const category in cost) {
          for (const resource in cost[category]) {
            const res = resources[category][resource];
            const storageKey = resource === 'water' ? 'liquidWater' : resource;
            const availableTotal = getMegaProjectResourceAvailability(storageProj, storageKey, res.value);
            if (availableTotal < cost[category][resource]) {
              canAffordBaseCost = false;
            }
          }
        }
      }
      if (canAffordBaseCost) {
      for (const category in cost) {
        if (!totals.cost[category]) totals.cost[category] = {};
        for (const resource in cost[category]) {
          const rateValue = cost[category][resource] * rate * (applyRates ? productivity : 1);
          const usingStorage = this.usesSpaceStorageForResource(category, resource, cost[category][resource]);
          if (applyRates && resources[category] && resources[category][resource] && !usingStorage) {
            resources[category][resource].modifyRate(
              -rateValue,
              'Space storage expansion',
              'project'
            );
          }
          totals.cost[category][resource] =
            (totals.cost[category][resource] || 0) + cost[category][resource] * fraction;
        }
      }
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
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(this);
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
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
    return {
      ...super.saveAutomationSettings(),
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
      resourceStrategicReserves: JSON.parse(JSON.stringify(this.resourceStrategicReserves || {})),
      resourceCaps: JSON.parse(JSON.stringify(this.resourceCaps || {}))
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
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
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceStrategicReserves')) {
      this.resourceStrategicReserves = settings.resourceStrategicReserves
        ? JSON.parse(JSON.stringify(settings.resourceStrategicReserves))
        : {};
      this.sanitizeResourceStrategicReserves();
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'resourceCaps')) {
      this.resourceCaps = settings.resourceCaps ? JSON.parse(JSON.stringify(settings.resourceCaps)) : {};
      for (const resourceKey in this.resourceCaps) {
        const cap = this.resourceCaps[resourceKey];
        if (!cap || (cap.mode !== 'amount' && cap.mode !== 'percent')) {
          delete this.resourceCaps[resourceKey];
        }
      }
    }
    if (this.shipTransferMode === 'store' || this.shipTransferMode === 'withdraw') {
      this.resourceTransferModes = {};
      this.lastUniformTransferMode = this.shipTransferMode;
    }
    if (this.megaProjectSpaceOnlyOnTravel) {
      this.megaProjectResourceMode = MEGA_PROJECT_RESOURCE_MODES.SPACE_ONLY;
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      expansionProgress: this.expansionProgress,
      usedStorage: this.usedStorage,
      selectedResources: this.selectedResources,
      resourceUsage: this.resourceUsage,
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
    this.expansionProgress = state.expansionProgress || 0;
    this.usedStorage = state.usedStorage || 0;
    this.selectedResources = state.selectedResources || [];
    this.resourceUsage = state.resourceUsage || {};
    this.sanitizeResourceUsage();
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
    for (const resourceKey in this.resourceCaps) {
      const cap = this.resourceCaps[resourceKey];
      if (!cap || (cap.mode !== 'amount' && cap.mode !== 'percent')) {
        delete this.resourceCaps[resourceKey];
      }
    }
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
  }

  saveTravelState() {
    return {
      repeatCount: this.repeatCount,
      expansionProgress: this.expansionProgress,
      usedStorage: this.usedStorage,
      resourceUsage: this.resourceUsage,
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
    this.expansionProgress = state.expansionProgress || 0;
    this.usedStorage = state.usedStorage || 0;
    this.resourceUsage = state.resourceUsage || {};
    this.sanitizeResourceUsage();
    this.resourceStrategicReserves = state.resourceStrategicReserves || {};
    this.sanitizeResourceStrategicReserves();
    if (!state.resourceStrategicReserves && state.strategicReserve > 0) {
      this.applyLegacyStrategicReserve(state.strategicReserve);
    }
    this.resourceCaps = state.resourceCaps || {};
    for (const resourceKey in this.resourceCaps) {
      const cap = this.resourceCaps[resourceKey];
      if (!cap || (cap.mode !== 'amount' && cap.mode !== 'percent')) {
        delete this.resourceCaps[resourceKey];
      }
    }
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
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
