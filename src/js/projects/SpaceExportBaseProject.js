class SpaceExportBaseProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.disableBelowTemperature = false;
    this.disableTemperatureThreshold = 303.15;
    this.disableBelowPressure = false;
    this.disablePressureThreshold = 0;
    this.pressureUnit = 'kPa';
  }
  renderUI(container) {
    super.renderUI(container);
    if (this.attributes.disposable) {
      const topSection = container.querySelector('.project-top-section');
      if (topSection) {
        topSection.appendChild(this.createResourceDisposalUI());
      } else {
        container.appendChild(this.createResourceDisposalUI());
      }
    }
  }

  createWaitForCapacityCheckbox() {
    const waitCheckboxContainer = document.createElement('div');
    waitCheckboxContainer.classList.add('checkbox-container');
  
    const waitCheckbox = document.createElement('input');
    waitCheckbox.type = 'checkbox';
    waitCheckbox.checked = this.waitForCapacity !== false;
    waitCheckbox.id = `${this.name}-wait-capacity`;
    waitCheckbox.classList.add('wait-capacity-checkbox');
    waitCheckbox.addEventListener('change', (e) => {
      this.waitForCapacity = e.target.checked;
    });
  
    const waitLabel = document.createElement('label');
    waitLabel.htmlFor = `${this.name}-wait-capacity`;
    waitLabel.textContent = 'Wait for full capacity';
  
    waitCheckboxContainer.appendChild(waitCheckbox);
    waitCheckboxContainer.appendChild(waitLabel);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      waitCapacityCheckbox: waitCheckbox,
      waitCapacityCheckboxContainer: waitCheckboxContainer,
    };
  
    return waitCheckboxContainer;
  }

  createResourceDisposalUI() {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = 'Export';
    sectionContainer.appendChild(title);

    const disposalContainer = document.createElement('div');
    disposalContainer.classList.add('disposal-container');
  
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('disposal-select-container');
    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = 'Export:';
    const disposalSelect = document.createElement('select');
    disposalSelect.id = `${this.name}-disposal-select`;
    for (const [category, resourceList] of Object.entries(this.attributes.disposable)) {
      resourceList.forEach(resource => {
        const option = document.createElement('option');
        option.value = `${category}:${resource}`;
        option.textContent = resources[category][resource].displayName || resource;
        disposalSelect.appendChild(option);
      });
    }
    disposalSelect.addEventListener('change', (event) => {
      const [category, resource] = event.target.value.split(':');
      this.selectedDisposalResource = { category, resource };
      this.updateUI();
    });
    selectContainer.append(disposalLabel, disposalSelect);
  
    const detailsGrid = document.createElement('div');
    detailsGrid.classList.add('project-details-grid');
    const disposalPerShip = document.createElement('div');
    disposalPerShip.id = `${this.name}-disposal-per-ship`;
    const totalDisposal = document.createElement('div');
    totalDisposal.id = `${this.name}-total-disposal`;
    const maxDisposal = document.createElement('div');
    maxDisposal.id = `${this.name}-max-disposal`;
    const maxDisposalText = document.createElement('span');
    maxDisposal.appendChild(maxDisposalText);
    const gainPerResource = document.createElement('div');
    gainPerResource.id = `${this.name}-gain-per-ship`;
    detailsGrid.append(selectContainer, disposalPerShip, totalDisposal, maxDisposal, gainPerResource);
  
    disposalContainer.append(detailsGrid);
    sectionContainer.appendChild(disposalContainer);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      disposalSelect,
      disposalPerShipElement: disposalPerShip,
      totalDisposalElement: totalDisposal,
      maxDisposalElement: maxDisposal,
      maxDisposalText,
      gainPerResourceElement: gainPerResource,
    };

    return sectionContainer;
  }

  isGasResource(resource) {
    const gases = ['carbonDioxide', 'oxygen', 'inertGas', 'greenhouseGas', 'atmosphericMethane', 'hydrogen', 'sulfuricAcid'];
    return gases.includes(resource);
  }

  createPressureControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'pressure-control');
    control.id = `${this.name}-pressure-control`;
    control.style.display = 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('pressure-checkbox');
    checkbox.checked = this.disableBelowPressure;
    checkbox.addEventListener('change', () => {
      this.disableBelowPressure = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if pressure below: ';
    control.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.classList.add('pressure-input');
    input.value = this.disablePressureThreshold;
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      this.disablePressureThreshold = this.pressureUnit === 'Pa' ? (val / 1000) : val;
    });
    control.appendChild(input);

    const unitSelect = document.createElement('select');
    unitSelect.classList.add('pressure-unit');
    ['kPa', 'Pa'].forEach(u => {
      const option = document.createElement('option');
      option.value = u;
      option.textContent = u;
      unitSelect.appendChild(option);
    });
    unitSelect.value = this.pressureUnit;
    unitSelect.addEventListener('change', () => {
      this.pressureUnit = unitSelect.value;
      input.value = this.pressureUnit === 'Pa'
        ? this.disablePressureThreshold * 1000
        : this.disablePressureThreshold;
    });
    control.appendChild(unitSelect);

    projectElements[this.name] = {
      ...projectElements[this.name],
      pressureControl: control,
      pressureCheckbox: checkbox,
      pressureInput: input,
      pressureUnitSelect: unitSelect,
    };

    return control;
  }

  createTemperatureControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'temperature-control');
    control.id = `${this.name}-temperature-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('temperature-checkbox');
    checkbox.checked = this.disableBelowTemperature;
    checkbox.addEventListener('change', () => {
      this.disableBelowTemperature = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if temperature below: ';
    control.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.classList.add('temperature-input');
    input.value = toDisplayTemperature(this.disableTemperatureThreshold);
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      this.disableTemperatureThreshold = gameSettings.useCelsius ? val + 273.15 : val;
    });
    control.appendChild(input);

    const unit = document.createElement('span');
    unit.classList.add('temperature-unit');
    unit.textContent = getTemperatureUnit();
    control.appendChild(unit);

    projectElements[this.name] = {
      ...projectElements[this.name],
      temperatureControl: control,
      temperatureCheckbox: checkbox,
      temperatureInput: input,
      temperatureUnit: unit,
    };

    return control;
  }

  renderAutomationUI(container) {
    const elements = projectElements[this.name] || {};
    if (!elements.waitCapacityCheckboxContainer) {
      container.appendChild(this.createWaitForCapacityCheckbox());
    }
    if (!elements.temperatureControl) {
      container.appendChild(this.createTemperatureControl());
    }
    if (!elements.pressureControl) {
      container.appendChild(this.createPressureControl());
    }
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) return;

    if (elements.waitCapacityCheckbox) {
      elements.waitCapacityCheckbox.checked = this.waitForCapacity !== false;
    }
    if (elements.waitCapacityCheckboxContainer) {
      elements.waitCapacityCheckboxContainer.style.display =
          projectManager.isBooleanFlagSet('automateSpecialProjects') ? 'flex' : 'none';
    }

    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    const isGas = this.selectedDisposalResource?.category === 'atmospheric' &&
      this.isGasResource(this.selectedDisposalResource.resource);

    if (elements.temperatureControl) {
      elements.temperatureControl.style.display = hasMonitoring ? 'flex' : 'none';
    }
    if (elements.temperatureCheckbox) {
      elements.temperatureCheckbox.checked = this.disableBelowTemperature;
    }
    if (elements.temperatureInput) {
      if (document.activeElement !== elements.temperatureInput) {
        elements.temperatureInput.value = toDisplayTemperature(this.disableTemperatureThreshold);
      }
    }
    if (elements.temperatureUnit) {
      elements.temperatureUnit.textContent = getTemperatureUnit();
    }

    if (elements.pressureControl) {
      elements.pressureControl.style.display = hasMonitoring && isGas ? 'flex' : 'none';
    }
    if (elements.pressureCheckbox) {
      elements.pressureCheckbox.checked = this.disableBelowPressure;
    }
    if (elements.pressureUnitSelect) {
      elements.pressureUnitSelect.value = this.pressureUnit;
    }
    if (elements.pressureInput && document.activeElement !== elements.pressureInput) {
      elements.pressureInput.value = this.pressureUnit === 'Pa'
        ? this.disablePressureThreshold * 1000
        : this.disablePressureThreshold;
    }

    if (elements.disposalPerShipElement) {
      const perShip = this.getShipCapacity();
      elements.disposalPerShipElement.textContent = `Max Export/Ship: ${formatNumber(perShip, true)}`;
    }

    if (elements.totalDisposalElement) {
      const perShip = this.calculateSpaceshipTotalDisposal();
      let total = 0;
      for (const category in perShip) {
        for (const resource in perShip[category]) {
          total += perShip[category][resource];
        }
      }
      if (this.isContinuous()) {
        total *= this.assignedSpaceships * (1000 / this.getEffectiveDuration());
        elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(total, true)}/s`;
      } else {
        elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(total, true)}`;
      }
    }

    if (elements.maxDisposalText && typeof this.getExportCap === 'function') {
      elements.maxDisposalText.textContent = `Max Export Capacity: ${formatNumber(this.getExportCap(), true)} /s`;
    }
    
    if (elements.gainPerResourceElement && this.attributes.fundingGainAmount) {
        elements.gainPerResourceElement.textContent = `Gain/Resource: ${formatNumber(this.attributes.fundingGainAmount, true)}`;
    }

    if (elements.disposalSelect && this.selectedDisposalResource) {
      const { category, resource } = this.selectedDisposalResource;
      elements.disposalSelect.value = `${category}:${resource}`;
    }
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    if (!this.attributes.fundingGainAmount) {
      return {};
    }
    const totalDisposal = this.calculateSpaceshipTotalDisposal();
    let totalDisposalAmount = 0;
    for (const category in totalDisposal) {
      for (const resource in totalDisposal[category]) {
        totalDisposalAmount += totalDisposal[category][resource];
      }
    }
    let multiplier = 1;
    if (perSecond) {
      multiplier = this.assignedSpaceships * (1000 / this.getEffectiveDuration());
    }
    return {
      colony: {
        funding: totalDisposalAmount * this.attributes.fundingGainAmount * multiplier,
      },
    };
  }

  shouldAutomationDisable() {
    if (this.disableBelowTemperature) {
      if (typeof terraforming !== 'undefined' && terraforming.temperature) {
        const temp = terraforming.temperature.value || 0;
        if (temp <= this.disableTemperatureThreshold) {
          return true;
        }
      }
    }
    if (this.disableBelowPressure && this.selectedDisposalResource?.category === 'atmospheric' &&
        this.isGasResource(this.selectedDisposalResource.resource) && typeof calculateAtmosphericPressure === 'function') {
      if (typeof terraforming !== 'undefined' && resources.atmospheric?.[this.selectedDisposalResource.resource]) {
        const amount = resources.atmospheric[this.selectedDisposalResource.resource].value || 0;
        const pressurePa = calculateAtmosphericPressure(
          amount,
          terraforming.celestialParameters.gravity,
          terraforming.celestialParameters.radius
        );
        const pressureKPa = pressurePa / 1000;
        if (pressureKPa <= this.disablePressureThreshold) {
          return true;
        }
      }
    }
    return false;
  }

  canStart() {
    if (!super.canStart()) return false;

    if (this.disableBelowTemperature) {
      if (typeof terraforming !== 'undefined' && terraforming.temperature) {
        const temp = terraforming.temperature.value || 0;
        if (temp <= this.disableTemperatureThreshold) {
          return false;
        }
      }
    }

    if (this.disableBelowPressure && this.selectedDisposalResource?.category === 'atmospheric' &&
        this.isGasResource(this.selectedDisposalResource.resource) && typeof calculateAtmosphericPressure === 'function') {
      if (typeof terraforming !== 'undefined' && resources.atmospheric?.[this.selectedDisposalResource.resource]) {
        const amount = resources.atmospheric[this.selectedDisposalResource.resource].value || 0;
        const pressurePa = calculateAtmosphericPressure(
          amount,
          terraforming.celestialParameters.gravity,
          terraforming.celestialParameters.radius
        );
        const pressureKPa = pressurePa / 1000;
        if (pressureKPa <= this.disablePressureThreshold) {
          return false;
        }
      }
    }

    return true;
  }

  saveState() {
    return {
      ...super.saveState(),
      disableBelowTemperature: this.disableBelowTemperature,
      disableTemperatureThreshold: this.disableTemperatureThreshold,
      disableBelowPressure: this.disableBelowPressure,
      disablePressureThreshold: this.disablePressureThreshold,
      pressureUnit: this.pressureUnit,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.disableBelowTemperature = state.disableBelowTemperature || false;
    this.disableTemperatureThreshold = typeof state.disableTemperatureThreshold === 'number' ? state.disableTemperatureThreshold : 303.15;
    this.disableBelowPressure = state.disableBelowPressure || false;
    this.disablePressureThreshold = typeof state.disablePressureThreshold === 'number' ? state.disablePressureThreshold : 0;
    this.pressureUnit = state.pressureUnit || 'kPa';
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportBaseProject = SpaceExportBaseProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportBaseProject;
}
