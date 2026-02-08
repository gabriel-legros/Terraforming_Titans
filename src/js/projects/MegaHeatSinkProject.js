(function () {
  const MEGA_HEAT_SINK_POWER_W = 1_000_000_000_000_000;
  const WORKERS_PER_HEAT_SINK = 1_000_000_000;
  const SECONDS_PER_DAY = 86_400;
  const getOrderedZones = () => getZones();

  let WorkerCapacityBatchProjectBase;

  if (typeof module !== 'undefined' && module.exports) {
    WorkerCapacityBatchProjectBase = require('./WorkerCapacityBatchProject.js');
  } else {
    WorkerCapacityBatchProjectBase = WorkerCapacityBatchProject;
  }

  class MegaHeatSinkProject extends WorkerCapacityBatchProjectBase {
    constructor(config, name) {
      super(config, name);
      this.summaryElements = null;
      this.workersPerCompletion = WORKERS_PER_HEAT_SINK;
      this.heatSinksActive = true;
    }

    renderUI(container) {
      this.renderWorkerCapacityControls(container, {
        amountTitle: localizeProjectsText('projectsTab.projects.megaHeatSink.buildAmount', null, 'Build Amount'),
        tooltip: localizeProjectsText(
          'projectsTab.projects.megaHeatSink.buildTooltip',
          null,
          'Worker capacity lets us build heat sinks in parallel. One heat sink can be produced per 1,000,000,000 worker cap.'
        ),
        layoutClass: 'scanner-layout worker-capacity-layout',
      });

      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = localizeProjectsText('projectsTab.projects.megaHeatSink.summaryTitle', null, 'Heat Sink Summary');
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

      const countElements = createSummaryBox(localizeProjectsText('projectsTab.projects.megaHeatSink.heatSinksBuilt', null, 'Heat Sinks Built'));
      const coolingElements = createSummaryBox(localizeProjectsText('projectsTab.projects.megaHeatSink.coolingPerSecond', null, 'Cooling per Second'));
      const controlElements = createSummaryBox(localizeProjectsText('projectsTab.labels.control', null, 'Control'));
      const coolingToggle = createToggleButton({
        onLabel: localizeProjectsText('projectsTab.labels.on', null, 'On'),
        offLabel: localizeProjectsText('projectsTab.labels.off', null, 'Off'),
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

      const coolingPerSecond = this.calculateCoolingPerSecond();
      const coolingActive = this.heatSinksActive;
      setToggleButtonState(elements.coolingToggle, coolingActive);
      if (!coolingActive) {
        elements.coolingValue.textContent = localizeProjectsText('projectsTab.labels.off', null, 'Off');
      } else if (Number.isFinite(coolingPerSecond) && coolingPerSecond > 0) {
        elements.coolingValue.textContent = `${formatValue(coolingPerSecond, false, 2)} K/s`;
      } else {
        elements.coolingValue.textContent = '—';
      }
    }

    calculateCoolingPerSecond() {
      const effectiveCount = Math.max(1, this.repeatCount || 0);
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

    complete() {
      super.complete();
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
