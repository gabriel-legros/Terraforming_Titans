var ghgFactorySettings = ghgFactorySettings || {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15, // Kelvin
  reverseTempThreshold: 283.15,
};

function enforceGhgFactoryTempGap(changed) {
  const minGap = 1;
  const A = ghgFactorySettings.disableTempThreshold;
  let B = ghgFactorySettings.reverseTempThreshold;
  if (B === undefined || isNaN(B)) {
    B = A + minGap;
  }
  if (B - A < minGap) {
    if (changed === 'B') {
      ghgFactorySettings.disableTempThreshold = B - minGap;
    } else {
      B = A + minGap;
    }
  }
  ghgFactorySettings.reverseTempThreshold = B;
}

class GhgFactory extends Building {
  updateProductivity(resources, deltaTime) {
    const {
      targetProductivity,
      hasAtmosphericOversight,
      computeMaxProduction,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0) {
      this.productivity = 0;
      return;
    }

    if (
      hasAtmosphericOversight &&
      ghgFactorySettings.autoDisableAboveTemp &&
      terraforming && terraforming.temperature
    ) {
      const A = ghgFactorySettings.disableTempThreshold;
      let B = ghgFactorySettings.reverseTempThreshold ?? A + 5;
      if (B - A < 1) {
        B = A + 1;
        ghgFactorySettings.reverseTempThreshold = B;
      }
      const currentTemp = terraforming.temperature.value;
      let recipeKey = this.currentRecipeKey || 'ghg';
      let resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';

      if (!this.reversalAvailable) {
        const targetTemp = A;
        if (currentTemp >= targetTemp) {
          this.productivity = 0;
          return;
        }
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;
            const required = solveRequired((added) => {
              res.value = originalAmount + added;
              terraforming.updateSurfaceTemperature();
              const diff = terraforming.temperature.value - targetTemp;
              res.value = originalAmount;
              terraforming.updateSurfaceTemperature();
              return diff;
            }, maxProduction);
            this.reverseEnabled = false;
            this.productivity = Math.min(targetProductivity, required / maxProduction);
            return;
          }
        }
      } else {
        if (currentTemp > A && currentTemp < B) {
          this.productivity = 0;
          return;
        }
        let reverse =
          (recipeKey === 'ghg' && currentTemp >= B) ||
          (recipeKey === 'calcite' && currentTemp <= A);

        if (reverse) {
          const resObj = resources?.atmospheric?.[resourceName];
          const available = resObj ? resObj.value || 0 : 0;
          if (available <= 0 && typeof this._toggleRecipe === 'function') {
            this._toggleRecipe();
            recipeKey = this.currentRecipeKey || 'ghg';
            resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';
            reverse =
              (recipeKey === 'ghg' && currentTemp >= B) ||
              (recipeKey === 'calcite' && currentTemp <= A);
          }
        }

        const targetTemp = reverse ? (recipeKey === 'ghg' ? B : A) : (recipeKey === 'ghg' ? A : B);
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;
            const required = solveRequired((amt) => {
              res.value = originalAmount + (reverse ? -amt : amt);
              terraforming.updateSurfaceTemperature();
              const diff = terraforming.temperature.value - targetTemp;
              res.value = originalAmount;
              terraforming.updateSurfaceTemperature();
              return diff;
            }, maxProduction);
            this.reverseEnabled = reverse;
            this.productivity = Math.min(targetProductivity, required / maxProduction);
            return;
          }
        }
      }
    }

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity += dampingFactor * (targetProductivity - this.productivity);
    }
  }

  initUI(autoBuildContainer, cache) {
    if (!autoBuildContainer || !cache) return;

    const tempControl = document.createElement('div');
    tempControl.id = `${this.name}-temp-control`;
    tempControl.classList.add('ghg-temp-control');
    tempControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature') ? 'flex' : 'none';

    const tempCheckbox = document.createElement('input');
    tempCheckbox.type = 'checkbox';
    tempCheckbox.classList.add('ghg-temp-checkbox');
    tempCheckbox.checked = ghgFactorySettings.autoDisableAboveTemp;
    tempCheckbox.addEventListener('change', () => {
      ghgFactorySettings.autoDisableAboveTemp = tempCheckbox.checked;
    });
    tempControl.appendChild(tempCheckbox);

    const tempLabel = document.createElement('span');
    tempControl.appendChild(tempLabel);

    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.step = 0.1;
    tempInput.classList.add('ghg-temp-input');
    tempControl.appendChild(tempInput);

    const betweenLabel = document.createElement('span');
    betweenLabel.textContent = ' and avg T < ';
    tempControl.appendChild(betweenLabel);

    const tempInputB = document.createElement('input');
    tempInputB.type = 'number';
    tempInputB.step = 0.1;
    tempInputB.classList.add('ghg-temp-input');
    tempControl.appendChild(tempInputB);

    const unitSpan = document.createElement('span');
    unitSpan.classList.add('ghg-temp-unit');
    tempControl.appendChild(unitSpan);

    if (ghgFactorySettings.reverseTempThreshold === undefined) {
      ghgFactorySettings.reverseTempThreshold = ghgFactorySettings.disableTempThreshold;
    }
    if (typeof enforceGhgFactoryTempGap === 'function') {
      enforceGhgFactoryTempGap();
    }

    const update = () => {
      tempLabel.textContent = 'Disable if avg T > ';
      if (typeof getTemperatureUnit === 'function') {
        unitSpan.textContent = getTemperatureUnit();
      }
      if (typeof toDisplayTemperature === 'function') {
        if (document.activeElement !== tempInput) {
          tempInput.value = toDisplayTemperature(ghgFactorySettings.disableTempThreshold);
        }
        if (document.activeElement !== tempInputB) {
          tempInputB.value = toDisplayTemperature(ghgFactorySettings.reverseTempThreshold);
        }
      }
      const showReverse = !!this.reversalAvailable;
      betweenLabel.style.display = showReverse ? 'inline' : 'none';
      tempInputB.style.display = showReverse ? 'inline' : 'none';
    };
    update();

    tempInput.addEventListener('input', () => {
      const val = parseFloat(tempInput.value);
      const useC = typeof gameSettings !== 'undefined' && gameSettings.useCelsius;
      ghgFactorySettings.disableTempThreshold = useC ? val + 273.15 : val;
      if (!this.reversalAvailable) {
        ghgFactorySettings.reverseTempThreshold = ghgFactorySettings.disableTempThreshold;
      } else if (typeof enforceGhgFactoryTempGap === 'function') {
        enforceGhgFactoryTempGap('A');
      }
      update();
    });

    tempInputB.addEventListener('input', () => {
      const val = parseFloat(tempInputB.value);
      const useC = typeof gameSettings !== 'undefined' && gameSettings.useCelsius;
      ghgFactorySettings.reverseTempThreshold = useC ? val + 273.15 : val;
      if (typeof enforceGhgFactoryTempGap === 'function') {
        enforceGhgFactoryTempGap('B');
      }
      update();
    });

    autoBuildContainer.appendChild(tempControl);

    cache.ghg = {
      container: tempControl,
      checkbox: tempCheckbox,
      inputA: tempInput,
      inputB: tempInputB,
      betweenLabel: betweenLabel,
      unitSpan: unitSpan
    };
  }

  updateUI(elements) {
    const ghgEls = elements?.ghg;
    if (!ghgEls || !ghgEls.container) return;

    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    ghgEls.container.style.display = enabled ? 'flex' : 'none';
    if (ghgEls.checkbox) {
      ghgEls.checkbox.checked = ghgFactorySettings.autoDisableAboveTemp;
    }
    if (ghgEls.inputA && typeof toDisplayTemperature === 'function' && document.activeElement !== ghgEls.inputA) {
      ghgEls.inputA.value = toDisplayTemperature(ghgFactorySettings.disableTempThreshold);
    }
    if (ghgEls.inputB && typeof toDisplayTemperature === 'function' && document.activeElement !== ghgEls.inputB) {
      ghgEls.inputB.value = toDisplayTemperature(ghgFactorySettings.reverseTempThreshold);
    }
    const showReverse = !!this.reversalAvailable;
    if (ghgEls.betweenLabel) {
      ghgEls.betweenLabel.style.display = showReverse ? 'inline' : 'none';
    }
    if (ghgEls.inputB) {
      ghgEls.inputB.style.display = showReverse ? 'inline' : 'none';
    }
    if (ghgEls.unitSpan && typeof getTemperatureUnit === 'function') {
      ghgEls.unitSpan.textContent = getTemperatureUnit();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GhgFactory, ghgFactorySettings, enforceGhgFactoryTempGap };
} else {
  globalThis.GhgFactory = GhgFactory;
  globalThis.ghgFactorySettings = ghgFactorySettings;
  globalThis.enforceGhgFactoryTempGap = enforceGhgFactoryTempGap;
}
