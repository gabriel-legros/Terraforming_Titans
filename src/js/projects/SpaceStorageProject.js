class SpaceStorageProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.baseDuration = config.duration;
    this.capacityPerCompletion = 1000000000000;
    this.usedStorage = 0;
    this.selectedResources = [];
    this.resourceUsage = {};
    this.shipOperationAutoStart = false;
    this.shipOperationIsActive = false;
    this.shipOperationIsPaused = false;
    this.shipOperationRemainingTime = 0;
    this.shipOperationStartingDuration = 0;
    this.shipWithdrawMode = false;
    this.pendingTransfers = [];
    this.prioritizeMegaProjects = false;
  }

  getDurationWithTerraformBonus(baseDuration) {
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getTerraformedPlanetCountIncludingCurrent !== 'function'
    ) {
      return baseDuration;
    }
    const count = spaceManager.getTerraformedPlanetCountIncludingCurrent();
    return baseDuration / count;
  }

  get maxStorage() {
    return this.repeatCount * this.capacityPerCompletion;
  }

  isContinuous() {
    return false;
  }

  isShipOperationContinuous() {
    return this.assignedSpaceships > 100;
  }

  calculateTransferAmount() {
    const base = this.attributes.transportPerShip || 0;
    const scalingFactor = this.isShipOperationContinuous()
      ? this.assignedSpaceships / 100
      : 1;
    return base * scalingFactor;
  }

  calculateSpaceshipAdjustedDuration() {
    const maxShipsForDurationReduction = 100;
    if (this.isShipOperationContinuous()) {
      return this.baseDuration;
    }
    const ships = Math.min(Math.max(this.assignedSpaceships, 1), maxShipsForDurationReduction);
    return this.baseDuration / ships;
  }

  getBaseDuration() {
    const duration = this.calculateSpaceshipAdjustedDuration();
    return this.getDurationWithTerraformBonus(duration);
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

  calculateTransferPlan(simulate = false, capacityOverride = null) {
    const transfers = [];
    let total = 0;
    const capacity = capacityOverride != null ? capacityOverride : this.calculateTransferAmount();
    if (capacity <= 0) return { transfers, total };

    if (this.shipWithdrawMode) {
      let remaining = capacity;
      const all = this.selectedResources.map(({ category, resource }) => {
        const stored = this.resourceUsage[resource] || 0;
        const target = resource === 'liquidWater'
          ? { category: 'colony', resource: 'water' }
          : { category, resource };
        const targetRes = resources[target.category][target.resource];
        const destFree = targetRes.cap - targetRes.value;
        return { category: target.category, resource: target.resource, stored, destFree, key: resource };
      }).filter(r => r.stored > 0 && r.destFree > 0);
      let valid = all;
      while (remaining > 0 && valid.length > 0) {
        const share = remaining / valid.length;
        let used = 0;
        valid.forEach(r => {
          const available = r.stored - (r.assigned || 0);
          const capacityLeft = r.destFree - (r.assigned || 0);
          const amount = Math.min(share, available, capacityLeft);
          if (amount > 0) {
            r.assigned = (r.assigned || 0) + amount;
            used += amount;
          }
        });
        remaining -= used;
        valid = valid.filter(r => (r.stored - (r.assigned || 0)) > 0 && (r.destFree - (r.assigned || 0)) > 0);
        if (used === 0) break;
      }
      all.forEach(r => {
        const amount = r.assigned || 0;
        if (amount > 0) {
          total += amount;
          transfers.push({ mode: 'withdraw', category: r.category, resource: r.resource, amount, storageKey: r.key });
          if (!simulate) {
            const stored = this.resourceUsage[r.key] || 0;
            const remainingStored = stored - amount;
            if (remainingStored > 0) {
              this.resourceUsage[r.key] = remainingStored;
            } else {
              delete this.resourceUsage[r.key];
            }
            this.usedStorage = Math.max(0, this.usedStorage - amount);
          }
        }
      });
    } else {
      const freeSpace = this.maxStorage - this.usedStorage;
      let remaining = Math.min(capacity, freeSpace);
      const all = this.selectedResources.map(({ category, resource }) => {
        const src = resources[category] && resources[category][resource];
        const available = resource === 'liquidWater'
          ? resources.surface.liquidWater.value
          : (src ? src.value : 0);
        return { category, resource, available, src: resource === 'liquidWater' ? resources.surface.liquidWater : src };
      }).filter(r => r.available > 0);
      let valid = all;
      while (remaining > 0 && valid.length > 0) {
        const share = remaining / valid.length;
        let used = 0;
        valid.forEach(r => {
          const available = r.available - (r.assigned || 0);
          const amount = Math.min(share, available);
          if (amount > 0) {
            r.assigned = (r.assigned || 0) + amount;
            used += amount;
          }
        });
        remaining -= used;
        valid = valid.filter(r => (r.available - (r.assigned || 0)) > 0);
        if (used === 0) break;
      }
      all.forEach(r => {
        const amount = r.assigned || 0;
        if (amount > 0) {
          total += amount;
          transfers.push({ mode: 'store', category: r.category, resource: r.resource, amount });
          if (!simulate) {
            r.src.decrease(amount);
          }
        }
      });
    }
    return { transfers, total };
  }

  canStart() {
    const base = Object.getPrototypeOf(SpaceshipProject.prototype);
    return base.canStart.call(this);
  }

  canStartShipOperation() {
    if (this.shipOperationIsActive) return false;
    if (this.assignedSpaceships <= 0) return false;
    if (this.selectedResources.length === 0) return false;
    const transferPlan = this.calculateTransferPlan(true);
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
    this.shipOperationRemainingTime = this.getEffectiveDuration();
    this.shipOperationStartingDuration = this.shipOperationRemainingTime;
    this.shipOperationIsActive = true;
    this.shipOperationIsPaused = false;
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

  updateShipOperation(deltaTime) {
    if (!this.shipOperationIsActive || this.shipOperationIsPaused) return;
    this.shipOperationRemainingTime -= deltaTime;
    if (this.shipOperationRemainingTime <= 0) {
      this.completeShipOperation();
    }
  }

  applyContinuousShipOperation(deltaTime) {
    const fraction = deltaTime / this.getEffectiveDuration();
    const capacity = this.calculateTransferAmount() * fraction;
    if (capacity <= 0) {
      this.shipOperationIsActive = false;
      return;
    }

    const totalCost = this.calculateSpaceshipTotalCost();
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const amount = totalCost[category][resource] * this.assignedSpaceships * fraction;
        if (resources[category][resource].value < amount) {
          this.shipOperationIsActive = false;
          return;
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
      if (t.mode === 'withdraw') {
        const stored = this.resourceUsage[t.storageKey] || 0;
        const remaining = stored - t.amount;
        if (remaining > 0) {
          this.resourceUsage[t.storageKey] = remaining;
        } else {
          delete this.resourceUsage[t.storageKey];
        }
        this.usedStorage = Math.max(0, this.usedStorage - t.amount);
        resources[t.category][t.resource].increase(t.amount);
      } else if (t.mode === 'store') {
        resources[t.category][t.resource].decrease(t.amount);
        this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + t.amount;
        this.usedStorage += t.amount;
      }
    });

    this.shipOperationIsActive = true;
  }

  completeShipOperation() {
    this.shipOperationIsActive = false;
    this.pendingTransfers.forEach(t => {
      if (t.mode === 'withdraw') {
        resources[t.category][t.resource].increase(t.amount);
      } else if (t.mode === 'store') {
        this.resourceUsage[t.resource] = (this.resourceUsage[t.resource] || 0) + t.amount;
        this.usedStorage += t.amount;
      }
    });
    this.pendingTransfers = [];
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

  saveState() {
    return {
      ...super.saveState(),
      usedStorage: this.usedStorage,
      selectedResources: this.selectedResources,
      resourceUsage: this.resourceUsage,
      pendingTransfers: this.pendingTransfers,
      prioritizeMegaProjects: this.prioritizeMegaProjects,
      shipOperation: {
        remainingTime: this.shipOperationRemainingTime,
        startingDuration: this.shipOperationStartingDuration,
        isActive: this.shipOperationIsActive,
        isPaused: this.shipOperationIsPaused,
        autoStart: this.shipOperationAutoStart,
        mode: this.shipWithdrawMode ? 'withdraw' : 'deposit',
      },
    };
  }

  loadState(state) {
    super.loadState(state);
    this.usedStorage = state.usedStorage || 0;
    this.selectedResources = state.selectedResources || [];
    this.resourceUsage = state.resourceUsage || {};
    this.pendingTransfers = state.pendingTransfers || [];
    this.prioritizeMegaProjects = state.prioritizeMegaProjects || false;
    const ship = state.shipOperation || {};
    this.shipOperationRemainingTime = ship.remainingTime || 0;
    this.shipOperationStartingDuration = ship.startingDuration || 0;
    this.shipOperationIsActive = ship.isActive || false;
    this.shipOperationIsPaused = ship.isPaused || false;
    this.shipOperationAutoStart = ship.autoStart || false;
    this.shipWithdrawMode = ship.mode === 'withdraw';
  }

  saveTravelState() {
    return {
      repeatCount: this.repeatCount,
      usedStorage: this.usedStorage,
      resourceUsage: this.resourceUsage,
    };
  }

  loadTravelState(state = {}) {
    this.repeatCount = state.repeatCount || 0;
    this.usedStorage = state.usedStorage || 0;
    this.resourceUsage = state.resourceUsage || {};
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
