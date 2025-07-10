class SpaceMiningProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.disableAbovePressure = false;
    this.disablePressureThreshold = 0;
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

  applyMetalCostPenalty(gain) {
    if (!this.shouldPenalizeMetalProduction()) return;
    const cost = this.calculateSpaceshipCost();
    const metalCost = cost.colony?.metal || 0;
    const scaling = this.assignedSpaceships > 100 ? this.assignedSpaceships / 100 : 1;
    const totalCost = metalCost * scaling;
    if (gain.colony && typeof gain.colony.metal === 'number') {
      gain.colony.metal = Math.max(0, gain.colony.metal - totalCost);
    }
  }

  createPressureControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'pressure-control');
    control.id = `${this.name}-pressure-control`;
    control.style.display = this.isBooleanFlagSet('atmosphericMonitoring') ? 'flex' : 'none';
  
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('pressure-checkbox');
    checkbox.checked = this.disableAbovePressure;
    checkbox.addEventListener('change', () => {
      this.disableAbovePressure = checkbox.checked;
    });
    control.appendChild(checkbox);
  
    const label = document.createElement('label');
    label.textContent = 'Disable if pressure above: ';
    control.appendChild(label);
  
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.classList.add('pressure-input');
    input.value = this.disablePressureThreshold;
    input.addEventListener('input', () => {
      this.disablePressureThreshold = parseFloat(input.value) || 0;
    });
    control.appendChild(input);
  
    const unit = document.createElement('span');
    unit.textContent = 'kPa';
    control.appendChild(unit);
  
    projectElements[this.name] = {
      ...projectElements[this.name],
      pressureControl: control,
      pressureCheckbox: checkbox,
      pressureInput: input,
    };
  
    return control;
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
    if (elements.pressureInput) {
      if (document.activeElement !== elements.pressureInput) {
        elements.pressureInput.value = this.disablePressureThreshold;
      }
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

    return true;
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMiningProject = SpaceMiningProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceMiningProject;
}
