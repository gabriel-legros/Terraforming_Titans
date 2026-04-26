class SpaceDisposalProject extends SpaceExportBaseProject {
  getSpaceDisposalText(path, fallback, vars) {
    try {
      return t(path, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  constructor(config, name) {
    super(config, name);
    this.massDriverEnabled = false;
    this.massDriverShipEquivalency = this.attributes.massDriverShipEquivalency ?? 10;
    this.maxDisposalTargets = 10;
    this.nextDisposalTargetId = 1;
    this.disposalTargets = [];
    this.ensureDisposalTargets();
  }

  isPlanetaryMassSelection(selection) {
    return selection?.category === 'special' && selection?.resource === 'planetaryMass';
  }

  canUsePlanetaryMassDisposal() {
    return hasDynamicMassEnabled(terraforming, currentPlanetParameters);
  }

  getSelectionAvailableAmount(selection, accumulatedChanges = null) {
    if (!selection) {
      return 0;
    }
    if (this.isPlanetaryMassSelection(selection)) {
      return getDynamicWorldPlanetaryMassAvailableTons(terraforming);
    }
    return this.getEffectiveAvailableAmount(selection.category, selection.resource, accumulatedChanges);
  }

  disposeSelectionAmount(selection, amount) {
    if (!selection || amount <= 0) {
      return 0;
    }
    if (this.isPlanetaryMassSelection(selection)) {
      return disposeDynamicWorldPlanetaryMass(terraforming, amount);
    }
    resources[selection.category][selection.resource].decrease(amount);
    if (selection.category === 'surface') {
      terraforming.distributeSurfaceChangesToZones({ [selection.resource]: -amount });
    }
    return amount;
  }

  buildDisposalGroupData() {
    const disposalGroupData = super.buildDisposalGroupData();
    if (!this.canUsePlanetaryMassDisposal()) {
      return disposalGroupData;
    }

    const option = {
      category: 'special',
      resource: 'planetaryMass',
      label: this.getSpaceDisposalText('ui.projects.spaceDisposal.planetaryMass', 'Planetary Mass'),
    };
    const groupKey = 'specialPlanetaryMass';
    const resourceKey = `${option.category}:${option.resource}`;
    disposalGroupData.groupList.push({
      key: groupKey,
      label: option.label,
      options: [option],
    });
    disposalGroupData.groupMap[groupKey] = disposalGroupData.groupList[disposalGroupData.groupList.length - 1];
    disposalGroupData.resourceGroupLookup[resourceKey] = groupKey;
    disposalGroupData.resourceMetaLookup[resourceKey] = {
      groupKey,
      phaseType: null,
    };
    return disposalGroupData;
  }

  getAutomationTemperatureReading() {
    const trend = terraforming.temperature.trendValue;
    if (Number.isFinite(trend)) {
      return trend;
    }
    return super.getAutomationTemperatureReading();
  }

  getExportRateLabel() {
    return this.getSpaceDisposalText('ui.projects.spaceDisposal.resourceDisposal', 'Resource Disposal');
  }

  getCostRateLabel() {
    return this.getSpaceDisposalText('ui.projects.spaceDisposal.resourceDisposal', 'Resource Disposal');
  }

  getDefaultDisposalSelection() {
    const disposalGroupData = this.getDisposalGroupData();
    const firstGroup = disposalGroupData.groupList[0];
    if (!firstGroup || !firstGroup.options.length) {
      return null;
    }
    const firstOption = firstGroup.options[0];
    return {
      category: firstOption.category,
      resource: firstOption.resource,
    };
  }

  cloneSelection(selection) {
    if (!selection || !selection.category || !selection.resource) {
      return null;
    }
    return {
      category: selection.category,
      resource: selection.resource,
    };
  }

  createDisposalTarget(overrides = {}) {
    const defaults = this.getDefaultLimitSettings();
    const selection = this.cloneSelection(overrides.selectedDisposalResource)
      || this.cloneSelection(this.selectedDisposalResource)
      || this.getDefaultDisposalSelection();
    const target = {
      id: overrides.id ?? this.nextDisposalTargetId++,
      selectedDisposalResource: selection,
      autoStart: overrides.autoStart === true,
      waitForCapacity: overrides.waitForCapacity !== false,
      disableBelowTemperature: overrides.disableBelowTemperature === true,
      disableTemperatureThreshold: overrides.disableTemperatureThreshold ?? defaults.disableTemperatureThreshold,
      disableBelowPressure: overrides.disableBelowPressure === true,
      disablePressureThreshold: overrides.disablePressureThreshold ?? defaults.disablePressureThreshold,
      disableBelowCoverage: overrides.disableBelowCoverage === true,
      disableCoverageThreshold: overrides.disableCoverageThreshold ?? defaults.disableCoverageThreshold,
    };
    if (target.id >= this.nextDisposalTargetId) {
      this.nextDisposalTargetId = target.id + 1;
    }
    return target;
  }

  ensureDisposalTargets() {
    if (Array.isArray(this.disposalTargets) && this.disposalTargets.length) {
      this.sanitizeDisposalTargets();
      return;
    }
    this.disposalTargets = [this.createLegacyTarget()];
    this.sanitizeDisposalTargets();
  }

  createLegacyTarget() {
    const legacySelection = this.cloneSelection(this.selectedDisposalResource) || this.getDefaultDisposalSelection();
    const legacyKey = legacySelection ? `${legacySelection.category}:${legacySelection.resource}` : null;
    const legacySettings = legacyKey && this.disposalLimitSettings
      ? this.disposalLimitSettings[legacyKey]
      : null;
    const settings = legacySettings || {
      disableBelowTemperature: this.disableBelowTemperature,
      disableTemperatureThreshold: this.disableTemperatureThreshold,
      disableBelowPressure: this.disableBelowPressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableBelowCoverage: this.disableBelowCoverage,
      disableCoverageThreshold: this.disableCoverageThreshold,
    };
    return this.createDisposalTarget({
      selectedDisposalResource: legacySelection,
      autoStart: this.autoStart === true,
      waitForCapacity: this.waitForCapacity !== false,
      disableBelowTemperature: settings.disableBelowTemperature === true,
      disableTemperatureThreshold: settings.disableTemperatureThreshold,
      disableBelowPressure: settings.disableBelowPressure === true,
      disablePressureThreshold: settings.disablePressureThreshold,
      disableBelowCoverage: settings.disableBelowCoverage === true,
      disableCoverageThreshold: settings.disableCoverageThreshold,
    });
  }

  sanitizeDisposalTargets() {
    const disposalGroupData = this.getDisposalGroupData();
    const validKeys = disposalGroupData.resourceGroupLookup || {};
    const sanitized = [];
    for (let i = 0; i < (this.disposalTargets || []).length && sanitized.length < this.maxDisposalTargets; i += 1) {
      const rawTarget = this.disposalTargets[i];
      if (!rawTarget) {
        continue;
      }
      const target = this.createDisposalTarget(rawTarget);
      const selection = target.selectedDisposalResource;
      const key = selection ? `${selection.category}:${selection.resource}` : null;
      if (!key || !validKeys[key]) {
        target.selectedDisposalResource = this.getDefaultDisposalSelection();
      }
      sanitized.push(target);
    }
    if (!sanitized.length) {
      sanitized.push(this.createLegacyTarget());
    }
    this.disposalTargets = sanitized;
    this.syncLegacySelectionState();
  }

  syncLegacySelectionState() {
    const firstTarget = this.disposalTargets[0];
    this.selectedDisposalResource = firstTarget ? this.cloneSelection(firstTarget.selectedDisposalResource) : null;
    this.waitForCapacity = firstTarget ? firstTarget.waitForCapacity !== false : true;
    this.disableBelowTemperature = firstTarget ? firstTarget.disableBelowTemperature === true : false;
    this.disableTemperatureThreshold = firstTarget ? firstTarget.disableTemperatureThreshold : 303.15;
    this.disableBelowPressure = firstTarget ? firstTarget.disableBelowPressure === true : false;
    this.disablePressureThreshold = firstTarget ? firstTarget.disablePressureThreshold : 0;
    this.disableBelowCoverage = firstTarget ? firstTarget.disableBelowCoverage === true : false;
    this.disableCoverageThreshold = firstTarget ? firstTarget.disableCoverageThreshold : 0;
    this.autoStart = this.hasAnyAutoStartTarget();
  }

  cloneDisposalTargets() {
    return this.disposalTargets.map(target => ({
      id: target.id,
      selectedDisposalResource: this.cloneSelection(target.selectedDisposalResource),
      autoStart: target.autoStart === true,
      waitForCapacity: target.waitForCapacity !== false,
      disableBelowTemperature: target.disableBelowTemperature === true,
      disableTemperatureThreshold: target.disableTemperatureThreshold,
      disableBelowPressure: target.disableBelowPressure === true,
      disablePressureThreshold: target.disablePressureThreshold,
      disableBelowCoverage: target.disableBelowCoverage === true,
      disableCoverageThreshold: target.disableCoverageThreshold,
    }));
  }

  hasAnyAutoStartTarget() {
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      if (this.disposalTargets[i].autoStart) {
        return true;
      }
    }
    return false;
  }

  getTargetSelectionKey(target) {
    const selection = target?.selectedDisposalResource;
    if (!selection || !selection.category || !selection.resource) {
      return '';
    }
    return `${selection.category}:${selection.resource}`;
  }

  getDisposalSelectionSignature() {
    const parts = [];
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const target = this.disposalTargets[i];
      parts.push([
        this.getTargetSelectionKey(target),
        target.autoStart ? 1 : 0,
        target.waitForCapacity ? 1 : 0,
        target.disableBelowTemperature ? 1 : 0,
        target.disableTemperatureThreshold,
        target.disableBelowPressure ? 1 : 0,
        target.disablePressureThreshold,
        target.disableBelowCoverage ? 1 : 0,
        target.disableCoverageThreshold,
      ].join(':'));
    }
    return parts.join('|');
  }

  getTargetById(targetId) {
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      if (this.disposalTargets[i].id === targetId) {
        return this.disposalTargets[i];
      }
    }
    return null;
  }

  getAutoStartTargets() {
    return this.disposalTargets.filter(target => target.autoStart && target.selectedDisposalResource);
  }

  canTargetStart(target) {
    if (!this.canTargetRun(target)) {
      return false;
    }

    const selection = target.selectedDisposalResource;
    const available = this.getSelectionAvailableAmount(selection);
    if (target.waitForCapacity) {
      const key = `${selection.category}:${selection.resource}`;
      const requirements = this.getTargetWaitRequirementMap([target], 1);
      return available >= (requirements[key] || 0);
    }

    return this.getTargetClampedDisposalAmount(
      target,
      this.getShipCapacity(),
      selection.category,
      selection.resource,
      available
    ) > 0;
  }

  getRunnableTargets() {
    const autoTargets = this.getAutoStartTargets();
    return autoTargets.filter(target => this.canTargetStart(target));
  }

  getDisposalTargetsForDisplay() {
    return this.getRunnableTargets();
  }

  getTargetShare(targetId, targetList = this.getDisposalTargetsForDisplay()) {
    if (!targetList.length) {
      return 0;
    }
    for (let i = 0; i < targetList.length; i += 1) {
      if (targetList[i].id === targetId) {
        return 1 / targetList.length;
      }
    }
    return 0;
  }

  getTargetTransportCount(target, transportCount, targetList) {
    if (!target || !targetList.length || transportCount <= 0) {
      return 0;
    }
    return transportCount / targetList.length;
  }

  getTargetMeta(target) {
    const selection = target?.selectedDisposalResource;
    if (!selection) {
      return null;
    }
    const selectionKey = `${selection.category}:${selection.resource}`;
    const disposalGroupData = this.getDisposalGroupData();
    const meta = disposalGroupData.resourceMetaLookup?.[selectionKey];
    return meta || this.getFallbackDisposalMeta(selection);
  }

  isTargetSafeGhgSelection(target) {
    const selection = target?.selectedDisposalResource;
    return selection?.category === 'atmospheric' && selection?.resource === 'greenhouseGas';
  }

  shouldTargetShowPressureControl(target) {
    return this.getTargetMeta(target)?.phaseType === 'gas';
  }

  shouldTargetShowCoverageControl(target) {
    const phaseType = this.getTargetMeta(target)?.phaseType;
    return phaseType === 'liquid' || phaseType === 'ice';
  }

  getTargetCoverageResourceKey(target) {
    const selection = target?.selectedDisposalResource;
    if (!selection || selection.category !== 'surface') {
      return null;
    }
    const phaseType = this.getTargetMeta(target)?.phaseType;
    if (phaseType === 'liquid' || phaseType === 'ice') {
      return selection.resource;
    }
    return null;
  }

  canTargetRun(target) {
    if (!target || !target.selectedDisposalResource) {
      return false;
    }
    if (!this.isBooleanFlagSet('atmosphericMonitoring')) {
      return true;
    }

    if (target.disableBelowTemperature && this.isTargetSafeGhgSelection(target)) {
      if (this.getAutomationTemperatureReading() <= target.disableTemperatureThreshold) {
        return false;
      }
    }

    if (target.disableBelowPressure && this.shouldTargetShowPressureControl(target)) {
      const selection = target.selectedDisposalResource;
      const amount = resources.atmospheric[selection.resource].value || 0;
      const pressurePa = calculateAtmosphericPressure(
        amount,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      if ((pressurePa / 1000) <= target.disablePressureThreshold) {
        return false;
      }
    }

    if (target.disableBelowCoverage && this.shouldTargetShowCoverageControl(target)) {
      const coverageKey = this.getTargetCoverageResourceKey(target);
      if (coverageKey && (calculateAverageCoverage(terraforming, coverageKey) || 0) <= target.disableCoverageThreshold) {
        return false;
      }
    }

    return true;
  }

  getTargetStatusText(target, activeTargets) {
    if (!target.autoStart) {
      return this.getSpaceDisposalText('ui.projects.spaceDisposal.status.idle', 'Idle');
    }
    if (!this.canTargetRun(target)) {
      return this.getSpaceDisposalText('ui.projects.spaceDisposal.status.blocked', 'Blocked');
    }
    for (let i = 0; i < activeTargets.length; i += 1) {
      if (activeTargets[i].id === target.id) {
        return this.getSpaceDisposalText('ui.projects.spaceDisposal.status.active', 'Active');
      }
    }
    return this.getSpaceDisposalText('ui.projects.spaceDisposal.status.waiting', 'Waiting');
  }

  getTargetStatusDetail(target) {
    if (!target.autoStart) {
      return this.getSpaceDisposalText('ui.projects.spaceDisposal.statusDetail.enableAutoStart', 'Enable auto start to include this target in disposal runs.');
    }
    if (this.canTargetRun(target)) {
      return this.getSpaceDisposalText('ui.projects.spaceDisposal.statusDetail.included', 'Included in the current disposal split.');
    }
    if (target.disableBelowTemperature && this.isTargetSafeGhgSelection(target)) {
      return this.getSpaceDisposalText(
        'ui.projects.spaceDisposal.statusDetail.temperatureBelow',
        `Temperature below ${formatNumber(toDisplayTemperature(target.disableTemperatureThreshold), false, 2)}${getTemperatureUnit()}.`,
        { value: `${formatNumber(toDisplayTemperature(target.disableTemperatureThreshold), false, 2)}${getTemperatureUnit()}` }
      );
    }
    if (target.disableBelowPressure && this.shouldTargetShowPressureControl(target)) {
      return this.getSpaceDisposalText(
        'ui.projects.spaceDisposal.statusDetail.pressureBelow',
        `Pressure below ${formatNumber(target.disablePressureThreshold * 1000, true, 2)} Pa.`,
        { value: formatNumber(target.disablePressureThreshold * 1000, true, 2) }
      );
    }
    if (target.disableBelowCoverage && this.shouldTargetShowCoverageControl(target)) {
      return this.getSpaceDisposalText(
        'ui.projects.spaceDisposal.statusDetail.coverageBelow',
        `Coverage below ${formatNumber(target.disableCoverageThreshold * 100, true, 2)}%.`,
        { value: formatNumber(target.disableCoverageThreshold * 100, true, 2) }
      );
    }
    return this.getSpaceDisposalText('ui.projects.spaceDisposal.statusDetail.unavailable', 'Unavailable.');
  }

  getTargetWaitRequirementMap(targets, transportCount) {
    const requirements = {};
    if (!targets.length || transportCount <= 0) {
      return requirements;
    }

    const shipCost = this.calculateSpaceshipCost();
    const projectCost = this.getScaledCost();

    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (!target.waitForCapacity) {
        continue;
      }
      const selection = target.selectedDisposalResource;
      const key = `${selection.category}:${selection.resource}`;
      requirements[key] = (requirements[key] || 0) + this.getShipCapacity();
    }

    for (const key in requirements) {
      const [category, resource] = key.split(':');
      if (category === 'special') {
        continue;
      }
      requirements[key] += shipCost[category]?.[resource] || 0;
      requirements[key] += projectCost[category]?.[resource] || 0;
    }

    return requirements;
  }

  createResourceDisposalUI() {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.export', 'Export');
    sectionContainer.appendChild(title);

    const detailsGrid = document.createElement('div');
    detailsGrid.classList.add('project-details-grid', 'resource-disposal-summary-grid');

    const disposalPerShip = document.createElement('div');
    disposalPerShip.id = `${this.name}-disposal-per-ship`;

    const totalDisposal = document.createElement('div');
    totalDisposal.id = `${this.name}-total-disposal`;

    const tempReduction = document.createElement('div');
    tempReduction.id = `${this.name}-temperature-reduction`;

    detailsGrid.append(disposalPerShip, totalDisposal, tempReduction);
    sectionContainer.appendChild(detailsGrid);

    projectElements[this.name] = {
      ...projectElements[this.name],
      disposalDetailsGrid: detailsGrid,
      disposalPerShipElement: disposalPerShip,
      totalDisposalElement: totalDisposal,
      temperatureReductionElement: tempReduction,
    };

    return sectionContainer;
  }

  renderUI(container) {
    super.renderUI(container);

    const elements = projectElements[this.name] || {};
    if (elements.massDriverInfoSection) {
      return;
    }

    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container', 'resource-disposal-builder-section');

    const title = document.createElement('h4');
    title.classList.add('section-title');
    title.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.massDrivers', 'Mass Drivers');
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
    activeLabel.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.active', 'Active: ');
    const activeValue = document.createElement('span');
    activeValue.id = `${this.name}-active-mass-drivers`;
    activeValue.classList.add('mass-driver-count');
    activeContainer.append(activeLabel, activeValue);

    const builtContainer = document.createElement('div');
    builtContainer.classList.add('available-ships-container');
    const builtLabel = document.createElement('span');
    builtLabel.classList.add('mass-driver-built-label');
    builtLabel.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.built', 'Built: ');
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

    const zeroButton = createButton(this.getSpaceDisposalText('ui.projects.common.zero', '0'), () => {
      applyManualMassDriverChange(() => this.setMassDriverActive(0));
    }, mainButtons);

    const decreaseButton = createButton('', () => {
      applyManualMassDriverChange(() => this.adjustMassDriverActive(-1));
    }, mainButtons);

    const increaseButton = createButton('', () => {
      applyManualMassDriverChange(() => this.adjustMassDriverActive(1));
    }, mainButtons);

    const maxButton = createButton(this.getSpaceDisposalText('ui.projects.common.max', 'Max'), () => {
      const structure = this.getMassDriverStructure();
      applyManualMassDriverChange(() => this.setMassDriverActive(structure.count));
    }, mainButtons);

    const autoContainer = document.createElement('label');
    autoContainer.classList.add('auto-active-container');

    const maxAutoActiveCheckbox = document.createElement('input');
    maxAutoActiveCheckbox.type = 'checkbox';
    maxAutoActiveCheckbox.classList.add('auto-active-checkbox');
    maxAutoActiveCheckbox.checked = this.getMassDriverStructure().autoActiveEnabled;
    maxAutoActiveCheckbox.addEventListener('change', (event) => {
      event.stopPropagation();
      if (maxAutoActiveCheckbox.disabled) {
        maxAutoActiveCheckbox.checked = this.getMassDriverStructure().autoActiveEnabled;
        return;
      }
      const structure = this.getMassDriverStructure();
      structure.autoActiveEnabled = maxAutoActiveCheckbox.checked;
      if (structure.autoActiveEnabled) {
        this.setMassDriverActive(structure.count);
        updateBuildingDisplay(buildings);
      }
      this.updateUI();
    });
    maxAutoActiveCheckbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    const autoLabel = document.createElement('span');
    autoLabel.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.setActiveToTarget', 'Set active to target');
    autoContainer.append(maxAutoActiveCheckbox, autoLabel);
    mainButtons.appendChild(autoContainer);

    const multiplierContainer = document.createElement('div');
    multiplierContainer.classList.add('multiplier-container');
    buttonsContainer.appendChild(multiplierContainer);

    const divideButton = createButton(this.getSpaceDisposalText('ui.projects.common.divideTen', '/10'), () => {
      disableAutoActive(this.getMassDriverStructure());
      this.shiftMassDriverStep(false);
      this.updateUI();
    }, multiplierContainer);

    const multiplyButton = createButton(this.getSpaceDisposalText('ui.projects.common.timesTen', 'x10'), () => {
      disableAutoActive(this.getMassDriverStructure());
      this.shiftMassDriverStep(true);
      this.updateUI();
    }, multiplierContainer);

    infoContent.append(statusContainer, buttonsContainer);
    sectionContainer.appendChild(infoContent);

    const infoNote = document.createElement('p');
    infoNote.classList.add('project-description', 'mass-driver-note');
    infoNote.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.massDriverNote', 'Electromagnetic launch rails fling cargo without rockets. Each Mass Driver counts as 10 spaceships.');
    sectionContainer.appendChild(infoNote);

    const builderHeader = document.createElement('div');
    builderHeader.classList.add('resource-disposal-builder-header');

    const builderCopy = document.createElement('div');
    builderCopy.classList.add('resource-disposal-builder-copy');

    const builderHeading = document.createElement('div');
    builderHeading.classList.add('resource-disposal-builder-heading');
    builderHeading.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.disposalTargets', 'Disposal Targets');

    const builderSubheading = document.createElement('div');
    builderSubheading.classList.add('resource-disposal-builder-subheading');
    builderSubheading.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.disposalTargetsSubheading', 'Configure up to 10 resources. Active auto-start targets split assigned disposal evenly.');

    builderCopy.append(builderHeading, builderSubheading);

    const builderActions = document.createElement('div');
    builderActions.classList.add('resource-disposal-builder-actions');

    const builderCount = document.createElement('span');
    builderCount.classList.add('resource-disposal-target-count');

    const addTargetButton = document.createElement('button');
    addTargetButton.classList.add('resource-disposal-add-target-button');
    addTargetButton.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.addTarget', '+ Add target');
    addTargetButton.addEventListener('click', () => {
      this.addDisposalTarget();
    });

    builderActions.append(builderCount, addTargetButton);
    builderHeader.append(builderCopy, builderActions);
    sectionContainer.appendChild(builderHeader);

    const targetList = document.createElement('div');
    targetList.classList.add('resource-disposal-target-list');
    sectionContainer.appendChild(targetList);

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
      massDriverMaxAutoActiveCheckbox: maxAutoActiveCheckbox,
      massDriverAutoActiveContainer: autoContainer,
      massDriverDivideButton: divideButton,
      massDriverMultiplyButton: multiplyButton,
      massDriverInfoNoteElement: infoNote,
      disposalTargetList: targetList,
      disposalTargetRows: {},
      disposalBuilderCount: builderCount,
      disposalAddTargetButton: addTargetButton,
    };

    this.updateMassDriverButtonLabels();
    this.rebuildDisposalTargetList();
  }

  renderAutomationUI() {}

  addDisposalTarget() {
    if (this.disposalTargets.length >= this.maxDisposalTargets) {
      return;
    }
    const nextSelection = this.getNextAvailableSelection();
    this.disposalTargets.push(this.createDisposalTarget({
      selectedDisposalResource: nextSelection || this.getDefaultDisposalSelection(),
    }));
    this.syncLegacySelectionState();
    this.clearContinuousExecutionPlanCache();
    this.rebuildDisposalTargetList();
    this.updateUI();
  }

  removeDisposalTarget(targetId) {
    if (this.disposalTargets.length <= 1) {
      return;
    }
    this.disposalTargets = this.disposalTargets.filter(target => target.id !== targetId);
    this.syncLegacySelectionState();
    this.clearContinuousExecutionPlanCache();
    this.rebuildDisposalTargetList();
    this.updateUI();
  }

  getNextAvailableSelection(excludeTargetId = null) {
    const usedKeys = {};
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const target = this.disposalTargets[i];
      if (target.id === excludeTargetId) {
        continue;
      }
      const key = this.getTargetSelectionKey(target);
      if (key) {
        usedKeys[key] = true;
      }
    }

    const disposalGroupData = this.getDisposalGroupData();
    for (let i = 0; i < disposalGroupData.groupList.length; i += 1) {
      const group = disposalGroupData.groupList[i];
      for (let j = 0; j < group.options.length; j += 1) {
        const option = group.options[j];
        const key = `${option.category}:${option.resource}`;
        if (!usedKeys[key]) {
          return {
            category: option.category,
            resource: option.resource,
          };
        }
      }
    }
    return null;
  }

  rebuildDisposalTargetList() {
    const elements = projectElements[this.name];
    if (!elements?.disposalTargetList) {
      return;
    }

    elements.disposalTargetRows = {};
    elements.disposalTargetList.textContent = '';

    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const target = this.disposalTargets[i];
      const row = this.createDisposalTargetRow(target, i);
      elements.disposalTargetRows[target.id] = row;
      elements.disposalTargetList.appendChild(row.card);
    }

    this.refreshDisposalTargetSelects();
  }

  rebuildDisposalTargetListIfRendered() {
    const elements = projectElements[this.name];
    if (!elements?.disposalTargetList) {
      return;
    }
    this.rebuildDisposalTargetList();
  }

  createDisposalTargetRow(target, index) {
    const card = document.createElement('div');
    card.classList.add('resource-disposal-target-card');

    const topRow = document.createElement('div');
    topRow.classList.add('resource-disposal-target-top');

    const marker = document.createElement('div');
    marker.classList.add('resource-disposal-target-marker');

    const badge = document.createElement('div');
    badge.classList.add('resource-disposal-target-badge');
    badge.textContent = `${index + 1}`;

    const status = document.createElement('span');
    status.classList.add('resource-disposal-target-status');

    marker.append(badge, status);

    const selects = document.createElement('div');
    selects.classList.add('resource-disposal-target-selects');

    const typeContainer = document.createElement('div');
    typeContainer.classList.add('resource-disposal-target-select-group');
    const typeLabel = document.createElement('span');
    typeLabel.classList.add('resource-disposal-target-select-label');
    typeLabel.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.export', 'Export');
    const typeSelect = document.createElement('select');
    typeSelect.addEventListener('change', () => {
      this.handleTargetGroupChange(target.id, typeSelect.value);
    });
    typeContainer.append(typeLabel, typeSelect);

    const phaseContainer = document.createElement('div');
    phaseContainer.classList.add('resource-disposal-target-select-group');
    const phaseLabel = document.createElement('span');
    phaseLabel.classList.add('resource-disposal-target-select-label');
    phaseLabel.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.phase', 'Phase');
    const phaseSelect = document.createElement('select');
    phaseSelect.addEventListener('change', () => {
      const parts = phaseSelect.value.split(':');
      const activeTarget = this.getTargetById(target.id);
      activeTarget.selectedDisposalResource = {
        category: parts[0],
        resource: parts[1],
      };
      this.syncLegacySelectionState();
      this.clearContinuousExecutionPlanCache();
      this.refreshDisposalTargetSelects();
      this.updateUI();
    });
    phaseContainer.append(phaseLabel, phaseSelect);

    selects.append(typeContainer, phaseContainer);

    const side = document.createElement('div');
    side.classList.add('resource-disposal-target-side');

    const share = document.createElement('div');
    share.classList.add('resource-disposal-target-share');

    const removeButton = document.createElement('button');
    removeButton.classList.add('resource-disposal-remove-target-button');
    removeButton.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.remove', 'Remove');
    removeButton.addEventListener('click', () => {
      this.removeDisposalTarget(target.id);
    });

    side.append(share, removeButton);
    topRow.append(marker, selects, side);

    const controls = document.createElement('div');
    controls.classList.add('resource-disposal-target-controls-row');

    const autoToggle = this.createTargetCheckbox(
      target,
      'autoStart',
      this.getSpaceDisposalText('ui.projects.autoStart', 'Auto start'),
      (checked) => {
        const activeTarget = this.getTargetById(target.id);
        activeTarget.autoStart = checked;
        this.syncLegacySelectionState();
        this.clearContinuousExecutionPlanCache();
        this.updateUI();
      }
    );

    const waitToggle = this.createTargetCheckbox(
      target,
      'waitForCapacity',
      this.getSpaceDisposalText('ui.projects.spaceDisposal.waitForFullCapacity', 'Wait for full capacity'),
      (checked) => {
        const activeTarget = this.getTargetById(target.id);
        activeTarget.waitForCapacity = checked;
        this.syncLegacySelectionState();
        this.clearContinuousExecutionPlanCache();
        this.updateUI();
      }
    );

    controls.append(autoToggle.container, waitToggle.container);

    const temperatureControl = this.createTargetThresholdControl(target.id, {
      key: 'temperature',
      labelText: this.getSpaceDisposalText('ui.projects.spaceDisposal.disableBelowTemperature', 'Disable below temperature'),
      checkboxKey: 'disableBelowTemperature',
      thresholdKey: 'disableTemperatureThreshold',
      parse: (value) => gameSettings.useCelsius ? value + 273.15 : value,
      format: (value) => toDisplayTemperature(value),
      unitText: () => getTemperatureUnit(),
    });

    const pressureControl = this.createTargetThresholdControl(target.id, {
      key: 'pressure',
      labelText: this.getSpaceDisposalText('ui.projects.spaceDisposal.disableBelowPressure', 'Disable below pressure'),
      checkboxKey: 'disableBelowPressure',
      thresholdKey: 'disablePressureThreshold',
      parse: (value) => value / 1000,
      format: (value) => value * 1000,
      unitText: () => 'Pa',
    });

    const coverageControl = this.createTargetThresholdControl(target.id, {
      key: 'coverage',
      labelText: this.getSpaceDisposalText('ui.projects.spaceDisposal.disableBelowCoverage', 'Disable below coverage'),
      checkboxKey: 'disableBelowCoverage',
      thresholdKey: 'disableCoverageThreshold',
      parse: (value) => Math.max(0, Math.min(100, value)) / 100,
      format: (value) => value * 100,
      unitText: () => '%',
    });

    controls.append(
      temperatureControl.container,
      pressureControl.container,
      coverageControl.container
    );

    card.append(topRow, controls);

    return {
      card,
      marker,
      typeSelect,
      phaseSelect,
      phaseContainer,
      phaseLabel,
      share,
      removeButton,
      autoToggle,
      waitToggle,
      temperatureControl,
      pressureControl,
      coverageControl,
      status,
    };
  }

  createTargetCheckbox(target, key, labelText, onChange) {
    const container = document.createElement('label');
    container.classList.add('checkbox-container', 'resource-disposal-target-checkbox');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = target[key] === true;
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });
    const label = document.createElement('span');
    label.textContent = labelText;
    container.append(checkbox, label);
    return { container, checkbox, label };
  }

  createTargetThresholdControl(targetId, config) {
    const container = document.createElement('div');
    container.classList.add('resource-disposal-target-limit-control');

    const toggleLabel = document.createElement('label');
    toggleLabel.classList.add('checkbox-container');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      const target = this.getTargetById(targetId);
      target[config.checkboxKey] = checkbox.checked;
      this.syncLegacySelectionState();
      this.clearContinuousExecutionPlanCache();
      this.updateUI();
    });

    const text = document.createElement('span');
    text.textContent = config.labelText;
    toggleLabel.append(checkbox, text);

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    wireStringNumberInput(input, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (value) => formatNumber(Math.max(0, value), true, 2),
      onValue: (value) => {
        const target = this.getTargetById(targetId);
        target[config.thresholdKey] = config.parse(Math.max(0, value));
        this.syncLegacySelectionState();
        this.clearContinuousExecutionPlanCache();
        this.updateUI();
      },
    });

    const unit = document.createElement('span');
    unit.classList.add('resource-disposal-target-limit-unit');

    container.append(toggleLabel, input, unit);
    return { container, checkbox, input, unit };
  }

  handleTargetGroupChange(targetId, groupKey) {
    const target = this.getTargetById(targetId);
    const disposalGroupData = this.getDisposalGroupData();
    const group = disposalGroupData.groupMap[groupKey];
    if (!target || !group || !group.options.length) {
      return;
    }
    let selectedOption = null;
    const usedKeys = {};
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const otherTarget = this.disposalTargets[i];
      if (otherTarget.id === targetId) {
        continue;
      }
      usedKeys[this.getTargetSelectionKey(otherTarget)] = true;
    }
    for (let i = 0; i < group.options.length; i += 1) {
      const option = group.options[i];
      const key = `${option.category}:${option.resource}`;
      if (!usedKeys[key]) {
        selectedOption = option;
        break;
      }
    }
    if (!selectedOption) {
      selectedOption = group.options[0];
    }
    target.selectedDisposalResource = {
      category: selectedOption.category,
      resource: selectedOption.resource,
    };
    this.syncLegacySelectionState();
    this.clearContinuousExecutionPlanCache();
    this.refreshDisposalTargetSelects();
    this.updateUI();
  }

  refreshDisposalTargetSelects() {
    const elements = projectElements[this.name];
    if (!elements?.disposalTargetRows) {
      return;
    }

    const disposalGroupData = this.getDisposalGroupData();
    const usedKeys = {};
    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      usedKeys[this.getTargetSelectionKey(this.disposalTargets[i])] = true;
    }

    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const target = this.disposalTargets[i];
      const row = elements.disposalTargetRows[target.id];
      if (!row) {
        continue;
      }

      const selectionKey = this.getTargetSelectionKey(target);
      const groupKey = disposalGroupData.resourceGroupLookup[selectionKey] || disposalGroupData.groupList[0].key;
      row.typeSelect.textContent = '';

      for (let groupIndex = 0; groupIndex < disposalGroupData.groupList.length; groupIndex += 1) {
        const group = disposalGroupData.groupList[groupIndex];
        const option = document.createElement('option');
        option.value = group.key;
        option.textContent = group.label;
        row.typeSelect.appendChild(option);
      }

      row.typeSelect.value = groupKey;
      const group = disposalGroupData.groupMap[groupKey];
      row.phaseSelect.textContent = '';

      for (let optionIndex = 0; optionIndex < group.options.length; optionIndex += 1) {
        const optionData = group.options[optionIndex];
        const option = document.createElement('option');
        option.value = `${optionData.category}:${optionData.resource}`;
        option.textContent = optionData.label;
        const optionKey = option.value;
        const selectedByOther = usedKeys[optionKey] && optionKey !== selectionKey;
        option.disabled = selectedByOther;
        row.phaseSelect.appendChild(option);
      }

      row.phaseSelect.value = selectionKey;
      row.phaseLabel.textContent = group.key === 'storageDepotResource' ? 'Which one' : 'Phase';
      row.phaseContainer.style.display = group.options.length > 1 ? 'flex' : 'none';
      row.removeButton.disabled = this.disposalTargets.length <= 1;
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
    const wasContinuous = this.isContinuous();
    const structure = this.getMassDriverStructure();
    adjustStructureActivation(structure, delta);
    updateBuildingDisplay(buildings);
    this.finalizeAssignmentChange(wasContinuous);
  }

  setMassDriverActive(target) {
    const structure = this.getMassDriverStructure();
    const activeCount = Number.isFinite(structure?.activeNumber)
      ? structure.activeNumber
      : (typeof buildingCountToNumber === 'function'
        ? buildingCountToNumber(structure?.active)
        : Math.max(0, Math.floor(Number(structure?.active) || 0)));
    this.applyMassDriverChange(target - activeCount);
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
    const structure = buildings.massDriver;
    const activeCount = Number.isFinite(structure?.activeNumber)
      ? structure.activeNumber
      : (typeof buildingCountToNumber === 'function'
        ? buildingCountToNumber(structure?.active)
        : Math.max(0, Math.floor(Number(structure?.active) || 0)));
    return activeCount * this.massDriverShipEquivalency;
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

  getHazardousMachineryActiveShipCount() {
    return this.getHazardousMachineryWorkerLoadActive() ? this.getSpaceshipOnlyCount() : 0;
  }

  getContinuousOperationContext(deltaTime = 1000, productivity = 1) {
    const duration = this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration();
    const fraction = duration > 0 ? deltaTime / duration : 0;
    const shipCount = this.getSpaceshipOnlyCount();
    const auxiliaryCount = this.getMassDriverContribution();
    const totalTransportCount = shipCount + auxiliaryCount;
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
    return resource === 'energy' ? context.totalTransportCount : context.shipCount;
  }

  getContinuousGainCount(context) {
    return context.shipCount;
  }

  getContinuousFundingCount(context) {
    return context.auxiliaryCount + (context.shipCount * context.successChance);
  }

  getContinuousShipLossCount(context) {
    return context.shipCount;
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
    const duration = this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration();
    const shipCount = this.getSpaceshipOnlyCount();
    const massDriverCount = this.getMassDriverContribution();
    const perSecondMultiplier = perSecond ? (1000 / duration) : 1;
    const shipMultiplier = perSecond ? shipCount * perSecondMultiplier : 1;
    const energyMultiplier = perSecond ? (shipCount + massDriverCount) * perSecondMultiplier : 1;
    for (const category in costPerShip) {
      totalCost[category] = {};
      for (const resource in costPerShip[category]) {
        const multiplier = resource === 'energy' ? energyMultiplier : shipMultiplier;
        totalCost[category][resource] = costPerShip[category][resource] * multiplier;
      }
    }
    return totalCost;
  }

  getDiscreteDisposalEntries() {
    const activeTargets = this.getRunnableTargets();
    if (!activeTargets.length) {
      return [];
    }
    const transportShare = this.getTargetTransportCount(activeTargets[0], this.getActiveShipCount(), activeTargets);
    const requestedAmount = this.getShipCapacity() * transportShare;
    return activeTargets.map(target => ({
      targetId: target.id,
      target,
      category: target.selectedDisposalResource.category,
      resource: target.selectedDisposalResource.resource,
      requestedAmount,
    }));
  }

  getContinuousDisposalEntries(context, productivity = 1) {
    const activeTargets = this.getRunnableTargets();
    if (!activeTargets.length) {
      return [];
    }
    const transportShare = this.getTargetTransportCount(activeTargets[0], context.totalTransportCount, activeTargets);
    const requestedAmount = this.getShipCapacity() * transportShare * context.fraction * productivity;
    if (requestedAmount <= 0) {
      return [];
    }
    return activeTargets.map(target => ({
      targetId: target.id,
      target,
      category: target.selectedDisposalResource.category,
      resource: target.selectedDisposalResource.resource,
      requestedAmount,
    }));
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    const totalResourceGain = {};
    const gainPerShip = this.calculateSpaceshipGainPerShip() || {};
    const duration = this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration();
    const activeShips = this.getSpaceshipOnlyCount();
    const multiplier = perSecond ? activeShips * (1000 / duration) : 1;
    for (const category in gainPerShip) {
      totalResourceGain[category] = {};
      for (const resource in gainPerShip[category]) {
        totalResourceGain[category][resource] = gainPerShip[category][resource] * multiplier;
      }
    }
    return totalResourceGain;
  }

  getClampedDisposalAmountForEntry(entry, availableAmount) {
    const target = entry.target || this.getTargetById(entry.targetId);
    return this.getTargetClampedDisposalAmount(
      target,
      entry.requestedAmount,
      entry.category,
      entry.resource,
      availableAmount
    );
  }

  getEffectiveAvailableAmount(category, resource, accumulatedChanges = null) {
    if (category === 'special' && resource === 'planetaryMass') {
      return getDynamicWorldPlanetaryMassAvailableTons(terraforming);
    }
    return super.getEffectiveAvailableAmount(category, resource, accumulatedChanges);
  }

  getTargetClampedDisposalAmount(target, requestedAmount, category, resource, availableAmount) {
    const maxByAvailable = Math.max(0, Math.min(requestedAmount, availableAmount));
    if (maxByAvailable <= 0) {
      return 0;
    }

    const floorAmount = this.getTargetDisposalLowerLimitFloorAmount(target, category, resource, availableAmount);
    if (floorAmount <= 0) {
      return maxByAvailable;
    }

    const maxDisposableByFloor = Math.max(0, availableAmount - floorAmount + 1);
    return Math.max(0, Math.min(maxByAvailable, maxDisposableByFloor));
  }

  getTargetDisposalLowerLimitFloorAmount(target, category, resource, availableAmount) {
    if (!this.isBooleanFlagSet('atmosphericMonitoring') || !target?.selectedDisposalResource) {
      return 0;
    }
    const selection = target.selectedDisposalResource;
    if (category !== selection.category || resource !== selection.resource) {
      return 0;
    }

    let floorAmount = 0;

    if (target.disableBelowPressure && this.shouldTargetShowPressureControl(target)) {
      floorAmount = Math.max(floorAmount, this.getTargetPressureFloorAmount(target));
    }

    if (target.disableBelowCoverage && this.shouldTargetShowCoverageControl(target)) {
      floorAmount = Math.max(floorAmount, this.getTargetCoverageFloorAmount(target, category, resource));
    }

    if (target.disableBelowTemperature && this.isTargetSafeGhgSelection(target)) {
      floorAmount = Math.max(
        floorAmount,
        this.getTargetGreenhouseTemperatureFloorAmount(target, availableAmount)
      );
    }

    return floorAmount;
  }

  getTargetPressureFloorAmount(target) {
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const pressurePerUnitPa = calculateAtmosphericPressure(1, gravity, radius);
    if (pressurePerUnitPa <= 0) {
      return 0;
    }
    return (target.disablePressureThreshold * 1000) / pressurePerUnitPa;
  }

  getTargetCoverageFloorAmount(target, category, resource) {
    if (category !== 'surface') {
      return 0;
    }
    const coverageKey = this.getTargetCoverageResourceKey(target);
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
    if (currentCoverage <= target.disableCoverageThreshold) {
      return totalAmount;
    }

    let low = 0;
    let high = totalAmount;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      const coverage = this.calculateCoverageForTotalAmount(zoneEntries, mid);
      if (coverage >= target.disableCoverageThreshold) {
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

  getTargetGreenhouseTemperatureFloorAmount(target, availableAmount) {
    const ghg = resources.atmospheric.greenhouseGas;
    const currentAmount = Math.max(0, Math.min(availableAmount, ghg.value));
    if (currentAmount <= 0) {
      return 0;
    }

    if (this.getAutomationTemperatureReading() <= target.disableTemperatureThreshold) {
      return currentAmount;
    }

    let low = 0;
    let high = currentAmount;
    for (let i = 0; i < 12; i += 1) {
      const mid = (low + high) / 2;
      const temp = this.calculateTemperatureForGreenhouseAmount(mid);
      if (temp >= target.disableTemperatureThreshold) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return high;
  }

  shouldAutomationDisable() {
    return this.getRunnableTargets().length === 0;
  }

  canStart() {
    if (!Project.prototype.canStart.call(this)) {
      return false;
    }
    if (this.isBlockedByPulsarStorm()) {
      return false;
    }
    if (this.getActiveShipCount() === 0) {
      return false;
    }

    const activeTargets = this.getRunnableTargets();
    if (!activeTargets.length) {
      return false;
    }

    if (this.isContinuous()) {
      const requirements = this.getTargetWaitRequirementMap(activeTargets, this.getActiveShipCount());
      for (const key in requirements) {
        const [category, resource] = key.split(':');
        const selection = { category, resource };
        if (this.getSelectionAvailableAmount(selection) < requirements[key]) {
          return false;
        }
      }
      return true;
    }

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

    const requirements = this.getTargetWaitRequirementMap(activeTargets, this.getActiveShipCount());
    for (const key in requirements) {
      const [category, resource] = key.split(':');
      const selection = { category, resource };
      if (this.getSelectionAvailableAmount(selection) < requirements[key]) {
        return false;
      }
    }

    return true;
  }

  deductResources(resources) {
    Project.prototype.deductResources.call(this, resources);
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

    if (!this.attributes.spaceExport) {
      this.shortfallLastTick = shortfall;
      this.costShortfallLastTick = costShortfall;
      this.disposalShortfallLastTick = disposalShortfall;
      return;
    }

    const disposalEntries = this.getDiscreteDisposalEntries();
    let totalDisposed = 0;

    for (let i = 0; i < disposalEntries.length; i += 1) {
      const entry = disposalEntries[i];
      const available = this.getSelectionAvailableAmount(entry);
      const actualAmount = this.getClampedDisposalAmountForEntry(entry, available);
      if (actualAmount < entry.requestedAmount) {
        shortfall = shortfall || entry.requestedAmount > 0;
        disposalShortfall = disposalShortfall || entry.requestedAmount > 0;
      }
      totalDisposed += this.disposeSelectionAmount(entry, actualAmount);
    }

    if (totalDisposed > 0) {
      if (this.attributes.fundingGainAmount > 0) {
        this.pendingGain = {
          colony: {
            funding: totalDisposed * this.attributes.fundingGainAmount
          }
        };
      } else {
        this.pendingGain = null;
      }
      terraforming.refreshDynamicWorldGeometry(currentPlanetParameters);
      reconcileLandResourceValue();
    } else {
      this.pendingGain = null;
    }

    this.shortfallLastTick = shortfall;
    this.costShortfallLastTick = costShortfall;
    this.disposalShortfallLastTick = disposalShortfall;
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

    for (let i = 0; i < plan.disposalEntries.length; i += 1) {
      const entry = plan.disposalEntries[i];
      if (this.isPlanetaryMassSelection(entry)) {
        modifyPlanetaryMassRate(-(entry.appliedAmount || 0) * rateFactor, plan.exportRateLabel);
        continue;
      }
      resources[entry.category][entry.resource].modifyRate(
        -(entry.appliedAmount || 0) * rateFactor,
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
        if (isSpecialProjectResource(category, resource)) {
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

    let planetaryMassDisposed = 0;
    for (let i = 0; i < plan.disposalEntries.length; i += 1) {
      const entry = plan.disposalEntries[i];
      const amount = entry.appliedAmount || 0;
      if (amount <= 0) {
        continue;
      }
      if (this.isPlanetaryMassSelection(entry)) {
        planetaryMassDisposed += this.disposeSelectionAmount(entry, amount);
        continue;
      }
      if (accumulatedChanges) {
        if (!accumulatedChanges[entry.category]) {
          accumulatedChanges[entry.category] = {};
        }
        if (accumulatedChanges[entry.category][entry.resource] === undefined) {
          accumulatedChanges[entry.category][entry.resource] = 0;
        }
        accumulatedChanges[entry.category][entry.resource] -= amount;
      } else {
        resources[entry.category][entry.resource].decrease(amount);
        if (entry.category === 'surface') {
          terraforming.distributeSurfaceChangesToZones({ [entry.resource]: -amount });
        }
      }
    }

    if (plan.gainFraction > 0) {
      this.applyingContinuousPlanGain = true;
      try {
        this.applySpaceshipResourceGain(
          plan.gainBase,
          plan.gainFraction,
          accumulatedChanges,
          plan.context.productivity
        );
      } finally {
        this.applyingContinuousPlanGain = false;
      }
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

    if (planetaryMassDisposed > 0) {
      terraforming.refreshDynamicWorldGeometry(currentPlanetParameters);
      reconcileLandResourceValue();
    }
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) {
      return;
    }

    this.syncLegacySelectionState();

    if (elements.autoStartCheckboxContainer) {
      elements.autoStartCheckboxContainer.style.display = 'none';
    }
    if (elements.waitCapacityCheckboxContainer) {
      elements.waitCapacityCheckboxContainer.style.display = 'none';
    }
    if (elements.temperatureControl) {
      elements.temperatureControl.style.display = 'none';
    }
    if (elements.pressureControl) {
      elements.pressureControl.style.display = 'none';
    }
    if (elements.coverageControl) {
      elements.coverageControl.style.display = 'none';
    }

    if (elements.massDriverInfoSection && elements.massDriverInfoElement) {
      if (this.isBooleanFlagSet('massDriverEnabled')) {
        const structure = this.getMassDriverStructure();
        if (elements.massDriverActiveElement) {
          elements.massDriverActiveElement.textContent = formatBuildingCount(structure.active);
        }
        if (elements.massDriverBuiltElement) {
          elements.massDriverBuiltElement.textContent = formatBuildingCount(structure.count);
        }
        const autoActiveLocked = structure.enforceAutoActiveLock
          ? structure.enforceAutoActiveLock()
          : (structure.isAutoActiveLocked && structure.isAutoActiveLocked());
        if (elements.massDriverMaxAutoActiveCheckbox) {
          elements.massDriverMaxAutoActiveCheckbox.checked = structure.autoActiveEnabled;
          elements.massDriverMaxAutoActiveCheckbox.disabled = autoActiveLocked;
        }
        if (elements.massDriverAutoActiveContainer) {
          elements.massDriverAutoActiveContainer.classList.toggle('automation-locked', autoActiveLocked);
        }
        elements.massDriverInfoElement.style.display = '';
        elements.massDriverInfoNoteElement.style.display = '';
        this.updateMassDriverButtonLabels();
      } else {
        elements.massDriverInfoElement.style.display = 'none';
        elements.massDriverInfoNoteElement.style.display = 'none';
      }
    }

    const displayTargets = this.getDisposalTargetsForDisplay();

    if (elements.disposalPerShipElement) {
      elements.disposalPerShipElement.textContent = this.getSpaceDisposalText(
        'ui.projects.spaceDisposal.maxExportPerShip',
        `Max Export/Ship: ${formatNumber(this.getShipCapacity(), true)}`,
        { value: formatNumber(this.getShipCapacity(), true) }
      );
    }

    if (elements.totalDisposalElement) {
      const totalDisposal = this.calculateSpaceshipTotalDisposal();
      let total = 0;
      for (const category in totalDisposal) {
        for (const resource in totalDisposal[category]) {
          total += totalDisposal[category][resource];
        }
      }
      if (this.isContinuous()) {
        total *= 1000 / this.getEffectiveDuration();
        elements.totalDisposalElement.textContent = this.getSpaceDisposalText(
          'ui.projects.spaceDisposal.totalExportPerSecond',
          `Total Export: ${formatNumber(total, true)}/s`,
          { value: formatNumber(total, true) }
        );
      } else {
        elements.totalDisposalElement.textContent = this.getSpaceDisposalText(
          'ui.projects.spaceDisposal.totalExport',
          `Total Export: ${formatNumber(total, true)}`,
          { value: formatNumber(total, true) }
        );
      }
      elements.totalDisposalElement.style.color = this.disposalShortfallLastTick === true ? 'red' : '';
    }

    if (elements.temperatureReductionElement) {
      const reduction = this.calculateTemperatureReduction();
      if (reduction > 0) {
        const suffix = this.isContinuous() ? `${getTemperatureUnit()}/s` : getTemperatureUnit();
        elements.temperatureReductionElement.textContent =
          this.getSpaceDisposalText(
            'ui.projects.spaceDisposal.temperatureReduction',
            `Temperature Reduction: ${formatNumber(toDisplayTemperatureDelta(reduction), false, 2)}${suffix}`,
            { value: `${formatNumber(toDisplayTemperatureDelta(reduction), false, 2)}${suffix}` }
          );
        elements.temperatureReductionElement.style.display = 'block';
      } else {
        elements.temperatureReductionElement.style.display = 'none';
      }
    }

    if (elements.disposalBuilderCount) {
      elements.disposalBuilderCount.textContent = `${this.disposalTargets.length}/${this.maxDisposalTargets}`;
    }
    if (elements.disposalAddTargetButton) {
      elements.disposalAddTargetButton.disabled = this.disposalTargets.length >= this.maxDisposalTargets;
    }

    for (let i = 0; i < this.disposalTargets.length; i += 1) {
      const target = this.disposalTargets[i];
      const row = elements.disposalTargetRows?.[target.id];
      if (!row) {
        continue;
      }
      const share = this.getTargetShare(target.id, displayTargets);
      const transportCount = this.getTargetTransportCount(target, this.getActiveShipCount(), displayTargets);
      row.share.textContent = share > 0 ? `${formatNumber(transportCount, true)} ships eq` : '';

      row.autoToggle.checkbox.checked = target.autoStart === true;
      row.waitToggle.checkbox.checked = target.waitForCapacity !== false;

      row.temperatureControl.checkbox.checked = target.disableBelowTemperature === true;
      if (document.activeElement !== row.temperatureControl.input) {
        row.temperatureControl.input.value = formatNumber(toDisplayTemperature(target.disableTemperatureThreshold), true, 2);
      }
      row.temperatureControl.unit.textContent = getTemperatureUnit();
      row.temperatureControl.container.style.display =
        this.isTargetSafeGhgSelection(target) && this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

      row.pressureControl.checkbox.checked = target.disableBelowPressure === true;
      if (document.activeElement !== row.pressureControl.input) {
        row.pressureControl.input.value = formatNumber(target.disablePressureThreshold * 1000, true, 2);
      }
      row.pressureControl.unit.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.pa', 'Pa');
      row.pressureControl.container.style.display =
        this.shouldTargetShowPressureControl(target) && this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

      row.coverageControl.checkbox.checked = target.disableBelowCoverage === true;
      if (document.activeElement !== row.coverageControl.input) {
        row.coverageControl.input.value = formatNumber(target.disableCoverageThreshold * 100, true, 2);
      }
      row.coverageControl.unit.textContent = this.getSpaceDisposalText('ui.projects.spaceDisposal.percent', '%');
      row.coverageControl.container.style.display =
        this.shouldTargetShowCoverageControl(target) && this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

      const statusText = this.getTargetStatusText(target, displayTargets);
      row.status.textContent = statusText;
      row.status.dataset.state = statusText.toLowerCase();
    }
  }

  calculateTemperatureReduction() {
    const totalDisposal = this.calculateSpaceshipTotalDisposal();
    let removed = totalDisposal.atmospheric?.greenhouseGas || 0;
    if (this.isContinuous() && removed > 0) {
      removed *= 1000 / this.getEffectiveDuration();
    }
    if (removed <= 0 || !resources.atmospheric.greenhouseGas) {
      return 0;
    }

    const ghg = resources.atmospheric.greenhouseGas;
    const originalAmount = ghg.value;
    const removal = Math.min(removed, originalAmount);
    const originalTemp = terraforming.temperature.trendValue ?? 0;

    const snapshot = terraforming.saveTemperatureState instanceof Function
      ? terraforming.saveTemperatureState()
      : null;
    let newTemp = originalTemp;

    try {
      ghg.value = originalAmount - removal;
      terraforming.updateSurfaceTemperature(0);
      newTemp = terraforming.temperature?.trendValue ?? newTemp;
    } finally {
      ghg.value = originalAmount;
      if (snapshot && terraforming.restoreTemperatureState instanceof Function) {
        terraforming.restoreTemperatureState(snapshot);
      } else {
        terraforming.updateSurfaceTemperature(0);
      }
    }

    return originalTemp - newTemp;
  }

  saveAutomationSettings() {
    const settings = super.saveAutomationSettings();
    settings.disposalTargets = this.cloneDisposalTargets();
    return settings;
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Array.isArray(settings.disposalTargets) && settings.disposalTargets.length) {
      this.disposalTargets = settings.disposalTargets.map(target => this.createDisposalTarget(target));
    } else {
      this.disposalTargets = [this.createLegacyTarget()];
    }
    this.sanitizeDisposalTargets();
    this.clearContinuousExecutionPlanCache();
    this.rebuildDisposalTargetListIfRendered();
  }

  saveState() {
    return {
      ...super.saveState(),
      disposalTargets: this.cloneDisposalTargets(),
      nextDisposalTargetId: this.nextDisposalTargetId,
    };
  }

  loadState(state) {
    super.loadState(state);
    if (Array.isArray(state.disposalTargets) && state.disposalTargets.length) {
      this.nextDisposalTargetId = state.nextDisposalTargetId || 1;
      this.disposalTargets = state.disposalTargets.map(target => this.createDisposalTarget(target));
    } else {
      this.disposalTargets = [this.createLegacyTarget()];
    }
    this.sanitizeDisposalTargets();
    this.clearContinuousExecutionPlanCache();
    this.rebuildDisposalTargetListIfRendered();
  }

  saveTravelState() {
    return {
      ...super.saveTravelState(),
      disposalTargets: this.cloneDisposalTargets(),
      nextDisposalTargetId: this.nextDisposalTargetId,
    };
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
    if (Array.isArray(state.disposalTargets) && state.disposalTargets.length) {
      this.nextDisposalTargetId = state.nextDisposalTargetId || 1;
      this.disposalTargets = state.disposalTargets.map(target => this.createDisposalTarget(target));
    } else {
      this.disposalTargets = [this.createLegacyTarget()];
    }
    this.sanitizeDisposalTargets();
    this.clearContinuousExecutionPlanCache();
    this.rebuildDisposalTargetListIfRendered();
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
