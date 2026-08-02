function renderNanotechLimit(limit, manager) {
  const percentLabel = limit.id === 'energy'
    ? t('ui.colony.nanotech.limitModes.percentPower')
    : t('ui.colony.nanotech.limitModes.percentProduction');
  const totalOption = limit.totalMode
    ? `<option value="percent_total">${t('ui.colony.nanotech.limitModes.percentTotalBiomass')}</option>`
    : '';
  return `
    <div class="nanotech-energy-limit">
      <input type="text" id="${limit.inputId}" value="${manager[limit.percentProperty]}">
      <select id="${limit.modeId}">
        <option value="percent" selected>${percentLabel}</option>
        ${totalOption}
        <option value="absolute">${t('ui.colony.nanotech.limitModes.absolute')}</option>
        <option value="uncapped">${t('ui.colony.nanotech.limitModes.uncapped')}</option>
      </select>
    </div>`;
}

function renderNanotechRecycling(input) {
  if (!input.recycling) return '';
  const recycling = input.recycling;
  const labelPath = `ui.colony.nanotech.recycling.${recycling.name}`;
  return `
    <div class="nanotech-recycling-toggles">
      <span class="nanotech-recycling-resource" id="nanotech-${recycling.name}-label">${t(labelPath)}</span>
      <label class="nanotech-recycling-toggle" id="nanotech-only-${recycling.name}-wrapper">
        <input type="checkbox" id="nanotech-only-${recycling.name}">
        <span>${t('ui.colony.nanotech.recycling.only')}</span>
      </label>
      <label class="nanotech-recycling-toggle" id="nanotech-uncapped-${recycling.name}-wrapper">
        <input type="checkbox" id="nanotech-uncapped-${recycling.name}">
        <span>${t('ui.colony.nanotech.recycling.uncapped')}</span>
      </label>
    </div>`;
}

function renderNanotechInputTitle(stage) {
  if (stage.id !== 'stage3') {
    return `${t(stage.ui.inputTitlePath)} <span class="info-tooltip-icon" id="${stage.ui.inputTooltipId}">&#9432;</span>`;
  }
  return `
    <span id="nanotech-stage3-resource-label">${t(stage.ui.inputTitlePath)}</span>
    <select id="nanotech-stage3-resource" style="display: none;">
      <option value="biomass">${t('ui.colony.nanotech.stage3.biomassAllocation')}</option>
      <option value="graphite">${t('ui.colony.nanotech.stage3.graphiteAllocation')}</option>
    </select>
    <span class="info-tooltip-icon" id="${stage.ui.inputTooltipId}">&#9432;</span>`;
}

function renderNanotechStats(impactId, rateId) {
  return `
    <div class="nanotech-energy-stats">
      <div class="energy-stat">
        <span class="energy-label">${t('ui.colony.nanotech.summary.growthBoost')}</span>
        <span class="energy-value" id="${impactId}">+0.00%</span>
      </div>
      <div class="energy-stat">
        <span class="energy-label">${t('ui.colony.nanotech.summary.draw')}</span>
        <span class="energy-value" id="${rateId}">0 ton/s</span>
      </div>
    </div>`;
}

function renderNanotechSlider(title, description, sliderId, impactId, rateId, ticksId) {
  const ticksAttribute = ticksId ? ` id="${ticksId}"` : '';
  return `
    <div class="nanotech-slider-card">
      <div class="slider-header">
        <span class="slider-title">${title}</span>
        <div class="slider-values">
          <span id="${impactId}">0.00%</span>
          <span id="${rateId}">0%</span>
        </div>
      </div>
      <div class="slider-control">
        <div class="slider-container">
          <input type="range" id="${sliderId}" class="pretty-slider" min="0" max="10" step="1">
          <div class="tick-marks"${ticksAttribute}>${Array(11).fill('<span></span>').join('')}</div>
        </div>
      </div>
      <p class="slider-description">${description}</p>
    </div>`;
}

