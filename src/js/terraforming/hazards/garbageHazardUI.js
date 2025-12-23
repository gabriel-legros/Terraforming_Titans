const garbageHazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  summaryLeftBody: null,
  summaryCenterBody: null,
  summaryRightBody: null,
  barWrapper: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
  factorsSection: null,
  factorGrid: null,
  factorHeaderRow: null,
  factorRows: {}
};

const GARBAGE_PENALTY_LABELS = {
  sandHarvesterMultiplier: 'Sand Harvester',
  nanoColonyGrowthMultiplier: 'Nanocolony Growth',
  happiness: 'Happiness',
  oreScanningSpeedMultiplier: 'Ore Scanning',
  lifeGrowthMultiplier: 'Life Growth',
  androidAttrition: 'Android Attrition'
};

function getDocument() {
  if (garbageHazardUICache.doc !== undefined) {
    return garbageHazardUICache.doc;
  }

  try {
    garbageHazardUICache.doc = document;
  } catch (error) {
    garbageHazardUICache.doc = null;
  }

  return garbageHazardUICache.doc;
}

function getFormatter() {
  let candidate = null;
  try {
    candidate = formatNumber;
  } catch (error) {
    candidate = null;
  }

  return candidate && candidate.call ? candidate : null;
}

function formatNumeric(value, decimals = 2) {
  const formatter = getFormatter();
  if (formatter) {
    return formatter(value, false, decimals);
  }
  return Number(value || 0).toFixed(decimals);
}

function formatSignedPercentage(value) {
  if (!Number.isFinite(value) || !value) {
    return '0%';
  }
  const magnitude = formatNumeric(Math.abs(value), 2);
  return `${value > 0 ? '+' : '-'}${magnitude}%`;
}

