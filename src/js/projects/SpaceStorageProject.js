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
  }

  getDurationWithTerraformBonus(baseDuration) {
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getTerraformedPlanetCount !== 'function'
    ) {
      return baseDuration;
    }
    const count = spaceManager.getTerraformedPlanetCount();
    return baseDuration / (count + 1);
  }

  get maxStorage() {
    return this.repeatCount * this.capacityPerCompletion;
  }

  calculateTransferAmount() {
    const base = this.attributes.transportPerShip || 0;
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    return base * scalingFactor;
  }

  calculateSpaceshipAdjustedDuration() {
    const maxShipsForDurationReduction = 100;
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

  canStartShipOperation() {
    if (this.shipOperationIsActive) return false;
    if (this.assignedSpaceships <= 0) return false;
    if (this.selectedResources.length === 0) return false;
    const transfer = this.calculateTransferAmount();
    if (!this.shipWithdrawMode && this.usedStorage + transfer > this.maxStorage) return false;
    if (this.shipWithdrawMode) {
      const hasStored = this.selectedResources.some(({ resource }) => (this.resourceUsage[resource] || 0) > 0);
      if (!hasStored) return false;
    }
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
    this.shipOperationRemainingTime = this.getEffectiveDuration();
    this.shipOperationStartingDuration = this.shipOperationRemainingTime;
    this.shipOperationIsActive = true;
    this.shipOperationIsPaused = false;
    return true;
  }

  resumeShipOperation() {
    if (this.shipOperationIsPaused && this.canStartShipOperation()) {
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

  completeShipOperation() {
    this.shipOperationIsActive = false;
    const transfer = this.calculateTransferAmount();
    this.selectedResources.forEach(({ category, resource }) => {
      if (this.shipWithdrawMode) {
        const stored = this.resourceUsage[resource] || 0;
        const amount = Math.min(transfer, stored);
        if (amount > 0) {
          resources[category][resource].increase(amount);
          const remaining = stored - amount;
          if (remaining > 0) {
            this.resourceUsage[resource] = remaining;
          } else {
            delete this.resourceUsage[resource];
          }
          this.usedStorage = Math.max(0, this.usedStorage - amount);
        }
      } else {
        const available = resources[category] && resources[category][resource]
          ? resources[category][resource].value
          : 0;
        const amount = Math.min(transfer, available, this.maxStorage - this.usedStorage);
        if (amount > 0) {
          resources[category][resource].decrease(amount);
          this.resourceUsage[resource] = (this.resourceUsage[resource] || 0) + amount;
          this.usedStorage += amount;
        }
      }
    });
  }

  renderUI(container) {
    const topSection = document.createElement('div');
    topSection.classList.add('project-top-section');
    this.createSpaceshipAssignmentUI(topSection);
    this.createProjectDetailsGridUI(topSection);
    if (typeof renderSpaceStorageUI === 'function') {
      renderSpaceStorageUI(this, topSection);
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
    if (this.shipOperationIsActive) {
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
    const ship = state.shipOperation || {};
    this.shipOperationRemainingTime = ship.remainingTime || 0;
    this.shipOperationStartingDuration = ship.startingDuration || 0;
    this.shipOperationIsActive = ship.isActive || false;
    this.shipOperationIsPaused = ship.isPaused || false;
    this.shipOperationAutoStart = ship.autoStart || false;
    this.shipWithdrawMode = ship.mode === 'withdraw';
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
