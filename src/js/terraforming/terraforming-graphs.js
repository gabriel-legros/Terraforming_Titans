// playTimeSeconds advances in in-game days for display, so 365 units = 1 year.
const TERRAFORMING_GRAPH_YEAR_UNITS = 365;
const TERRAFORMING_GRAPH_WINDOW_YEARS = 500;
const TERRAFORMING_GRAPH_MIN_LOG = 1e-6;

function getTerraformingGraphText(path, fallback, vars) {
  return t(`ui.terraforming.graphs.${path}`, vars, fallback);
}

function getTerraformingGraphZoneLabel(zone) {
  return t(`ui.terraforming.summaryUi.zones.${zone}`, null, zone);
}

const TERRAFORMING_GRAPH_ORDER = [
  'temperature',
  'atmosphere',
  'water',
  'albedo',
  'luminosity',
  'life',
  'phase'
];

const TERRAFORMING_GRAPH_ZONE_LABELS = {
  tropical: getTerraformingGraphZoneLabel('tropical'),
  temperate: getTerraformingGraphZoneLabel('temperate'),
  polar: getTerraformingGraphZoneLabel('polar')
};

const TERRAFORMING_GRAPH_ZONE_COLORS = {
  tropical: '#f39c12',
  temperate: '#27ae60',
  polar: '#3498db'
};

const TERRAFORMING_GRAPH_PALETTE = [
  '#e74c3c',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#95a5a6',
  '#34495e',
  '#16a085'
];

const TERRAFORMING_PHASE_DIAGRAM_ORDER = [
  'water',
  'carbonDioxide',
  'methane',
  'ammonia',
  'oxygen',
  'nitrogen'
];

const TERRAFORMING_PHASE_DIAGRAM_DEFINITIONS = {
  water: {
    id: 'water',
    label: getTerraformingGraphText('phaseLabels.water', 'Water'),
    cycle: waterCycle,
    atmosphereKey: 'atmosphericWater'
  },
  carbonDioxide: {
    id: 'carbonDioxide',
    label: getTerraformingGraphText('phaseLabels.carbonDioxide', 'CO2'),
    cycle: co2Cycle,
    atmosphereKey: 'carbonDioxide'
  },
  methane: {
    id: 'methane',
    label: getTerraformingGraphText('phaseLabels.methane', 'Methane'),
    cycle: methaneCycle,
    atmosphereKey: 'atmosphericMethane'
  },
  ammonia: {
    id: 'ammonia',
    label: getTerraformingGraphText('phaseLabels.ammonia', 'Ammonia'),
    cycle: ammoniaCycle,
    atmosphereKey: 'atmosphericAmmonia'
  },
  oxygen: {
    id: 'oxygen',
    label: getTerraformingGraphText('phaseLabels.oxygen', 'O2'),
    cycle: oxygenCycle,
    atmosphereKey: 'oxygen'
  },
  nitrogen: {
    id: 'nitrogen',
    label: getTerraformingGraphText('phaseLabels.nitrogen', 'N2'),
    cycle: nitrogenCycle,
    atmosphereKey: 'inertGas'
  }
};

function buildEmptyTerraformingGraphHistory() {
  return {
    years: [],
    temperature: {
      global: [],
      tropical: [],
      temperate: [],
      polar: []
    },
    atmosphere: {
      gases: {}
    },
    water: {
      liquid: [],
      ice: []
    },
    albedo: {
      ground: [],
      surface: [],
      actual: []
    },
    luminosity: {
      flux: []
    },
    life: {
      global: [],
      tropical: [],
      temperate: [],
      polar: []
    }
  };
}

