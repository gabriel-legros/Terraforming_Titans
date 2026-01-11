const kesslerHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  chartWrapper: null,
  chart: null,
  chartBars: null,
  chartBarsList: [],
  chartBarFills: [],
  chartExobase: null,
  chartExobaseLabel: null,
  chartDetails: null,
  summaryRow: null,
  summaryLeft: null,
  summaryLeftHeader: null,
  summaryLeftBody: null,
  summaryCenter: null,
  summaryCenterHeader: null,
  summaryCenterBody: null,
  summaryRight: null,
  summaryRightHeader: null,
  summaryRightBody: null,
  effectsSection: null,
  effectsHeader: null,
  effectsList: null,
  effectsItems: [],
  debrisSourcesSection: null,
  debrisSourcesHeader: null,
  debrisSourcesGrid: null,
  debrisSourcesSmallList: null,
  debrisSourcesLargeList: null
};

const KESSLER_EFFECTS = [
  'Solis drop: keep 1,000 water in the colony, spill the rest onto the surface with no storage bonus; other supplies cap at 1,000 (metal and research unaffected).',
  'Galactic Market trades cap total import + export at 100 per second, and Cargo Rockets cap total payload at 100 × project duration (seconds) while the hazard is active.',
  'Debris decay scales with local atmospheric density at each periapsis bin.'
];
const KESSLER_CHART_BINS = 64;
const KESSLER_DEBRIS_SOURCES = {
  small: [
    'Space Mirror construction.',
    'Ore satellite deployments.',
    'Geothermal satellite deployments.'
  ],
  large: [
    'Dyson Receiver construction.',
    'Hyperion Lantern construction.',
    'Spaceship shipments (imports, exports, and space storage transfers).'
  ]
};

function getDocument() {
  return kesslerHazardUICache.doc !== undefined
    ? kesslerHazardUICache.doc
    : (() => {
      try {
        kesslerHazardUICache.doc = document;
      } catch (error) {
        kesslerHazardUICache.doc = null;
      }
      return kesslerHazardUICache.doc;
    })();
}

function getHazardRoot() {
  return kesslerHazardUICache.rootResolved
    ? kesslerHazardUICache.root
    : (() => {
      kesslerHazardUICache.rootResolved = true;
      const doc = getDocument();
      try {
        kesslerHazardUICache.root = doc.getElementById('hazard-terraforming');
      } catch (error) {
        kesslerHazardUICache.root = null;
      }
      return kesslerHazardUICache.root;
    })();
}

function getHazardManager() {
  try {
    return hazardManager;
  } catch (error) {
    return null;
  }
}

function getResources() {
  try {
    return resources;
  } catch (error) {
    return null;
  }
}

function formatNumeric(value, decimals = 2) {
  let formatted = null;
  try {
    formatted = formatNumber(value, false, decimals);
  } catch (error) {
    formatted = null;
  }
  return formatted || Number(value || 0).toFixed(decimals);
}

function formatPercent(value) {
  return `${formatNumeric(value * 100, 0)}%`;
}

function formatDensity(value) {
  let formatted = null;
  try {
    formatted = formatNumber(value, false, 2, true);
  } catch (error) {
    formatted = null;
  }
  return formatted || Number(value || 0).toExponential(1);
}

