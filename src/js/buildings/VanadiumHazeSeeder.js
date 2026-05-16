const DEFAULT_VANADIUM_AUTOMATION_SETTINGS = {
  autoDisableAbovePressure: false,
  disablePressureThreshold: 1, // kPa
};

function getVanadiumHazeSeederText(path, fallback, vars) {
  return t(path, vars, fallback);
}

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class VanadiumHazeSeeder extends Building {
  getAutomationSettings() {
    return VanadiumHazeSeeder.getAutomationSettings();
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const {
      targetProductivity: baseTarget,
      hasAtmosphericOversight,
      computeMaxProduction
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0n) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    const settings = getVanadiumAutomationSettings(this);
    if (hasAtmosphericOversight && settings.autoDisableAbovePressure) {
      const vanadiumAerosol = resources.atmospheric.vanadiumAerosol;
      const targetPa = settings.disablePressureThreshold * 1000;
      const currentPa = calculateAtmosphericPressure(
        vanadiumAerosol.value,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      if (currentPa >= targetPa) {
        this.setAutomationActivityMultiplier(0);
        this.productivity = 0;
        return;
      }
      const maxProduction = computeMaxProduction('atmospheric', 'vanadiumAerosol');
      if (maxProduction > 0) {
        const maxPa = calculateAtmosphericPressure(
          vanadiumAerosol.value + maxProduction,
          terraforming.celestialParameters.gravity,
          terraforming.celestialParameters.radius
        );
        const deltaPa = maxPa - currentPa;
        const neededPa = targetPa - currentPa;
        if (deltaPa > 0) {
          const required = Math.min(
            maxProduction,
            maxProduction * (neededPa / deltaPa)
          );
          this.productivity = Math.min(baseTarget, required / maxProduction);
        } else {
          this.productivity = baseTarget;
        }
        return;
      }
    }

    this.productivity = this.applyProductivityDamping(
      this.productivity,
      baseTarget,
      deltaTime
    );
  }

  initUI(autoBuildContainer, cache) {
    if (!autoBuildContainer || !cache) {
      return;
    }

    const settings = getVanadiumAutomationSettings(this);
    const pressureControl = document.createElement('div');
    pressureControl.classList.add('o2-pressure-control');
    pressureControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature')
      ? 'flex'
      : 'none';

    const pressureCheckbox = document.createElement('input');
    pressureCheckbox.type = 'checkbox';
    pressureCheckbox.id = `${this.name}-vanadium-disable-checkbox`;
    pressureCheckbox.classList.add('o2-pressure-checkbox');
    pressureCheckbox.checked = settings.autoDisableAbovePressure;
    pressureCheckbox.addEventListener('change', () => {
      settings.autoDisableAbovePressure = pressureCheckbox.checked;
    });
    pressureControl.appendChild(pressureCheckbox);

    const pressureLabel = document.createElement('label');
    pressureLabel.htmlFor = pressureCheckbox.id;
    pressureLabel.textContent = getVanadiumHazeSeederText(
      'ui.buildings.vanadiumHazeSeeder.disableIfPressureAbove',
      'Disable if V aerosol P > '
    );
    pressureControl.appendChild(pressureLabel);

    const pressureInput = document.createElement('input');
    pressureInput.type = 'text';
    pressureInput.inputMode = 'decimal';
    pressureInput.classList.add('o2-pressure-input');
    pressureControl.appendChild(pressureInput);

    const unitSpan = document.createElement('span');
    unitSpan.classList.add('o2-pressure-unit');
    unitSpan.textContent = getVanadiumHazeSeederText(
      'ui.buildings.vanadiumHazeSeeder.pressureUnit',
      'Pa'
    );
    pressureControl.appendChild(unitSpan);

    if (document.activeElement !== pressureInput) {
      pressureInput.value = formatNumber(settings.disablePressureThreshold * 1000, true, 2);
    }

    wireStringNumberInput(pressureInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (value) => formatNumber(Math.max(0, value), true, 2),
      onValue: (value) => {
        settings.disablePressureThreshold = Math.max(0, value) / 1000;
      },
      datasetKey: 'vanadiumPressurePa',
    });

    autoBuildContainer.appendChild(pressureControl);

    cache.vanadium = {
      container: pressureControl,
      checkbox: pressureCheckbox,
      input: pressureInput,
      unitSpan,
    };
  }

  updateUI(elements) {
    super.updateUI(elements);
    const vanadiumElements = elements?.vanadium;
    if (!vanadiumElements || !vanadiumElements.container) {
      return;
    }

    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    vanadiumElements.container.style.display = enabled ? 'flex' : 'none';
    const settings = getVanadiumAutomationSettings(this);
    if (vanadiumElements.checkbox) {
      vanadiumElements.checkbox.checked = settings.autoDisableAbovePressure;
    }
    if (vanadiumElements.input && document.activeElement !== vanadiumElements.input) {
      vanadiumElements.input.value = formatNumber(settings.disablePressureThreshold * 1000, true, 2);
    }
    if (vanadiumElements.unitSpan) {
      vanadiumElements.unitSpan.textContent = getVanadiumHazeSeederText(
        'ui.buildings.vanadiumHazeSeeder.pressureUnit',
        'Pa'
      );
    }
  }

  saveState() {
    const state = super.saveState();
    state.automationSettings = VanadiumHazeSeeder.saveAutomationSettings();
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    VanadiumHazeSeeder.loadAutomationSettings(state.automationSettings);
  }

  static getAutomationSettings() {
    if (!this.automationSettings) {
      this.automationSettings = {
        autoDisableAbovePressure: DEFAULT_VANADIUM_AUTOMATION_SETTINGS.autoDisableAbovePressure,
        disablePressureThreshold: DEFAULT_VANADIUM_AUTOMATION_SETTINGS.disablePressureThreshold
      };
    }
    return this.automationSettings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      autoDisableAbovePressure: settings.autoDisableAbovePressure === true,
      disablePressureThreshold: sanitizeNumber(
        settings.disablePressureThreshold,
        DEFAULT_VANADIUM_AUTOMATION_SETTINGS.disablePressureThreshold
      )
    };
  }

  static loadAutomationSettings(saved) {
    const settings = this.getAutomationSettings();
    const hasData = saved && saved.constructor === Object;
    settings.autoDisableAbovePressure = hasData && 'autoDisableAbovePressure' in saved
      ? saved.autoDisableAbovePressure === true
      : DEFAULT_VANADIUM_AUTOMATION_SETTINGS.autoDisableAbovePressure;
    settings.disablePressureThreshold = hasData && 'disablePressureThreshold' in saved
      ? sanitizeNumber(saved.disablePressureThreshold, DEFAULT_VANADIUM_AUTOMATION_SETTINGS.disablePressureThreshold)
      : DEFAULT_VANADIUM_AUTOMATION_SETTINGS.disablePressureThreshold;
    return settings;
  }
}

function getVanadiumAutomationSettings(context) {
  if (context && context.getAutomationSettings) {
    return context.getAutomationSettings();
  }
  return VanadiumHazeSeeder.getAutomationSettings();
}

const vanadiumHazeSeederSettings = VanadiumHazeSeeder.getAutomationSettings();

try {
  module.exports = { VanadiumHazeSeeder, vanadiumHazeSeederSettings };
} catch (error) {
  window.VanadiumHazeSeeder = VanadiumHazeSeeder;
  window.vanadiumHazeSeederSettings = vanadiumHazeSeederSettings;
}
