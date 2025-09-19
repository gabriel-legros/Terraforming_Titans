const DEFAULT_OXYGEN_AUTOMATION_SETTINGS = {
  autoDisableAbovePressure: false,
  disablePressureThreshold: 15, // kPa
};

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class OxygenFactory extends Building {
  getAutomationSettings() {
    return OxygenFactory.getAutomationSettings();
  }

  updateProductivity(resources, deltaTime) {
    const {
      targetProductivity: baseTarget,
      hasAtmosphericOversight,
      computeMaxProduction,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0) {
      this.productivity = 0;
      return;
    }

    let targetProductivity = baseTarget;
    const settings = getOxygenAutomationSettings(this);

    if (
      hasAtmosphericOversight &&
      settings.autoDisableAbovePressure &&
      terraforming &&
      resources.atmospheric?.oxygen &&
      typeof calculateAtmosphericPressure === 'function'
    ) {
      const oxygen = resources.atmospheric.oxygen;
      const targetPa = settings.disablePressureThreshold * 1000;
      const currentPa = calculateAtmosphericPressure(
        oxygen.value,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      if (currentPa >= targetPa) {
        this.productivity = 0;
        return;
      }
      const maxProduction = computeMaxProduction('atmospheric', 'oxygen');
      if (maxProduction > 0) {
        const originalAmount = oxygen.value;
        const required = solveRequired((added) => {
          return (
            calculateAtmosphericPressure(
              originalAmount + added,
              terraforming.celestialParameters.gravity,
              terraforming.celestialParameters.radius
            ) - targetPa
          );
        }, maxProduction);
        this.productivity = Math.min(
          targetProductivity,
          required / maxProduction
        );
        return;
      }
    }

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity +=
        dampingFactor * (targetProductivity - this.productivity);
    }
  }

  initUI(autoBuildContainer, cache) {
    if (!autoBuildContainer || !cache) return;

    const settings = getOxygenAutomationSettings(this);

    const pressureControl = document.createElement('div');
    pressureControl.classList.add('o2-pressure-control');
    pressureControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature')
      ? 'flex'
      : 'none';

    const pressureCheckbox = document.createElement('input');
    pressureCheckbox.type = 'checkbox';
    pressureCheckbox.classList.add('o2-pressure-checkbox');
    pressureCheckbox.checked = settings.autoDisableAbovePressure;
    pressureCheckbox.addEventListener('change', () => {
      settings.autoDisableAbovePressure = pressureCheckbox.checked;
    });
    pressureControl.appendChild(pressureCheckbox);

    const pressureLabel = document.createElement('span');
    pressureLabel.textContent = 'Disable if O2 P > ';
    pressureControl.appendChild(pressureLabel);

    const pressureInput = document.createElement('input');
    pressureInput.type = 'number';
    pressureInput.step = 1;
    pressureInput.classList.add('o2-pressure-input');
    pressureControl.appendChild(pressureInput);

    const unitSpan = document.createElement('span');
    unitSpan.classList.add('o2-pressure-unit');
    unitSpan.textContent = 'kPa';
    pressureControl.appendChild(unitSpan);

    const update = () => {
      if (document.activeElement !== pressureInput) {
        pressureInput.value = settings.disablePressureThreshold;
      }
    };
    update();

    pressureInput.addEventListener('input', () => {
      const val = parseFloat(pressureInput.value);
      settings.disablePressureThreshold = val;
    });

    autoBuildContainer.appendChild(pressureControl);

    cache.o2 = {
      container: pressureControl,
      checkbox: pressureCheckbox,
      input: pressureInput,
      unitSpan: unitSpan
    };
  }

  updateUI(elements) {
    const o2Els = elements?.o2;
    if (!o2Els || !o2Els.container) return;

    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    o2Els.container.style.display = enabled ? 'flex' : 'none';
    const settings = getOxygenAutomationSettings(this);
    if (o2Els.checkbox) {
      o2Els.checkbox.checked = settings.autoDisableAbovePressure;
    }
    if (o2Els.input && document.activeElement !== o2Els.input) {
      o2Els.input.value = settings.disablePressureThreshold;
    }
    if (o2Els.unitSpan) {
      o2Els.unitSpan.textContent = 'kPa';
    }
  }

  static getAutomationSettings() {
    if (!this.automationSettings) {
      this.automationSettings = {
        autoDisableAbovePressure: DEFAULT_OXYGEN_AUTOMATION_SETTINGS.autoDisableAbovePressure,
        disablePressureThreshold: DEFAULT_OXYGEN_AUTOMATION_SETTINGS.disablePressureThreshold
      };
    }
    return this.automationSettings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      autoDisableAbovePressure: !!settings.autoDisableAbovePressure,
      disablePressureThreshold: sanitizeNumber(
        settings.disablePressureThreshold,
        DEFAULT_OXYGEN_AUTOMATION_SETTINGS.disablePressureThreshold
      )
    };
  }

  static loadAutomationSettings(saved) {
    const settings = this.getAutomationSettings();
    const hasData = saved && saved.constructor === Object;
    settings.autoDisableAbovePressure = hasData && 'autoDisableAbovePressure' in saved
      ? !!saved.autoDisableAbovePressure
      : DEFAULT_OXYGEN_AUTOMATION_SETTINGS.autoDisableAbovePressure;
    settings.disablePressureThreshold = hasData && 'disablePressureThreshold' in saved
      ? sanitizeNumber(saved.disablePressureThreshold, DEFAULT_OXYGEN_AUTOMATION_SETTINGS.disablePressureThreshold)
      : DEFAULT_OXYGEN_AUTOMATION_SETTINGS.disablePressureThreshold;
    return settings;
  }
}

function getOxygenAutomationSettings(context) {
  if (context && typeof context.getAutomationSettings === 'function') {
    return context.getAutomationSettings();
  }
  return OxygenFactory.getAutomationSettings();
}

const oxygenFactorySettings = OxygenFactory.getAutomationSettings();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OxygenFactory, oxygenFactorySettings };
} else {
  globalThis.OxygenFactory = OxygenFactory;
  globalThis.oxygenFactorySettings = oxygenFactorySettings;
}
