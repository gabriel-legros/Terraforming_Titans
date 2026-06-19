(function () {
  const MEGA_HEAT_SINK_POWER_W = 1_000_000_000_000_000;
  const WORKERS_PER_HEAT_SINK = 1_000_000_000;
  const SECONDS_PER_DAY = 86_400;
  const MEGA_HEAT_SINK_CONTINUOUS_THRESHOLD_MS = 1000;
  const getOrderedZones = () => getZones();

  let WorkerCapacityBatchProjectBase;

  if (typeof module !== 'undefined' && module.exports) {
    WorkerCapacityBatchProjectBase = require('./WorkerCapacityBatchProject.js');
  } else {
    WorkerCapacityBatchProjectBase = WorkerCapacityBatchProject;
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
      this.heatSinksActive = true;
      this.autoMax = false;
      this.buildCount = 1;
      this.activeBuildCount = 1;
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
      card.appendChild(body);
      container.appendChild(card);

      this.summaryElements = {
        card,
        countValue: countElements.value,
        coolingPerHeatSinkValue: coolingPerHeatSinkElements.value,
        fluxMitigationValue: fluxMitigationElements.value,
        coolingValue: coolingElements.value,
        coolingToggle
      };

      coolingToggle.addEventListener('click', () => {
        this.heatSinksActive = !this.heatSinksActive;
        setToggleButtonState(coolingToggle, this.heatSinksActive);
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
      return builtHeatSinks * this.getHeatSinkPowerMultiplier();
    }

    start(resources) {
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

      const progress = (deltaTime / duration) * productivity;
      const rate = 1000 / duration;
      const cost = Project.prototype.getScaledCost.call(this);
      const storageProj = this.createSpaceStorageAccess('consumption');
      for (const category in cost) {
        if (!totals.cost[category]) {
          totals.cost[category] = {};
        }
        for (const resource in cost[category]) {
          const amount = cost[category][resource] * progress;
          totals.cost[category][resource] = amount;
          if (applyRates && this.showsInResourcesRate() && amount > 0) {
            const key = resource === 'water' ? 'liquidWater' : resource;
            const colonyAvailable = Math.max(
              (resources[category]?.[resource]?.value || 0) + (accumulatedChanges?.[category]?.[resource] ?? 0),
              0
            );
            const allocation = getMegaProjectResourceAllocation(storageProj, key, amount, colonyAvailable);
            const colonyRate = cost[category][resource] * rate * productivity * (allocation.fromColony / amount);
            const storageRate = cost[category][resource] * rate * productivity * (allocation.fromStorage / amount);
            if (colonyRate > 0) {
              resources[category][resource].modifyRate(-colonyRate, this.displayName, 'project');
            }
            if (storageRate > 0) {
              resources?.spaceStorage?.[key]?.modifyRate?.(-storageRate, this.displayName, 'project');
            }
          }
        }
      }
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

      const cost = Project.prototype.getScaledCost.call(this);
      const storageProj = this.createSpaceStorageAccess('consumption', { accumulatedChanges });
      let paidProgress = requestedProgress;
      for (const category in cost) {
        for (const resource in cost[category]) {
          const perSinkCost = cost[category][resource];
          if (!(perSinkCost > 0)) {
            continue;
          }
          const key = resource === 'water' ? 'liquidWater' : resource;
          const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
          const available = Math.max(0, (resources[category][resource].value || 0) + pending);
          const requestedAmount = perSinkCost * requestedProgress;
          const allocation = getMegaProjectResourceAllocation(storageProj, key, requestedAmount, available);
          const affordableAmount = allocation.fromColony + allocation.fromStorage;
          paidProgress = Math.min(paidProgress, affordableAmount / perSinkCost);
        }
      }

      paidProgress = Math.max(0, Math.min(requestedProgress, paidProgress));
      if (!(paidProgress > 0)) {
        return;
      }

      for (const category in cost) {
        for (const resource in cost[category]) {
          const amount = cost[category][resource] * paidProgress;
          const key = resource === 'water' ? 'liquidWater' : resource;
          const colonyAvailable = Math.max(0, (resources[category][resource].value || 0) + (accumulatedChanges?.[category]?.[resource] ?? 0));
          const allocation = getMegaProjectResourceAllocation(storageProj, key, amount, colonyAvailable);
          if (!accumulatedChanges[category]) {
            accumulatedChanges[category] = {};
          }
          if (accumulatedChanges[category][resource] === undefined) {
            accumulatedChanges[category][resource] = 0;
          }
          if (allocation.fromColony > 0) {
            accumulatedChanges[category][resource] -= allocation.fromColony;
          }
          if (allocation.fromStorage > 0 && storageProj && typeof storageProj.spendStoredResource === 'function') {
            storageProj.spendStoredResource(key, allocation.fromStorage);
            storageProj.reconcileUsedStorage?.();
          }
        }
      }
      if (storageProj && typeof updateSpaceStorageUI === 'function') {
        updateSpaceStorageUI(storageProj.storageProject || storageProj);
      }

      this.repeatCount += paidProgress;
    }

    complete() {
      this.activeBuildCount = 1;
      Project.prototype.complete.call(this);
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        heatSinksActive: this.heatSinksActive === true
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'heatSinksActive')) {
        this.heatSinksActive = settings.heatSinksActive === true;
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        heatSinksActive: this.heatSinksActive
      };
    }

    loadState(state) {
      super.loadState(state);
      this.heatSinksActive = state.heatSinksActive ?? true;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MegaHeatSinkProject;
  } else {
    window.MegaHeatSinkProject = MegaHeatSinkProject;
  }
}());
