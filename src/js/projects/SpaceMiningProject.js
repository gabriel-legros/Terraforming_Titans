const ATMOSPHERIC_MONITORING_TOLERANCE = 0.00001;

class SpaceMiningProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.disableAbovePressure = false;
    this.disablePressureThreshold = 0;
    this.disableAboveOxygenPressure = false;
    this.disableOxygenPressureThreshold = 0;
    this.disableAboveWaterCoverage = false;
    this.waterCoverageThreshold = 0.2;
    this.waterCoverageDisableMode = 'coverage';
    this.disableAboveCo2Coverage = false;
    this.co2CoverageThreshold = 0.2;
    this.co2CoverageDisableMode = 'coverage';
    this.hasOxygenPressureControl = false;
    this.pressureUnit = 'Pa';
    this.oxygenPressureUnit = 'Pa';
    this.waterImportTarget = 'surface';
    const maxPressure = config.attributes?.maxPressure;
    if (Number.isFinite(maxPressure)) {
      this.disablePressureThreshold = maxPressure;
    }
    const maxOxygenPressure = config.attributes?.maxOxygenPressure;
    if (Number.isFinite(maxOxygenPressure)) {
      this.disableOxygenPressureThreshold = maxOxygenPressure;
      this.hasOxygenPressureControl = true;
    }
    const maxWaterCoverage = config.attributes?.maxWaterCoverage;
    if (Number.isFinite(maxWaterCoverage)) {
      this.waterCoverageThreshold = maxWaterCoverage;
      this.disableAboveWaterCoverage = true;
    }
  }

  getMaxAssignableShips() {
    return warpGateNetworkManager.getCapForProject(this);
  }

  assignSpaceships(count) {
    const maxShips = this.getMaxAssignableShips();
    const maxDelta = maxShips - this.assignedSpaceships;
    const adjusted = count > 0
      ? Math.min(count, maxDelta)
      : Math.max(count, -this.assignedSpaceships);
    super.assignSpaceships(adjusted);
  }

  shouldPenalizeMetalProduction() {
    const gainMetal = this.attributes.resourceGainPerShip?.colony?.metal;
    const cost = this.calculateSpaceshipCost();
    const metalCost = cost.colony?.metal || 0;
    return !!gainMetal && metalCost > 0;
  }

  ignoreCostForResource(category, resource) {
    return category === 'colony' && resource === 'metal' && this.shouldPenalizeMetalProduction();
  }

  applyMetalCostPenalty(gain, metalCostOverride) {
    if (!this.shouldPenalizeMetalProduction()) return;
    let deduction = metalCostOverride;
    if (deduction === undefined) {
      const cost = this.calculateSpaceshipCost();
      deduction = cost.colony?.metal || 0;
    }
    if (gain.colony && typeof gain.colony.metal === 'number') {
      gain.colony.metal = Math.max(0, gain.colony.metal - deduction);
    }
  }

  getGasAbbreviation(gas) {
    const map = { carbonDioxide: 'CO2', inertGas: 'N2', oxygen: 'O2' };
    return map[gas] || gas;
  }

  createGasPressureControl(gas, checkedProp, thresholdProp, key) {
    if (!gas) {
      return null;
    }
    const control = document.createElement('div');
    control.classList.add('checkbox-container', `${key}-control`);
    control.id = `${this.name}-${key}-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-${key}-checkbox`;
    checkbox.classList.add(`${key}-checkbox`);
    checkbox.checked = this[checkedProp];
    checkbox.addEventListener('change', () => {
      this[checkedProp] = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    const gasLabel = this.getGasAbbreviation(gas);
    label.textContent = `Disable if ${gasLabel} pressure above: `;
    label.htmlFor = checkbox.id;
    control.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.classList.add(`${key}-input`);
    input.value = formatNumber(this[thresholdProp] * 1000, true, 2);
    wireStringNumberInput(input, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (value) => formatNumber(Math.max(0, value), true, 2),
      onValue: (value) => {
        this[thresholdProp] = Math.max(0, value) / 1000;
      },
      datasetKey: `${key}PressurePa`,
    });
    control.appendChild(input);

    const unitLabel = document.createElement('span');
    unitLabel.classList.add(`${key}-unit`);
    unitLabel.textContent = 'Pa';
    control.appendChild(unitLabel);

    projectElements[this.name] = {
      ...projectElements[this.name],
      [`${key}Control`]: control,
      [`${key}Checkbox`]: checkbox,
      [`${key}Input`]: input,
      [`${key}UnitLabel`]: unitLabel,
    };

    return control;
  }

  createPressureControl() {
    const gas = this.getTargetAtmosphericResource();
    return this.createGasPressureControl(gas, 'disableAbovePressure', 'disablePressureThreshold', 'pressure');
  }

  createWaterCoverageControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'water-coverage-control');
    control.id = `${this.name}-water-coverage-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-water-coverage-checkbox`;
    checkbox.classList.add('water-coverage-checkbox');
    checkbox.checked = this.disableAboveWaterCoverage;
    checkbox.addEventListener('change', () => {
      this.disableAboveWaterCoverage = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if ';
    label.htmlFor = checkbox.id;
    control.appendChild(label);

    const modeSelect = document.createElement('select');
    modeSelect.classList.add('water-coverage-mode');
    [
      { value: 'coverage', text: 'water coverage above' },
      { value: 'target', text: 'water+ice above target' }
    ].forEach(optionData => {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.text;
      modeSelect.appendChild(option);
    });
    modeSelect.value = this.waterCoverageDisableMode;
    control.appendChild(modeSelect);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.min = '0';
    input.max = '100';
    input.classList.add('water-coverage-input');
    input.value = this.waterCoverageThreshold * 100;
    input.addEventListener('input', () => {
      if (input.value === '') {
        return;
      }
      const val = Number(input.value);
      if (!Number.isFinite(val)) {
        this.waterCoverageThreshold = 0;
        return;
      }
      const clamped = Math.max(0, Math.min(val, 100));
      this.waterCoverageThreshold = clamped / 100;
      input.value = clamped;
    });
    input.addEventListener('blur', () => {
      if (input.value === '') {
        input.value = this.waterCoverageThreshold * 100;
      }
    });
    control.appendChild(input);

    const percent = document.createElement('span');
    percent.classList.add('water-coverage-unit');
    percent.textContent = '%';
    control.appendChild(percent);

    const updateInputVisibility = () => {
      const showInput = this.waterCoverageDisableMode === 'coverage';
      input.style.display = showInput ? '' : 'none';
      percent.style.display = showInput ? '' : 'none';
    };

    modeSelect.addEventListener('change', () => {
      this.waterCoverageDisableMode = modeSelect.value;
      updateInputVisibility();
    });

    updateInputVisibility();

    projectElements[this.name] = {
      ...projectElements[this.name],
      waterCoverageControl: control,
      waterCoverageCheckbox: checkbox,
      waterCoverageInput: input,
      waterCoverageMode: modeSelect,
      waterCoveragePercent: percent,
    };

    return control;
  }

  createCo2CoverageControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'co2-coverage-control');
    control.id = `${this.name}-co2-coverage-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-co2-coverage-checkbox`;
    checkbox.classList.add('co2-coverage-checkbox');
    checkbox.checked = this.disableAboveCo2Coverage;
    checkbox.addEventListener('change', () => {
      this.disableAboveCo2Coverage = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if ';
    label.htmlFor = checkbox.id;
    control.appendChild(label);

    const modeSelect = document.createElement('select');
    modeSelect.classList.add('co2-coverage-mode');
    [
      { value: 'coverage', text: 'liquid CO2 coverage above' },
      { value: 'target', text: 'liquid CO2+dry ice above target' }
    ].forEach(optionData => {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.text;
      modeSelect.appendChild(option);
    });
    modeSelect.value = this.co2CoverageDisableMode;
    control.appendChild(modeSelect);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.min = '0';
    input.max = '100';
    input.classList.add('co2-coverage-input');
    input.value = this.co2CoverageThreshold * 100;
    input.addEventListener('input', () => {
      if (input.value === '') {
        return;
      }
      const val = Number(input.value);
      if (!Number.isFinite(val)) {
        this.co2CoverageThreshold = 0;
        return;
      }
      const clamped = Math.max(0, Math.min(val, 100));
      this.co2CoverageThreshold = clamped / 100;
      input.value = clamped;
    });
    input.addEventListener('blur', () => {
      if (input.value === '') {
        input.value = this.co2CoverageThreshold * 100;
      }
    });
    control.appendChild(input);

    const percent = document.createElement('span');
    percent.classList.add('co2-coverage-unit');
    percent.textContent = '%';
    control.appendChild(percent);

    const updateControlVisibility = () => {
      const targetOption = modeSelect.querySelector('option[value="target"]');
      const showTargetOption = this.hasCo2LiquidTarget();
      targetOption.style.display = showTargetOption ? '' : 'none';
      if (!showTargetOption && this.co2CoverageDisableMode === 'target') {
        this.co2CoverageDisableMode = 'coverage';
        modeSelect.value = 'coverage';
      }
      const showInput = this.co2CoverageDisableMode === 'coverage';
      input.style.display = showInput ? '' : 'none';
      percent.style.display = showInput ? '' : 'none';
    };

    modeSelect.addEventListener('change', () => {
      this.co2CoverageDisableMode = modeSelect.value;
      updateControlVisibility();
    });

    updateControlVisibility();

    projectElements[this.name] = {
      ...projectElements[this.name],
      co2CoverageControl: control,
      co2CoverageCheckbox: checkbox,
      co2CoverageInput: input,
      co2CoverageMode: modeSelect,
      co2CoveragePercent: percent,
      co2CoverageVisibilityUpdate: updateControlVisibility,
    };

    return control;
  }

  createWaterImportTargetControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'water-import-target-control');
    control.id = `${this.name}-water-import-target-control`;
    control.style.display = this.isBooleanFlagSet('waterImportTargeting') ? 'flex' : 'none';

    const label = document.createElement('label');
    label.textContent = 'Target ';
    control.appendChild(label);

    const select = document.createElement('select');
    select.classList.add('water-import-target-select');
    [
      { value: 'surface', text: 'Surface' },
      { value: 'colony', text: 'Colony' }
    ].forEach(optionData => {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.text;
      select.appendChild(option);
    });
    select.value = this.waterImportTarget;
    select.addEventListener('change', () => {
      this.waterImportTarget = select.value === 'colony' ? 'colony' : 'surface';
    });
    control.appendChild(select);

    projectElements[this.name] = {
      ...projectElements[this.name],
      waterImportTargetControl: control,
      waterImportTargetLabel: label,
      waterImportTargetSelect: select,
    };

    return control;
  }

  renderAutomationUI(container) {
    if (!projectElements[this.name]?.pressureControl) {
      const gas = this.getTargetAtmosphericResource();
      const pressureControl = this.createGasPressureControl(gas, 'disableAbovePressure', 'disablePressureThreshold', 'pressure');
      if (pressureControl) {
        container.appendChild(pressureControl);
      }
    }
    if (this.attributes.dynamicWaterImport && !projectElements[this.name]?.waterImportTargetControl) {
      container.appendChild(this.createWaterImportTargetControl());
    }
    if (this.attributes.dynamicWaterImport && !projectElements[this.name]?.waterCoverageControl) {
      container.appendChild(this.createWaterCoverageControl());
    }
    if (this.getTargetAtmosphericResource() === 'carbonDioxide' && !projectElements[this.name]?.co2CoverageControl) {
      container.appendChild(this.createCo2CoverageControl());
    }
    if (this.hasOxygenPressureControl && !projectElements[this.name]?.oxygenPressureControl) {
      container.appendChild(this.createGasPressureControl('oxygen', 'disableAboveOxygenPressure', 'disableOxygenPressureThreshold', 'oxygenPressure'));
    }
  }

  renderUI(container) {
    super.renderUI(container);
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (!elements) return;
    if (elements.pressureControl) {
      elements.pressureControl.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';
    }
    if (elements.pressureCheckbox) {
      elements.pressureCheckbox.checked = this.disableAbovePressure;
    }
    if (elements.pressureInput && document.activeElement !== elements.pressureInput) {
      elements.pressureInput.value = formatNumber(this.disablePressureThreshold * 1000, true, 2);
    }
    if (elements.pressureUnitLabel) {
      elements.pressureUnitLabel.textContent = 'Pa';
    }
    if (elements.waterCoverageControl) {
      elements.waterCoverageControl.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';
    }
    if (elements.waterCoverageCheckbox) {
      elements.waterCoverageCheckbox.checked = this.disableAboveWaterCoverage;
    }
    if (elements.waterCoverageMode) {
      elements.waterCoverageMode.value = this.waterCoverageDisableMode;
    }
    if (elements.waterCoverageInput && document.activeElement !== elements.waterCoverageInput) {
      elements.waterCoverageInput.value = this.waterCoverageThreshold * 100;
    }
    if (elements.waterCoverageInput && elements.waterCoveragePercent) {
      const showInput = this.waterCoverageDisableMode === 'coverage';
      elements.waterCoverageInput.style.display = showInput ? '' : 'none';
      elements.waterCoveragePercent.style.display = showInput ? '' : 'none';
    }
    if (elements.co2CoverageControl) {
      const shouldShowCo2Control = this.isBooleanFlagSet('atmosphericMonitoring') && this.hasCo2LiquidTarget();
      elements.co2CoverageControl.style.display = shouldShowCo2Control ? 'flex' : 'none';
    }
    if (elements.co2CoverageCheckbox) {
      elements.co2CoverageCheckbox.checked = this.disableAboveCo2Coverage;
    }
    if (elements.co2CoverageMode) {
      elements.co2CoverageMode.value = this.co2CoverageDisableMode;
    }
    if (elements.co2CoverageInput && document.activeElement !== elements.co2CoverageInput) {
      elements.co2CoverageInput.value = this.co2CoverageThreshold * 100;
    }
    if (elements.co2CoverageVisibilityUpdate) {
      elements.co2CoverageVisibilityUpdate();
    }
    if (elements.waterImportTargetControl) {
      elements.waterImportTargetControl.style.display = this.isBooleanFlagSet('waterImportTargeting') ? 'flex' : 'none';
    }
    if (elements.waterImportTargetSelect) {
      elements.waterImportTargetSelect.value = this.waterImportTarget;
    }
    if (elements.oxygenPressureControl) {
      elements.oxygenPressureControl.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';
    }
    if (elements.oxygenPressureCheckbox) {
      elements.oxygenPressureCheckbox.checked = this.disableAboveOxygenPressure;
    }
    if (elements.oxygenPressureInput && document.activeElement !== elements.oxygenPressureInput) {
      elements.oxygenPressureInput.value = formatNumber(this.disableOxygenPressureThreshold * 1000, true, 2);
    }
    if (elements.oxygenPressureUnitLabel) {
      elements.oxygenPressureUnitLabel.textContent = 'Pa';
    }
  }

  getTargetAtmosphericResource() {
    const attrs = this.attributes.resourceGainPerShip || this.attributes.resourceGain;
    if (attrs && attrs.atmospheric) {
      const keys = Object.keys(attrs.atmospheric);
      if (keys.length > 0) {
        return keys[0];
      }
    }
    return null;
  }

  waterCoverageLimitEnabled(hasMonitoring) {
    const monitoringOn = hasMonitoring ?? this.isBooleanFlagSet('atmosphericMonitoring');
    return monitoringOn && this.attributes.dynamicWaterImport && this.disableAboveWaterCoverage;
  }

  co2CoverageLimitEnabled(hasMonitoring) {
    const monitoringOn = hasMonitoring ?? this.isBooleanFlagSet('atmosphericMonitoring');
    return monitoringOn && this.getTargetAtmosphericResource() === 'carbonDioxide' && this.disableAboveCo2Coverage;
  }

  hasCo2LiquidTarget() {
    return terraforming.liquidCoverageTargets.some((entry) => entry.coverageKey === 'liquidCO2');
  }

  getCo2TargetAmount() {
    const targetEntry = terraforming.liquidCoverageTargets.find((entry) => entry.coverageKey === 'liquidCO2');
    if (!targetEntry) {
      return 0;
    }
    const surfaceArea = terraforming.celestialParameters.surfaceArea;
    let total = 0;
    for (const zone of getZones()) {
      const zoneArea = surfaceArea * getZonePercentage(zone);
      total += estimateAmountForCoverage(targetEntry.coverageTarget, zoneArea);
    }
    return total;
  }

  getCo2IceTotalAmount() {
    let total = 0;
    for (const zone of getZones()) {
      const zoneSurface = terraforming.zonalSurface[zone];
      total += (zoneSurface.liquidCO2 || 0) + (zoneSurface.dryIce || 0);
    }
    return total;
  }

  exceedsCo2CoverageLimit(hasMonitoring) {
    if (!this.co2CoverageLimitEnabled(hasMonitoring)) {
      return false;
    }
    if (this.co2CoverageDisableMode === 'target' && this.hasCo2LiquidTarget()) {
      const totalAmount = this.getCo2IceTotalAmount();
      const targetAmount = this.getCo2TargetAmount();
      return totalAmount >= (targetAmount * (1 - ATMOSPHERIC_MONITORING_TOLERANCE));
    }
    const liquidCoverage = calculateAverageCoverage(terraforming, 'liquidCO2') || 0;
    const totalCoverage = Math.min(1, liquidCoverage);
    return totalCoverage >= (this.co2CoverageThreshold - ATMOSPHERIC_MONITORING_TOLERANCE);
  }

  getWaterTargetAmount() {
    const surfaceArea = terraforming.celestialParameters.surfaceArea;
    let total = 0;
    for (const zone of getZones()) {
      const zoneArea = surfaceArea * getZonePercentage(zone);
      total += estimateAmountForCoverage(terraforming.waterTarget, zoneArea);
    }
    return total;
  }

  getWaterIceTotalAmount() {
    let total = 0;
    for (const zone of getZones()) {
      const zoneSurface = terraforming.zonalSurface[zone];
      total += (zoneSurface.liquidWater || 0) + (zoneSurface.ice || 0);
    }
    return total;
  }

  exceedsWaterCoverageLimit(hasMonitoring) {
    if (!this.waterCoverageLimitEnabled(hasMonitoring)) {
      return false;
    }
    if (this.waterCoverageDisableMode === 'target') {
      const totalAmount = this.getWaterIceTotalAmount();
      const targetAmount = this.getWaterTargetAmount();
      return totalAmount >= (targetAmount * (1 - ATMOSPHERIC_MONITORING_TOLERANCE));
    }
    const liquidCoverage = calculateAverageCoverage(terraforming, 'liquidWater') || 0;
    const totalCoverage = Math.min(1, liquidCoverage);
    return totalCoverage >= (this.waterCoverageThreshold - ATMOSPHERIC_MONITORING_TOLERANCE);
  }

  getPressureLimitMass(limitKPa) {
    const gSurface = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
    const limitPa = limitKPa * 1000;
    return (limitPa * surfaceArea) / (1000 * gSurface);
  }

  getAtmosphericNeedForGas(gas, deltaTime = this.currentTickDeltaTime || 0) {
    return lifeManager.estimateAtmosphericIdealNeed(deltaTime)[gas] || 0;
  }

  isGasPressureLimitReached(gas, limitKPa, deltaTime = this.currentTickDeltaTime || 0) {
    const amount = resources.atmospheric[gas].value || 0;
    const maxMass = this.getPressureLimitMass(limitKPa);
    const consumptionBuffer = this.getAtmosphericNeedForGas(gas, deltaTime);
    return amount >= maxMass + consumptionBuffer;
  }

  shouldAutomationDisable() {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (this.exceedsWaterCoverageLimit(hasMonitoring)) {
      return true;
    }
    if (this.exceedsCo2CoverageLimit(hasMonitoring)) {
      return true;
    }
    if (hasMonitoring && this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      if (this.isGasPressureLimitReached(gas, this.disablePressureThreshold)) {
        return true;
      }
    }
    if (hasMonitoring && this.disableAboveOxygenPressure) {
      if (this.isGasPressureLimitReached('oxygen', this.disableOxygenPressureThreshold)) {
        return true;
      }
    }
    return false;
  }

  canStart() {
    if (!super.canStart()) return false;
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (this.exceedsWaterCoverageLimit(hasMonitoring)) {
      return false;
    }
    if (this.exceedsCo2CoverageLimit(hasMonitoring)) {
      return false;
    }
    if (hasMonitoring && this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      if (this.isGasPressureLimitReached(gas, this.disablePressureThreshold)) {
        return false;
      }
    }
    if (hasMonitoring && this.disableAboveOxygenPressure) {
      if (this.isGasPressureLimitReached('oxygen', this.disableOxygenPressureThreshold)) {
        return false;
      }
    }

    return true;
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      disableAbovePressure: this.disableAbovePressure === true,
      disablePressureThreshold: this.disablePressureThreshold,
      disableAboveOxygenPressure: this.disableAboveOxygenPressure === true,
      disableOxygenPressureThreshold: this.disableOxygenPressureThreshold,
      disableAboveWaterCoverage: this.disableAboveWaterCoverage === true,
      waterCoverageThreshold: this.waterCoverageThreshold,
      waterCoverageDisableMode: this.waterCoverageDisableMode,
      disableAboveCo2Coverage: this.disableAboveCo2Coverage === true,
      co2CoverageThreshold: this.co2CoverageThreshold,
      co2CoverageDisableMode: this.co2CoverageDisableMode,
      waterImportTarget: this.waterImportTarget,
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'disableAbovePressure')) {
      this.disableAbovePressure = settings.disableAbovePressure === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'disablePressureThreshold')) {
      this.disablePressureThreshold = settings.disablePressureThreshold || 0;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'disableAboveOxygenPressure')) {
      this.disableAboveOxygenPressure = settings.disableAboveOxygenPressure === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'disableOxygenPressureThreshold')) {
      this.disableOxygenPressureThreshold = settings.disableOxygenPressureThreshold || 0;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'disableAboveWaterCoverage')) {
      this.disableAboveWaterCoverage = settings.disableAboveWaterCoverage === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'waterCoverageThreshold')) {
      this.waterCoverageThreshold = Math.max(0, Math.min(settings.waterCoverageThreshold || 0, 1));
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'waterCoverageDisableMode')) {
      this.waterCoverageDisableMode = settings.waterCoverageDisableMode || this.waterCoverageDisableMode;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'disableAboveCo2Coverage')) {
      this.disableAboveCo2Coverage = settings.disableAboveCo2Coverage === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'co2CoverageThreshold')) {
      this.co2CoverageThreshold = Math.max(0, Math.min(settings.co2CoverageThreshold || 0, 1));
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'co2CoverageDisableMode')) {
      this.co2CoverageDisableMode = settings.co2CoverageDisableMode || this.co2CoverageDisableMode;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'waterImportTarget')) {
      this.waterImportTarget = settings.waterImportTarget === 'colony' ? 'colony' : 'surface';
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      disableAbovePressure: this.disableAbovePressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableAboveOxygenPressure: this.disableAboveOxygenPressure,
      disableOxygenPressureThreshold: this.disableOxygenPressureThreshold,
      disableAboveWaterCoverage: this.disableAboveWaterCoverage,
      waterCoverageThreshold: this.waterCoverageThreshold,
      waterCoverageDisableMode: this.waterCoverageDisableMode,
      disableAboveCo2Coverage: this.disableAboveCo2Coverage,
      co2CoverageThreshold: this.co2CoverageThreshold,
      co2CoverageDisableMode: this.co2CoverageDisableMode,
      pressureUnit: 'Pa',
      oxygenPressureUnit: 'Pa',
      waterImportTarget: this.waterImportTarget,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.disableAbovePressure = state.disableAbovePressure || false;
    this.disablePressureThreshold = state.disablePressureThreshold || 0;
    this.disableAboveOxygenPressure = state.disableAboveOxygenPressure || false;
    this.disableOxygenPressureThreshold = state.disableOxygenPressureThreshold || 0;
    this.disableAboveWaterCoverage = state.disableAboveWaterCoverage ?? this.disableAboveWaterCoverage;
    if (Number.isFinite(state.waterCoverageThreshold)) {
      this.waterCoverageThreshold = Math.max(0, Math.min(state.waterCoverageThreshold, 1));
    }
    this.waterCoverageDisableMode = state.waterCoverageDisableMode || this.waterCoverageDisableMode;
    this.disableAboveCo2Coverage = state.disableAboveCo2Coverage ?? this.disableAboveCo2Coverage;
    if (Number.isFinite(state.co2CoverageThreshold)) {
      this.co2CoverageThreshold = Math.max(0, Math.min(state.co2CoverageThreshold, 1));
    }
    this.co2CoverageDisableMode = state.co2CoverageDisableMode || this.co2CoverageDisableMode;
    this.pressureUnit = 'Pa';
    this.oxygenPressureUnit = 'Pa';
    this.waterImportTarget = state.waterImportTarget || this.waterImportTarget;
  }

  saveTravelState() {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return {};
    }
    return {
      disableAbovePressure: this.disableAbovePressure,
      disablePressureThreshold: this.disablePressureThreshold,
      disableAboveOxygenPressure: this.disableAboveOxygenPressure,
      disableOxygenPressureThreshold: this.disableOxygenPressureThreshold,
      disableAboveWaterCoverage: this.disableAboveWaterCoverage,
      waterCoverageThreshold: this.waterCoverageThreshold,
      waterCoverageDisableMode: this.waterCoverageDisableMode,
      disableAboveCo2Coverage: this.disableAboveCo2Coverage,
      co2CoverageThreshold: this.co2CoverageThreshold,
      co2CoverageDisableMode: this.co2CoverageDisableMode,
      pressureUnit: 'Pa',
      oxygenPressureUnit: 'Pa',
      waterImportTarget: this.waterImportTarget,
    };
  }

  loadTravelState(state = {}) {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return;
    }
    this.disableAbovePressure = !!state.disableAbovePressure;
    this.disablePressureThreshold = state.disablePressureThreshold ?? this.disablePressureThreshold;
    this.disableAboveOxygenPressure = !!state.disableAboveOxygenPressure;
    this.disableOxygenPressureThreshold = state.disableOxygenPressureThreshold ?? this.disableOxygenPressureThreshold;
    this.disableAboveWaterCoverage = state.disableAboveWaterCoverage ?? this.disableAboveWaterCoverage;
    this.waterCoverageThreshold = state.waterCoverageThreshold ?? this.waterCoverageThreshold;
    this.waterCoverageDisableMode = state.waterCoverageDisableMode || this.waterCoverageDisableMode;
    this.disableAboveCo2Coverage = state.disableAboveCo2Coverage ?? this.disableAboveCo2Coverage;
    this.co2CoverageThreshold = state.co2CoverageThreshold ?? this.co2CoverageThreshold;
    this.co2CoverageDisableMode = state.co2CoverageDisableMode || this.co2CoverageDisableMode;
    this.pressureUnit = 'Pa';
    this.oxygenPressureUnit = 'Pa';
    this.waterImportTarget = state.waterImportTarget || this.waterImportTarget;
  }

  calculateSpaceshipGainPerShip() {
    if (this.attributes.dynamicWaterImport && this.attributes.resourceGainPerShip?.surface?.ice) {
      const capacity = this.getShipCapacity(this.attributes.resourceGainPerShip.surface.ice);
      if (this.isBooleanFlagSet('waterImportTargeting') && this.waterImportTarget === 'colony') {
        return { colony: { water: capacity } };
      }
      const zones = getZones();
      const allBelow = zones.every(z => (terraforming?.temperature?.zones?.[z]?.value || 0) <= 273.15);
      const resource = allBelow ? 'ice' : 'liquidWater';
      return { surface: { [resource]: capacity } };
    }
    return super.calculateSpaceshipGainPerShip();
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    if (this.attributes.dynamicWaterImport && this.attributes.resourceGainPerShip?.surface?.ice) {
      const gainPerShip = this.calculateSpaceshipGainPerShip();
      const category = gainPerShip.colony ? 'colony' : 'surface';
      const resource = Object.keys(gainPerShip[category])[0];
      const multiplier = perSecond
        ? this.getActiveShipCount() * (1000 / (this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration()))
        : 1;
      return { [category]: { [resource]: gainPerShip[category][resource] * multiplier } };
    }
    return super.calculateSpaceshipTotalResourceGain(perSecond);
  }

  applyWaterImportToColony(amount, accumulatedChanges = null) {
    const resource = resources.colony.water;
    const pending = accumulatedChanges?.colony?.water || 0;
    const current = resource.value + pending;
    const limit = resource.hasCap
      ? (current >= resource.cap ? current : resource.cap)
      : current + amount;
    const available = Math.max(0, limit - current);
    const toColony = Math.min(amount, available);
    if (toColony > 0) {
      if (accumulatedChanges) {
        if (!accumulatedChanges.colony) accumulatedChanges.colony = {};
        accumulatedChanges.colony.water = (accumulatedChanges.colony.water || 0) + toColony;
      } else {
        resource.value += toColony;
      }
    }
    return amount - toColony;
  }

  getContinuousGainScaleLimit(context, gainBase, accumulatedChanges = null, productivity = 1) {
    let ratio = super.getContinuousGainScaleLimit(context, gainBase, accumulatedChanges, productivity);
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (!hasMonitoring || !this.disableAbovePressure || !gainBase.atmospheric) {
      return ratio;
    }

    const gas = this.getTargetAtmosphericResource();
    if (!gas || !gainBase.atmospheric[gas]) {
      return ratio;
    }

    const desired = gainBase.atmospheric[gas] * context.fraction * context.successChance * productivity;
    if (desired <= 0) {
      return ratio;
    }

    const deltaTime = context.duration * context.fraction * context.successChance;
    const lifeConsumption = lifeManager.estimateAtmosphericIdealNeed(deltaTime);
    const currentAmount = resources.atmospheric[gas].value + (accumulatedChanges?.atmospheric?.[gas] || 0);
    const gSurface = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
    const limitPa = this.disablePressureThreshold * 1000;
    const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
    const gasLifeConsumption = lifeConsumption[gas] || 0;
    const safetyMargin = gasLifeConsumption > 0 ? 1 : 0;
    const remaining = Math.max(0, Math.max(0, maxMass - currentAmount) + gasLifeConsumption - safetyMargin);
    const pressureRatio = Math.max(0, Math.min(1, remaining / desired));
    if (pressureRatio < 1) {
      resources.atmospheric[gas].automationLimited = true;
    }
    ratio = Math.min(ratio, pressureRatio);
    return ratio;
  }

  applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (this.exceedsCo2CoverageLimit(hasMonitoring)) {
      resources.surface.liquidCO2.automationLimited = true;
      return;
    }
    if (this.attributes.dynamicWaterImport && (gain.surface || gain.colony)) {
      const entry = gain.colony || gain.surface;
      const resourceName = Object.keys(entry)[0];
      const zones = getZones();
      const temps = terraforming?.temperature?.zones || {};
      const allBelow = zones.every(z => (temps[z]?.value || 0) <= 273.15);
      if (this.exceedsWaterCoverageLimit(hasMonitoring)) {
        const surfaceResource = allBelow ? 'ice' : 'liquidWater';
        resources.surface[surfaceResource].automationLimited = true;
        return;
      }
      let amount = entry[resourceName] * fraction * productivity;
      if (this.isBooleanFlagSet('waterImportTargeting') && this.waterImportTarget === 'colony') {
        amount = this.applyWaterImportToColony(amount, accumulatedChanges);
        if (amount <= 0) {
          return;
        }
      }
      const seconds = this.currentTickDeltaTime ? this.currentTickDeltaTime / 1000 : 0;
      if (allBelow || resourceName === 'ice') {
        if (this.isBooleanFlagSet('waterImportTargeting') && this.waterImportTarget === 'colony' && seconds > 0) {
          resources.surface?.ice?.modifyRate?.(amount / seconds, 'Spaceship Mining', 'project');
        }
      } else {
        if (this.isBooleanFlagSet('waterImportTargeting') && this.waterImportTarget === 'colony' && seconds > 0) {
          resources.surface?.liquidWater?.modifyRate?.(amount / seconds, 'Spaceship Mining', 'project');
        }
      }
      if (typeof terraforming.synchronizeGlobalResources === 'function') {
        terraforming.synchronizeGlobalResources();
      }
      return;
    }
    if (hasMonitoring && this.disableAbovePressure && gain.atmospheric) {
      const gas = this.getTargetAtmosphericResource();
      const entry = gain.atmospheric;
      const duration = this.getShipOperationDuration ? this.getShipOperationDuration() : this.getEffectiveDuration();
      const deltaTime = this.isContinuous() ? fraction * duration : 0;
      const lifeConsumption = lifeManager.estimateAtmosphericIdealNeed(deltaTime);
      const currentAmount = resources.atmospheric[gas].value + (accumulatedChanges?.atmospheric?.[gas] || 0);
      const gSurface = terraforming.celestialParameters.gravity;
      const radius = terraforming.celestialParameters.radius;
      const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
      const limitPa = this.disablePressureThreshold * 1000;
      const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
      const gasLifeConsumption = lifeConsumption[gas] || 0;
      const safetyMargin = gasLifeConsumption > 0 ? 1 : 0;
      const remaining = Math.max(0, Math.max(0, maxMass - currentAmount) + gasLifeConsumption - safetyMargin);
      const desired = entry[gas] * fraction * productivity;
      const applied = Math.min(desired, remaining);
      if (applied < desired) {
        resources.atmospheric[gas].automationLimited = true;
      }
      if (applied <= 0) {
        delete entry[gas];
        if (Object.keys(entry).length === 0) {
          delete gain.atmospheric;
        }
      } else {
        const scale = fraction * productivity;
        entry[gas] = scale > 0 ? applied / scale : 0;
      }
    }
    super.applySpaceshipResourceGain(gain, fraction, accumulatedChanges, productivity);
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMiningProject = SpaceMiningProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceMiningProject;
}
