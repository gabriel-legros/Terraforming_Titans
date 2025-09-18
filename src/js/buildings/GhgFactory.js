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

    const saveTempState = terraforming?.saveTemperatureState?.bind(terraforming);
    const restoreTempState = terraforming?.restoreTemperatureState?.bind(terraforming);
    const applyTempUpdate = () => {
      if (terraforming?.updateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature();
      }
    };
    const evaluateTemperature = (applyChange, evaluate, revertChange) => {
      const snapshot = saveTempState ? saveTempState() : null;
      applyChange();
      applyTempUpdate();
      let result;
      try {
        result = evaluate();
      } finally {
        revertChange();
        if (snapshot && restoreTempState) {
          restoreTempState(snapshot);
        } else {
          applyTempUpdate();
        }
      }
      return result;
    };

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
      const M = (A + B) / 2; // Midpoint target when correcting
      const currentTemp = terraforming.temperature.value;
      let recipeKey = this.currentRecipeKey || 'ghg';
      let resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';

      if (!this.reversalAvailable) {
        // No reversal available: only push in the forward direction.
        // Early disable checks that do not require resource access.
        if (recipeKey === 'ghg' && currentTemp >= A) {
          this.productivity = 0;
          return;
        }
        if (recipeKey === 'calcite' && currentTemp <= A) {
          this.productivity = 0;
          return;
        }

        // For calcite aim toward midpoint when outside the range,
        // otherwise just maintain against decay while inside the range.
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;

            if (recipeKey === 'calcite') {
              // Too hot: produce toward midpoint
              if (currentTemp >= B) {
                const required = solveRequired((added) => (
                  evaluateTemperature(
                    () => { res.value = originalAmount + added; },
                    () => terraforming.temperature.value - M,
                    () => { res.value = originalAmount; }
                  )
                ), maxProduction);
                this.reverseEnabled = false;
                // Fallback: if solver cannot find a step but we are still above M, run at max allowed
                const prod = (required > 0) ? (required / maxProduction) : (currentTemp > M ? 1 : 0);
                this.productivity = Math.min(targetProductivity, prod);
                return;
              }

              // Inside the range: maintain enough to offset decay at the midpoint mass
              const halfLife = (typeof CALCITE_HALF_LIFE_SECONDS !== 'undefined') ? CALCITE_HALF_LIFE_SECONDS : 240;
              const k = Math.log(2) / halfLife;
              const realSeconds = (deltaTime || 0) / 1000;
              // Estimate midpoint calcite mass by probing both add/remove directions with a larger search window
              const searchWindow = Math.max(maxProduction * 50, originalAmount * 0.5, 1);
              let midMass = originalAmount;
              let bestDiff = Math.abs(currentTemp - M);
              const evalCandidate = (mass) => {
                const origMass = res.value;
                return evaluateTemperature(
                  () => { res.value = Math.max(0, mass); },
                  () => Math.abs(terraforming.temperature.value - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => terraforming.temperature.value - M,
                  () => { res.value = originalAmount; }
                )
              ), searchWindow);
              if (addReq > 0) {
                const mass = originalAmount + addReq;
                const d = evalCandidate(mass);
                if (d <= bestDiff) { bestDiff = d; midMass = mass; }
              }
              // Try remove direction
              const remReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = Math.max(0, originalAmount - amt); },
                  () => terraforming.temperature.value - M,
                  () => { res.value = originalAmount; }
                )
              ), searchWindow);
              if (remReq > 0) {
                const mass = Math.max(0, originalAmount - remReq);
                const d = evalCandidate(mass);
                if (d <= bestDiff) { bestDiff = d; midMass = mass; }
              }

              const decayAtMid = (realSeconds > 0 && midMass > 0) ? midMass * (1 - Math.exp(-k * realSeconds)) : 0;
              const needed = Math.min(decayAtMid, maxProduction);
              this.reverseEnabled = false;
              this.productivity = Math.min(targetProductivity, needed / maxProduction);
              return;
            } else {
              // GHG recipe (warming): target lower boundary A when too cold
              const targetTemp = A;
              const required = solveRequired((added) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + added; },
                  () => terraforming.temperature.value - targetTemp,
                  () => { res.value = originalAmount; }
                )
              ), maxProduction);
              this.reverseEnabled = false;
              // Fallback: if solver cannot find a step but we are still below A, run at max allowed
              const prod = (required > 0) ? (required / maxProduction) : (currentTemp < targetTemp ? 1 : 0);
              this.productivity = Math.min(targetProductivity, prod);
              return;
            }
          }
        }
      } else {
        // Reversal available
        if (currentTemp > A && currentTemp < B) {
          // Inside the range: for calcite, maintain enough to offset decay at the midpoint mass; otherwise stop
          if (recipeKey === 'calcite' && resources?.atmospheric?.calciteAerosol) {
            const maxProduction = computeMaxProduction('atmospheric', 'calciteAerosol');
            if (maxProduction > 0) {
              const res = resources.atmospheric.calciteAerosol;
              const originalAmount = res.value || 0;
              const halfLife = (typeof CALCITE_HALF_LIFE_SECONDS !== 'undefined') ? CALCITE_HALF_LIFE_SECONDS : 240;
              const k = Math.log(2) / halfLife;
              const realSeconds = (deltaTime || 0) / 1000;
              // Estimate midpoint calcite mass by probing both add/remove directions with a larger search window
              const searchWindow = Math.max(maxProduction * 50, originalAmount * 0.5, 1);
              let midMass = originalAmount;
              let bestDiff = Math.abs(currentTemp - M);
              const evalCandidate = (mass) => {
                const origMass = res.value;
                return evaluateTemperature(
                  () => { res.value = Math.max(0, mass); },
                  () => Math.abs(terraforming.temperature.value - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => terraforming.temperature.value - M,
                  () => { res.value = originalAmount; }
                )
              ), searchWindow);
              if (addReq > 0) {
                const mass = originalAmount + addReq;
                const d = evalCandidate(mass);
                if (d <= bestDiff) { bestDiff = d; midMass = mass; }
              }
              // Try remove direction
              const remReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = Math.max(0, originalAmount - amt); },
                  () => terraforming.temperature.value - M,
                  () => { res.value = originalAmount; }
                )
              ), searchWindow);
              if (remReq > 0) {
                const mass = Math.max(0, originalAmount - remReq);
                const d = evalCandidate(mass);
                if (d <= bestDiff) { bestDiff = d; midMass = mass; }
              }

              const decayAtMid = (realSeconds > 0 && midMass > 0) ? midMass * (1 - Math.exp(-k * realSeconds)) : 0;
              const needed = Math.min(decayAtMid, maxProduction);
              this.reverseEnabled = false;
              this.productivity = Math.min(targetProductivity, needed / maxProduction);
              return;
            }
          }
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

        // Aim toward midpoint when correcting, maintain decay when inside range (handled above)
        const targetTemp = (recipeKey === 'calcite') ? M : (reverse ? (recipeKey === 'ghg' ? B : A) : (recipeKey === 'ghg' ? A : B));
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;
            const required = solveRequired((amt) => (
              evaluateTemperature(
                () => { res.value = originalAmount + (reverse ? -amt : amt); },
                () => terraforming.temperature.value - targetTemp,
                () => { res.value = originalAmount; }
              )
            ), maxProduction);
            this.reverseEnabled = reverse;
            // Fallback: if solver returns no step but still outside the band, push at max allowed in the correct direction
            let prod = 0;
            if (required > 0) {
              prod = required / maxProduction;
            } else {
              const outside = (currentTemp <= A) || (currentTemp >= B);
              if (outside) {
                prod = 1;
              }
            }
            this.productivity = Math.min(targetProductivity, prod);
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
