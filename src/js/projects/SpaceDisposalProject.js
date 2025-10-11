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
    const detailsGrid = section.querySelector('.project-details-grid');
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

      const zeroButton = createButton('0', () => {
        this.setMassDriverActive(0);
        this.updateUI();
      }, mainButtons);

      const decreaseButton = createButton('', () => {
        this.adjustMassDriverActive(-1);
        this.updateUI();
      }, mainButtons);

      const increaseButton = createButton('', () => {
        this.adjustMassDriverActive(1);
        this.updateUI();
      }, mainButtons);

      const maxButton = createButton('Max', () => {
        const structure = this.getMassDriverStructure();
        this.setMassDriverActive(structure.count);
        this.updateUI();
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

  getActiveShipCount() {
    return super.getActiveShipCount() + this.getMassDriverContribution();
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
    const originalTemp = terraforming.temperature.value;

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
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      }
      newTemp = terraforming.temperature?.value ?? newTemp;
    } finally {
      ghg.value = originalAmount;
      if (snapshot && restoreTempState) {
        restoreTempState(snapshot);
      } else if (canUpdateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
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
