const pulsarHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  summaryStatusBody: null,
  summaryRadiationBody: null,
  effectsItems: []
};

const PULSAR_DISABLED_PROJECTS_TEXT = 'Space Mirror Facility, Space Elevator, and Mega Heat Sink are disabled until the pulsar hazard is cleared.';
const PULSAR_LAND_UNUSABLE_TEXT = 'Land is unusable until the hazard is cleared, except underground land and aerostats.';
const PULSAR_CLEAR_TEXT = 'Build an artificial sky or go rogue.';

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
    attachDynamicInfoTooltip(icon, 'Pulsar bursts add severe orbital radiation. Surface radiation is reduced by atmospheric attenuation.');
  } catch (error) {
    icon.title = 'Pulsar bursts add severe orbital radiation. Surface radiation is reduced by atmospheric attenuation.';
  }
  titleRow.appendChild(icon);
  card.appendChild(titleRow);

  const summaryRow = doc.createElement('div');
  summaryRow.className = 'hazard-summary-row';

  const summaryStatus = doc.createElement('div');
  summaryStatus.className = 'hazard-summary hazard-summary--left';
  const summaryStatusHeader = doc.createElement('div');
  summaryStatusHeader.className = 'hazard-summary__header';
  summaryStatusHeader.textContent = 'Status';
  const summaryStatusBody = doc.createElement('div');
  summaryStatusBody.className = 'hazard-summary__body';
  summaryStatus.appendChild(summaryStatusHeader);
  summaryStatus.appendChild(summaryStatusBody);

  const summaryRadiation = doc.createElement('div');
  summaryRadiation.className = 'hazard-summary hazard-summary--right';
  const summaryRadiationHeader = doc.createElement('div');
  summaryRadiationHeader.className = 'hazard-summary__header';
  summaryRadiationHeader.textContent = 'Added Radiation';
  const summaryRadiationBody = doc.createElement('div');
  summaryRadiationBody.className = 'hazard-summary__body';
  summaryRadiation.appendChild(summaryRadiationHeader);
  summaryRadiation.appendChild(summaryRadiationBody);

  summaryRow.appendChild(summaryStatus);
  summaryRow.appendChild(summaryRadiation);
  card.appendChild(summaryRow);

  const pulsarViz = doc.createElement('div');
  pulsarViz.className = 'pulsar-viz';

  const pulsarCore = doc.createElement('div');
  pulsarCore.className = 'pulsar-viz__core';
  pulsarViz.appendChild(pulsarCore);

  const pulsarRingOuter = doc.createElement('div');
  pulsarRingOuter.className = 'pulsar-viz__ring pulsar-viz__ring--outer';
  pulsarViz.appendChild(pulsarRingOuter);

  const pulsarRingInner = doc.createElement('div');
  pulsarRingInner.className = 'pulsar-viz__ring pulsar-viz__ring--inner';
  pulsarViz.appendChild(pulsarRingInner);

  const pulsarBeamTop = doc.createElement('div');
  pulsarBeamTop.className = 'pulsar-viz__beam pulsar-viz__beam--top';
  pulsarViz.appendChild(pulsarBeamTop);

  const pulsarBeamBottom = doc.createElement('div');
  pulsarBeamBottom.className = 'pulsar-viz__beam pulsar-viz__beam--bottom';
  pulsarViz.appendChild(pulsarBeamBottom);

  card.appendChild(pulsarViz);

  const effectsSection = doc.createElement('div');
  effectsSection.className = 'hazard-effects';

  const effectsHeader = doc.createElement('div');
  effectsHeader.className = 'hazard-effects__header';
  effectsHeader.textContent = 'Effects';

  const effectsList = doc.createElement('ul');
  effectsList.className = 'hazard-effects__list';

  const disabledProjectsItem = doc.createElement('li');
  disabledProjectsItem.className = 'hazard-effects__item';
  effectsList.appendChild(disabledProjectsItem);

  const landUnusableItem = doc.createElement('li');
  landUnusableItem.className = 'hazard-effects__item';
  effectsList.appendChild(landUnusableItem);

  effectsSection.appendChild(effectsHeader);
  effectsSection.appendChild(effectsList);
  card.appendChild(effectsSection);

  const clearSection = doc.createElement('div');
  clearSection.className = 'hazard-effects';

  const clearHeader = doc.createElement('div');
  clearHeader.className = 'hazard-effects__header';
  clearHeader.textContent = 'How to Clear';

  const clearList = doc.createElement('ul');
  clearList.className = 'hazard-effects__list';
  const clearItem = doc.createElement('li');
  clearItem.className = 'hazard-effects__item';
  clearItem.textContent = PULSAR_CLEAR_TEXT;
  clearList.appendChild(clearItem);

  clearSection.appendChild(clearHeader);
  clearSection.appendChild(clearList);
  card.appendChild(clearSection);

  root.appendChild(card);
  pulsarHazardUICache.card = card;
  pulsarHazardUICache.summaryStatusBody = summaryStatusBody;
  pulsarHazardUICache.summaryRadiationBody = summaryRadiationBody;
  pulsarHazardUICache.effectsItems = [disabledProjectsItem, landUnusableItem];
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
  card.classList.toggle('hazard-card--active', !!pulsarParameters);
  if (!pulsarParameters) {
    return;
  }

  const description = pulsarParameters.description || 'Pulsar hazard detected.';
  const orbitalBoost = Number.isFinite(pulsarParameters.orbitalDoseBoost_mSvPerDay)
    ? pulsarParameters.orbitalDoseBoost_mSvPerDay
    : 0;

  if (pulsarHazardUICache.summaryStatusBody) {
    pulsarHazardUICache.summaryStatusBody.textContent = description;
  }

  const roundedOrbitalBoost = Math.round(orbitalBoost);
  if (pulsarHazardUICache.summaryRadiationBody) {
    pulsarHazardUICache.summaryRadiationBody.textContent = `+${roundedOrbitalBoost} mSv/day orbital dose\nSurface dose is attenuated by atmosphere.`;
  }
  if (pulsarHazardUICache.effectsItems[0]) {
    pulsarHazardUICache.effectsItems[0].textContent = PULSAR_DISABLED_PROJECTS_TEXT;
  }
  if (pulsarHazardUICache.effectsItems[1]) {
    pulsarHazardUICache.effectsItems[1].textContent = PULSAR_LAND_UNUSABLE_TEXT;
  }
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
