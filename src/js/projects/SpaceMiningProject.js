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
    this.hasOxygenPressureControl = false;
    this.pressureUnit = 'kPa';
    this.oxygenPressureUnit = 'kPa';
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
    checkbox.classList.add(`${key}-checkbox`);
    checkbox.checked = this[checkedProp];
    checkbox.addEventListener('change', () => {
      this[checkedProp] = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    const gasLabel = this.getGasAbbreviation(gas);
    label.textContent = `Disable if ${gasLabel} pressure above: `;
    control.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.classList.add(`${key}-input`);
    input.value = this[thresholdProp];
    input.addEventListener('input', () => {
      const rawValue = input.value;
      if (rawValue === '') {
        return;
      }
      const val = Number(rawValue);
      if (!Number.isFinite(val)) {
        this[thresholdProp] = 0;
        return;
      }
      this[thresholdProp] = this[unitProp] === 'Pa' ? (val / 1000) : val;
    });
    input.addEventListener('blur', () => {
      if (input.value === '') {
        this[thresholdProp] = 0;
        input.value = this[unitProp] === 'Pa'
          ? this[thresholdProp] * 1000
          : this[thresholdProp];
      }
    });
    control.appendChild(input);

    const unitSelect = document.createElement('select');
    unitSelect.classList.add(`${key}-unit`);
    ['kPa', 'Pa'].forEach(u => {
      const option = document.createElement('option');
      option.value = u;
      option.textContent = u;
      unitSelect.appendChild(option);
    });
    const unitProp = `${key}Unit`;
    unitSelect.value = this[unitProp];
    unitSelect.addEventListener('change', () => {
      this[unitProp] = unitSelect.value;
      input.value = this[unitProp] === 'Pa'
        ? this[thresholdProp] * 1000
        : this[thresholdProp];
    });
    control.appendChild(unitSelect);

    projectElements[this.name] = {
      ...projectElements[this.name],
      [`${key}Control`]: control,
      [`${key}Checkbox`]: checkbox,
      [`${key}Input`]: input,
      [`${key}UnitSelect`]: unitSelect,
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
    checkbox.classList.add('water-coverage-checkbox');
    checkbox.checked = this.disableAboveWaterCoverage;
    checkbox.addEventListener('change', () => {
      this.disableAboveWaterCoverage = checkbox.checked;
    });
    control.appendChild(checkbox);

    const label = document.createElement('label');
    label.textContent = 'Disable if ';
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
    label.appendChild(modeSelect);

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
    if (elements.pressureUnitSelect) {
      elements.pressureUnitSelect.value = this.pressureUnit;
    }
    if (elements.pressureInput && document.activeElement !== elements.pressureInput) {
      elements.pressureInput.value = this.pressureUnit === 'Pa'
        ? this.disablePressureThreshold * 1000
        : this.disablePressureThreshold;
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
    if (elements.oxygenPressureUnitSelect) {
      elements.oxygenPressureUnitSelect.value = this.oxygenPressureUnit;
    }
    if (elements.oxygenPressureInput && document.activeElement !== elements.oxygenPressureInput) {
      elements.oxygenPressureInput.value = this.oxygenPressureUnit === 'Pa'
        ? this.disableOxygenPressureThreshold * 1000
        : this.disableOxygenPressureThreshold;
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

  shouldAutomationDisable() {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
    if (this.exceedsWaterCoverageLimit(hasMonitoring)) {
      return true;
    }
    if (hasMonitoring && this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      const amount = resources.atmospheric[gas].value || 0;
      const consumption = lifeManager.estimateAtmosphericConsumption(this.currentTickDeltaTime || 0)[gas] || 0;
      const gSurface = terraforming.celestialParameters.gravity;
      const radius = terraforming.celestialParameters.radius;
      const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
      const limitPa = this.disablePressureThreshold * 1000;
      const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
      if (amount >= maxMass + consumption) {
        return true;
      }
    }
    if (hasMonitoring && this.disableAboveOxygenPressure) {
      const amount = resources.atmospheric.oxygen.value || 0;
      const consumption = lifeManager.estimateAtmosphericConsumption(this.currentTickDeltaTime || 0).oxygen || 0;
      const gSurface = terraforming.celestialParameters.gravity;
      const radius = terraforming.celestialParameters.radius;
      const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
      const limitPa = this.disableOxygenPressureThreshold * 1000;
      const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
      if (amount >= maxMass + consumption) {
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
    if (hasMonitoring && this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      const amount = resources.atmospheric[gas].value || 0;
      const pressurePa = calculateAtmosphericPressure(
        amount,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      const pressureKPa = pressurePa / 1000;
      if (pressureKPa >= this.disablePressureThreshold) {
        return false;
      }
    }
    if (hasMonitoring && this.disableAboveOxygenPressure) {
      const amount = resources.atmospheric.oxygen.value || 0;
      const pressurePa = calculateAtmosphericPressure(
        amount,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      const pressureKPa = pressurePa / 1000;
      if (pressureKPa >= this.disableOxygenPressureThreshold) {
        return false;
      }
    }

    return true;
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
      pressureUnit: this.pressureUnit,
      oxygenPressureUnit: this.oxygenPressureUnit,
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
    this.pressureUnit = state.pressureUnit || 'kPa';
    this.oxygenPressureUnit = state.oxygenPressureUnit || 'kPa';
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
      pressureUnit: this.pressureUnit,
      oxygenPressureUnit: this.oxygenPressureUnit,
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
    this.pressureUnit = state.pressureUnit || this.pressureUnit;
    this.oxygenPressureUnit = state.oxygenPressureUnit || this.oxygenPressureUnit;
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

  applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
    const hasMonitoring = this.isBooleanFlagSet('atmosphericMonitoring');
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
      const lifeConsumption = lifeManager.estimateAtmosphericConsumption(deltaTime);
      const currentAmount = resources.atmospheric[gas].value + (accumulatedChanges?.atmospheric?.[gas] || 0);
      const gSurface = terraforming.celestialParameters.gravity;
      const radius = terraforming.celestialParameters.radius;
      const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
      const limitPa = this.disablePressureThreshold * 1000;
      const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
      const remaining = Math.max(0, maxMass - currentAmount) + (lifeConsumption[gas] || 0) + 1;
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
