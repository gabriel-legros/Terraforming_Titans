const KESSLER_SHIP_DEBRIS_TONS = 3000;

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
    this.kesslerShipRollElapsed = 0;
    this.kesslerShipRollPending = false;
    this.kesslerShipCostSnapshot = null;
    this.kesslerShipLossCarry = 0;
    this.costShortfallLastTick = false;
    this.disposalShortfallLastTick = false;
    this.continuousExecutionPlanCache = null;
  }

  getActiveShipCount() {
    return this.assignedSpaceships ?? 0;
  }

  isBlockedByPulsarStorm() {
    try {
      return hazardManager.parameters.pulsar && hazardManager.pulsarHazard && hazardManager.pulsarHazard.isStormActive();
    } catch (error) {
      return false;
    }
  }

  isTemporarilyPaused() {
    return this.isBlockedByPulsarStorm();
  }

  getAutomationShipCount() {
    return this.getActiveShipCount();
  }

  isAutomationManuallyDisabled() {
    return this.autoStart === false || this.run === false;
  }

  isContinuous() {
    return this.getActiveShipCount() > 100;
  }

  getKesslerSuccessChance() {
    try {
      return hazardManager.kesslerHazard.getSuccessChance(true);
    } catch (error) {
      return 1;
    }
  }

  getKesslerFailureChance() {
    return 1 - this.getKesslerSuccessChance();
  }

  _checkKesslerFailure() {
    return false;
  }

  getKesslerShipDebrisPerShip() {
    const override = hazardManager?.parameters?.kessler?.shipDebrisPerShip;
    return override > 0 ? override : KESSLER_SHIP_DEBRIS_TONS;
  }

  getNonEnergyCostTotal(cost) {
    let total = 0;
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resource === 'energy') {
          continue;
        }
        total += cost[category][resource];
      }
    }
    return total;
  }

  addKesslerDebris(amount) {
    if (amount <= 0) {
      return;
    }
    try {
      hazardManager.kesslerHazard.addDebris(amount);
    } catch (error) {
      // no-op
    }
  }

  reportKesslerDebrisRate(amount, seconds, sourceName) {
    const rate = amount / seconds;
    try {
      const source = sourceName || this.displayName || this.name;
      resources.special.orbitalDebris.modifyRate(rate, source, 'project');
    } catch (error) {
      // no-op
    }
  }

  applyContinuousKesslerDebris(nonEnergyCost, shipLoss, seconds, sourceName) {
    const failureDebris = nonEnergyCost * 0.5;
    if (failureDebris > 0) {
      this.addKesslerDebris(failureDebris);
      this.reportKesslerDebrisRate(failureDebris, seconds, sourceName);
    }
    if (shipLoss > 0) {
      const shipDebris = shipLoss * this.getKesslerShipDebrisPerShip();
      this.addKesslerDebris(shipDebris);
      this.reportKesslerDebrisRate(shipDebris, seconds, sourceName);
      this.applyKesslerShipLoss(shipLoss);
    }
  }

  loseAssignedShips(count) {
    const loss = Math.min(Math.max(count, 0), this.assignedSpaceships);
    if (!loss) {
      return 0;
    }
    const wasContinuous = this.isContinuous();
    this.assignedSpaceships -= loss;
    if (this.assignedSpaceships < 0) {
      this.assignedSpaceships = 0;
    }
    this.finalizeAssignmentChange(wasContinuous);
    try {
      updateProjectUI(this.name);
    } catch (error) {
      // no-op
    }
    return loss;
  }

  applyKesslerShipLoss(lossCount) {
    if (lossCount <= 0) {
      return 0;
    }
    this.kesslerShipLossCarry += lossCount;
    const wholeLoss = Math.floor(this.kesslerShipLossCarry);
    if (wholeLoss <= 0) {
      return 0;
    }
    this.kesslerShipLossCarry -= wholeLoss;
    return this.loseAssignedShips(wholeLoss);
  }

  resetKesslerShipRoll() {
    this.kesslerShipRollElapsed = 0;
    this.kesslerShipRollPending = false;
    this.kesslerShipCostSnapshot = null;
  }

  applyKesslerShipFailure() {
    const cost = this.kesslerShipCostSnapshot || this.calculateSpaceshipTotalCost();
    const debris = this.getNonEnergyCostTotal(cost) * 0.5 + this.getKesslerShipDebrisPerShip();
    this.addKesslerDebris(debris);
    this.loseAssignedShips(1);
    this.pendingGain = null;
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.resetKesslerShipRoll();
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
  }

  checkKesslerShipFailure(activeTime, startRemaining) {
    if (this.isContinuous()) {
      this.resetKesslerShipRoll();
      return false;
    }
    if (!this.kesslerShipRollPending) {
      return false;
    }
    this.kesslerShipRollElapsed += activeTime;
    if (this.kesslerShipRollElapsed < 1000 && startRemaining > activeTime) {
      return false;
    }
    this.kesslerShipRollPending = false;
    if (Math.random() > this.getKesslerSuccessChance()) {
      this.applyKesslerShipFailure();
      return true;
    }
    this.kesslerShipCostSnapshot = null;
    return false;
  }

  disableAutoAssignSpaceships() {
    if (!this.autoAssignSpaceships) return;
    this.autoAssignSpaceships = false;
    const elements = projectElements[this.name];
    if (elements && elements.autoAssignCheckbox) {
      elements.autoAssignCheckbox.checked = false;
    }
  }

  getExportRateLabel(baseLabel) {
    return baseLabel;
  }

  getCostRateLabel() {
    return 'Spaceship Cost';
  }

  assignSpaceships(count) {
    if (!count) return;

    this.assignedSpaceships = this.assignedSpaceships || 0;
    const wasContinuous = this.isContinuous();

    if (count > 0) {
      let applied = this.applySpaceshipDelta(count);
      let remaining = count - applied;

      if (remaining > 0) {
        const autoProject = SpaceshipProject.getAutoAssignProject(this.name);
        if (autoProject && autoProject !== this) {
          const autoWasContinuous = autoProject.isContinuous();
          const freed = -autoProject.applySpaceshipDelta(-remaining);
          if (freed > 0) {
            autoProject.finalizeAssignmentChange(autoWasContinuous);
            const assignedFromFreed = this.applySpaceshipDelta(freed);
            remaining -= assignedFromFreed;
            applied += assignedFromFreed;
          }
        }
      }
    } else {
      this.applySpaceshipDelta(count);
    }

    this.finalizeAssignmentChange(wasContinuous);
  }

  applySpaceshipDelta(delta) {
    if (!delta) return 0;

    this.assignedSpaceships = this.assignedSpaceships || 0;
    let applied = delta;

    if (delta > 0) {
      const availableSpaceships = Math.floor(resources.special.spaceships.value);
      if (availableSpaceships <= 0) {
        return 0;
      }
      applied = Math.min(delta, availableSpaceships);
    } else if (delta < 0) {
      if (this.assignedSpaceships <= 0) {
        return 0;
      }
      applied = -Math.min(-delta, this.assignedSpaceships);
    }

    if (!applied) {
      return 0;
    }

    this.assignedSpaceships += applied;
    resources.special.spaceships.value -= applied;
    return applied;
  }

  finalizeAssignmentChange(wasContinuous) {
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
        const efficiencyMultiplier = resource === 'energy' ? shipEfficiency : 1;
        let adjustedCost = baseCost * multiplier * efficiencyMultiplier;
        if (resource === 'energy') {
          const perTonCost = this.getEffectiveSpaceshipCostPerTon(category, resource);
          if (perTonCost > 0) {
            adjustedCost += perTonCost * this.getSpaceshipEnergyCostTonnage();
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

  getSpaceshipEnergyCostTonnage() {
    if (this.attributes.spaceExport) {
      return this.getShipCapacity(this.attributes.disposalAmount);
    }
    if (this.attributes.spaceMining) {
      const gains = this.attributes.resourceGainPerShip || {};
      let total = 0;
      for (const category in gains) {
        for (const resource in gains[category]) {
          total += this.getShipCapacity(gains[category][resource]);
        }
      }
      return total;
    }
    return 0;
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
    const assignmentButtons = [];
  
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
      assignmentButtons.push(button);
      return button;
    };
  
    const mainButtons = document.createElement('div');
    mainButtons.classList.add('main-buttons');
    buttonsContainer.appendChild(mainButtons);
  
    createButton('0', () => {
      this.assignSpaceships(-this.assignedSpaceships);
      this.disableAutoAssignSpaceships();
    }, mainButtons);
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
  
    const autoAssignContainer = this.createAutoAssignSpaceshipsCheckbox(assignmentButtons, assignmentContainer);
  
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

  createAutoAssignSpaceshipsCheckbox(assignmentButtons = null, assignmentContainer = null) {
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
      SpaceshipProject.refreshAutoAssignDisplays();
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
      assignmentButtons,
      assignmentContainer,
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
    if (elements.assignedSpaceshipsDisplay && !elements.isImportProject) {
        const maxShips = typeof this.getMaxAssignableShips === 'function'
          ? this.getMaxAssignableShips()
          : null;
        const assignedText = formatNumber(this.assignedSpaceships, true);
        elements.assignedSpaceshipsDisplay.textContent =
          maxShips != null
            ? `${assignedText}/${formatNumber(maxShips, true)}`
            : assignedText;
    }
    if (elements.availableSpaceshipsDisplay) {
        elements.availableSpaceshipsDisplay.textContent = formatNumber(Math.floor(resources.special.spaceships.value), true);
    }
    this.updateCostAndGains(elements);
    this.updateAutoAssignUI(elements);
  }

  autoAssign() {
    if (!this.autoAssignSpaceships) return;
    const availableSpaceships = Math.floor(resources.special.spaceships.value);
    if (availableSpaceships > 0) {
      this.assignSpaceships(availableSpaceships);
    }
  }

  updateAutoAssignUI(elements) {
    const cachedElements = globalThis.projectElements;
    const targetElements = elements || (cachedElements ? cachedElements[this.name] : undefined);

    if (!targetElements) {
      return;
    }

    if (targetElements.autoAssignCheckbox) {
      targetElements.autoAssignCheckbox.checked = this.autoAssignSpaceships || false;
    }
  }

  static resolveProjectManager() {
    let manager = globalThis.projectManager || null;
    if (!manager) {
      try {
        if (projectManager) {
          manager = projectManager;
        }
      } catch (error) {
        manager = null;
      }
    }
    return manager;
  }

  static getAutoAssignProject(excludeName = null) {
    const manager = SpaceshipProject.resolveProjectManager();
    if (!manager || !manager.projects) {
      return null;
    }

    const projects = Object.values(manager.projects);
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      if (
        project instanceof SpaceshipProject &&
        project.autoAssignSpaceships &&
        project.name !== excludeName
      ) {
        return project;
      }
    }

    return null;
  }

  static refreshAutoAssignDisplays() {
    const manager = SpaceshipProject.resolveProjectManager();
    if (!manager || !manager.projects) {
      return;
    }

    const elements = globalThis.projectElements || {};
    const projects = Object.values(manager.projects);
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      if (project instanceof SpaceshipProject) {
        project.updateAutoAssignUI(elements[project.name]);
      }
    }
  }

  calculateSpaceshipTotalCost(perSecond = false) {
    const totalCost = {};
    const costPerShip = this.calculateSpaceshipCost();
    const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
    const activeShips = this.getActiveShipCount();
    const multiplier = perSecond
      ? activeShips * (1000 / duration)
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
    const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
    const activeShips = this.getActiveShipCount();
    const multiplier = perSecond
      ? activeShips * (1000 / duration)
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

  getClampedDisposalAmount(requestedAmount, category, resource, availableAmount) {
    return Math.max(0, Math.min(requestedAmount, availableAmount));
  }

  getZonalDisposalDescriptor(category, resource) {
    if (category !== 'surface' || typeof terraforming === 'undefined') {
      return null;
    }

    const mapping = {
      liquidWater: { container: 'zonalSurface', key: 'liquidWater' },
      ice: { container: 'zonalSurface', key: 'ice' },
      dryIce: { container: 'zonalSurface', key: 'dryIce' },
      liquidCO2: { container: 'zonalSurface', key: 'liquidCO2' },
      liquidMethane: { container: 'zonalSurface', key: 'liquidMethane' },
      hydrocarbonIce: { container: 'zonalSurface', key: 'hydrocarbonIce' },
      liquidAmmonia: { container: 'zonalSurface', key: 'liquidAmmonia' },
      ammoniaIce: { container: 'zonalSurface', key: 'ammoniaIce' },
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
    const zoneNames = getZones();

    const entries = zoneNames.map(zone => ({
      zone,
      amount: container[zone]?.[key] || 0,
      weight: getZonePercentage(zone),
    }));

    const totalAvailable = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const actual = Math.min(amount, totalAvailable);
    if (actual <= 0) {
      return 0;
    }

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    const weightTotal = totalWeight > 0 ? totalWeight : entries.length;
    let remaining = actual;

    entries.forEach(entry => {
      const weight = totalWeight > 0 ? entry.weight : 1;
      const target = actual * (weight / weightTotal);
      const take = Math.min(target, entry.amount);
      entry.take = take;
      entry.remaining = entry.amount - take;
      remaining -= take;
    });

    if (remaining > 1e-9) {
      const remainingEntries = entries.filter(entry => entry.remaining > 0);
      const remainingWeightTotal = totalWeight > 0
        ? remainingEntries.reduce((sum, entry) => sum + entry.weight, 0)
        : remainingEntries.length;
      const fallbackWeightTotal = remainingWeightTotal > 0 ? remainingWeightTotal : remainingEntries.length;
      remainingEntries.forEach((entry, index) => {
        const isLast = index === remainingEntries.length - 1;
        const weight = totalWeight > 0 ? entry.weight : 1;
        let take = isLast ? remaining : remaining * (weight / fallbackWeightTotal);
        take = Math.min(take, entry.remaining, remaining);
        entry.take += take;
        remaining -= take;
      });
    }

    entries.forEach(entry => {
      const zoneData = container[entry.zone];
      zoneData[key] = Math.max(0, zoneData[key] - (entry.take || 0));
    });

    return actual;
  }

  calculateSpaceshipAdjustedDuration() {
    if (!this.attributes.spaceMining && !this.attributes.spaceExport) return this.duration;
    const maxShipsForDurationReduction = 100;
    if (this.isContinuous()) {
      return this.duration;
    }
    const activeShips = Math.min(Math.max(this.getActiveShipCount(), 1), maxShipsForDurationReduction);
    return this.duration / activeShips;
  }

  canStart() {
    if (!super.canStart()) return false;
    if (this.isBlockedByPulsarStorm()) return false;

    if (this.getActiveShipCount() === 0) {
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
    let costShortfall = false;
    let disposalShortfall = false;
    if (this.isContinuous()) {
      this.shortfallLastTick = shortfall;
      this.costShortfallLastTick = false;
      this.disposalShortfallLastTick = false;
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
            costShortfall = costShortfall || required > 0;
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
      const actualAmount = this.getClampedDisposalAmount(required, category, resource, available);
      if (actualAmount < required) {
        shortfall = shortfall || required > 0;
        disposalShortfall = disposalShortfall || required > 0;
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
    this.costShortfallLastTick = costShortfall;
    this.disposalShortfallLastTick = disposalShortfall;
  }

  start(resources) {
    const started = super.start(resources);
    if (!started) return false;

    this.kesslerRollPending = false;
    this.kesslerRollElapsed = 0;
    this.kesslerStartCost = null;

    if (this.isContinuous()) {
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      this.resetKesslerShipRoll();
    } else if (this.attributes.spaceMining) {
      let gain = this.calculateSpaceshipTotalResourceGain();
      if (this.applyMetalCostPenalty) {
        this.applyMetalCostPenalty(gain);
      }
      this.pendingGain = gain;
      this.kesslerShipRollElapsed = 0;
      this.kesslerShipRollPending = true;
      this.kesslerShipCostSnapshot = this.calculateSpaceshipTotalCost();
    } else {
      this.kesslerShipRollElapsed = 0;
      this.kesslerShipRollPending = true;
      this.kesslerShipCostSnapshot = this.calculateSpaceshipTotalCost();
    }

    return true;
  }

  update(deltaTime) {
    if (this.isBlockedByPulsarStorm()) {
      this.lastActiveTime = 0;
      return;
    }
    const wasActive = this.isActive && !this.isCompleted && !this.isPaused;
    const startRemaining = this.remainingTime;
    const activeTime = wasActive ? Math.min(deltaTime, startRemaining) : 0;
    if (wasActive && this.checkKesslerShipFailure(activeTime, startRemaining)) {
      this.lastActiveTime = 0;
      return;
    }
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

  addAmountToResourceMap(target, category, resource, amount) {
    if (amount <= 0) {
      return;
    }
    if (!target[category]) {
      target[category] = {};
    }
    target[category][resource] = (target[category][resource] || 0) + amount;
  }

  addScaledResourceMap(target, source, scale = 1) {
    if (!source || scale <= 0) {
      return;
    }
    for (const category in source) {
      for (const resource in source[category]) {
        this.addAmountToResourceMap(
          target,
          category,
          resource,
          source[category][resource] * scale
        );
      }
    }
  }

  getEffectiveAvailableAmount(category, resource, accumulatedChanges = null) {
    const current = resources[category]?.[resource]?.value || 0;
    const pending = accumulatedChanges?.[category]?.[resource] || 0;
    return Math.max(0, current + pending);
  }

  getContinuousOperationContext(deltaTime = 1000, productivity = 1) {
    const duration = this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration();
    const fraction = duration > 0 ? deltaTime / duration : 0;
    const shipCount = this.getActiveShipCount();
    const totalTransportCount = shipCount;
    const auxiliaryCount = 0;
    const successChance = shipCount > 0 ? this.getKesslerSuccessChance() : 1;
    const failureChance = shipCount > 0 ? (1 - successChance) : 0;
    return {
      deltaTime,
      duration,
      fraction,
      seconds: deltaTime / 1000,
      productivity,
      shipCount,
      auxiliaryCount,
      totalTransportCount,
      successChance,
      failureChance,
    };
  }

  getContinuousCostCountForResource(category, resource, context) {
    return context.shipCount;
  }

  getContinuousGainCount(context) {
    return context.shipCount;
  }

  getContinuousDisposalCount(context) {
    return context.totalTransportCount;
  }

  getContinuousFundingCount(context) {
    return context.shipCount * context.successChance;
  }

  getContinuousShipLossCount(context) {
    return context.shipCount;
  }

  getContinuousGainScaleLimit(context, gainBase, accumulatedChanges = null, productivity = 1) {
    return 1;
  }

  buildContinuousExecutionPlan(deltaTime = 1000, productivity = 1, accumulatedChanges = null) {
    const empty = {
      context: null,
      ratio: 0,
      shortfall: false,
      costShortfall: false,
      disposalShortfall: false,
      cost: {},
      resourceGain: {},
      totalCost: {},
      totalGain: {},
      gainBase: {},
      gainFraction: 0,
      failedGainFraction: 0,
      fundingGain: 0,
      nonEnergyCost: 0,
      appliedDisposal: 0,
      disposalData: null,
      shipLoss: 0,
      hasContinuousWork: false,
      costRateLabel: this.getCostRateLabel(),
      gainRateLabel: this.getExportRateLabel(this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export'),
      exportRateLabel: this.getExportRateLabel('Spaceship Export'),
    };

    if (!this.isContinuous() || !this.isActive || this.isBlockedByPulsarStorm()) {
      return empty;
    }

    const context = this.getContinuousOperationContext(deltaTime, productivity);
    if (context.fraction <= 0 || context.totalTransportCount <= 0) {
      empty.context = context;
      return empty;
    }

    const potentialCost = {};
    let potentialNonEnergyCost = 0;
    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
          continue;
        }
        const count = this.getContinuousCostCountForResource(category, resource, context);
        const amount = costPerShip[category][resource] * count * context.fraction * productivity;
        if (amount <= 0) {
          continue;
        }
        this.addAmountToResourceMap(potentialCost, category, resource, amount);
        if (resource !== 'energy') {
          potentialNonEnergyCost += amount;
        }
      }
    }

    let disposalData = null;
    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const disposalCount = this.getContinuousDisposalCount(context);
      const requestedAmount = this.getShipCapacity() * disposalCount * context.fraction * productivity;
      if (requestedAmount > 0) {
        disposalData = {
          category: this.selectedDisposalResource.category,
          resource: this.selectedDisposalResource.resource,
          requestedAmount,
        };
      }
    }

    const gainBase = {};
    const gainPerShip = this.calculateSpaceshipGainPerShip() || {};
    const gainCount = this.getContinuousGainCount(context);
    for (const category in gainPerShip) {
      for (const resource in gainPerShip[category]) {
        const amount = gainPerShip[category][resource] * gainCount;
        if (amount > 0) {
          this.addAmountToResourceMap(gainBase, category, resource, amount);
        }
      }
    }
    if (this.applyMetalCostPenalty) {
      const metalPenalty = (costPerShip.colony?.metal || 0) * gainCount;
      this.applyMetalCostPenalty(gainBase, metalPenalty);
    }

    const gainScaleLimit = Math.max(
      0,
      Math.min(
        1,
        this.getContinuousGainScaleLimit(context, gainBase, accumulatedChanges, productivity)
      )
    );

    let costRatio = 1;
    let costShortfall = false;
    let disposalRatio = 1;
    let disposalShortfall = false;

    const sharedDisposalCategory = disposalData?.category;
    const sharedDisposalResource = disposalData?.resource;
    const sharedCostNeed = sharedDisposalCategory && sharedDisposalResource
      ? (potentialCost[sharedDisposalCategory]?.[sharedDisposalResource] || 0)
      : 0;

    for (const category in potentialCost) {
      for (const resource in potentialCost[category]) {
        const required = potentialCost[category][resource];
        if (required <= 0) {
          continue;
        }
        if (category === sharedDisposalCategory && resource === sharedDisposalResource) {
          continue;
        }
        const available = this.getEffectiveAvailableAmount(category, resource, accumulatedChanges);
        const ratio = Math.max(0, Math.min(1, available / required));
        costRatio = Math.min(costRatio, ratio);
        if (available + 1e-9 < required) {
          costShortfall = true;
        }
      }
    }

    if (disposalData && disposalData.requestedAmount > 0) {
      const available = this.getEffectiveAvailableAmount(
        disposalData.category,
        disposalData.resource,
        accumulatedChanges
      );
      const combinedPotential = disposalData.requestedAmount + sharedCostNeed;
      const combinedNeeded = this.getClampedDisposalAmount(
        combinedPotential,
        disposalData.category,
        disposalData.resource,
        available
      );
      const ratio = combinedPotential > 0
        ? Math.max(0, Math.min(1, combinedNeeded / combinedPotential))
        : 1;
      disposalRatio = Math.min(disposalRatio, ratio);
      if (combinedNeeded + 1e-9 < combinedPotential) {
        disposalShortfall = true;
      }
    }

    const ratio = Math.max(0, Math.min(1, Math.min(costRatio, disposalRatio, gainScaleLimit)));

    const cost = {};
    const totalCost = {};
    this.addScaledResourceMap(cost, potentialCost, ratio);
    this.addScaledResourceMap(totalCost, cost, 1);
    const nonEnergyCost = potentialNonEnergyCost * ratio;

    let appliedDisposal = 0;
    if (disposalData) {
      appliedDisposal = disposalData.requestedAmount * ratio;
      this.addAmountToResourceMap(totalCost, disposalData.category, disposalData.resource, appliedDisposal);
    }

    const gainFraction = context.fraction * context.successChance * ratio;
    const failedGainFraction = context.fraction * context.failureChance * ratio;
    const resourceGain = {};
    this.addScaledResourceMap(resourceGain, gainBase, gainFraction * productivity);

    let fundingGain = 0;
    if (disposalData && this.attributes.fundingGainAmount > 0) {
      const disposalCount = this.getContinuousDisposalCount(context);
      const fundingCount = this.getContinuousFundingCount(context);
      const multiplier = disposalCount > 0 ? (fundingCount / disposalCount) : 0;
      fundingGain = appliedDisposal * this.attributes.fundingGainAmount * multiplier;
    }

    const totalGain = {};
    this.addScaledResourceMap(totalGain, resourceGain, 1);
    if (fundingGain > 0) {
      this.addAmountToResourceMap(totalGain, 'colony', 'funding', fundingGain);
    }

    const shipLoss = this.getContinuousShipLossCount(context) *
      context.fraction *
      productivity *
      context.failureChance *
      ratio;

    return {
      context,
      ratio,
      shortfall: ratio < (1 - 1e-9) || gainScaleLimit < (1 - 1e-9),
      costShortfall,
      disposalShortfall,
      cost,
      resourceGain,
      totalCost,
      totalGain,
      gainBase,
      gainFraction,
      failedGainFraction,
      fundingGain,
      nonEnergyCost,
      appliedDisposal,
      disposalData,
      shipLoss,
      hasContinuousWork: true,
      costRateLabel: this.getCostRateLabel(),
      gainRateLabel: this.getExportRateLabel(this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export'),
      exportRateLabel: this.getExportRateLabel('Spaceship Export'),
    };
  }

  getContinuousExecutionPlan(deltaTime = 1000, productivity = 1, accumulatedChanges = null) {
    const cache = this.continuousExecutionPlanCache;
    const cacheSelectionKey = cache?.selection
      ? `${cache.selection.category}:${cache.selection.resource}`
      : '';
    const currentSelectionKey = this.selectedDisposalResource
      ? `${this.selectedDisposalResource.category}:${this.selectedDisposalResource.resource}`
      : '';
    if (
      cache &&
      cache.deltaTime === deltaTime &&
      cache.productivity === productivity &&
      cache.accumulatedChanges === accumulatedChanges &&
      cache.isActive === this.isActive &&
      cache.isContinuous === this.isContinuous() &&
      cache.shipCount === this.getActiveShipCount() &&
      cacheSelectionKey === currentSelectionKey
    ) {
      return cache.plan;
    }

    const plan = this.buildContinuousExecutionPlan(deltaTime, productivity, accumulatedChanges);
    this.continuousExecutionPlanCache = {
      deltaTime,
      productivity,
      accumulatedChanges,
      isActive: this.isActive,
      isContinuous: this.isContinuous(),
      shipCount: this.getActiveShipCount(),
      selection: this.selectedDisposalResource
        ? {
            category: this.selectedDisposalResource.category,
            resource: this.selectedDisposalResource.resource,
          }
        : null,
      plan,
    };
    return plan;
  }

  clearContinuousExecutionPlanCache() {
    this.continuousExecutionPlanCache = null;
  }

  applyContinuousPlanRates(plan, applyRates = true) {
    if (!applyRates || !plan.context || plan.context.deltaTime <= 0) {
      return;
    }
    const rateFactor = 1000 / plan.context.deltaTime;

    for (const category in plan.cost) {
      for (const resource in plan.cost[category]) {
        const amount = plan.cost[category][resource];
        if (amount <= 0) {
          continue;
        }
        resources[category][resource].modifyRate(-amount * rateFactor, plan.costRateLabel, 'project');
      }
    }

    if (plan.disposalData && plan.appliedDisposal > 0) {
      resources[plan.disposalData.category][plan.disposalData.resource].modifyRate(
        -plan.appliedDisposal * rateFactor,
        plan.exportRateLabel,
        'project'
      );
    }

    for (const category in plan.resourceGain) {
      for (const resource in plan.resourceGain[category]) {
        const amount = plan.resourceGain[category][resource];
        if (amount <= 0) {
          continue;
        }
        resources[category][resource].modifyRate(amount * rateFactor, plan.gainRateLabel, 'project');
      }
    }

    if (plan.fundingGain > 0) {
      resources.colony.funding.modifyRate(plan.fundingGain * rateFactor, plan.exportRateLabel, 'project');
    }
  }

  applyContinuousPlan(plan, accumulatedChanges = null) {
    if (!plan.context || !plan.hasContinuousWork) {
      return;
    }

    for (const category in plan.cost) {
      for (const resource in plan.cost[category]) {
        const amount = plan.cost[category][resource];
        if (amount <= 0) {
          continue;
        }
        if (accumulatedChanges) {
          if (!accumulatedChanges[category]) {
            accumulatedChanges[category] = {};
          }
          if (accumulatedChanges[category][resource] === undefined) {
            accumulatedChanges[category][resource] = 0;
          }
          accumulatedChanges[category][resource] -= amount;
        } else {
          resources[category][resource].decrease(amount);
        }
      }
    }

    if (plan.disposalData && plan.appliedDisposal > 0) {
      const { category, resource } = plan.disposalData;
      if (accumulatedChanges) {
        if (!accumulatedChanges[category]) {
          accumulatedChanges[category] = {};
        }
        if (accumulatedChanges[category][resource] === undefined) {
          accumulatedChanges[category][resource] = 0;
        }
        accumulatedChanges[category][resource] -= plan.appliedDisposal;
      } else {
        resources[category][resource].decrease(plan.appliedDisposal);
      }
      this.removeZonalResource(category, resource, plan.appliedDisposal);
    }

    if (plan.gainFraction > 0) {
      this.applySpaceshipResourceGain(
        plan.gainBase,
        plan.gainFraction,
        accumulatedChanges,
        plan.context.productivity
      );
    }

    if (plan.fundingGain > 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) {
          accumulatedChanges.colony = {};
        }
        if (accumulatedChanges.colony.funding === undefined) {
          accumulatedChanges.colony.funding = 0;
        }
        accumulatedChanges.colony.funding += plan.fundingGain;
      } else {
        resources.colony.funding.increase(plan.fundingGain);
      }
    }
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (this.isBlockedByPulsarStorm()) {
      return totals;
    }
    if (this.isActive) {
      const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());

      if (this.isContinuous()) {
        const plan = this.getContinuousExecutionPlan(deltaTime, productivity, accumulatedChanges);
        this.applyContinuousPlanRates(plan, applyRates);
        this.addScaledResourceMap(totals.cost, plan.totalCost, 1);
        this.addScaledResourceMap(totals.gain, plan.totalGain, 1);
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
                this.getCostRateLabel(),
                'project'
              );
            }
            totals.cost[category][resource] =
              (totals.cost[category][resource] || 0) + totalCost[category][resource] * fraction;
          }
        }

        const totalDisposal = this.calculateSpaceshipTotalDisposal();
        const exportLabel = this.getExportRateLabel('Spaceship Export');
        for (const category in totalDisposal) {
          if (!totals.cost[category]) totals.cost[category] = {};
          for (const resource in totalDisposal[category]) {
            const rateValue = totalDisposal[category][resource] * rate * (applyRates ? productivity : 1);
            if (applyRates) {
              resources[category][resource].modifyRate(
                -rateValue,
                exportLabel,
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
        const label = this.getExportRateLabel(this.attributes.spaceMining ? 'Spaceship Mining' : 'Spaceship Export');
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

  estimateProductivityCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (this.isBlockedByPulsarStorm()) {
      return totals;
    }
    if (!this.isActive || !this.isContinuous()) {
      return this.estimateProjectCostAndGain(deltaTime, false, 1, null);
    }

    const context = this.getContinuousOperationContext(deltaTime, 1);
    if (context.fraction <= 0 || context.totalTransportCount <= 0) {
      return totals;
    }

    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        if (this.ignoreCostForResource && this.ignoreCostForResource(category, resource)) {
          continue;
        }
        const count = this.getContinuousCostCountForResource(category, resource, context);
        const amount = costPerShip[category][resource] * count * context.fraction;
        this.addAmountToResourceMap(totals.cost, category, resource, amount);
      }
    }

    return totals;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateProjectCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) {
      this.clearContinuousExecutionPlanCache();
      return;
    }
    if (this.isBlockedByPulsarStorm()) {
      this.clearContinuousExecutionPlanCache();
      return;
    }
    this.shortfallLastTick = false;
    this.costShortfallLastTick = false;
    this.disposalShortfallLastTick = false;
    this.currentTickDeltaTime = deltaTime;
    if (typeof this.shouldAutomationDisable === 'function' && this.shouldAutomationDisable()) {
      this.isActive = false;
      this.clearContinuousExecutionPlanCache();
      return;
    }
    const plan = this.getContinuousExecutionPlan(deltaTime, productivity, accumulatedChanges);
    this.applyContinuousPlan(plan, accumulatedChanges);
    const gainDebrisFraction = this.attributes.kesslerDebrisFromGainFraction;
    if (gainDebrisFraction > 0 && plan.failedGainFraction > 0) {
      let gainDebris = 0;
      for (const category in plan.gainBase) {
        for (const resource in plan.gainBase[category]) {
          gainDebris += plan.gainBase[category][resource] *
            plan.failedGainFraction *
            productivity;
        }
      }
      gainDebris *= gainDebrisFraction;
      this.addKesslerDebris(gainDebris);
      this.reportKesslerDebrisRate(gainDebris, plan.context.seconds);
    }
    if (plan.context.failureChance > 0) {
      this.applyContinuousKesslerDebris(
        plan.nonEnergyCost * plan.context.failureChance,
        plan.shipLoss,
        plan.context.seconds
      );
    }

    this.shortfallLastTick = plan.shortfall;
    this.costShortfallLastTick = plan.costShortfall;
    this.disposalShortfallLastTick = plan.disposalShortfall;
    this.lastActiveTime = 0;
    this.clearContinuousExecutionPlanCache();
  }

  saveAutomationSettings() {
    const settings = super.saveAutomationSettings();
    settings.waitForCapacity = this.waitForCapacity !== false;
    settings.selectedDisposalResource = this.selectedDisposalResource
      ? {
          category: this.selectedDisposalResource.category,
          resource: this.selectedDisposalResource.resource
        }
      : null;
    return settings;
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'waitForCapacity')) {
      this.waitForCapacity = settings.waitForCapacity !== false;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'selectedDisposalResource')) {
      const selected = settings.selectedDisposalResource;
      if (selected && selected.category && selected.resource) {
        this.selectedDisposalResource = {
          category: selected.category,
          resource: selected.resource
        };
      }
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      assignedSpaceships: this.assignedSpaceships,
      autoAssignSpaceships: this.autoAssignSpaceships,
      selectedDisposalResource: this.selectedDisposalResource,
      waitForCapacity: this.waitForCapacity,
      assignmentMultiplier: this.assignmentMultiplier,
      kesslerShipRollElapsed: this.kesslerShipRollElapsed,
      kesslerShipRollPending: this.kesslerShipRollPending,
      kesslerShipCostSnapshot: this.kesslerShipCostSnapshot,
      kesslerShipLossCarry: this.kesslerShipLossCarry
    };
  }

  loadState(state) {
    super.loadState(state);
    this.assignedSpaceships = state.assignedSpaceships || 0;
    this.autoAssignSpaceships = state.autoAssignSpaceships === true;
    this.selectedDisposalResource = state.selectedDisposalResource || this.attributes.defaultDisposal;
    if (state.waitForCapacity !== undefined) {
      this.waitForCapacity = state.waitForCapacity;
    }
    if (state.assignmentMultiplier !== undefined) {
      this.assignmentMultiplier = state.assignmentMultiplier;
    }
    this.kesslerShipRollElapsed = state.kesslerShipRollElapsed || 0;
    this.kesslerShipRollPending = state.kesslerShipRollPending === true;
    this.kesslerShipCostSnapshot = state.kesslerShipCostSnapshot || null;
    this.kesslerShipLossCarry = state.kesslerShipLossCarry || 0;
    SpaceshipProject.refreshAutoAssignDisplays();
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceshipProject = SpaceshipProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceshipProject;
}
