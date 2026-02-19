const pulsarHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
  viz: null,
  summaryStatusBody: null,
  summaryRadiationBody: null,
  scalingRadiationValue: null,
  scalingLandValue: null,
  scalingStormValue: null,
  scalingNanobotValue: null,
  effectsItems: []
};

const PULSAR_DISABLED_PROJECTS_TEXT = 'Space Mirror Facility, Space Elevator, Mega Heat Sink, and Magnetic Shield are disabled until the pulsar hazard is fully cleared.';
const PULSAR_THRUSTER_COST_TEXT = 'Planetary Thrusters construction cost is multiplied by x100.';
const PULSAR_CLEAR_TEXT = 'Build all Artificial Sky segments or go rogue.';
const PULSAR_STORM_PROJECT_TEXT = 'Electromagnetic storms repeat every 100s for 5s and pause spaceship projects while active.';
const PULSAR_DISTANCE_SCALING_TEXT = 'All pulsar effects are multiplied by (initial distance / current distance)^2 (capped at x1).';
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

function getPulsarTerraforming() {
  try {
    return terraforming;
  } catch (error) {
    return null;
  }
}

function getProjectManager() {
  try {
    return projectManager;
  } catch (error) {
    return null;
  }
}

function attachHazardCardCollapse(card, title) {
  if (!card || !title) {
    return;
  }

  const doc = getPulsarDocument();
  if (!doc) {
    return;
  }

  const arrow = doc.createElement('span');
  arrow.className = 'hazard-card__collapse-arrow';
  arrow.innerHTML = '&#9660;';
  title.insertBefore(arrow, title.firstChild);

  const syncArrow = () => {
    arrow.innerHTML = card.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  };

  const toggleCard = () => {
    card.classList.toggle('collapsed');
    syncArrow();
  };

  arrow.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCard();
  });
  title.addEventListener('click', toggleCard);
  syncArrow();
}

function clampRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function getUndergroundCompletionRatio() {
  const terraformingState = getPulsarTerraforming();
  const initialLand = Math.max(terraformingState && terraformingState.initialLand ? terraformingState.initialLand : 0, 0);
  if (initialLand <= 0) {
    return 0;
  }
  const manager = getProjectManager();
  const undergroundProject = manager && manager.projects
    ? manager.projects.undergroundExpansion
    : null;
  if (!undergroundProject) {
    return 0;
  }
  const completions = Math.max(undergroundProject.repeatCount || 0, 0);
  return clampRatio(completions / initialLand);
}

function isPulsarClearedByRogue(terraformingState) {
  return terraformingState
    && terraformingState.celestialParameters
    && terraformingState.celestialParameters.rogue === true
    && terraformingState.celestialParameters.roguePulsar !== true;
}

function getArtificialSkyProgress(artificialSkyCompletion, useCompletionFallback = true) {
  const manager = getProjectManager();
  const project = manager && manager.projects
    ? manager.projects.artificialSky
    : null;

  let maxSegments = 0;
  let builtSegments = 0;

  if (project) {
    maxSegments = project.getMaxRepeats
      ? Math.max(project.getMaxRepeats() || 0, 0)
      : Math.max(project.maxRepeatCount || 0, 0);

    if (project.getBuiltSegmentsWithProgress) {
      builtSegments = Math.max(project.getBuiltSegmentsWithProgress() || 0, 0);
    } else if (project.isCompleted) {
      builtSegments = maxSegments;
    } else {
      const repeatCount = Math.max(project.repeatCount || 0, 0);
      const segmentProgress = Math.max(project.segmentProgress || 0, 0);
      builtSegments = repeatCount + segmentProgress;
    }
  }

  if (maxSegments <= 0) {
    maxSegments = 1;
    builtSegments = useCompletionFallback
      ? clampRatio(artificialSkyCompletion) * maxSegments
      : 0;
  } else if (useCompletionFallback && builtSegments <= 0 && artificialSkyCompletion > 0) {
    builtSegments = clampRatio(artificialSkyCompletion) * maxSegments;
  }

  builtSegments = Math.max(0, Math.min(maxSegments, builtSegments));
  return { builtSegments, maxSegments };
}