function formatAttritionDelay(seconds) {
  const totalSeconds = Math.max(0, Math.ceil(seconds || 0));
  if (totalSeconds <= 0) {
    return '';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function getHazardRoot() {
  if (garbageHazardUICache.rootResolved) {
    return garbageHazardUICache.root;
  }

  garbageHazardUICache.rootResolved = true;
  const doc = getDocument();
  garbageHazardUICache.root = doc ? doc.getElementById('hazard-terraforming') : null;
  return garbageHazardUICache.root;
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

function createInfoIcon(text) {
  const doc = getDocument();
  const icon = doc.createElement('span');
  icon.className = 'info-tooltip-icon';
  icon.innerHTML = '&#9432;';
  icon.title = text;
  return icon;
}

function formatGarbageResourceName(key) {
  const manager = getHazardManager();
  if (manager && manager.formatGarbageResourceName) {
    return manager.formatGarbageResourceName(key);
  }

  const withSpaces = `${key}`.replace(/([A-Z])/g, ' $1');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function computeGarbagePenaltyValues(penalties, ratio) {
  const config = penalties || {};
  const values = {};

  if (config.sandHarvesterMultiplier !== undefined) {
    const minMultiplier = config.sandHarvesterMultiplier ?? 0.1;
    values.sandHarvesterMultiplier = 1 - ratio * (1 - minMultiplier);
  }

  if (config.nanoColonyGrowthMultiplier !== undefined) {
    const minMultiplier = config.nanoColonyGrowthMultiplier ?? 0.1;
    values.nanoColonyGrowthMultiplier = 1 - ratio * (1 - minMultiplier);
  }

  if (config.happiness !== undefined) {
    const maxPenalty = Math.abs(config.happiness ?? 0.1);
    values.happinessPenalty = ratio * maxPenalty;
  }

  if (config.oreScanningSpeedMultiplier !== undefined) {
    const minMultiplier = config.oreScanningSpeedMultiplier ?? 0.1;
    values.oreScanningSpeedMultiplier = 1 - ratio * (1 - minMultiplier);
  }

  if (config.lifeGrowthMultiplier !== undefined) {
    const minMultiplier = config.lifeGrowthMultiplier ?? 0.1;
    values.lifeGrowthMultiplier = 1 - ratio * (1 - minMultiplier);
  }

  if (config.androidAttrition !== undefined) {
    const attritionRate = config.androidAttrition ?? 0.001;
    values.androidAttrition = ratio * attritionRate;
  }

  return values;
}

function buildGarbagePenaltyLines(penaltyValues, attritionDelaySeconds = 0) {
  const lines = [];

  if (penaltyValues.sandHarvesterMultiplier !== undefined) {
    const delta = (penaltyValues.sandHarvesterMultiplier - 1) * 100;
    if (delta) {
      lines.push(`${GARBAGE_PENALTY_LABELS.sandHarvesterMultiplier}: ${formatSignedPercentage(delta)}`);
    }
  }

  if (penaltyValues.nanoColonyGrowthMultiplier !== undefined) {
    const delta = (penaltyValues.nanoColonyGrowthMultiplier - 1) * 100;
    if (delta) {
      lines.push(`${GARBAGE_PENALTY_LABELS.nanoColonyGrowthMultiplier}: ${formatSignedPercentage(delta)}`);
    }
  }

  if (penaltyValues.happinessPenalty !== undefined) {
    const delta = -penaltyValues.happinessPenalty * 100;
    if (delta) {
      lines.push(`${GARBAGE_PENALTY_LABELS.happiness}: ${formatSignedPercentage(delta)}`);
    }
  }

  if (penaltyValues.oreScanningSpeedMultiplier !== undefined) {
    const delta = (penaltyValues.oreScanningSpeedMultiplier - 1) * 100;
    if (delta) {
      lines.push(`${GARBAGE_PENALTY_LABELS.oreScanningSpeedMultiplier}: ${formatSignedPercentage(delta)}`);
    }
  }

  if (penaltyValues.lifeGrowthMultiplier !== undefined) {
    const delta = (penaltyValues.lifeGrowthMultiplier - 1) * 100;
    if (delta) {
      lines.push(`${GARBAGE_PENALTY_LABELS.lifeGrowthMultiplier}: ${formatSignedPercentage(delta)}`);
    }
  }

  if (penaltyValues.androidAttrition !== undefined) {
    const delta = -penaltyValues.androidAttrition * 100;
    if (delta) {
      const delayText = formatAttritionDelay(attritionDelaySeconds);
      const suffix = delayText ? ` (starts in ${delayText})` : '';
      lines.push(`${GARBAGE_PENALTY_LABELS.androidAttrition}: ${formatSignedPercentage(delta)}/s${suffix}`);
    }
  }

  if (!lines.length) {
    lines.push('No active penalties');
  }

  return lines;
}

function computeGarbageTotals(garbageParameters, resourcesState) {
  const surfaceResources = garbageParameters && garbageParameters.surfaceResources ? garbageParameters.surfaceResources : {};
  const penalties = garbageParameters && garbageParameters.penalties ? garbageParameters.penalties : {};
  const manager = getHazardManager();
  const clearedCategories = manager && manager.getGarbageClearedCategories ? manager.getGarbageClearedCategories() : null;
  const entries = [];
  let totalCurrent = 0;
  let totalInitial = 0;

  Object.keys(surfaceResources).forEach((resourceKey) => {
    const resource = resourcesState && resourcesState.surface ? resourcesState.surface[resourceKey] : null;
    const rawCurrentAmount = resource && resource.value ? resource.value : 0;
    const initialAmount = resource && resource.initialValue ? resource.initialValue : 0;
    const isCleared = clearedCategories && clearedCategories[resourceKey];
    const currentAmount = isCleared ? 0 : rawCurrentAmount;
    const ratio = initialAmount > 0 ? Math.min(1, Math.max(0, currentAmount / initialAmount)) : 0;
    const penaltyConfig = penalties[resourceKey];
    const penaltyValues = computeGarbagePenaltyValues(penaltyConfig, ratio);

    entries.push({
      key: resourceKey,
      label: formatGarbageResourceName(resourceKey),
      currentAmount,
      initialAmount,
      ratio,
      penaltyConfig,
      penaltyValues
    });

    totalCurrent += currentAmount;
    totalInitial += initialAmount;
  });

  const totalRatio = totalInitial > 0 ? Math.min(1, Math.max(0, totalCurrent / totalInitial)) : 0;
  const penaltyTotals = {
    sandHarvesterMultiplier: 1,
    nanoColonyGrowthMultiplier: 1,
    oreScanningSpeedMultiplier: 1,
    lifeGrowthMultiplier: 1,
    happinessPenalty: 0,
    androidAttrition: 0
  };

  entries.forEach((entry) => {
    const values = entry.penaltyValues || {};
    if (values.sandHarvesterMultiplier !== undefined) {
      penaltyTotals.sandHarvesterMultiplier *= values.sandHarvesterMultiplier;
    }
    if (values.nanoColonyGrowthMultiplier !== undefined) {
      penaltyTotals.nanoColonyGrowthMultiplier *= values.nanoColonyGrowthMultiplier;
    }
    if (values.oreScanningSpeedMultiplier !== undefined) {
      penaltyTotals.oreScanningSpeedMultiplier *= values.oreScanningSpeedMultiplier;
    }
    if (values.lifeGrowthMultiplier !== undefined) {
      penaltyTotals.lifeGrowthMultiplier *= values.lifeGrowthMultiplier;
    }
    if (values.happinessPenalty !== undefined) {
      penaltyTotals.happinessPenalty += values.happinessPenalty;
    }
    if (values.androidAttrition !== undefined) {
      penaltyTotals.androidAttrition += values.androidAttrition;
    }
  });

  return {
    entries,
    totalCurrent,
    totalInitial,
    totalRatio,
    penaltyTotals
  };
}

function ensureGarbageHeaderRow() {
  if (garbageHazardUICache.factorHeaderRow) {
    return;
  }

  const doc = getDocument();
  const headerRow = doc.createElement('div');
  headerRow.className = 'hazard-factor-row hazard-factor-row--header';

  const typeHead = doc.createElement('div');
  typeHead.className = 'hazard-factor-cell hazard-factor-cell--label';
  typeHead.textContent = 'Garbage Type';

  const amountHead = doc.createElement('div');
  amountHead.className = 'hazard-factor-cell hazard-factor-cell--values';
  amountHead.textContent = 'Remaining';

  const impactHead = doc.createElement('div');
  impactHead.className = 'hazard-factor-cell hazard-factor-cell--penalty';
  impactHead.textContent = 'Impact';

  headerRow.appendChild(typeHead);
  headerRow.appendChild(amountHead);
  headerRow.appendChild(impactHead);

  garbageHazardUICache.factorGrid.appendChild(headerRow);
  garbageHazardUICache.factorHeaderRow = headerRow;
}

function ensureGarbageRow(key) {
  const cached = garbageHazardUICache.factorRows[key];
  if (cached) {
    return cached;
  }

  const doc = getDocument();
  const row = doc.createElement('div');
  row.className = 'hazard-factor-row';

  const labelCell = doc.createElement('div');
  labelCell.className = 'hazard-factor-cell hazard-factor-cell--label';

  const labelTitle = doc.createElement('div');
  labelTitle.className = 'hazard-factor-label';

  const labelInfo = doc.createElement('div');
  labelInfo.className = 'hazard-factor-info';

  labelCell.appendChild(labelTitle);
  labelCell.appendChild(labelInfo);

  const valueCell = doc.createElement('div');
  valueCell.className = 'hazard-factor-cell hazard-factor-cell--values';

  const penaltyCell = doc.createElement('div');
  penaltyCell.className = 'hazard-factor-cell hazard-factor-cell--penalty';

  row.appendChild(labelCell);
  row.appendChild(valueCell);
  row.appendChild(penaltyCell);

  const record = {
    row,
    labelTitle,
    labelInfo,
    valueCell,
    penaltyCell
  };

  garbageHazardUICache.factorRows[key] = record;
  return record;
}

function clearUnusedGarbageRows(activeKeys) {
  const keys = Object.keys(garbageHazardUICache.factorRows);
  keys.forEach((key) => {
    if (activeKeys[key]) {
      return;
    }
    const entry = garbageHazardUICache.factorRows[key];
    if (entry && entry.row && entry.row.parentNode) {
      entry.row.parentNode.removeChild(entry.row);
    }
    delete garbageHazardUICache.factorRows[key];
  });
}

function updateGarbageSummary(totals) {
  const totalCurrent = totals.totalCurrent || 0;
  const totalInitial = totals.totalInitial || 0;
  const clearedAmount = totalInitial > 0 ? Math.max(0, totalInitial - totalCurrent) : 0;
  const clearedPercent = totalInitial > 0 ? (1 - totals.totalRatio) * 100 : 0;

  const statusLines = totalInitial > 0
    ? [
        `Remaining: ${formatNumeric(totalCurrent, 2)} / ${formatNumeric(totalInitial, 2)} ton`,
        `Cleared: ${formatNumeric(clearedAmount, 2)} ton (${formatNumeric(clearedPercent, 2)}%)`
      ]
    : ['No garbage tracked yet.'];
  const statusText = statusLines.join('\n');

  if (garbageHazardUICache.summaryLeftBody && garbageHazardUICache.summaryLeftBody.textContent !== statusText) {
    garbageHazardUICache.summaryLeftBody.textContent = statusText;
  }

  const mixLines = totals.entries && totals.entries.length
    ? totals.entries
      .slice()
      .sort((a, b) => b.currentAmount - a.currentAmount)
      .map((entry) => {
        const share = totalCurrent > 0 ? (entry.currentAmount / totalCurrent) * 100 : 0;
        return `${entry.label}: ${formatNumeric(share, 2)}% (${formatNumeric(entry.currentAmount, 2)} ton)`;
      })
    : ['All waste cleared.'];
  const mixText = mixLines.join('\n');

  if (garbageHazardUICache.summaryCenterBody && garbageHazardUICache.summaryCenterBody.textContent !== mixText) {
    garbageHazardUICache.summaryCenterBody.textContent = mixText;
  }

  const impactLines = buildGarbagePenaltyLines(totals.penaltyTotals || {}, totals.attritionDelaySeconds || 0);
  const impactText = impactLines.join('\n');

  if (garbageHazardUICache.summaryRightBody && garbageHazardUICache.summaryRightBody.textContent !== impactText) {
    garbageHazardUICache.summaryRightBody.textContent = impactText;
  }
}

function updateGarbageBar(totals) {
  if (!garbageHazardUICache.barSafe || !garbageHazardUICache.barHazard) {
    return;
  }

  const ratio = totals.totalRatio;
  const safePercent = (1 - ratio) * 100;
  const hazardPercent = ratio * 100;

  garbageHazardUICache.barSafe.style.width = `${safePercent}%`;
  garbageHazardUICache.barHazard.style.width = `${hazardPercent}%`;

  if (garbageHazardUICache.barSafeLabel) {
    garbageHazardUICache.barSafeLabel.textContent = safePercent > 10 ? `${formatNumeric(safePercent, 0)}% Cleared` : '';
  }

  if (garbageHazardUICache.barHazardLabel) {
    garbageHazardUICache.barHazardLabel.textContent = hazardPercent > 10 ? `${formatNumeric(hazardPercent, 0)}% Remaining` : '';
  }

}

function updateGarbageFactorGrid(entries, attritionDelaySeconds = 0) {
  ensureGarbageHeaderRow();
  const activeKeys = {};

  entries.forEach((entry) => {
    const record = ensureGarbageRow(entry.key);
    activeKeys[entry.key] = true;

    const desiredLabel = entry.label;
    const currentLabel = record.labelTitle.dataset ? record.labelTitle.dataset.label : '';

    if (desiredLabel !== currentLabel) {
      record.labelTitle.textContent = desiredLabel;
      if (record.labelTitle.dataset) {
        record.labelTitle.dataset.label = desiredLabel;
      }
    }

    const infoText = entry.initialAmount > 0
      ? `Initial Stockpile: ${formatNumeric(entry.initialAmount, 2)} ton`
      : 'Initial Stockpile: 0 ton';
    if (record.labelInfo.textContent !== infoText) {
      record.labelInfo.textContent = infoText;
    }

    const remainingText = entry.initialAmount > 0
      ? `${formatNumeric(entry.currentAmount, 2)} / ${formatNumeric(entry.initialAmount, 2)} ton`
      : `${formatNumeric(entry.currentAmount, 2)} ton`;
    if (record.valueCell && record.valueCell.textContent !== remainingText) {
      record.valueCell.textContent = remainingText;
    }

    const penaltyLines = buildGarbagePenaltyLines(entry.penaltyValues || {}, attritionDelaySeconds);
    const penaltyText = penaltyLines.join('\n');
    if (record.penaltyCell && record.penaltyCell.textContent !== penaltyText) {
      record.penaltyCell.textContent = penaltyText;
    }

    if (!record.row.parentNode && garbageHazardUICache.factorGrid) {
      garbageHazardUICache.factorGrid.appendChild(record.row);
    }
  });

  clearUnusedGarbageRows(activeKeys);
}

function ensureGarbageLayout() {
  if (garbageHazardUICache.card) {
    return;
  }

  const root = getHazardRoot();
  if (!root) {
    return;
  }

  const doc = getDocument();
  const card = doc.createElement('div');
  card.className = 'hazard-card hazard-card--garbage';

  const title = doc.createElement('h3');
  title.className = 'hazard-card__title';
  title.textContent = 'Garbage Hazard';
  card.appendChild(title);

  const summaryRow = doc.createElement('div');
  summaryRow.className = 'hazard-summary-row';

  const summaryLeft = doc.createElement('div');
  summaryLeft.className = 'hazard-summary hazard-summary--left';
  const summaryLeftHeader = doc.createElement('div');
  summaryLeftHeader.className = 'hazard-summary__header';
  summaryLeftHeader.textContent = 'Cleanup Status';
  summaryLeftHeader.appendChild(createInfoIcon('The hazard permanently clears once every garbage stream reaches 0 at the same time.'));
  const summaryLeftBody = doc.createElement('div');
  summaryLeftBody.className = 'hazard-summary__body';
  summaryLeft.appendChild(summaryLeftHeader);
  summaryLeft.appendChild(summaryLeftBody);

  const summaryCenter = doc.createElement('div');
  summaryCenter.className = 'hazard-summary hazard-summary--growth';
  const summaryCenterHeader = doc.createElement('div');
  summaryCenterHeader.className = 'hazard-summary__header';
  summaryCenterHeader.textContent = 'Resource Mix';
  summaryCenterHeader.appendChild(createInfoIcon('Share of the remaining garbage stockpile by stream.'));
  const summaryCenterBody = doc.createElement('div');
  summaryCenterBody.className = 'hazard-summary__body';
  summaryCenter.appendChild(summaryCenterHeader);
  summaryCenter.appendChild(summaryCenterBody);

  const summaryRight = doc.createElement('div');
  summaryRight.className = 'hazard-summary hazard-summary--right';
  const summaryRightHeader = doc.createElement('div');
  summaryRightHeader.className = 'hazard-summary__header';
  summaryRightHeader.textContent = 'Operational Impact';
  summaryRightHeader.appendChild(createInfoIcon('Penalties scale with remaining waste and fade as cleanup progresses.  They do not return once every garbage stream reaches 0 at the same time.'));
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

  barWrapper.appendChild(bar);
  card.appendChild(barWrapper);

  const factorsSection = doc.createElement('div');
  factorsSection.className = 'hazard-factors hazard-factors--garbage';

  const factorsHeader = doc.createElement('div');
  factorsHeader.className = 'hazard-factors__header';

  const factorsHeaderLabel = doc.createElement('span');
  factorsHeaderLabel.className = 'hazard-factors__title';
  factorsHeaderLabel.textContent = 'Cleanup Priorities';
  factorsHeader.appendChild(factorsHeaderLabel);

  const factorGrid = doc.createElement('div');
  factorGrid.className = 'hazard-factor-grid hazard-garbage-grid';

  factorsSection.appendChild(factorsHeader);
  factorsSection.appendChild(factorGrid);
  card.appendChild(factorsSection);

  root.appendChild(card);

  garbageHazardUICache.card = card;
  garbageHazardUICache.title = title;
  garbageHazardUICache.summaryLeftBody = summaryLeftBody;
  garbageHazardUICache.summaryCenterBody = summaryCenterBody;
  garbageHazardUICache.summaryRightBody = summaryRightBody;
  garbageHazardUICache.barWrapper = barWrapper;
  garbageHazardUICache.barSafe = safeFill;
  garbageHazardUICache.barHazard = hazardFill;
  garbageHazardUICache.barSafeLabel = safeLabel;
  garbageHazardUICache.barHazardLabel = hazardLabel;
  garbageHazardUICache.factorsSection = factorsSection;
  garbageHazardUICache.factorGrid = factorGrid;
}

function initializeGarbageHazardUI() {
  ensureGarbageLayout();
}

function updateGarbageHazardUI(garbageParameters) {
  ensureGarbageLayout();
  if (!garbageHazardUICache.card) {
    return;
  }

  garbageHazardUICache.card.style.display = garbageParameters ? '' : 'none';
  if (!garbageParameters) {
    return;
  }

  const manager = getHazardManager();
  const attritionDelaySeconds = manager && manager.getGarbageAndroidAttritionDelaySeconds
    ? manager.getGarbageAndroidAttritionDelaySeconds()
    : 0;
  const resourcesState = getResources();
  const totals = computeGarbageTotals(garbageParameters, resourcesState);
  totals.attritionDelaySeconds = attritionDelaySeconds;
  updateGarbageSummary(totals);
  updateGarbageBar(totals);
  updateGarbageFactorGrid(totals.entries || [], attritionDelaySeconds);
}

try {
  window.initializeGarbageHazardUI = initializeGarbageHazardUI;
  window.updateGarbageHazardUI = updateGarbageHazardUI;
} catch (error) {
  // Window not available (tests)
}

try {
  module.exports = {
    initializeGarbageHazardUI,
    updateGarbageHazardUI
  };
} catch (error) {
  // Module system not available in browser
}
