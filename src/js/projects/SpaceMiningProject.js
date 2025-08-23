class SpaceMiningProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.disableAbovePressure = false;
    this.disablePressureThreshold = 0;
    this.disableAboveOxygenPressure = false;
    this.disableOxygenPressureThreshold = 0;
    this.hasOxygenPressureControl = false;
    const maxPressure = config.attributes?.maxPressure;
    if (typeof maxPressure === 'number') {
      this.disablePressureThreshold = maxPressure;
    }
    const maxOxygenPressure = config.attributes?.maxOxygenPressure;
    if (typeof maxOxygenPressure === 'number') {
      this.disableOxygenPressureThreshold = maxOxygenPressure;
      this.hasOxygenPressureControl = true;
    }
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
      this[thresholdProp] = parseFloat(input.value) || 0;
    });
    control.appendChild(input);

    const unit = document.createElement('span');
    unit.textContent = 'kPa';
    control.appendChild(unit);

    projectElements[this.name] = {
      ...projectElements[this.name],
      [`${key}Control`]: control,
      [`${key}Checkbox`]: checkbox,
      [`${key}Input`]: input,
    };

    return control;
  }

  createPressureControl() {
    const gas = this.getTargetAtmosphericResource();
    return this.createGasPressureControl(gas, 'disableAbovePressure', 'disablePressureThreshold', 'pressure');
  }

  renderAutomationUI(container) {
    if (!projectElements[this.name]?.pressureControl) {
      const gas = this.getTargetAtmosphericResource();
      container.appendChild(this.createGasPressureControl(gas, 'disableAbovePressure', 'disablePressureThreshold', 'pressure'));
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
      elements.pressureInput.value = this.disablePressureThreshold;
    }
    if (elements.oxygenPressureControl) {
      elements.oxygenPressureControl.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';
    }
    if (elements.oxygenPressureCheckbox) {
      elements.oxygenPressureCheckbox.checked = this.disableAboveOxygenPressure;
    }
    if (elements.oxygenPressureInput && document.activeElement !== elements.oxygenPressureInput) {
      elements.oxygenPressureInput.value = this.disableOxygenPressureThreshold;
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

  shouldAutomationDisable() {
    if (this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      if (gas && typeof terraforming !== 'undefined' && resources.atmospheric && resources.atmospheric[gas]) {
        const amount = resources.atmospheric[gas].value || 0;
        const pressurePa = calculateAtmosphericPressure(
          amount,
          terraforming.celestialParameters.gravity,
          terraforming.celestialParameters.radius
        );
        const pressureKPa = pressurePa / 1000;
        if (pressureKPa >= this.disablePressureThreshold) {
          return true;
        }
      }
    }
    if (this.disableAboveOxygenPressure && typeof terraforming !== 'undefined' && resources.atmospheric?.oxygen) {
      const amount = resources.atmospheric.oxygen.value || 0;
      const pressurePa = calculateAtmosphericPressure(
        amount,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      const pressureKPa = pressurePa / 1000;
      if (pressureKPa >= this.disableOxygenPressureThreshold) {
        return true;
      }
    }
    return false;
  }

  canStart() {
    if (!super.canStart()) return false;

    if (this.disableAbovePressure) {
      const gas = this.getTargetAtmosphericResource();
      if (gas && typeof terraforming !== 'undefined' && resources.atmospheric && resources.atmospheric[gas]) {
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
    }
    if (this.disableAboveOxygenPressure && typeof terraforming !== 'undefined' && resources.atmospheric?.oxygen) {
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
    };
  }

  loadState(state) {
    super.loadState(state);
    this.disableAbovePressure = state.disableAbovePressure || false;
    this.disablePressureThreshold = state.disablePressureThreshold || 0;
    this.disableAboveOxygenPressure = state.disableAboveOxygenPressure || false;
    this.disableOxygenPressureThreshold = state.disableOxygenPressureThreshold || 0;
  }

  calculateSpaceshipGainPerShip() {
    if (this.attributes.dynamicWaterImport && this.attributes.resourceGainPerShip?.surface?.ice) {
      const zones = ['tropical', 'temperate', 'polar'];
      const allBelow = zones.every(z => (terraforming?.temperature?.zones?.[z]?.value || 0) <= 273.15);
      const resource = allBelow ? 'ice' : 'liquidWater';
      const capacity = this.getShipCapacity(this.attributes.resourceGainPerShip.surface.ice);
      return { surface: { [resource]: capacity } };
    }
    return super.calculateSpaceshipGainPerShip();
  }

  calculateSpaceshipTotalResourceGain(perSecond = false) {
    if (this.attributes.dynamicWaterImport && this.attributes.resourceGainPerShip?.surface?.ice) {
      const gainPerShip = this.calculateSpaceshipGainPerShip();
      const resource = Object.keys(gainPerShip.surface)[0];
      const multiplier = perSecond
        ? this.assignedSpaceships * (1000 / this.getEffectiveDuration())
        : this.assignedSpaceships;
      return { surface: { [resource]: gainPerShip.surface[resource] * multiplier } };
    }
    return super.calculateSpaceshipTotalResourceGain(perSecond);
  }

  applySpaceshipResourceGain(gain, fraction, accumulatedChanges = null, productivity = 1) {
    if (this.attributes.dynamicWaterImport && gain.surface) {
      const entry = gain.surface;
      const resource = Object.keys(entry)[0];
      const amount = entry[resource] * fraction * productivity;
      const zones = ['tropical', 'temperate', 'polar'];
      const temps = terraforming?.temperature?.zones || {};
      const allBelow = zones.every(z => (temps[z]?.value || 0) <= 273.15);
      if (allBelow || resource === 'ice') {
        zones.forEach(zone => {
          const pct = (typeof getZonePercentage === 'function') ? getZonePercentage(zone) : 1 / zones.length;
          terraforming.zonalWater[zone].ice += amount * pct;
        });
      } else {
        const eligible = zones.filter(z => (temps[z]?.value || 0) > 273.15);
        const totalPct = eligible.reduce((s, z) => s + ((typeof getZonePercentage === 'function') ? getZonePercentage(z) : 1 / zones.length), 0);
        eligible.forEach(zone => {
          const pct = (typeof getZonePercentage === 'function') ? getZonePercentage(zone) : 1 / eligible.length;
          terraforming.zonalWater[zone].liquid += amount * (pct / totalPct);
        });
      }
      if (typeof terraforming.synchronizeGlobalResources === 'function') {
        terraforming.synchronizeGlobalResources();
      }
      return;
    }
    if (this.disableAbovePressure && gain.atmospheric) {
      const gas = this.getTargetAtmosphericResource();
      const entry = gain.atmospheric;
      if (
        gas &&
        typeof entry[gas] === 'number' &&
        typeof terraforming !== 'undefined' &&
        resources.atmospheric &&
        resources.atmospheric[gas]
      ) {
        const currentAmount = resources.atmospheric[gas].value || 0;
        const gSurface = terraforming.celestialParameters.gravity;
        const radius = terraforming.celestialParameters.radius;
        const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
        const limitPa = this.disablePressureThreshold * 1000;
        const maxMass = (limitPa * surfaceArea) / (1000 * gSurface);
        const remaining = Math.max(0, maxMass - currentAmount);
        const desired = entry[gas] * fraction * productivity;
        const applied = Math.min(desired, remaining);
        if (applied <= 0) {
          delete entry[gas];
          if (Object.keys(entry).length === 0) {
            delete gain.atmospheric;
          }
        } else {
          entry[gas] = applied / fraction;
        }
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
