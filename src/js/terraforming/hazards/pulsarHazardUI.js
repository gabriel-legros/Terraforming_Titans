const pulsarHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  viz: null,
  summaryStatusBody: null,
  summaryRadiationBody: null,
  effectsItems: []
};

const PULSAR_DISABLED_PROJECTS_TEXT = 'Space Mirror Facility, Space Elevator, Mega Heat Sink, and Magnetic Shield are disabled until the pulsar hazard is fully cleared.';
const PULSAR_THRUSTER_COST_TEXT = 'Planetary Thrusters construction cost is multiplied by x100.';
const PULSAR_CLEAR_TEXT = 'Build all Artificial Sky segments or go rogue.';
const PULSAR_BASE_STORM_ATTRITION_PERCENT = 3;

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
  titleRow.textContent = 'Pulsar';
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

  const stormItem = doc.createElement('li');
  stormItem.className = 'hazard-effects__item';
  effectsList.appendChild(stormItem);

  const nanobotCapItem = doc.createElement('li');
  nanobotCapItem.className = 'hazard-effects__item';
  effectsList.appendChild(nanobotCapItem);

  const thrusterCostItem = doc.createElement('li');
  thrusterCostItem.className = 'hazard-effects__item';
  effectsList.appendChild(thrusterCostItem);

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
  pulsarHazardUICache.viz = pulsarViz;
  pulsarHazardUICache.summaryStatusBody = summaryStatusBody;
  pulsarHazardUICache.summaryRadiationBody = summaryRadiationBody;
  pulsarHazardUICache.effectsItems = [disabledProjectsItem, landUnusableItem, stormItem, nanobotCapItem, thrusterCostItem];
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

  let cleared = false;
  if (pulsarParameters && hazardManager && hazardManager.pulsarHazard) {
    try {
      cleared = hazardManager.pulsarHazard.isCleared(terraforming, pulsarParameters);
    } catch (error) {
      cleared = false;
    }
  }

  const isActive = !!pulsarParameters && !cleared;
  card.style.display = isActive ? '' : 'none';
  card.classList.toggle('hazard-card--active', isActive);
  if (!isActive) {
    if (pulsarHazardUICache.viz) {
      pulsarHazardUICache.viz.classList.remove('pulsar-viz--storm');
    }
    return;
  }

  const description = pulsarParameters.description || 'Pulsar hazard detected.';
  const baseOrbitalBoost = Number.isFinite(pulsarParameters.orbitalDoseBoost_mSvPerDay)
    ? pulsarParameters.orbitalDoseBoost_mSvPerDay
    : 0;
  let stormActive = false;
  let stormRemaining = 0;
  let stormNext = 0;
  let artificialSkyCompletion = 0;
  let hazardStrength = 1;
  if (hazardManager && hazardManager.pulsarHazard) {
    stormActive = hazardManager.pulsarHazard.isStormActive();
    stormRemaining = hazardManager.pulsarHazard.getStormRemainingSeconds();
    stormNext = hazardManager.pulsarHazard.getSecondsUntilNextStorm();
    artificialSkyCompletion = hazardManager.pulsarHazard.getArtificialSkyCompletionRatio(terraforming, pulsarParameters);
    hazardStrength = hazardManager.pulsarHazard.getHazardStrength(terraforming, pulsarParameters);
  }
  artificialSkyCompletion = Math.max(0, Math.min(1, artificialSkyCompletion));
  hazardStrength = Math.max(0, Math.min(1, hazardStrength));
  const mitigationPercent = artificialSkyCompletion * 100;
  const hazardPercent = hazardStrength * 100;
  const effectiveOrbitalBoost = baseOrbitalBoost * hazardStrength;
  const stormAttritionPercent = PULSAR_BASE_STORM_ATTRITION_PERCENT * hazardStrength;
  const currentLandLockPercent = hazardPercent;
  const currentNanobotMultiplier = nanotechManager && nanotechManager.getPulsarNanobotCapMultiplier
    ? nanotechManager.getPulsarNanobotCapMultiplier()
    : 0;

  if (pulsarHazardUICache.summaryStatusBody) {
    const stormLine = stormActive
      ? `Electromagnetic storm active (${stormRemaining.toFixed(1)}s left).`
      : `Next electromagnetic storm in ${stormNext.toFixed(1)}s.`;
    pulsarHazardUICache.summaryStatusBody.textContent =
      `${description}\nArtificial Sky completion: ${mitigationPercent.toFixed(1)}% (hazard intensity ${hazardPercent.toFixed(1)}%).\n${stormLine}`;
  }
  if (pulsarHazardUICache.viz) {
    pulsarHazardUICache.viz.classList.toggle('pulsar-viz--storm', stormActive);
  }

  const roundedOrbitalBoost = Math.round(effectiveOrbitalBoost);
  const roundedBaseOrbitalBoost = Math.round(baseOrbitalBoost);
  if (pulsarHazardUICache.summaryRadiationBody) {
    pulsarHazardUICache.summaryRadiationBody.textContent =
      `+${roundedOrbitalBoost} mSv/day orbital dose (base +${roundedBaseOrbitalBoost})\nSurface dose is attenuated by atmosphere.`;
  }
  if (pulsarHazardUICache.effectsItems[0]) {
    pulsarHazardUICache.effectsItems[0].textContent = PULSAR_DISABLED_PROJECTS_TEXT;
  }
  if (pulsarHazardUICache.effectsItems[1]) {
    pulsarHazardUICache.effectsItems[1].textContent =
      `Hazard land lock now reserves ${formatNumber(currentLandLockPercent, false, 2)}% of initial land.  You can still use underground land and aerostats.`;
  }
  if (pulsarHazardUICache.effectsItems[2]) {
    pulsarHazardUICache.effectsItems[2].textContent =
      `Electromagnetic storm every 100s for 5s: ${formatNumber(stormAttritionPercent, false, 2)}% attrition to worker androids, electronics, and nanobots while active; spaceship projects paused.`;
  }
  if (pulsarHazardUICache.effectsItems[3]) {
    pulsarHazardUICache.effectsItems[3].textContent =
      `Nanobot cap multiplier now uses the higher of Underground Expansion ratio and Artificial Sky completion. Current multiplier: x${formatNumber(currentNanobotMultiplier, false, 3)}.`;
  }
  if (pulsarHazardUICache.effectsItems[4]) {
    pulsarHazardUICache.effectsItems[4].textContent = PULSAR_THRUSTER_COST_TEXT;
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