function renderNanotechStage(stage, manager) {
  const ui = stage.ui;
  const limit = NANOTECH_LIMIT_PARAMETERS.find((entry) => entry.id === stage.input.limitId);
  const containerId = ui.containerId ? ` id="${ui.containerId}"` : '';
  const descriptionId = ui.inputDescriptionId ? ` id="${ui.inputDescriptionId}"` : '';
  return `
    <div class="nanotech-stage"${containerId}>
      <div class="nanotech-stage-header">
        <h4>${t(ui.titlePath)} <span id="${ui.warningId}" class="nanotech-stage-warning"></span></h4>
      </div>
      <div class="nanotech-slider-grid">
        <div class="nanotech-slider-card">
          <div class="nanotech-allocation-header">
            <span class="allocation-title">${renderNanotechInputTitle(stage)}</span>
            ${renderNanotechRecycling(stage.input)}
          </div>
          ${renderNanotechLimit(limit, manager)}
          ${renderNanotechStats(ui.inputImpactId, ui.inputRateId)}
          <p class="slider-description"${descriptionId}>${t(ui.inputDescriptionPath)}</p>
        </div>
        ${renderNanotechSlider(
          t(ui.maintenanceTitlePath),
          t(ui.maintenanceDescriptionPath),
          ui.maintenanceSliderId,
          ui.maintenanceImpactId,
          ui.maintenanceRateId
        )}
        ${renderNanotechSlider(
          t(ui.outputTitlePath),
          t(ui.outputDescriptionPath),
          ui.outputSliderId,
          ui.outputImpactId,
          ui.outputRateId,
          ui.outputTicksId
        )}
      </div>
    </div>`;
}

function renderNanotechSkullStage() {
  const stage = NANOTECH_SKULL_STAGE_PARAMETER;
  const ui = stage.ui;
  const sliders = ui.extraSliders.map((slider) => renderNanotechSlider(
    t('ui.colony.nanotech.stageSkull.consumeHazardousBiomass'),
    t('ui.colony.nanotech.stageSkull.consumeHazardousBiomassDescription'),
    slider.id,
    slider.impactId,
    slider.rateId
  )).join('');
  return `
    <div class="nanotech-stage" id="${ui.containerId}">
      <div class="nanotech-stage-header">
        <h4>${t(ui.titlePath)} <span id="${ui.warningId}" class="nanotech-stage-warning"></span></h4>
      </div>
      <div class="nanotech-slider-grid">
        <div class="nanotech-slider-card">
          <div class="nanotech-allocation-header">
            <span class="allocation-title">
              ${t(ui.inputTitlePath)} <span class="info-tooltip-icon" id="${ui.inputTooltipId}">&#9432;</span>
            </span>
          </div>
          ${renderNanotechStats(ui.inputImpactId, ui.inputRateId)}
          <p class="slider-description">${t(ui.inputDescriptionPath)}</p>
        </div>
        ${sliders}
      </div>
    </div>`;
}

function renderNanotechCard(manager) {
  const energyLimit = NANOTECH_LIMIT_PARAMETERS[0];
  return `
    <div class="card-header"><span class="card-title">${t('ui.colony.nanotech.title')}</span></div>
    <div class="card-body nanotech-card-body">
      <div id="nanotech-temperature-warning" class="nanotech-temperature-warning"></div>
      <div class="nanotech-summary-grid">
        <div class="nanotech-summary-card">
          <div class="nanotech-summary-label-row">
            <span class="summary-label">${t('ui.colony.nanotech.summary.nanobots')}</span>
            <span id="nanobot-sidebar-toggle-container"></span>
          </div>
          <div class="summary-value">
            <span id="nanobot-count">1</span>
            <span class="summary-divider">/</span>
            <span id="nanobot-cap">1</span>
          </div>
          <div class="nanotech-time-to-full">
            <span id="nanobot-time-to-full">${t('ui.colony.nanotech.summary.timeToFull', { value: '--' })}</span>
          </div>
        </div>
        <div class="nanotech-summary-card">
          <span class="summary-label">${t('ui.colony.nanotech.summary.growthRate')}</span>
          <span class="summary-value" id="nanobot-growth-rate">0%</span>
        </div>
        <div class="nanotech-summary-card nanotech-energy-card">
          <div class="summary-label">
            ${t('ui.colony.nanotech.summary.energyAllocation')} <span class="info-tooltip-icon" id="nanotech-energy-tooltip">&#9432;</span>
          </div>
          ${renderNanotechLimit(energyLimit, manager)}
          ${renderNanotechStats('nanotech-growth-impact', 'nanotech-growth-energy')}
        </div>
      </div>
      <p class="nanotech-hint">${t('ui.colony.nanotech.hint', { travelCap: `<span id="nanotech-travel-cap">${formatNumber(manager.getTravelPreserveCap())}</span>` })}<span class="info-tooltip-icon" id="nanotech-travel-tooltip">&#9432;</span>.</p>
      ${NANOTECH_STAGE_PARAMETERS.map((stage) => renderNanotechStage(stage, manager)).join('')}
      ${renderNanotechSkullStage()}
    </div>`;
}

