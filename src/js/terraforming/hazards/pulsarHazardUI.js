const pulsarHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  summary: null
};

function getPulsarDocument() {
  if (pulsarHazardUICache.doc !== undefined) {
    return pulsarHazardUICache.doc;
  }

  try {
    pulsarHazardUICache.doc = document;
  } catch (error) {
    pulsarHazardUICache.doc = null;
  }

  return pulsarHazardUICache.doc;
}

function getPulsarHazardRoot() {
  if (pulsarHazardUICache.rootResolved) {
    return pulsarHazardUICache.root;
  }

  pulsarHazardUICache.rootResolved = true;
  const doc = getPulsarDocument();
  pulsarHazardUICache.root = doc ? doc.getElementById('hazard-terraforming') : null;
  return pulsarHazardUICache.root;
}

function ensurePulsarLayout() {
  if (pulsarHazardUICache.card) {
    return pulsarHazardUICache.card;
  }

  const root = getPulsarHazardRoot();
  const doc = getPulsarDocument();
  if (!root || !doc) {
    return null;
  }

  const card = doc.createElement('div');
  card.className = 'hazard-card hazard-card--pulsar';

  const titleRow = doc.createElement('div');
  titleRow.className = 'hazard-card__title';
  titleRow.textContent = 'Pulsar Activity';

  const icon = doc.createElement('span');
  icon.className = 'info-tooltip-icon';
  icon.innerHTML = '&#9432;';
  try {
    attachDynamicInfoTooltip(icon, 'Placeholder hazard panel for future pulsar mechanics.');
  } catch (error) {
    icon.title = 'Placeholder hazard panel for future pulsar mechanics.';
  }
  titleRow.appendChild(icon);
  card.appendChild(titleRow);

  const summary = doc.createElement('div');
  summary.className = 'hazard-card__summary';
  card.appendChild(summary);

  root.appendChild(card);
  pulsarHazardUICache.card = card;
  pulsarHazardUICache.summary = summary;
  return card;
}

function initializePulsarHazardUI() {
  ensurePulsarLayout();
}

function updatePulsarHazardUI(pulsarParameters) {
  const card = ensurePulsarLayout();
  if (!card) {
    return;
  }

  card.style.display = pulsarParameters ? '' : 'none';
  if (!pulsarParameters) {
    return;
  }

  const pulsePeriodSeconds = Number.isFinite(pulsarParameters.pulsePeriodSeconds)
    ? pulsarParameters.pulsePeriodSeconds
    : 1.337;
  const severity = Number.isFinite(pulsarParameters.severity)
    ? pulsarParameters.severity
    : 1;
  const description = pulsarParameters.description || 'Pulsar hazard detected.';
  const surfaceBoost = Number.isFinite(pulsarParameters.surfaceDoseBoost_mSvPerDay)
    ? pulsarParameters.surfaceDoseBoost_mSvPerDay
    : 0;

  pulsarHazardUICache.summary.textContent = `${description} Pulse period: ${pulsePeriodSeconds}s. Severity: ${severity}. Added radiation: +${Math.round(surfaceBoost)} mSv/day.`;
}

try {
  window.initializePulsarHazardUI = initializePulsarHazardUI;
  window.updatePulsarHazardUI = updatePulsarHazardUI;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = {
    initializePulsarHazardUI,
    updatePulsarHazardUI
  };
} catch (error) {
  // Module system not available in browser
}
