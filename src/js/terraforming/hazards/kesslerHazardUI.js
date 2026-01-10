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
