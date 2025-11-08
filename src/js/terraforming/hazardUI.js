const hazardUICache = {
  doc: undefined,
  root: null,
  rootResolved: false,
  card: null,
  title: null,
  message: null,
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
  barWrapper: null,
  barSafe: null,
  barHazard: null,
  barSafeLabel: null,
  barHazardLabel: null,
  barDetails: null,
  factorsSection: null,
  factorSummaryList: null,
  baseGrowthValue: null,
  totalPenaltyValue: null,
  factorGrid: null,
  factorHeaderRow: null,
  factorRows: {},
  zoneTable: null,
  zoneTableBody: null,
  zoneRows: [],
  formatter: undefined,
  temperatureHelpers: undefined,
  crusaderSummaryText: null,
  crusaderFocusSelect: null,
  crusaderFocusOptionKeys: null,
  lastControlShare: null,
  lastCrusaderSummary: '',
  lastZoneSummary: '',
  lastPenaltySummary: ''
};

const HAZARD_FALLBACK_ZONES = ['tropical', 'temperate', 'polar'];
const CRUSADER_REMOVAL_FALLBACK = 1; // Keep in sync with HAZARDOUS_BIOMASS_REDUCTION_PER_CRUSADER in hazard.js

function getDocument() {
  if (hazardUICache.doc !== undefined) {
    return hazardUICache.doc;
  }

  try {
    hazardUICache.doc = document;
  } catch (error) {
    hazardUICache.doc = null;
  }

  return hazardUICache.doc;
}

function getFormatter() {
  if (hazardUICache.formatter !== undefined) {
    return hazardUICache.formatter;
  }

  let candidate = null;
  try {
    candidate = formatNumber;
  } catch (error) {
    candidate = null;
  }

  hazardUICache.formatter = candidate && candidate.call ? candidate : null;
  return hazardUICache.formatter;
}

function getTemperatureHelpers() {
  if (hazardUICache.temperatureHelpers !== undefined) {
    return hazardUICache.temperatureHelpers;
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

  hazardUICache.temperatureHelpers = { converter, unitResolver };
  return hazardUICache.temperatureHelpers;
}

function formatNumeric(value, decimals = 2) {
  const formatter = getFormatter();
  if (formatter) {
    return formatter(value, false, decimals);
  }
  return Number(value || 0).toFixed(decimals);
}

function formatSeverityValue(value, decimals = 3) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const text = Number(value).toFixed(decimals);
  return text.replace(/\.?0+$/, '');
}

function formatSignedPercentage(value, decimals = 2) {
  if (!Number.isFinite(value) || !value) {
    return '0%';
  }
  const magnitude = formatNumber(Math.abs(value), false, 2);
  return `${value > 0 ? '+' : '-'}${magnitude}%`;
}

function formatPercentage(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  return `${formatNumber(Math.abs(value), false, 2)}%`;
}

function formatSignedValue(value, decimals = 2, unit = '') {
  if (!Number.isFinite(value) || value === 0) {
    return `${formatNumeric(0, decimals)}${unit ? ` ${unit}` : ''}`;
  }

  const magnitude = formatNumeric(Math.abs(value), decimals);
  const symbol = value > 0 ? '+' : '-';
  return `${symbol}${magnitude}${unit ? ` ${unit}` : ''}`;
}

function formatValueWithUnit(value, unit, decimals = 2) {
  const safeUnit = unit ? ` ${unit}` : '';
  return `${formatNumeric(value, decimals)}${safeUnit}`;
}

function formatRange(entry) {
  if (!entry) {
    return '';
  }

  const minDefined = entry.min !== undefined && entry.min !== null;
  const maxDefined = entry.max !== undefined && entry.max !== null;
  if (!minDefined && !maxDefined) {
    return '';
  }

  const unit = entry.unit || '';
  const minText = minDefined ? formatValueWithUnit(entry.min, unit) : '—';
  const maxText = maxDefined ? formatValueWithUnit(entry.max, unit) : '—';
  return `${minText} – ${maxText}`;
}

function formatSeverityDetails(entry) {
  if (!entry) {
    return '';
  }

  const details = [];

  if (Number.isFinite(entry.severityBelow)) {
    details.push(`Severity Below ×${formatSeverityValue(entry.severityBelow)}`);
  }

  if (Number.isFinite(entry.severityHigh)) {
    details.push(`Severity Above ×${formatSeverityValue(entry.severityHigh)}`);
  }

  if (!details.length && Number.isFinite(entry.severity)) {
    details.push(`Severity ×${formatSeverityValue(entry.severity)}`);
  }

  return details.join('\n');
}

