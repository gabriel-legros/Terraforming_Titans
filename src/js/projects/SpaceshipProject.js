class SpaceshipProject extends Project {

  constructor(config, name) {
    super(config, name);
    this.assignedSpaceships = 0;
    this.autoAssignSpaceships = false;
    this.waitForCapacity = true;
    this.selectedDisposalResource = this.attributes.defaultDisposal;
    this.assignmentMultiplier = 1;
    this.lastActiveTime = 0;
    this.pendingGain = null;
  }

  isContinuous() {
    return this.assignedSpaceships > 100;
  }

 assignSpaceships(count) {
    const wasContinuous = this.isContinuous();
    const availableSpaceships = Math.floor(resources.special.spaceships.value);
    this.assignedSpaceships = this.assignedSpaceships || 0;
    const adjustedCount = Math.max(-this.assignedSpaceships, Math.min(count, availableSpaceships));
    this.assignedSpaceships += adjustedCount;
    resources.special.spaceships.value -= adjustedCount;
    const nowContinuous = this.isContinuous();
    if (this.isActive && wasContinuous !== nowContinuous) {
      if (nowContinuous) {
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
        this.pendingGain = null;
      } else {
        this.isActive = false;
        this.isCompleted = false;
        this.isPaused = false;
        const duration = this.getEffectiveDuration();
        this.startingDuration = duration;
        this.remainingTime = duration;
        this.pendingGain = null;
        this.start(resources);
      }
    }
  }

  calculateSpaceshipCost() {
    const costPerShip = this.attributes.costPerShip;
    const totalCost = {};
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        const baseCost = costPerShip[category][resource];
        const multiplier = this.getEffectiveCostMultiplier(category, resource) *
          this.getEffectiveSpaceshipCostMultiplier(category, resource);
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
      elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost, this);
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
      const perSecond = this.isContinuous();
      const totalGain = this.calculateSpaceshipTotalResourceGain(perSecond);
      if (Object.keys(totalGain).length > 0) {
        elements.totalGainElement.textContent = formatTotalResourceGainDisplay(totalGain, perSecond);
        elements.totalGainElement.style.display = 'block';
      } else {
        elements.totalGainElement.style.display = 'none';
      }
    }
  }

  createSpaceshipAssignmentUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = 'Assignment';
    sectionContainer.appendChild(title);

    const assignmentContainer = document.createElement('div');
    assignmentContainer.classList.add('spaceship-assignment-container');
  
    const assignedAndAvailableContainer = document.createElement('div');
    assignedAndAvailableContainer.classList.add('assigned-and-available-container');
  
    const assignedContainer = document.createElement('div');
    assignedContainer.classList.add('assigned-ships-container');
    const assignedLabel = document.createElement('span');
    assignedLabel.textContent = 'Assigned:';
    const assignedDisplay = document.createElement('span');
    assignedDisplay.id = `${this.name}-assigned-spaceships`;
    assignedContainer.append(assignedLabel, assignedDisplay);
  
    const availableContainer = document.createElement('div');
    availableContainer.classList.add('available-ships-container');
    const availableLabel = document.createElement('span');
    availableLabel.textContent = 'Available:';
    const availableDisplay = document.createElement('span');
    availableDisplay.id = `${this.name}-available-spaceships`;
    availableContainer.append(availableLabel, availableDisplay);
  
    assignedAndAvailableContainer.append(assignedContainer, availableContainer);
  
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
  
    const createButton = (text, onClick, parent = buttonsContainer) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', onClick);
      parent.appendChild(button);
      return button;
    };
  
    const mainButtons = document.createElement('div');
    mainButtons.classList.add('main-buttons');
    buttonsContainer.appendChild(mainButtons);
  
    createButton('0', () => this.assignSpaceships(-this.assignedSpaceships), mainButtons);
    const minusButton = createButton(`-${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignSpaceships(-this.assignmentMultiplier), mainButtons);
    const plusButton = createButton(`+${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignSpaceships(this.assignmentMultiplier), mainButtons);
    createButton('Max', () => this.assignSpaceships(Math.floor(resources.special.spaceships.value)), mainButtons);
  
    const multiplierContainer = document.createElement('div');
    multiplierContainer.classList.add('multiplier-container');
    buttonsContainer.appendChild(multiplierContainer);
  
    createButton('/10', () => {
      this.assignmentMultiplier = Math.max(1, this.assignmentMultiplier / 10);
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);
    createButton('x10', () => {
      this.assignmentMultiplier *= 10;
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);
  
    const autoAssignContainer = this.createAutoAssignSpaceshipsCheckbox();
  
    assignmentContainer.append(assignedAndAvailableContainer, buttonsContainer, autoAssignContainer);
    sectionContainer.appendChild(assignmentContainer);
    container.appendChild(sectionContainer);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      assignedSpaceshipsDisplay: assignedDisplay,
      availableSpaceshipsDisplay: availableDisplay,
    };
  }

  createProjectDetailsGridUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = 'Cost & Gain';
    sectionContainer.appendChild(title);

    const grid = document.createElement('div');
    grid.classList.add('project-details-grid');

    const costPerShip = document.createElement('div');
    costPerShip.id = `${this.name}-cost-per-ship`;
    projectElements[this.name].costPerShipElement = costPerShip;

    const totalCost = document.createElement('div');
    totalCost.id = `${this.name}-total-cost`;
    projectElements[this.name].totalCostElement = totalCost;

    const gainPerShip = document.createElement('div');
    gainPerShip.id = `${this.name}-resource-gain-per-ship`;
    projectElements[this.name].resourceGainPerShipElement = gainPerShip;

    const totalGain = document.createElement('div');
    totalGain.id = `${this.name}-total-resource-gain`;
    projectElements[this.name].totalGainElement = totalGain;
    
    grid.append(costPerShip, totalCost, gainPerShip, totalGain);
    sectionContainer.appendChild(grid);
    container.appendChild(sectionContainer);
  }

  createResourceGainPerShipAndTotalGainUI(container) {
    // This will be handled in the new createProjectDetailsGridUI method
  }

  createAutoAssignSpaceshipsCheckbox() {
    const autoAssignCheckboxContainer = document.createElement('div');
    autoAssignCheckboxContainer.classList.add('checkbox-container', 'auto-assign-container');
  
    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.checked = this.autoAssignSpaceships || false;
    autoAssignCheckbox.id = `${this.name}-auto-assign-spaceships`;
    autoAssignCheckbox.classList.add('auto-assign-checkbox');
  
    autoAssignCheckbox.addEventListener('change', (event) => {
      if (event.target.checked) {
        this.autoAssignSpaceships = true;
        Object.keys(projectManager.projects).forEach(otherProjectName => {
            const otherProject = projectManager.projects[otherProjectName];
            if (otherProject instanceof SpaceshipProject && otherProjectName !== this.name) {
                otherProject.autoAssignSpaceships = false;
                if (projectElements[otherProjectName] && projectElements[otherProjectName].autoAssignCheckbox) {
                    projectElements[otherProjectName].autoAssignCheckbox.checked = false;
                }
            }
        });
      } else {
        this.autoAssignSpaceships = false;
      }
    });
  
    const autoAssignLabel = document.createElement('label');
    autoAssignLabel.htmlFor = `${this.name}-auto-assign-spaceships`;
    autoAssignLabel.textContent = 'Auto assign';
  
    autoAssignCheckboxContainer.appendChild(autoAssignCheckbox);
    autoAssignCheckboxContainer.appendChild(autoAssignLabel);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      autoAssignCheckbox,
      autoAssignCheckboxContainer,
    };
  
    return autoAssignCheckboxContainer;
  }

  renderUI(container) {
    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      const topSection = document.createElement('div');
      topSection.classList.add('project-top-section');
      this.createSpaceshipAssignmentUI(topSection);
      this.createProjectDetailsGridUI(topSection);
      container.appendChild(topSection);
  
      this.updateCostAndGains(projectElements[this.name]);
    }
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    if (elements.autoAssignCheckbox) {
      elements.autoAssignCheckbox.checked = this.autoAssignSpaceships || false;
    }
    if (elements.assignedSpaceshipsDisplay) {
        elements.assignedSpaceshipsDisplay.textContent = formatBigInteger(this.assignedSpaceships);
    }
    if (elements.availableSpaceshipsDisplay) {
        elements.availableSpaceshipsDisplay.textContent = formatBigInteger(Math.floor(resources.special.spaceships.value));
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
    for (const category in costPerShip) {
      totalCost[category] = { ...costPerShip[category] };
    }
    return totalCost;
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    const totalResourceGain = {};
    const gainPerShip = this.calculateSpaceshipGainPerShip() || {};
    const multiplier = perSecond
      ? this.assignedSpaceships * (1000 / this.getEffectiveDuration())
      : 1;
    for (const category in gainPerShip) {
      totalResourceGain[category] = {};
      for (const resource in gainPerShip[category]) {
        totalResourceGain[category][resource] = gainPerShip[category][resource] * multiplier;
      }
    }
    return totalResourceGain;
  }

  calculateSpaceshipTotalDisposal() {
    const totalDisposal = {};
    const disposalAmount = this.attributes.disposalAmount || 0;
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    const scaledDisposalAmount = disposalAmount * efficiency;
    if (this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      totalDisposal[category] = { [resource]: scaledDisposalAmount };
    }
    return totalDisposal;
  }

  calculateSpaceshipAdjustedDuration() {
    if (!this.attributes.spaceMining && !this.attributes.spaceExport) return this.duration;
    const maxShipsForDurationReduction = 100;
    if (this.isContinuous()) {
      return this.duration;
    }
    const assignedShips = Math.min(Math.max(this.assignedSpaceships, 1), maxShipsForDurationReduction);
    return this.duration / assignedShips;
  }

  canStart() {
    if (!super.canStart()) return false;

    if (this.assignedSpaceships === 0) {
      return false;
    }

    const cost = this.getScaledCost();
    const totalSpaceshipCost = this.calculateSpaceshipTotalCost();

    if (this.isContinuous()) {
      const duration = this.getEffectiveDuration();
      const factor = 1000 / duration;
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
            continue;
          }
          const required = totalSpaceshipCost[category][resource] * this.assignedSpaceships * factor;
          if (resources[category][resource].value < required) {
            return false;
          }
        }
      }

      if (this.attributes.spaceExport && this.selectedDisposalResource) {
        const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
        const disposalPerTick = (this.attributes.disposalAmount || 0) * this.assignedSpaceships * efficiency * factor;
        const { category, resource } = this.selectedDisposalResource;
        let required = disposalPerTick;
        if (this.waitForCapacity) {
          required += (totalSpaceshipCost[category]?.[resource] || 0) * this.assignedSpaceships * factor +
            (cost[category]?.[resource] || 0);
        }
        if (resources[category][resource].value < required) {
          return false;
        }
      }
    } else {
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
            continue;
          }
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
    }

    return true;
  }

  deductResources(resources) {
    super.deductResources(resources);
    if (this.isContinuous()) {
      return;
    }

    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
            continue;
          }
          resources[category][resource].decrease(totalSpaceshipCost[category][resource]);
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const scaledDisposalAmount = this.calculateSpaceshipTotalDisposal();
      const { category, resource } = this.selectedDisposalResource;
      const actualAmount = Math.min(scaledDisposalAmount[category][resource], resources[category][resource].value);
      resources[category][resource].decrease(scaledDisposalAmount[category][resource]);
      this.pendingGain = { colony: { funding: actualAmount * this.attributes.fundingGainAmount } };
    }
  }

  start(resources) {
    const started = super.start(resources);
    if (!started) return false;

    if (this.isContinuous()) {
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
    } else if (this.attributes.spaceMining) {
      let gain = this.calculateSpaceshipTotalResourceGain();
      if (this.applyMetalCostPenalty) {
        this.applyMetalCostPenalty(gain);
      }
      this.pendingGain = gain;
    }

    return true;
  }

  update(deltaTime) {
    const wasActive = this.isActive && !this.isCompleted && !this.isPaused;
    const startRemaining = this.remainingTime;
    const activeTime = wasActive ? Math.min(deltaTime, startRemaining) : 0;
    super.update(deltaTime);
    this.lastActiveTime = this.isContinuous() ? activeTime : 0;
  }

  complete() {
    super.complete();
    if (!this.isContinuous() && this.pendingGain) {
      this.applySpaceshipResourceGain(this.pendingGain, 1);
      this.pendingGain = null;
    }
  }

  applySpaceshipResourceGain(gain, fraction) {
    for (const category in gain) {
      for (const resource in gain[category]) {
        const amount = gain[category][resource] * fraction;
        const res = resources[category]?.[resource];
        if (res && typeof res.increase === 'function') {
          res.increase(amount);
        }
      }
    }
  }

  estimateProjectCostAndGain() {
    if (this.isActive && this.autoStart) {
      const duration = this.getEffectiveDuration();

      if (this.isContinuous()) {
        const factor = 1000 / duration;
        const costPerShip = this.calculateSpaceshipCost();
        for (const category in costPerShip) {
          for (const resource in costPerShip[category]) {
            if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
              continue;
            }
            resources[category][resource].modifyRate(
              -costPerShip[category][resource] * this.assignedSpaceships * factor,
              'Spaceship Cost',
              'project'
            );
          }
        }

        const disposalAmount = this.attributes.disposalAmount || 0;
        const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
        if (disposalAmount && this.selectedDisposalResource) {
          const { category, resource } = this.selectedDisposalResource;
          resources[category][resource].modifyRate(
            -disposalAmount * this.assignedSpaceships * efficiency * factor,
            'Spaceship Export',
            'project'
          );
          if (this.attributes.fundingGainAmount && resources.colony?.funding) {
            resources.colony.funding.modifyRate(
              disposalAmount * this.assignedSpaceships * efficiency * factor * this.attributes.fundingGainAmount,
              'Spaceship Export',
              'project'
            );
          }
        }

        const gainPerShip = this.calculateSpaceshipGainPerShip();
        if (this.applyMetalCostPenalty) {
          const cost = this.calculateSpaceshipCost();
          const metalCost = cost.colony?.metal || 0;
          if (gainPerShip.colony && typeof gainPerShip.colony.metal === 'number') {
            gainPerShip.colony.metal = Math.max(0, gainPerShip.colony.metal - metalCost);
          }
        }
        const label = this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export';
        for (const category in gainPerShip) {
          for (const resource in gainPerShip[category]) {
            resources[category][resource].modifyRate(
              gainPerShip[category][resource] * this.assignedSpaceships * factor,
              label,
              'project'
            );
          }
        }
      } else {
        const rate = 1000 / duration;

        const totalCost = this.calculateSpaceshipTotalCost();
        for (const category in totalCost) {
          for (const resource in totalCost[category]) {
            if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
              continue;
            }
            resources[category][resource].modifyRate(
              -totalCost[category][resource] * rate,
              'Spaceship Cost',
              'project'
            );
          }
        }

        const totalDisposal = this.calculateSpaceshipTotalDisposal();
        for (const category in totalDisposal) {
          for (const resource in totalDisposal[category]) {
            resources[category][resource].modifyRate(
              -totalDisposal[category][resource] * rate,
              'Spaceship Export',
              'project'
            );
          }
        }

        let totalGain = this.calculateSpaceshipTotalResourceGain();
        if (this.applyMetalCostPenalty) {
          this.applyMetalCostPenalty(totalGain);
        }
        const label = this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export';
        for (const category in totalGain) {
          for (const resource in totalGain[category]) {
            resources[category][resource].modifyRate(
              totalGain[category][resource] * rate,
              label,
              'project'
            );
          }
        }
      }
    }
  }

  estimateCostAndGain() {
    this.estimateProjectCostAndGain();
  }

  applyCostAndGain(deltaTime = 1000) {
    if (!this.isContinuous()) return;
    const activeTime = this.lastActiveTime || 0;
    if (activeTime <= 0) return;
    if (typeof this.shouldAutomationDisable === 'function' && this.shouldAutomationDisable()) {
      this.isActive = false;
      this.lastActiveTime = 0;
      return;
    }
    const duration = this.getEffectiveDuration();
    const fraction = activeTime / duration;

    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
          continue;
        }
        const amount = costPerShip[category][resource] * this.assignedSpaceships * fraction;
        const res = resources[category]?.[resource];
        if (!res || res.value < amount) {
          this.isActive = false;
          this.lastActiveTime = 0;
          return;
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
      const disposalAmount = (this.attributes.disposalAmount || 0) * this.assignedSpaceships * efficiency * fraction;
      const { category, resource } = this.selectedDisposalResource;
      const res = resources[category]?.[resource];
      if (!res || res.value < disposalAmount) {
        this.isActive = false;
        this.lastActiveTime = 0;
        return;
      }
    }

    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
          continue;
        }
        const amount = costPerShip[category][resource] * this.assignedSpaceships * fraction;
        const res = resources[category][resource];
        res.decrease(amount);
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
      const disposalAmount = (this.attributes.disposalAmount || 0) * this.assignedSpaceships * efficiency * fraction;
      const { category, resource } = this.selectedDisposalResource;
      const res = resources[category][resource];
      const actual = Math.min(disposalAmount, res.value);
      res.decrease(actual);
      if (this.attributes.fundingGainAmount && resources.colony?.funding) {
        resources.colony.funding.increase(actual * this.attributes.fundingGainAmount);
      }
    }

    const gainPerShip = this.calculateSpaceshipGainPerShip();
    const gain = {};
    for (const category in gainPerShip) {
      gain[category] = {};
      for (const resource in gainPerShip[category]) {
        gain[category][resource] = gainPerShip[category][resource] * this.assignedSpaceships * fraction;
      }
    }
    if (this.applyMetalCostPenalty) {
      const cost = this.calculateSpaceshipCost();
      const metalCost = cost.colony?.metal || 0;
      const penalty = metalCost * this.assignedSpaceships * fraction;
      this.applyMetalCostPenalty(gain, penalty);
    }
    this.applySpaceshipResourceGain(gain, 1);
  }

  saveState() {
    return {
      ...super.saveState(),
      assignedSpaceships: this.assignedSpaceships,
      autoAssignSpaceships: this.autoAssignSpaceships,
      selectedDisposalResource: this.selectedDisposalResource,
      waitForCapacity: this.waitForCapacity,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.assignedSpaceships = state.assignedSpaceships;
    this.autoAssignSpaceships = state.autoAssignSpaceships;
    this.selectedDisposalResource = state.selectedDisposalResource || this.attributes.defaultDisposal;
    if (state.waitForCapacity !== undefined) {
      this.waitForCapacity = state.waitForCapacity;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceshipProject = SpaceshipProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceshipProject;
}