function createPulsarScalingRow(doc, label, infoText) {
  const row = doc.createElement('div');
  row.className = 'hazard-factor-row hazard-factor-row--pulsar';

  const labelCell = doc.createElement('div');
  labelCell.className = 'hazard-factor-cell hazard-factor-cell--label';

  const labelTitle = doc.createElement('div');
  labelTitle.className = 'hazard-factor-label';
  labelTitle.textContent = label;
  labelCell.appendChild(labelTitle);

  if (infoText) {
    const info = doc.createElement('div');
    info.className = 'hazard-factor-info';
    info.textContent = infoText;
    labelCell.appendChild(info);
  }

  const valueCell = doc.createElement('div');
  valueCell.className = 'hazard-factor-cell hazard-factor-cell--values hazard-factor-cell--pulsar-value';

  row.appendChild(labelCell);
  row.appendChild(valueCell);

  return { row, valueCell };
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
  attachHazardCardCollapse(card, titleRow);
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

  const barWrapper = doc.createElement('div');
  barWrapper.className = 'hazard-bar-wrapper hazard-bar-wrapper--pulsar';

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

  const scalingSection = doc.createElement('div');
  scalingSection.className = 'hazard-factors hazard-factors--pulsar';

  const scalingHeader = doc.createElement('div');
  scalingHeader.className = 'hazard-factors__header';
  const scalingTitle = doc.createElement('span');
  scalingTitle.className = 'hazard-factors__title';
  scalingTitle.textContent = 'Scaling Effects';
  scalingHeader.appendChild(scalingTitle);

  const scalingGrid = doc.createElement('div');
  scalingGrid.className = 'hazard-factor-grid hazard-factor-grid--pulsar';

  const radiationRow = createPulsarScalingRow(
    doc,
    'Added Orbital Radiation',
    'Surface dose is reduced by atmospheric attenuation.'
  );
  const landRow = createPulsarScalingRow(
    doc,
    'Hazard Land Lock',
    'Reserved share of initial land.'
  );
  const stormRow = createPulsarScalingRow(
    doc,
    'Storm Attrition',
    'Only during active storms; affects worker androids, electronics, and nanobots.'
  );
  const nanobotRow = createPulsarScalingRow(
    doc,
    'Nanobot Cap',
    'Uses max(Underground Expansion ratio, net pulsar mitigation).'
  );

  scalingGrid.appendChild(radiationRow.row);
  scalingGrid.appendChild(landRow.row);
  scalingGrid.appendChild(stormRow.row);
  scalingGrid.appendChild(nanobotRow.row);
  scalingSection.appendChild(scalingHeader);
  scalingSection.appendChild(scalingGrid);
  card.appendChild(scalingSection);

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

  const stormItem = doc.createElement('li');
  stormItem.className = 'hazard-effects__item';
  effectsList.appendChild(stormItem);

  const thrusterCostItem = doc.createElement('li');
  thrusterCostItem.className = 'hazard-effects__item';
  effectsList.appendChild(thrusterCostItem);

  const distanceScalingItem = doc.createElement('li');
  distanceScalingItem.className = 'hazard-effects__item';
  effectsList.appendChild(distanceScalingItem);

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
  pulsarHazardUICache.title = titleRow;
  pulsarHazardUICache.barSafe = safeFill;
  pulsarHazardUICache.barHazard = hazardFill;
  pulsarHazardUICache.barSafeLabel = safeLabel;
  pulsarHazardUICache.barHazardLabel = hazardLabel;
  pulsarHazardUICache.barDetails = barDetails;
  pulsarHazardUICache.viz = pulsarViz;
  pulsarHazardUICache.summaryStatusBody = summaryStatusBody;
  pulsarHazardUICache.summaryRadiationBody = summaryRadiationBody;
  pulsarHazardUICache.scalingRadiationValue = radiationRow.valueCell;
  pulsarHazardUICache.scalingLandValue = landRow.valueCell;
  pulsarHazardUICache.scalingStormValue = stormRow.valueCell;
  pulsarHazardUICache.scalingNanobotValue = nanobotRow.valueCell;
  pulsarHazardUICache.effectsItems = [disabledProjectsItem, stormItem, thrusterCostItem, distanceScalingItem];
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

  const hasPulsarHazard = !!pulsarParameters;
  const isActive = hasPulsarHazard && !cleared;
  card.style.display = hasPulsarHazard ? '' : 'none';
  card.classList.toggle('hazard-card--active', isActive);
  if (!hasPulsarHazard) {
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
  let distanceMultiplier = 1;
  if (hazardManager && hazardManager.pulsarHazard) {
    stormActive = hazardManager.pulsarHazard.isStormActive();
    stormRemaining = hazardManager.pulsarHazard.getStormRemainingSeconds();
    stormNext = hazardManager.pulsarHazard.getSecondsUntilNextStorm();
    artificialSkyCompletion = hazardManager.pulsarHazard.getArtificialSkyCompletionRatio(terraforming, pulsarParameters);
    hazardStrength = hazardManager.pulsarHazard.getHazardStrength(terraforming, pulsarParameters);
    distanceMultiplier = hazardManager.pulsarHazard.getDistanceFromSunMultiplier
      ? hazardManager.pulsarHazard.getDistanceFromSunMultiplier(terraforming)
      : 1;
  }
  artificialSkyCompletion = Math.max(0, Math.min(1, artificialSkyCompletion));
  distanceMultiplier = Math.max(0, Math.min(1, distanceMultiplier));
  hazardStrength = Math.max(0, Math.min(1, hazardStrength));
  const skyExposureMultiplier = 1 - artificialSkyCompletion;
  const mitigationPercent = (1 - hazardStrength) * 100;
  const hazardPercent = hazardStrength * 100;
  const effectiveOrbitalBoost = baseOrbitalBoost * hazardStrength;
  const stormAttritionPercent = PULSAR_BASE_STORM_ATTRITION_PERCENT * hazardStrength;
  const currentLandLockPercent = hazardPercent;
  const currentNanobotMultiplier = nanotechManager && nanotechManager.getPulsarNanobotCapMultiplier
    ? nanotechManager.getPulsarNanobotCapMultiplier()
    : 0;
  const undergroundCompletionRatio = getUndergroundCompletionRatio();
  const clearedByRogue = isPulsarClearedByRogue(terraforming);
  const skyProgress = getArtificialSkyProgress(artificialSkyCompletion, !clearedByRogue);

  if (!isActive) {
    if (pulsarHazardUICache.summaryStatusBody) {
      pulsarHazardUICache.summaryStatusBody.textContent =
        `${description}\nStatus: Cleared.\nPulsar effects are disabled on this world.`;
    }
    if (pulsarHazardUICache.viz) {
      pulsarHazardUICache.viz.classList.remove('pulsar-viz--storm');
    }
    if (pulsarHazardUICache.barSafe && pulsarHazardUICache.barHazard) {
      pulsarHazardUICache.barSafe.style.width = '100%';
      pulsarHazardUICache.barHazard.style.width = '0%';
      pulsarHazardUICache.barSafe.style.flexBasis = '100%';
      pulsarHazardUICache.barHazard.style.flexBasis = '0%';
    }
    if (pulsarHazardUICache.barSafeLabel) {
      pulsarHazardUICache.barSafeLabel.textContent = '100.0% Shielded';
    }
    if (pulsarHazardUICache.barHazardLabel) {
      pulsarHazardUICache.barHazardLabel.textContent = '';
    }
    if (pulsarHazardUICache.barDetails) {
      pulsarHazardUICache.barDetails.textContent =
        `Artificial Sky Segments: ${formatNumber(skyProgress.builtSegments, false, 2)} / ${formatNumber(skyProgress.maxSegments, false, 0)} | Hazard Intensity: 0.00%`;
    }
    if (pulsarHazardUICache.summaryRadiationBody) {
      pulsarHazardUICache.summaryRadiationBody.textContent = '+0.00 mSv/day orbital dose';
    }
    if (pulsarHazardUICache.scalingRadiationValue) {
      pulsarHazardUICache.scalingRadiationValue.textContent =
        `Current: +0.00 mSv/day (base ${formatNumber(baseOrbitalBoost, false, 2)} × x0.000)`;
    }
    if (pulsarHazardUICache.scalingLandValue) {
      pulsarHazardUICache.scalingLandValue.textContent = 'Current: 0.00%';
    }
    if (pulsarHazardUICache.scalingStormValue) {
      pulsarHazardUICache.scalingStormValue.textContent = 'Current: 0.00%/s';
    }
    if (pulsarHazardUICache.scalingNanobotValue) {
      pulsarHazardUICache.scalingNanobotValue.textContent =
        `Current Floor: x${formatNumber(currentNanobotMultiplier, false, 3)}\nUnderground ${formatNumber(undergroundCompletionRatio * 100, false, 2)}% | Net mitigation 100.00%`;
    }
    if (pulsarHazardUICache.effectsItems[0]) {
      pulsarHazardUICache.effectsItems[0].textContent = PULSAR_DISABLED_PROJECTS_TEXT;
    }
    if (pulsarHazardUICache.effectsItems[1]) {
      pulsarHazardUICache.effectsItems[1].textContent = PULSAR_STORM_PROJECT_TEXT;
    }
    if (pulsarHazardUICache.effectsItems[2]) {
      pulsarHazardUICache.effectsItems[2].textContent = PULSAR_THRUSTER_COST_TEXT;
    }
    if (pulsarHazardUICache.effectsItems[3]) {
      pulsarHazardUICache.effectsItems[3].textContent = PULSAR_DISTANCE_SCALING_TEXT;
    }
    return;
  }

  if (pulsarHazardUICache.summaryStatusBody) {
    const stormLine = stormActive
      ? `Electromagnetic storm active (${stormRemaining.toFixed(1)}s left).`
      : `Next electromagnetic storm in ${stormNext.toFixed(1)}s.`;
    const scalingLine = `Net multiplier: x${formatNumber(hazardStrength, false, 3)} (Sky x${formatNumber(skyExposureMultiplier, false, 3)} × Distance x${formatNumber(distanceMultiplier, false, 3)}).`;
    pulsarHazardUICache.summaryStatusBody.textContent = `${description}\n${stormLine}\n${scalingLine}`;
  }
  if (pulsarHazardUICache.viz) {
    pulsarHazardUICache.viz.classList.toggle('pulsar-viz--storm', stormActive);
  }

  if (pulsarHazardUICache.barSafe && pulsarHazardUICache.barHazard) {
    const safeWidthText = `${mitigationPercent}%`;
    const hazardWidthText = `${hazardPercent}%`;
    pulsarHazardUICache.barSafe.style.width = safeWidthText;
    pulsarHazardUICache.barHazard.style.width = hazardWidthText;
    pulsarHazardUICache.barSafe.style.flexBasis = safeWidthText;
    pulsarHazardUICache.barHazard.style.flexBasis = hazardWidthText;
  }
  if (pulsarHazardUICache.barSafeLabel) {
    pulsarHazardUICache.barSafeLabel.textContent = mitigationPercent > 10
      ? `${formatNumber(mitigationPercent, false, 1)}% Shielded`
      : '';
  }
  if (pulsarHazardUICache.barHazardLabel) {
    pulsarHazardUICache.barHazardLabel.textContent = hazardPercent > 10
      ? `${formatNumber(hazardPercent, false, 1)}% Exposed`
      : '';
  }
  if (pulsarHazardUICache.barDetails) {
    pulsarHazardUICache.barDetails.textContent =
      `Artificial Sky Segments: ${formatNumber(skyProgress.builtSegments, false, 2)} / ${formatNumber(skyProgress.maxSegments, false, 0)} | Hazard Intensity: ${formatNumber(hazardPercent, false, 2)}%`;
  }

  if (pulsarHazardUICache.summaryRadiationBody) {
    pulsarHazardUICache.summaryRadiationBody.textContent =
      `+${formatNumber(effectiveOrbitalBoost, false, 2)} mSv/day orbital dose`;
  }
  if (pulsarHazardUICache.scalingRadiationValue) {
    pulsarHazardUICache.scalingRadiationValue.textContent =
      `Current: +${formatNumber(effectiveOrbitalBoost, false, 2)} mSv/day (base ${formatNumber(baseOrbitalBoost, false, 2)} × x${formatNumber(hazardStrength, false, 3)})`;
  }
  if (pulsarHazardUICache.scalingLandValue) {
    pulsarHazardUICache.scalingLandValue.textContent =
      `Current: ${formatNumber(currentLandLockPercent, false, 2)}%`;
  }
  if (pulsarHazardUICache.scalingStormValue) {
    pulsarHazardUICache.scalingStormValue.textContent =
      `Current: ${formatNumber(stormAttritionPercent, false, 2)}%/s`;
  }
  if (pulsarHazardUICache.scalingNanobotValue) {
    pulsarHazardUICache.scalingNanobotValue.textContent =
      `Current Floor: x${formatNumber(currentNanobotMultiplier, false, 3)}\nUnderground ${formatNumber(undergroundCompletionRatio * 100, false, 2)}% | Net mitigation ${formatNumber((1 - hazardStrength) * 100, false, 2)}%`;
  }

  if (pulsarHazardUICache.effectsItems[0]) {
    pulsarHazardUICache.effectsItems[0].textContent = PULSAR_DISABLED_PROJECTS_TEXT;
  }
  if (pulsarHazardUICache.effectsItems[1]) {
    pulsarHazardUICache.effectsItems[1].textContent = PULSAR_STORM_PROJECT_TEXT;
  }
  if (pulsarHazardUICache.effectsItems[2]) {
    pulsarHazardUICache.effectsItems[2].textContent = PULSAR_THRUSTER_COST_TEXT;
  }
  if (pulsarHazardUICache.effectsItems[3]) {
    pulsarHazardUICache.effectsItems[3].textContent = PULSAR_DISTANCE_SCALING_TEXT;
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