function normalizeTerraformingGraphHistory(state) {
  const source = state || {};
  const history = buildEmptyTerraformingGraphHistory();
  const maxLength = TERRAFORMING_GRAPH_WINDOW_YEARS;
  const rawYears = Array.isArray(source.years) ? source.years : [];
  const startIndex = Math.max(0, rawYears.length - maxLength);
  const years = rawYears.slice(startIndex, startIndex + maxLength);
  history.years = years;
  const length = years.length;
  const normalizeArray = (arr, fallback) => {
    const raw = Array.isArray(arr) ? arr : [];
    const output = raw.slice(startIndex, startIndex + length);
    output.length = length;
    for (let i = 0; i < length; i += 1) {
      output[i] = output[i] || fallback;
    }
    return output;
  };
  const tempSource = source.temperature || {};
  history.temperature.global = normalizeArray(tempSource.global, 0);
  history.temperature.tropical = normalizeArray(tempSource.tropical, 0);
  history.temperature.temperate = normalizeArray(tempSource.temperate, 0);
  history.temperature.polar = normalizeArray(tempSource.polar, 0);
  const waterSource = source.water || {};
  history.water.liquid = normalizeArray(waterSource.liquid, 0);
  history.water.ice = normalizeArray(waterSource.ice, 0);
  const albedoSource = source.albedo || {};
  history.albedo.ground = normalizeArray(albedoSource.ground, 0);
  history.albedo.surface = normalizeArray(albedoSource.surface, 0);
  history.albedo.actual = normalizeArray(albedoSource.actual, 0);
  const luminositySource = source.luminosity || {};
  history.luminosity.flux = normalizeArray(luminositySource.flux, 0);
  const lifeSource = source.life || {};
  history.life.global = normalizeArray(lifeSource.global, 0);
  history.life.tropical = normalizeArray(lifeSource.tropical, 0);
  history.life.temperate = normalizeArray(lifeSource.temperate, 0);
  history.life.polar = normalizeArray(lifeSource.polar, 0);
  const atmosphereSource = source.atmosphere || {};
  const gasSource = atmosphereSource.gases || {};
  for (const key in gasSource) {
    history.atmosphere.gases[key] = normalizeArray(gasSource[key], 0);
  }
  return history;
}

function buildLinearTicks(min, max, count) {
  const span = max - min || 1;
  const step = span / count;
  const ticks = [];
  for (let i = 0; i <= count; i += 1) {
    ticks.push(min + step * i);
  }
  return ticks;
}

function buildLogTicks(min, max) {
  const minExp = Math.floor(min);
  const maxExp = Math.ceil(max);
  const span = maxExp - minExp || 1;
  const step = Math.max(1, Math.round(span / 5));
  const ticks = [];
  for (let exp = minExp; exp <= maxExp; exp += step) {
    ticks.push(exp);
  }
  return ticks;
}

const TERRAFORMING_GRAPH_DEFINITIONS = {
  temperature: {
    id: 'temperature',
    label: getTerraformingGraphText('labels.temperature', 'Temperature'),
    axisLabel: () => getTerraformingGraphText('axis.temperature', 'Temperature ({unit})', { unit: getTemperatureUnit() }),
    note: () => getTerraformingGraphText('notes.yearlyRolling', 'Yearly snapshots. Rolling 500 years.'),
    logScale: false,
    formatTick: (value) => formatNumber(value, false, 1),
    buildSeries: (manager, history) => {
      const series = [
        {
          label: getTerraformingGraphText('labels.global', 'Global'),
          values: history.temperature.global,
          color: '#e74c3c',
          transform: toDisplayTemperature
        }
      ];
      const zones = getZones();
      for (const zone of zones) {
        series.push({
          label: TERRAFORMING_GRAPH_ZONE_LABELS[zone] || zone,
          values: history.temperature[zone],
          color: TERRAFORMING_GRAPH_ZONE_COLORS[zone] || '#95a5a6',
          transform: toDisplayTemperature
        });
      }
      return series;
    }
  },
  atmosphere: {
    id: 'atmosphere',
    label: getTerraformingGraphText('labels.atmosphere', 'Atmosphere'),
    axisLabel: () => getTerraformingGraphText('axis.pressure', 'Pressure (Pa)'),
    note: () => getTerraformingGraphText('notes.logPressureRolling', 'Log scale pressure. Rolling 500 years.'),
    logScale: true,
    formatTick: (value) => formatNumber(value, false, 2, true),
    buildSeries: (manager, history) => manager.buildAtmosphereSeries(history)
  },
  water: {
    id: 'water',
    label: getTerraformingGraphText('labels.water', 'Water'),
    axisLabel: () => getTerraformingGraphText('axis.coverage', 'Coverage (%)'),
    note: () => getTerraformingGraphText('notes.yearlyRolling', 'Yearly snapshots. Rolling 500 years.'),
    logScale: false,
    formatTick: (value) => formatNumber(value, false, 1),
    buildSeries: (manager, history) => ([
      {
        label: getTerraformingGraphText('labels.waterCoverage', 'Water'),
        values: history.water.liquid,
        color: '#3498db',
        transform: (value) => value
      },
      {
        label: getTerraformingGraphText('labels.iceCoverage', 'Ice'),
        values: history.water.ice,
        color: '#95a5a6',
        transform: (value) => value
      }
    ])
  },
  albedo: {
    id: 'albedo',
    label: getTerraformingGraphText('labels.albedo', 'Albedo'),
    axisLabel: () => getTerraformingGraphText('axis.albedo', 'Albedo'),
    note: () => getTerraformingGraphText('notes.yearlyRolling', 'Yearly snapshots. Rolling 500 years.'),
    logScale: false,
    formatTick: (value) => formatNumber(value, false, 3),
    buildSeries: (manager, history) => ([
      {
        label: getTerraformingGraphText('labels.ground', 'Ground'),
        values: history.albedo.ground,
        color: '#7f8c8d',
        transform: (value) => value
      },
      {
        label: getTerraformingGraphText('labels.surface', 'Surface'),
        values: history.albedo.surface,
        color: '#f1c40f',
        transform: (value) => value
      },
      {
        label: getTerraformingGraphText('labels.actual', 'Actual'),
        values: history.albedo.actual,
        color: '#16a085',
        transform: (value) => value
      }
    ])
  },
  luminosity: {
    id: 'luminosity',
    label: getTerraformingGraphText('labels.luminosity', 'Luminosity'),
    axisLabel: () => getTerraformingGraphText('axis.surfaceFlux', 'Surface Flux (W/m^2)'),
    note: () => getTerraformingGraphText('notes.yearlyRolling', 'Yearly snapshots. Rolling 500 years.'),
    logScale: false,
    formatTick: (value) => formatNumber(value, false, 1),
    buildSeries: (manager, history) => ([
      {
        label: getTerraformingGraphText('labels.surfaceFlux', 'Surface Flux'),
        values: history.luminosity.flux,
        color: '#e67e22',
        transform: (value) => value
      }
    ])
  },
  life: {
    id: 'life',
    label: getTerraformingGraphText('labels.life', 'Life Coverage'),
    axisLabel: () => getTerraformingGraphText('axis.coverage', 'Coverage (%)'),
    note: () => getTerraformingGraphText('notes.yearlyRolling', 'Yearly snapshots. Rolling 500 years.'),
    logScale: false,
    formatTick: (value) => formatNumber(value, false, 1),
    buildSeries: (manager, history) => {
      const series = [
        {
          label: getTerraformingGraphText('labels.global', 'Global'),
          values: history.life.global,
          color: '#2ecc71',
          transform: (value) => value
        }
      ];
      const zones = getZones();
      for (const zone of zones) {
        series.push({
          label: TERRAFORMING_GRAPH_ZONE_LABELS[zone] || zone,
          values: history.life[zone],
          color: TERRAFORMING_GRAPH_ZONE_COLORS[zone] || '#16a085',
          transform: (value) => value
        });
      }
      return series;
    }
  },
  phase: {
    id: 'phase',
    label: getTerraformingGraphText('labels.phase', 'Phase Diagrams'),
    axisLabel: () => '',
    note: () => '',
    logScale: false,
    formatTick: () => '',
    buildSeries: () => []
  }
};

