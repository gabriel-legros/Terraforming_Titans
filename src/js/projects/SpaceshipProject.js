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
    this.shipCapacityMultiplier = 1;
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
        const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
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
    const gainPerShip = {};
    for (const category in resourceGainPerShip) {
      gainPerShip[category] = {};
      for (const resource in resourceGainPerShip[category]) {
        gainPerShip[category][resource] = this.getShipCapacity(resourceGainPerShip[category][resource]);
      }
    }
    return gainPerShip;
  }

  getShipCapacity(baseAmount = this.attributes.disposalAmount || 0) {
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    return baseAmount * efficiency * this.shipCapacityMultiplier;
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
      elements.costPerShipElement.textContent = `Cost per Shipment: ${costPerShipText}`;
    }

    if (elements.totalCostElement && this.assignedSpaceships != null) {
      const perSecond = this.isContinuous();
      const totalCost = this.calculateSpaceshipTotalCost(perSecond);
      elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost, this, perSecond);
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
        const maxShips = typeof this.getMaxAssignableShips === 'function'
          ? this.getMaxAssignableShips()
          : null;
        const assignedText = formatBigInteger(this.assignedSpaceships);
        elements.assignedSpaceshipsDisplay.textContent =
          maxShips != null
            ? `${assignedText}/${formatBigInteger(maxShips)}`
            : assignedText;
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

  calculateSpaceshipTotalCost(perSecond = false) {
    const totalCost = {};
    const costPerShip = this.calculateSpaceshipCost();
    const multiplier = perSecond
      ? this.assignedSpaceships * (1000 / (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration()))
      : 1;
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        totalCost[category][resource] = costPerShip[category][resource] * multiplier;
      }
    }
    return totalCost;
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    const totalResourceGain = {};
    const gainPerShip = this.calculateSpaceshipGainPerShip() || {};
    const multiplier = perSecond
      ? this.assignedSpaceships * (1000 / (this.getShipOperationDuration ? this.getShipOperationDuration() :  this.getEffectiveDuration()))
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
    const scaledDisposalAmount = this.getShipCapacity();
    if (this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      totalDisposal[category] = { [resource]: scaledDisposalAmount };
    }
    return totalDisposal;
  }

  getZonalDisposalDescriptor(category, resource) {
    if (category !== 'surface' || typeof terraforming === 'undefined') {
      return null;
    }

    const mapping = {
      liquidWater: { container: 'zonalWater', key: 'liquid' },
      ice: { container: 'zonalWater', key: 'ice' },
      dryIce: { container: 'zonalCO2', key: 'ice' },
      liquidCO2: { container: 'zonalCO2', key: 'liquid' },
    };

    const descriptor = mapping[resource];
    if (!descriptor) {
      return null;
    }

    const container = terraforming?.[descriptor.container];
    if (!container) {
      return null;
    }

    return { container, key: descriptor.key };
  }

  removeZonalResource(category, resource, amount) {
    if (amount <= 0) {
      return 0;
    }

    const descriptor = this.getZonalDisposalDescriptor(category, resource);
    if (!descriptor) {
      return 0;
    }

    const { container, key } = descriptor;
    const zoneNames =
      (typeof ZONES !== 'undefined' && Array.isArray(ZONES) && ZONES.length > 0)
        ? ZONES
        : Object.keys(container);

    const entries = zoneNames
      .map(zone => ({ zone, amount: container[zone]?.[key] || 0 }))
      .filter(entry => entry.amount > 0);

    if (entries.length === 0) {
      return 0;
    }

    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const actual = Math.min(amount, total);
    if (actual <= 0) {
      return 0;
    }

    let remaining = actual;
    entries.forEach((entry, index) => {
      const zoneData = container[entry.zone];
      if (!zoneData) return;
      const isLast = index === entries.length - 1;
      const proportion = total > 0 ? entry.amount / total : 0;
      let take = isLast ? remaining : actual * proportion;
      take = Math.min(take, zoneData[key], remaining);
      zoneData[key] = Math.max(0, zoneData[key] - take);
      remaining -= take;
    });

    if (remaining > 1e-9) {
      for (const entry of entries) {
        if (remaining <= 0) break;
        const zoneData = container[entry.zone];
        if (!zoneData) continue;
        const available = zoneData[key];
        const take = Math.min(remaining, available);
        zoneData[key] = Math.max(0, available - take);
        remaining -= take;
      }
    }

    return actual;
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

    if (this.isContinuous()) {
      if (this.attributes.spaceExport && this.waitForCapacity && this.selectedDisposalResource) {
        const { category, resource } = this.selectedDisposalResource;
        const perShipCost = this.calculateSpaceshipCost();
        const projectCost = this.getScaledCost();
        const required =
          this.getShipCapacity() +
          (perShipCost[category]?.[resource] || 0) +
          (projectCost[category]?.[resource] || 0);
        if (resources[category][resource].value < required) {
          return false;
        }
      }
    } else {
      const cost = this.getScaledCost();
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
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
    let shortfall = false;
    if (this.isContinuous()) {
      this.shortfallLastTick = shortfall;
      return;
    }

    if (this.attributes.spaceMining || this.attributes.spaceExport) {
      const totalSpaceshipCost = this.calculateSpaceshipTotalCost();
      for (const category in totalSpaceshipCost) {
        for (const resource in totalSpaceshipCost[category]) {
          if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
            continue;
          }
          const required = totalSpaceshipCost[category][resource];
          const available = resources[category][resource].value;
          const spend = Math.min(required, available);
          if (spend < required) {
            shortfall = shortfall || required > 0;
          }
          resources[category][resource].decrease(spend);
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const scaledDisposalAmount = this.calculateSpaceshipTotalDisposal();
      const { category, resource } = this.selectedDisposalResource;
      const required = scaledDisposalAmount[category][resource];
      const available = resources[category][resource].value;
      const actualAmount = Math.min(required, available);
      if (actualAmount < required) {
        shortfall = shortfall || required > 0;
      }
      resources[category][resource].decrease(actualAmount);
      this.removeZonalResource(category, resource, actualAmount);
      this.pendingGain = {
        colony: {
          funding: actualAmount * this.attributes.fundingGainAmount
        }
      };
    }

    this.shortfallLastTick = shortfall;
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

  applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
    for (const category in gain) {
      for (const resource in gain[category]) {
        const amount = gain[category][resource] * fraction * productivity;
        if (accumulatedChanges) {
          if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
          if (accumulatedChanges[category][resource] === undefined) {
            accumulatedChanges[category][resource] = 0;
          }
          accumulatedChanges[category][resource] += amount;
        } else {
          const res = resources[category]?.[resource];
          if (res && typeof res.increase === 'function') {
            res.increase(amount);
          }
        }
      }
    }
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (this.isActive) {
      const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());

      if (this.isContinuous()) {
        const factor = 1000 / duration;
        const fraction = deltaTime / duration;
        if (fraction > 0) {
          const costPerShip = this.calculateSpaceshipCost();
          for (const category in costPerShip) {
            if (!totals.cost[category]) totals.cost[category] = {};
            for (const resource in costPerShip[category]) {
              if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
                continue;
              }
              const rateValue = costPerShip[category][resource] * this.assignedSpaceships * factor * (applyRates ? productivity : 1);
              if (applyRates) {
                resources[category][resource].modifyRate(
                  -rateValue,
                  'Spaceship Cost',
                  'project'
                );
              }
              totals.cost[category][resource] =
                (totals.cost[category][resource] || 0) + costPerShip[category][resource] * this.assignedSpaceships * fraction;
            }
          }

          const capacity = this.getShipCapacity();
          if (capacity && this.selectedDisposalResource) {
            const { category, resource } = this.selectedDisposalResource;
            const rateValue = capacity * this.assignedSpaceships * factor * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                'Spaceship Export',
                'project'
              );
            }
            if (!totals.cost[category]) totals.cost[category] = {};
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + capacity * this.assignedSpaceships * fraction;
            if (this.attributes.fundingGainAmount && resources.colony?.funding) {
              const fundingRate = capacity * this.assignedSpaceships * factor * this.attributes.fundingGainAmount * (applyRates ? productivity : 1);
              if (applyRates) {
                resources.colony.funding.modifyRate(
                  fundingRate,
                  'Spaceship Export',
                  'project'
                );
              }
              if (!totals.gain.colony) totals.gain.colony = {};
              totals.gain.colony.funding =
                (totals.gain.colony.funding || 0) +
                capacity * this.assignedSpaceships * fraction * this.attributes.fundingGainAmount;
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
            if (!totals.gain[category]) totals.gain[category] = {};
            for (const resource in gainPerShip[category]) {
              const rateValue = gainPerShip[category][resource] * this.assignedSpaceships * factor * (applyRates ? productivity : 1);
              if (applyRates) {
                resources[category][resource].modifyRate(
                  rateValue,
                  label,
                  'project'
                );
              }
              totals.gain[category][resource] =
                (totals.gain[category][resource] || 0) + gainPerShip[category][resource] * this.assignedSpaceships * fraction;
            }
          }
        }
      } else {
        const rate = 1000 / duration;
        const fraction = deltaTime / duration;

        const totalCost = this.calculateSpaceshipTotalCost();
        for (const category in totalCost) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in totalCost[category]) {
            if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
              continue;
            }
            const rateValue = totalCost[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                'Spaceship Cost',
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + totalCost[category][resource] * fraction;
          }
        }

        const totalDisposal = this.calculateSpaceshipTotalDisposal();
        for (const category in totalDisposal) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in totalDisposal[category]) {
            const rateValue = totalDisposal[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                'Spaceship Export',
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + totalDisposal[category][resource] * fraction;
          }
        }

        let totalGain = this.calculateSpaceshipTotalResourceGain();
        if (this.applyMetalCostPenalty) {
          this.applyMetalCostPenalty(totalGain);
        }
        const label = this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export';
        for (const category in totalGain) {
          if (!totals.gain[category]) totals.gain[category] = {};
          for (const resource in totalGain[category]) {
            const rateValue = totalGain[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                rateValue,
                label,
                'project'
              );
            }
            totals.gain[category][resource] =
              (totals.gain[category][resource] || 0) + totalGain[category][resource] * fraction;
          }
        }
      }
    }
    return totals;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    return this.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;
    this.shortfallLastTick = false;
    if (typeof this.shouldAutomationDisable === 'function' && this.shouldAutomationDisable()) {
      this.isActive = false;
      return;
    }
    const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
    const fraction = deltaTime / duration;

    let shortfall = false;
    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
          continue;
        }
        const amount = costPerShip[category][resource] * this.assignedSpaceships * fraction * productivity;
        const available = resources[category]?.[resource]?.value || 0;
        if (available < amount) {
          shortfall = shortfall || amount > 0;
        }
        if (accumulatedChanges) {
          accumulatedChanges[category][resource] -= amount;
        } else {
          const res = resources[category]?.[resource];
          if (res && typeof res.decrease === 'function') {
            res.decrease(amount);
          }
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const capacity = this.getShipCapacity();
      const requestedAmount = capacity * this.assignedSpaceships * fraction * productivity;
      const { category, resource } = this.selectedDisposalResource;
      let actualDisposal = 0;
      if (accumulatedChanges) {
        if (!accumulatedChanges[category]) {
          accumulatedChanges[category] = {};
        }
        const existingChange = accumulatedChanges[category][resource] || 0;
        const currentValue = resources[category]?.[resource]?.value || 0;
        const effectiveAvailable = Math.max(0, currentValue + existingChange);
        actualDisposal = Math.min(requestedAmount, effectiveAvailable);
        accumulatedChanges[category][resource] = existingChange - actualDisposal;
        if (
          this.attributes.fundingGainAmount &&
          accumulatedChanges.colony &&
          accumulatedChanges.colony.funding !== undefined
        ) {
          accumulatedChanges.colony.funding += actualDisposal * this.attributes.fundingGainAmount;
        }
      } else {
        const res = resources[category]?.[resource];
        if (res && typeof res.decrease === 'function') {
          const before = res.value;
          res.decrease(requestedAmount);
          actualDisposal = before - res.value;
        }
        if (this.attributes.fundingGainAmount && resources.colony?.funding) {
          resources.colony.funding.increase(actualDisposal * this.attributes.fundingGainAmount);
        }
      }
      if (actualDisposal < requestedAmount) {
        shortfall = shortfall || requestedAmount > 0;
      }
      this.removeZonalResource(category, resource, actualDisposal);
    }

    const gainPerShip = this.calculateSpaceshipGainPerShip();
    const gain = {};
    for (const category in gainPerShip) {
      gain[category] = {};
      for (const resource in gainPerShip[category]) {
        gain[category][resource] = gainPerShip[category][resource] * this.assignedSpaceships;
      }
    }
    if (this.applyMetalCostPenalty) {
      const cost = this.calculateSpaceshipCost();
      const metalCost = cost.colony?.metal || 0;
      const penalty = metalCost * this.assignedSpaceships;
      this.applyMetalCostPenalty(gain, penalty);
    }
    this.applySpaceshipResourceGain(gain, fraction, accumulatedChanges, productivity);

    this.shortfallLastTick = shortfall;
    this.lastActiveTime = 0;
  }

  saveState() {
    return {
      ...super.saveState(),
      assignedSpaceships: this.assignedSpaceships,
      autoAssignSpaceships: this.autoAssignSpaceships,
      selectedDisposalResource: this.selectedDisposalResource,
      waitForCapacity: this.waitForCapacity,
      assignmentMultiplier: this.assignmentMultiplier,
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
    if (state.assignmentMultiplier !== undefined) {
      this.assignmentMultiplier = state.assignmentMultiplier;
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceshipProject = SpaceshipProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceshipProject;
}
