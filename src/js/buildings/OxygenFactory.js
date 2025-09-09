var oxygenFactorySettings = oxygenFactorySettings || {
  autoDisableAbovePressure: false,
  disablePressureThreshold: 15, // kPa
};

class OxygenFactory extends Building {
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

    if (
      hasAtmosphericOversight &&
      oxygenFactorySettings.autoDisableAbovePressure &&
      terraforming &&
      resources.atmospheric?.oxygen &&
      typeof calculateAtmosphericPressure === 'function'
    ) {
      const oxygen = resources.atmospheric.oxygen;
      const targetPa = oxygenFactorySettings.disablePressureThreshold * 1000;
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

    const pressureControl = document.createElement('div');
    pressureControl.classList.add('o2-pressure-control');
    pressureControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature')
      ? 'flex'
      : 'none';

    const pressureCheckbox = document.createElement('input');
    pressureCheckbox.type = 'checkbox';
    pressureCheckbox.classList.add('o2-pressure-checkbox');
    pressureCheckbox.checked = oxygenFactorySettings.autoDisableAbovePressure;
    pressureCheckbox.addEventListener('change', () => {
      oxygenFactorySettings.autoDisableAbovePressure = pressureCheckbox.checked;
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
        pressureInput.value = oxygenFactorySettings.disablePressureThreshold;
      }
    };
    update();

    pressureInput.addEventListener('input', () => {
      const val = parseFloat(pressureInput.value);
      oxygenFactorySettings.disablePressureThreshold = val;
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
    if (o2Els.checkbox) {
      o2Els.checkbox.checked = oxygenFactorySettings.autoDisableAbovePressure;
    }
    if (o2Els.input && document.activeElement !== o2Els.input) {
      o2Els.input.value = oxygenFactorySettings.disablePressureThreshold;
    }
    if (o2Els.unitSpan) {
      o2Els.unitSpan.textContent = 'kPa';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OxygenFactory, oxygenFactorySettings };
} else {
  globalThis.OxygenFactory = OxygenFactory;
  globalThis.oxygenFactorySettings = oxygenFactorySettings;
}