function capitalize(text) {
  if (!text) {
    return '';
  }
  const lower = `${text}`.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getHazardRoot() {
  if (hazardUICache.rootResolved) {
    return hazardUICache.root;
  }

  hazardUICache.rootResolved = true;
  const doc = getDocument();
  hazardUICache.root = doc ? doc.getElementById('hazard-terraforming') : null;
  return hazardUICache.root;
}

function getHazardManager() {
  try {
    return hazardManager;
  } catch (error) {
    return null;
  }
}

function getTerraforming() {
  try {
    return terraforming;
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

function getZones(terraformingState) {
  if (terraformingState && terraformingState.zonalSurface) {
    const keys = Object.keys(terraformingState.zonalSurface);
    if (keys.length) {
      return keys;
    }
  }

  let candidate = null;
  try {
    candidate = ZONES;
  } catch (error) {
    candidate = null;
  }

  if (Array.isArray(candidate) && candidate.length) {
    return candidate;
  }

  return HAZARD_FALLBACK_ZONES;
}

function createInfoIcon(text) {
  const doc = getDocument();
  const icon = doc.createElement('span');
  icon.className = 'info-tooltip-icon';
  icon.textContent = '\u24D8';
  icon.title = text;
  return icon;
}

function ensureHeaderRow() {
  if (hazardUICache.factorHeaderRow) {
    return;
  }

  const doc = getDocument();
  const headerRow = doc.createElement('div');
  headerRow.className = 'hazard-factor-row hazard-factor-row--header';

  const factorHead = doc.createElement('div');
  factorHead.className = 'hazard-factor-cell hazard-factor-cell--label';
  factorHead.textContent = 'Factor';

  const valueHead = doc.createElement('div');
  valueHead.className = 'hazard-factor-cell hazard-factor-cell--values';
  valueHead.textContent = 'Current Values';

  const penaltyHead = doc.createElement('div');
  penaltyHead.className = 'hazard-factor-cell hazard-factor-cell--penalty';
  penaltyHead.textContent = 'Growth Penalty';

  headerRow.appendChild(factorHead);
  headerRow.appendChild(valueHead);
  headerRow.appendChild(penaltyHead);

  hazardUICache.factorGrid.appendChild(headerRow);
  hazardUICache.factorHeaderRow = headerRow;
}

function ensureFactorRow(key) {
  const cached = hazardUICache.factorRows[key];
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

  hazardUICache.factorRows[key] = record;
  return record;
}

function clearUnusedFactorRows(activeKeys) {
  const keys = Object.keys(hazardUICache.factorRows);
  keys.forEach((key) => {
    if (activeKeys[key]) {
      return;
    }
    const entry = hazardUICache.factorRows[key];
    if (entry && entry.row && entry.row.parentNode) {
      entry.row.parentNode.removeChild(entry.row);
    }
    delete hazardUICache.factorRows[key];
  });
}

function computeCrusaderSummary(resourcesState, manager) {
  const specialResources = resourcesState && resourcesState.special;
  const crusaderResource = specialResources && specialResources.crusaders;
  const crusaderCount = crusaderResource && crusaderResource.value ? crusaderResource.value : 0;

  let removalConstant = CRUSADER_REMOVAL_FALLBACK;
  try {
    if (hazardousBiomassRemovalConstant) {
      removalConstant = hazardousBiomassRemovalConstant;
    }
  } catch (error) {
    removalConstant = CRUSADER_REMOVAL_FALLBACK;
  }

  const totalRemovalPerSecond = crusaderCount * removalConstant;
  return {
    count: crusaderCount,
    focusZone: manager && manager.getCrusaderTargetZone
      ? manager.getCrusaderTargetZone()
      : 'any',
    removalRate: {
      total: totalRemovalPerSecond
    }
  };
}

function formatCrusaderSummary(summary) {
  const { count, removalRate } = summary;
  const countText = formatNumeric(count, 0);
  const removalText = formatNumeric(removalRate.total, 2);

  return [
    `Crusaders Available: ${countText}`,
    `Hazardous Biomass Removal: ${removalText} ton/s`
  ].join('\n');
}

function formatZoneSummary(zoneGrowth = []) {
  if (!zoneGrowth || zoneGrowth.length === 0) {
    return {
      table: [
        { zone: 'Zones stable', rate: '0 ton/s', percent: '0%/s' }
      ],
      text: 'Zones stable: 0 ton/s'
    };
  }

  const rows = zoneGrowth.map((entry) => ({
    zone: capitalize(entry.zone),
    rate: formatSignedValue(entry.growthPerSecond, 2, '/s'),
    percent: `${formatSignedPercentage(entry.percentPerSecond, 3)}/s`
  }));

  const text = rows
    .map(({ zone, rate, percent }) => `${zone}: ${rate} (${percent})`)
    .join('\n');

  return {
    table: rows,
    text
  };
}

function renderZoneGrowthTable(rows = []) {
  if (!hazardUICache.zoneTableBody) {
    return;
  }

  const doc = getDocument();
  if (!doc) {
    return;
  }

  if (!Array.isArray(hazardUICache.zoneRows)) {
    hazardUICache.zoneRows = [];
  }

  const existing = hazardUICache.zoneRows;

  // Remove extra rows if the new data is shorter
  if (existing.length > rows.length) {
    const removed = existing.splice(rows.length);
    removed.forEach((record) => {
      if (record && record.row && record.row.parentNode) {
        record.row.parentNode.removeChild(record.row);
      }
    });
  }

  // Add missing rows
  for (let index = existing.length; index < rows.length; index += 1) {
    const row = doc.createElement('tr');

    const zoneCell = doc.createElement('td');
    zoneCell.className = 'hazard-zone-table__zone';

    const rateCell = doc.createElement('td');
    rateCell.className = 'hazard-zone-table__value hazard-zone-table__value--rate';

    const percentCell = doc.createElement('td');
    percentCell.className = 'hazard-zone-table__value hazard-zone-table__value--percent';

    row.appendChild(zoneCell);
    row.appendChild(rateCell);
    row.appendChild(percentCell);
    hazardUICache.zoneTableBody.appendChild(row);

    existing.push({
      row,
      zoneCell,
      rateCell,
      percentCell
    });
  }

  rows.forEach((entry, index) => {
    const record = existing[index];
    if (!record) {
      return;
    }

    if (record.zoneCell.textContent !== entry.zone) {
      record.zoneCell.textContent = entry.zone;
    }

    if (record.rateCell.textContent !== entry.rate) {
      record.rateCell.textContent = entry.rate;
    }

    if (record.percentCell.textContent !== entry.percent) {
      record.percentCell.textContent = entry.percent;
    }
  });
}

function refreshCrusaderFocusSelect(zones = []) {
  const select = hazardUICache.crusaderFocusSelect;
  if (!select) {
    return;
  }

  const doc = getDocument();
  if (!doc) {
    return;
  }

  const manager = getHazardManager();
  const focusZone = manager && manager.getCrusaderTargetZone
    ? manager.getCrusaderTargetZone()
    : 'any';

  const normalizedZones = Array.isArray(zones) ? zones : [];
  const optionKeys = ['any'].concat(normalizedZones);
  const previousKeys = Array.isArray(hazardUICache.crusaderFocusOptionKeys)
    ? hazardUICache.crusaderFocusOptionKeys
    : [];

  let needsRebuild = optionKeys.length !== previousKeys.length;
  if (!needsRebuild) {
    for (let index = 0; index < optionKeys.length; index += 1) {
      if (optionKeys[index] !== previousKeys[index]) {
        needsRebuild = true;
        break;
      }
    }
  }

  if (needsRebuild) {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    optionKeys.forEach((key) => {
      const option = doc.createElement('option');
      option.value = key;
      option.textContent = key === 'any' ? 'Any' : capitalize(key);
      select.appendChild(option);
    });

    hazardUICache.crusaderFocusOptionKeys = optionKeys;
  }

  const desiredValue = optionKeys.indexOf(focusZone) !== -1 ? focusZone : 'any';
  if (select.value !== desiredValue) {
    select.value = desiredValue;
  }
}

function computePenaltySummary(multipliers) {
  const buildBoost = multipliers.buildCost ? (multipliers.buildCost - 1) * 100 : 0;
  const maintenanceBoost = multipliers.maintenanceCost ? (multipliers.maintenanceCost - 1) * 100 : 0;
  const populationDelta = multipliers.populationGrowth ? (multipliers.populationGrowth - 1) * 100 : 0;

  return [
    `Build Cost: ${formatSignedPercentage(buildBoost, 1)}`,
    `Maintenance: ${formatSignedPercentage(maintenanceBoost, 1)}`,
    `Population Growth: ${formatSignedPercentage(populationDelta, 1)}`
  ].join('\n');
}

function computeHazardTotals(terraformingState, hazardParameters, manager) {
  const zones = getZones(terraformingState);
  let biomass = 0;

  zones.forEach((zone) => {
    const zoneData = terraformingState && terraformingState.zonalSurface
      ? terraformingState.zonalSurface[zone]
      : null;
    const zoneBiomass = zoneData && Number.isFinite(zoneData.hazardousBiomass) ? zoneData.hazardousBiomass : 0;
    biomass += zoneBiomass > 0 ? zoneBiomass : 0;
  });

  const baseGrowth = hazardParameters && hazardParameters.baseGrowth;
  const maxDensity = baseGrowth && Number.isFinite(baseGrowth.maxDensity) ? baseGrowth.maxDensity : 0;

  const terraformingLand = terraformingState && Number.isFinite(terraformingState.initialLand)
    ? terraformingState.initialLand
    : 0;

  const resourcesState = getResources();
  const landResource = resourcesState && resourcesState.surface && resourcesState.surface.land;
  const fallbackInitial = landResource && Number.isFinite(landResource.initialValue) ? landResource.initialValue : 0;
  const initialLand = terraformingLand || fallbackInitial || 0;

  const reservedLand = maxDensity ? biomass / maxDensity : 0;

  const zoneGrowth = computeZoneGrowth(terraformingState, hazardParameters, manager, zones);

  return {
    biomass,
    reservedLand,
    initialLand,
    maxDensity,
    zones,
    zoneGrowth
  };
}

function updateControlBar(controlShare, totals) {
  const safePercent = Math.max(0, (1 - controlShare) * 100);
  const hazardPercent = Math.max(0, controlShare * 100);

  const safeLabel = `Secured Land ${formatNumeric(safePercent, 1)}%`;
  const hazardLabel = `Hazardous Biomass ${formatNumeric(hazardPercent, 1)}%`;

  if (safeLabel !== hazardUICache.barSafeLabel.textContent) {
    hazardUICache.barSafeLabel.textContent = safeLabel;
  }

  if (hazardLabel !== hazardUICache.barHazardLabel.textContent) {
    hazardUICache.barHazardLabel.textContent = hazardLabel;
  }

  const safeWidthText = `${safePercent}%`;
  const hazardWidthText = `${hazardPercent}%`;

  hazardUICache.barSafe.style.width = safeWidthText;
  hazardUICache.barHazard.style.width = hazardWidthText;
  hazardUICache.barSafe.style.flexBasis = safeWidthText;
  hazardUICache.barHazard.style.flexBasis = hazardWidthText;

  const { biomass, reservedLand, initialLand, maxDensity } = totals;
  const capacity = initialLand && maxDensity ? initialLand * maxDensity : 0;

  const detailText = [
    `Hazardous Biomass: ${formatNumeric(biomass, 2)} ton`,
    initialLand ? `Occupied Land: ${formatNumeric(reservedLand, 2)} / ${formatNumeric(initialLand, 2)} land` : '',
    capacity ? `Carrying Capacity: ${formatNumeric(capacity, 2)} ton` : ''
  ].filter(Boolean).join(' | ');

  if (detailText !== hazardUICache.barDetails.textContent) {
    hazardUICache.barDetails.textContent = detailText;
  }
}

function buildTemperatureFactor(hazard, manager, terraformingState, zones) {
  const entry = hazard && hazard.temperaturePreference;
  if (!entry || !manager || !terraformingState || !terraformingState.temperature || !terraformingState.temperature.zones) {
    return null;
  }

  const unit = entry.unit || 'K';
  const convert = manager.convertTemperatureFromKelvin
    ? manager.convertTemperatureFromKelvin.bind(manager)
    : (value, targetUnit) => (targetUnit && targetUnit.toLowerCase() === 'c' ? value - 273.15 : value);
  const temperatureHelpers = getTemperatureHelpers();
  const normalizedUnit = `${unit}`.trim().toLowerCase();
  const useDisplayConversion = temperatureHelpers.converter && (!normalizedUnit || normalizedUnit === 'k' || normalizedUnit === 'kelvin');
  const displayUnit = useDisplayConversion && temperatureHelpers.unitResolver ? temperatureHelpers.unitResolver() : unit;
  const computePenalty = manager.computeRangePenalty
    ? manager.computeRangePenalty.bind(manager)
    : () => 0;
  const zoneWeight = manager.getZoneWeight
    ? manager.getZoneWeight.bind(manager)
    : (zone, count) => (count ? 1 / count : 0);

  const values = [];
  const penalties = [];
  let totalPenalty = 0;
  const zoneCount = zones.length || 1;

  zones.forEach((zone) => {
    const zoneData = terraformingState.temperature.zones[zone];
    const tempKelvin = zoneData && Number.isFinite(zoneData.value) ? zoneData.value : 0;
    const converted = convert(tempKelvin, unit);
    const rawPenalty = computePenalty(entry, converted);
    const displayValue = useDisplayConversion ? temperatureHelpers.converter(tempKelvin) : converted;
    const displayLabelUnit = useDisplayConversion ? displayUnit : unit;
    if (!rawPenalty) {
      values.push(`${capitalize(zone)}: ${formatValueWithUnit(displayValue, displayLabelUnit, 2)}`);
      penalties.push(`${capitalize(zone)}: 0%`);
      return;
    }

    const weight = zoneWeight(zone, zoneCount);
    const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    const weightedPenalty = rawPenalty * normalizedWeight;

    values.push(`${capitalize(zone)}: ${formatValueWithUnit(displayValue, displayLabelUnit, 2)}`);
    penalties.push(`${capitalize(zone)}: ${formatSignedPercentage(-rawPenalty, 3)}`);
    totalPenalty += weightedPenalty;
  });

  const infoParts = [];
  let rangeText = '';
  if (useDisplayConversion) {
    const minDefined = entry.min !== undefined && entry.min !== null;
    const maxDefined = entry.max !== undefined && entry.max !== null;
    if (minDefined || maxDefined) {
      const minText = minDefined && Number.isFinite(entry.min)
        ? formatValueWithUnit(temperatureHelpers.converter(entry.min), displayUnit, 2)
        : '—';
      const maxText = maxDefined && Number.isFinite(entry.max)
        ? formatValueWithUnit(temperatureHelpers.converter(entry.max), displayUnit, 2)
        : '—';
      rangeText = `${minText} – ${maxText}`;
    }
  } else {
    rangeText = formatRange(entry);
  }
  if (rangeText) {
    infoParts.push(rangeText);
  }
  const severityText = formatSeverityDetails(entry);
  if (severityText) {
    infoParts.push(severityText);
  }

  return {
    key: 'temperaturePreference',
    label: 'Temperature',
    info: infoParts.join('\n'),
    values,
    penalties,
    totalPenalty
  };
}

function buildPressureFactor(hazard, manager, cache, fieldKey, label) {
  const entry = hazard && hazard[fieldKey];
  if (!entry || !manager || !cache) {
    return null;
  }

  const unit = entry.unit || 'kPa';
  const convert = manager.convertPressureFromPa
    ? manager.convertPressureFromPa.bind(manager)
    : (value, desiredUnit) => {
      if (!desiredUnit) {
        return value;
      }
      const target = `${desiredUnit}`.toLowerCase();
      if (target === 'kpa') {
        return value / 1000;
      }
      if (target === 'pa') {
        return value;
      }
      return value;
    };

  const source = fieldKey === 'atmosphericPressure'
    ? cache.totalPressure
    : cache.pressureByKey && cache.pressureByKey[fieldKey === 'co2Pressure' ? 'carbonDioxide' : 'oxygen'];

  const current = Number.isFinite(source) ? source : 0;
  const converted = convert(current, unit);

  const penalty = manager.calculatePressureGrowthPenalty
    ? manager.calculatePressureGrowthPenalty(cache, entry, fieldKey === 'atmosphericPressure' ? null : (fieldKey === 'co2Pressure' ? 'carbonDioxide' : 'oxygen'))
    : 0;

  const infoParts = [];
  const rangeText = formatRange(entry);
  if (rangeText) {
    infoParts.push(rangeText);
  }
  const severityText = formatSeverityDetails(entry);
  if (severityText) {
    infoParts.push(severityText);
  }

  return {
    key: fieldKey,
    label,
    info: infoParts.join('\n'),
    values: [`Current: ${formatValueWithUnit(converted, unit, 3)}`],
    penalties: [`Penalty: ${formatSignedPercentage(-penalty, 3)}`],
    totalPenalty: penalty
  };
}

function buildRadiationFactor(hazard, manager, terraformingState) {
  const entry = hazard && hazard.radiationPreference;
  if (!entry || !manager || !terraformingState) {
    return null;
  }

  const unit = entry.unit || 'mSv/day';
  const penalty = manager.calculateRadiationGrowthPenalty
    ? manager.calculateRadiationGrowthPenalty(terraformingState, entry)
    : 0;

  const infoParts = [];
  const hasMin = entry.min !== undefined && entry.min !== null;
  const hasMax = entry.max !== undefined && entry.max !== null;

  if (hasMin || hasMax) {
    const minText = hasMin ? formatNumeric(entry.min, 3) : '—';
    const maxText = hasMax ? formatNumeric(entry.max, 3) : '—';
    infoParts.push(`Range ${minText}–${maxText} ${unit}`);
  }
  const severityText = formatSeverityDetails(entry);
  if (severityText) {
    infoParts.push(severityText);
  }

  const currentDose = Number.isFinite(terraformingState.surfaceRadiation)
    ? terraformingState.surfaceRadiation
    : 0;

  return {
    key: 'radiationPreference',
    label: 'Radiation',
    info: infoParts.join('\n'),
    values: [`Current: ${formatValueWithUnit(currentDose, unit, 3)}`],
    penalties: [`Penalty: ${formatSignedPercentage(-penalty, 3)}`],
    totalPenalty: penalty
  };
}

function buildLandFactor(hazard, manager, terraformingState, zones) {
  const entry = hazard && hazard.landPreference;
  if (!entry || !manager || !terraformingState || !terraformingState.zonalCoverageCache) {
    return null;
  }

  const severity = Number.isFinite(entry.severity) ? entry.severity : 0;
  if (!severity) {
    return null;
  }

  const preferenceRaw = entry.value ? `${entry.value}`.trim().toLowerCase() : '';
  const isLandPreference = preferenceRaw === 'land';
  const preferenceLabel = preferenceRaw ? capitalize(preferenceRaw) : 'Unknown';
  const coverageCache = terraformingState.zonalCoverageCache;
  const zoneWeight = manager.getZoneWeight
    ? manager.getZoneWeight.bind(manager)
    : (zone, count) => (count ? 1 / count : 0);

  const values = [];
  const penalties = [];
  let totalPenalty = 0;
  const zoneCount = zones.length || 1;

  zones.forEach((zone) => {
    const cache = coverageCache[zone];
    const liquidWater = cache && Number.isFinite(cache.liquidWater) ? cache.liquidWater : 0;
    const liquidCO2 = cache && Number.isFinite(cache.liquidCO2) ? cache.liquidCO2 : 0;
    const liquidMethane = cache && Number.isFinite(cache.liquidMethane) ? cache.liquidMethane : 0;

    const combined = Math.min(1, Math.max(0, liquidWater + liquidCO2 + liquidMethane));
    const zonePenalty = isLandPreference ? combined * severity : 0;
    const weight = zoneWeight(zone, zoneCount);
    const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    const weightedPenalty = zonePenalty * normalizedWeight;

    values.push(`${capitalize(zone)}: ${formatPercentage(combined * 100, 2)}`);
    penalties.push(`${capitalize(zone)}: ${formatSignedPercentage(-zonePenalty, 3)}`);
    totalPenalty += weightedPenalty;
  });

  return {
    key: 'landPreference',
    label: `Preferred Terrain (${preferenceLabel})`,
    info: `Preference ${preferenceLabel}\nSeverity ×${formatSeverityValue(severity)}`,
    tooltip: isLandPreference
      ? 'Each zone adds (liquid water + liquid CO₂ + liquid methane coverage) × severity to the penalty. Zone penalties are averaged using zone surface share.'
      : 'No growth penalty is currently applied for this preference.',
    values,
    penalties,
    totalPenalty
  };
}

function buildInvasivenessFactor(hazard, manager, terraformingState, zones) {
  const entry = hazard && hazard.invasivenessResistance;
  if (!entry || !manager || !terraformingState) {
    return null;
  }

  const severity = Number.isFinite(entry.severity) ? entry.severity : 0;
  if (!severity) {
    return null;
  }

  const zoneWeight = manager.getZoneWeight
    ? manager.getZoneWeight.bind(manager)
    : (zone, count) => (count ? 1 / count : 0);

  const densityCalculator = manager.calculateZoneLifeDensity
    ? manager.calculateZoneLifeDensity.bind(manager)
    : () => 0;

  const currentInvasiveness = manager.getLifeDesignInvasiveness
    ? manager.getLifeDesignInvasiveness()
    : 0;

  const difference = currentInvasiveness - (Number.isFinite(entry.value) ? entry.value : 0);
  if (!difference) {
    return {
      key: 'invasivenessResistance',
      label: 'Biomass Invasiveness',
      tooltip: 'If current invasiveness exceeds the target, each zone adds (density × (current − target) × severity), averaged using zone surface share.',
      info: `Target ${formatNumeric(entry.value || 0, 2)}\nSeverity ×${formatSeverityValue(severity)}`,
      values: [`Current Design: ${formatNumeric(currentInvasiveness, 2)}`],
      penalties: [`Penalty: 0%`],
      totalPenalty: 0
    };
  }

  const values = [`Current Design: ${formatNumeric(currentInvasiveness, 2)}`, `Target: ${formatNumeric(entry.value || 0, 2)}`];
  const penalties = [];
  let totalPenalty = 0;
  const zoneCount = zones.length || 1;

  zones.forEach((zone) => {
    const density = densityCalculator(terraformingState, zone);
    const zonePenalty = density * difference * severity;
    if (!zonePenalty) {
      penalties.push(`${capitalize(zone)}: 0%`);
      return;
    }

    const weight = zoneWeight(zone, zoneCount);
    const normalizedWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    const weightedPenalty = zonePenalty * normalizedWeight;
    penalties.push(`${capitalize(zone)}: ${formatSignedPercentage(-zonePenalty, 3)}`);
    totalPenalty += weightedPenalty;
  });

  return {
    key: 'invasivenessResistance',
    label: 'Biomass Invasiveness',
    tooltip: 'Zone penalty = life density × (current invasiveness − target) × severity. Totals use zone surface share weighting.',
    info: `Target ${formatNumeric(entry.value || 0, 2)}\nSeverity ×${formatSeverityValue(severity)}`,
    values,
    penalties,
    totalPenalty
  };
}

function buildGrowthFactors(hazard, manager, terraformingState) {
  if (!hazard || !manager) {
    return {
      factors: [],
      baseRate: 0,
      totalPenalty: 0,
      netRate: 0
    };
  }

  const baseGrowth = hazard.baseGrowth || {};
  const baseRate = Number.isFinite(baseGrowth.value) ? baseGrowth.value : 0;
  const zones = getZones(terraformingState);
  const factors = [];

  const temperatureFactor = buildTemperatureFactor(hazard, manager, terraformingState, zones);
  if (temperatureFactor) {
    factors.push(temperatureFactor);
  }

  const cache = terraformingState ? terraformingState.atmosphericPressureCache : null;
  if (cache) {
    const oxygenFactor = buildPressureFactor(hazard, manager, cache, 'oxygenPressure', 'Oxygen Pressure');
    if (oxygenFactor) {
      factors.push(oxygenFactor);
    }

    const co2Factor = buildPressureFactor(hazard, manager, cache, 'co2Pressure', 'CO₂ Pressure');
    if (co2Factor) {
      factors.push(co2Factor);
    }

    const atmoFactor = buildPressureFactor(hazard, manager, cache, 'atmosphericPressure', 'Atmospheric Pressure');
    if (atmoFactor) {
      factors.push(atmoFactor);
    }
  }

  const radiationFactor = buildRadiationFactor(hazard, manager, terraformingState);
  if (radiationFactor) {
    factors.push(radiationFactor);
  }

  const landFactor = buildLandFactor(hazard, manager, terraformingState, zones);
  if (landFactor) {
    factors.push(landFactor);
  }

  const invasivenessFactor = buildInvasivenessFactor(hazard, manager, terraformingState, zones);
  if (invasivenessFactor) {
    factors.push(invasivenessFactor);
  }

  const aggregatedPenalty = factors.reduce((sum, entry) => sum + entry.totalPenalty, 0);
  const calculatedPenalty = manager.calculateHazardousBiomassGrowthPenalty
    ? manager.calculateHazardousBiomassGrowthPenalty(hazard, terraformingState)
    : aggregatedPenalty;

  const totalPenalty = Number.isFinite(calculatedPenalty) ? calculatedPenalty : aggregatedPenalty;
  const netRate = baseRate - totalPenalty;

  return {
    factors,
    baseRate,
    totalPenalty,
    netRate
  };
}

function updateFactorGrid(summary) {
  ensureHeaderRow();
  const activeKeys = {};

  summary.factors.forEach((factor) => {
    const record = ensureFactorRow(factor.key);
    activeKeys[factor.key] = true;

    const desiredLabel = factor.label || '';
    const desiredTooltip = factor.tooltip || '';
    const currentLabel = record.labelTitle.dataset ? record.labelTitle.dataset.label || '' : '';
    const currentTooltip = record.labelTitle.dataset ? record.labelTitle.dataset.tooltip || '' : '';

    if (desiredLabel !== currentLabel || desiredTooltip !== currentTooltip) {
      record.labelTitle.textContent = desiredLabel;
      if (desiredTooltip) {
        record.labelTitle.appendChild(createInfoIcon(desiredTooltip));
      }

      if (record.labelTitle.dataset) {
        record.labelTitle.dataset.label = desiredLabel;
        record.labelTitle.dataset.tooltip = desiredTooltip;
      }
    }

    if (record.labelInfo.textContent !== factor.info) {
      record.labelInfo.textContent = factor.info;
    }

    const valueText = factor.values.join('\n');
    if (record.valueCell.textContent !== valueText) {
      record.valueCell.textContent = valueText;
    }

    const penaltyText = factor.penalties.join('\n');
    if (record.penaltyCell.textContent !== penaltyText) {
      record.penaltyCell.textContent = penaltyText;
    }

    if (!record.row.parentNode) {
      hazardUICache.factorGrid.appendChild(record.row);
    }
  });

  clearUnusedFactorRows(activeKeys);
}

function ensureLayout() {
  if (hazardUICache.card) {
    return;
  }

  const root = getHazardRoot();
  if (!root) {
    return;
  }

  const doc = getDocument();
  const card = doc.createElement('div');
  card.className = 'hazard-card';

  const title = doc.createElement('h3');
  title.className = 'hazard-card__title';
  title.textContent = 'Hazardous Biomass';
  card.appendChild(title);

  const message = doc.createElement('p');
  message.className = 'hazard-card__message hidden';
  message.textContent = 'Hazardous biomass has not been detected.';
  card.appendChild(message);

  const summaryRow = doc.createElement('div');
  summaryRow.className = 'hazard-summary-row';

  const summaryLeft = doc.createElement('div');
  summaryLeft.className = 'hazard-summary hazard-summary--left';
  const summaryLeftHeader = doc.createElement('div');
  summaryLeftHeader.className = 'hazard-summary__header';
  summaryLeftHeader.textContent = 'Crusader Response';
  const summaryLeftBody = doc.createElement('div');
  summaryLeftBody.className = 'hazard-summary__body';
  const crusaderSummaryText = doc.createElement('div');
  crusaderSummaryText.className = 'hazard-crusader-summary';
  const crusaderFocusControls = doc.createElement('div');
  crusaderFocusControls.className = 'hazard-crusader-focus';
  const crusaderFocusLabel = doc.createElement('label');
  crusaderFocusLabel.className = 'hazard-crusader-focus__label';
  crusaderFocusLabel.textContent = 'Focus Zone';
  const crusaderFocusSelect = doc.createElement('select');
  crusaderFocusSelect.className = 'hazard-crusader-focus__select';
  crusaderFocusSelect.addEventListener('change', () => {
    const managerRef = getHazardManager();
    if (managerRef && managerRef.setCrusaderTargetZone) {
      managerRef.setCrusaderTargetZone(crusaderFocusSelect.value);
    }
  });
  crusaderFocusLabel.appendChild(crusaderFocusSelect);
  crusaderFocusControls.appendChild(crusaderFocusLabel);
  summaryLeftBody.appendChild(crusaderSummaryText);
  summaryLeftBody.appendChild(crusaderFocusControls);
  summaryLeft.appendChild(summaryLeftHeader);
  summaryLeft.appendChild(summaryLeftBody);

  const summaryRight = doc.createElement('div');
  summaryRight.className = 'hazard-summary hazard-summary--right';
  const summaryRightHeader = doc.createElement('div');
  summaryRightHeader.className = 'hazard-summary__header';
  summaryRightHeader.textContent = 'Hazard Penalties';
  const summaryRightBody = doc.createElement('div');
  summaryRightBody.className = 'hazard-summary__body';
  summaryRight.appendChild(summaryRightHeader);
  summaryRight.appendChild(summaryRightBody);

  const summaryCenter = doc.createElement('div');
  summaryCenter.className = 'hazard-summary hazard-summary--growth';
  const summaryCenterHeader = doc.createElement('div');
  summaryCenterHeader.className = 'hazard-summary__header';
  summaryCenterHeader.textContent = 'Zone Growth';
  const zoneGrowthTooltip = createInfoIcon(
    'Zone growth = net growth rate × hazardous biomass × logistic term. The logistic term is 1 − (biomass ÷ carrying capacity). Carrying capacity equals the zone’s land share × maximum density, so growth slows as biomass approaches that limit and turns negative when penalties outweigh base growth.'
  );
  summaryCenterHeader.appendChild(zoneGrowthTooltip);
  const summaryCenterBody = doc.createElement('div');
  summaryCenterBody.className = 'hazard-summary__body';
  summaryCenter.appendChild(summaryCenterHeader);
  summaryCenter.appendChild(summaryCenterBody);

  const zoneTable = doc.createElement('table');
  zoneTable.className = 'hazard-zone-table';

  const zoneHead = doc.createElement('thead');
  const zoneHeadRow = doc.createElement('tr');

  const zoneHeadZone = doc.createElement('th');
  zoneHeadZone.textContent = 'Zone';

  const zoneHeadGrowth = doc.createElement('th');
  zoneHeadGrowth.className = 'hazard-zone-table__head hazard-zone-table__head--value';
  zoneHeadGrowth.textContent = 'Growth';

  const zoneHeadPercent = doc.createElement('th');
  zoneHeadPercent.className = 'hazard-zone-table__head hazard-zone-table__head--value';
  zoneHeadPercent.textContent = 'Δ%/s';

  zoneHeadRow.appendChild(zoneHeadZone);
  zoneHeadRow.appendChild(zoneHeadGrowth);
  zoneHeadRow.appendChild(zoneHeadPercent);
  zoneHead.appendChild(zoneHeadRow);

  const zoneBody = doc.createElement('tbody');

  zoneTable.appendChild(zoneHead);
  zoneTable.appendChild(zoneBody);
  summaryCenterBody.appendChild(zoneTable);

  summaryRow.appendChild(summaryLeft);
  summaryRow.appendChild(summaryCenter);
  summaryRow.appendChild(summaryRight);
  card.appendChild(summaryRow);
  hazardUICache.summaryRow = summaryRow;

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
  hazardUICache.barWrapper = barWrapper;

  const factorsSection = doc.createElement('div');
  factorsSection.className = 'hazard-factors';

  const factorsHeader = doc.createElement('div');
  factorsHeader.className = 'hazard-factors__header';

  const factorsHeaderLabel = doc.createElement('span');
  factorsHeaderLabel.className = 'hazard-factors__title';
  factorsHeaderLabel.textContent = 'Growth Modifiers';
  factorsHeader.appendChild(factorsHeaderLabel);

  const factorSummaryList = doc.createElement('div');
  factorSummaryList.className = 'hazard-factor-summary-list';

  const baseSummary = doc.createElement('div');
  baseSummary.className = 'hazard-factor-summary';
  const baseSummaryLabel = doc.createElement('span');
  baseSummaryLabel.className = 'hazard-factor-summary__label';
  baseSummaryLabel.textContent = 'Base Growth';
  const baseSummaryValue = doc.createElement('span');
  baseSummaryValue.className = 'hazard-factor-summary__value';
  baseSummary.appendChild(baseSummaryLabel);
  baseSummary.appendChild(baseSummaryValue);

  const penaltySummary = doc.createElement('div');
  penaltySummary.className = 'hazard-factor-summary';
  const penaltySummaryLabel = doc.createElement('span');
  penaltySummaryLabel.className = 'hazard-factor-summary__label';
  penaltySummaryLabel.textContent = 'Total Average Penalty';
  const penaltySummaryValue = doc.createElement('span');
  penaltySummaryValue.className = 'hazard-factor-summary__value';
  penaltySummary.appendChild(penaltySummaryLabel);
  penaltySummary.appendChild(penaltySummaryValue);

  factorSummaryList.appendChild(baseSummary);
  factorSummaryList.appendChild(penaltySummary);

  const factorGrid = doc.createElement('div');
  factorGrid.className = 'hazard-factor-grid';

  factorsSection.appendChild(factorsHeader);
  factorsSection.appendChild(factorSummaryList);
  factorsSection.appendChild(factorGrid);
  card.appendChild(factorsSection);

  root.appendChild(card);

  hazardUICache.card = card;
  hazardUICache.title = title;
  hazardUICache.message = message;
  hazardUICache.summaryLeft = summaryLeft;
  hazardUICache.summaryLeftHeader = summaryLeftHeader;
  hazardUICache.summaryLeftBody = summaryLeftBody;
  hazardUICache.crusaderSummaryText = crusaderSummaryText;
  hazardUICache.crusaderFocusSelect = crusaderFocusSelect;
  hazardUICache.crusaderFocusOptionKeys = null;
  hazardUICache.summaryCenter = summaryCenter;
  hazardUICache.summaryCenterHeader = summaryCenterHeader;
  hazardUICache.summaryCenterBody = summaryCenterBody;
  hazardUICache.zoneTable = zoneTable;
  hazardUICache.zoneTableBody = zoneBody;
  hazardUICache.zoneRows = [];
  hazardUICache.summaryRight = summaryRight;
  hazardUICache.summaryRightHeader = summaryRightHeader;
  hazardUICache.summaryRightBody = summaryRightBody;
  hazardUICache.barSafe = safeFill;
  hazardUICache.barHazard = hazardFill;
  hazardUICache.barSafeLabel = safeLabel;
  hazardUICache.barHazardLabel = hazardLabel;
  hazardUICache.barDetails = barDetails;
  hazardUICache.factorsSection = factorsSection;
  hazardUICache.factorSummaryList = factorSummaryList;
  hazardUICache.baseGrowthValue = baseSummaryValue;
  hazardUICache.totalPenaltyValue = penaltySummaryValue;
  hazardUICache.factorGrid = factorGrid;
}

function toggleEmptyState(showEmpty) {
  if (!hazardUICache.card) {
    return;
  }

  if (showEmpty) {
    hazardUICache.card.classList.add('hazard-card--empty');
    hazardUICache.message.classList.remove('hidden');
    hazardUICache.factorsSection.classList.add('hidden');
    if (hazardUICache.summaryRow) {
      hazardUICache.summaryRow.classList.add('hidden');
    }
    if (hazardUICache.summaryCenter) {
      hazardUICache.summaryCenter.classList.add('hidden');
    }
    if (hazardUICache.barWrapper) {
      hazardUICache.barWrapper.classList.add('hidden');
    }
  } else {
    hazardUICache.card.classList.remove('hazard-card--empty');
    hazardUICache.message.classList.add('hidden');
    hazardUICache.factorsSection.classList.remove('hidden');
    if (hazardUICache.summaryRow) {
      hazardUICache.summaryRow.classList.remove('hidden');
    }
    if (hazardUICache.summaryCenter) {
      hazardUICache.summaryCenter.classList.remove('hidden');
    }
    if (hazardUICache.barWrapper) {
      hazardUICache.barWrapper.classList.remove('hidden');
    }
  }
}

function updateSummaryLines(crusaderSummary, zoneSummary, penaltySummary) {
  if (hazardUICache.crusaderSummaryText && hazardUICache.crusaderSummaryText.textContent !== crusaderSummary) {
    hazardUICache.crusaderSummaryText.textContent = crusaderSummary;
  }

  if (hazardUICache.summaryRightBody && hazardUICache.summaryRightBody.textContent !== penaltySummary) {
    hazardUICache.summaryRightBody.textContent = penaltySummary;
  }

  if (!zoneSummary) {
    return;
  }

  if (hazardUICache.summaryCenterBody) {
    hazardUICache.summaryCenterBody.setAttribute('aria-label', zoneSummary.text || '');
  }

  renderZoneGrowthTable(zoneSummary.table || []);
}

function updateGrowthSummaryRows(summary) {
  if (!hazardUICache.factorSummaryList) {
    return;
  }

  const baseText = formatPercentage(summary.baseRate, 3);
  const penaltyText = formatSignedPercentage(-summary.totalPenalty, 3);

  if (hazardUICache.baseGrowthValue && hazardUICache.baseGrowthValue.textContent !== baseText) {
    hazardUICache.baseGrowthValue.textContent = baseText;
  }

  if (hazardUICache.totalPenaltyValue && hazardUICache.totalPenaltyValue.textContent !== penaltyText) {
    hazardUICache.totalPenaltyValue.textContent = penaltyText;
  }
}

function initializeHazardUI() {
  ensureLayout();
}

function updateHazardUI(parameters = {}) {
  ensureLayout();
  if (!hazardUICache.card) {
    return;
  }

  const hazard = parameters.hazardousBiomass;
  if (!hazard) {
    toggleEmptyState(true);
    return;
  }

  toggleEmptyState(false);

  const manager = getHazardManager();
  const terraformingState = getTerraforming();
  const resourcesState = getResources();

  const controlShare = manager && manager.getHazardousBiomassControl
    ? manager.getHazardousBiomassControl()
    : 0;

  const totals = computeHazardTotals(terraformingState, hazard, manager);
  refreshCrusaderFocusSelect(totals.zones || []);
  if (controlShare !== hazardUICache.lastControlShare) {
    updateControlBar(controlShare, totals);
    hazardUICache.lastControlShare = controlShare;
  } else {
    const detailText = hazardUICache.barDetails.textContent;
    const newDetailText = [
      `Hazardous Biomass: ${formatNumeric(totals.biomass, 2)} ton`,
      totals.initialLand ? `Occupied Land: ${formatNumeric(totals.reservedLand, 2)} / ${formatNumeric(totals.initialLand, 2)} land` : '',
      totals.initialLand && totals.maxDensity ? `Carrying Capacity: ${formatNumeric(totals.initialLand * totals.maxDensity, 2)} ton` : ''
    ].filter(Boolean).join(' | ');
    if (detailText !== newDetailText) {
      updateControlBar(controlShare, totals);
    }
  }

  const crusaderStats = computeCrusaderSummary(resourcesState || {}, manager);
  const crusaderSummary = formatCrusaderSummary(crusaderStats);
  const zoneSummary = formatZoneSummary(totals.zoneGrowth || []);
  const zoneSummaryText = zoneSummary ? zoneSummary.text : '';

  const multipliers = manager && manager.getPenaltyMultipliers
    ? manager.getPenaltyMultipliers()
    : { buildCost: 1, maintenanceCost: 1, populationGrowth: 1 };
  const penaltySummary = computePenaltySummary(multipliers);

  if (
    crusaderSummary !== hazardUICache.lastCrusaderSummary ||
    zoneSummaryText !== hazardUICache.lastZoneSummary ||
    penaltySummary !== hazardUICache.lastPenaltySummary
  ) {
    updateSummaryLines(crusaderSummary, zoneSummary, penaltySummary);
    hazardUICache.lastCrusaderSummary = crusaderSummary;
    hazardUICache.lastZoneSummary = zoneSummaryText;
    hazardUICache.lastPenaltySummary = penaltySummary;
  } else if (!Array.isArray(hazardUICache.zoneRows) || hazardUICache.zoneRows.length === 0) {
    updateSummaryLines(crusaderSummary, zoneSummary, penaltySummary);
  }

  const growthSummary = buildGrowthFactors(hazard, manager, terraformingState);
  updateGrowthSummaryRows(growthSummary);
  updateFactorGrid(growthSummary);
}

try {
  window.initializeHazardUI = initializeHazardUI;
  window.updateHazardUI = updateHazardUI;
} catch (error) {
  // Window not available (tests)
}

try {
  if (module && module.exports) {
    module.exports = {
      initializeHazardUI,
      updateHazardUI
    };
  }
} catch (error) {
  // Module system not available in browser
}
function computeZoneGrowth(terraformingState, hazardParameters, manager, zones) {
  const baseGrowth = hazardParameters && hazardParameters.baseGrowth;
  const baseRatePercent = Number.isFinite(baseGrowth && baseGrowth.value) ? baseGrowth.value : 0;
  const maxDensity = Number.isFinite(baseGrowth && baseGrowth.maxDensity) ? baseGrowth.maxDensity : 0;

  let penaltyDetails = null;
  if (manager && manager.calculateHazardousBiomassGrowthPenaltyDetails) {
    penaltyDetails = manager.calculateHazardousBiomassGrowthPenaltyDetails(hazardParameters, terraformingState);
  }

  const totalPenalty = penaltyDetails && Number.isFinite(penaltyDetails.totalPenalty)
    ? penaltyDetails.totalPenalty
    : (manager && manager.calculateHazardousBiomassGrowthPenalty
      ? manager.calculateHazardousBiomassGrowthPenalty(hazardParameters, terraformingState)
      : 0);
  const globalPenalty = penaltyDetails && Number.isFinite(penaltyDetails.globalPenalty)
    ? penaltyDetails.globalPenalty
    : totalPenalty;
  const zonePenaltyMap = penaltyDetails && penaltyDetails.zonePenalties
    ? penaltyDetails.zonePenalties
    : {};

  const fallbackNetPercent = baseRatePercent - totalPenalty;

  if (!terraformingState || !terraformingState.zonalSurface) {
    return zones.map((zone) => ({
      zone,
      biomass: 0,
      growthPerSecond: 0,
      netGrowthPercent: fallbackNetPercent,
      penaltyPercent: totalPenalty
    }));
  }

  const resourcesState = getResources();
  const landResource = resourcesState && resourcesState.surface && resourcesState.surface.land;
  const terraformingLand = Number.isFinite(terraformingState.initialLand) ? terraformingState.initialLand : 0;
  const fallbackLand = landResource && Number.isFinite(landResource.initialValue) ? landResource.initialValue : 0;
  const initialLand = terraformingLand || fallbackLand || 0;

  const shareResolver = (() => {
    if (manager && typeof manager.getZoneWeight === 'function') {
      return (zone, count) => manager.getZoneWeight(zone, count);
    }

    try {
      if (typeof getZonePercentage === 'function') {
        return (zone) => getZonePercentage(zone);
      }
    } catch (error) {
      // ignored
    }

    try {
      if (typeof window !== 'undefined' && typeof window.getZonePercentage === 'function') {
        return (zone) => window.getZonePercentage(zone);
      }
    } catch (error) {
      // ignored
    }

    try {
      if (typeof global !== 'undefined' && typeof global.getZonePercentage === 'function') {
        return (zone) => global.getZonePercentage(zone);
      }
    } catch (error) {
      // ignored
    }

    return null;
  })();

  return zones.map((zone) => {
    const zoneData = terraformingState.zonalSurface[zone];
    const zoneBiomass = zoneData && Number.isFinite(zoneData.hazardousBiomass) ? zoneData.hazardousBiomass : 0;
    let percentage = shareResolver ? shareResolver(zone, zones.length) : 0;
    if (!Number.isFinite(percentage) || percentage <= 0) {
      percentage = zones.length ? 1 / zones.length : 0;
    }

    const zoneArea = initialLand && percentage ? initialLand * percentage : 0;
    const carryingCapacity = zoneArea && maxDensity ? zoneArea * maxDensity : 0;

    const zonePenalty = Number.isFinite(zonePenaltyMap[zone]) ? zonePenaltyMap[zone] : 0;
    const zoneNetPercent = baseRatePercent - globalPenalty - zonePenalty;
    const normalizedNetPercent = Number.isFinite(zoneNetPercent) ? zoneNetPercent : 0;
    const zoneNetRate = normalizedNetPercent / 100;

    let growthPerSecond = 0;
    if (zoneBiomass > 0 && carryingCapacity > 0 && Number.isFinite(zoneNetRate)) {
      const logisticTerm = zoneNetRate > 0
        ? 1 - (zoneBiomass / carryingCapacity)
        : 1;
      growthPerSecond = zoneNetRate * zoneBiomass * logisticTerm;
    }

    const percentPerSecond = zoneBiomass > 0
      ? (growthPerSecond / zoneBiomass) * 100
      : normalizedNetPercent;

    const combinedPenalty = globalPenalty + zonePenalty;
    const normalizedPenalty = Number.isFinite(combinedPenalty) ? combinedPenalty : 0;

    return {
      zone,
      biomass: zoneBiomass,
      growthPerSecond,
      netGrowthPercent: normalizedNetPercent,
      percentPerSecond,
      penaltyPercent: normalizedPenalty
    };
  });
}