function getNanotechOutputFraction(manager, stage) {
  const optimal = manager.isStageEnabled(stage)
    ? manager.getStageOutputRate(stage.number, manager[stage.output.sliderProperty])
    : 0;
  return optimal > 0
    ? Math.max(0, Math.min(1, manager[stage.output.currentProperty] / optimal))
    : 1;
}

function getNanotechStageWarning(manager, stage) {
  if (stage.id === 'stage1') {
    return manager.hasSandDeposits()
      ? ''
      : t('ui.colony.nanotech.warnings.noSand');
  }
  if (!manager.isStageEnabled(stage)) return '';
  if (stage.id === 'stage2') {
    return manager.hasOreDeposits()
      ? ''
      : t('ui.colony.nanotech.warnings.noOre');
  }
  if (stage.id === 'stage3') {
    const inaccessible = currentPlanetParameters?.classification?.archetype === 'artificial' || !manager.hasSandDeposits();
    if (!inaccessible) return '';
    const resourceName = manager.usesStage3Graphite()
      ? t('ui.colony.nanotech.stage3.resourceGraphite')
      : t('ui.colony.nanotech.stage3.resourceBiomass');
    return t('ui.colony.nanotech.warnings.noResources', {
      resource: resourceName.toLowerCase(),
    });
  }
  return manager.hasGraphiteDeposits()
    ? ''
    : t('ui.colony.nanotech.warnings.noDeposits');
}

NanotechManager.prototype.cacheUIRefs = function cacheUIRefs(container) {
  const previousCache = this.uiCache || {};
  const qs = (id) => container.querySelector(`#${id}`);
  const cache = {
    nanocolonyContentHost: previousCache.nanocolonyContentHost,
    controlsSection: previousCache.controlsSection,
    container,
    controls: Array.from(container.querySelectorAll('input, select')),
    temperatureWarningEl: qs('nanotech-temperature-warning'),
    sidebarToggleContainer: qs('nanobot-sidebar-toggle-container'),
    sidebarToggle: container.querySelector('.nanotech-sidebar-toggle'),
    countEl: qs('nanobot-count'),
    capEl: qs('nanobot-cap'),
    growthEl: qs('nanobot-growth-rate'),
    timeToFullEl: qs('nanobot-time-to-full'),
    travelCapEl: qs('nanotech-travel-cap'),
    growthImpactEl: qs('nanotech-growth-impact'),
    energyRateEl: qs('nanotech-growth-energy'),
    stages: {},
    limits: {},
    recycling: {},
    tooltips: {},
  };
  NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
    cache.limits[limit.id] = {
      input: qs(limit.inputId),
      mode: qs(limit.modeId),
      totalModeOption: limit.totalMode ? container.querySelector(`#${limit.modeId} option[value="percent_total"]`) : null,
    };
  });
  NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
    const ui = stage.ui;
    cache.stages[stage.id] = {
      container: ui.containerId ? qs(ui.containerId) : container.querySelector('.nanotech-stage'),
      warning: qs(ui.warningId),
      inputImpact: qs(ui.inputImpactId),
      inputRate: qs(ui.inputRateId),
      maintenanceSlider: qs(ui.maintenanceSliderId),
      maintenanceImpact: qs(ui.maintenanceImpactId),
      maintenanceRate: qs(ui.maintenanceRateId),
      outputSlider: qs(ui.outputSliderId),
      outputTicks: qs(ui.outputTicksId),
      outputImpact: qs(ui.outputImpactId),
      outputRate: qs(ui.outputRateId),
      inputDescription: ui.inputDescriptionId ? qs(ui.inputDescriptionId) : null,
    };
    if (stage.input.recycling) {
      const name = stage.input.recycling.name;
      cache.recycling[name] = {
        label: qs(`nanotech-${name}-label`),
        onlyWrapper: qs(`nanotech-only-${name}-wrapper`),
        onlyToggle: qs(`nanotech-only-${name}`),
        uncappedWrapper: qs(`nanotech-uncapped-${name}-wrapper`),
        uncappedToggle: qs(`nanotech-uncapped-${name}`),
      };
    }
  });
  cache.skull = {
    container: qs(NANOTECH_SKULL_STAGE_PARAMETER.ui.containerId),
    warning: qs(NANOTECH_SKULL_STAGE_PARAMETER.ui.warningId),
    inputImpact: qs(NANOTECH_SKULL_STAGE_PARAMETER.ui.inputImpactId),
    inputRate: qs(NANOTECH_SKULL_STAGE_PARAMETER.ui.inputRateId),
    sliders: NANOTECH_SKULL_STAGE_PARAMETER.ui.extraSliders.map((slider) => ({
      parameter: slider,
      input: qs(slider.id),
      impact: qs(slider.impactId),
      rate: qs(slider.rateId),
    })),
  };
  cache.stage3ResourceLabel = qs('nanotech-stage3-resource-label');
  cache.stage3ResourceSelect = qs('nanotech-stage3-resource');
  NANOTECH_TOOLTIP_PARAMETERS.forEach((tooltip) => {
    cache.tooltips[tooltip.id] = qs(tooltip.id);
  });
  this.uiCache = cache;
};