function buildKesslerLayout() {
  try {
    const doc = getDocument();
    const root = getHazardRoot();

    const card = doc.createElement('div');
    card.className = 'hazard-card';

    const title = doc.createElement('h3');
    title.className = 'hazard-card__title';
    title.textContent = 'Kessler Skies';
    card.appendChild(title);

    const summaryRow = doc.createElement('div');
    summaryRow.className = 'hazard-summary-row';

    const summaryLeft = doc.createElement('div');
    summaryLeft.className = 'hazard-summary hazard-summary--left';
    const summaryLeftHeader = doc.createElement('div');
    summaryLeftHeader.className = 'hazard-summary__header';
    summaryLeftHeader.textContent = 'Debris Field';
    const summaryLeftBody = doc.createElement('div');
    summaryLeftBody.className = 'hazard-summary__body';
    summaryLeft.appendChild(summaryLeftHeader);
    summaryLeft.appendChild(summaryLeftBody);

    const summaryCenter = doc.createElement('div');
    summaryCenter.className = 'hazard-summary hazard-summary--growth';
    const summaryCenterHeader = doc.createElement('div');
    summaryCenterHeader.className = 'hazard-summary__header';
    summaryCenterHeader.textContent = 'Project Failure';
    const summaryCenterBody = doc.createElement('div');
    summaryCenterBody.className = 'hazard-summary__body';
    summaryCenter.appendChild(summaryCenterHeader);
    summaryCenter.appendChild(summaryCenterBody);

    const summaryRight = doc.createElement('div');
    summaryRight.className = 'hazard-summary hazard-summary--right';
    const summaryRightHeader = doc.createElement('div');
    summaryRightHeader.className = 'hazard-summary__header';
    summaryRightHeader.textContent = 'Debris Decay';
    const summaryRightBody = doc.createElement('div');
    summaryRightBody.className = 'hazard-summary__body';
    summaryRight.appendChild(summaryRightHeader);
    summaryRight.appendChild(summaryRightBody);

    summaryRow.appendChild(summaryLeft);
    summaryRow.appendChild(summaryCenter);
    summaryRow.appendChild(summaryRight);
    card.appendChild(summaryRow);

    const chartWrapper = doc.createElement('div');
    chartWrapper.className = 'hazard-bar-wrapper';

    const chart = doc.createElement('div');
    chart.className = 'kessler-debris-chart';

    const chartBars = doc.createElement('div');
    chartBars.className = 'kessler-debris-chart__bars';

    const chartBarsList = [];
    const chartBarFills = [];
    for (let i = 0; i < KESSLER_CHART_BINS; i += 1) {
      const bar = doc.createElement('div');
      bar.className = 'kessler-debris-chart__bar';
      const fill = doc.createElement('div');
      fill.className = 'kessler-debris-chart__bar-fill';
      bar.appendChild(fill);
      chartBars.appendChild(bar);
      chartBarsList.push(bar);
      chartBarFills.push(fill);
    }

    const chartExobase = doc.createElement('div');
    chartExobase.className = 'kessler-debris-chart__exobase';

    const chartExobaseLabel = doc.createElement('div');
    chartExobaseLabel.className = 'kessler-debris-chart__exobase-label';

    chartBars.appendChild(chartExobase);
    chart.appendChild(chartBars);
    chart.appendChild(chartExobaseLabel);

    const chartDetails = doc.createElement('div');
    chartDetails.className = 'kessler-debris-chart__details';

    chartWrapper.appendChild(chart);
    chartWrapper.appendChild(chartDetails);
    card.appendChild(chartWrapper);

    const effectsSection = doc.createElement('div');
    effectsSection.className = 'hazard-effects';

    const effectsHeader = doc.createElement('div');
    effectsHeader.className = 'hazard-effects__header';
    effectsHeader.textContent = 'Effects';

    const effectsList = doc.createElement('ul');
    effectsList.className = 'hazard-effects__list';

    const effectItems = [];
    KESSLER_EFFECTS.forEach((entry) => {
      const item = doc.createElement('li');
      item.className = 'hazard-effects__item';
      item.textContent = entry;
      effectsList.appendChild(item);
      effectItems.push(item);
    });

    effectsSection.appendChild(effectsHeader);
    effectsSection.appendChild(effectsList);
    card.appendChild(effectsSection);

    const debrisSourcesSection = doc.createElement('div');
    debrisSourcesSection.className = 'hazard-debris-sources';

    const debrisSourcesHeader = doc.createElement('div');
    debrisSourcesHeader.className = 'hazard-debris-sources__header';
    debrisSourcesHeader.textContent = 'Debris Sources';

    const debrisSourcesGrid = doc.createElement('div');
    debrisSourcesGrid.className = 'hazard-debris-sources__grid';

    const buildDebrisColumn = (titleText, items) => {
      const column = doc.createElement('div');
      column.className = 'hazard-debris-sources__column';
      const title = doc.createElement('div');
      title.className = 'hazard-debris-sources__title';
      title.textContent = titleText;
      const list = doc.createElement('ul');
      list.className = 'hazard-debris-sources__list';
      items.forEach((entry) => {
        const item = doc.createElement('li');
        item.className = 'hazard-debris-sources__item';
        item.textContent = entry;
        list.appendChild(item);
      });
      column.appendChild(title);
      column.appendChild(list);
      return { column, list };
    };

    const smallColumn = buildDebrisColumn('Small Debris', KESSLER_DEBRIS_SOURCES.small);
    const largeColumn = buildDebrisColumn('Large Debris', KESSLER_DEBRIS_SOURCES.large);
    debrisSourcesGrid.appendChild(smallColumn.column);
    debrisSourcesGrid.appendChild(largeColumn.column);

    debrisSourcesSection.appendChild(debrisSourcesHeader);
    debrisSourcesSection.appendChild(debrisSourcesGrid);
    card.appendChild(debrisSourcesSection);
    root.appendChild(card);

    kesslerHazardUICache.card = card;
    kesslerHazardUICache.title = title;
    kesslerHazardUICache.chartWrapper = chartWrapper;
    kesslerHazardUICache.chart = chart;
    kesslerHazardUICache.chartBars = chartBars;
    kesslerHazardUICache.chartBarsList = chartBarsList;
    kesslerHazardUICache.chartBarFills = chartBarFills;
    kesslerHazardUICache.chartExobase = chartExobase;
    kesslerHazardUICache.chartExobaseLabel = chartExobaseLabel;
    kesslerHazardUICache.chartDetails = chartDetails;
    kesslerHazardUICache.summaryRow = summaryRow;
    kesslerHazardUICache.summaryLeft = summaryLeft;
    kesslerHazardUICache.summaryLeftHeader = summaryLeftHeader;
    kesslerHazardUICache.summaryLeftBody = summaryLeftBody;
    kesslerHazardUICache.summaryCenter = summaryCenter;
    kesslerHazardUICache.summaryCenterHeader = summaryCenterHeader;
    kesslerHazardUICache.summaryCenterBody = summaryCenterBody;
    kesslerHazardUICache.summaryRight = summaryRight;
    kesslerHazardUICache.summaryRightHeader = summaryRightHeader;
    kesslerHazardUICache.summaryRightBody = summaryRightBody;
    kesslerHazardUICache.effectsSection = effectsSection;
    kesslerHazardUICache.effectsHeader = effectsHeader;
    kesslerHazardUICache.effectsList = effectsList;
    kesslerHazardUICache.effectsItems = effectItems;
    kesslerHazardUICache.debrisSourcesSection = debrisSourcesSection;
    kesslerHazardUICache.debrisSourcesHeader = debrisSourcesHeader;
    kesslerHazardUICache.debrisSourcesGrid = debrisSourcesGrid;
    kesslerHazardUICache.debrisSourcesSmallList = smallColumn.list;
    kesslerHazardUICache.debrisSourcesLargeList = largeColumn.list;

    return card;
  } catch (error) {
    return null;
  }
}

