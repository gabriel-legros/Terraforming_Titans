const DEFAULT_GHG_AUTOMATION_SETTINGS = {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15, // Kelvin
  reverseTempThreshold: 283.15,
};

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

class GhgFactory extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._solverCooldownMs = 0;
    this._solverCachedProductivity = 0;
  }

  getAutomationSettings() {
    return GhgFactory.getAutomationSettings();
  }

  setReverseEnabled(value) {
    if (this.count === 0) {
      this._toggleRecipe();
      return;
    }
    const enable = !!value;
    if (!this.reverseEnabled && enable) {
      const recipeKey = this.currentRecipeKey || 'ghg';
      const resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';
      const available = resources.atmospheric[resourceName].value || 0;
      if (available <= 0) {
        this._toggleRecipe();
        return;
      }
    }
    this.reverseEnabled = enable;
  }

  shouldDeactivateOnReverseEmpty() {
    const settings = getGhgAutomationSettings(this);
    return !settings.autoDisableAboveTemp;
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const {
      targetProductivity,
      hasAtmosphericOversight,
      computeMaxProduction,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    const settings = getGhgAutomationSettings(this);

    const saveTempState = terraforming?.saveTemperatureState?.bind(terraforming);
    const restoreTempState = terraforming?.restoreTemperatureState?.bind(terraforming);
    const applyTempUpdate = () => {
      if (terraforming?.updateSurfaceTemperature) {
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true, ignoreLowGravityAtmosphere: true });
      }
    };
    const readTrendTemperature = () => {
      const tempState = terraforming?.temperature;
      if (!tempState) {
        return NaN;
      }
      if (Number.isFinite(tempState.trendValue)) {
        return tempState.trendValue;
      }
      const actual = tempState.value;
      return Number.isFinite(actual) ? actual : NaN;
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
    const solveRequiredAmount = (evaluate, maxProduction, currentAmount) => {
      const stepSize = Math.max(maxProduction, 1);
      let cap = Math.max(currentAmount, 1);
      let required = solveRequired(evaluate, stepSize, cap);
      for (let i = 0; i < 10 && required >= cap; i++) {
        cap *= 10;
        required = solveRequired(evaluate, stepSize, cap);
      }
      return required;
    };
    const applySolverProductivity = (required, maxProduction) => {
      const elapsedMs = deltaTime || 0;
      this._solverCooldownMs = Math.max(0, this._solverCooldownMs - elapsedMs);
      if (this._solverCooldownMs > 0) {
        return Math.min(this._solverCachedProductivity, targetProductivity);
      }
      const seconds = Math.max(0.001, elapsedMs / 1000);
      const perSecond = maxProduction / seconds;
      const maxRate = perSecond * targetProductivity;
      const timeToTargetSeconds = maxRate > 0 ? (required / maxRate) : 0;
      let desired = maxProduction > 0 ? (required / maxProduction) : 0;
      let cooldownMs = 0;
      if (timeToTargetSeconds > 0 && timeToTargetSeconds < 1) {
        desired = perSecond > 0 ? (required / perSecond) : 0;
        cooldownMs = 1000;
      }
      const resolved = Math.min(targetProductivity, desired);
      this._solverCachedProductivity = resolved;
      this._solverCooldownMs = cooldownMs;
      return resolved;
    };

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    if (
      hasAtmosphericOversight &&
      settings.autoDisableAboveTemp &&
      terraforming && terraforming.temperature
    ) {
      const A = settings.disableTempThreshold;
      let B = settings.reverseTempThreshold ?? A + 5;
      if (B - A < 1) {
        B = A + 1;
        settings.reverseTempThreshold = B;
      }
      const M = (A + B) / 2; // Midpoint target when correcting
      const currentTemp = readTrendTemperature();
      let recipeKey = this.currentRecipeKey || 'ghg';
      let resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';

      if (!this.reversalAvailable) {
        // No reversal available: only push in the forward direction.
        // Early disable checks that do not require resource access.
        if (recipeKey === 'ghg' && currentTemp >= A) {
          this.setAutomationActivityMultiplier(0);
          this.productivity = 0;
          return;
        }
        if (recipeKey === 'calcite' && currentTemp <= A) {
          this.setAutomationActivityMultiplier(0);
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
                const required = solveRequiredAmount((added) => (
                  evaluateTemperature(
                    () => { res.value = originalAmount + added; },
                    () => readTrendTemperature() - M,
                    () => { res.value = originalAmount; }
                  )
                ), maxProduction, originalAmount);
                this.reverseEnabled = false;
                // Fallback: if solver cannot find a step but we are still above M, run at max allowed
                this.productivity = required > 0
                  ? applySolverProductivity(required, maxProduction)
                  : targetProductivity;
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
                  () => Math.abs(readTrendTemperature() - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => readTrendTemperature() - M,
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
                  () => readTrendTemperature() - M,
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
              const required = solveRequiredAmount((added) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + added; },
                  () => readTrendTemperature() - targetTemp,
                  () => { res.value = originalAmount; }
                )
              ), maxProduction, originalAmount);
              this.reverseEnabled = false;
              // Fallback: if solver cannot find a step but we are still below A, run at max allowed
              this.productivity = required > 0
                ? applySolverProductivity(required, maxProduction)
                : targetProductivity;
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
                () => Math.abs(readTrendTemperature() - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => readTrendTemperature() - M,
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
                  () => readTrendTemperature() - M,
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
          this.setAutomationActivityMultiplier(0);
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
            const required = solveRequiredAmount((amt) => (
              evaluateTemperature(
                () => { res.value = originalAmount + (reverse ? -amt : amt); },
                () => readTrendTemperature() - targetTemp,
                () => { res.value = originalAmount; }
              )
            ), maxProduction, originalAmount);
            this.reverseEnabled = reverse;
            // Fallback: if solver returns no step but still outside the band, push at max allowed in the correct direction
            if (required > 0) {
              this.productivity = applySolverProductivity(required, maxProduction);
            } else {
              const outside = (currentTemp <= A) || (currentTemp >= B);
              this.productivity = outside ? targetProductivity : 0;
            }
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

    const settings = getGhgAutomationSettings(this);

    const tempControl = document.createElement('div');
    tempControl.id = `${this.name}-temp-control`;
    tempControl.classList.add('ghg-temp-control');
    tempControl.style.display = this.isBooleanFlagSet('terraformingBureauFeature') ? 'flex' : 'none';

    const tempCheckbox = document.createElement('input');
    tempCheckbox.type = 'checkbox';
    tempCheckbox.id = `${this.name}-ghg-temp-checkbox`;
    tempCheckbox.classList.add('ghg-temp-checkbox');
    tempCheckbox.checked = settings.autoDisableAboveTemp;
    tempCheckbox.addEventListener('change', () => {
      settings.autoDisableAboveTemp = tempCheckbox.checked;
    });
    tempControl.appendChild(tempCheckbox);

    const tempLabel = document.createElement('label');
    tempLabel.htmlFor = tempCheckbox.id;
    tempControl.appendChild(tempLabel);

    const lineBreak = document.createElement('span');
    lineBreak.classList.add('ghg-temp-line-break');
    tempControl.appendChild(lineBreak);

    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.step = 0.1;
    tempInput.classList.add('ghg-temp-input');
    tempControl.appendChild(tempInput);

    const betweenLabel = document.createElement('span');
    betweenLabel.textContent = ' and ';
    tempControl.appendChild(betweenLabel);

    const tempInputB = document.createElement('input');
    tempInputB.type = 'number';
    tempInputB.step = 0.1;
    tempInputB.classList.add('ghg-temp-input');
    tempControl.appendChild(tempInputB);

    const unitSpan = document.createElement('span');
    unitSpan.classList.add('ghg-temp-unit');
    tempControl.appendChild(unitSpan);

    const tempTooltip = document.createElement('span');
    tempTooltip.classList.add('info-tooltip-icon');
    tempTooltip.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      tempTooltip,
      'With reversal available, the terraforming bureau now allows you to automate this factory. You can set a range of temperature and a solver will attempt to set the trend inside this range. It may take some time to converge as the factories may need to build up/remove gas to reach the desired trend. Pressing "reverse" will disable this automation. If used alongside space mirror advanced oversight, it is best for the ranges to be compatible.'
    );
    tempControl.appendChild(tempTooltip);

    if (settings.reverseTempThreshold === undefined) {
      settings.reverseTempThreshold = settings.disableTempThreshold;
    }
    GhgFactory.enforceAutomationThresholdGap();

    const update = () => {
      const showReverse = !!this.reversalAvailable;
      tempLabel.textContent = showReverse ? 'Automate avg T between ' : 'Disable if avg T > ';
      if (typeof getTemperatureUnit === 'function') {
        unitSpan.textContent = getTemperatureUnit();
      }
      if (typeof toDisplayTemperature === 'function') {
        if (document.activeElement !== tempInput) {
          tempInput.value = toDisplayTemperature(settings.disableTempThreshold);
        }
        if (document.activeElement !== tempInputB) {
          tempInputB.value = toDisplayTemperature(settings.reverseTempThreshold);
        }
      }
      lineBreak.style.display = showReverse ? 'block' : 'none';
      betweenLabel.style.display = showReverse ? 'inline' : 'none';
      tempInputB.style.display = showReverse ? 'inline' : 'none';
      tempTooltip.style.display = showReverse ? 'inline' : 'none';
    };
    update();

    tempInput.addEventListener('input', () => {
      const val = parseFloat(tempInput.value);
      const useC = typeof gameSettings !== 'undefined' && gameSettings.useCelsius;
      settings.disableTempThreshold = useC ? val + 273.15 : val;
      if (!this.reversalAvailable) {
        settings.reverseTempThreshold = settings.disableTempThreshold;
      } else {
        GhgFactory.enforceAutomationThresholdGap('A');
      }
      update();
    });

    tempInputB.addEventListener('input', () => {
      const val = parseFloat(tempInputB.value);
      const useC = typeof gameSettings !== 'undefined' && gameSettings.useCelsius;
      settings.reverseTempThreshold = useC ? val + 273.15 : val;
      GhgFactory.enforceAutomationThresholdGap('B');
      update();
    });

    autoBuildContainer.appendChild(tempControl);

    cache.ghg = {
      container: tempControl,
      checkbox: tempCheckbox,
      label: tempLabel,
      inputA: tempInput,
      inputB: tempInputB,
      lineBreak: lineBreak,
      betweenLabel: betweenLabel,
      unitSpan: unitSpan,
      tooltip: tempTooltip
    };
  }

  updateUI(elements) {
    const ghgEls = elements?.ghg;
    if (!ghgEls || !ghgEls.container) return;

    const enabled = this.isBooleanFlagSet('terraformingBureauFeature');
    ghgEls.container.style.display = enabled ? 'flex' : 'none';
    const settings = getGhgAutomationSettings(this);
    if (ghgEls.checkbox) {
      ghgEls.checkbox.checked = settings.autoDisableAboveTemp;
    }
    const showReverse = !!this.reversalAvailable;
    if (ghgEls.label) {
      ghgEls.label.textContent = showReverse ? 'Automate avg T between ' : 'Disable if avg T > ';
    }
    if (ghgEls.inputA && typeof toDisplayTemperature === 'function' && document.activeElement !== ghgEls.inputA) {
      ghgEls.inputA.value = toDisplayTemperature(settings.disableTempThreshold);
    }
    if (ghgEls.inputB && typeof toDisplayTemperature === 'function' && document.activeElement !== ghgEls.inputB) {
      ghgEls.inputB.value = toDisplayTemperature(settings.reverseTempThreshold);
    }
    ghgEls.lineBreak.style.display = showReverse ? 'block' : 'none';
    if (ghgEls.betweenLabel) {
      ghgEls.betweenLabel.style.display = showReverse ? 'inline' : 'none';
    }
    if (ghgEls.inputB) {
      ghgEls.inputB.style.display = showReverse ? 'inline' : 'none';
    }
    if (ghgEls.tooltip) {
      ghgEls.tooltip.style.display = showReverse ? 'inline' : 'none';
    }
    if (ghgEls.unitSpan && typeof getTemperatureUnit === 'function') {
      ghgEls.unitSpan.textContent = getTemperatureUnit();
    }
  }

  saveState() {
    const state = super.saveState();
    state.automationSettings = GhgFactory.saveAutomationSettings();
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    GhgFactory.loadAutomationSettings(state?.automationSettings);
  }

  static getAutomationSettings() {
    if (!this.automationSettings) {
      this.automationSettings = {
        autoDisableAboveTemp: DEFAULT_GHG_AUTOMATION_SETTINGS.autoDisableAboveTemp,
        disableTempThreshold: DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold,
        reverseTempThreshold: DEFAULT_GHG_AUTOMATION_SETTINGS.reverseTempThreshold
      };
    }
    return this.automationSettings;
  }

  static enforceAutomationThresholdGap(changed) {
    const settings = this.getAutomationSettings();
    const minGap = 1;
    let disable = settings.disableTempThreshold;
    if (!Number.isFinite(disable)) {
      disable = DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold;
      settings.disableTempThreshold = disable;
    }
    let reverse = settings.reverseTempThreshold;
    if (!Number.isFinite(reverse)) {
      reverse = disable + minGap;
    }
    if (reverse - disable < minGap) {
      if (changed === 'B') {
        settings.disableTempThreshold = reverse - minGap;
      } else {
        reverse = disable + minGap;
      }
    }
    settings.reverseTempThreshold = reverse;
    return settings;
  }

  static saveAutomationSettings() {
    const settings = this.getAutomationSettings();
    return {
      autoDisableAboveTemp: !!settings.autoDisableAboveTemp,
      disableTempThreshold: sanitizeNumber(
        settings.disableTempThreshold,
        DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold
      ),
      reverseTempThreshold: sanitizeNumber(
        settings.reverseTempThreshold,
        sanitizeNumber(settings.disableTempThreshold, DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold)
      )
    };
  }

  static loadAutomationSettings(saved) {
    const settings = this.getAutomationSettings();
    const hasData = saved && saved.constructor === Object;
    settings.autoDisableAboveTemp = hasData && 'autoDisableAboveTemp' in saved
      ? !!saved.autoDisableAboveTemp
      : DEFAULT_GHG_AUTOMATION_SETTINGS.autoDisableAboveTemp;
    const disableChanged = hasData && 'disableTempThreshold' in saved;
    settings.disableTempThreshold = disableChanged
      ? sanitizeNumber(saved.disableTempThreshold, DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold)
      : DEFAULT_GHG_AUTOMATION_SETTINGS.disableTempThreshold;
    const reverseChanged = hasData && 'reverseTempThreshold' in saved;
    settings.reverseTempThreshold = reverseChanged
      ? sanitizeNumber(saved.reverseTempThreshold, settings.disableTempThreshold)
      : DEFAULT_GHG_AUTOMATION_SETTINGS.reverseTempThreshold;
    const changeFlag = reverseChanged ? 'B' : 'A';
    this.enforceAutomationThresholdGap(changeFlag);
    return settings;
  }
}

function getGhgAutomationSettings(context) {
  if (context && typeof context.getAutomationSettings === 'function') {
    return context.getAutomationSettings();
  }
  return GhgFactory.getAutomationSettings();
}

function enforceGhgFactoryTempGap(changed) {
  return GhgFactory.enforceAutomationThresholdGap(changed);
}

const ghgFactorySettings = GhgFactory.getAutomationSettings();
GhgFactory.enforceAutomationThresholdGap();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GhgFactory, ghgFactorySettings, enforceGhgFactoryTempGap };
} else {
  globalThis.GhgFactory = GhgFactory;
  globalThis.ghgFactorySettings = ghgFactorySettings;
  globalThis.enforceGhgFactoryTempGap = enforceGhgFactoryTempGap;
}
