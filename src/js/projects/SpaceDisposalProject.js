class SpaceDisposalProject extends SpaceExportBaseProject {
  constructor(config, name) {
    super(config, name);
    this.massDriverEnabled = false;
    this.massDriverShipEquivalency = this.attributes.massDriverShipEquivalency ?? 10;
  }

  getAutomationTemperatureReading() {
    if (typeof terraforming !== 'undefined' && terraforming.temperature) {
      const trend = terraforming.temperature.trendValue;
      if (Number.isFinite(trend)) {
        return trend;
      }
    }
    return super.getAutomationTemperatureReading();
  }

  getExportRateLabel(baseLabel) {
    return 'Resource Disposal';
  }

  getCostRateLabel() {
    return 'Resource Disposal';
  }

  createResourceDisposalUI() {
    const section = super.createResourceDisposalUI();
    const elements = projectElements[this.name];
    const detailsGrid = elements.disposalDetailsGrid;
    const tempReduction = document.createElement('div');
    tempReduction.id = `${this.name}-temperature-reduction`;
    detailsGrid.appendChild(tempReduction);

    projectElements[this.name] = {
      ...projectElements[this.name],
      temperatureReductionElement: tempReduction,
    };

    return section;
  }

  renderUI(container) {
    super.renderUI(container);

    const elements = projectElements[this.name] || {};
    if (!elements.massDriverInfoSection) {
      const sectionContainer = document.createElement('div');
      sectionContainer.classList.add('project-section-container');
      sectionContainer.style.display = 'none';

      const title = document.createElement('h4');
      title.classList.add('section-title');
      title.textContent = 'Mass Drivers';
      sectionContainer.appendChild(title);

      const infoContent = document.createElement('div');
      infoContent.id = `${this.name}-mass-driver-info`;
      infoContent.classList.add('spaceship-assignment-container', 'mass-driver-assignment-container');

      const statusContainer = document.createElement('div');
      statusContainer.classList.add('assigned-and-available-container');

      const activeContainer = document.createElement('div');
      activeContainer.classList.add('assigned-ships-container');

      const activeLabel = document.createElement('span');
      activeLabel.classList.add('mass-driver-label');
      activeLabel.textContent = 'Active Mass Drivers: ';
      const activeValue = document.createElement('span');
      activeValue.id = `${this.name}-active-mass-drivers`;
      activeValue.classList.add('mass-driver-count');
      activeContainer.append(activeLabel, activeValue);

      const builtContainer = document.createElement('div');
      builtContainer.classList.add('available-ships-container');
      const builtLabel = document.createElement('span');
      builtLabel.classList.add('mass-driver-built-label');
      builtLabel.textContent = 'Built : ';
      const builtValue = document.createElement('span');
      builtValue.id = `${this.name}-built-mass-drivers`;
      builtValue.classList.add('mass-driver-built-count');
      builtContainer.append(builtLabel, builtValue);

      statusContainer.append(activeContainer, builtContainer);

      const buttonsContainer = document.createElement('div');
      buttonsContainer.classList.add('buttons-container');

      const createButton = (text, handler, parent = buttonsContainer) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', handler);
        parent.appendChild(button);
        return button;
      };

      const mainButtons = document.createElement('div');
      mainButtons.classList.add('main-buttons');
      buttonsContainer.appendChild(mainButtons);

      const applyManualMassDriverChange = (change) => {
        change();
        disableAutoActive(this.getMassDriverStructure());
        this.updateUI();
      };

      const zeroButton = createButton('0', () => {
        applyManualMassDriverChange(() => this.setMassDriverActive(0));
      }, mainButtons);

      const decreaseButton = createButton('', () => {
        applyManualMassDriverChange(() => this.adjustMassDriverActive(-1));
      }, mainButtons);

      const increaseButton = createButton('', () => {
        applyManualMassDriverChange(() => this.adjustMassDriverActive(1));
      }, mainButtons);

      const maxButton = createButton('Max', () => {
        const structure = this.getMassDriverStructure();
        applyManualMassDriverChange(() => this.setMassDriverActive(structure.count));
      }, mainButtons);

      const multiplierContainer = document.createElement('div');
      multiplierContainer.classList.add('multiplier-container');
      buttonsContainer.appendChild(multiplierContainer);

      const divideButton = createButton('/10', () => {
        this.shiftMassDriverStep(false);
        this.updateUI();
      }, multiplierContainer);

      const multiplyButton = createButton('x10', () => {
        this.shiftMassDriverStep(true);
        this.updateUI();
      }, multiplierContainer);

      infoContent.append(statusContainer, buttonsContainer);
      sectionContainer.appendChild(infoContent);

      const infoNote = document.createElement('p');
      infoNote.classList.add('project-description');
      infoNote.classList.add('mass-driver-note');
      infoNote.textContent = 'Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.';
      sectionContainer.appendChild(infoNote);

      container.appendChild(sectionContainer);

      projectElements[this.name] = {
        ...elements,
        massDriverInfoSection: sectionContainer,
        massDriverInfoElement: infoContent,
        massDriverActiveElement: activeValue,
        massDriverBuiltElement: builtValue,
        massDriverCountElement: activeValue,
        massDriverZeroButton: zeroButton,
        massDriverDecreaseButton: decreaseButton,
        massDriverIncreaseButton: increaseButton,
        massDriverMaxButton: maxButton,
        massDriverDivideButton: divideButton,
        massDriverMultiplyButton: multiplyButton,
        massDriverInfoNoteElement: infoNote,
      };

      this.updateMassDriverButtonLabels();
    }
  }

  getMassDriverStructure() {
    return buildings.massDriver;
  }

  getMassDriverStep() {
    selectedBuildCounts.massDriver ||= 1;
    return selectedBuildCounts.massDriver;
  }

  applyMassDriverChange(delta) {
    if (!delta) {
      return;
    }
    const structure = this.getMassDriverStructure();
    adjustStructureActivation(structure, delta);
    updateBuildingDisplay(buildings);
  }

  setMassDriverActive(target) {
    const structure = this.getMassDriverStructure();
    this.applyMassDriverChange(target - structure.active);
  }

  adjustMassDriverActive(direction) {
    const step = this.getMassDriverStep();
    this.applyMassDriverChange(direction * step);
  }

  shiftMassDriverStep(increase) {
    selectedBuildCounts.massDriver ||= 1;
    selectedBuildCounts.massDriver = increase
      ? multiplyByTen(selectedBuildCounts.massDriver)
      : divideByTen(selectedBuildCounts.massDriver);
    this.updateMassDriverButtonLabels();
    updateBuildingDisplay(buildings);
  }

  updateMassDriverButtonLabels() {
    const elements = projectElements[this.name];
    if (!elements) {
      return;
    }
    const step = this.getMassDriverStep();
    const formattedStep = formatNumber(step, true);
    if (elements.massDriverDecreaseButton) {
      elements.massDriverDecreaseButton.textContent = `-${formattedStep}`;
    }
    if (elements.massDriverIncreaseButton) {
      elements.massDriverIncreaseButton.textContent = `+${formattedStep}`;
    }
  }

  getMassDriverContribution() {
    if (!this.isBooleanFlagSet('massDriverEnabled')) {
      return 0;
    }
    const activeMassDrivers = buildings?.massDriver?.active ?? 0;
    return activeMassDrivers * this.massDriverShipEquivalency;
  }

  getSpaceshipOnlyCount() {
    return super.getActiveShipCount();
  }

  getAutomationShipCount() {
    return super.getActiveShipCount();
  }

  getActiveShipCount() {
    return super.getActiveShipCount() + this.getMassDriverContribution();
  }

  getKesslerFailureChance() {
    const shipCount = this.getSpaceshipOnlyCount();
    return shipCount > 0 ? super.getKesslerFailureChance() : 0;
  }

  checkKesslerShipFailure(activeTime, startRemaining) {
    const shipCount = this.getSpaceshipOnlyCount();
    if (shipCount <= 0) {
      this.resetKesslerShipRoll();
      return false;
    }
    return super.checkKesslerShipFailure(activeTime, startRemaining);
  }

  calculateSpaceshipTotalCost(perSecond = false) {
    const totalCost = {};
    const costPerShip = this.calculateSpaceshipCost();
    const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
    const activeShips = this.getSpaceshipOnlyCount();
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
    const activeShips = this.getSpaceshipOnlyCount();
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

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;
    this.shortfallLastTick = false;
    let shouldDisable = false;
    try {
      shouldDisable = this.shouldAutomationDisable();
    } catch (error) {
      shouldDisable = false;
    }
    if (shouldDisable) {
      this.isActive = false;
      return;
    }
    const duration = (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration());
    const fraction = deltaTime / duration;
    const shipCount = this.getSpaceshipOnlyCount();
    const massDriverCount = this.getMassDriverContribution();
    const activeShips = shipCount + massDriverCount;
    const successChance = shipCount > 0 ? this.getKesslerSuccessChance() : 1;
    const failureChance = shipCount > 0 ? 1 - successChance : 0;
    const seconds = deltaTime / 1000;

    let shortfall = false;
    let nonEnergyCost = 0;
    const costPerShip = this.calculateSpaceshipCost();
    for (const category in costPerShip) {
      for (const resource in costPerShip[category]) {
        let ignoreCost = false;
        try {
          ignoreCost = this.ignoreCostForResource(category, resource);
        } catch (error) {
          ignoreCost = false;
        }
        if (ignoreCost) continue;
        const amount = costPerShip[category][resource] * shipCount * fraction * productivity;
        const available = resources[category][resource].value || 0;
        if (available < amount) {
          shortfall = shortfall || amount > 0;
        }
        if (accumulatedChanges) {
          accumulatedChanges[category][resource] -= amount;
        } else {
          resources[category][resource].decrease(amount);
        }
        if (resource !== 'energy') {
          nonEnergyCost += amount;
        }
      }
    }

    if (this.attributes.spaceExport && this.selectedDisposalResource) {
      const capacity = this.getShipCapacity();
      const requestedShip = capacity * shipCount * fraction * productivity;
      const requestedDriver = capacity * massDriverCount * fraction * productivity;
      const requestedTotal = requestedShip + requestedDriver;
      const { category, resource } = this.selectedDisposalResource;
      let actualShip = 0;
      let actualDriver = 0;
      if (accumulatedChanges) {
        if (!accumulatedChanges[category]) {
          accumulatedChanges[category] = {};
        }
        const existingChange = accumulatedChanges[category][resource] || 0;
        const currentValue = resources[category][resource].value || 0;
        const effectiveAvailable = Math.max(0, currentValue + existingChange);
        actualDriver = Math.min(requestedDriver, effectiveAvailable);
        actualShip = Math.min(requestedShip, effectiveAvailable - actualDriver);
        accumulatedChanges[category][resource] = existingChange - actualDriver - actualShip;
        const fundingGainAmount = this.attributes.fundingGainAmount || 0;
        const fundingGain = (actualDriver + actualShip * successChance) * fundingGainAmount;
        try {
          accumulatedChanges.colony.funding += fundingGain;
        } catch (error) {
          try {
            accumulatedChanges.colony = { funding: fundingGain };
          } catch (innerError) {
            // no-op
          }
        }
      } else {
        const res = resources[category][resource];
        const before = res.value;
        res.decrease(requestedTotal);
        const actualTotal = before - res.value;
        actualDriver = Math.min(requestedDriver, actualTotal);
        actualShip = Math.min(requestedShip, actualTotal - actualDriver);
        const fundingGainAmount = this.attributes.fundingGainAmount || 0;
        const fundingGain = (actualDriver + actualShip * successChance) * fundingGainAmount;
        try {
          resources.colony.funding.increase(fundingGain);
        } catch (error) {
          // no-op
        }
      }
      if (actualShip + actualDriver < requestedTotal) {
        shortfall = shortfall || requestedTotal > 0;
      }
      this.removeZonalResource(category, resource, actualShip + actualDriver);
    }

    const gainPerShip = this.calculateSpaceshipGainPerShip();
    const gain = {};
    for (const category in gainPerShip) {
      gain[category] = {};
      for (const resource in gainPerShip[category]) {
        gain[category][resource] = gainPerShip[category][resource] * shipCount;
      }
    }
    try {
      const cost = this.calculateSpaceshipCost();
      const metalCost = cost.colony?.metal || 0;
      const penalty = metalCost * shipCount;
      this.applyMetalCostPenalty(gain, penalty);
    } catch (error) {
      // no-op
    }
    const gainFraction = fraction * successChance;
    this.applySpaceshipResourceGain(gain, gainFraction, accumulatedChanges, productivity);
    if (failureChance > 0) {
      const costDebris = nonEnergyCost * failureChance * 0.5;
      this.addKesslerDebris(costDebris);
      this.reportKesslerDebrisRate(costDebris, seconds);
      const lostShips = this.applyKesslerShipLoss(shipCount * fraction * productivity * failureChance);
      const shipDebris = lostShips * this.getKesslerShipDebrisPerShip();
      this.reportKesslerDebrisRate(shipDebris, seconds);
    }

    this.shortfallLastTick = shortfall;
    this.lastActiveTime = 0;
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.massDriverInfoSection && elements.massDriverInfoElement) {
      if (this.isBooleanFlagSet('massDriverEnabled')) {
        const structure = this.getMassDriverStructure();
        if (elements.massDriverActiveElement) {
          elements.massDriverActiveElement.textContent = formatBuildingCount(structure.active);
        }
        if (elements.massDriverBuiltElement) {
          elements.massDriverBuiltElement.textContent = formatBuildingCount(structure.count);
        }
        elements.massDriverInfoSection.style.display = 'block';
        this.updateMassDriverButtonLabels();
      } else {
        elements.massDriverInfoSection.style.display = 'none';
      }
    }

    if (!elements.temperatureReductionElement) return;

    if (this.selectedDisposalResource?.resource === 'greenhouseGas') {
      const reduction = this.calculateTemperatureReduction();
      const suffix = this.isContinuous() ? `${getTemperatureUnit()}/s` : getTemperatureUnit();
      elements.temperatureReductionElement.textContent =
        `Temperature will reduce by: ${formatNumber(toDisplayTemperatureDelta(reduction), false, 2)}${suffix}`;
      elements.temperatureReductionElement.style.display = 'block';
    } else {
      elements.temperatureReductionElement.style.display = 'none';
    }
  }

  calculateTemperatureReduction() {
    const activeShips = this.getActiveShipCount();
    if (
      activeShips <= 0 ||
      typeof terraforming === 'undefined' ||
      typeof resources === 'undefined' ||
      !resources.atmospheric?.greenhouseGas
    ) {
      return 0;
    }

    let removed = 0;
    if (this.isContinuous()) {
      removed =
        this.getShipCapacity() *
        activeShips *
        (1000 / this.getEffectiveDuration());
    } else {
      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      removed = totalDisposal.atmospheric?.greenhouseGas || 0;
    }

    if (removed <= 0) return 0;

    const ghg = resources.atmospheric.greenhouseGas;
    const originalAmount = ghg.value;
    const removal = Math.min(removed, originalAmount);
    const originalTemp = terraforming.temperature.trendValue ?? 0;

    const saveTempState =
      typeof terraforming.saveTemperatureState === 'function'
        ? terraforming.saveTemperatureState.bind(terraforming)
        : null;
    const restoreTempState =
      typeof terraforming.restoreTemperatureState === 'function'
        ? terraforming.restoreTemperatureState.bind(terraforming)
        : null;
    const snapshot = saveTempState ? saveTempState() : null;
    const canUpdateSurfaceTemperature = typeof terraforming.updateSurfaceTemperature === 'function';

    let newTemp = originalTemp;

    try {
      ghg.value = originalAmount - removal;
      if (canUpdateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0);
      }
      newTemp = terraforming.temperature?.trendValue ?? newTemp;
    } finally {
      ghg.value = originalAmount;
      if (snapshot && restoreTempState) {
        restoreTempState(snapshot);
      } else if (canUpdateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0);
      }
    }

    return originalTemp - newTemp;
  }
}

try {
  window.SpaceDisposalProject = SpaceDisposalProject;
} catch (err) {
  // window is not available
}

try {
  module.exports = SpaceDisposalProject;
} catch (err) {
  // module is not available
}