function ensureKesslerLayout() {
  return kesslerHazardUICache.card || buildKesslerLayout();
}

function updateKesslerChartDetails(resource, isCleared) {
  const initialValue = resource.initialValue || 0;
  const currentValue = resource.value || 0;
  const detailText = isCleared
    ? 'Orbital debris cleared.'
    : `Orbital debris: ${formatNumeric(currentValue, 2)} / ${formatNumeric(initialValue, 2)} t`;

  kesslerHazardUICache.chartDetails.textContent = detailText;
}

function updateKesslerDebrisChart(
  resource,
  baselineDistribution,
  currentDistribution,
  dragThresholdMeters,
  dragThresholdDensity,
  isCleared
) {
  const bars = kesslerHazardUICache.chartBarsList;
  const fills = kesslerHazardUICache.chartBarFills;
  const baselineEntries = baselineDistribution.length ? baselineDistribution : currentDistribution;
  const currentEntries = currentDistribution.length ? currentDistribution : baselineDistribution;
  const sortedEntries = baselineEntries.slice().sort((a, b) => a.periapsisMeters - b.periapsisMeters);
  const bins = new Array(bars.length).fill(0);
  const currentBins = new Array(bars.length).fill(0);

  let minPeriapsis = 0;
  let maxPeriapsis = 1;
  if (sortedEntries.length) {
    minPeriapsis = sortedEntries[0].periapsisMeters;
    maxPeriapsis = sortedEntries[0].periapsisMeters;
    for (let i = 1; i < sortedEntries.length; i += 1) {
      const value = sortedEntries[i].periapsisMeters;
      minPeriapsis = Math.min(minPeriapsis, value);
      maxPeriapsis = Math.max(maxPeriapsis, value);
    }
  } else {
    maxPeriapsis = Math.max(1, dragThresholdMeters);
  }
  const span = Math.max(1, maxPeriapsis - minPeriapsis);
  for (let i = 0; i < sortedEntries.length; i += 1) {
    const entry = sortedEntries[i];
    const ratio = (entry.periapsisMeters - minPeriapsis) / span;
    let index = Math.floor(ratio * bars.length);
    if (index >= bars.length) {
      index = bars.length - 1;
    } else if (index < 0) {
      index = 0;
    }
    bins[index] += entry.massTons;
  }
  for (let i = 0; i < currentEntries.length; i += 1) {
    const entry = currentEntries[i];
    const ratio = (entry.periapsisMeters - minPeriapsis) / span;
    let index = Math.floor(ratio * bars.length);
    if (index >= bars.length) {
      index = bars.length - 1;
    } else if (index < 0) {
      index = 0;
    }
    currentBins[index] += entry.massTons;
  }
  const dragRatio = Math.min(1, Math.max(0, (dragThresholdMeters - minPeriapsis) / span));

  let maxMass = 0;
  for (let i = 0; i < bins.length; i += 1) {
    maxMass = Math.max(maxMass, bins[i]);
  }
  const scale = Math.max(1, maxMass);

  for (let i = 0; i < bars.length; i += 1) {
    const mass = bins[i];
    const heightRatio = mass / scale;
    const height = mass > 0 ? Math.max(2, heightRatio * 100) : 0;
    bars[i].style.height = `${height}%`;
    const binCenter = minPeriapsis + (i + 0.5) / bars.length * span;
    const inDrag = binCenter <= dragThresholdMeters;
    const baselineMass = bins[i];
    const currentMass = currentBins[i];
    const fillRatio = baselineMass ? Math.max(0, Math.min(1, 1 - currentMass / baselineMass)) : 0;
    const fillHeight = height ? fillRatio * 100 : 0;
    fills[i].style.height = `${fillHeight}%`;
    bars[i].classList.toggle('kessler-debris-chart__bar--below', inDrag);
    bars[i].classList.toggle('kessler-debris-chart__bar--above', !inDrag);
  }

  const dragPercent = formatNumeric(dragRatio * 100, 2);
  kesslerHazardUICache.chartExobase.style.left = `${dragPercent}%`;
  kesslerHazardUICache.chartExobaseLabel.style.left = `${dragPercent}%`;
  kesslerHazardUICache.chartExobaseLabel.textContent =
    `Drag ${formatDensity(dragThresholdDensity)} kg/m³`;
  updateKesslerChartDetails(resource, isCleared);
}

