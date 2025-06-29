class SpaceshipProject extends Project {

  constructor(config, name) {
    super(config, name);
    this.assignedSpaceships = 0;
    this.autoAssignSpaceships = false;
    this.waitForCapacity = true;
    this.selectedDisposalResource = this.attributes.defaultDisposal;
  }

 assignSpaceships(count) {
    const availableSpaceships = Math.floor(resources.special.spaceships.value);
    this.assignedSpaceships = this.assignedSpaceships || 0;
    const adjustedCount = Math.max(-this.assignedSpaceships, Math.min(count, availableSpaceships));
    this.assignedSpaceships += adjustedCount;
    resources.special.spaceships.value -= adjustedCount;
  }

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

  updateCostAndGains(elements) {
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
      elements.costPerShipElement.textContent = `Cost per Ship: ${costPerShipText}`;
    }

    if (elements.totalCostElement && this.assignedSpaceships != null) {
      const totalCost = this.calculateSpaceshipTotalCost();
      elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost);
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
      elements.resourceGainPerShipElement.textContent = `Gain per Ship: ${gainPerShipText}`;
    }

    if (elements.totalGainElement && this.assignedSpaceships != null) {
      const totalGain = this.calculateSpaceshipTotalResourceGain();
      elements.totalGainElement.textContent = formatTotalResourceGainDisplay(totalGain);
    }
  }

  createSpaceshipAssignmentUI(container) {
    const spaceshipAssignmentContainer = document.createElement('div');
    spaceshipAssignmentContainer.classList.add('spaceship-assignment-container');

    const spaceshipInfoContainer = document.createElement('div');
    spaceshipInfoContainer.classList.add('spaceship-info-container');

    const assignedSpaceshipsDisplay = document.createElement('p');
    assignedSpaceshipsDisplay.id = `${this.name}-assigned-spaceships`;
    assignedSpaceshipsDisplay.classList.add('assigned-spaceships-display');
    assignedSpaceshipsDisplay.textContent = `Spaceships Assigned: 0`;
    spaceshipInfoContainer.appendChild(assignedSpaceshipsDisplay);

    const availableSpaceshipsDisplay = document.createElement('span');
    availableSpaceshipsDisplay.id = `${this.name}-available-spaceships`;
    availableSpaceshipsDisplay.classList.add('available-spaceships-display');
    availableSpaceshipsDisplay.textContent = `Available: ${Math.floor(resources.special.spaceships.value)}`;
    spaceshipInfoContainer.appendChild(availableSpaceshipsDisplay);

    spaceshipAssignmentContainer.appendChild(spaceshipInfoContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');

    const buildCounts = ["-Max", -1000000, -100000, -10000, -1000, -100, -10, -1, 1, 10, 100, 1000, 10000, 100000, 1000000, "+Max"];
    buildCounts.forEach((count) => {
      const button = document.createElement('button');
      button.textContent = typeof count === "string" ? count : (count > 0 ? `+${formatNumber(count, true)}` : `${formatNumber(count, true)}`);
      button.addEventListener('click', () => {
        let spaceshipCount;
        if (count === "+Max") {
          spaceshipCount = Math.floor(resources.special.spaceships.value);
        } else if (count === "-Max") {
          spaceshipCount = -this.assignedSpaceships;
        } else {
          spaceshipCount = count;
        }
        this.assignSpaceships(spaceshipCount);
      });
      buttonsContainer.appendChild(button);
    });

    spaceshipAssignmentContainer.appendChild(buttonsContainer);
    container.appendChild(spaceshipAssignmentContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      assignedSpaceshipsDisplay,
      availableSpaceshipsDisplay,
    };
  }

  createCostPerShipAndTotalCostUI(container) {
    const costPerShipElement = document.createElement('p');
    costPerShipElement.id = `${this.name}-cost-per-ship`;
    costPerShipElement.classList.add('project-cost-per-ship');
    costPerShipElement.textContent = `Cost per Ship: ...`;

    const totalCostElement = document.createElement('span');
    totalCostElement.id = `${this.name}-total-cost`;
    totalCostElement.classList.add('project-total-cost');
    totalCostElement.textContent = `Total Cost: ...`;

    const costContainer = document.createElement('div');
    costContainer.classList.add('cost-container');
    costContainer.appendChild(costPerShipElement);
    costContainer.appendChild(totalCostElement);

    container.appendChild(costContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      costPerShipElement,
      totalCostElement,
    };
  }

  createResourceGainPerShipAndTotalGainUI(container) {
    const resourceGainPerShipElement = document.createElement('p');
    resourceGainPerShipElement.id = `${this.name}-resource-gain-per-ship`;
    resourceGainPerShipElement.classList.add('project-resource-gain-per-ship');
    const initialGain = this.calculateSpaceshipGainPerShip();
    const initialGainText = Object.entries(initialGain)
      .flatMap(([category, resourcesList]) =>
        Object.entries(resourcesList)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => {
            const resourceDisplayName = resources[category][resource].displayName ||
              resource.charAt(0).toUpperCase() + resource.slice(1);
            return `${resourceDisplayName}: ${formatNumber(amount, true)}`;
          })
      ).join(', ');
    resourceGainPerShipElement.textContent = `Gain per Ship: ${initialGainText}`;

    const totalGainElement = document.createElement('span');
    totalGainElement.id = `${this.name}-total-resource-gain`;
    totalGainElement.classList.add('project-total-resource-gain');
    totalGainElement.textContent = formatTotalResourceGainDisplay(this.calculateSpaceshipTotalResourceGain());

    const gainContainer = document.createElement('div');
    gainContainer.classList.add('gain-container');
    gainContainer.appendChild(resourceGainPerShipElement);
    gainContainer.appendChild(totalGainElement);

    container.appendChild(gainContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      resourceGainPerShipElement,
      totalGainElement,
    };
  }

  createAutoAssignSpaceshipsCheckbox(checkboxRowContainer) {
    const autoAssignCheckboxContainer = document.createElement('div');
    autoAssignCheckboxContainer.classList.add('checkbox-container');

    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.checked = this.autoAssignSpaceships || false;
    autoAssignCheckbox.id = `${this.name}-auto-assign-spaceships`;
    autoAssignCheckbox.classList.add('auto-assign-checkbox');

    autoAssignCheckbox.addEventListener('change', (event) => {
      if (event.target.checked) {
        this.autoAssignSpaceships = true;
        Object.keys(projectElements).forEach(otherProjectName => {
          if (otherProjectName !== this.name && projectElements[otherProjectName].autoAssignCheckbox) {
            const otherCheckbox = projectElements[otherProjectName].autoAssignCheckbox;
            if (otherCheckbox.checked) {
              otherCheckbox.checked = false;
              otherCheckbox.dispatchEvent(new Event('change'));
            }
          }
        });
      } else {
        this.autoAssignSpaceships = false;
      }
    });

    const autoAssignLabel = document.createElement('label');
    autoAssignLabel.htmlFor = `${this.name}-auto-assign-spaceships`;
    autoAssignLabel.textContent = 'Auto assign spaceships';

    autoAssignCheckboxContainer.appendChild(autoAssignCheckbox);
    autoAssignCheckboxContainer.appendChild(autoAssignLabel);
    checkboxRowContainer.appendChild(autoAssignCheckboxContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      autoAssignCheckbox,
      autoAssignCheckboxContainer,
    };
  }

  renderUI(container) {
    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      this.createSpaceshipAssignmentUI(container);
      if (this.attributes.costPerShip) {
        this.createCostPerShipAndTotalCostUI(container);
      }
      if (this.attributes.resourceGainPerShip) {
        this.createResourceGainPerShipAndTotalGainUI(container);
      }
      const row = projectElements[this.name]?.checkboxRowContainer;
      if (row && !projectElements[this.name].autoAssignCheckbox) {
        this.createAutoAssignSpaceshipsCheckbox(row);
      }
      this.updateCostAndGains(projectElements[this.name]);
    }
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    if (elements.autoAssignCheckbox) {
      elements.autoAssignCheckbox.checked = this.autoAssignSpaceships || false;
    }
    this.updateCostAndGains(elements);
  }

  autoAssign() {
    if (!this.autoAssignSpaceships) return;
    const availableSpaceships = Math.floor(resources.special.spaceships.value);
    if (availableSpaceships > 0) {
      this.assignSpaceships(availableSpaceships);
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

  estimateCostAndGain() {
    this.estimateProjectCostAndGain();
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceshipProject = SpaceshipProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceshipProject;
}
