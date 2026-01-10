const kesslerHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  barWrapper: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
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
  'Galactic Market trades cap total import + export at 100 per second, and Cargo Rockets cap total payload at 100 × project duration (seconds) while the hazard is active.'
];

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

    const barWrapper = doc.createElement('div');
    barWrapper.className = 'hazard-bar-wrapper';

    const bar = doc.createElement('div');
    bar.className = 'hazard-bar';

    const safeFill = doc.createElement('div');
    safeFill.className = 'hazard-bar__segment hazard-bar__segment--safe';

    const safeLabel = doc.createElement('span');
    safeLabel.className = 'hazard-bar__label hazard-bar__label--safe';
    safeFill.appendChild(safeLabel);

    const hazardFill = doc.createElement('div');
    hazardFill.className = 'hazard-bar__segment hazard-bar__segment--hazard';

    const hazardLabel = doc.createElement('span');
    hazardLabel.className = 'hazard-bar__label hazard-bar__label--hazard';
    hazardFill.appendChild(hazardLabel);

    bar.appendChild(safeFill);
    bar.appendChild(hazardFill);

    const barDetails = doc.createElement('div');
    barDetails.className = 'hazard-bar__details';

    barWrapper.appendChild(bar);
    barWrapper.appendChild(barDetails);
    card.appendChild(barWrapper);

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
    kesslerHazardUICache.barWrapper = barWrapper;
    kesslerHazardUICache.barSafe = safeFill;
    kesslerHazardUICache.barHazard = hazardFill;
    kesslerHazardUICache.barSafeLabel = safeLabel;
    kesslerHazardUICache.barHazardLabel = hazardLabel;
    kesslerHazardUICache.barDetails = barDetails;
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

function updateKesslerBar(resource, isCleared) {
  const initialValue = resource.initialValue || 0;
  const currentValue = resource.value || 0;
  const hazardRatio = Math.max(0, Math.min(1, currentValue / (initialValue || 1)));
  const effectiveHazardRatio = isCleared ? 0 : hazardRatio;
  const safeRatio = 1 - effectiveHazardRatio;
  const safeWidth = `${formatNumeric(safeRatio * 100, 1)}%`;
  const hazardWidth = `${formatNumeric(effectiveHazardRatio * 100, 1)}%`;
  const safeLabel = isCleared ? 'Cleared' : `Clear ${formatPercent(safeRatio)}`;
  const hazardLabel = `Debris ${formatPercent(effectiveHazardRatio)}`;
  const detailText = isCleared
    ? 'Orbital debris cleared.'
    : `Orbital debris: ${formatNumeric(currentValue, 2)} / ${formatNumeric(initialValue, 2)} t`;

  kesslerHazardUICache.barSafeLabel.textContent = safeLabel;
  kesslerHazardUICache.barHazardLabel.textContent = hazardLabel;
  kesslerHazardUICache.barSafe.style.width = safeWidth;
  kesslerHazardUICache.barHazard.style.width = hazardWidth;
  kesslerHazardUICache.barSafe.style.flexBasis = safeWidth;
  kesslerHazardUICache.barHazard.style.flexBasis = hazardWidth;
  kesslerHazardUICache.barDetails.textContent = detailText;
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
    const debris = resourcesState.surface.orbitalDebris;
    const isCleared = manager.kesslerHazard.isCleared();
    updateKesslerBar(debris, isCleared);
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

    kesslerHazardUICache.summaryLeftBody.textContent =
      `Debris: ${formatNumeric(currentValue, 2)} / ${formatNumeric(initialValue, 2)} t\nDensity: ${formatNumeric(density, 2)} t/land\nClearance: ${clearance}`;
    kesslerHazardUICache.summaryCenterBody.textContent =
      `Small projects: ${formatPercent(failureChances.smallFailure)} failure\nLarge projects: ${formatPercent(failureChances.largeFailure)} failure`;
    kesslerHazardUICache.summaryRightBody.textContent =
      `${isCleared ? 'Status: Cleared' : 'Status: Active'}\nDecay systems: Offline`;
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
