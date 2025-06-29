class SpaceshipProject extends Project {
  calculateSpaceshipCost() {
    const costPerShip = this.attributes.costPerShip;
    const totalCost = {};
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        const baseCost = costPerShip[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource);
        const adjustedCost = baseCost * multiplier;
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

  calculateSpaceshipGainPerShip() {
    const resourceGainPerShip = this.attributes.resourceGainPerShip;
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    const gainPerShip = {};
    for (const category in resourceGainPerShip) {
      gainPerShip[category] = {};
      for (const resource in resourceGainPerShip[category]) {
        gainPerShip[category][resource] = resourceGainPerShip[category][resource] * efficiency;
      }
    }
    return gainPerShip;
  }

  renderUI(container) {
    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      createSpaceshipAssignmentUI(this, container);
      if (this.attributes.costPerShip) {
        createCostPerShipAndTotalCostUI(this, container);
      }
      if (this.attributes.resourceGainPerShip) {
        createResourceGainPerShipAndTotalGainUI(this, container);
      }
    }
  }

  calculateSpaceshipTotalCost() {
    const totalCost = {};
    const costPerShip = this.calculateSpaceshipCost();
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        totalCost[category][resource] = costPerShip[category][resource] * scalingFactor;
      }
    }
    return totalCost;
  }

  calculateSpaceshipTotalResourceGain() {
    const totalResourceGain = {};
    const resourceGainPerShip = this.attributes.resourceGainPerShip;
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    for (const category in resourceGainPerShip) {
      totalResourceGain[category] = {};
      for (const resource in resourceGainPerShip[category]) {
        totalResourceGain[category][resource] = resourceGainPerShip[category][resource] * scalingFactor * efficiency;
      }
    }
    return totalResourceGain;
  }

  calculateSpaceshipTotalDisposal() {
    const totalDisposal = {};
    const disposalAmount = this.attributes.disposalAmount;
    const scalingFactor = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    const scaledDisposalAmount = disposalAmount * scalingFactor * efficiency;
    if (this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      totalDisposal[category] = { [resource]: scaledDisposalAmount };
    }
    return totalDisposal;
  }

  calculateSpaceshipAdjustedDuration() {
    if (!this.attributes.spaceMining && !this.attributes.spaceExport) return this.duration;
    const maxShipsForDurationReduction = 100;
    const duration = this.duration;
    const assignedShips = Math.min(Math.max(this.assignedSpaceships, 1), maxShipsForDurationReduction);
    return duration / assignedShips;
  }

  canStart() {
    if (!super.canStart()) return false;

    if (this.assignedSpaceships === 0) {
      return false;
    }

    const cost = this.getScaledCost();
    const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
    for (const category in totalSpaceshipCost) {
      for (const resource in totalSpaceshipCost[category]) {
        if (resources[category][resource].value < totalSpaceshipCost[category][resource]) {
          return false;
        }
      }
    }

    if (this.attributes.spaceExport && this.waitForCapacity && this.selectedDisposalResource) {
      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      for (const category in totalDisposal) {
        for (const resource in totalDisposal[category]) {
          const required =
            totalDisposal[category][resource] +
            (totalSpaceshipCost[category]?.[resource] || 0) +
            (cost[category]?.[resource] || 0);
          if (resources[category][resource].value < required) {
            return false;
          }
        }
      }
    }

    return true;
  }

  deductResources(resources) {
    super.deductResources(resources);

    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          resources[category][resource].decrease(totalSpaceshipCost[category][resource]);
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const scaledDisposalAmount = this.calculateSpaceshipTotalDisposal();
      const { category, resource } = this.selectedDisposalResource;
      const actualAmount = Math.min(scaledDisposalAmount[category][resource], resources[category][resource].value);
      resources[category][resource].decrease(scaledDisposalAmount[category][resource]);
      this.pendingResourceGains = [{ category: 'colony', resource: 'funding', quantity: actualAmount * this.attributes.fundingGainAmount }];
    }
  }

  start(resources) {
    const started = super.start(resources);
    if (!started) return false;

    if (this.attributes.spaceMining) {
      const gain = this.calculateSpaceshipTotalResourceGain();
      this.pendingResourceGains = this.pendingResourceGains || [];
      for (const category in gain) {
        for (const resource in gain[category]) {
          this.pendingResourceGains.push({
            category,
            resource,
            quantity: gain[category][resource]
          });
        }
      }
    }
    return true;
  }

  complete() {
    super.complete();
    if (this.pendingResourceGains && (this.attributes.spaceMining || this.attributes.spaceExport)) {
      this.applySpaceshipResourceGain();
    }
  }

  applySpaceshipResourceGain() {
    this.pendingResourceGains.forEach(({ category, resource, quantity }) => {
      if (resources[category] && resources[category][resource]) {
        resources[category][resource].increase(quantity);
        console.log(`Gained ${quantity} ${resource} in category ${category} from spaceship assignments.`);
      }
    });
    this.pendingResourceGains = [];
  }

  estimateProjectCostAndGain() {
    if (this.isActive && this.autoStart) {
      const totalCost = this.calculateSpaceshipTotalCost();
      for (const category in totalCost) {
        for (const resource in totalCost[category]) {
          resources[category][resource].modifyRate(
            -1000 * totalCost[category][resource] / this.getEffectiveDuration(),
            'Spaceship Cost',
            'project'
          );
        }
      }

      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      for (const category in totalDisposal) {
        for (const resource in totalDisposal[category]) {
          resources[category][resource].modifyRate(
            -1000 * totalDisposal[category][resource] / this.getEffectiveDuration(),
            'Spaceship Export',
            'project'
          );
        }
      }

      const totalGain = this.pendingResourceGains;
      const rate = 1000 / this.getEffectiveDuration();
      if (totalGain) {
        totalGain.forEach((gain) => {
          resources[gain.category][gain.resource].modifyRate(
            gain.quantity * rate,
            this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export',
            'project'
          );
        });
      }
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceshipProject = SpaceshipProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceshipProject;
}
