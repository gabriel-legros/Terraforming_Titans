const hazardousMachineryUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  summaryStatusText: null,
  summaryStatus: null,
  summaryDecay: null,
  summaryPenalties: null,
  summaryHackingText: null,
  summaryHackingCost: null,
  summaryHackingInfo: null,
  summaryHackingNote: null,
  summaryHacking: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
  maxCoverageTooltip: null,
  hackingTooltip: null,
  hackButton: null,
  hackMaxButton: null,
  hackDivideButton: null,
  hackTimesButton: null,
  statusFactorRows: {},
  factorsSection: null,
  factorGrid: null,
  temperatureHelpers: undefined,
};

function getHazardousMachineryUiText(path, fallback, vars) {
  try {
    return t(`ui.terraforming.hazardsUi.hazardousMachinery.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function getHazardousMachineryDocument() {
  if (hazardousMachineryUICache.doc !== undefined) {
    return hazardousMachineryUICache.doc;
  }

  try {
    hazardousMachineryUICache.doc = document;
  } catch (error) {
    hazardousMachineryUICache.doc = null;
  }

  return hazardousMachineryUICache.doc;
}

function getHazardousMachineryRoot() {
  if (hazardousMachineryUICache.rootResolved) {
    return hazardousMachineryUICache.root;
  }

  hazardousMachineryUICache.rootResolved = true;
  const doc = getHazardousMachineryDocument();
  hazardousMachineryUICache.root = doc ? doc.getElementById('hazard-terraforming') : null;
  return hazardousMachineryUICache.root;
}

function getHazardousMachineryManager() {
  try {
    return hazardManager;
  } catch (error) {
    return null;
  }
}

function getHazardousMachineryHazard() {
  const manager = getHazardousMachineryManager();
  return manager?.hazardousMachineryHazard || null;
}

function getHazardousMachineryParameters() {
  const manager = getHazardousMachineryManager();
  return manager?.parameters?.hazardousMachinery || null;
}

function getHazardousMachineryTerraforming() {
  try {
    return terraforming;
  } catch (error) {
    return null;
  }
}

function formatMachineryNumber(value, decimals = 2) {
  try {
    return formatNumber(value, false, decimals);
  } catch (error) {
    return Number(value || 0).toFixed(decimals);
  }
}

function getHazardousMachineryTemperatureHelpers() {
  if (hazardousMachineryUICache.temperatureHelpers !== undefined) {
    return hazardousMachineryUICache.temperatureHelpers;
  }

  let converter = null;
  let unitResolver = null;

  try {
    converter = toDisplayTemperature;
  } catch (error) {
    converter = null;
  }

  try {
    unitResolver = getTemperatureUnit;
  } catch (error) {
    unitResolver = null;
  }

  hazardousMachineryUICache.temperatureHelpers = { converter, unitResolver };
  return hazardousMachineryUICache.temperatureHelpers;
}

function formatHazardousMachineryTemperature(kelvin, decimals = 2) {
  const helpers = getHazardousMachineryTemperatureHelpers();
  const value = helpers.converter ? helpers.converter(kelvin) : kelvin;
  return formatMachineryNumber(value, decimals);
}

function getHazardousMachineryTemperatureUnit() {
  const helpers = getHazardousMachineryTemperatureHelpers();
  return helpers.unitResolver ? helpers.unitResolver() : 'K';
}

function getMachineryResourceLabel(path, fallback) {
  try {
    return t(path, null, fallback);
  } catch (error) {
    return fallback;
  }
}

function createMachineryInfoIcon(text) {
  const doc = getHazardousMachineryDocument();
  const icon = doc.createElement('span');
  icon.className = 'info-tooltip-icon';
  icon.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(icon, text);
  return icon;
}

function attachHazardousMachineryCardCollapse(card, title) {
  const doc = getHazardousMachineryDocument();
  if (!card || !title || !doc) {
    return;
  }

  const arrow = doc.createElement('span');
  arrow.className = 'hazard-card__collapse-arrow';
  arrow.innerHTML = '&#9660;';
  title.insertBefore(arrow, title.firstChild);

  const syncArrow = () => {
    arrow.innerHTML = card.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  };

  const toggle = () => {
    card.classList.toggle('collapsed');
    syncArrow();
  };

  arrow.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });
  title.addEventListener('click', toggle);
  syncArrow();
}

function ensureHazardousMachineryLayout() {
  if (hazardousMachineryUICache.card) {
    return hazardousMachineryUICache.card;
  }

  const root = getHazardousMachineryRoot();
  const doc = getHazardousMachineryDocument();
  if (!root || !doc) {
    return null;
  }

  const card = doc.createElement('div');
  card.className = 'hazard-card hazard-card--machinery';

  const title = doc.createElement('h3');
  title.className = 'hazard-card__title';
  title.textContent = getHazardousMachineryUiText('title', 'Hazardous Machinery');
  attachHazardousMachineryCardCollapse(card, title);
  card.appendChild(title);

  const summaryRow = doc.createElement('div');
  summaryRow.className = 'hazard-summary-row';

  const createSummary = (headerText, tooltipText) => {
    const box = doc.createElement('div');
    box.className = 'hazard-summary';
    const header = doc.createElement('div');
    header.className = 'hazard-summary__header';
    header.textContent = headerText;
    if (tooltipText) {
      const tooltip = createMachineryInfoIcon(tooltipText);
      header.appendChild(tooltip);
    }
    const body = doc.createElement('div');
    body.className = 'hazard-summary__body';
    box.appendChild(header);
    box.appendChild(body);
    summaryRow.appendChild(box);
    return { box, body };
  };

  const statusSummary = createSummary(
    getHazardousMachineryUiText('labels.status', 'Status')
  );
  hazardousMachineryUICache.summaryStatus = statusSummary.body;
  const statusText = doc.createElement('div');
  statusSummary.body.appendChild(statusText);
  hazardousMachineryUICache.summaryStatusText = statusText;

  hazardousMachineryUICache.summaryDecay = createSummary(
    getHazardousMachineryUiText('labels.decay', 'Decay and Growth')
  ).body;
  hazardousMachineryUICache.summaryPenalties = createSummary(
    getHazardousMachineryUiText('labels.penalties', 'Operational Impact')
  ).body;
  card.appendChild(summaryRow);

  const barWrapper = doc.createElement('div');
  barWrapper.className = 'hazard-bar-wrapper';

  const bar = doc.createElement('div');
  bar.className = 'hazard-bar';

  const safe = doc.createElement('div');
  safe.className = 'hazard-bar__segment hazard-bar__segment--safe';
  const safeLabel = doc.createElement('span');
  safeLabel.className = 'hazard-bar__label hazard-bar__label--safe';
  safe.appendChild(safeLabel);

  const hazard = doc.createElement('div');
  hazard.className = 'hazard-bar__segment hazard-bar__segment--hazard';
  const hazardLabel = doc.createElement('span');
  hazardLabel.className = 'hazard-bar__label hazard-bar__label--hazard';
  hazard.appendChild(hazardLabel);

  bar.appendChild(safe);
  bar.appendChild(hazard);
  barWrapper.appendChild(bar);

  const barDetails = doc.createElement('div');
  barDetails.className = 'hazard-bar__details';
  barWrapper.appendChild(barDetails);
  card.appendChild(barWrapper);

  const factorsSection = doc.createElement('div');
  factorsSection.className = 'hazard-factors';

  const factorsHeader = doc.createElement('div');
  factorsHeader.className = 'hazard-factors__header';
  const factorsHeaderLabel = doc.createElement('span');
  factorsHeaderLabel.className = 'hazard-factors__title';
  factorsHeaderLabel.textContent = getHazardousMachineryUiText('labels.modifiers', 'Machinery Modifiers');
  factorsHeader.appendChild(factorsHeaderLabel);
  factorsSection.appendChild(factorsHeader);

  const hackingBox = doc.createElement('div');
  hackingBox.className = 'hazard-summary hazard-summary--left hazard-machinery-hacking';
  const hackingHeader = doc.createElement('div');
  hackingHeader.className = 'hazard-summary__header';
  hackingHeader.textContent = getHazardousMachineryUiText('labels.hacking', 'Counter-Hacking');
  const hackingTooltip = createMachineryInfoIcon(
    getHazardousMachineryUiText('tooltips.hacking', 'Counter-hacking spends electronics to reclaim hostile machinery as functional androids. The action is instant, limited by electronics and available machinery, and automatically spends less if less machinery is available than the selected amount.')
  );
  hackingHeader.appendChild(hackingTooltip);
  const hackingBody = doc.createElement('div');
  hackingBody.className = 'hazard-summary__body';
  const hackingText = doc.createElement('div');
  hackingText.className = 'hazard-machinery-hacking__text';
  const hackingCost = doc.createElement('div');
  hackingCost.className = 'hazard-machinery-hacking__cost';
  const hackingInfo = doc.createElement('div');
  const hackingNote = doc.createElement('div');
  hackingText.appendChild(hackingCost);
  hackingText.appendChild(hackingInfo);
  hackingText.appendChild(hackingNote);
  hackingBody.appendChild(hackingText);
  hackingBox.appendChild(hackingHeader);
  hackingBox.appendChild(hackingBody);
  hazardousMachineryUICache.summaryHacking = hackingBody;
  hazardousMachineryUICache.summaryHackingText = hackingText;
  hazardousMachineryUICache.summaryHackingCost = hackingCost;
  hazardousMachineryUICache.summaryHackingInfo = hackingInfo;
  hazardousMachineryUICache.summaryHackingNote = hackingNote;

  const factorGrid = doc.createElement('div');
  factorGrid.className = 'hazard-factor-grid';
  const factorHeader = doc.createElement('div');
  factorHeader.className = 'hazard-factor-row hazard-factor-row--header';
  [
    getHazardousMachineryUiText('labels.factor', 'Factor'),
    getHazardousMachineryUiText('labels.currentValues', 'Current Values'),
    getHazardousMachineryUiText('labels.effect', 'Effect')
  ].forEach((label, index) => {
    const cell = doc.createElement('div');
    cell.className = index === 0
      ? 'hazard-factor-cell hazard-factor-cell--label'
      : index === 1
        ? 'hazard-factor-cell hazard-factor-cell--values'
        : 'hazard-factor-cell hazard-factor-cell--penalty';
    cell.textContent = label;
    factorHeader.appendChild(cell);
  });
  factorGrid.appendChild(factorHeader);

  const createFactorRow = (key, labelText) => {
    const row = doc.createElement('div');
    row.className = 'hazard-factor-row';

    const labelCell = doc.createElement('div');
    labelCell.className = 'hazard-factor-cell hazard-factor-cell--label';
    const label = doc.createElement('div');
    label.className = 'hazard-factor-label';
    label.textContent = labelText;
    labelCell.appendChild(label);

    const valueCell = doc.createElement('div');
    valueCell.className = 'hazard-factor-cell hazard-factor-cell--values';

    const effectCell = doc.createElement('div');
    effectCell.className = 'hazard-factor-cell hazard-factor-cell--penalty';

    row.appendChild(labelCell);
    row.appendChild(valueCell);
    row.appendChild(effectCell);
    factorGrid.appendChild(row);

    hazardousMachineryUICache.statusFactorRows[key] = { valueCell, effectCell };
  };

  createFactorRow('water', getMachineryResourceLabel('resources.surface.liquidWater.name', 'Water'));
  createFactorRow('temperature', getHazardousMachineryUiText('labels.temperature', 'Temperature'));
  createFactorRow('oxygen', getMachineryResourceLabel('resources.atmospheric.oxygen.name', 'Oxygen'));

  factorsSection.appendChild(factorGrid);
  card.appendChild(factorsSection);
  card.appendChild(hackingBox);

  const controls = doc.createElement('div');
  controls.className = 'hazard-machinery-controls';

  const maxButton = doc.createElement('button');
  maxButton.type = 'button';
  maxButton.className = 'hazard-machinery-controls__button';
  maxButton.textContent = t('ui.projects.common.max', null, 'Max');
  maxButton.addEventListener('click', () => {
    const hazardInstance = getHazardousMachineryHazard();
    const parameters = getHazardousMachineryParameters();
    const terraformingState = getHazardousMachineryTerraforming();
    if (!hazardInstance || !parameters || !terraformingState) {
      return;
    }
    const electronics = resources?.colony?.electronics;
    const machinery = resources?.surface?.hazardousMachinery;
    const maxByElectronics = Math.floor((electronics?.value || 0) / Math.max(1, parameters.electronicsToAndroidCost || 1000));
    const maxByMachinery = Math.floor(machinery?.value || 0);
    const amount = Math.max(0, Math.min(maxByElectronics, maxByMachinery));
    hazardInstance.performDangerousHack(terraformingState, parameters, amount);
    try {
      updateResourceUI(resources);
      updateResourceDisplay(resources, 0);
    } catch (error) {
      // UI may not be ready yet
    }
    updateHazardousMachineryUI(parameters);
  });
  controls.appendChild(maxButton);

  const divideButton = doc.createElement('button');
  divideButton.type = 'button';
  divideButton.className = 'hazard-machinery-controls__button';
  divideButton.textContent = t('ui.projects.common.divideTen', null, '/10');
  divideButton.addEventListener('click', () => {
    const hazardInstance = getHazardousMachineryHazard();
    if (!hazardInstance) {
      return;
    }
    hazardInstance.setHackBatchSize(Math.max(1, Math.floor((hazardInstance.hackBatchSize || 1) / 10)));
    updateHazardousMachineryUI(getHazardousMachineryParameters());
  });
  controls.appendChild(divideButton);

  const timesButton = doc.createElement('button');
  timesButton.type = 'button';
  timesButton.className = 'hazard-machinery-controls__button';
  timesButton.textContent = t('ui.projects.common.timesTen', null, 'x10');
  timesButton.addEventListener('click', () => {
    const hazardInstance = getHazardousMachineryHazard();
    if (!hazardInstance) {
      return;
    }
    hazardInstance.setHackBatchSize(Math.min(1e12, Math.max(1, hazardInstance.hackBatchSize || 1) * 10));
    updateHazardousMachineryUI(getHazardousMachineryParameters());
  });
  controls.appendChild(timesButton);

  const hackButton = doc.createElement('button');
  hackButton.type = 'button';
  hackButton.className = 'hazard-machinery-controls__button';
  hackButton.addEventListener('click', () => {
    const hazardInstance = getHazardousMachineryHazard();
    const parameters = getHazardousMachineryParameters();
    const terraformingState = getHazardousMachineryTerraforming();
    if (!hazardInstance || !parameters || !terraformingState) {
      return;
    }
    const batchSize = Math.max(1, hazardInstance.hackBatchSize || 1);
    hazardInstance.performDangerousHack(terraformingState, parameters, batchSize);
    try {
      updateResourceUI(resources);
      updateResourceDisplay(resources, 0);
    } catch (error) {
      // UI may not be ready yet
    }
    updateHazardousMachineryUI(parameters);
  });
  controls.appendChild(hackButton);

  hackingBody.appendChild(controls);
  root.appendChild(card);

  hazardousMachineryUICache.card = card;
  hazardousMachineryUICache.title = title;
  hazardousMachineryUICache.barSafe = safe;
  hazardousMachineryUICache.barHazard = hazard;
  hazardousMachineryUICache.barSafeLabel = safeLabel;
  hazardousMachineryUICache.barHazardLabel = hazardLabel;
  hazardousMachineryUICache.barDetails = barDetails;
  hazardousMachineryUICache.hackButton = hackButton;
  hazardousMachineryUICache.hackMaxButton = maxButton;
  hazardousMachineryUICache.hackDivideButton = divideButton;
  hazardousMachineryUICache.hackTimesButton = timesButton;
  hazardousMachineryUICache.factorsSection = factorsSection;
  hazardousMachineryUICache.factorGrid = factorGrid;
  return card;
}

function initializeHazardousMachineryUI() {
  ensureHazardousMachineryLayout();
}

function updateHazardousMachineryUI(parameters) {
  const card = ensureHazardousMachineryLayout();
  const manager = getHazardousMachineryManager();
  const hazardInstance = getHazardousMachineryHazard();
  const terraformingState = getHazardousMachineryTerraforming();
  if (!card || !hazardInstance || !terraformingState || !parameters) {
    if (card) {
      card.style.display = 'none';
    }
    return;
  }

  const status = hazardInstance.getCurrentPenaltyValues(terraformingState, parameters);
  const batchSize = Math.max(1, hazardInstance.hackBatchSize || 1);
  const electronics = resources?.colony?.electronics;
  const costPerHack = Math.max(1, parameters.electronicsToAndroidCost || 1000);
  const maxByElectronics = Math.floor((electronics?.value || 0) / costPerHack);
  const maxByMachinery = Math.floor(status.currentAmount || 0);
  const maxHackCount = Math.max(0, Math.min(maxByElectronics, maxByMachinery));
  const requestedCost = batchSize * costPerHack;
  const hasEnoughElectronicsForBatch = (electronics?.value || 0) >= requestedCost;

  card.style.display = '';

  hazardousMachineryUICache.summaryStatusText.textContent = [
    getHazardousMachineryUiText('labels.currentCoverage', 'Current Coverage: {value}%', {
      value: formatMachineryNumber(status.currentCoverageShare * 100, 2)
    }),
    getHazardousMachineryUiText('labels.maxCoverage', 'Max Coverage: {value}%', {
      value: formatMachineryNumber(status.maxCoverageShare * 100, 2)
    }),
    getHazardousMachineryUiText('labels.currentMachinery', 'Hazardous Machinery: {value} ton', {
      value: formatMachineryNumber(status.currentAmount, 2)
    })
  ].join('\n');

  const oxygenResource = resources?.atmospheric?.oxygen;
  const oxygenUnit = oxygenResource?.unit ? ` ${oxygenResource.unit}` : ' ton';
  const temperatureUnit = getHazardousMachineryTemperatureUnit();
  const temperatureThresholdK = (status.temperatureThresholdC || 0) + 273.15;
  hazardousMachineryUICache.statusFactorRows.water.valueCell.textContent = getHazardousMachineryUiText('labels.waterCoverageFactor', '{value}% coverage', {
    value: formatMachineryNumber(status.waterCoverage * 100, 2)
  });
  hazardousMachineryUICache.statusFactorRows.water.effectCell.textContent = getHazardousMachineryUiText('labels.waterEffect', 'Max Coverage {value}%', {
    value: formatMachineryNumber(status.maxCoverageShare * 100, 2)
  });
  hazardousMachineryUICache.statusFactorRows.temperature.valueCell.textContent = getHazardousMachineryUiText('labels.temperatureFactor', '{value}{unit} (threshold {threshold}{unit})', {
    value: formatHazardousMachineryTemperature(status.temperatureC + 273.15, 2),
    threshold: formatHazardousMachineryTemperature(temperatureThresholdK, 2),
    unit: temperatureUnit
  });
  hazardousMachineryUICache.statusFactorRows.temperature.effectCell.textContent = getHazardousMachineryUiText('labels.temperatureEffect', 'Heat Decay {value}/s', {
    value: formatMachineryNumber(status.temperatureDecayRatePerSecond, 2)
  });
  hazardousMachineryUICache.statusFactorRows.oxygen.valueCell.textContent = getHazardousMachineryUiText('labels.oxygenFactor', '{value}{unit}', {
    value: formatMachineryNumber(oxygenResource?.value || 0, 2),
    unit: oxygenUnit
  });
  hazardousMachineryUICache.statusFactorRows.oxygen.effectCell.textContent = getHazardousMachineryUiText('labels.oxygenEffect', 'Oxidation {value}/s', {
    value: formatMachineryNumber(status.oxygenDecayRatePerSecond, 2)
  });

  const decayLines = [];
  if (status.availableAndroids > 0 || status.androidDecayRatePerSecond > 0) {
    decayLines.push(getHazardousMachineryUiText('labels.availableAndroids', 'Available Androids: {value}', {
      value: formatMachineryNumber(status.availableAndroids, 2)
    }));
    decayLines.push(getHazardousMachineryUiText('labels.androidDecay', 'Android Decay: {value}/s', {
      value: formatMachineryNumber(status.androidDecayRatePerSecond, 2)
    }));
  }
  if (status.temperatureDecayRatePerSecond > 0) {
    decayLines.push(getHazardousMachineryUiText('labels.temperatureDecay', 'Heat Damage: {value}/s', {
      value: formatMachineryNumber(status.temperatureDecayRatePerSecond, 2)
    }));
  }
  if (status.oxygenDecayRatePerSecond > 0) {
    decayLines.push(getHazardousMachineryUiText('labels.oxygenDecay', 'Oxidation: {value}/s', {
      value: formatMachineryNumber(status.oxygenDecayRatePerSecond, 2)
    }));
  }
  if (status.crusaderDecayRatePerSecond > 0) {
    decayLines.push(getHazardousMachineryUiText('labels.crusaderDecay', 'Crusaders: {value}/s', {
      value: formatMachineryNumber(status.crusaderDecayRatePerSecond, 2)
    }));
  }
  hazardousMachineryUICache.summaryDecay.textContent = decayLines.length
    ? decayLines.join('\n')
    : getHazardousMachineryUiText('labels.noDecay', 'No active decay or growth.');

  hazardousMachineryUICache.summaryPenalties.textContent = [
    getHazardousMachineryUiText('labels.nanocolony', 'Nanocolony Growth: {value}', {
      value: `x${formatMachineryNumber(status.nanoColonyGrowthMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.research', 'Research: {value}', {
      value: `x${formatMachineryNumber(status.researchMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.electronicsMaintenance', 'Electronics Maintenance: {value}', {
      value: `x${formatMachineryNumber(status.electronicsMaintenanceMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.shipPenalty', 'Assigned Ships: +{value} workers each', {
      value: formatMachineryNumber(status.shipWorkersPerAssignedShip, 0)
    })
  ].join('\n');

  hazardousMachineryUICache.summaryHackingCost.textContent = getHazardousMachineryUiText('labels.convertCost', 'Electronics Cost: {value}', {
    value: formatMachineryNumber(requestedCost, 0)
  });
  hazardousMachineryUICache.summaryHackingCost.classList.toggle('hazard-machinery-hacking__cost--insufficient', !hasEnoughElectronicsForBatch);
  hazardousMachineryUICache.summaryHackingInfo.textContent = getHazardousMachineryUiText('labels.convertInfo', 'Each hack spends {cost} electronics to turn 1 hazardous machinery into 1 android instantly.', {
    cost: formatMachineryNumber(costPerHack, 0)
  });
  hazardousMachineryUICache.summaryHackingNote.textContent = getHazardousMachineryUiText('labels.convertAutoScale', 'If less machinery is available than the selected amount, electronics spending scales down automatically.');

  const safePercent = Math.max(0, (1 - status.hazardStrength) * 100);
  const hazardPercent = Math.max(0, status.hazardStrength * 100);
  hazardousMachineryUICache.barSafeLabel.textContent = getHazardousMachineryUiText('labels.barSafe', 'Clear {value}%', {
    value: formatMachineryNumber(safePercent, 1)
  });
  hazardousMachineryUICache.barHazardLabel.textContent = getHazardousMachineryUiText('labels.barHazard', 'Machinery {value}%', {
    value: formatMachineryNumber(hazardPercent, 1)
  });
  hazardousMachineryUICache.barSafe.style.width = `${safePercent}%`;
  hazardousMachineryUICache.barHazard.style.width = `${hazardPercent}%`;
  hazardousMachineryUICache.barSafe.style.flexBasis = `${safePercent}%`;
  hazardousMachineryUICache.barHazard.style.flexBasis = `${hazardPercent}%`;
  hazardousMachineryUICache.barDetails.textContent = getHazardousMachineryUiText('labels.barDetails', 'Hazardous Machinery: {current} / {max} ton', {
    current: formatMachineryNumber(status.currentAmount, 2),
    max: formatMachineryNumber(status.fullCoverageAmount, 2)
  });

  hazardousMachineryUICache.hackButton.textContent = getHazardousMachineryUiText('labels.convertAction', 'Hack +{value}', {
    value: formatMachineryNumber(batchSize, 0)
  });
  hazardousMachineryUICache.hackButton.disabled = maxHackCount <= 0;
  hazardousMachineryUICache.hackMaxButton.disabled = maxHackCount <= 0;
}

try {
  window.initializeHazardousMachineryUI = initializeHazardousMachineryUI;
  window.updateHazardousMachineryUI = updateHazardousMachineryUI;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = {
    initializeHazardousMachineryUI,
    updateHazardousMachineryUI
  };
} catch (error) {
  // Module system not available in browser
}
