const DEFAULT_GHG_AUTOMATION_SETTINGS = {
  autoDisableAboveTemp: false,
  disableTempThreshold: 283.15, // Kelvin
  reverseTempThreshold: 283.15,
  targetMode: 'temperature'
};

const GHG_AUTOMATION_MODE_CONFIG = {
  temperature: {
    minGap: 1,
    inputStep: 0.1
  },
  opticalDepth: {
    minGap: 0.1,
    inputStep: 0.01
  },
  pressure: {
    minGap: 0.001,
    inputStep: 1
  }
};

function getGhgFactoryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getGhgAutomationModeConfig(targetMode) {
  return GHG_AUTOMATION_MODE_CONFIG[targetMode] || GHG_AUTOMATION_MODE_CONFIG.temperature;
}

function calculateGhgAutomationPressureKPa(resourceAmount, gravity, radius) {
  return calculateAtmosphericPressure(resourceAmount || 0, gravity, radius) / 1000;
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
    if (this.count === 0n) {
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
      const tempState = terraforming.temperature;
      return tempState.trendValue ?? tempState.value ?? 0;
    };
    const readOpticalDepth = () => {
      const tempState = terraforming.temperature;
      return tempState.opticalDepth ?? 0;
    };
    const readPartialPressure = (gasKey) => {
      const amount = resources?.atmospheric?.[gasKey]?.value || 0;
      return calculateGhgAutomationPressureKPa(
        amount,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
    };
    const getTargetConfig = (gasKey) => {
      const targetMode = settings.targetMode === 'opticalDepth'
        ? 'opticalDepth'
        : settings.targetMode === 'pressure'
          ? 'pressure'
          : 'temperature';
      const config = getGhgAutomationModeConfig(targetMode);
      return {
        targetMode,
        minGap: config.minGap,
        readValue: targetMode === 'opticalDepth'
          ? readOpticalDepth
          : targetMode === 'pressure'
            ? () => readPartialPressure(gasKey)
            : readTrendTemperature
      };
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

    if (this.active === 0n) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    if (
      hasAtmosphericOversight &&
      settings.autoDisableAboveTemp &&
      terraforming && terraforming.temperature
    ) {
      let recipeKey = this.currentRecipeKey || 'ghg';
      let resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';
      let targetConfig = getTargetConfig(resourceName);
      const isOpticalDepthTarget = targetConfig.targetMode === 'opticalDepth';
      const isPressureTarget = targetConfig.targetMode === 'pressure';
      const minGap = targetConfig.minGap;
      const A = settings.disableTempThreshold;
      let B = settings.reverseTempThreshold ?? (A + minGap);
      if (B - A < minGap) {
        B = A + minGap;
      }
      const M = (A + B) / 2; // Midpoint target when correcting
      let currentValue = targetConfig.readValue();

      if (isOpticalDepthTarget && recipeKey !== 'ghg') {
        this._toggleRecipe();
        recipeKey = this.currentRecipeKey || 'ghg';
        resourceName = 'greenhouseGas';
        targetConfig = getTargetConfig(resourceName);
        currentValue = targetConfig.readValue();
      }

      if (!this.reversalAvailable) {
        if (isOpticalDepthTarget) {
          if (currentValue >= A) {
            this.setAutomationActivityMultiplier(0);
            this.productivity = 0;
            return;
          }

          const maxProduction = computeMaxProduction('atmospheric', 'greenhouseGas');
          if (maxProduction > 0) {
            const res = resources.atmospheric.greenhouseGas;
            const originalAmount = res.value;
            const required = solveRequiredAmount((added) => (
              evaluateTemperature(
                () => { res.value = originalAmount + added; },
                () => readOpticalDepth() - A,
                () => { res.value = originalAmount; }
              )
            ), maxProduction, originalAmount);
            this.reverseEnabled = false;
            this.productivity = required > 0
              ? applySolverProductivity(required, maxProduction)
              : targetProductivity;
            return;
          }
        }
        // No reversal available: only push in the forward direction.
        // Early disable checks that do not require resource access.
        if (recipeKey === 'ghg' && currentValue >= A) {
          this.setAutomationActivityMultiplier(0);
          this.productivity = 0;
          return;
        }
        if (!isPressureTarget && recipeKey === 'calcite' && currentValue <= A) {
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
              if (currentValue >= B) {
                const required = solveRequiredAmount((added) => (
                  evaluateTemperature(
                    () => { res.value = originalAmount + added; },
                    () => targetConfig.readValue() - M,
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
              let bestDiff = Math.abs(currentValue - M);
              const evalCandidate = (mass) => {
                const origMass = res.value;
                return evaluateTemperature(
                  () => { res.value = Math.max(0, mass); },
                  () => Math.abs(targetConfig.readValue() - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => targetConfig.readValue() - M,
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
                  () => targetConfig.readValue() - M,
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
              // GHG recipe: target midpoint when correcting from below
              const required = solveRequiredAmount((added) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + added; },
                  () => targetConfig.readValue() - M,
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
        if (currentValue > A && currentValue < B) {
          // Inside the range: for calcite, maintain enough to offset decay at the midpoint mass; otherwise stop
          if (!isOpticalDepthTarget && recipeKey === 'calcite' && resources?.atmospheric?.calciteAerosol) {
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
              let bestDiff = Math.abs(currentValue - M);
              const evalCandidate = (mass) => {
                const origMass = res.value;
                return evaluateTemperature(
                  () => { res.value = Math.max(0, mass); },
                  () => Math.abs(targetConfig.readValue() - M),
                  () => { res.value = origMass; }
                );
              };
              // Try add direction
              const addReq = solveRequired((amt) => (
                evaluateTemperature(
                  () => { res.value = originalAmount + amt; },
                  () => targetConfig.readValue() - M,
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
                  () => targetConfig.readValue() - M,
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

        if (isOpticalDepthTarget && recipeKey !== 'ghg') {
          this._toggleRecipe();
          recipeKey = this.currentRecipeKey || 'ghg';
          resourceName = 'greenhouseGas';
          targetConfig = getTargetConfig(resourceName);
          currentValue = targetConfig.readValue();
        }

        let reverse = isPressureTarget
          ? currentValue >= B
          : (
            (recipeKey === 'ghg' && currentValue >= B) ||
            (recipeKey === 'calcite' && currentValue <= A)
          );

        if (reverse) {
          const resObj = resources?.atmospheric?.[resourceName];
          const available = resObj ? resObj.value || 0 : 0;
          if (available <= 0 && (isOpticalDepthTarget || isPressureTarget)) {
            this.reverseEnabled = false;
            this.setAutomationActivityMultiplier(0);
            this.productivity = 0;
            return;
          }
          if (available <= 0 && typeof this._toggleRecipe === 'function') {
            this._toggleRecipe();
            recipeKey = this.currentRecipeKey || 'ghg';
            resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';
            targetConfig = getTargetConfig(resourceName);
            currentValue = targetConfig.readValue();
            reverse = isPressureTarget
              ? currentValue >= B
              : (
                (recipeKey === 'ghg' && currentValue >= B) ||
                (recipeKey === 'calcite' && currentValue <= A)
              );
          }
        }

        // Aim toward the midpoint when correcting, maintain decay when inside range (handled above)
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
                () => targetConfig.readValue() - M,
                () => { res.value = originalAmount; }
              )
            ), maxProduction, originalAmount);
            this.reverseEnabled = reverse;
            // Fallback: if solver returns no step but still outside the band, push at max allowed in the correct direction
            if (required > 0) {
              this.productivity = applySolverProductivity(required, maxProduction);
            } else {
              const outside = (currentValue <= A) || (currentValue >= B);
              this.productivity = outside ? targetProductivity : 0;
            }
            return;
          }
        }
      }
    }

    this.productivity = this.applyProductivityDamping(
      this.productivity,
      targetProductivity,
      deltaTime
    );
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

    const tempLabelPrefix = document.createElement('span');
    tempLabel.appendChild(tempLabelPrefix);

    const tempModeSelect = document.createElement('select');
    tempModeSelect.classList.add('ghg-temp-mode');
    const modeOptionTemp = document.createElement('option');
    modeOptionTemp.value = 'temperature';
    modeOptionTemp.textContent = getGhgFactoryText(
      'ui.buildings.ghgFactory.mode.temperature',
      'avg T'
    );
    tempModeSelect.appendChild(modeOptionTemp);
    const modeOptionDepth = document.createElement('option');
    modeOptionDepth.value = 'opticalDepth';
    modeOptionDepth.textContent = getGhgFactoryText(
      'ui.buildings.ghgFactory.mode.opticalDepth',
      'optical depth'
    );
    tempModeSelect.appendChild(modeOptionDepth);
    const modeOptionPressure = document.createElement('option');
    modeOptionPressure.value = 'pressure';
    modeOptionPressure.textContent = getGhgFactoryText(
      'ui.buildings.ghgFactory.mode.pressure',
      'pressure'
    );
    tempModeSelect.appendChild(modeOptionPressure);
    tempControl.appendChild(tempModeSelect);

    const tempLabelSuffix = document.createElement('span');
    tempControl.appendChild(tempLabelSuffix);

    const lineBreak = document.createElement('span');
    lineBreak.classList.add('ghg-temp-line-break');
    tempControl.appendChild(lineBreak);

    const tempInput = document.createElement('input');
    tempInput.type = 'text';
    tempInput.inputMode = 'decimal';
    tempInput.classList.add('ghg-temp-input');
    tempControl.appendChild(tempInput);

    const betweenLabel = document.createElement('span');
    betweenLabel.textContent = getGhgFactoryText(
      'ui.buildings.ghgFactory.and',
      ' and '
    );
    tempControl.appendChild(betweenLabel);

    const tempInputB = document.createElement('input');
    tempInputB.type = 'text';
    tempInputB.inputMode = 'decimal';
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
      getGhgFactoryText(
        'ui.buildings.ghgFactory.tooltip',
        'With reversal available, the terraforming bureau now allows you to automate this factory. You can set a range of average temperature, active gas partial pressure, or optical depth and a solver will attempt to set the trend inside this range. When the trend leaves the band, both greenhouse gas and calcite correction aim for the midpoint, then stop again once the trend returns inside the band. Optical depth automation is GHG-only and never runs calcite aerosol mode. It may take some time to converge as the factories may need to build up/remove gas to reach the desired trend. Pressing "reverse" will disable this automation. If used alongside space mirror advanced oversight, it is best for the ranges to be compatible.'
      )
    );
    tempControl.appendChild(tempTooltip);

    if (settings.reverseTempThreshold === undefined) {
      settings.reverseTempThreshold = settings.disableTempThreshold;
    }
    GhgFactory.enforceAutomationThresholdGap();

    const update = () => {
      const showReverse = !!this.reversalAvailable;
      const targetMode = settings.targetMode === 'opticalDepth'
        ? 'opticalDepth'
        : settings.targetMode === 'pressure'
          ? 'pressure'
          : 'temperature';
      const modeConfig = getGhgAutomationModeConfig(targetMode);
      tempLabelPrefix.textContent = showReverse
        ? getGhgFactoryText('ui.buildings.ghgFactory.labelPrefixAutomate', 'Automate ')
        : getGhgFactoryText('ui.buildings.ghgFactory.labelPrefixDisableIf', 'Disable if ');
      tempLabelSuffix.textContent = showReverse
        ? getGhgFactoryText('ui.buildings.ghgFactory.labelSuffixBetween', ' between ')
        : getGhgFactoryText('ui.buildings.ghgFactory.labelSuffixGreaterThan', ' > ');
      tempModeSelect.value = targetMode;
      unitSpan.textContent = targetMode === 'opticalDepth'
        ? getGhgFactoryText('ui.buildings.ghgFactory.opticalDepthUnit', 'tau')
        : targetMode === 'pressure'
          ? getGhgFactoryText('ui.buildings.ghgFactory.pressureUnit', 'Pa')
          : getTemperatureUnit();
      tempInput.step = modeConfig.inputStep;
      tempInputB.step = modeConfig.inputStep;
      if (document.activeElement !== tempInput) {
        tempInput.value = targetMode === 'opticalDepth'
          ? formatNumber(settings.disableTempThreshold, true, 2)
          : targetMode === 'pressure'
            ? formatNumber(settings.disableTempThreshold * 1000, true, 2)
            : formatNumber(toDisplayTemperature(settings.disableTempThreshold), true, 2);
      }
      if (document.activeElement !== tempInputB) {
        tempInputB.value = targetMode === 'opticalDepth'
          ? formatNumber(settings.reverseTempThreshold, true, 2)
          : targetMode === 'pressure'
            ? formatNumber(settings.reverseTempThreshold * 1000, true, 2)
            : formatNumber(toDisplayTemperature(settings.reverseTempThreshold), true, 2);
      }
      lineBreak.style.display = showReverse ? 'block' : 'none';
      betweenLabel.style.display = showReverse ? 'inline' : 'none';
      tempInputB.style.display = showReverse ? 'inline' : 'none';
      tempTooltip.style.display = showReverse ? 'inline' : 'none';
    };
    update();

    tempModeSelect.addEventListener('change', () => {
      settings.targetMode = tempModeSelect.value === 'opticalDepth'
        ? 'opticalDepth'
        : tempModeSelect.value === 'pressure'
          ? 'pressure'
          : 'temperature';
      const tempState = terraforming.temperature;
      if (settings.targetMode === 'opticalDepth') {
        const currentTau = tempState.opticalDepth ?? 0;
        settings.disableTempThreshold = currentTau;
        settings.reverseTempThreshold = currentTau + (this.reversalAvailable ? 0.5 : 0);
      } else if (settings.targetMode === 'pressure') {
        settings.disableTempThreshold = 0.01;
        settings.reverseTempThreshold = 0.02;
      } else {
        const currentTemp = tempState.trendValue ?? tempState.value ?? 0;
        settings.disableTempThreshold = currentTemp;
        settings.reverseTempThreshold = currentTemp + (this.reversalAvailable ? 5 : 0);
      }
      GhgFactory.enforceAutomationThresholdGap();
      update();
    });

    const commitThresholdGap = (changed) => {
      if (!this.reversalAvailable) {
        settings.reverseTempThreshold = settings.disableTempThreshold;
      } else {
        GhgFactory.enforceAutomationThresholdGap(changed);
      }
      update();
    };

    const parseAutomationInput = (value, targetMode) => {
      const parsed = parseFlexibleNumber(value);
      if (!Number.isFinite(parsed)) {
        return 0;
      }
      if (targetMode === 'opticalDepth') {
        return Math.max(0, parsed);
      }
      if (targetMode === 'pressure') {
        return Math.max(0, parsed) / 1000;
      }
      return gameSettings.useCelsius ? parsed + 273.15 : parsed;
    };
    const formatAutomationInput = (value, targetMode) => {
      if (targetMode === 'opticalDepth') {
        return formatNumber(Math.max(0, value), true, 2);
      }
      if (targetMode === 'pressure') {
        return formatNumber(Math.max(0, value) * 1000, true, 2);
      }
      return formatNumber(toDisplayTemperature(value), true, 2);
    };

    wireStringNumberInput(tempInput, {
      parseValue: (value) => parseAutomationInput(value, settings.targetMode),
      formatValue: (value) => formatAutomationInput(value, settings.targetMode),
      onValue: (value) => {
        settings.disableTempThreshold = value;
      },
      datasetKey: 'ghgThresholdA',
    });

    wireStringNumberInput(tempInputB, {
      parseValue: (value) => parseAutomationInput(value, settings.targetMode),
      formatValue: (value) => formatAutomationInput(value, settings.targetMode),
      onValue: (value) => {
        settings.reverseTempThreshold = value;
      },
      datasetKey: 'ghgThresholdB',
    });

    tempInput.addEventListener('blur', () => {
      commitThresholdGap('A');
    });

    tempInputB.addEventListener('blur', () => {
      commitThresholdGap('B');
    });

    autoBuildContainer.appendChild(tempControl);

    cache.ghg = {
      container: tempControl,
      checkbox: tempCheckbox,
      label: tempLabel,
      labelPrefix: tempLabelPrefix,
      labelSuffix: tempLabelSuffix,
      modeSelect: tempModeSelect,
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
    const targetMode = settings.targetMode === 'opticalDepth'
      ? 'opticalDepth'
      : settings.targetMode === 'pressure'
        ? 'pressure'
        : 'temperature';
    const modeConfig = getGhgAutomationModeConfig(targetMode);
    if (ghgEls.labelPrefix) {
      ghgEls.labelPrefix.textContent = showReverse
        ? getGhgFactoryText('ui.buildings.ghgFactory.labelPrefixAutomate', 'Automate ')
        : getGhgFactoryText('ui.buildings.ghgFactory.labelPrefixDisableIf', 'Disable if ');
    }
    if (ghgEls.labelSuffix) {
      ghgEls.labelSuffix.textContent = showReverse
        ? getGhgFactoryText('ui.buildings.ghgFactory.labelSuffixBetween', ' between ')
        : getGhgFactoryText('ui.buildings.ghgFactory.labelSuffixGreaterThan', ' > ');
    }
    if (ghgEls.modeSelect) {
      ghgEls.modeSelect.value = targetMode;
    }
    if (ghgEls.inputA && document.activeElement !== ghgEls.inputA) {
      ghgEls.inputA.value = targetMode === 'opticalDepth'
        ? formatNumber(settings.disableTempThreshold, true, 2)
        : targetMode === 'pressure'
          ? formatNumber(settings.disableTempThreshold * 1000, true, 2)
          : formatNumber(toDisplayTemperature(settings.disableTempThreshold), true, 2);
    }
    if (ghgEls.inputB && document.activeElement !== ghgEls.inputB) {
      ghgEls.inputB.value = targetMode === 'opticalDepth'
        ? formatNumber(settings.reverseTempThreshold, true, 2)
        : targetMode === 'pressure'
          ? formatNumber(settings.reverseTempThreshold * 1000, true, 2)
          : formatNumber(toDisplayTemperature(settings.reverseTempThreshold), true, 2);
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
    if (ghgEls.unitSpan) {
      ghgEls.unitSpan.textContent = targetMode === 'opticalDepth'
        ? getGhgFactoryText('ui.buildings.ghgFactory.opticalDepthUnit', 'tau')
        : targetMode === 'pressure'
          ? getGhgFactoryText('ui.buildings.ghgFactory.pressureUnit', 'Pa')
          : getTemperatureUnit();
    }
    if (ghgEls.inputA) {
      ghgEls.inputA.step = modeConfig.inputStep;
    }
    if (ghgEls.inputB) {
      ghgEls.inputB.step = modeConfig.inputStep;
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
        reverseTempThreshold: DEFAULT_GHG_AUTOMATION_SETTINGS.reverseTempThreshold,
        targetMode: DEFAULT_GHG_AUTOMATION_SETTINGS.targetMode
      };
    }
    return this.automationSettings;
  }

  static enforceAutomationThresholdGap(changed) {
    const settings = this.getAutomationSettings();
    const minGap = getGhgAutomationModeConfig(settings.targetMode).minGap;
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
      ),
      targetMode: settings.targetMode === 'opticalDepth' || settings.targetMode === 'pressure'
        ? settings.targetMode
        : DEFAULT_GHG_AUTOMATION_SETTINGS.targetMode
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
    settings.targetMode = hasData && (saved.targetMode === 'opticalDepth' || saved.targetMode === 'pressure')
      ? saved.targetMode
      : DEFAULT_GHG_AUTOMATION_SETTINGS.targetMode;
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
