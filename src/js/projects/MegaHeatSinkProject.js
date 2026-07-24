(function () {
  const MEGA_HEAT_SINK_POWER_W = 1_000_000_000_000_000;
  const WORKERS_PER_HEAT_SINK = 1_000_000_000;
  const SECONDS_PER_DAY = 86_400;
  const MEGA_HEAT_SINK_CONTINUOUS_THRESHOLD_MS = 1000;
  const MEGA_HEAT_SINK_CAP_MODES = {
    FIXED: 'fixed',
    GEOMETRIC_LAND_PERCENT: 'geometricLandPercent'
  };
  const getOrderedZones = () => getZones();

  let WorkerCapacityBatchProjectBase;
  let ContinuousExpansionCapability;

  if (typeof module !== 'undefined' && module.exports) {
    WorkerCapacityBatchProjectBase = require('./WorkerCapacityBatchProject.js');
    ContinuousExpansionCapability = require('./ContinuousExpansionProject.js');
  } else {
    WorkerCapacityBatchProjectBase = WorkerCapacityBatchProject;
    ContinuousExpansionCapability = ContinuousExpansionProject;
  }

  function getMegaHeatSinkText(path, fallback, vars) {
    try {
      return t(path, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  class MegaHeatSinkProject extends WorkerCapacityBatchProjectBase {
    constructor(config, name) {
      super(config, name);
      this.summaryElements = null;
      this.workersPerCompletion = WORKERS_PER_HEAT_SINK;
      this.continuousThreshold = MEGA_HEAT_SINK_CONTINUOUS_THRESHOLD_MS;
      this.heatSinksActive = true;
      this.autoMax = false;
      this.buildCount = 1;
      this.activeBuildCount = 1;
      this.capEnabled = false;
      this.activeCapEnabled = false;
      this.capValue = 100;
      this.capMode = MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
    }

    hasLiquidHydrogenBlocker() {
      const baseCoreHeatFlux = Math.max(0, terraforming?.celestialParameters?.coreHeatFlux || 0);
      return baseCoreHeatFlux > 0 && resources.surface.liquidHydrogen.value > 0;
    }

    getWarningState() {
      if (!this.hasLiquidHydrogenBlocker()) {
        return null;
      }
      return {
        blocksStart: false,
        blocksProgress: false,
        message: getMegaHeatSinkText(
          'ui.projects.megaHeatSink.liquidHydrogenWarning',
          'Liquid hydrogen insulates the world from Mega Heat Sink core-flux suppression. Heat sinks can still mitigate factory heat, but they provide no core-heat reduction while any liquid hydrogen remains.'
        ),
        statusText: getMegaHeatSinkText(
          'ui.projects.megaHeatSink.liquidHydrogenStatus',
          'Blocked: liquid hydrogen prevents core heat removal'
        )
      };
    }

    renderUI(container) {
      this.renderWorkerCapacityControls(container, {
        amountTitle: getMegaHeatSinkText('ui.projects.megaHeatSink.speedBoost', 'Speed Boost'),
        tooltip: getMegaHeatSinkText('ui.projects.megaHeatSink.speedBoostTooltip', 'Duration is divided by max(1, worker cap / 1,000,000,000). Below 1 second duration, Mega Heat Sink runs continuously with fractional progress.'),
        layoutClass: 'scanner-layout worker-capacity-layout',
        showControls: false,
        showAutoMax: false,
        showMaxValue: false,
      });
      if (this.workerCapacityUI?.container) {
        this.workerCapacityUI.container.classList.add('mega-heat-sink-top-section');
      }
      if (this.workerCapacityUI?.amountSection) {
        this.workerCapacityUI.amountSection.classList.add('mega-heat-sink-metric-section');
      }
      if (this.workerCapacityUI?.amountDisplay) {
        this.workerCapacityUI.amountDisplay.classList.remove('amount-display');
        this.workerCapacityUI.amountDisplay.classList.add('project-cost', 'mega-heat-sink-metric-value');
      }
      if (this.workerCapacityUI?.val) {
        this.workerCapacityUI.val.style.fontWeight = '400';
      }
      if (this.workerCapacityUI?.container) {
        const expansionSection = document.createElement('div');
        expansionSection.className = 'project-section-container worker-capacity-amount-section mega-heat-sink-metric-section';
        const expansionHeader = document.createElement('h4');
        expansionHeader.className = 'section-title';
        expansionHeader.textContent = getMegaHeatSinkText('ui.projects.megaHeatSink.expansion', 'Expansion');
        const expansionRow = document.createElement('div');
        expansionRow.className = 'worker-capacity-row';
        const expansionDisplay = document.createElement('div');
        expansionDisplay.className = 'project-cost mega-heat-sink-metric-value';
        const expansionValue = document.createElement('span');
        expansionValue.style.fontWeight = '400';
        expansionDisplay.appendChild(expansionValue);
        expansionRow.appendChild(expansionDisplay);
        expansionSection.append(expansionHeader, expansionRow);
        this.workerCapacityUI.container.appendChild(expansionSection);
        this.workerCapacityUI.expansionValue = expansionValue;
      }

      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = getMegaHeatSinkText('ui.projects.megaHeatSink.summaryTitle', 'Heat Sink Summary');
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'two-col', 'project-summary-grid');

      const createSummaryBox = (labelText) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const content = document.createElement('div');
        content.classList.add('project-summary-content');
        const value = document.createElement('span');
        value.classList.add('stat-value');
        content.appendChild(value);
        box.append(label, content);
        summaryGrid.appendChild(box);
        return { value, content };
      };

      const countElements = createSummaryBox(getMegaHeatSinkText('ui.projects.megaHeatSink.heatSinksBuilt', 'Heat Sinks Built'));
      const coolingPerHeatSinkElements = createSummaryBox(getMegaHeatSinkText('ui.projects.megaHeatSink.coolingPerHeatSink', 'Cooling per Heat Sink'));
      const fluxMitigationElements = createSummaryBox(getMegaHeatSinkText('ui.projects.megaHeatSink.fluxMitigation', 'Total Flux mitigation'));
      const coolingElements = createSummaryBox(getMegaHeatSinkText('ui.projects.megaHeatSink.coolingPerSecond', 'Cooling per Second'));
      const controlElements = createSummaryBox(getMegaHeatSinkText('ui.projects.megaHeatSink.control', 'Control'));
      const coolingToggle = createToggleButton({
        onLabel: getMegaHeatSinkText('ui.projects.common.on', 'On'),
        offLabel: getMegaHeatSinkText('ui.projects.common.off', 'Off'),
        isOn: this.heatSinksActive
      });
      coolingToggle.id = `${this.name}-cooling-toggle`;
      controlElements.content.appendChild(coolingToggle);

      body.appendChild(summaryGrid);

      const capRow = document.createElement('div');
      capRow.classList.add('mega-heat-sink-cap-row');
      const capCheckbox = document.createElement('input');
      capCheckbox.type = 'checkbox';
      capCheckbox.id = `${this.name}-cap-checkbox`;
      capCheckbox.checked = this.capEnabled;
      const capLabel = document.createElement('label');
      capLabel.htmlFor = capCheckbox.id;
      capLabel.textContent = getMegaHeatSinkText('ui.projects.megaHeatSink.capTo', 'Cap to');
      const capInput = document.createElement('input');
      capInput.type = 'text';
      capInput.inputMode = 'decimal';
      capInput.classList.add('automation-input', 'mega-heat-sink-cap-input');
      capInput.value = formatNumber(this.capValue, false, 2);
      const capModeSelect = document.createElement('select');
      capModeSelect.classList.add('automation-select');
      const fixedOption = document.createElement('option');
      fixedOption.value = MEGA_HEAT_SINK_CAP_MODES.FIXED;
      fixedOption.textContent = getMegaHeatSinkText('ui.projects.megaHeatSink.capModeFixed', 'fixed');
      const geometricLandOption = document.createElement('option');
      geometricLandOption.value = MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
      geometricLandOption.textContent = getMegaHeatSinkText('ui.projects.megaHeatSink.capModeGeometricLandPercent', '% of geometric land');
      capModeSelect.append(fixedOption, geometricLandOption);
      capModeSelect.value = this.capMode;
      const activeCapCheckbox = document.createElement('input');
      activeCapCheckbox.type = 'checkbox';
      activeCapCheckbox.id = `${this.name}-active-cap-checkbox`;
      activeCapCheckbox.checked = this.activeCapEnabled;
      const activeCapLabel = document.createElement('label');
      activeCapLabel.htmlFor = activeCapCheckbox.id;
      activeCapLabel.textContent = getMegaHeatSinkText(
        'ui.projects.megaHeatSink.alsoCapActiveToTarget',
        'Also cap active to target'
      );
      const capStatus = document.createElement('span');
      capStatus.classList.add('mega-heat-sink-cap-status');
      capRow.append(
        capCheckbox,
        capLabel,
        capInput,
        capModeSelect,
        activeCapCheckbox,
        activeCapLabel,
        capStatus
      );
      body.appendChild(capRow);

      card.appendChild(body);
      container.appendChild(card);

      this.summaryElements = {
        card,
        countValue: countElements.value,
        coolingPerHeatSinkValue: coolingPerHeatSinkElements.value,
        fluxMitigationValue: fluxMitigationElements.value,
        coolingValue: coolingElements.value,
        coolingToggle,
        capCheckbox,
        capInput,
        capModeSelect,
        activeCapCheckbox,
        capStatus
      };

      coolingToggle.addEventListener('click', () => {
        this.heatSinksActive = !this.heatSinksActive;
        setToggleButtonState(coolingToggle, this.heatSinksActive);
        updateProjectUI(this.name);
      });
      capCheckbox.addEventListener('change', () => {
        this.capEnabled = capCheckbox.checked;
        if (this.capEnabled && this.isCapReached()) {
          this.isActive = false;
          this.isPaused = false;
        }
        updateProjectUI(this.name);
      });
      wireStringNumberInput(capInput, {
        datasetKey: 'megaHeatSinkCap',
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        },
        formatValue: (value) => formatNumber(value, false, 2),
        onValue: (value) => {
          this.capValue = Math.max(0, value);
          if (this.capEnabled && this.isCapReached()) {
            this.isActive = false;
            this.isPaused = false;
          }
          updateProjectUI(this.name);
        }
      });
      capModeSelect.addEventListener('change', () => {
        this.capMode = capModeSelect.value === MEGA_HEAT_SINK_CAP_MODES.FIXED
          ? MEGA_HEAT_SINK_CAP_MODES.FIXED
          : MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
        if (this.capEnabled && this.isCapReached()) {
          this.isActive = false;
          this.isPaused = false;
        }
        updateProjectUI(this.name);
      });
      activeCapCheckbox.addEventListener('change', () => {
        this.activeCapEnabled = activeCapCheckbox.checked;
        updateProjectUI(this.name);
      });

      this.updateUI();
    }

    updateUI() {
      super.updateUI();
      if (this.workerCapacityUI?.val) {
        this.workerCapacityUI.val.textContent = `x${formatNumber(this.getSpeedBoost(), true, 2)}`;
      }
      if (this.workerCapacityUI?.expansionValue) {
        const expansionPerSecond = this.getExpansionPerSecond();
        this.workerCapacityUI.expansionValue.textContent = getMegaHeatSinkText(
          'ui.projects.megaHeatSink.expansionRate',
          '{value} heat sinks/s',
          { value: formatNumber(expansionPerSecond, false, 2) }
        );
      }

      const elements = this.summaryElements;
      if (!elements) {
        return;
      }

      const formatValue = (value, short = false, precision = 2) => {
        if (!Number.isFinite(value)) {
          return '—';
        }
        return formatNumber(value, short, precision);
      };

      const heatSinkCount = this.repeatCount || 0;
      elements.countValue.textContent = formatValue(heatSinkCount, true);

      const fluxMitigation = this.calculateFluxMitigation();
      const coolingPerHeatSink = this.calculateCoolingPerHeatSink();
      const coolingPerSecond = this.calculateCoolingPerSecond();
      const coolingActive = this.heatSinksActive;
      const hydrogenBlocked = this.hasLiquidHydrogenBlocker();
      setToggleButtonState(elements.coolingToggle, coolingActive);
      elements.capCheckbox.checked = this.capEnabled;
      elements.activeCapCheckbox.checked = this.activeCapEnabled;
      if (document.activeElement !== elements.capInput) {
        elements.capInput.value = formatValue(this.capValue, false, 2);
      }
      if (elements.capModeSelect.value !== this.capMode) {
        elements.capModeSelect.value = this.capMode;
      }
      const cap = this.getCapLimit();
      const capReached = this.capEnabled && this.isCapReached(cap);
      elements.capStatus.textContent = this.capEnabled
        ? getMegaHeatSinkText(
          capReached ? 'ui.projects.megaHeatSink.capReached' : 'ui.projects.megaHeatSink.capStatus',
          capReached ? 'Cap reached' : 'Cap: {value}',
          { value: formatValue(cap, true, 2) }
        )
        : '';
      if (!coolingActive) {
        elements.coolingPerHeatSinkValue.textContent = getMegaHeatSinkText('ui.projects.common.off', 'Off');
      } else if (Number.isFinite(coolingPerHeatSink) && coolingPerHeatSink > 0) {
        elements.coolingPerHeatSinkValue.textContent = `${formatValue(coolingPerHeatSink, false, 2)} W`;
      } else if (heatSinkCount > 0) {
        elements.coolingPerHeatSinkValue.textContent = '0 W';
      } else {
        elements.coolingPerHeatSinkValue.textContent = '—';
      }
      if (!coolingActive) {
        elements.fluxMitigationValue.textContent = getMegaHeatSinkText('ui.projects.common.off', 'Off');
      } else if (hydrogenBlocked) {
        elements.fluxMitigationValue.textContent = getMegaHeatSinkText(
          'ui.projects.megaHeatSink.liquidHydrogenStatusShort',
          'Blocked'
        );
      } else if (Number.isFinite(fluxMitigation) && fluxMitigation > 0) {
        elements.fluxMitigationValue.textContent = `${formatValue(fluxMitigation, false, fluxMitigation >= 100 ? 2 : 4)} W/m^2`;
      } else {
        elements.fluxMitigationValue.textContent = '0 W/m^2';
      }
      if (!coolingActive) {
        elements.coolingValue.textContent = getMegaHeatSinkText('ui.projects.common.off', 'Off');
      } else if (Number.isFinite(coolingPerSecond) && coolingPerSecond > 0) {
        elements.coolingValue.textContent = `${formatValue(coolingPerSecond, false, 2)} K/s`;
      } else {
        elements.coolingValue.textContent = '—';
      }
    }

    calculateFluxMitigation() {
      const terra = terraforming;
      if (!terra || this.heatSinksActive === false) {
        return 0;
      }

      return terra.getMegaHeatSinkFlux
        ? terra.getMegaHeatSinkFlux()
        : 0;
    }

    calculateCoolingPerSecond() {
      const effectiveCount = Math.max(1, this.getEffectiveHeatSinkCount());
      const terra = terraforming;
      const area = terra?.celestialParameters?.surfaceArea;
      if (!terra || !Number.isFinite(area) || area <= 0) {
        return 0;
      }

      const heatCapacityCache = terra.getHeatCapacity();
      const zonePercentage = getZonePercentage;
      const coolingFlux = (effectiveCount * MEGA_HEAT_SINK_POWER_W) / area;

      let weightedCooling = 0;
      let totalWeight = 0;

      const zones = getOrderedZones();
      for (const zone of zones) {
        const pct = zonePercentage(zone);
        if (!Number.isFinite(pct) || pct <= 0) {
          continue;
        }

        const zoneCapacity = heatCapacityCache.zones[zone];
        const capacityPerArea = zoneCapacity.capacityPerArea;
        const zoneCoolingPerSecond = (coolingFlux * SECONDS_PER_DAY) / capacityPerArea;
        weightedCooling += zoneCoolingPerSecond * pct;
        totalWeight += pct;
      }

      return totalWeight > 0 ? weightedCooling / totalWeight : 0;
    }

    calculateCoolingPerHeatSink() {
      return MEGA_HEAT_SINK_POWER_W * this.getHeatSinkPowerMultiplier();
    }

    getSpeedBoost() {
      const workerPotential = Math.max(
        0,
        resources?.colony?.workers?.potential || resources?.colony?.workers?.cap || 0
      );
      return Math.max(1, workerPotential / WORKERS_PER_HEAT_SINK);
    }

    applyDurationEffects(baseDuration, options) {
      const duration = Project.prototype.applyDurationEffects.call(this, baseDuration, options);
      return duration / this.getSpeedBoost();
    }

    updateDurationFromEffects() {
      const newDuration = this.applyDurationEffects(this.getBaseDuration());
      if (this.isActive && this.isContinuous()) {
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
        return;
      }
      if (this.isActive) {
        const canCarryProgress =
          Number.isFinite(this.startingDuration) &&
          Number.isFinite(this.remainingTime) &&
          this.startingDuration > 0;
        if (!canCarryProgress) {
          this.startingDuration = newDuration;
          this.remainingTime = newDuration;
          return;
        }
        const progressRatio =
          (this.startingDuration - this.remainingTime) / this.startingDuration;
        this.startingDuration = newDuration;
        this.remainingTime = newDuration * (1 - progressRatio);
      } else {
        this.startingDuration = newDuration;
      }
    }

    getExpansionPerSecond() {
      const duration = this.getEffectiveDuration();
      if (!(duration > 0) || duration === Infinity) {
        return 0;
      }
      const productivity = this.isContinuous()
        ? Math.max(0, this.continuousProductivity ?? 1)
        : 1;
      return (1000 / duration) * productivity;
    }

    isContinuous() {
      return this.getEffectiveDuration() < MEGA_HEAT_SINK_CONTINUOUS_THRESHOLD_MS;
    }

    getHeatSinkPowerMultiplier() {
      let multiplier = 1;
      this.activeEffects.forEach((effect) => {
        if (effect.type === 'heatSinkPowerMultiplier') {
          multiplier *= effect.value;
        }
      });
      return multiplier;
    }

    getEffectiveHeatSinkCount() {
      const builtHeatSinks = Math.max(0, Math.floor(this.repeatCount || 0));
      const activeHeatSinks = this.activeCapEnabled
        ? Math.min(builtHeatSinks, Math.max(0, Math.floor(this.getCapLimit())))
        : builtHeatSinks;
      return activeHeatSinks * this.getHeatSinkPowerMultiplier();
    }

    getCapLimit() {
      const value = Math.max(0, this.capValue || 0);
      if (this.capMode === MEGA_HEAT_SINK_CAP_MODES.FIXED) {
        return value;
      }
      const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources.surface.land));
      return geometricLand * value / 100;
    }

    getRemainingCap(cap = this.getCapLimit()) {
      if (!this.capEnabled) {
        return Infinity;
      }
      return Math.max(0, cap - Math.max(0, this.repeatCount || 0));
    }

    isCapReached(cap = this.getCapLimit()) {
      return this.capEnabled && this.getRemainingCap(cap) <= 0;
    }

    canStart() {
      return !this.isCapReached() && super.canStart();
    }

    start(resources) {
      if (this.isCapReached()) {
        return false;
      }
      this.activeBuildCount = 1;
      const started = Project.prototype.start.call(this, resources);
      if (!started) {
        return false;
      }

      if (this.isContinuous()) {
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
      }
      return true;
    }

    update(deltaTime) {
      if (!this.isActive || this.isCompleted || this.isPaused) {
        return;
      }
      if (this.isCapReached()) {
        this.isActive = false;
        return;
      }
      if (this.isContinuous()) {
        return;
      }
      Project.prototype.update.call(this, deltaTime);
    }

    estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
      if (!this.isContinuous() || !this.isActive) {
        return Project.prototype.estimateProjectCostAndGain.call(this, deltaTime, applyRates, productivity, accumulatedChanges);
      }

      const totals = { cost: {}, gain: {} };
      const duration = this.getEffectiveDuration();
      if (!(duration > 0) || duration === Infinity) {
        return totals;
      }

      const requestedProgress = (deltaTime / duration) * productivity;
      const cappedProgress = Math.min(requestedProgress, this.getRemainingCap());
      const cost = Project.prototype.getScaledCost.call(this);
      const storageState = this.createExpansionStorageState(accumulatedChanges);
      const progress = this.getAffordableExpansionProgress(
        cappedProgress,
        cost,
        storageState,
        accumulatedChanges
      );
      if (!(progress > 0)) {
        return totals;
      }
      totals.cost = this.estimateExpansionCostForProgress(
        cost,
        progress,
        deltaTime,
        accumulatedChanges,
        storageState,
        {
          applyRates: applyRates && this.showsInResourcesRate(),
          sourceLabel: this.displayName
        }
      );
      return totals;
    }

    applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
      if (!this.isContinuous() || !this.isActive) {
        return;
      }

      const duration = this.getEffectiveDuration();
      if (!(duration > 0) || duration === Infinity) {
        return;
      }

      const requestedProgress = (deltaTime / duration) * productivity;
      if (!(requestedProgress > 0)) {
        return;
      }
      const remainingCap = this.getRemainingCap();
      if (!(remainingCap > 0)) {
        this.isActive = false;
        return;
      }

      const cost = Project.prototype.getScaledCost.call(this);
      this.applyRequestedExpansionProgress(
        Math.min(requestedProgress, remainingCap),
        cost,
        accumulatedChanges,
        {
          applyRates: this.showsInResourcesRate(),
          seconds: deltaTime / 1000,
          rateSourceLabel: this.displayName,
          applyProgress(progress) {
            this.repeatCount += progress;
            if (this.isCapReached()) {
              this.isActive = false;
            }
          }
        }
      );
    }

    complete() {
      const completions = Math.min(1, this.getRemainingCap());
      if (!(completions > 0)) {
        this.activeBuildCount = 1;
        this.isActive = false;
        this.isCompleted = false;
        return;
      }
      this.activeBuildCount = 1;
      this.isCompleted = true;
      this.isActive = false;
      this.repeatCount += completions;
      this.resetProject();
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        heatSinksActive: this.heatSinksActive === true,
        capEnabled: this.capEnabled === true,
        activeCapEnabled: this.activeCapEnabled === true,
        capValue: this.capValue,
        capMode: this.capMode
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'heatSinksActive')) {
        this.heatSinksActive = settings.heatSinksActive === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capEnabled')) {
        this.capEnabled = settings.capEnabled === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'activeCapEnabled')) {
        this.activeCapEnabled = settings.activeCapEnabled === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capValue')) {
        const value = Number(settings.capValue);
        this.capValue = Number.isFinite(value) && value >= 0 ? value : 100;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capMode')) {
        this.capMode = settings.capMode === MEGA_HEAT_SINK_CAP_MODES.FIXED
          ? MEGA_HEAT_SINK_CAP_MODES.FIXED
          : MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
      }
    }

    saveTravelState() {
      if (!gameSettings.preserveProjectSettingsOnTravel) {
        return {};
      }
      return {
        capEnabled: this.capEnabled === true,
        activeCapEnabled: this.activeCapEnabled === true,
        capValue: this.capValue,
        capMode: this.capMode
      };
    }

    loadTravelState(state = {}) {
      if (!gameSettings.preserveProjectSettingsOnTravel) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(state, 'capEnabled')) {
        this.capEnabled = state.capEnabled === true;
      }
      if (Object.prototype.hasOwnProperty.call(state, 'activeCapEnabled')) {
        this.activeCapEnabled = state.activeCapEnabled === true;
      }
      if (Object.prototype.hasOwnProperty.call(state, 'capValue')) {
        const value = Number(state.capValue);
        this.capValue = Number.isFinite(value) && value >= 0 ? value : 100;
      }
      if (Object.prototype.hasOwnProperty.call(state, 'capMode')) {
        this.capMode = state.capMode === MEGA_HEAT_SINK_CAP_MODES.FIXED
          ? MEGA_HEAT_SINK_CAP_MODES.FIXED
          : MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        heatSinksActive: this.heatSinksActive,
        capEnabled: this.capEnabled,
        activeCapEnabled: this.activeCapEnabled,
        capValue: this.capValue,
        capMode: this.capMode
      };
    }

    loadState(state) {
      super.loadState(state);
      this.heatSinksActive = state.heatSinksActive ?? true;
      this.capEnabled = state.capEnabled === true;
      this.activeCapEnabled = state.activeCapEnabled === true;
      const value = Number(state.capValue);
      this.capValue = Number.isFinite(value) && value >= 0 ? value : 100;
      this.capMode = state.capMode === MEGA_HEAT_SINK_CAP_MODES.FIXED
        ? MEGA_HEAT_SINK_CAP_MODES.FIXED
        : MEGA_HEAT_SINK_CAP_MODES.GEOMETRIC_LAND_PERCENT;
    }
  }

  ContinuousExpansionCapability.applyCapabilityTo(MegaHeatSinkProject);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MegaHeatSinkProject;
  } else {
    window.MegaHeatSinkProject = MegaHeatSinkProject;
  }
}());
