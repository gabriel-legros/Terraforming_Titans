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
  effectsItems: []
};

const KESSLER_EFFECTS = [
  'Solis drop: keep 1,000 water in the colony, spill the rest onto the surface with no storage bonus; other supplies cap at 1,000 (metal and research unaffected).',
  'Galactic Market trades cap total import + export at 100 per second, and Cargo Rockets cap total payload at 100 × project duration (seconds) while the hazard is active.',
  'Debris below the exobase decays faster the deeper the periapsis falls.'
];
const KESSLER_CHART_BINS = 64;

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

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixColor(start, end, t) {
  return [
    mixChannel(start[0], end[0], t),
    mixChannel(start[1], end[1], t),
    mixChannel(start[2], end[2], t)
  ];
}

function colorToCss(color, alpha = 1) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
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
    for (let i = 0; i < KESSLER_CHART_BINS; i += 1) {
      const bar = doc.createElement('div');
      bar.className = 'kessler-debris-chart__bar';
      chartBars.appendChild(bar);
      chartBarsList.push(bar);
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
    root.appendChild(card);

    kesslerHazardUICache.card = card;
    kesslerHazardUICache.title = title;
    kesslerHazardUICache.chartWrapper = chartWrapper;
    kesslerHazardUICache.chart = chart;
    kesslerHazardUICache.chartBars = chartBars;
    kesslerHazardUICache.chartBarsList = chartBarsList;
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

function updateKesslerDebrisChart(resource, distribution, exobaseMeters, isCleared) {
  const bars = kesslerHazardUICache.chartBarsList;
  const sortedEntries = distribution.slice().sort((a, b) => a.periapsisMeters - b.periapsisMeters);
  const bins = new Array(bars.length).fill(0);

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
    maxPeriapsis = Math.max(1, exobaseMeters);
  }
  const span = Math.max(1, maxPeriapsis - minPeriapsis);
  if (sortedEntries.length) {
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
  }
  const exobaseRatio = Math.min(1, Math.max(0, (exobaseMeters - minPeriapsis) / span));
  const initialValue = resource.initialValue || 0;
  const currentValue = resource.value || 0;
  const clearanceRatio = initialValue
    ? Math.max(0, Math.min(1, 1 - currentValue / initialValue))
    : 0;
  const hazardColor = [226, 74, 74];
  const clearColor = [86, 178, 255];

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
    const belowExobase = binCenter <= exobaseMeters;
    const clearanceBoost = belowExobase ? 1.1 : 0.7;
    const mixRatio = Math.min(1, clearanceRatio * clearanceBoost);
    const baseColor = mixColor(hazardColor, clearColor, mixRatio);
    const highlight = baseColor.map((channel) => Math.min(255, Math.round(channel * 1.15)));
    const shadow = baseColor.map((channel) => Math.max(0, Math.round(channel * 0.6)));
    bars[i].style.background = `linear-gradient(180deg, ${colorToCss(highlight, 0.95)}, ${colorToCss(shadow, 0.9)})`;
    bars[i].style.boxShadow = `0 -6px 12px ${colorToCss(highlight, 0.35)}`;
    bars[i].classList.toggle('kessler-debris-chart__bar--below', belowExobase);
    bars[i].classList.toggle('kessler-debris-chart__bar--above', !belowExobase);
  }

  const exobasePercent = formatNumeric(exobaseRatio * 100, 2);
  kesslerHazardUICache.chartExobase.style.left = `${exobasePercent}%`;
  kesslerHazardUICache.chartExobaseLabel.style.left = `${exobasePercent}%`;
  kesslerHazardUICache.chartExobaseLabel.textContent = `Exobase ${formatNumeric(exobaseMeters / 1000, 0)} km`;
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
    const distribution = manager.kesslerHazard.getPeriapsisDistribution();
    updateKesslerDebrisChart(debris, distribution, decaySummary.exobaseHeightMeters || 0, isCleared);
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
    const exobaseKm = (decaySummary.exobaseHeightMeters || 0) / 1000;
    const belowFraction = decaySummary.belowFraction || 0;
    const decayRate = decaySummary.decayTonsPerSecond || 0;

    kesslerHazardUICache.summaryLeftBody.textContent =
      `Debris: ${formatNumeric(currentValue, 2)} / ${formatNumeric(initialValue, 2)} t\nDensity: ${formatNumeric(density, 2)} t/land\nClearance: ${clearance}`;
    kesslerHazardUICache.summaryCenterBody.textContent =
      `Small projects: ${formatPercent(failureChances.smallFailure)} failure\nLarge projects: ${formatPercent(failureChances.largeFailure)} failure`;
    kesslerHazardUICache.summaryRightBody.textContent =
      `${isCleared ? 'Status: Cleared' : 'Status: Active'}\nExobase: ${formatNumeric(exobaseKm, 1)} km\nBelow exobase: ${formatPercent(belowFraction)}\nDecay: ${formatNumeric(decayRate, 4)} t/s`;
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