function initializeKesslerHazardUI() {
  ensureKesslerLayout();
}

function updateKesslerHazardUI(kesslerParameters) {
  try {
    const card = ensureKesslerLayout();
    card.style.display = kesslerParameters ? '' : 'none';
    const resourcesState = getResources();
    const manager = getHazardManager();
    const debris = resourcesState.special.orbitalDebris;
    const isCleared = manager.kesslerHazard.isCleared();
    const decaySummary = manager.kesslerHazard.getDecaySummary();
    const baseline = manager.kesslerHazard.getPeriapsisBaseline();
    const distribution = manager.kesslerHazard.getPeriapsisDistribution();
    updateKesslerDebrisChart(
      debris,
      baseline,
      distribution,
      decaySummary.dragThresholdHeightMeters || 0,
      decaySummary.dragThresholdDensity || 0,
      isCleared
    );
    const failureChances = manager.kesslerHazard.getProjectFailureChances();
    const initialValue = debris.initialValue || 0;
    const currentValue = debris.value || 0;
    const ratio = initialValue ? Math.max(0, Math.min(1, currentValue / initialValue)) : 0;
    let perLand = 0;
    try {
      perLand = kesslerParameters.orbitalDebrisPerLand;
    } catch (error) {
      perLand = 0;
    }
    perLand = perLand || 0;
    const density = initialValue ? perLand * ratio : 0;
    const clearance = formatPercent(1 - ratio);
    const dragKm = (decaySummary.dragThresholdHeightMeters || 0) / 1000;
    const dragDensity = decaySummary.dragThresholdDensity || 0;
    const dragFraction = decaySummary.dragFraction || 0;
    const decayRate = decaySummary.decayTonsPerSecond || 0;

    kesslerHazardUICache.summaryLeftBody.textContent =
      `Debris: ${formatNumeric(currentValue, 2)} / ${formatNumeric(initialValue, 2)} t\nDensity: ${formatNumeric(density, 2)} t/land\nClearance: ${clearance}`;
    kesslerHazardUICache.summaryCenterBody.textContent =
      `Small projects: ${formatPercent(failureChances.smallFailure)} failure\nLarge projects: ${formatPercent(failureChances.largeFailure)} failure`;
    kesslerHazardUICache.summaryRightBody.textContent =
      `${isCleared ? 'Status: Cleared' : 'Status: Active'}\nDrag line: ${formatDensity(dragDensity)} kg/m³ @ ${formatNumeric(dragKm, 1)} km\nIn drag: ${formatPercent(dragFraction)}\nDecay: ${formatNumeric(decayRate, 4)} t/s`;
  } catch (error) {
    // ignore missing UI helpers in tests
  }
}

try {
  window.initializeKesslerHazardUI = initializeKesslerHazardUI;
  window.updateKesslerHazardUI = updateKesslerHazardUI;
} catch (error) {
  // Window not available (tests)
}

try {
  module.exports = {
    initializeKesslerHazardUI,
    updateKesslerHazardUI
  };
} catch (error) {
  // Module system not available in browser
}
