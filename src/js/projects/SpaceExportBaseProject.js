class SpaceExportBaseProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.disableBelowTemperature = false;
    this.disableTemperatureThreshold = 303.15;
    this.disableBelowPressure = false;
    this.disablePressureThreshold = 0;
    this.disableBelowCoverage = false;
    this.disableCoverageThreshold = 0;
    this.disposalLimitSettings = {};
    this.pressureUnit = 'Pa';
  }

  getAutomationTemperatureReading() {
    if (typeof terraforming !== 'undefined' && terraforming.temperature) {
      const reading = terraforming.temperature.value;
      return Number.isFinite(reading) ? reading : 0;
    }
    return 0;
  }

  getResourcePhaseGroups() {
    let phaseGroups;
    try {
      phaseGroups = window.resourcePhaseGroups;
    } catch (error) {
      phaseGroups = null;
    }
    try {
      phaseGroups = phaseGroups || global.resourcePhaseGroups;
    } catch (error) {
      phaseGroups = phaseGroups || {};
    }
    return phaseGroups || {};
  }

  buildDisposalGroupData() {
    const disposable = this.attributes.disposable || {};
    const allowedResources = {};
    Object.entries(disposable).forEach(([category, resourceList]) => {
      resourceList.forEach((resource) => {
        allowedResources[`${category}:${resource}`] = true;
      });
    });

    const phaseGroups = this.getResourcePhaseGroups();
    const groupList = [];
    const groupMap = {};
    const resourceGroupLookup = {};
    const resourceMetaLookup = {};

    const resolveOptionPhaseType = (group, option) => {
      if (option.category === 'atmospheric') {
        return 'gas';
      }
      if (option.category !== 'surface' || !group.surfaceKeys) {
        return null;
      }
      if (group.surfaceKeys.liquid === option.resource) {
        return 'liquid';
      }
      if (group.surfaceKeys.ice === option.resource || group.surfaceKeys.buriedIce === option.resource) {
        return 'ice';
      }
      return null;
    };

    const assignResourceMeta = (groupKey, group, option) => {
      const resourceKey = `${option.category}:${option.resource}`;
      const phaseType = resolveOptionPhaseType(group, option);
      resourceMetaLookup[resourceKey] = {
        groupKey,
        phaseType,
      };
    };

    Object.entries(phaseGroups).forEach(([groupKey, group]) => {
      const options = [];
      group.options.forEach((option) => {
        const resourceKey = `${option.category}:${option.resource}`;
        if (!allowedResources[resourceKey]) {
          return;
        }
        const displayName = resources[option.category][option.resource].displayName || option.resource;
        options.push({
          category: option.category,
          resource: option.resource,
          label: option.label || displayName,
        });
        resourceGroupLookup[resourceKey] = groupKey;
        assignResourceMeta(groupKey, group, option);
      });
      if (options.length) {
        const entry = { key: groupKey, label: group.name, options };
        groupList.push(entry);
        groupMap[groupKey] = entry;
      }
    });

    const storageDepotOptions = [];
    const storageDepotStorage = buildings.storageDepot.storage;
    Object.entries(storageDepotStorage).forEach(([category, storageResources]) => {
      Object.keys(storageResources).forEach((resource) => {
        const displayName = resources[category][resource].displayName || resource;
        storageDepotOptions.push({
          category,
          resource,
          label: displayName,
        });
        resourceGroupLookup[`${category}:${resource}`] = 'storageDepotResource';
        if (!resourceMetaLookup[`${category}:${resource}`]) {
          resourceMetaLookup[`${category}:${resource}`] = {
            groupKey: 'storageDepotResource',
            phaseType: category === 'atmospheric' ? 'gas' : null,
          };
        }
      });
    });
    if (storageDepotOptions.length) {
      const entry = {
        key: 'storageDepotResource',
        label: 'Storage Depot Resource',
        options: storageDepotOptions,
      };
      groupList.push(entry);
      groupMap.storageDepotResource = entry;
    }

    Object.entries(disposable).forEach(([category, resourceList]) => {
      resourceList.forEach((resource) => {
        const resourceKey = `${category}:${resource}`;
        if (resourceGroupLookup[resourceKey]) {
          return;
        }
        const displayName = resources[category][resource].displayName || resource;
        const entry = {
          key: resourceKey,
          label: displayName,
          options: [{ category, resource, label: displayName }],
        };
        groupList.push(entry);
        groupMap[resourceKey] = entry;
        resourceGroupLookup[resourceKey] = resourceKey;
        if (!resourceMetaLookup[resourceKey]) {
          resourceMetaLookup[resourceKey] = {
            groupKey: resourceKey,
            phaseType: category === 'atmospheric' ? 'gas' : null,
          };
        }
      });
    });

    return { groupList, groupMap, resourceGroupLookup, resourceMetaLookup };
  }

  setDisposalSelection(elements, groupKey, resourceKey) {
    this.saveCurrentSelectionLimitSettings();
    const group = elements.disposalGroupMap[groupKey];
    const options = group.options;
    if (elements.activeDisposalGroupKey !== groupKey) {
      elements.disposalPhaseSelect.textContent = '';
      options.forEach((optionData) => {
        const option = document.createElement('option');
        option.value = `${optionData.category}:${optionData.resource}`;
        option.textContent = optionData.label;
        elements.disposalPhaseSelect.appendChild(option);
      });
      elements.activeDisposalGroupKey = groupKey;
    }
    if (elements.disposalPhaseLabel) {
      elements.disposalPhaseLabel.textContent =
        groupKey === 'storageDepotResource' ? 'Which one : ' : 'Phase:';
    }
    if (elements.disposalPhaseContainer) {
      elements.disposalPhaseContainer.style.display = options.length > 1 ? 'flex' : 'none';
    }

    const preferredKey = resourceKey || `${options[0].category}:${options[0].resource}`;
    const selectedOption =
      options.find((optionData) => `${optionData.category}:${optionData.resource}` === preferredKey) ||
      options[0];
    elements.disposalPhaseSelect.value = `${selectedOption.category}:${selectedOption.resource}`;
    this.selectedDisposalResource = {
      category: selectedOption.category,
      resource: selectedOption.resource,
    };
    this.loadCurrentSelectionLimitSettings();
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
  
    const groupSelectContainer = document.createElement('div');
    groupSelectContainer.classList.add('disposal-select-container');
    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = 'Export:';
    const disposalTypeSelect = document.createElement('select');
    disposalTypeSelect.id = `${this.name}-disposal-type-select`;

    const phaseSelectContainer = document.createElement('div');
    phaseSelectContainer.classList.add('disposal-select-container');
    const phaseLabel = document.createElement('label');
    phaseLabel.textContent = 'Phase:';
    const disposalPhaseSelect = document.createElement('select');
    disposalPhaseSelect.id = `${this.name}-disposal-phase-select`;

    const disposalGroupData = this.buildDisposalGroupData();
    disposalGroupData.groupList.forEach((group) => {
      const option = document.createElement('option');
      option.value = group.key;
      option.textContent = group.label;
      disposalTypeSelect.appendChild(option);
    });

    disposalTypeSelect.addEventListener('change', () => {
      const elements = projectElements[this.name];
      this.setDisposalSelection(elements, disposalTypeSelect.value, null);
      this.updateUI();
    });

    disposalPhaseSelect.addEventListener('change', (event) => {
      this.saveCurrentSelectionLimitSettings();
      const [category, resource] = event.target.value.split(':');
      this.selectedDisposalResource = { category, resource };
      this.loadCurrentSelectionLimitSettings();
      this.updateUI();
    });

    groupSelectContainer.append(disposalLabel, disposalTypeSelect);
    phaseSelectContainer.append(phaseLabel, disposalPhaseSelect);
  
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
    detailsGrid.append(
      groupSelectContainer,
      phaseSelectContainer,
      disposalPerShip,
      totalDisposal,
      maxDisposal,
      gainPerResource
    );
  
    disposalContainer.append(detailsGrid);
    sectionContainer.appendChild(disposalContainer);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      disposalTypeSelect,
      disposalPhaseSelect,
      disposalPhaseContainer: phaseSelectContainer,
      disposalPhaseLabel: phaseLabel,
      disposalGroups: disposalGroupData.groupList,
      disposalGroupMap: disposalGroupData.groupMap,
      disposalResourceGroupLookup: disposalGroupData.resourceGroupLookup,
      disposalResourceMetaLookup: disposalGroupData.resourceMetaLookup,
      disposalDetailsGrid: detailsGrid,
      disposalPerShipElement: disposalPerShip,
      totalDisposalElement: totalDisposal,
      maxDisposalElement: maxDisposal,
      maxDisposalText,
      gainPerResourceElement: gainPerResource,
    };

    const defaultSelection =
      this.selectedDisposalResource || disposalGroupData.groupList[0].options[0];
    const defaultKey = `${defaultSelection.category}:${defaultSelection.resource}`;
    const defaultGroupKey =
      disposalGroupData.resourceGroupLookup[defaultKey] || disposalGroupData.groupList[0].key;
    disposalTypeSelect.value = defaultGroupKey;
    this.setDisposalSelection(projectElements[this.name], defaultGroupKey, defaultKey);
    this.loadCurrentSelectionLimitSettings();

    return sectionContainer;
  }

  isAtmosphericSelection() {
    return this.selectedDisposalResource?.category === 'atmospheric';
  }

  getDisposalSelectionKey(selection = this.selectedDisposalResource) {
    if (!selection?.category || !selection?.resource) {
      return null;
    }
    return `${selection.category}:${selection.resource}`;
  }

  getDefaultLimitSettings() {
    return {
      disableBelowTemperature: false,
      disableTemperatureThreshold: 303.15,
      disableBelowPressure: false,
      disablePressureThreshold: 0,
      disableBelowCoverage: false,
      disableCoverageThreshold: 0,
    };
  }

  readCurrentLimitSettings() {
    return {
      disableBelowTemperature: this.disableBelowTemperature,
      disableTemperatureThreshold: this.disableTemperatureThreshold,
      disableBelowPressure: this.disableBelowPressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableBelowCoverage: this.disableBelowCoverage,
      disableCoverageThreshold: this.disableCoverageThreshold,
    };
  }

  applyLimitSettings(settings) {
    const defaults = this.getDefaultLimitSettings();
    const resolved = { ...defaults, ...(settings || {}) };
    this.disableBelowTemperature = !!resolved.disableBelowTemperature;
    this.disableTemperatureThreshold = resolved.disableTemperatureThreshold;
    this.disableBelowPressure = !!resolved.disableBelowPressure;
    this.disablePressureThreshold = resolved.disablePressureThreshold;
    this.disableBelowCoverage = !!resolved.disableBelowCoverage;
    this.disableCoverageThreshold = resolved.disableCoverageThreshold;
  }

  saveCurrentSelectionLimitSettings() {
    const key = this.getDisposalSelectionKey();
    if (!key) {
      return;
    }
    this.disposalLimitSettings[key] = this.readCurrentLimitSettings();
  }

  loadCurrentSelectionLimitSettings() {
    const key = this.getDisposalSelectionKey();
    if (!key) {
      this.applyLimitSettings(this.getDefaultLimitSettings());
      return;
    }
    this.applyLimitSettings(this.disposalLimitSettings[key] || this.getDefaultLimitSettings());
  }

  isSafeGhgSelection() {
    return this.selectedDisposalResource?.category === 'atmospheric'
      && this.selectedDisposalResource?.resource === 'greenhouseGas';
  }

  getSelectedDisposalMeta() {
    const elements = projectElements[this.name];
    const selection = this.selectedDisposalResource;
    if (!elements || !selection) {
      return null;
    }
    const selectionKey = `${selection.category}:${selection.resource}`;
    const meta = elements.disposalResourceMetaLookup?.[selectionKey];
    if (meta) {
      return meta;
    }
    if (selection.category === 'atmospheric') {
      return { phaseType: 'gas' };
    }
    return { phaseType: null };
  }

  shouldShowPressureControl() {
    const selectedMeta = this.getSelectedDisposalMeta();
    return selectedMeta?.phaseType === 'gas';
  }

  shouldShowCoverageControl() {
    const selectedMeta = this.getSelectedDisposalMeta();
    return selectedMeta?.phaseType === 'liquid' || selectedMeta?.phaseType === 'ice';
  }

  getSelectedCoverageResourceKey() {
    const selectedMeta = this.getSelectedDisposalMeta();
    const selection = this.selectedDisposalResource;
    if (!selectedMeta || !selection || selection.category !== 'surface') {
      return null;
    }
    if (selectedMeta.phaseType === 'liquid' || selectedMeta.phaseType === 'ice') {
      return selection.resource;
    }
    return null;
  }

  createThresholdToggleControl(config) {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', config.className);
    control.id = `${this.name}-${config.key}-control`;
    control.style.display = 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-${config.key}-checkbox`;
    checkbox.classList.add(`${config.key}-checkbox`);
    checkbox.checked = this[config.enabledProp];
    checkbox.addEventListener('change', () => {
      this[config.enabledProp] = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = config.labelText;
    label.htmlFor = checkbox.id;
    control.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.classList.add(`${config.key}-input`);
    input.value = formatNumber(config.toDisplay(this[config.thresholdProp]), true, 2);
    wireStringNumberInput(input, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (value) => formatNumber(Math.max(0, value), true, 2),
      onValue: (value) => {
        this[config.thresholdProp] = config.fromDisplay(Math.max(0, value));
      },
      datasetKey: config.datasetKey,
    });
    control.appendChild(input);

    const unitLabel = document.createElement('span');
    unitLabel.classList.add(`${config.key}-unit`);
    unitLabel.textContent = config.unit;
    control.appendChild(unitLabel);

    projectElements[this.name] = {
      ...projectElements[this.name],
      [config.controlElementKey]: control,
      [config.checkboxElementKey]: checkbox,
      [config.inputElementKey]: input,
      [config.unitElementKey]: unitLabel,
    };

    return control;
  }

  createPressureControl() {
    return this.createThresholdToggleControl({
      key: 'pressure',
      className: 'pressure-control',
      enabledProp: 'disableBelowPressure',
      thresholdProp: 'disablePressureThreshold',
      labelText: 'Disable if pressure below: ',
      datasetKey: 'pressurePa',
      toDisplay: (value) => value * 1000,
      fromDisplay: (value) => value / 1000,
      unit: 'Pa',
      controlElementKey: 'pressureControl',
      checkboxElementKey: 'pressureCheckbox',
      inputElementKey: 'pressureInput',
      unitElementKey: 'pressureUnitLabel',
    });
  }

  createCoverageControl() {
    return this.createThresholdToggleControl({
      key: 'coverage',
      className: 'coverage-control',
      enabledProp: 'disableBelowCoverage',
      thresholdProp: 'disableCoverageThreshold',
      labelText: 'Disable if coverage below: ',
      datasetKey: 'coveragePercent',
      toDisplay: (value) => value * 100,
      fromDisplay: (value) => Math.max(0, Math.min(100, value)) / 100,
      unit: '%',
      controlElementKey: 'coverageControl',
      checkboxElementKey: 'coverageCheckbox',
      inputElementKey: 'coverageInput',
      unitElementKey: 'coverageUnitLabel',
    });
  }

  createTemperatureControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'temperature-control');
    control.id = `${this.name}-temperature-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-temperature-checkbox`;
    checkbox.classList.add('temperature-checkbox');
    checkbox.checked = this.disableBelowTemperature;
    checkbox.addEventListener('change', () => {
      this.disableBelowTemperature = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if temperature below: ';
    label.htmlFor = checkbox.id;
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
    if (!elements.coverageControl) {
      container.appendChild(this.createCoverageControl());
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
    const showTemperatureControl = this.isSafeGhgSelection();
    const showPressureControl = this.shouldShowPressureControl();
    const showCoverageControl = this.shouldShowCoverageControl();

    if (elements.temperatureControl) {
      elements.temperatureControl.style.display = hasMonitoring && showTemperatureControl ? 'flex' : 'none';
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
      elements.pressureControl.style.display = hasMonitoring && showPressureControl ? 'flex' : 'none';
    }
    if (elements.pressureCheckbox) {
      elements.pressureCheckbox.checked = this.disableBelowPressure;
    }
    if (elements.pressureInput && document.activeElement !== elements.pressureInput) {
      elements.pressureInput.value = formatNumber(this.disablePressureThreshold * 1000, true, 2);
    }
    if (elements.pressureUnitLabel) {
      elements.pressureUnitLabel.textContent = 'Pa';
    }

    if (elements.coverageControl) {
      elements.coverageControl.style.display = hasMonitoring && showCoverageControl ? 'flex' : 'none';
    }
    if (elements.coverageCheckbox) {
      elements.coverageCheckbox.checked = this.disableBelowCoverage;
    }
    if (elements.coverageInput && document.activeElement !== elements.coverageInput) {
      elements.coverageInput.value = formatNumber(this.disableCoverageThreshold * 100, true, 2);
    }
    if (elements.coverageUnitLabel) {
      elements.coverageUnitLabel.textContent = '%';
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
        const activeShips = this.getActiveShipCount();
        total *= activeShips * (1000 / this.getEffectiveDuration());
        elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(total, true)}/s`;
      } else {
        elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(total, true)}`;
      }
      const disposalShortfall = this.disposalShortfallLastTick === true;
      elements.totalDisposalElement.style.color = disposalShortfall ? 'red' : '';
    }

    if (elements.maxDisposalText && typeof this.getExportCap === 'function') {
      elements.maxDisposalText.textContent = `Max Export Capacity: ${formatNumber(this.getExportCap(), true)} /s`;
    }
    
    if (elements.gainPerResourceElement && this.attributes.fundingGainAmount) {
        elements.gainPerResourceElement.textContent = `Gain/Resource: ${formatNumber(this.attributes.fundingGainAmount, true)}`;
    }

    if (elements.disposalTypeSelect && elements.disposalPhaseSelect) {
      const selection =
        this.selectedDisposalResource || elements.disposalGroups[0].options[0];
      const selectionKey = `${selection.category}:${selection.resource}`;
      const groupKey =
        elements.disposalResourceGroupLookup[selectionKey] || elements.disposalGroups[0].key;
      elements.disposalTypeSelect.value = groupKey;
      this.setDisposalSelection(elements, groupKey, selectionKey);
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
      multiplier = this.getActiveShipCount() * (1000 / this.getEffectiveDuration());
    }
    return {
      colony: {
        funding: totalDisposalAmount * this.attributes.fundingGainAmount * multiplier,
      },
    };
  }

  getClampedDisposalAmount(requestedAmount, category, resource, availableAmount) {
    const maxByAvailable = super.getClampedDisposalAmount(
      requestedAmount,
      category,
      resource,
      availableAmount
    );
    if (maxByAvailable <= 0) {
      return 0;
    }

    const floorAmount = this.getDisposalLowerLimitFloorAmount(category, resource, availableAmount);
    if (floorAmount <= 0) {
      return maxByAvailable;
    }

    const maxDisposableByFloor = Math.max(0, availableAmount - floorAmount);
    return Math.max(0, Math.min(maxByAvailable, maxDisposableByFloor));
  }

  getDisposalLowerLimitFloorAmount(category, resource, availableAmount) {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (!hasMonitoring) {
      return 0;
    }
    if (!this.selectedDisposalResource) {
      return 0;
    }
    if (category !== this.selectedDisposalResource.category || resource !== this.selectedDisposalResource.resource) {
      return 0;
    }

    let floorAmount = 0;

    if (this.disableBelowPressure && this.shouldShowPressureControl()) {
      floorAmount = Math.max(
        floorAmount,
        this.getPressureFloorAmount(availableAmount)
      );
    }

    if (this.disableBelowCoverage && this.shouldShowCoverageControl()) {
      floorAmount = Math.max(
        floorAmount,
        this.getCoverageFloorAmount(category, resource)
      );
    }

    if (this.disableBelowTemperature && this.isSafeGhgSelection()) {
      floorAmount = Math.max(
        floorAmount,
        this.getGreenhouseTemperatureFloorAmount(availableAmount)
      );
    }

    return floorAmount;
  }

  getPressureFloorAmount() {
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const pressurePerUnitPa = calculateAtmosphericPressure(1, gravity, radius);
    if (pressurePerUnitPa <= 0) {
      return 0;
    }
    return (this.disablePressureThreshold * 1000) / pressurePerUnitPa;
  }

  getCoverageFloorAmount(category, resource) {
    if (category !== 'surface') {
      return 0;
    }
    const coverageKey = this.getSelectedCoverageResourceKey();
    if (!coverageKey || resource !== coverageKey) {
      return 0;
    }
    const descriptor = this.getZonalDisposalDescriptor(category, resource);
    if (!descriptor) {
      return 0;
    }

    const zones = getZones();
    const zoneEntries = zones.map((zone) => {
      const zoneArea = terraforming.zonalCoverageCache?.[zone]?.zoneArea || 0;
      return {
        amount: descriptor.container[zone]?.[descriptor.key] || 0,
        zoneArea,
        weight: getZonePercentage(zone),
      };
    });

    const totalAmount = zoneEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (totalAmount <= 0) {
      return 0;
    }

    const currentCoverage = this.calculateCoverageForTotalAmount(zoneEntries, totalAmount);
    if (currentCoverage <= this.disableCoverageThreshold) {
      return totalAmount;
    }

    let low = 0;
    let high = totalAmount;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      const coverage = this.calculateCoverageForTotalAmount(zoneEntries, mid);
      if (coverage >= this.disableCoverageThreshold) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return high;
  }

  calculateCoverageForTotalAmount(zoneEntries, totalAmount) {
    if (totalAmount <= 0) {
      return 0;
    }
    const currentTotal = zoneEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (currentTotal <= 0) {
      return 0;
    }
    const scale = totalAmount / currentTotal;
    const totalWeight = zoneEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const weightDivisor = totalWeight > 0 ? totalWeight : zoneEntries.length;
    let weightedCoverage = 0;

    zoneEntries.forEach((entry) => {
      const amount = entry.amount * scale;
      const coverage = estimateCoverage(amount, entry.zoneArea);
      const weight = totalWeight > 0 ? entry.weight : 1;
      weightedCoverage += coverage * (weight / weightDivisor);
    });

    return Math.max(0, Math.min(1, weightedCoverage));
  }

  getGreenhouseTemperatureFloorAmount(availableAmount) {
    const ghg = resources.atmospheric.greenhouseGas;
    const currentAmount = Math.max(0, Math.min(availableAmount, ghg.value));
    if (currentAmount <= 0) {
      return 0;
    }

    const currentTemp = this.getAutomationTemperatureReading();
    if (currentTemp <= this.disableTemperatureThreshold) {
      return currentAmount;
    }

    let low = 0;
    let high = currentAmount;
    for (let i = 0; i < 12; i += 1) {
      const mid = (low + high) / 2;
      const temp = this.calculateTemperatureForGreenhouseAmount(mid);
      if (temp >= this.disableTemperatureThreshold) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return high;
  }

  calculateTemperatureForGreenhouseAmount(targetAmount) {
    const ghg = resources.atmospheric.greenhouseGas;
    const originalAmount = ghg.value;
    const snapshot = terraforming.saveTemperatureState ? terraforming.saveTemperatureState() : null;
    let projected = terraforming.temperature.trendValue || 0;

    try {
      ghg.value = Math.max(0, targetAmount);
      terraforming.updateSurfaceTemperature(0);
      projected = terraforming.temperature?.trendValue || projected;
    } finally {
      ghg.value = originalAmount;
      if (snapshot && terraforming.restoreTemperatureState) {
        terraforming.restoreTemperatureState(snapshot);
      } else {
        terraforming.updateSurfaceTemperature(0);
      }
    }

    return projected;
  }

  shouldAutomationDisable() {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (hasMonitoring && this.disableBelowTemperature && this.isSafeGhgSelection()) {
      const temp = this.getAutomationTemperatureReading();
      if (temp <= this.disableTemperatureThreshold) {
        return true;
      }
    }
    if (hasMonitoring && this.disableBelowPressure && this.shouldShowPressureControl()) {
      const resource = resources.atmospheric?.[this.selectedDisposalResource.resource];
      if (resource) {
        const amount = resource.value || 0;
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
    if (hasMonitoring && this.disableBelowCoverage && this.shouldShowCoverageControl()) {
      const coverageKey = this.getSelectedCoverageResourceKey();
      if (coverageKey) {
        const coverage = calculateAverageCoverage(terraforming, coverageKey) || 0;
        if (coverage <= this.disableCoverageThreshold) {
          return true;
        }
      }
    }
    return false;
  }

  canStart() {
    if (!super.canStart()) return false;

    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (hasMonitoring && this.disableBelowTemperature && this.isSafeGhgSelection()) {
      const temp = this.getAutomationTemperatureReading();
      if (temp <= this.disableTemperatureThreshold) {
        return false;
      }
    }

    if (hasMonitoring && this.disableBelowPressure && this.shouldShowPressureControl()) {
      const resource = resources.atmospheric?.[this.selectedDisposalResource.resource];
      if (resource) {
        const amount = resource.value || 0;
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

    if (hasMonitoring && this.disableBelowCoverage && this.shouldShowCoverageControl()) {
      const coverageKey = this.getSelectedCoverageResourceKey();
      if (coverageKey) {
        const coverage = calculateAverageCoverage(terraforming, coverageKey) || 0;
        if (coverage <= this.disableCoverageThreshold) {
          return false;
        }
      }
    }

    return true;
  }

  saveState() {
    this.saveCurrentSelectionLimitSettings();
    return {
      ...super.saveState(),
      disableBelowTemperature: this.disableBelowTemperature,
      disableTemperatureThreshold: this.disableTemperatureThreshold,
      disableBelowPressure: this.disableBelowPressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableBelowCoverage: this.disableBelowCoverage,
      disableCoverageThreshold: this.disableCoverageThreshold,
      disposalLimitSettings: this.disposalLimitSettings,
      pressureUnit: 'Pa',
    };
  }

  saveTravelState() {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return {};
    }
    this.saveCurrentSelectionLimitSettings();
    return {
      selectedDisposalResource: this.selectedDisposalResource,
      disableBelowTemperature: this.disableBelowTemperature,
      disableTemperatureThreshold: this.disableTemperatureThreshold,
      disableBelowPressure: this.disableBelowPressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableBelowCoverage: this.disableBelowCoverage,
      disableCoverageThreshold: this.disableCoverageThreshold,
      disposalLimitSettings: this.disposalLimitSettings,
      pressureUnit: 'Pa',
    };
  }

  loadTravelState(state = {}) {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return;
    }
    this.selectedDisposalResource = state.selectedDisposalResource || this.selectedDisposalResource;
    this.disposalLimitSettings = state.disposalLimitSettings || this.disposalLimitSettings || {};
    if (!state.disposalLimitSettings) {
      this.applyLimitSettings({
        disableBelowTemperature: state.disableBelowTemperature ?? this.disableBelowTemperature,
        disableTemperatureThreshold: state.disableTemperatureThreshold ?? this.disableTemperatureThreshold,
        disableBelowPressure: state.disableBelowPressure ?? this.disableBelowPressure,
        disablePressureThreshold: state.disablePressureThreshold ?? this.disablePressureThreshold,
        disableBelowCoverage: state.disableBelowCoverage ?? this.disableBelowCoverage,
        disableCoverageThreshold: state.disableCoverageThreshold ?? this.disableCoverageThreshold,
      });
      this.saveCurrentSelectionLimitSettings();
    }
    this.loadCurrentSelectionLimitSettings();
    this.pressureUnit = 'Pa';
  }

  loadState(state) {
    super.loadState(state);
    this.disposalLimitSettings = state.disposalLimitSettings || {};
    if (!state.disposalLimitSettings) {
      this.applyLimitSettings({
        disableBelowTemperature: state.disableBelowTemperature || false,
        disableTemperatureThreshold: Number.isFinite(state.disableTemperatureThreshold) ? state.disableTemperatureThreshold : 303.15,
        disableBelowPressure: state.disableBelowPressure || false,
        disablePressureThreshold: Number.isFinite(state.disablePressureThreshold) ? state.disablePressureThreshold : 0,
        disableBelowCoverage: state.disableBelowCoverage || false,
        disableCoverageThreshold: Number.isFinite(state.disableCoverageThreshold) ? state.disableCoverageThreshold : 0,
      });
      this.saveCurrentSelectionLimitSettings();
    }
    this.loadCurrentSelectionLimitSettings();
    this.pressureUnit = 'Pa';
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportBaseProject = SpaceExportBaseProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportBaseProject;
}