NanotechManager.prototype.ensureUICache = function ensureUICache(container) {
  if (!this.uiCache || this.uiCache.container !== container || !container.contains(this.uiCache.countEl)) {
    this.cacheUIRefs(container);
    return true;
  }
  return false;
};

NanotechManager.prototype.updateTickMarks = function updateTickMarks(ticksElement, max) {
  if (!ticksElement) return;
  const desiredCount = Math.max(0, Math.floor(max)) + 1;
  if (ticksElement.children.length !== desiredCount) {
    ticksElement.innerHTML = Array(desiredCount).fill('<span></span>').join('');
  }
};

NanotechManager.prototype.bindUIHandlers = function bindUIHandlers() {
  const C = this.uiCache;
  NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
    const stageCache = C.stages[stage.id];
    [
      { element: stageCache.maintenanceSlider, property: stage.maintenance.sliderProperty },
      { element: stageCache.outputSlider, property: stage.output.sliderProperty },
    ].forEach((binding) => {
      if (binding.element.dataset.nanotechBound) return;
      binding.element.addEventListener('input', (event) => {
        nanotechManager[binding.property] = parseInt(event.target.value);
        nanotechManager.updateUI();
      });
      binding.element.dataset.nanotechBound = binding.property;
    });
  });
  C.skull.sliders.forEach((binding) => {
    if (binding.input.dataset.nanotechBound) return;
    binding.input.addEventListener('input', (event) => {
      nanotechManager[binding.parameter.property] = parseInt(event.target.value);
      nanotechManager.updateUI();
    });
    binding.input.dataset.nanotechBound = binding.parameter.property;
  });
  NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
    const limitCache = C.limits[limit.id];
    if (!limitCache.input.dataset.nanotechBound) {
      wireStringNumberInput(limitCache.input, {
        datasetKey: `${limit.id}Limit`,
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          const numeric = Number.isFinite(parsed) ? parsed : 0;
          return nanotechManager[limit.modeProperty] === 'absolute'
            ? Math.max(0, numeric)
            : Math.max(0, Math.min(100, numeric));
        },
        formatValue: (value) => nanotechManager[limit.modeProperty] === 'absolute' && value >= 1e6
          ? formatNumber(value, true, 3)
          : String(value),
        onValue: (value) => {
          const property = nanotechManager[limit.modeProperty] === 'absolute'
            ? limit.absoluteProperty
            : limit.percentProperty;
          nanotechManager[property] = value;
          nanotechManager.updateUI();
        },
      });
      limitCache.input.dataset.nanotechBound = `${limit.id}Limit`;
    }
    if (!limitCache.mode.dataset.nanotechBound) {
      limitCache.mode.addEventListener('change', (event) => {
        nanotechManager[limit.modeProperty] = event.target.value;
        if (event.target.value === 'absolute' && !(nanotechManager[limit.absoluteProperty] > 0)) {
          nanotechManager[limit.absoluteProperty] = limit.defaultAbsolute;
        }
        nanotechManager.updateUI();
      });
      limitCache.mode.dataset.nanotechBound = `${limit.id}Mode`;
    }
  });
  if (!C.stage3ResourceSelect.dataset.nanotechBound) {
    C.stage3ResourceSelect.addEventListener('change', (event) => {
      nanotechManager.stage3Resource = event.target.value === 'graphite' ? 'graphite' : 'biomass';
      if (nanotechManager.stage3Resource === 'graphite' && nanotechManager.biomassLimitMode === 'percent_total') {
        nanotechManager.biomassLimitMode = 'percent';
      }
      nanotechManager.updateUI();
    });
    C.stage3ResourceSelect.dataset.nanotechBound = 'stage3Resource';
  }
  NANOTECH_RECYCLING_PARAMETERS.forEach((recycling) => {
    const recyclingCache = C.recycling[recycling.name];
    [
      { element: recyclingCache.onlyToggle, property: recycling.onlyProperty },
      { element: recyclingCache.uncappedToggle, property: recycling.uncappedProperty },
    ].forEach((binding) => {
      if (binding.element.dataset.nanotechBound) return;
      binding.element.addEventListener('change', (event) => {
        nanotechManager[binding.property] = event.target.checked;
        nanotechManager.updateUI();
      });
      binding.element.dataset.nanotechBound = binding.property;
    });
  });
  NANOTECH_TOOLTIP_PARAMETERS.forEach((tooltip) => {
    const icon = C.tooltips[tooltip.id];
    if (icon.dataset.nanotechBound) return;
    attachDynamicInfoTooltip(icon, t(tooltip.path));
    icon.dataset.nanotechBound = tooltip.id;
  });
};