class TerraformingGraphsManager {
  constructor() {
    this.history = buildEmptyTerraformingGraphHistory();
    this.selectedGraph = 'temperature';
    this.selectedPhaseDiagram = 'water';
    this.atmosphereColors = {};
    this.legendSignature = '';
    this.phaseSignature = '';
    this.isOpen = false;
    this.needsRedraw = true;
    this.phaseNeedsRedraw = true;
    this.lastSnapshotYear = null;
    this.ui = {
      overlay: null,
      window: null,
      header: null,
      title: null,
      closeButton: null,
      body: null,
      menu: null,
      chart: null,
      canvas: null,
      legend: null,
      note: null,
      phaseSection: null,
      phaseTitle: null,
      phaseCanvas: null,
      phaseNote: null,
      phaseButtons: null,
      phaseButtonsMap: {},
      menuButtons: {},
      legendItems: [],
      button: null
    };
  }

  reset() {
    this.history = buildEmptyTerraformingGraphHistory();
    this.selectedGraph = 'temperature';
    this.selectedPhaseDiagram = 'water';
    this.atmosphereColors = {};
    this.legendSignature = '';
    this.phaseSignature = '';
    this.needsRedraw = true;
    this.phaseNeedsRedraw = true;
    this.lastSnapshotYear = null;
    this.hide();
  }

  saveState() {
    return structuredClone(this.history);
  }

  loadState(state) {
    this.history = normalizeTerraformingGraphHistory(state);
    this.legendSignature = '';
    this.phaseSignature = '';
    this.needsRedraw = true;
    this.phaseNeedsRedraw = true;
    this.lastSnapshotYear = this.history.years.length
      ? this.history.years[this.history.years.length - 1]
      : null;
  }

