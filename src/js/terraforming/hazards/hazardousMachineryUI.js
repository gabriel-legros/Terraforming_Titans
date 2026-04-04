const hazardousMachineryUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  titleStatus: null,
  summaryStatusText: null,
  summaryStatus: null,
  summaryDecay: null,
  summaryPenalties: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
  maxCoverageTooltip: null,
  factorRows: {},
  factorHeaderRow: null,
  factorsSection: null,
  factorSummaryList: null,
  baseGrowthValue: null,
  totalPenaltyValue: null,
  factorGrid: null,
};

function getHazardousMachineryUiText(path, fallback, vars) {
  try {
    return t(`ui.terraforming.hazardsUi.hazardousMachinery.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function getHazardousMachineryStatusText(isCleared) {
  return t(
    `ui.terraforming.hazardsUi.statusLabels.${isCleared ? 'cleared' : 'active'}`,
    null,
    isCleared ? 'Cleared' : 'Active'
  );
}

function setHazardousMachineryTitleStatus(isCleared) {
  if (!hazardousMachineryUICache.titleStatus) {
    return;
  }
  hazardousMachineryUICache.titleStatus.textContent = ` (${getHazardousMachineryStatusText(isCleared)})`;
  hazardousMachineryUICache.titleStatus.className = `hazard-card__status hazard-card__status--${isCleared ? 'cleared' : 'active'}`;
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

function formatMachineryPercent(value, decimals = 2) {
  return `${formatMachineryNumber((value || 0) * 100, decimals)}%`;
}

function formatSignedMachineryPercent(value, decimals = 2) {
  const numeric = Number.isFinite(value) ? value : 0;
  if (!numeric) {
    return '0%';
  }
  return `${numeric > 0 ? '+' : '-'}${formatMachineryNumber(Math.abs(numeric), decimals)}%`;
}

function formatMachinerySeverityValue(value) {
  const numeric = Number.isFinite(value) ? Math.abs(value) : 0;
  if (!numeric) {
    return '0';
  }
  if (numeric < 0.001 || numeric >= 1000) {
    return numeric.toExponential(2);
  }
  return formatMachineryNumber(numeric, numeric < 0.01 ? 4 : 2);
}

function formatHazardousMachineryRange(entry, fallbackUnit = '') {
  if (!entry) {
    return getHazardousMachineryUiText('labels.unbounded', 'Unbounded');
  }

  const unit = entry.unit || fallbackUnit;
  const hasMin = Number.isFinite(entry.min);
  const hasMax = Number.isFinite(entry.max);
  const minText = formatMachineryNumber(entry.min, 2);
  const maxText = formatMachineryNumber(entry.max, 2);

  if (hasMin && hasMax) {
    return getHazardousMachineryUiText('labels.range', 'Range {min}-{max} {unit}', {
      min: minText,
      max: maxText,
      unit
    });
  }

  if (hasMin) {
    return getHazardousMachineryUiText('labels.minimum', 'Min {value} {unit}', {
      value: minText,
      unit
    });
  }

  if (hasMax) {
    return getHazardousMachineryUiText('labels.maximum', 'Max {value} {unit}', {
      value: maxText,
      unit
    });
  }

  return getHazardousMachineryUiText('labels.unbounded', 'Unbounded');
}

function formatHazardousMachinerySeverity(entry) {
  if (!entry) {
    return '';
  }

  const details = [];

  if (Number.isFinite(entry.severityBelow)) {
    details.push(getHazardousMachineryUiText('labels.severityBelow', 'Severity Below x{value}', {
      value: formatMachinerySeverityValue(entry.severityBelow)
    }));
  }

  if (Number.isFinite(entry.severityHigh)) {
    details.push(getHazardousMachineryUiText('labels.severityAbove', 'Severity Above x{value}', {
      value: formatMachinerySeverityValue(entry.severityHigh)
    }));
  }

  if (!details.length && Number.isFinite(entry.severity)) {
    details.push(getHazardousMachineryUiText('labels.severity', 'Severity x{value}', {
      value: formatMachinerySeverityValue(entry.severity)
    }));
  }

  return details.join(' | ');
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

function ensureMachineryAttachedInfoTooltip(iconElement, cachedTooltip, text) {
  if (!iconElement) {
    return null;
  }

  iconElement.removeAttribute('title');
  const existing = cachedTooltip || iconElement.querySelector('.resource-tooltip.dynamic-tooltip');
  if (!existing) {
    return attachDynamicInfoTooltip(iconElement, text);
  }

  if (existing.textContent !== text) {
    existing.textContent = text;
  }
  if (existing.style && existing.style.whiteSpace !== 'pre-line') {
    existing.style.whiteSpace = 'pre-line';
  }
  return existing;
}

function setMachinerySummaryLines(container, lines) {
  if (!container) {
    return;
  }

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const doc = getHazardousMachineryDocument();
  if (!doc || !lines.length) {
    return;
  }

  lines.forEach((line) => {
    const row = doc.createElement('div');
    row.className = 'hazard-summary__line';

    const text = typeof line === 'string' ? line : line.text;
    row.textContent = text || '';

    if (line && line.tooltip) {
      row.appendChild(doc.createTextNode(' '));
      row.appendChild(createMachineryInfoIcon(line.tooltip));
    }

    container.appendChild(row);
  });
}

function ensureMachineryHeaderRow() {
  if (hazardousMachineryUICache.factorHeaderRow) {
    return;
  }

  const doc = getHazardousMachineryDocument();
  const headerRow = doc.createElement('div');
  headerRow.className = 'hazard-factor-row hazard-factor-row--header';

  const factorHead = doc.createElement('div');
  factorHead.className = 'hazard-factor-cell hazard-factor-cell--label';
  factorHead.textContent = getHazardousMachineryUiText('labels.factor', 'Factor');

  const valueHead = doc.createElement('div');
  valueHead.className = 'hazard-factor-cell hazard-factor-cell--values';
  valueHead.textContent = getHazardousMachineryUiText('labels.currentValues', 'Current Values');

  const effectHead = doc.createElement('div');
  effectHead.className = 'hazard-factor-cell hazard-factor-cell--penalty';
  effectHead.textContent = getHazardousMachineryUiText('labels.effect', 'Effect');

  headerRow.appendChild(factorHead);
  headerRow.appendChild(valueHead);
  headerRow.appendChild(effectHead);
  hazardousMachineryUICache.factorGrid.appendChild(headerRow);
  hazardousMachineryUICache.factorHeaderRow = headerRow;
}

function ensureMachineryFactorRow(key) {
  const cached = hazardousMachineryUICache.factorRows[key];
  if (cached) {
    return cached;
  }

  const doc = getHazardousMachineryDocument();
  const row = doc.createElement('div');
  row.className = 'hazard-factor-row';

  const labelCell = doc.createElement('div');
  labelCell.className = 'hazard-factor-cell hazard-factor-cell--label';

  const labelTitle = doc.createElement('div');
  labelTitle.className = 'hazard-factor-label';

  const labelText = doc.createElement('span');
  labelText.className = 'hazard-factor-label__text';
  labelTitle.appendChild(labelText);

  const labelInfo = doc.createElement('div');
  labelInfo.className = 'hazard-factor-info';

  labelCell.appendChild(labelTitle);
  labelCell.appendChild(labelInfo);

  const valueCell = doc.createElement('div');
  valueCell.className = 'hazard-factor-cell hazard-factor-cell--values';

  const effectCell = doc.createElement('div');
  effectCell.className = 'hazard-factor-cell hazard-factor-cell--penalty';

  row.appendChild(labelCell);
  row.appendChild(valueCell);
  row.appendChild(effectCell);

  const record = {
    row,
    labelTitle,
    labelText,
    labelInfo,
    valueCell,
    effectCell,
    labelIcon: null,
    labelTooltip: null
  };

  hazardousMachineryUICache.factorRows[key] = record;
  return record;
}

function clearUnusedMachineryFactorRows(activeKeys) {
  Object.keys(hazardousMachineryUICache.factorRows).forEach((key) => {
    const record = hazardousMachineryUICache.factorRows[key];
    if (!record) {
      return;
    }

    if (activeKeys[key]) {
      if (!record.row.parentNode) {
        hazardousMachineryUICache.factorGrid.appendChild(record.row);
      }
      return;
    }

    if (record.row.parentNode) {
      record.row.parentNode.removeChild(record.row);
    }
  });
}

function renderMachineryFactorRows(factors) {
  if (!hazardousMachineryUICache.factorGrid) {
    return;
  }

  ensureMachineryHeaderRow();
  const activeKeys = {};

  factors.forEach((factor) => {
    const record = ensureMachineryFactorRow(factor.key);
    activeKeys[factor.key] = true;

    const desiredLabel = factor.label || '';
    const desiredTooltip = factor.tooltip || '';
    const currentLabel = record.labelTitle.dataset ? record.labelTitle.dataset.label || '' : '';
    const currentTooltip = record.labelTitle.dataset ? record.labelTitle.dataset.tooltip || '' : '';

    if (desiredLabel !== currentLabel || desiredTooltip !== currentTooltip) {
      record.labelText.textContent = desiredLabel;
      if (record.labelTitle.dataset) {
        record.labelTitle.dataset.label = desiredLabel;
        record.labelTitle.dataset.tooltip = desiredTooltip;
      }
    }

    if (desiredTooltip) {
      if (!record.labelIcon) {
        record.labelIcon = createMachineryInfoIcon(desiredTooltip);
        record.labelTitle.appendChild(record.labelIcon);
      }
      record.labelTooltip = ensureMachineryAttachedInfoTooltip(record.labelIcon, record.labelTooltip, desiredTooltip);
    } else if (record.labelIcon) {
      record.labelIcon.remove();
      record.labelIcon = null;
      record.labelTooltip = null;
    }

    const infoText = factor.info || '';
    if (record.labelInfo.textContent !== infoText) {
      record.labelInfo.textContent = infoText;
    }

    const valueText = (factor.values || []).join('\n');
    if (record.valueCell.textContent !== valueText) {
      record.valueCell.textContent = valueText;
    }

    const effectText = (factor.effects || []).join('\n');
    if (record.effectCell.textContent !== effectText) {
      record.effectCell.textContent = effectText;
    }

    if (!record.row.parentNode) {
      hazardousMachineryUICache.factorGrid.appendChild(record.row);
    }
  });

  clearUnusedMachineryFactorRows(activeKeys);
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
  const titleLabel = doc.createElement('span');
  titleLabel.textContent = getHazardousMachineryUiText('title', 'Hazardous Machinery');
  const titleStatus = doc.createElement('span');
  titleStatus.className = 'hazard-card__status hazard-card__status--cleared';
  titleStatus.textContent = ` (${getHazardousMachineryStatusText(true)})`;
  title.appendChild(titleLabel);
  title.appendChild(titleStatus);
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
  factorsHeaderLabel.textContent = getHazardousMachineryUiText('labels.modifiers', 'Growth Modifiers');
  factorsHeader.appendChild(factorsHeaderLabel);
  factorsSection.appendChild(factorsHeader);

  const factorSummaryList = doc.createElement('div');
  factorSummaryList.className = 'hazard-factor-summary-list';

  const baseSummary = doc.createElement('div');
  baseSummary.className = 'hazard-factor-summary';
  const baseSummaryLabel = doc.createElement('span');
  baseSummaryLabel.className = 'hazard-factor-summary__label';
  baseSummaryLabel.textContent = getHazardousMachineryUiText('labels.baseGrowth', 'Base Growth');
  const baseSummaryValue = doc.createElement('span');
  baseSummaryValue.className = 'hazard-factor-summary__value';
  baseSummary.appendChild(baseSummaryLabel);
  baseSummary.appendChild(baseSummaryValue);

  const penaltySummary = doc.createElement('div');
  penaltySummary.className = 'hazard-factor-summary';
  const penaltySummaryLabel = doc.createElement('span');
  penaltySummaryLabel.className = 'hazard-factor-summary__label';
  penaltySummaryLabel.textContent = getHazardousMachineryUiText('labels.totalPenalty', 'Total Average Penalty');
  const penaltySummaryValue = doc.createElement('span');
  penaltySummaryValue.className = 'hazard-factor-summary__value';
  penaltySummary.appendChild(penaltySummaryLabel);
  penaltySummary.appendChild(penaltySummaryValue);

  factorSummaryList.appendChild(baseSummary);
  factorSummaryList.appendChild(penaltySummary);
  factorsSection.appendChild(factorSummaryList);

  const factorGrid = doc.createElement('div');
  factorGrid.className = 'hazard-factor-grid';

  factorsSection.appendChild(factorGrid);
  card.appendChild(factorsSection);
  root.appendChild(card);

  hazardousMachineryUICache.card = card;
  hazardousMachineryUICache.title = title;
  hazardousMachineryUICache.titleStatus = titleStatus;
  hazardousMachineryUICache.barSafe = safe;
  hazardousMachineryUICache.barHazard = hazard;
  hazardousMachineryUICache.barSafeLabel = safeLabel;
  hazardousMachineryUICache.barHazardLabel = hazardLabel;
  hazardousMachineryUICache.barDetails = barDetails;
  hazardousMachineryUICache.factorsSection = factorsSection;
  hazardousMachineryUICache.factorSummaryList = factorSummaryList;
  hazardousMachineryUICache.baseGrowthValue = baseSummaryValue;
  hazardousMachineryUICache.totalPenaltyValue = penaltySummaryValue;
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
      setHazardousMachineryTitleStatus(true);
      card.style.display = 'none';
    }
    return;
  }

  const status = hazardInstance.getCurrentPenaltyValues(terraformingState, parameters);

  card.style.display = '';
  setHazardousMachineryTitleStatus(hazardInstance.isCleared());

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

  const oxygenUnit = status.oxygenEntry?.unit || 'kPa';
  const invasivenessRangeText = formatHazardousMachineryRange(status.invasivenessEntry);
  const invasivenessSeverityText = formatHazardousMachinerySeverity(status.invasivenessEntry);
  const temperatureUnit = status.temperatureEntry?.unit || 'C';
  const temperatureRangeText = formatHazardousMachineryRange(status.temperatureEntry, temperatureUnit);
  const temperatureSeverityText = formatHazardousMachinerySeverity(status.temperatureEntry);
  const oxygenRangeText = formatHazardousMachineryRange(status.oxygenEntry, oxygenUnit);
  const oxygenSeverityText = formatHazardousMachinerySeverity(status.oxygenEntry);
  renderMachineryFactorRows([
    {
      key: 'water',
      label: getMachineryResourceLabel('resources.surface.liquidWater.name', 'Water'),
      info: getHazardousMachineryUiText('labels.waterRule', 'Max Coverage = Base Coverage - Water Coverage x {value}', {
        value: formatMachineryNumber(parameters.waterCoveragePenalty || 0, 2)
      }),
      tooltip: getHazardousMachineryUiText('tooltips.maxCoverage', 'Maximum machinery coverage is 100% minus half the current water coverage.'),
      values: [
        getHazardousMachineryUiText('labels.waterCurrent', 'Current: {value}% coverage', {
          value: formatMachineryNumber(status.waterCoverage * 100, 2)
        })
      ],
      effects: [
        getHazardousMachineryUiText('labels.waterEffect', 'Max Coverage {value}%', {
          value: formatMachineryNumber(status.maxCoverageShare * 100, 2)
        })
      ]
    },
    {
      key: 'invasiveness',
      label: getHazardousMachineryUiText('labels.invasiveness', 'Life Invasiveness'),
      info: [invasivenessRangeText, invasivenessSeverityText].filter(Boolean).join('\n'),
      values: [
        getHazardousMachineryUiText('labels.currentDesign', 'Current Design: {value}', {
          value: formatMachineryNumber(status.invasivenessValue, 2)
        }),
        getHazardousMachineryUiText('labels.lifeDensity', 'Density: {value}', {
          value: formatMachineryNumber(status.lifeDensity, 4)
        })
      ],
      effects: [
        getHazardousMachineryUiText('labels.invasivenessEffect', 'Decay {value}/s', {
          value: formatMachineryPercent(status.invasivenessDecayPercentPerSecond, 3)
        })
      ]
    },
    {
      key: 'temperature',
      label: getHazardousMachineryUiText('labels.temperature', 'Temperature'),
      info: [temperatureRangeText, temperatureSeverityText].filter(Boolean).join('\n'),
      values: [
        getHazardousMachineryUiText('labels.current', 'Current: {value}{unit}', {
          value: formatMachineryNumber(status.temperatureValue, 2),
          unit: temperatureUnit
        })
      ],
      effects: [
        getHazardousMachineryUiText('labels.temperatureEffect', 'Heat Decay {value}/s', {
          value: formatMachineryPercent(status.temperatureDecayPercentPerSecond, 2)
        })
      ]
    },
    {
      key: 'oxygen',
      label: getMachineryResourceLabel('resources.atmospheric.oxygen.name', 'Oxygen'),
      info: [oxygenRangeText, oxygenSeverityText].filter(Boolean).join('\n'),
      values: [
        getHazardousMachineryUiText('labels.current', 'Current: {value}{unit}', {
          value: formatMachineryNumber(status.oxygenPressureValue, 2),
          unit: oxygenUnit
        })
      ],
      effects: [
        getHazardousMachineryUiText('labels.oxygenEffect', 'Oxidation {value}/s', {
          value: formatMachineryPercent(status.oxygenDecayPercentPerSecond, 2)
        })
      ]
    }
  ]);

  if (hazardousMachineryUICache.baseGrowthValue) {
    hazardousMachineryUICache.baseGrowthValue.textContent = formatMachineryPercent(status.baseGrowthPercentPerSecond, 2);
  }
  if (hazardousMachineryUICache.totalPenaltyValue) {
    hazardousMachineryUICache.totalPenaltyValue.textContent = formatMachineryPercent(status.totalPenaltyPercentPerSecond, 2);
  }

  const decayLines = [];
  decayLines.push(getHazardousMachineryUiText(
    status.netNaturalGrowthPercentPerSecond >= 0 ? 'labels.netGrowth' : 'labels.netDecay',
    status.netNaturalGrowthPercentPerSecond >= 0 ? 'Net Growth: {value}/s' : 'Net Decay: {value}/s',
    { value: formatMachineryPercent(Math.abs(status.netNaturalGrowthPercentPerSecond), 2) }
  ));
  decayLines.push(getHazardousMachineryUiText('labels.availableAndroids', 'Available Androids: {value}', {
    value: formatMachineryNumber(status.availableAndroids, 2)
  }));
  decayLines.push({
    text: getHazardousMachineryUiText('labels.androidDecay', 'Android Hacking: {value}/s', {
      value: formatMachineryNumber(status.androidDecayRatePerSecond, 2)
    }),
    tooltip: getHazardousMachineryUiText(
      'tooltips.androidDecay',
      'The Hazardous Machinery is capable of hacking autonomous androids. This does not impact androids assigned away from signals, such as assigned to underground mining or land expansion projects.'
    )
  });
  if (status.crusaderDecayRatePerSecond > 0) {
    decayLines.push(getHazardousMachineryUiText('labels.crusaderDecay', 'Crusaders: {value}/s', {
      value: formatMachineryNumber(-status.crusaderDecayRatePerSecond, 2)
    }));
  }
  setMachinerySummaryLines(
    hazardousMachineryUICache.summaryDecay,
    decayLines.length
      ? decayLines
      : [getHazardousMachineryUiText('labels.noDecay', 'No active decay or growth.')]
  );

  hazardousMachineryUICache.summaryPenalties.textContent = [
    getHazardousMachineryUiText('labels.buildCost', 'Build Cost: {value}', {
      value: formatSignedMachineryPercent((status.buildCostMultiplier - 1) * 100, 1)
    }),
    getHazardousMachineryUiText('labels.nanocolony', 'Nanocolony Growth: {value}', {
      value: `x${formatMachineryNumber(status.nanoColonyGrowthMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.research', 'Research: {value}', {
      value: `x${formatMachineryNumber(status.researchMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.electronicsMaintenance', 'Electronics Maintenance: {value}', {
      value: `x${formatMachineryNumber(status.electronicsMaintenanceMultiplier, 2)}`
    }),
    getHazardousMachineryUiText('labels.androidConsumption', 'Colony Android Consumption: Disabled'),
    getHazardousMachineryUiText('labels.shipPenalty', 'Assigned Ships: +{value} workers each', {
      value: formatMachineryNumber(status.shipWorkersPerAssignedShip, 0)
    })
  ].join('\n');

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