NanotechManager.prototype.syncLimitUI = function syncLimitUI(limit, temperatureDisabled) {
  const cache = this.uiCache.limits[limit.id];
  const mode = this[limit.modeProperty];
  cache.mode.value = mode;
  if (document.activeElement !== cache.input) {
    if (mode === 'absolute') {
      const value = Math.max(0, this[limit.absoluteProperty]);
      cache.input.dataset[`${limit.id}Limit`] = String(value);
      cache.input.value = value >= 1e6 ? formatNumber(value, true, 3) : String(value);
      cache.input.removeAttribute('max');
      cache.input.placeholder = '';
    } else if (mode === 'uncapped') {
      cache.input.dataset[`${limit.id}Limit`] = '0';
      cache.input.value = '';
      cache.input.placeholder = t('ui.colony.nanotech.limitModes.uncapped');
      cache.input.removeAttribute('max');
    } else {
      const value = Math.max(0, Math.min(100, this[limit.percentProperty]));
      this[limit.percentProperty] = value;
      cache.input.dataset[`${limit.id}Limit`] = String(value);
      cache.input.value = String(value);
      cache.input.max = 100;
      cache.input.placeholder = '';
    }
  }
  cache.input.disabled = temperatureDisabled || mode === 'uncapped';
};

NanotechManager.prototype.updateUI = function updateUI() {
  this.uiDirty = false;
  if (nanotechManager !== this) return;
  const oldCache = this.uiCache || {};
  const host = oldCache.nanocolonyContentHost && oldCache.nanocolonyContentHost.isConnected
    ? oldCache.nanocolonyContentHost
    : document.getElementById('nanocolony-colonies-content');
  const controls = oldCache.controlsSection && oldCache.controlsSection.isConnected
    ? oldCache.controlsSection
    : document.getElementById('colony-controls-section') || document.getElementById('colony-controls-container') || document.getElementById('colony-buildings-buttons');
  const target = host || controls;
  let container = oldCache.container && oldCache.container.isConnected
    ? oldCache.container
    : document.getElementById('nanocolony-container');
  if (container && host && container.parentElement !== host) host.appendChild(container);
  if (!container && target) {
    container = document.createElement('div');
    container.id = 'nanocolony-container';
    container.classList.add('project-card');
    container.innerHTML = renderNanotechCard(this);
    target.appendChild(container);
    this.uiCache = { nanocolonyContentHost: host, controlsSection: controls };
    this.cacheUIRefs(container);
    this.bindUIHandlers();
  }
  if (!container) return;
  if (this.ensureUICache(container)) this.bindUIHandlers();
  const C = this.uiCache;
  C.nanocolonyContentHost = host;
  C.controlsSection = controls;
  container.style.display = isManagerEffectivelyEnabled(this, 'nanotechManager') ? '' : 'none';

  if (C.sidebarToggleContainer && !C.sidebarToggle) {
    C.sidebarToggle = createToggleButton({
      onLabel: t('ui.colony.nanotech.summary.showNanobotsInSidebar'),
      offLabel: t('ui.colony.nanotech.summary.showNanobotsInSidebar'),
      isOn: this.showNanobotsInSidebar,
    });
    C.sidebarToggle.classList.add('nanotech-sidebar-toggle');
    C.sidebarToggle.addEventListener('click', () => {
      nanotechManager.setNanobotsSidebarVisibility(!nanotechManager.showNanobotsInSidebar);
      setToggleButtonState(C.sidebarToggle, nanotechManager.showNanobotsInSidebar);
      updateResourceDisplay(resources, 0);
    });
    C.sidebarToggleContainer.appendChild(C.sidebarToggle);
  }
  setToggleButtonState(C.sidebarToggle, this.showNanobotsInSidebar);

  const temperatureDisabled = this.isTemperatureDisabled();
  const alternateRecipeUnlocked = this.isAlternateElectronicsRecipeUnlocked();
  const stage3UsesGraphite = this.usesStage3Graphite();
  if (stage3UsesGraphite && this.biomassLimitMode === 'percent_total') this.biomassLimitMode = 'percent';
  const outputFractions = {};

  NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
    const stageCache = C.stages[stage.id];
    const active = this.isStageEnabled(stage);
    const outputFraction = getNanotechOutputFraction(this, stage);
    outputFractions[stage.output.key] = outputFraction;
    stageCache.container.style.display = active ? '' : 'none';
    stageCache.warning.textContent = getNanotechStageWarning(this, stage);
    if (document.activeElement !== stageCache.maintenanceSlider) stageCache.maintenanceSlider.value = this[stage.maintenance.sliderProperty];
    if (document.activeElement !== stageCache.outputSlider) stageCache.outputSlider.value = this[stage.output.sliderProperty];
    const depositAvailable = this.hasDepositType(stage.output.depositType);
    const outputMax = depositAvailable ? 10 : 10;
    if (this[stage.output.sliderProperty] > outputMax) this[stage.output.sliderProperty] = outputMax;
    if (Number(stageCache.outputSlider.max) !== outputMax) {
      stageCache.outputSlider.max = outputMax;
      this.updateTickMarks(stageCache.outputTicks, outputMax);
    }

    const inputContribution = this.getStageGrowthContribution(stage);
    stageCache.inputImpact.textContent = `+${(temperatureDisabled ? 0 : inputContribution * 100).toFixed(3)}%`;
    stageCache.inputImpact.style.color = temperatureDisabled ? '#c92a2a' : (!this[stage.input.enoughProperty] ? 'orange' : '');
    const currentInput = active ? this[stage.input.currentProperty] : 0;
    const optimalInput = active ? this[stage.input.optimalProperty] : 0;
    stageCache.inputRate.textContent = formatNanotechRate(currentInput, optimalInput, 'ton/s');
    stageCache.inputRate.style.color = temperatureDisabled ? '#c92a2a' : (!this[stage.input.enoughProperty] ? 'orange' : '');

    const maintenancePenalty = active ? -(this[stage.maintenance.sliderProperty] / 10) * 0.15 : 0;
    stageCache.maintenanceImpact.textContent = `${(temperatureDisabled ? 0 : maintenancePenalty).toFixed(3)}%`;
    stageCache.maintenanceImpact.style.color = temperatureDisabled ? '#c92a2a' : '';
    stageCache.maintenanceRate.textContent = temperatureDisabled
      ? '0.00%'
      : `-${(this[stage.maintenance.currentProperty] * 100).toFixed(2)}%`;

    const outputPenalty = active ? -(this[stage.output.sliderProperty] / 10) * 0.15 * outputFraction : 0;
    stageCache.outputImpact.textContent = `${(temperatureDisabled ? 0 : outputPenalty).toFixed(3)}%`;
    stageCache.outputImpact.style.color = temperatureDisabled ? '#c92a2a' : (active && outputFraction < 1 ? 'orange' : '');
    const outputRate = active ? this[stage.output.currentProperty] : 0;
    stageCache.outputRate.textContent = `${formatNumber(outputRate, false, 2, true)} ton/s`;
    stageCache.outputRate.style.color = temperatureDisabled ? '#c92a2a' : (active && outputFraction < 1 ? 'orange' : '');
  });

  const skullActive = this.isStageEnabled(NANOTECH_SKULL_STAGE_PARAMETER);
  C.skull.container.style.display = skullActive ? '' : 'none';
  C.skull.warning.textContent = skullActive && !(resources.surface.hazardousBiomass.value > 0)
    ? t('ui.colony.nanotech.warnings.noHazardousBiomass')
    : '';
  const skullInput = NANOTECH_SKULL_STAGE_PARAMETER.input;
  const skullContribution = this.getSkullGrowthContribution();
  C.skull.inputImpact.textContent = `+${(temperatureDisabled ? 0 : skullContribution * 100).toFixed(3)}%`;
  C.skull.inputImpact.style.color = temperatureDisabled ? '#c92a2a' : (!this[skullInput.enoughProperty] ? 'orange' : '');
  const baseSkullOptimal = skullActive ? this.nanobots * skullInput.coefficient * this.getNanotechEfficiencyMultiplier() : 0;
  C.skull.inputRate.textContent = formatNanotechRate(
    skullActive ? Math.min(this[skullInput.currentProperty], baseSkullOptimal) : 0,
    baseSkullOptimal,
    'ton/s'
  );
  C.skull.inputRate.style.color = temperatureDisabled ? '#c92a2a' : (!this[skullInput.enoughProperty] ? 'orange' : '');
  C.skull.sliders.forEach((binding) => {
    if (document.activeElement !== binding.input) binding.input.value = this[binding.parameter.property];
    const penalty = skullActive ? -(this[binding.parameter.property] / 10) * 0.15 : 0;
    binding.impact.textContent = `${(temperatureDisabled ? 0 : penalty).toFixed(3)}%`;
    binding.impact.style.color = temperatureDisabled ? '#c92a2a' : '';
    const optimal = skullActive
      ? this.nanobots * skullInput.coefficient * (this[binding.parameter.property] / 10) * this.getNanotechEfficiencyMultiplier()
      : 0;
    binding.rate.textContent = formatNanotechSingleRate(Math.min(skullActive ? this[skullInput.currentProperty] : 0, optimal), 'ton/s');
    binding.rate.style.color = temperatureDisabled ? '#c92a2a' : (!this[skullInput.enoughProperty] ? 'orange' : '');
  });

  NANOTECH_LIMIT_PARAMETERS.forEach((limit) => this.syncLimitUI(limit, temperatureDisabled));
  C.stage3ResourceLabel.style.display = alternateRecipeUnlocked ? 'none' : '';
  C.stage3ResourceSelect.style.display = alternateRecipeUnlocked ? '' : 'none';
  if (document.activeElement !== C.stage3ResourceSelect) C.stage3ResourceSelect.value = stage3UsesGraphite ? 'graphite' : 'biomass';
  C.stages.stage3.inputDescription.textContent = stage3UsesGraphite
    ? t('ui.colony.nanotech.stage3.graphiteDescription')
    : t('ui.colony.nanotech.stage3.biomassDescription');
  C.limits.biomass.totalModeOption.hidden = stage3UsesGraphite;
  C.limits.biomass.totalModeOption.disabled = stage3UsesGraphite;

  const recyclingEnabled = this.isBooleanFlagSet('nanotechRecycling');
  NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
    if (!stage.input.recycling) return;
    const recycling = stage.input.recycling;
    const cache = C.recycling[recycling.name];
    const visible = recyclingEnabled && !(stage.id === 'stage3' && stage3UsesGraphite);
    cache.label.style.display = visible ? '' : 'none';
    cache.onlyWrapper.style.display = visible ? '' : 'none';
    cache.uncappedWrapper.style.display = visible ? '' : 'none';
    cache.onlyToggle.checked = visible ? this[recycling.onlyProperty] : false;
    cache.uncappedToggle.checked = visible ? this[recycling.uncappedProperty] : false;
  });

  const max = this.getMaxNanobots();
  C.countEl.textContent = formatNumber(this.nanobots, false, 2);
  C.capEl.textContent = formatNumber(max, false, 2);
  C.countEl.style.color = this.nanobots >= max ? 'green' : '';
  C.capEl.style.color = this.nanobots >= max ? 'green' : '';
  C.travelCapEl.textContent = formatNumber(this.getTravelPreserveCap());
  C.temperatureWarningEl.textContent = this.getTemperatureDisableWarning();
  C.temperatureWarningEl.style.display = C.temperatureWarningEl.textContent ? '' : 'none';

  const breakdown = this.getGrowthRateBreakdown(outputFractions);
  if (temperatureDisabled) {
    C.growthEl.textContent = t('ui.colony.nanotech.status.disabled');
    C.growthEl.style.color = '#c92a2a';
    this.effectiveGrowthRate = 0;
  } else {
    const rawLabel = `${(breakdown.rawRate * 100).toFixed(3)}%`;
    const actualLabel = `${(breakdown.effectiveRate * 100).toFixed(3)}%`;
    C.growthEl.textContent = Math.abs(breakdown.growthMultiplier - 1) > 1e-6 ? `${rawLabel} -> ${actualLabel}` : actualLabel;
    C.growthEl.style.color = NANOTECH_ACTIVITY_PARAMETERS.some((activity) => !this[activity.enoughProperty]) ? 'orange' : '';
    this.effectiveGrowthRate = breakdown.effectiveRate;
  }
  const baseContribution = temperatureDisabled ? 0 : breakdown.contributions.base;
  C.growthImpactEl.textContent = `+${(baseContribution * 100).toFixed(3)}%`;
  C.growthImpactEl.style.color = temperatureDisabled ? '#c92a2a' : (!this.hasEnoughEnergy ? 'orange' : '');
  C.energyRateEl.textContent = formatNanotechRate(this.currentEnergyConsumption, this.optimalEnergyConsumption, 'W');
  C.energyRateEl.style.color = temperatureDisabled ? '#c92a2a' : (!this.hasEnoughEnergy ? 'orange' : '');

  let timeToFull = '--';
  if (temperatureDisabled) timeToFull = this.getTemperatureDisableLabel();
  else if (this.nanobots >= max) timeToFull = t('ui.colony.nanotech.status.full');
  else if (breakdown.effectiveRate > 0 && this.nanobots > 0 && max > this.nanobots) {
    const seconds = Math.log(max / this.nanobots) / breakdown.effectiveRate;
    timeToFull = Number.isFinite(seconds) && seconds >= 0 ? formatDuration(seconds) : '--';
  } else if (breakdown.effectiveRate <= 0) timeToFull = t('ui.colony.nanotech.status.never');
  C.timeToFullEl.textContent = t('ui.colony.nanotech.summary.timeToFull', { value: timeToFull });

  C.controls.forEach((control) => {
    control.disabled = temperatureDisabled;
  });
  C.stage3ResourceSelect.disabled = temperatureDisabled || !alternateRecipeUnlocked;
  NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
    C.limits[limit.id].input.disabled = temperatureDisabled || this[limit.modeProperty] === 'uncapped';
  });
};