  attachSummaryButton(container) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'terraforming-graphs-button';
    button.title = getTerraformingGraphText('openHistory', 'Open terraforming history charts');
    button.setAttribute('aria-label', getTerraformingGraphText('openHistory', 'Open terraforming history charts'));
    const icon = document.createElement('span');
    icon.className = 'terraforming-graphs-icon';
    icon.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><polyline points="2,14 7,9 11,12 17,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline><line x1="2" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="1"></line></svg>';
    button.appendChild(icon);
    container.appendChild(button);
    this.ui.button = button;

    this.ui.overlay || this.buildOverlay();
    button.addEventListener('click', () => this.show());
  }

  buildOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'terraforming-graphs-overlay';
    const windowEl = document.createElement('div');
    windowEl.className = 'terraforming-graphs-window';
    overlay.appendChild(windowEl);

    const header = document.createElement('div');
    header.className = 'terraforming-graphs-header';
    const title = document.createElement('div');
    title.className = 'terraforming-graphs-title';
    title.textContent = getTerraformingGraphText('title', 'Terraforming History');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'terraforming-graphs-close';
    closeButton.textContent = getTerraformingGraphText('close', 'Close');
    header.appendChild(title);
    header.appendChild(closeButton);
    windowEl.appendChild(header);

    const body = document.createElement('div');
    body.className = 'terraforming-graphs-body';
    const menu = document.createElement('div');
    menu.className = 'terraforming-graphs-menu';
    const chart = document.createElement('div');
    chart.className = 'terraforming-graphs-chart';
    const canvas = document.createElement('canvas');
    canvas.className = 'terraforming-graphs-canvas';
    const legend = document.createElement('div');
    legend.className = 'terraforming-graphs-legend';
    const note = document.createElement('div');
    note.className = 'terraforming-graphs-note';
    const phaseSection = document.createElement('div');
    phaseSection.className = 'terraforming-graphs-phase';
    const phaseTitle = document.createElement('div');
    phaseTitle.className = 'terraforming-graphs-phase-title';
    const phaseDisclaimer = document.createElement('div');
    phaseDisclaimer.className = 'terraforming-graphs-phase-disclaimer';
    phaseDisclaimer.textContent = getTerraformingGraphText('phaseDisclaimer', 'Phase diagrams in Terraforming Titans are very simplified versions of the real ones. Pressure is typically used as saturation pressure, not total pressure.');
    const phaseCanvas = document.createElement('canvas');
    phaseCanvas.className = 'terraforming-graphs-phase-canvas';
    const phaseNote = document.createElement('div');
    phaseNote.className = 'terraforming-graphs-phase-note';
    const phaseButtons = document.createElement('div');
    phaseButtons.className = 'terraforming-graphs-phase-buttons';
    phaseSection.appendChild(phaseDisclaimer);
    phaseSection.appendChild(phaseTitle);
    phaseSection.appendChild(phaseCanvas);
    phaseSection.appendChild(phaseNote);
    phaseSection.appendChild(phaseButtons);
    chart.appendChild(canvas);
    chart.appendChild(legend);
    chart.appendChild(note);
    chart.appendChild(phaseSection);
    body.appendChild(menu);
    body.appendChild(chart);
    windowEl.appendChild(body);
    document.body.appendChild(overlay);

    const menuButtons = {};
    for (const graphId of TERRAFORMING_GRAPH_ORDER) {
      const definition = TERRAFORMING_GRAPH_DEFINITIONS[graphId];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'terraforming-graphs-menu-button';
      button.textContent = definition.label;
      button.addEventListener('click', () => this.selectGraph(graphId));
      menu.appendChild(button);
      menuButtons[graphId] = button;
    }

    const phaseButtonsMap = {};
    for (const diagramId of TERRAFORMING_PHASE_DIAGRAM_ORDER) {
      const definition = TERRAFORMING_PHASE_DIAGRAM_DEFINITIONS[diagramId];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'terraforming-graphs-phase-button';
      button.textContent = definition.label;
      button.addEventListener('click', () => this.selectPhaseDiagram(diagramId));
      phaseButtons.appendChild(button);
      phaseButtonsMap[diagramId] = button;
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.hide();
      }
    });
    closeButton.addEventListener('click', () => this.hide());
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.needsRedraw = true;
        this.phaseNeedsRedraw = true;
        this.draw();
      }
    });

    this.ui.overlay = overlay;
    this.ui.window = windowEl;
    this.ui.header = header;
    this.ui.title = title;
    this.ui.closeButton = closeButton;
    this.ui.body = body;
    this.ui.menu = menu;
    this.ui.chart = chart;
    this.ui.canvas = canvas;
    this.ui.legend = legend;
    this.ui.note = note;
    this.ui.phaseSection = phaseSection;
    this.ui.phaseTitle = phaseTitle;
    this.ui.phaseCanvas = phaseCanvas;
    this.ui.phaseNote = phaseNote;
    this.ui.phaseButtons = phaseButtons;
    this.ui.phaseButtonsMap = phaseButtonsMap;
    this.ui.menuButtons = menuButtons;
    this.updateMenuState();
    this.updatePhaseMenuState();
  }

  show() {
    this.ui.overlay.classList.add('is-visible');
    this.isOpen = true;
    this.needsRedraw = true;
    this.phaseNeedsRedraw = true;
    this.draw();
  }

  hide() {
    this.ui.overlay?.classList.remove('is-visible');
    this.isOpen = false;
  }

  selectGraph(graphId) {
    this.selectedGraph = graphId;
    this.updateMenuState();
    this.legendSignature = '';
    this.needsRedraw = true;
    this.draw();
  }

  selectPhaseDiagram(diagramId) {
    this.selectedPhaseDiagram = diagramId;
    this.phaseNeedsRedraw = true;
    this.updatePhaseMenuState();
    this.drawPhaseDiagram();
  }

  updateMenuState() {
    for (const graphId of TERRAFORMING_GRAPH_ORDER) {
      const button = this.ui.menuButtons[graphId];
      button.classList.toggle('active', graphId === this.selectedGraph);
    }
    const isPhaseMode = this.selectedGraph === 'phase';
    this.ui.canvas.style.display = isPhaseMode ? 'none' : '';
    this.ui.legend.style.display = isPhaseMode ? 'none' : '';
    this.ui.note.style.display = isPhaseMode ? 'none' : '';
    this.ui.phaseSection.style.display = isPhaseMode ? '' : 'none';
  }

  updatePhaseMenuState() {
    for (const diagramId of TERRAFORMING_PHASE_DIAGRAM_ORDER) {
      const button = this.ui.phaseButtonsMap[diagramId];
      button.classList.toggle('active', diagramId === this.selectedPhaseDiagram);
    }
  }

  update() {
    const currentYear = Math.floor(playTimeSeconds / TERRAFORMING_GRAPH_YEAR_UNITS);
    const startingLength = this.history.years.length;
    if (this.lastSnapshotYear === null) {
      this.lastSnapshotYear = -1;
    }
    if (currentYear > this.lastSnapshotYear) {
      for (let year = this.lastSnapshotYear + 1; year <= currentYear; year += 1) {
        this.appendYearSnapshot(year);
      }
      this.lastSnapshotYear = currentYear;
      this.needsRedraw = true;
    }
    if (this.history.years.length !== startingLength) {
      this.needsRedraw = true;
    }
    if (this.isOpen) {
      if (this.needsRedraw) {
        this.draw();
      } else if (this.selectedGraph === 'phase') {
        this.drawPhaseDiagram();
      }
    }
  }

  appendYearSnapshot(year) {
    const index = this.history.years.length;
    this.history.years.push(year);
    this.writeSnapshotAt(index);
    this.trimHistoryToWindow();
  }

  overwriteYearSnapshot(year) {
    const index = this.history.years.indexOf(year);
    if (index === -1) {
      this.appendYearSnapshot(year);
      return;
    }
    this.writeSnapshotAt(index);
  }

  writeSnapshotAt(index) {
    const history = this.history;
    history.temperature.global[index] = terraforming.temperature.value;
    history.temperature.tropical[index] = terraforming.temperature.zones.tropical.value;
    history.temperature.temperate[index] = terraforming.temperature.zones.temperate.value;
    history.temperature.polar[index] = terraforming.temperature.zones.polar.value;

    history.water.liquid[index] = (calculateAverageCoverage(terraforming, 'liquidWater') || 0) * 100;
    history.water.ice[index] = (calculateAverageCoverage(terraforming, 'ice') || 0) * 100;

    history.albedo.ground[index] = terraforming.luminosity.groundAlbedo || 0;
    history.albedo.surface[index] = terraforming.luminosity.surfaceAlbedo || 0;
    history.albedo.actual[index] = terraforming.luminosity.actualAlbedo || 0;

    history.luminosity.flux[index] = terraforming.luminosity.modifiedSolarFlux || 0;

    history.life.global[index] = (calculateAverageCoverage(terraforming, 'biomass') || 0) * 100;
    const zonalLifeCache = terraforming.zonalCoverageCache || {};
    history.life.tropical[index] = (zonalLifeCache.tropical?.biomass || 0) * 100;
    history.life.temperate[index] = (zonalLifeCache.temperate?.biomass || 0) * 100;
    history.life.polar[index] = (zonalLifeCache.polar?.biomass || 0) * 100;

    const gases = history.atmosphere.gases;
    for (const key in gases) {
      const series = gases[key];
      series[index] = series[index] || 0;
    }
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    for (const gasKey in resources.atmospheric) {
      const series = gases[gasKey] || new Array(index).fill(0);
      const amount = resources.atmospheric[gasKey].value || 0;
      series[index] = calculateAtmosphericPressure(amount, gravity, radius);
      gases[gasKey] = series;
    }
  }

  trimHistoryToWindow() {
    const history = this.history;
    while (history.years.length > TERRAFORMING_GRAPH_WINDOW_YEARS) {
      history.years.shift();
      history.temperature.global.shift();
      history.temperature.tropical.shift();
      history.temperature.temperate.shift();
      history.temperature.polar.shift();
      history.water.liquid.shift();
      history.water.ice.shift();
      history.albedo.ground.shift();
      history.albedo.surface.shift();
      history.albedo.actual.shift();
      history.luminosity.flux.shift();
      history.life.global.shift();
      history.life.tropical.shift();
      history.life.temperate.shift();
      history.life.polar.shift();
      const gases = history.atmosphere.gases;
      for (const key in gases) {
        gases[key].shift();
      }
    }
  }

  buildAtmosphereSeries(history) {
    const gases = history.atmosphere.gases;
    const gasKeys = Object.keys(gases).sort((a, b) => a.localeCompare(b));
    const series = [];
    for (let i = 0; i < gasKeys.length; i += 1) {
      const key = gasKeys[i];
      const resource = resources.atmospheric[key];
      const label = (resource && resource.displayName) || (resource && resource.name) || key;
      series.push({
        label,
        values: gases[key],
        color: this.getAtmosphereColor(key, i),
        transform: (value) => value
      });
    }
    return series;
  }

  getAtmosphereColor(key, index) {
    this.atmosphereColors[key] = this.atmosphereColors[key] || TERRAFORMING_GRAPH_PALETTE[index % TERRAFORMING_GRAPH_PALETTE.length];
    return this.atmosphereColors[key];
  }

  draw() {
    if (this.selectedGraph === 'phase') {
      this.drawPhaseDiagram();
      this.needsRedraw = false;
      return;
    }
    const definition = TERRAFORMING_GRAPH_DEFINITIONS[this.selectedGraph] || TERRAFORMING_GRAPH_DEFINITIONS.temperature;
    const series = definition.buildSeries(this, this.history);
    const signature = series.map(entry => entry.label).join('|');
    if (signature !== this.legendSignature) {
      this.updateLegend(series);
      this.legendSignature = signature;
    }
    this.ui.title.textContent = getTerraformingGraphText(
      'titleWithGraph',
      'Terraforming History - {label}',
      { label: definition.label }
    );
    this.ui.note.textContent = definition.note();

    const canvas = this.ui.canvas;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor(rect.height));
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const years = this.history.years;
    const maxIndex = Math.max(0, years.length - 1);
    const minYear = years.length ? years[0] : 0;
    const maxYear = years.length ? years[maxIndex] : 0;
    const xSpan = Math.max(1, maxYear - minYear);

    let minValue = Infinity;
    let maxValue = -Infinity;
    for (const entry of series) {
      const values = entry.values;
      const transform = entry.transform || ((value) => value);
      for (let i = 0; i <= maxIndex; i += 1) {
        const raw = values[i] || 0;
        const displayValue = transform(raw);
        const plotValue = definition.logScale
          ? Math.log10(Math.max(displayValue, TERRAFORMING_GRAPH_MIN_LOG))
          : displayValue;
        minValue = Math.min(minValue, plotValue);
        maxValue = Math.max(maxValue, plotValue);
      }
    }

    if (minValue === Infinity) {
      minValue = 0;
      maxValue = 1;
    }
    const range = maxValue - minValue || 1;

    const darkMode = document.body.classList.contains('dark-mode');
    ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.65)';
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    const yAxisLabel = definition.axisLabel();
    const yTicks = definition.logScale
      ? buildLogTicks(minValue, maxValue)
      : buildLinearTicks(minValue, maxValue, 4);
    const yTickLabels = yTicks.map((tickValue) => {
      const labelValue = definition.logScale ? Math.pow(10, tickValue) : tickValue;
      return definition.formatTick(labelValue);
    });
    const maxYTickLabelWidth = yTickLabels.reduce((maxWidth, label) => {
      return Math.max(maxWidth, ctx.measureText(label).width);
    }, 0);
    const yAxisLabelWidth = ctx.measureText(yAxisLabel).width;
    const padding = {
      left: Math.max(64, Math.ceil(Math.max(maxYTickLabelWidth + 16, yAxisLabelWidth + 16))),
      right: 20,
      top: 32,
      bottom: 40
    };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const chartBottom = padding.top + plotHeight;

    if (definition.logScale) {
      yTicks.forEach((exp, index) => {
        const y = padding.top + (1 - (exp - minValue) / range) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(yTickLabels[index], padding.left - 8, y);
      });
    } else {
      yTicks.forEach((tickValue, index) => {
        const y = padding.top + (1 - (tickValue - minValue) / range) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(yTickLabels[index], padding.left - 8, y);
      });
    }

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i += 1) {
      const yearValue = Math.round(minYear + (xSpan / xTicks) * i);
      const x = padding.left + ((yearValue - minYear) / xSpan) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x, chartBottom + 6);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(yearValue), x, chartBottom + 8);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yAxisLabel, 8, 16);
    ctx.textAlign = 'right';
    ctx.fillText(getTerraformingGraphText('years', 'Years'), width - padding.right, chartBottom + 26);

    for (const entry of series) {
      const values = entry.values;
      const transform = entry.transform || ((value) => value);
      ctx.beginPath();
      for (let i = 0; i <= maxIndex; i += 1) {
        const raw = values[i] || 0;
        const displayValue = transform(raw);
        const plotValue = definition.logScale
          ? Math.log10(Math.max(displayValue, TERRAFORMING_GRAPH_MIN_LOG))
          : displayValue;
        const yearValue = years[i] ?? minYear;
        const x = padding.left + ((yearValue - minYear) / xSpan) * plotWidth;
        const y = padding.top + (1 - (plotValue - minValue) / range) * plotHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = entry.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.needsRedraw = false;
  }

  drawPhaseDiagram() {
    const definition = TERRAFORMING_PHASE_DIAGRAM_DEFINITIONS[this.selectedPhaseDiagram]
      || TERRAFORMING_PHASE_DIAGRAM_DEFINITIONS.water;
    const cycle = definition.cycle;
    const tripleTemp = cycle.tripleTemperature;
    const criticalTemp = cycle.criticalTemperature;
    const minTemp = Math.max(5, tripleTemp * 0.4);
    const maxTemp = Math.max(tripleTemp * 1.2, Math.min(criticalTemp * 1.05, tripleTemp * 4));
    const maxTempForPressure = Math.min(criticalTemp, maxTemp);
    const triplePressure = cycle.triplePressure;
    const minPressure = Math.max(0.1, triplePressure * 0.02);
    const maxPressure = Math.max(triplePressure * 8, cycle.saturationVaporPressureFn(maxTempForPressure) * 1.2);
    const logMin = Math.log10(minPressure);
    const logMax = Math.log10(maxPressure);

    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const currentTemp = terraforming.temperature.value;
    const currentAmount = resources.atmospheric[definition.atmosphereKey].value;
    const currentPressure = calculateAtmosphericPressure(currentAmount, gravity, radius);
    const displayTempUnit = getTemperatureUnit();
    const signature = `${definition.id}:${displayTempUnit}:${Math.round(currentTemp * 10)}:${Math.round(currentPressure)}`;
    if (!this.phaseNeedsRedraw && signature === this.phaseSignature) {
      return;
    }
    this.phaseSignature = signature;
    this.phaseNeedsRedraw = false;

    this.ui.phaseTitle.textContent = getTerraformingGraphText(
      'phaseTitle',
      'Phase Diagram - {label}',
      { label: definition.label }
    );
    this.ui.phaseNote.textContent =
      getTerraformingGraphText(
        'currentGlobalMean',
        'Current global mean: {temperature} {unit} | Partial pressure: {pressure} Pa',
        {
          temperature: formatNumber(toDisplayTemperature(currentTemp), false, 1),
          unit: displayTempUnit,
          pressure: formatNumber(currentPressure, false, 2, true),
        }
      );

    const canvas = this.ui.phaseCanvas;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const colorMap = {
      gas: '#f4f4f4',
      liquid: '#3b82c4',
      solid: '#bcd9f3',
      supercritical: '#f5b041'
    };

    const cols = 120;
    const rows = 70;
    const tempSpan = maxTemp - minTemp;
    const logSpan = logMax - logMin;
    const darkMode = document.body.classList.contains('dark-mode');
    const axisTextColor = darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.92)';
    ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = axisTextColor;
    ctx.font = '12px "Segoe UI", Arial, sans-serif';

    const pressureTicks = buildLogTicks(logMin, logMax);
    const pressureTickLabels = pressureTicks.map((exp) => formatNumber(Math.pow(10, exp), false, 2, true));
    const maxPressureTickLabelWidth = pressureTickLabels.reduce((maxWidth, label) => {
      return Math.max(maxWidth, ctx.measureText(label).width);
    }, 0);
    const padding = {
      left: Math.max(64, Math.ceil(maxPressureTickLabelWidth) + 16),
      right: 20,
      top: 48,
      bottom: 40
    };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const chartBottom = padding.top + plotHeight;

    for (let row = 0; row < rows; row += 1) {
      const rowT = row / rows;
      const logP = logMax - rowT * logSpan;
      const pressure = Math.pow(10, logP);
      const y = padding.top + rowT * plotHeight;
      for (let col = 0; col < cols; col += 1) {
        const colT = col / cols;
        const temp = minTemp + colT * tempSpan;
        const psat = cycle.saturationVaporPressureFn(temp);
        let phase = 'gas';
        if (temp < tripleTemp) {
          phase = pressure >= psat ? 'solid' : 'gas';
        } else if (temp >= criticalTemp) {
          phase = pressure >= psat ? 'supercritical' : 'gas';
        } else {
          phase = pressure >= psat ? 'liquid' : 'gas';
        }
        ctx.fillStyle = colorMap[phase];
        const x = padding.left + colT * plotWidth;
        const cellWidth = plotWidth / cols + 0.5;
        const cellHeight = plotHeight / rows + 0.5;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }

    pressureTicks.forEach((exp) => {
      const y = padding.top + (1 - (exp - logMin) / logSpan) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    });

    const tempTicksKelvin = buildLinearTicks(minTemp, maxTemp, 5);
    tempTicksKelvin.forEach((tickValue) => {
      const x = padding.left + ((tickValue - minTemp) / tempSpan) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x, chartBottom + 6);
      ctx.stroke();
    });

    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= cols; i += 1) {
      const temp = minTemp + (tempSpan * i) / cols;
      const psat = cycle.saturationVaporPressureFn(temp);
      const clampedLogP = Math.min(logMax, Math.max(logMin, Math.log10(Math.max(psat, minPressure))));
      const x = padding.left + ((temp - minTemp) / tempSpan) * plotWidth;
      const y = padding.top + (1 - (clampedLogP - logMin) / logSpan) * plotHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = axisTextColor;
    pressureTicks.forEach((exp, index) => {
      const y = padding.top + (1 - (exp - logMin) / logSpan) * plotHeight;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pressureTickLabels[index], padding.left - 8, y);
    });
    tempTicksKelvin.forEach((tickValue) => {
      const x = padding.left + ((tickValue - minTemp) / tempSpan) * plotWidth;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(formatNumber(toDisplayTemperature(tickValue), false, 0), x, chartBottom + 8);
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(getTerraformingGraphText('pressureLog', 'Pressure (Pa, log)'), 8, 16);
    ctx.textAlign = 'right';
    ctx.fillText(
      getTerraformingGraphText('axis.temperature', 'Temperature ({unit})', { unit: displayTempUnit }),
      width - padding.right,
      chartBottom + 26
    );

    const clampedTemp = Math.max(minTemp, Math.min(maxTemp, currentTemp));
    const clampedPressure = Math.max(minPressure, Math.min(maxPressure, currentPressure));
    const markerX = padding.left + ((clampedTemp - minTemp) / tempSpan) * plotWidth;
    const markerY = padding.top + (1 - (Math.log10(clampedPressure) - logMin) / logSpan) * plotHeight;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    return;
  }

  updateLegend(series) {
    const legend = this.ui.legend;
    const items = this.ui.legendItems;
    for (let i = 0; i < series.length; i += 1) {
      const entry = series[i];
      const item = items[i] || this.createLegendItem();
      items[i] = item;
      item.swatch.style.backgroundColor = entry.color;
      item.label.textContent = entry.label;
      item.wrapper.style.display = '';
      legend.appendChild(item.wrapper);
    }
    for (let i = series.length; i < items.length; i += 1) {
      items[i].wrapper.style.display = 'none';
    }
  }

  createLegendItem() {
    const wrapper = document.createElement('div');
    wrapper.className = 'terraforming-graphs-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'terraforming-graphs-legend-swatch';
    const label = document.createElement('span');
    label.className = 'terraforming-graphs-legend-label';
    wrapper.appendChild(swatch);
    wrapper.appendChild(label);
    return { wrapper, swatch, label };
  }
}

const terraformingGraphsManager = new TerraformingGraphsManager();
