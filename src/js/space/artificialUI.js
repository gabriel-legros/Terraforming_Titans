const artificialUICache = {
  button: null,
  content: null,
  status: null,
  state: null,
  type: null,
  typeField: null,
  core: null,
  coreField: null,
  radiusRange: null,
  radiusInput: null,
  radiusAuto: null,
  radiusBox: null,
  radiusLabel: null,
  areaLabel: null,
  gravityValue: null,
  nameInput: null,
  costMetal: null,
  costMetalRow: null,
  costSuperalloy: null,
  starContext: null,
  starContextField: null,
  ringStarCore: null,
  ringStarCoreField: null,
  ringOrbitRange: null,
  ringOrbitInput: null,
  ringAuto: null,
  ringOrbitBox: null,
  ringOrbitLabel: null,
  ringWidthRange: null,
  ringWidthInput: null,
  ringWidthBox: null,
  ringWidthLabel: null,
  ringFluxRange: null,
  ringFluxInput: null,
  ringFluxBox: null,
  ringFluxLabel: null,
  durationValue: null,
  durationTooltip: null,
  gainEffective: null,
  gainDistinct: null,
  gainFleet: null,
  gainDefense: null,
  gainFleetTooltip: null,
  effectShipEnergy: null,
  effectShipEnergyRow: null,
  effectShipEnergyLabel: null,
  sector: null,
  sectorFilter: null,
  priority: null,
  startBtn: null,
  travelBtn: null,
  stopBtn: null,
  progressFill: null,
  progressLabel: null,
  stashSummary: null,
  stashRecommend: null,
  stashControls: {},
  historyList: null,
  historyPage: null,
  historyPrev: null,
  historyNext: null,
  storyButton: null,
  storyContent: null,
  bailoutBtn: null,
  bailoutStock: null
};

let artificialHistoryPage = 0;
const artificialStashMultipliers = {
  metal: 1_000_000_000,
  silicon: 1_000_000_000
};
let artificialRadiusEditing = false;
let artificialRingOrbitEditing = false;
let artificialRingWidthEditing = false;
let artificialRingFluxEditing = false;
let artificialHistorySig = '';
const ARTIFICIAL_SECTOR_RESOURCE_LABELS = {
  metal: 'Metal',
  water: 'Water',
  silicon: 'Silica',
  carbon: 'Carbon',
  nitrogen: 'Nitrogen',
  oxygen: 'Oxygen'
};

const ARTIFICIAL_RING_FLUX_BOUNDS_WM2 = { min: 1_200, max: 1_500 };
const ARTIFICIAL_RING_FLUX_DEFAULT_WM2 = 1_300;

function formatArtificialSectorResourceLabel(resourceKey) {
  const label = ARTIFICIAL_SECTOR_RESOURCE_LABELS[resourceKey];
  const normalized = resourceKey ? String(resourceKey) : '';
  return label || (normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'Unknown');
}

function getArtificialSectorRichResource(sector) {
  return sector?.getRichResource?.() || sector?.richResource || '';
}

function getArtificialSectorDisplayName(sector) {
  return sector?.getDisplayName?.() || sector?.key || `${sector.q},${sector.r}`;
}

function buildArtificialSectorResourceSuffix(sector) {
  const richResource = getArtificialSectorRichResource(sector);
  const poorResources = sector?.getPoorResources?.() || sector?.poorResources || [];
  const poorList = Array.isArray(poorResources) ? poorResources : [];
  const richLabel = richResource ? `+${formatArtificialSectorResourceLabel(richResource)}` : '';
  const poorLabels = poorList.map(resource => `-${formatArtificialSectorResourceLabel(resource)}`);
  const summary = [richLabel, ...poorLabels].filter(Boolean).join(', ');
  return summary ? ` (${summary})` : '';
}

function buildArtificialSectorFilterOptions(sectors) {
  const list = Array.isArray(sectors) ? sectors : [];
  const resources = new Set();
  list.forEach(sector => {
    const richResource = getArtificialSectorRichResource(sector);
    if (richResource) {
      resources.add(richResource);
    }
  });
  return Array.from(resources).sort((left, right) => {
    const leftLabel = formatArtificialSectorResourceLabel(left);
    const rightLabel = formatArtificialSectorResourceLabel(right);
    return leftLabel.localeCompare(rightLabel);
  });
}

function buildArtificialSectorWorldCountSuffix(manager, sector) {
  const rawCount = manager?.getTerraformedWorldCountForSector?.(sector) || 0;
  const count = Math.max(0, Math.round(rawCount));
  const label = formatNumber(count, false, 0);
  const noun = count === 1 ? 'world' : 'worlds';
  return ` (${label} ${noun})`;
}

function cacheArtificialUIElements() {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return artificialUICache;

  if (!artificialUICache.button || !artificialUICache.button.isConnected) {
    artificialUICache.button = doc.querySelector('[data-subtab="space-artificial"]');
  }
  if (!artificialUICache.content || !artificialUICache.content.isConnected) {
    artificialUICache.content = doc.getElementById('space-artificial');
  }
  if (!artificialUICache.storyButton || !artificialUICache.storyButton.isConnected) {
    artificialUICache.storyButton = doc.querySelector('[data-subtab="space-story"]');
  }
  if (!artificialUICache.storyContent || !artificialUICache.storyContent.isConnected) {
    artificialUICache.storyContent = doc.getElementById('space-story');
  }
  return artificialUICache;
}

function buildOption(value, label, disabled = false, disabledSource) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = disabled && disabledSource ? `${label} (Locked by ${disabledSource})` : label;
  opt.disabled = disabled;
  return opt;
}

function buildCostRow(label, valueId) {
  const row = document.createElement('div');
  row.className = 'artificial-cost-row';
  const name = document.createElement('span');
  name.textContent = label;
  const val = document.createElement('span');
  val.id = valueId;
  val.className = 'artificial-cost-value';
  row.appendChild(name);
  row.appendChild(val);
  return { row, valueEl: val };
}

function buildHistoryRow(entry) {
  const row = document.createElement('div');
  row.className = 'artificial-history-row';
  const name = document.createElement('span');
  name.className = 'artificial-history-name';
  const nameText = document.createElement('span');
  nameText.className = 'artificial-history-name-text';
  nameText.textContent = entry.name;
  nameText.title = entry.seed || '';
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'artificial-history-edit-btn';
  editBtn.textContent = '';
  editBtn.title = 'Rename this artificial world';
  editBtn.setAttribute('aria-label', 'Rename this artificial world');
  name.appendChild(nameText);
  name.appendChild(editBtn);
  const type = document.createElement('span');
  const typeLabel = entry.type ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : '—';
  type.textContent = typeLabel;
  const sector = document.createElement('span');
  const sectorValue = entry.sector || '';
  const sectorLabel = sectorValue && sectorValue.getDisplayName
    ? sectorValue.getDisplayName()
    : (sectorValue && sectorValue.key ? sectorValue.key : (sectorValue || '—'));
  sector.textContent = sectorLabel;
  const land = document.createElement('span');
  const landValue = entry.landHa !== undefined ? entry.landHa : (entry.radiusEarth && artificialManager ? artificialManager.calculateAreaHectares(entry.radiusEarth) : undefined);
  land.textContent = landValue !== undefined ? (formatNumber ? formatNumber(landValue, false, 2) : landValue) : '—';
  const effective = document.createElement('span');
  const effectiveValue = entry.terraformedValue !== undefined
    ? entry.terraformedValue
    : (landValue !== undefined ? Math.max(1, Math.floor((landValue || 0) / 50_000_000_000)) : undefined);
  effective.textContent = effectiveValue !== undefined ? (formatNumber ? formatNumber(effectiveValue, true, 2) : effectiveValue) : '—';
  effective.title = 'Counts toward terraformed worlds (1 per 50B ha, minimum 1).';
  const status = document.createElement('span');
  const statusKey = entry.status || '';
  const statusLabelMap = {
    building: 'Under construction',
    completed: 'Ready for Terraforming',
    current: 'Current',
    terraformed: 'Terraformed',
    abandoned: 'Abandoned'
  };
  const statusLabel = statusLabelMap[statusKey] || (statusKey ? statusKey.charAt(0).toUpperCase() + statusKey.slice(1) : '');
  status.textContent = statusLabel;
  status.className = `artificial-history-status artificial-history-${statusKey}`;
  if (entry.canTravel) {
    const travelBtn = document.createElement('button');
    travelBtn.className = 'artificial-history-travel-btn';
    travelBtn.textContent = 'Travel';
    travelBtn.title = 'Travel to this artificial world';
    travelBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      artificialManager.travelToStoredWorld(entry.id);
    });
    status.appendChild(travelBtn);
  }
  editBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (name.dataset.editing === 'true') return;
    name.dataset.editing = 'true';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'artificial-history-name-input';
    input.value = entry.name;
    input.title = nameText.title;
    name.replaceChild(input, nameText);
    editBtn.disabled = true;
    input.focus();
    input.select();
    input.addEventListener('keydown', (keyEvent) => {
      if (keyEvent.key === 'Enter') {
        input.blur();
      }
      if (keyEvent.key === 'Escape') {
        input.value = entry.name;
        input.blur();
      }
    });
    input.addEventListener('blur', () => {
      name.dataset.editing = '';
      editBtn.disabled = false;
      artificialManager?.setWorldNameById(entry.id, input.value);
      nameText.textContent = (String(input.value || '').trim()) || `Artificial ${entry.id}`;
      name.replaceChild(nameText, input);
    });
  });
  row.appendChild(name);
  row.appendChild(type);
  row.appendChild(sector);
  row.appendChild(land);
  row.appendChild(effective);
  row.appendChild(status);
  return row;
}

function buildHistoryHeader() {
  const header = document.createElement('div');
  header.className = 'artificial-history-row artificial-history-header-row';
  ['Name', 'Type', 'Sector', 'Land', 'Value', 'Status'].forEach((label) => {
    const cell = document.createElement('span');
    cell.textContent = label;
    header.appendChild(cell);
  });
  return header;
}

function createProgressBar() {
  const wrap = document.createElement('div');
  wrap.className = 'artificial-progress';
  const fill = document.createElement('div');
  fill.className = 'artificial-progress-fill';
  wrap.appendChild(fill);
  return { wrap, fill };
}

const ARTIFICIAL_RING_WIDTH_BOUNDS_KM = { min: 1_000, max: 1_000_000 };
const ARTIFICIAL_AU_TO_EARTH_RADII = 23_481.07;

function getSelectedArtificialType(project) {
  return project?.type || (artificialUICache.type ? artificialUICache.type.value : 'shell') || 'shell';
}

function getRadiusBounds() {
  if (typeof getArtificialCoreBounds === 'function' && artificialUICache.core) {
    return getArtificialCoreBounds(artificialUICache.core.value);
  }
  return { min: 2, max: 8 };
}

function getRingStarCoreOptions() {
  const fn = typeof window !== 'undefined' ? window.getRingStarCores : null;
  return fn ? fn() : [];
}

function getRingOrbitBoundsAU() {
  if (typeof getRingStarCoreBounds === 'function' && artificialUICache.ringStarCore) {
    return getRingStarCoreBounds(artificialUICache.ringStarCore.value);
  }
  return { min: 0.03, max: 0.25 };
}

function getRingWidthBoundsKm() {
  const options = getRingStarCoreOptions();
  const fallback = options[0] || {};
  const coreValue = artificialUICache.ringStarCore ? artificialUICache.ringStarCore.value : fallback.value;
  const core = options.find((entry) => entry.value === coreValue) || fallback;
  const min = ARTIFICIAL_RING_WIDTH_BOUNDS_KM.min;
  const max = Math.max(core?.maxWidthKm || ARTIFICIAL_RING_WIDTH_BOUNDS_KM.max, min);
  return { min, max };
}

function clampRadiusValue(value) {
  const bounds = getRadiusBounds();
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

function clampRingOrbitValue(value) {
  const bounds = getRingOrbitBoundsAU();
  const next = Math.max(0, Number(value) || 0);
  return Math.min(Math.max(next, bounds.min), bounds.max);
}

function clampRingWidthValue(value) {
  const bounds = getRingWidthBoundsKm();
  const next = Math.max(0, Number(value) || 0);
  return Math.min(Math.max(next, bounds.min), bounds.max);
}

function clampRingFluxValue(value) {
  const next = Math.max(0, Number(value) || 0);
  return Math.min(Math.max(next, ARTIFICIAL_RING_FLUX_BOUNDS_WM2.min), ARTIFICIAL_RING_FLUX_BOUNDS_WM2.max);
}

function isRadiusFieldActive() {
  if (typeof document === 'undefined') return false;
  return document.activeElement === artificialUICache.radiusInput
    || document.activeElement === artificialUICache.radiusRange;
}

function isRingOrbitFieldActive() {
  if (typeof document === 'undefined') return false;
  return document.activeElement === artificialUICache.ringOrbitInput
    || document.activeElement === artificialUICache.ringOrbitRange;
}

function isRingWidthFieldActive() {
  if (typeof document === 'undefined') return false;
  return document.activeElement === artificialUICache.ringWidthInput
    || document.activeElement === artificialUICache.ringWidthRange;
}

function isRingFluxFieldActive() {
  return document.activeElement === artificialUICache.ringFluxInput
    || document.activeElement === artificialUICache.ringFluxRange;
}

function setRadiusFields(value, force = false) {
  const next = clampRadiusValue(value);
  if (artificialUICache.radiusRange && (force || (!isRadiusFieldActive() && !artificialRadiusEditing))) {
    artificialUICache.radiusRange.value = next;
  }
  if (artificialUICache.radiusInput && (force || (!artificialRadiusEditing && document.activeElement !== artificialUICache.radiusInput))) {
    artificialUICache.radiusInput.value = next;
  }
}

function setRingOrbitFields(value, force = false) {
  const next = clampRingOrbitValue(value);
  if (artificialUICache.ringOrbitRange && (force || (!isRingOrbitFieldActive() && !artificialRingOrbitEditing))) {
    artificialUICache.ringOrbitRange.value = next;
  }
  if (artificialUICache.ringOrbitInput && (force || (!artificialRingOrbitEditing && document.activeElement !== artificialUICache.ringOrbitInput))) {
    artificialUICache.ringOrbitInput.value = next;
  }
}

function setRingWidthFields(value, force = false) {
  const next = clampRingWidthValue(value);
  if (artificialUICache.ringWidthRange && (force || (!isRingWidthFieldActive() && !artificialRingWidthEditing))) {
    artificialUICache.ringWidthRange.value = next;
  }
  if (artificialUICache.ringWidthInput && (force || (!artificialRingWidthEditing && document.activeElement !== artificialUICache.ringWidthInput))) {
    artificialUICache.ringWidthInput.value = Math.round(next);
  }
}

function setRingFluxFields(value, force = false) {
  const next = clampRingFluxValue(value);
  if (force || (!isRingFluxFieldActive() && !artificialRingFluxEditing)) {
    artificialUICache.ringFluxRange.value = next;
  }
  if (force || (!artificialRingFluxEditing && document.activeElement !== artificialUICache.ringFluxInput)) {
    artificialUICache.ringFluxInput.value = Math.round(next);
  }
}

function getAutoRadiusValue() {
  const bounds = getRadiusBounds();
  const manager = artificialManager;
  return manager.getAutoRadius(bounds);
}

function getAutoRingOrbitValue(widthKm) {
  const bounds = getRingOrbitBoundsAU();
  const manager = artificialManager;
  return manager.getAutoRingOrbit(bounds, widthKm);
}

function applyRadiusBounds() {
  if (getSelectedArtificialType(null) !== 'shell') return;
  const bounds = getRadiusBounds();
  if (artificialUICache.radiusRange) {
    artificialUICache.radiusRange.min = bounds.min;
    artificialUICache.radiusRange.max = bounds.max;
    if (!isRadiusFieldActive() && !artificialRadiusEditing) {
      artificialUICache.radiusRange.value = clampRadiusValue(parseFloat(artificialUICache.radiusRange.value) || bounds.min);
    }
  }
  if (artificialUICache.radiusInput) {
    artificialUICache.radiusInput.min = bounds.min;
    artificialUICache.radiusInput.max = bounds.max;
    if (!artificialRadiusEditing && document.activeElement !== artificialUICache.radiusInput) {
      artificialUICache.radiusInput.value = clampRadiusValue(parseFloat(artificialUICache.radiusInput.value) || bounds.min);
    }
  }
}

function applyRingBounds() {
  if (!artificialUICache.ringOrbitRange || !artificialUICache.ringOrbitInput || !artificialUICache.ringWidthRange || !artificialUICache.ringWidthInput) return;

  const orbit = getRingOrbitBoundsAU();
  artificialUICache.ringOrbitRange.min = orbit.min;
  artificialUICache.ringOrbitRange.max = orbit.max;
  artificialUICache.ringOrbitInput.min = orbit.min;
  artificialUICache.ringOrbitInput.max = orbit.max;
  if (!isRingOrbitFieldActive() && !artificialRingOrbitEditing) {
    artificialUICache.ringOrbitRange.value = clampRingOrbitValue(parseFloat(artificialUICache.ringOrbitRange.value) || orbit.min);
  }
  if (!artificialRingOrbitEditing && document.activeElement !== artificialUICache.ringOrbitInput) {
    artificialUICache.ringOrbitInput.value = clampRingOrbitValue(parseFloat(artificialUICache.ringOrbitInput.value) || orbit.min);
  }

  const widthBounds = getRingWidthBoundsKm();
  artificialUICache.ringWidthRange.min = widthBounds.min;
  artificialUICache.ringWidthRange.max = widthBounds.max;
  artificialUICache.ringWidthRange.step = '1000';
  artificialUICache.ringWidthInput.min = widthBounds.min;
  artificialUICache.ringWidthInput.max = widthBounds.max;
  artificialUICache.ringWidthInput.step = '1000';
  if (!isRingWidthFieldActive() && !artificialRingWidthEditing) {
    artificialUICache.ringWidthRange.value = clampRingWidthValue(parseFloat(artificialUICache.ringWidthRange.value) || widthBounds.min);
  }
  if (!artificialRingWidthEditing && document.activeElement !== artificialUICache.ringWidthInput) {
    artificialUICache.ringWidthInput.value = clampRingWidthValue(parseFloat(artificialUICache.ringWidthInput.value) || widthBounds.min);
  }

  artificialUICache.ringFluxRange.min = ARTIFICIAL_RING_FLUX_BOUNDS_WM2.min;
  artificialUICache.ringFluxRange.max = ARTIFICIAL_RING_FLUX_BOUNDS_WM2.max;
  artificialUICache.ringFluxRange.step = '1';
  artificialUICache.ringFluxInput.min = ARTIFICIAL_RING_FLUX_BOUNDS_WM2.min;
  artificialUICache.ringFluxInput.max = ARTIFICIAL_RING_FLUX_BOUNDS_WM2.max;
  artificialUICache.ringFluxInput.step = '1';
  if (!isRingFluxFieldActive() && !artificialRingFluxEditing) {
    artificialUICache.ringFluxRange.value = clampRingFluxValue(parseFloat(artificialUICache.ringFluxRange.value) || ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
  }
  if (!artificialRingFluxEditing && document.activeElement !== artificialUICache.ringFluxInput) {
    artificialUICache.ringFluxInput.value = clampRingFluxValue(parseFloat(artificialUICache.ringFluxInput.value) || ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
  }
}

function applyStarContextBounds() {
  if (!artificialUICache.starContext) return;
  if (getSelectedArtificialType(null) !== 'shell') return;
  const coreValue = artificialUICache.core ? artificialUICache.core.value : null;
  const coreConfig = typeof getArtificialCoreConfig === 'function' ? getArtificialCoreConfig(coreValue) : null;
  const allowStar = coreConfig ? coreConfig.allowStar !== false : true;
  const starOptions = getArtificialStarContexts();
  let starlessValue = artificialUICache.starContext.value;
  starOptions.forEach((option) => {
    if (option.hasStar === false) {
      starlessValue = option.value;
    }
  });
  for (let i = 0; i < artificialUICache.starContext.options.length; i += 1) {
    const opt = artificialUICache.starContext.options[i];
    const cfg = starOptions.find((entry) => entry.value === opt.value) || {};
    const isStarred = cfg.hasStar !== false;
    opt.disabled = cfg.disabled || (isStarred && !allowStar);
  }
  if (!allowStar) {
    artificialUICache.starContext.value = starlessValue;
  }
}

function getStashStep(resource) {
  const next = Math.max(1, Math.floor(artificialStashMultipliers[resource] || 1));
  artificialStashMultipliers[resource] = next;
  return next;
}

function setStashStep(resource, value) {
  const next = Math.max(1, Math.floor(value || 1));
  artificialStashMultipliers[resource] = next;
}

function getMaxStashAmount(resource, project, manager) {
  if (!project || !manager) return 0;
  const staged = resource === 'metal'
    ? (project.stockpile?.metal || project.initialDeposit?.metal || 0)
    : (project.stockpile?.silicon || project.initialDeposit?.silicon || 0);
  const remaining = Math.max(0, manager.getStockpileCap(project) - staged);
  if (!remaining) return 0;
  const colonyRes = resources && resources.colony ? resources.colony[resource] : null;
  const colonyAvailable = colonyRes ? colonyRes.value : 0;
  const storageProj = projectManager && projectManager.projects ? projectManager.projects.spaceStorage : null;
  const storageAvailable = storageProj && storageProj.getAvailableStoredResource
    ? storageProj.getAvailableStoredResource(resource)
    : 0;
  const prioritize = manager.getPrioritizeSpaceStorage();
  const total = prioritize ? storageAvailable + colonyAvailable : colonyAvailable + storageAvailable;
  return Math.min(remaining, total);
}

function ensureArtificialLayout() {
  const { content } = cacheArtificialUIElements();
  if (!content || content.dataset.rendered === 'true') return;

  content.innerHTML = '';

  const card = document.createElement('section');
  card.className = 'space-card artificial-card';

  const header = document.createElement('div');
  header.className = 'space-card-header artificial-header';
  const titleWrap = document.createElement('div');
  const title = document.createElement('h2');
  title.className = 'space-card-title';
  title.textContent = 'Artificial Worlds';
  const subtitle = document.createElement('p');
  subtitle.className = 'space-card-subtitle';
  subtitle.textContent = 'Forge bespoke habitats and slip through the void on your own timetable.';
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);
  artificialUICache.status = subtitle;
  header.appendChild(titleWrap);

  const state = document.createElement('div');
  state.className = 'artificial-state';
  state.textContent = 'Ready';
  header.appendChild(state);
  artificialUICache.state = state;

  const grid = document.createElement('div');
  grid.className = 'artificial-grid';

  // Blueprint panel
  const blueprint = document.createElement('div');
  blueprint.className = 'artificial-panel';
  const blueprintTitle = document.createElement('h3');
  blueprintTitle.textContent = 'Blueprint';
  blueprint.appendChild(blueprintTitle);

  const nameLabel = document.createElement('label');
  nameLabel.className = 'artificial-field';
  nameLabel.textContent = 'World name';
  const nameInput = document.createElement('input');
  nameInput.className = 'artificial-name';
  nameInput.placeholder = 'Artificial world';
  nameLabel.appendChild(nameInput);
  blueprint.appendChild(nameLabel);
  artificialUICache.nameInput = nameInput;

  const typeLabel = document.createElement('label');
  typeLabel.className = 'artificial-field';
  typeLabel.textContent = 'Framework';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'artificial-select';
  const typeOptions = getArtificialTypes();
  typeOptions.forEach((option) => {
    typeSelect.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
  });
  const defaultType = typeOptions.find((entry) => !entry.disabled) || typeOptions[0];
  typeSelect.value = defaultType ? defaultType.value : '';
  typeLabel.appendChild(typeSelect);
  blueprint.appendChild(typeLabel);
  artificialUICache.type = typeSelect;
  artificialUICache.typeField = typeLabel;

  const coreLabel = document.createElement('label');
  coreLabel.className = 'artificial-field';
  coreLabel.textContent = 'Core';
  const coreSelect = document.createElement('select');
  coreSelect.className = 'artificial-select';
  const coreOptions = getArtificialCores();
  coreOptions.forEach((option) => {
    coreSelect.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
  });
  const defaultCore = coreOptions.find((entry) => !entry.disabled) || coreOptions[0];
  coreSelect.value = defaultCore ? defaultCore.value : '';
  coreLabel.appendChild(coreSelect);
  blueprint.appendChild(coreLabel);
  artificialUICache.core = coreSelect;
  artificialUICache.coreField = coreLabel;

  const starLabel = document.createElement('label');
  starLabel.className = 'artificial-field';
  starLabel.textContent = 'Stellar context';
  const starSelect = document.createElement('select');
  starSelect.className = 'artificial-select';
  const starOptions = getArtificialStarContexts();
  starOptions.forEach((option) => {
    starSelect.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
  });
  const defaultStar = starOptions.find((entry) => !entry.disabled) || starOptions[0];
  starSelect.value = defaultStar ? defaultStar.value : '';
  starLabel.appendChild(starSelect);
  blueprint.appendChild(starLabel);
  artificialUICache.starContext = starSelect;
  artificialUICache.starContextField = starLabel;
  applyStarContextBounds();

  const ringStarCoreLabel = document.createElement('label');
  ringStarCoreLabel.className = 'artificial-field';
  ringStarCoreLabel.textContent = 'Star core';
  const ringStarCoreSelect = document.createElement('select');
  ringStarCoreSelect.className = 'artificial-select';
  const ringCoreOptions = getRingStarCoreOptions();
  ringCoreOptions.forEach((option) => {
    ringStarCoreSelect.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
  });
  const defaultRingCore = ringCoreOptions.find((entry) => !entry.disabled) || ringCoreOptions[0];
  ringStarCoreSelect.value = defaultRingCore ? defaultRingCore.value : '';
  ringStarCoreLabel.appendChild(ringStarCoreSelect);
  blueprint.appendChild(ringStarCoreLabel);
  artificialUICache.ringStarCore = ringStarCoreSelect;
  artificialUICache.ringStarCoreField = ringStarCoreLabel;

  const gravityRow = document.createElement('div');
  gravityRow.className = 'artificial-gravity-row';
  const gravityLabel = document.createElement('span');
  gravityLabel.textContent = 'Target gravity';
  const gravityValue = document.createElement('div');
  gravityValue.className = 'artificial-gravity';
  gravityValue.innerHTML = `1g <span class="info-tooltip-icon" title="HOPE is stubborn about certain things">&#9432;</span>`;
  gravityRow.appendChild(gravityLabel);
  gravityRow.appendChild(gravityValue);
  blueprint.appendChild(gravityRow);
  artificialUICache.gravityValue = gravityValue;

  const radiusLabel = document.createElement('div');
  radiusLabel.className = 'artificial-radius';
  const radiusTop = document.createElement('div');
  radiusTop.className = 'artificial-radius-row';
  const radiusText = document.createElement('span');
  radiusText.textContent = 'Radius (Earth radii)';
  const radiusValue = document.createElement('span');
  radiusValue.className = 'artificial-radius-value';
  radiusTop.appendChild(radiusText);
  radiusTop.appendChild(radiusValue);
  radiusLabel.appendChild(radiusTop);
  artificialUICache.radiusLabel = radiusValue;

  const radiusControls = document.createElement('div');
  radiusControls.className = 'artificial-radius-controls';

  const radiusRange = document.createElement('input');
  radiusRange.type = 'range';
  radiusRange.step = '0.01';
  radiusRange.value = '2';
  radiusRange.className = 'artificial-radius-range';
  artificialUICache.radiusRange = radiusRange;
  radiusControls.appendChild(radiusRange);

  const radiusInput = document.createElement('input');
  radiusInput.type = 'number';
  radiusInput.step = '0.01';
  radiusInput.value = '2';
  radiusInput.className = 'artificial-radius-input';
  artificialUICache.radiusInput = radiusInput;
  radiusControls.appendChild(radiusInput);

  const radiusAuto = document.createElement('button');
  radiusAuto.type = 'button';
  radiusAuto.className = 'artificial-secondary artificial-radius-auto';
  radiusAuto.textContent = 'Auto';
  radiusAuto.title = 'Set radius for a 5 hour construction time.';
  artificialUICache.radiusAuto = radiusAuto;
  radiusControls.appendChild(radiusAuto);
  radiusLabel.appendChild(radiusControls);

  const surfaceBox = document.createElement('div');
  surfaceBox.className = 'artificial-surface-box';
  const surfaceLabel = document.createElement('span');
  surfaceLabel.textContent = 'Surface';
  const area = document.createElement('div');
  area.className = 'artificial-area';
  area.textContent = 'Land area ready for plating.';
  artificialUICache.areaLabel = area;
  surfaceBox.appendChild(surfaceLabel);
  surfaceBox.appendChild(area);
  radiusLabel.appendChild(surfaceBox);

  blueprint.appendChild(radiusLabel);
  artificialUICache.radiusBox = radiusLabel;
  applyRadiusBounds();

  const ringOrbitBox = document.createElement('div');
  ringOrbitBox.className = 'artificial-radius artificial-ring-orbit';
  const ringOrbitTop = document.createElement('div');
  ringOrbitTop.className = 'artificial-radius-row';
  const ringOrbitText = document.createElement('span');
  ringOrbitText.textContent = 'Orbital radius (AU)';
  const ringOrbitInfo = document.createElement('span');
  ringOrbitInfo.className = 'info-tooltip-icon';
  ringOrbitInfo.innerHTML = '&#9432;';
  ringOrbitInfo.title = 'Ring orbital distance from the system star.';
  ringOrbitText.appendChild(document.createTextNode(' '));
  ringOrbitText.appendChild(ringOrbitInfo);
  const ringOrbitValue = document.createElement('span');
  ringOrbitValue.className = 'artificial-radius-value';
  ringOrbitTop.appendChild(ringOrbitText);
  ringOrbitTop.appendChild(ringOrbitValue);
  ringOrbitBox.appendChild(ringOrbitTop);
  artificialUICache.ringOrbitLabel = ringOrbitValue;

  const ringOrbitControls = document.createElement('div');
  ringOrbitControls.className = 'artificial-radius-controls';
  const ringOrbitRange = document.createElement('input');
  ringOrbitRange.type = 'range';
  ringOrbitRange.step = '0.001';
  ringOrbitRange.value = '0.1';
  ringOrbitRange.className = 'artificial-radius-range';
  artificialUICache.ringOrbitRange = ringOrbitRange;
  ringOrbitControls.appendChild(ringOrbitRange);

  const ringOrbitInput = document.createElement('input');
  ringOrbitInput.type = 'number';
  ringOrbitInput.step = '0.001';
  ringOrbitInput.value = '0.1';
  ringOrbitInput.className = 'artificial-radius-input';
  artificialUICache.ringOrbitInput = ringOrbitInput;
  ringOrbitControls.appendChild(ringOrbitInput);

  const ringAuto = document.createElement('button');
  ringAuto.type = 'button';
  ringAuto.className = 'artificial-secondary artificial-radius-auto';
  ringAuto.textContent = 'Auto';
  ringAuto.title = 'Max out width and set orbit for a 5 hour construction time.';
  artificialUICache.ringAuto = ringAuto;
  ringOrbitControls.appendChild(ringAuto);
  ringOrbitBox.appendChild(ringOrbitControls);
  blueprint.appendChild(ringOrbitBox);
  artificialUICache.ringOrbitBox = ringOrbitBox;

  const ringWidthBox = document.createElement('div');
  ringWidthBox.className = 'artificial-radius artificial-ring-width';
  const ringWidthTop = document.createElement('div');
  ringWidthTop.className = 'artificial-radius-row';
  const ringWidthText = document.createElement('span');
  ringWidthText.textContent = 'Width (km)';
  const ringWidthInfo = document.createElement('span');
  ringWidthInfo.className = 'info-tooltip-icon';
  ringWidthInfo.innerHTML = '&#9432;';
  ringWidthInfo.title = 'Usable surface width for the ring band (1000 km to 1,000,000 km).';
  ringWidthText.appendChild(document.createTextNode(' '));
  ringWidthText.appendChild(ringWidthInfo);
  const ringWidthValue = document.createElement('span');
  ringWidthValue.className = 'artificial-radius-value';
  ringWidthTop.appendChild(ringWidthText);
  ringWidthTop.appendChild(ringWidthValue);
  ringWidthBox.appendChild(ringWidthTop);
  artificialUICache.ringWidthLabel = ringWidthValue;

  const ringWidthControls = document.createElement('div');
  ringWidthControls.className = 'artificial-radius-controls';
  const ringWidthRange = document.createElement('input');
  ringWidthRange.type = 'range';
  ringWidthRange.step = '1000';
  ringWidthRange.value = '10000';
  ringWidthRange.className = 'artificial-radius-range';
  artificialUICache.ringWidthRange = ringWidthRange;
  ringWidthControls.appendChild(ringWidthRange);

  const ringWidthInput = document.createElement('input');
  ringWidthInput.type = 'number';
  ringWidthInput.step = '1000';
  ringWidthInput.value = '10000';
  ringWidthInput.className = 'artificial-radius-input';
  artificialUICache.ringWidthInput = ringWidthInput;
  ringWidthControls.appendChild(ringWidthInput);
  ringWidthBox.appendChild(ringWidthControls);
  blueprint.appendChild(ringWidthBox);
  artificialUICache.ringWidthBox = ringWidthBox;

  const ringFluxBox = document.createElement('div');
  ringFluxBox.className = 'artificial-radius artificial-ring-flux';
  const ringFluxTop = document.createElement('div');
  ringFluxTop.className = 'artificial-radius-row';
  const ringFluxText = document.createElement('span');
  ringFluxText.textContent = 'Target flux (W/m²)';
  const ringFluxInfo = document.createElement('span');
  ringFluxInfo.className = 'info-tooltip-icon';
  ringFluxInfo.innerHTML = '&#9432;';
  ringFluxInfo.title = 'Stellar flux at the ringworld orbit (1200–1500 W/m²).';
  ringFluxText.appendChild(document.createTextNode(' '));
  ringFluxText.appendChild(ringFluxInfo);
  const ringFluxValue = document.createElement('span');
  ringFluxValue.className = 'artificial-radius-value';
  ringFluxTop.appendChild(ringFluxText);
  ringFluxTop.appendChild(ringFluxValue);
  ringFluxBox.appendChild(ringFluxTop);
  artificialUICache.ringFluxLabel = ringFluxValue;

  const ringFluxControls = document.createElement('div');
  ringFluxControls.className = 'artificial-radius-controls';
  const ringFluxRange = document.createElement('input');
  ringFluxRange.type = 'range';
  ringFluxRange.step = '1';
  ringFluxRange.value = String(ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
  ringFluxRange.className = 'artificial-radius-range';
  artificialUICache.ringFluxRange = ringFluxRange;
  ringFluxControls.appendChild(ringFluxRange);

  const ringFluxInput = document.createElement('input');
  ringFluxInput.type = 'number';
  ringFluxInput.step = '1';
  ringFluxInput.value = String(ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
  ringFluxInput.className = 'artificial-radius-input';
  artificialUICache.ringFluxInput = ringFluxInput;
  ringFluxControls.appendChild(ringFluxInput);
  ringFluxBox.appendChild(ringFluxControls);
  blueprint.appendChild(ringFluxBox);
  artificialUICache.ringFluxBox = ringFluxBox;

  applyRingBounds();

  grid.appendChild(blueprint);

  // Cost panel
  const costs = document.createElement('div');
  costs.className = 'artificial-panel';
  const costTitle = document.createElement('h3');
  costTitle.textContent = 'Materials & Time';
  costs.appendChild(costTitle);

  const { row: metalRow, valueEl: metalValue } = buildCostRow('Metal', 'artificial-cost-metal');
  const { row: superRow, valueEl: superValue } = buildCostRow('Superalloys', 'artificial-cost-super');
  artificialUICache.costMetal = metalValue;
  artificialUICache.costMetalRow = metalRow;
  artificialUICache.costSuperalloy = superValue;

  const costList = document.createElement('div');
  costList.className = 'artificial-costs';
  costList.appendChild(metalRow);
  costList.appendChild(superRow);
  costs.appendChild(costList);

  const durationRow = document.createElement('div');
  durationRow.className = 'artificial-duration';
  const durationLabel = document.createElement('span');
  durationLabel.textContent = 'Construction time';
  const durationValue = document.createElement('span');
  durationValue.className = 'artificial-duration-value';
  const durationInfo = document.createElement('span');
  durationInfo.className = 'info-tooltip-icon';
  durationInfo.innerHTML = '&#9432;';
  artificialUICache.durationValue = durationValue;
  artificialUICache.durationTooltip = durationInfo;
  durationRow.appendChild(durationLabel);
  durationRow.appendChild(durationValue);
  durationRow.appendChild(durationInfo);
  costs.appendChild(durationRow);

  const priorityLabel = document.createElement('label');
  priorityLabel.className = 'artificial-priority';
  const priorityCheckbox = document.createElement('input');
  priorityCheckbox.type = 'checkbox';
  priorityCheckbox.checked = true;
  artificialUICache.priority = priorityCheckbox;
  priorityLabel.appendChild(priorityCheckbox);
  const priorityText = document.createElement('span');
  priorityText.textContent = 'Prioritize space storage payments';
  priorityLabel.appendChild(priorityText);
  costs.appendChild(priorityLabel);

  const startBtn = document.createElement('button');
  startBtn.className = 'artificial-primary';
  startBtn.textContent = 'Start Artificial World';
  artificialUICache.startBtn = startBtn;
  costs.appendChild(startBtn);

  const gains = document.createElement('div');
  gains.className = 'artificial-gains';
  const gainsTitle = document.createElement('h3');
  gainsTitle.textContent = 'Gains when Terraformed';
  gains.appendChild(gainsTitle);
  const gainsList = document.createElement('div');
  gainsList.className = 'artificial-gains-list';
  const distinctRow = document.createElement('div');
  distinctRow.className = 'artificial-gain-row';
  const distinctLabel = document.createElement('span');
  distinctLabel.textContent = 'Distinct worlds:';
  const distinctValue = document.createElement('span');
  distinctValue.className = 'artificial-gain-value';
  artificialUICache.gainDistinct = distinctValue;
  distinctRow.appendChild(distinctLabel);
  distinctRow.appendChild(distinctValue);
  const effectiveRow = document.createElement('div');
  effectiveRow.className = 'artificial-gain-row';
  const effectiveLabel = document.createElement('span');
  effectiveLabel.textContent = 'Counts as:';
  const effectiveValue = document.createElement('span');
  effectiveValue.className = 'artificial-gain-value';
  effectiveValue.title = 'Effective terraformed worlds contributed by this construct.';
  artificialUICache.gainEffective = effectiveValue;
  effectiveRow.appendChild(effectiveLabel);
  effectiveRow.appendChild(effectiveValue);
  const defenseRow = document.createElement('div');
  defenseRow.className = 'artificial-gain-row';
  const defenseLabel = document.createElement('span');
  defenseLabel.textContent = 'Worlds for sector defense:';
  const defenseValue = document.createElement('span');
  defenseValue.className = 'artificial-gain-value';
  artificialUICache.gainDefense = defenseValue;
  defenseRow.appendChild(defenseLabel);
  defenseRow.appendChild(defenseValue);
  const fleetRow = document.createElement('div');
  fleetRow.className = 'artificial-gain-row';
  const fleetLabel = document.createElement('span');
  fleetLabel.textContent = 'Worlds for fleet capacity:';
  const fleetInfo = document.createElement('span');
  fleetInfo.className = 'info-tooltip-icon';
  fleetInfo.innerHTML = '&#9432;';
  fleetInfo.title = 'Artificial worlds cannot use their full power for direct military purposes.  If they did, they would become a critical military target for alien superweapons, which they cannot dodge.  This number will increase rectroactively if galactic superweapons are shut down.';
  const fleetValue = document.createElement('span');
  fleetValue.className = 'artificial-gain-value';
  artificialUICache.gainFleet = fleetValue;
  artificialUICache.gainFleetTooltip = fleetInfo;
  fleetRow.appendChild(fleetLabel);
  fleetRow.appendChild(fleetValue);
  fleetInfo.style.color = '#63a6ff';
  fleetInfo.style.marginLeft = '6px';
  fleetRow.appendChild(fleetInfo);
  gainsList.appendChild(distinctRow);
  gainsList.appendChild(effectiveRow);
  gainsList.appendChild(defenseRow);
  gainsList.appendChild(fleetRow);
  gains.appendChild(gainsList);

  const effects = document.createElement('div');
  effects.className = 'artificial-effects';
  const effectsTitle = document.createElement('h3');
  effectsTitle.textContent = 'Effects';
  effects.appendChild(effectsTitle);
  const effectsList = document.createElement('div');
  effectsList.className = 'artificial-effects-list';
  const shipRow = document.createElement('div');
  shipRow.className = 'artificial-effect-row artificial-effect-penalty';
  const shipLabel = document.createElement('span');
  shipLabel.textContent = 'Spaceship energy costs:';
  const shipValue = document.createElement('span');
  shipValue.className = 'artificial-effect-value';
  artificialUICache.effectShipEnergy = shipValue;
  artificialUICache.effectShipEnergyRow = shipRow;
  artificialUICache.effectShipEnergyLabel = shipLabel;
  shipRow.appendChild(shipLabel);
  shipRow.appendChild(shipValue);
  effectsList.appendChild(shipRow);
  effects.appendChild(effectsList);
  gains.appendChild(effects);

  // Sector selection
  const sectorLabel = document.createElement('label');
  sectorLabel.className = 'artificial-field';
  sectorLabel.textContent = 'Sector';
  const sectorSelect = document.createElement('select');
  sectorSelect.className = 'artificial-select';
  // Populate with options later in updateArtificialUI
  sectorLabel.appendChild(sectorSelect);
  artificialUICache.sector = sectorSelect;
  gains.appendChild(sectorLabel);

  const sectorFilterLabel = document.createElement('label');
  sectorFilterLabel.className = 'artificial-field';
  sectorFilterLabel.textContent = 'Filter +Resource';
  const sectorFilterSelect = document.createElement('select');
  sectorFilterSelect.className = 'artificial-select';
  sectorFilterLabel.appendChild(sectorFilterSelect);
  artificialUICache.sectorFilter = sectorFilterSelect;
  gains.appendChild(sectorFilterLabel);

  costs.appendChild(gains);

  grid.appendChild(costs);

  // Stash panel
  const stash = document.createElement('div');
  stash.className = 'artificial-panel artificial-stash';
  const stashTitle = document.createElement('h3');
  stashTitle.textContent = 'Starting stockpile';
  stash.appendChild(stashTitle);

  const stashList = document.createElement('div');
  stashList.className = 'artificial-stash-list';

  const createStashRow = (resource, label) => {
    const row = document.createElement('div');
    row.className = 'artificial-stash-block artificial-stash-row';

    const header = document.createElement('div');
    header.className = 'artificial-stash-row-header';
    const title = document.createElement('span');
    title.className = 'artificial-stash-title';
    title.textContent = label;
    const capInfo = document.createElement('span');
    capInfo.className = 'info-tooltip-icon';
    capInfo.innerHTML = '&#9432;';
    header.appendChild(title);
    header.appendChild(capInfo);
    row.appendChild(header);

    const body = document.createElement('div');
    body.className = 'artificial-stash-body';

    const staged = document.createElement('div');
    staged.className = 'artificial-stash-stock';
    body.appendChild(staged);

    const controls = document.createElement('div');
    controls.className = 'artificial-stash-controls';
    const divBtn = document.createElement('button');
    divBtn.className = 'artificial-stash-btn';
    divBtn.textContent = '/10';
    const mulBtn = document.createElement('button');
    mulBtn.className = 'artificial-stash-btn';
    mulBtn.textContent = 'x10';
    const addBtn = document.createElement('button');
    addBtn.className = 'artificial-stash-btn artificial-stash-add';
    controls.append(addBtn, mulBtn, divBtn);
    const maxBtn = document.createElement('button');
    maxBtn.className = 'artificial-stash-btn artificial-stash-max';
    maxBtn.textContent = '+Max';
    controls.insertBefore(maxBtn, mulBtn);
    body.appendChild(controls);
    row.appendChild(body);

    artificialUICache.stashControls[resource] = {
      divBtn,
      mulBtn,
      addBtn,
      maxBtn,
      stock: staged,
      capInfo
    };

    return row;
  };

  stashList.appendChild(createStashRow('metal', 'Metal'));
  stashList.appendChild(createStashRow('silicon', 'Silica'));

  stash.appendChild(stashList);

  const bailoutRow = document.createElement('div');
  bailoutRow.className = 'artificial-stash-block artificial-stash-row artificial-bailout-row';
  const bailoutHeader = document.createElement('div');
  bailoutHeader.className = 'artificial-stash-row-header';
  const bailoutTitle = document.createElement('span');
  bailoutTitle.className = 'artificial-stash-title';
  bailoutTitle.textContent = 'Solis Bailout';
  const bailoutInfo = document.createElement('span');
  bailoutInfo.className = 'info-tooltip-icon';
  bailoutInfo.innerHTML = '&#9432;';
  bailoutInfo.title = 'Spend 10 alien artifacts to receive 100M metal and 100M silica for this world. Bypasses storage cap. Only available on artificial worlds.';
  bailoutHeader.append(bailoutTitle, bailoutInfo);
  bailoutRow.appendChild(bailoutHeader);

  const bailoutBody = document.createElement('div');
  bailoutBody.className = 'artificial-stash-body';
  const bailoutStock = document.createElement('div');
  bailoutStock.className = 'artificial-stash-stock';
  bailoutStock.textContent = 'Cost: 10 artifacts';
  const bailoutControls = document.createElement('div');
  bailoutControls.className = 'artificial-stash-controls';
  const bailoutBtn = document.createElement('button');
  bailoutBtn.className = 'artificial-stash-btn artificial-stash-add';
  bailoutBtn.textContent = '+100M metal & silica';
  bailoutControls.appendChild(bailoutBtn);
  bailoutBody.append(bailoutStock, bailoutControls);
  bailoutRow.appendChild(bailoutBody);

  artificialUICache.bailoutBtn = bailoutBtn;
  artificialUICache.bailoutStock = bailoutStock;

  stashList.appendChild(bailoutRow);

  const stashRecommend = document.createElement('div');
  stashRecommend.className = 'artificial-stash-recommend';
  stashRecommend.textContent = 'Recommend staging at least 1.00B of each resource.';
  artificialUICache.stashRecommend = stashRecommend;
  stash.appendChild(stashRecommend);

  grid.appendChild(stash);

  card.appendChild(header);
  card.appendChild(grid);

  // Progress panel
  const progressPanel = document.createElement('div');
  progressPanel.className = 'artificial-panel artificial-progress-card';
  const progressHeader = document.createElement('div');
  progressHeader.className = 'artificial-progress-header';
  const progressLabel = document.createElement('span');
  progressLabel.id = 'artificial-progress-label';
  progressHeader.appendChild(progressLabel);
  artificialUICache.progressLabel = progressLabel;
  const { wrap: progressWrap, fill: progressFill } = createProgressBar();
  artificialUICache.progressFill = progressFill;
  progressPanel.appendChild(progressHeader);
  progressPanel.appendChild(progressWrap);

  const actions = document.createElement('div');
  actions.className = 'artificial-actions';
  const stopBtn = document.createElement('button');
  stopBtn.className = 'artificial-secondary';
  stopBtn.textContent = 'Cancel Construction';
  artificialUICache.stopBtn = stopBtn;
  actions.appendChild(stopBtn);
  const travelBtn = document.createElement('button');
  travelBtn.className = 'artificial-primary';
  travelBtn.textContent = 'Travel to Constructed World';
  artificialUICache.travelBtn = travelBtn;
  actions.appendChild(travelBtn);
  progressPanel.appendChild(actions);

  card.appendChild(progressPanel);

  // History panel
  const history = document.createElement('div');
  history.className = 'artificial-panel artificial-history-card';
  const historyHeader = document.createElement('div');
  historyHeader.className = 'artificial-history-header';
  const historyTitle = document.createElement('h3');
  historyTitle.textContent = 'Constructed worlds';
  historyHeader.appendChild(historyTitle);
  const pager = document.createElement('div');
  pager.className = 'artificial-history-pager';
  const prev = document.createElement('button');
  prev.textContent = 'Prev';
  const page = document.createElement('span');
  page.textContent = '0/0';
  const next = document.createElement('button');
  next.textContent = 'Next';
  pager.appendChild(prev);
  pager.appendChild(page);
  pager.appendChild(next);
  historyHeader.appendChild(pager);
  history.appendChild(historyHeader);
  artificialUICache.historyPrev = prev;
  artificialUICache.historyNext = next;
  artificialUICache.historyPage = page;

  const historyList = document.createElement('div');
  historyList.className = 'artificial-history-list';
  artificialUICache.historyList = historyList;
  history.appendChild(historyList);

  card.appendChild(history);

  content.appendChild(card);
  content.dataset.rendered = 'true';

  // Bind events
  typeSelect.addEventListener('change', () => {
    applyRadiusBounds();
    applyStarContextBounds();
    applyRingBounds();
    updateArtificialUI({ force: true });
  });

  radiusRange.addEventListener('input', () => {
    const value = clampRadiusValue(parseFloat(radiusRange.value) || 0);
    radiusRange.value = value;
    radiusInput.value = value;
    updateArtificialUI();
  });
  radiusInput.addEventListener('input', () => {
    if (artificialUICache.radiusRange) {
      const value = parseFloat(radiusInput.value) || 0;
      const clamped = clampRadiusValue(value);
      artificialUICache.radiusRange.value = clamped;
    }
  });
  radiusInput.addEventListener('focus', () => {
    artificialRadiusEditing = true;
  });
  radiusInput.addEventListener('blur', () => {
    artificialRadiusEditing = false;
    const value = clampRadiusValue(parseFloat(radiusInput.value) || 0);
    setRadiusFields(value, true);
    updateArtificialUI();
  });
  radiusAuto.addEventListener('click', () => {
    artificialRadiusEditing = false;
    const value = getAutoRadiusValue();
    setRadiusFields(value, true);
    updateArtificialUI();
  });

  ringStarCoreSelect.addEventListener('change', () => {
    applyRingBounds();
    updateArtificialUI();
  });
  ringOrbitRange.addEventListener('input', () => {
    const value = clampRingOrbitValue(parseFloat(ringOrbitRange.value) || 0);
    ringOrbitRange.value = value;
    ringOrbitInput.value = value;
    updateArtificialUI();
  });
  ringOrbitInput.addEventListener('input', () => {
    if (artificialUICache.ringOrbitRange) {
      const value = parseFloat(ringOrbitInput.value) || 0;
      artificialUICache.ringOrbitRange.value = clampRingOrbitValue(value);
    }
  });
  ringOrbitInput.addEventListener('focus', () => {
    artificialRingOrbitEditing = true;
  });
  ringOrbitInput.addEventListener('blur', () => {
    artificialRingOrbitEditing = false;
    const value = clampRingOrbitValue(parseFloat(ringOrbitInput.value) || 0);
    setRingOrbitFields(value, true);
    updateArtificialUI();
  });
  ringAuto.addEventListener('click', () => {
    artificialRingOrbitEditing = false;
    artificialRingWidthEditing = false;
    const widthBounds = getRingWidthBoundsKm();
    const widthValue = widthBounds.max;
    setRingWidthFields(widthValue, true);
    const orbitValue = getAutoRingOrbitValue(widthValue);
    setRingOrbitFields(orbitValue, true);
    updateArtificialUI();
  });
  ringWidthRange.addEventListener('input', () => {
    const value = clampRingWidthValue(parseFloat(ringWidthRange.value) || 0);
    ringWidthRange.value = value;
    ringWidthInput.value = value;
    updateArtificialUI();
  });
  ringWidthInput.addEventListener('input', () => {
    if (artificialUICache.ringWidthRange) {
      const value = parseFloat(ringWidthInput.value) || 0;
      artificialUICache.ringWidthRange.value = clampRingWidthValue(value);
    }
  });
  ringWidthInput.addEventListener('focus', () => {
    artificialRingWidthEditing = true;
  });
  ringWidthInput.addEventListener('blur', () => {
    artificialRingWidthEditing = false;
    const value = clampRingWidthValue(parseFloat(ringWidthInput.value) || 0);
    setRingWidthFields(value, true);
    updateArtificialUI();
  });
  ringFluxRange.addEventListener('input', () => {
    const value = clampRingFluxValue(parseFloat(ringFluxRange.value) || 0);
    ringFluxRange.value = value;
    ringFluxInput.value = value;
    updateArtificialUI();
  });
  ringFluxInput.addEventListener('input', () => {
    const value = parseFloat(ringFluxInput.value) || 0;
    artificialUICache.ringFluxRange.value = clampRingFluxValue(value);
  });
  ringFluxInput.addEventListener('focus', () => {
    artificialRingFluxEditing = true;
  });
  ringFluxInput.addEventListener('blur', () => {
    artificialRingFluxEditing = false;
    const value = clampRingFluxValue(parseFloat(ringFluxInput.value) || 0);
    setRingFluxFields(value, true);
    updateArtificialUI();
  });

  nameInput.addEventListener('input', () => {
    artificialManager?.setActiveProjectName(nameInput.value);
  });
  nameInput.addEventListener('blur', () => {
    artificialManager?.setActiveProjectName(nameInput.value);
  });
  priorityCheckbox.addEventListener('change', () => {
    if (artificialManager) {
      artificialManager.setPrioritizeSpaceStorage(priorityCheckbox.checked);
    }
    updateArtificialUI();
  });
  startBtn.addEventListener('click', () => {
    if (!artificialManager) return;
    const type = artificialUICache.type ? artificialUICache.type.value : 'shell';
    if (type === 'shell') {
      artificialManager.startShellConstruction({
        radiusEarth: clampRadiusValue(parseFloat(radiusRange.value) || 1),
        core: artificialUICache.core.value,
        starContext: artificialUICache.starContext ? artificialUICache.starContext.value : undefined,
        name: artificialUICache.nameInput ? artificialUICache.nameInput.value : '',
        sector: artificialUICache.sector ? artificialUICache.sector.value : undefined
      });
      return;
    }
    if (type === 'ring') {
      artificialManager.startRingConstruction({
        starCore: artificialUICache.ringStarCore ? artificialUICache.ringStarCore.value : undefined,
        orbitRadiusAU: clampRingOrbitValue(parseFloat(ringOrbitRange.value) || 0.1),
        widthKm: clampRingWidthValue(parseFloat(ringWidthRange.value) || 10_000),
        targetFluxWm2: clampRingFluxValue(parseFloat(ringFluxRange.value) || ARTIFICIAL_RING_FLUX_DEFAULT_WM2),
        name: artificialUICache.nameInput ? artificialUICache.nameInput.value : '',
        sector: artificialUICache.sector ? artificialUICache.sector.value : undefined
      });
    }
  });
  coreSelect.addEventListener('change', () => {
    applyRadiusBounds();
    applyStarContextBounds();
    updateArtificialUI();
  });
  sectorFilterSelect.addEventListener('change', () => {
    artificialUICache.sector.value = 'auto';
    updateArtificialUI({ force: true });
  });
  stopBtn.addEventListener('click', () => {
    const manager = artificialManager;
    if (!manager || !manager.activeProject) return;
    if (manager.activeProject.status === 'building') {
      manager.cancelConstruction();
      return;
    }
    if (manager.activeProject.status === 'completed') {
      manager.discardConstructedWorld();
    }
  });
  travelBtn.addEventListener('click', () => {
    if (!artificialManager) return;
    const warning = artificialManager.getTravelWarning?.();
    if (warning) {
      showTravelWarningPopup(warning, () => artificialManager.travelToConstructedWorld());
      return;
    }
    artificialManager.travelToConstructedWorld();
  });
  prev.addEventListener('click', () => {
    if (artificialHistoryPage > 0) {
      artificialHistoryPage -= 1;
      renderArtificialHistory();
    }
  });
  next.addEventListener('click', () => {
    artificialHistoryPage += 1;
    renderArtificialHistory();
  });

  const attachStashHandlers = (resource) => {
    const controls = artificialUICache.stashControls[resource];
    if (!controls) return;
    controls.divBtn.addEventListener('click', () => {
      setStashStep(resource, getStashStep(resource) / 10);
      updateArtificialUI();
    });
    controls.mulBtn.addEventListener('click', () => {
      setStashStep(resource, getStashStep(resource) * 10);
      updateArtificialUI();
    });
    controls.addBtn.addEventListener('click', () => {
      const manager = artificialManager;
      if (!manager || !manager.activeProject) return;
      const amount = getStashStep(resource);
      const payload = resource === 'metal' ? { metal: amount } : { silicon: amount };
      manager.addStockpile(payload);
    });
    if (controls.maxBtn) {
      controls.maxBtn.addEventListener('click', () => {
        const manager = artificialManager;
        if (!manager || !manager.activeProject) return;
        const amount = getMaxStashAmount(resource, manager.activeProject, manager);
        if (!amount) return;
        const payload = resource === 'metal' ? { metal: amount } : { silicon: amount };
        manager.addStockpile(payload);
      });
    }
  };

  attachStashHandlers('metal');
  attachStashHandlers('silicon');

  if (artificialUICache.bailoutBtn) {
    artificialUICache.bailoutBtn.addEventListener('click', () => {
      artificialManager?.claimSolisBailout();
    });
  }

  renderArtificialHistory(true);
}

function toggleArtificialTabVisibility(isEnabled) {
  const { button, content, storyButton, storyContent } = cacheArtificialUIElements();
  if (!button || !content) return;

  const shouldHide = !isEnabled;
  button.classList.toggle('hidden', shouldHide);
  content.classList.toggle('hidden', shouldHide);

  if (shouldHide && button.classList.contains('active')) {
    button.classList.remove('active');
    content.classList.remove('active');
    if (storyButton) storyButton.classList.add('active');
    if (storyContent) storyContent.classList.add('active');
  }

  if (!shouldHide) {
    ensureArtificialLayout();
  }
}

function getRadiusValue() {
  if (!artificialUICache.radiusRange) return 1;
  if (artificialRadiusEditing || document.activeElement === artificialUICache.radiusInput) {
    return clampRadiusValue(parseFloat(artificialUICache.radiusInput.value) || 1);
  }
  return clampRadiusValue(parseFloat(artificialUICache.radiusRange.value) || 1);
}

function getRingOrbitRadiusAUValue() {
  if (!artificialUICache.ringOrbitRange) return 0.1;
  if (artificialRingOrbitEditing || document.activeElement === artificialUICache.ringOrbitInput) {
    return clampRingOrbitValue(parseFloat(artificialUICache.ringOrbitInput.value) || 0.1);
  }
  return clampRingOrbitValue(parseFloat(artificialUICache.ringOrbitRange.value) || 0.1);
}

function getRingWidthKmValue() {
  if (!artificialUICache.ringWidthRange) return 10_000;
  if (artificialRingWidthEditing || document.activeElement === artificialUICache.ringWidthInput) {
    return clampRingWidthValue(parseFloat(artificialUICache.ringWidthInput.value) || 10_000);
  }
  return clampRingWidthValue(parseFloat(artificialUICache.ringWidthRange.value) || 10_000);
}

function getRingFluxWm2Value() {
  if (artificialRingFluxEditing || document.activeElement === artificialUICache.ringFluxInput) {
    return clampRingFluxValue(parseFloat(artificialUICache.ringFluxInput.value) || ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
  }
  return clampRingFluxValue(parseFloat(artificialUICache.ringFluxRange.value) || ARTIFICIAL_RING_FLUX_DEFAULT_WM2);
}

function renderArtificialHistory(force = false) {
  const manager = artificialManager;
  if (!manager || !artificialUICache.historyList || !artificialUICache.historyPage) return;
  const entries = typeof manager.getHistoryEntries === 'function' ? manager.getHistoryEntries() : (manager.history || []);
  const pageSize = 6;
  const maxPage = Math.max(0, Math.ceil(entries.length / pageSize) - 1);
  artificialHistoryPage = Math.min(artificialHistoryPage, maxPage);
  const start = artificialHistoryPage * pageSize;
  const slice = entries.slice(start, start + pageSize);
  const sig = JSON.stringify({
    page: artificialHistoryPage,
    total: entries.length,
    items: slice.map((entry) => [
      entry.id,
      entry.name,
      entry.type,
      entry.landHa,
      entry.terraformedValue,
      entry.status,
      entry.canTravel
    ])
  });
  if (!force && sig === artificialHistorySig) return;
  artificialHistorySig = sig;

  artificialUICache.historyList.innerHTML = '';
  artificialUICache.historyList.appendChild(buildHistoryHeader());
  slice.forEach((entry) => {
    artificialUICache.historyList.appendChild(buildHistoryRow(entry));
  });
  artificialUICache.historyPage.textContent = `${entries.length ? artificialHistoryPage + 1 : 0}/${Math.max(maxPage + 1, 1)}`;
  if (artificialUICache.historyPrev) {
    artificialUICache.historyPrev.disabled = artificialHistoryPage === 0;
  }
  if (artificialUICache.historyNext) {
    artificialUICache.historyNext.disabled = artificialHistoryPage >= maxPage;
  }
}

function renderProgress(project) {
  if (!artificialUICache.progressFill || !artificialUICache.progressLabel) return;
  if (!project) {
    artificialUICache.progressFill.style.width = '0%';
    artificialUICache.progressLabel.textContent = 'No active project';
    artificialUICache.stopBtn.disabled = true;
    artificialUICache.stopBtn.textContent = 'Cancel Construction';
    artificialUICache.stopBtn.title = '';
    artificialUICache.travelBtn.disabled = true;
    return;
  }
  const label = artificialUICache.progressLabel;
  if (project.status === 'building') {
    const pct = Math.max(0, Math.min(100, (1 - project.remainingMs / project.durationMs) * 100));
    artificialUICache.progressFill.style.width = `${pct}%`;
    const remaining = formatDuration(project.remainingMs / 1000);
    label.textContent = `${project.name} — ${remaining} remaining`;
    artificialUICache.stopBtn.disabled = false;
    artificialUICache.stopBtn.textContent = 'Cancel Construction';
    artificialUICache.stopBtn.title = 'Cancel the active build';
    artificialUICache.travelBtn.disabled = true;
    return;
  }
  if (project.status === 'completed') {
    artificialUICache.progressFill.style.width = '100%';
    label.textContent = `${project.name} complete. Ready to travel.`;
    artificialUICache.stopBtn.disabled = false;
    artificialUICache.stopBtn.textContent = 'Discard World';
    artificialUICache.stopBtn.title = 'Discard this completed world';
    artificialUICache.travelBtn.disabled = false;
    return;
  }
  label.textContent = 'Idle';
  artificialUICache.stopBtn.disabled = true;
  artificialUICache.stopBtn.textContent = 'Cancel Construction';
  artificialUICache.stopBtn.title = '';
}

function renderStash(project, manager) {
  const active = !!project;
  const metal = project?.stockpile?.metal || project?.initialDeposit?.metal || 0;
  const silicon = project?.stockpile?.silicon || project?.initialDeposit?.silicon || 0;
  const fmt = formatNumber || ((n) => n);
  const cap = manager.getStockpileCap(project);
  const capLabel = cap ? fmt(cap, false, 2) : '0';
  const landLabel = fmt(cap, false, 2);
  const capTitle = cap
    ? `Stockpiles cap at ${capLabel} based on 1 ton per hectare (${landLabel} ha).`
    : 'Start construction to stage resources.';

  if (artificialUICache.stashRecommend) {
    artificialUICache.stashRecommend.classList.toggle('hidden', !active);
  }

  Object.entries(artificialUICache.stashControls || {}).forEach(([resource, controls]) => {
    if (!controls) return;
    const staged = resource === 'metal' ? metal : silicon;
    const remaining = Math.max(0, cap - staged);
    const step = getStashStep(resource);
    const planned = active ? Math.min(step, remaining) : step;
    const payload = resource === 'metal' ? { metal: planned } : { silicon: planned };
    const canAfford = active && planned > 0 && manager
      ? manager.canCoverCost(payload)
      : false;
    const maxAmount = active ? getMaxStashAmount(resource, project, manager) : 0;
    const cappedOut = active && remaining === 0;
    if (controls.capInfo) {
      controls.capInfo.title = capTitle;
    }
    if (controls.stock) {
      controls.stock.textContent = active ? fmt(staged, false, 2) : '—';
      controls.stock.title = active ? `Cap: ${capLabel}` : '';
      controls.stock.classList.toggle('artificial-stash-unaffordable', active && !cappedOut && !canAfford);
      controls.stock.classList.toggle('artificial-stash-capped', active && cappedOut);
    }
    if (controls.addBtn) {
      controls.addBtn.textContent = `+${fmt(planned, false, 0)}`;
      controls.addBtn.disabled = !active || !canAfford || cappedOut || planned <= 0;
      controls.addBtn.classList.toggle('artificial-stash-unaffordable', active && !cappedOut && !canAfford);
      controls.addBtn.classList.toggle('artificial-stash-capped', active && cappedOut);
      if (!active) {
        controls.addBtn.title = 'Begin construction to stage resources';
      } else if (cappedOut) {
        controls.addBtn.title = `Stockpile full (cap ${capLabel})`;
      } else if (!canAfford) {
        controls.addBtn.title = 'Insufficient resources';
      } else {
        controls.addBtn.title = 'Add to launch stash';
      }
    }
    if (controls.divBtn) controls.divBtn.disabled = !active;
    if (controls.mulBtn) controls.mulBtn.disabled = !active;
    if (controls.maxBtn) {
      const disabled = !active || maxAmount <= 0;
      controls.maxBtn.textContent = maxAmount > 0 ? `+${fmt(maxAmount, false, 0)}` : '+Max';
      controls.maxBtn.disabled = disabled;
      controls.maxBtn.classList.toggle('artificial-stash-unaffordable', disabled);
      if (!active) {
        controls.maxBtn.title = 'Begin construction to stage resources';
      } else if (maxAmount <= 0 && cappedOut) {
        controls.maxBtn.title = `Stockpile full (cap ${capLabel})`;
      } else if (maxAmount <= 0) {
        controls.maxBtn.title = 'Insufficient resources';
      } else {
        controls.maxBtn.title = `Fill stash (+${fmt(maxAmount, false, 0)})`;
      }
    }
  });
}

function renderBailout(project, manager) {
  const btn = artificialUICache.bailoutBtn;
  const stock = artificialUICache.bailoutStock;
  if (!btn || !stock) return;
  const artifacts = resources?.special?.alienArtifact;
  const available = artifacts ? artifacts.value : 0;
  const fmt = formatNumber || ((n) => n);
  stock.textContent = 'Cost: 10 artifacts';
  const onArtificial = manager ? manager.isCurrentWorldArtificial() : false;
  const canAfford = artifacts && available >= 10;
  const allowed = onArtificial && canAfford;
  btn.disabled = !allowed;
  btn.classList.toggle('artificial-stash-unaffordable', !allowed);
  btn.title = '';
  if (!allowed) {
    if (!onArtificial) {
      btn.title = 'Available only on an artificial world.';
    } else if (!canAfford) {
      btn.title = 'Need 10 alien artifacts.';
    }
  }
}

function renderCosts(project, selection, manager) {
  const type = project?.type || selection?.type || 'shell';
  const r = project ? project.radiusEarth : selection.radiusEarth;
  const area = project ? (project.areaHa || project.landHa) : manager.calculateAreaHectares(r);
  const baseCost = project ? project.cost : manager.calculateCost(r);
  const cost = type === 'ring'
    ? { superalloys: project ? baseCost.superalloys : baseCost.superalloys * 5 }
    : baseCost;
  const durationContext = project
    ? { durationMs: project.durationMs, worldCount: project.worldDivisor || 1 }
    : manager.getDurationContext(r);

  const fmt = formatNumber || ((n) => n);
  if (artificialUICache.costMetalRow) {
    artificialUICache.costMetalRow.classList.toggle('hidden', type === 'ring');
  }
  if (type === 'ring') {
    const orbitAU = project?.orbitRadiusAU || selection?.orbitRadiusAU || project?.distanceFromStarAU || 0.1;
    const widthKm = project?.widthKm || selection?.widthKm || project?.ringWidthKm || 10_000;
    const targetFluxWm2 = project?.targetFluxWm2 || selection?.targetFluxWm2 || ARTIFICIAL_RING_FLUX_DEFAULT_WM2;
    if (artificialUICache.ringOrbitLabel) {
      const earthRadii = orbitAU * ARTIFICIAL_AU_TO_EARTH_RADII;
      artificialUICache.ringOrbitLabel.textContent = `${orbitAU.toFixed(3)} AU (${fmt(earthRadii, false, 0)} R⊕)`;
    }
    if (artificialUICache.ringWidthLabel) {
      artificialUICache.ringWidthLabel.textContent = `${fmt(widthKm, false, 0)} km`;
    }
    artificialUICache.ringFluxLabel.textContent = `${fmt(targetFluxWm2, false, 3)} W/m²`;
  } else if (artificialUICache.radiusLabel) {
    artificialUICache.radiusLabel.textContent = `${r.toFixed(2)} Rₑ`;
  }
  if (artificialUICache.areaLabel) {
    artificialUICache.areaLabel.textContent = `${fmt(area, false, 2)} land`;
  }
  if (artificialUICache.costMetal) {
    artificialUICache.costMetal.textContent = type === 'ring' ? '—' : `${fmt(cost.metal, false, 2)}`;
  }
  if (artificialUICache.costSuperalloy) {
    artificialUICache.costSuperalloy.textContent = `${fmt(cost.superalloys, false, 2)}`;
  }
  if (artificialUICache.durationValue) {
    const seconds = Math.ceil(durationContext.durationMs / 1000);
    artificialUICache.durationValue.textContent = formatDuration(seconds);
  }
  if (artificialUICache.durationTooltip) {
    artificialUICache.durationTooltip.title = `Construction time is divided by terraformed worlds (currently ${fmt(durationContext.worldCount, false, 2)}). \nConstruction will progress while on other worlds, so you can use this time to complete other tasks.\nHumanity cannot be convinced to participate in constructing worlds that would take longer than 5 hours.`;
  }
  const exceedsLimit = manager.exceedsDurationLimit(durationContext.durationMs);
  return { type, cost, durationMs: durationContext.durationMs, worldCount: durationContext.worldCount, exceedsLimit };
}

function renderGains(project, selection, manager) {
  const r = project ? project.radiusEarth : selection.radiusEarth;
  const effective = project?.terraformedValue || manager.calculateTerraformWorldValue(r);
  const defense = effective;
  const fleet = manager.calculateFleetCapacityWorldValue
    ? manager.calculateFleetCapacityWorldValue(r, effective)
    : 2;
  const distinct = 1;
  if (artificialUICache.gainDistinct) {
    const label = distinct === 1 ? '1 distinct world' : `${distinct} distinct worlds`;
    artificialUICache.gainDistinct.textContent = label;
  }
  if (artificialUICache.gainEffective) {
    const label = effective === 1 ? '1 terraformed world' : `${effective} terraformed worlds`;
    artificialUICache.gainEffective.textContent = label;
    artificialUICache.gainEffective.title = `Land contributes ${label} (1 per 50B ha, minimum 1).`;
  }
  if (artificialUICache.gainDefense) {
    const label = defense === 1 ? '1 world' : `${defense} worlds`;
    artificialUICache.gainDefense.textContent = label;
  }
  if (artificialUICache.gainFleet) {
    const label = fleet === 1 ? '1 world' : `${fleet} worlds`;
    artificialUICache.gainFleet.textContent = label;
  }
}

function renderEffects(project, selection) {
  const type = project?.type || selection?.type || 'shell';
  const r = project ? project.radiusEarth : selection.radiusEarth;
  if (artificialUICache.effectShipEnergyRow) {
    artificialUICache.effectShipEnergyRow.classList.toggle('hidden', false);
  }
  if (artificialUICache.effectShipEnergyLabel) {
    artificialUICache.effectShipEnergyLabel.textContent = type === 'ring'
      ? 'You will have to spin the Ringworld via an infrastructure special project.'
      : 'Spaceship energy costs:';
  }
  if (artificialUICache.effectShipEnergy) {
    artificialUICache.effectShipEnergy.textContent = type === 'ring' ? '' : `x${r.toFixed(2)}`;
  }
}

function renderStartButton(project, manager, preview) {
  if (!artificialUICache.startBtn) return;
  const btn = artificialUICache.startBtn;
  if (project) {
    btn.disabled = true;
    btn.textContent = 'Construction locked';
    btn.title = '';
    return;
  }
  const { cost } = preview;
  const canAfford = manager.canCoverCost(cost);
  const durationBlocked = preview.exceedsLimit;
  const type = artificialUICache.type ? artificialUICache.type.value : 'shell';
  const supported = type === 'shell' || type === 'ring';
  btn.disabled = durationBlocked || !canAfford || !supported;
  if (durationBlocked) {
    btn.textContent = 'Exceeds 5-hour limit';
    btn.title = 'Reduce size or gain more terraformed worlds to shorten construction below 5 hours.';
  } else {
    if (!supported) {
      btn.textContent = 'Coming soon';
      btn.title = '';
    } else if (!canAfford) {
      btn.textContent = 'Insufficient materials';
      btn.title = '';
    } else if (type === 'ring') {
      btn.textContent = 'Start Ringworld';
      btn.title = '';
    } else {
      btn.textContent = 'Start Artificial World';
      btn.title = '';
    }
  }
}

function updateArtificialUI(options = {}) {
  const force = !!options.force;
  const manager = artificialManager;
  const enabled = !!(manager && manager.enabled);
  toggleArtificialTabVisibility(enabled);
  if (!enabled) return;

  ensureArtificialLayout();
  const project = manager.activeProject || null;

  // Populate sector selector
  if (artificialUICache.sector) {
    const manager = galaxyManager;
    const sectors = Array.isArray(manager?.getSectors?.())
      ? manager.getSectors().filter(sector => {
      const controlValue = sector.getControlValue ? sector.getControlValue('uhf') : 0;
      return controlValue > 0;
        })
      : [];
    const sortedSectors = sectors.slice().sort((left, right) => {
      const leftName = getArtificialSectorDisplayName(left);
      const rightName = getArtificialSectorDisplayName(right);
      const nameCompare = leftName.localeCompare(rightName);
      const leftKey = left.key || `${left.q},${left.r}`;
      const rightKey = right.key || `${right.q},${right.r}`;
      return nameCompare !== 0 ? nameCompare : leftKey.localeCompare(rightKey);
    });

    const filterResources = buildArtificialSectorFilterOptions(sortedSectors);
    const filterSig = JSON.stringify(filterResources);
    if (artificialUICache.sectorFilter.dataset.lastFilterList !== filterSig) {
      const filterFrag = document.createDocumentFragment();
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'All resources';
      filterFrag.appendChild(allOpt);
      filterResources.forEach(resource => {
        const opt = document.createElement('option');
        opt.value = resource;
        opt.textContent = `+${formatArtificialSectorResourceLabel(resource)}`;
        filterFrag.appendChild(opt);
      });
      artificialUICache.sectorFilter.innerHTML = '';
      artificialUICache.sectorFilter.appendChild(filterFrag);
      artificialUICache.sectorFilter.dataset.lastFilterList = filterSig;
    }
    if (!artificialUICache.sectorFilter.value) {
      artificialUICache.sectorFilter.value = 'all';
    }

    const filterValue = project ? 'all' : artificialUICache.sectorFilter.value;
    const filteredSectors = filterValue === 'all'
      ? sortedSectors
      : sortedSectors.filter(sector => getArtificialSectorRichResource(sector) === filterValue);

    const sectorSig = JSON.stringify({
      filter: filterValue,
      sectors: filteredSectors.map(sector => ({
        name: getArtificialSectorDisplayName(sector),
        key: sector.key || `${sector.q},${sector.r}`,
        rich: getArtificialSectorRichResource(sector) || null,
        poor: sector.getPoorResources?.() || sector.poorResources || [],
        worlds: manager?.getTerraformedWorldCountForSector?.(sector) || 0
      }))
    });
    if (artificialUICache.sector.dataset.lastSectorList !== sectorSig) {
      const frag = document.createDocumentFragment();
      const autoOpt = document.createElement('option');
      autoOpt.value = 'auto';
      autoOpt.textContent = 'Auto';
      frag.appendChild(autoOpt);
      filteredSectors.forEach(sector => {
        const sectorName = getArtificialSectorDisplayName(sector);
        const resourceSuffix = buildArtificialSectorResourceSuffix(sector);
        const worldsSuffix = buildArtificialSectorWorldCountSuffix(manager, sector);
        const opt = document.createElement('option');
        opt.value = sectorName;
        opt.textContent = `${sectorName}${resourceSuffix}${worldsSuffix}`;
        frag.appendChild(opt);
      });
      artificialUICache.sector.innerHTML = '';
      artificialUICache.sector.appendChild(frag);
      artificialUICache.sector.dataset.lastSectorList = sectorSig;
    }
    // Set default or project value
    if (project && project.sector) {
      artificialUICache.sector.value = project.sector;
    } else if (!artificialUICache.sector.value) {
      artificialUICache.sector.value = 'auto';
    } else if (!Array.from(artificialUICache.sector.options).some(option => option.value === artificialUICache.sector.value)) {
      artificialUICache.sector.value = 'auto';
    }
    artificialUICache.sector.disabled = !!project;
    artificialUICache.sectorFilter.disabled = !!project;
  }

  if (artificialUICache.status) {
    artificialUICache.status.textContent = manager.getStatusText();
  }
  if (artificialUICache.state) {
    artificialUICache.state.textContent = project
      ? (project.status === 'completed' ? 'Ready for travel' : 'Building')
      : 'Ready';
  }
  if (artificialUICache.nameInput) {
    if (project) {
      if (document.activeElement !== artificialUICache.nameInput) {
        artificialUICache.nameInput.value = project.name;
      }
      artificialUICache.nameInput.disabled = false;
    } else {
      artificialUICache.nameInput.disabled = false;
      if (!artificialUICache.nameInput.value) {
        artificialUICache.nameInput.placeholder = `Artificial World ${manager.nextId}`;
      }
    }
  }
  if (artificialUICache.type) {
    const options = getArtificialTypes();
    const fallback = options.find((entry) => !entry.disabled) || options[0];
    const signature = JSON.stringify(options.map((option) => ({
      value: option.value,
      disabled: !!option.disabled,
      label: option.label,
      source: option.disabledSource || ''
    })));
    if (artificialUICache.type.dataset.optionSignature !== signature) {
      const currentValue = artificialUICache.type.value;
      artificialUICache.type.innerHTML = '';
      options.forEach((option) => {
        artificialUICache.type.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
      });
      artificialUICache.type.dataset.optionSignature = signature;
      const hasCurrent = options.some((entry) => entry.value === currentValue && !entry.disabled);
      artificialUICache.type.value = hasCurrent ? currentValue : (fallback ? fallback.value : '');
    }
    if (project && project.type) {
      artificialUICache.type.value = project.type;
    } else if (!artificialUICache.type.value && fallback) {
      artificialUICache.type.value = fallback.value;
    }
    artificialUICache.type.disabled = !!project;
  }
  if (artificialUICache.core) {
    const options = getArtificialCores();
    const fallback = options.find((entry) => !entry.disabled) || options[0];
    const signature = JSON.stringify(options.map((option) => ({
      value: option.value,
      disabled: !!option.disabled,
      label: option.label,
      source: option.disabledSource || ''
    })));
    if (artificialUICache.core.dataset.optionSignature !== signature) {
      const currentValue = artificialUICache.core.value;
      artificialUICache.core.innerHTML = '';
      options.forEach((option) => {
        artificialUICache.core.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
      });
      artificialUICache.core.dataset.optionSignature = signature;
      const hasCurrent = options.some((entry) => entry.value === currentValue && !entry.disabled);
      artificialUICache.core.value = hasCurrent ? currentValue : (fallback ? fallback.value : '');
    }
    if (project && project.core) {
      artificialUICache.core.value = project.core;
    } else if (!artificialUICache.core.value && fallback) {
      artificialUICache.core.value = fallback.value;
    }
    artificialUICache.core.disabled = !!project;
  }
  if (artificialUICache.starContext) {
    const options = getArtificialStarContexts();
    const fallback = options.find((entry) => !entry.disabled) || options[0];
    if (project && project.starContext) {
      artificialUICache.starContext.value = project.starContext;
    } else if (!artificialUICache.starContext.value && fallback) {
      artificialUICache.starContext.value = fallback.value;
    }
    artificialUICache.starContext.disabled = !!project;
  }

  if (artificialUICache.ringStarCore) {
    const options = getRingStarCoreOptions();
    const fallback = options.find((entry) => !entry.disabled) || options[0];
    const signature = JSON.stringify(options.map((option) => ({
      value: option.value,
      disabled: !!option.disabled,
      label: option.label,
      source: option.disabledSource || ''
    })));
    if (artificialUICache.ringStarCore.dataset.optionSignature !== signature) {
      const currentValue = artificialUICache.ringStarCore.value;
      artificialUICache.ringStarCore.innerHTML = '';
      options.forEach((option) => {
        artificialUICache.ringStarCore.appendChild(buildOption(option.value, option.label, !!option.disabled, option.disabledSource));
      });
      artificialUICache.ringStarCore.dataset.optionSignature = signature;
      const hasCurrent = options.some((entry) => entry.value === currentValue && !entry.disabled);
      artificialUICache.ringStarCore.value = hasCurrent ? currentValue : (fallback ? fallback.value : '');
    }
    if (project && project.type === 'ring') {
      artificialUICache.ringStarCore.value = project.starCore || project.core || artificialUICache.ringStarCore.value;
    } else if (!artificialUICache.ringStarCore.value && fallback) {
      artificialUICache.ringStarCore.value = fallback.value;
    }
    artificialUICache.ringStarCore.disabled = !!project;
  }

  const selectedType = getSelectedArtificialType(project);
  const isShell = selectedType === 'shell';
  const isRing = selectedType === 'ring';
  if (artificialUICache.coreField) {
    artificialUICache.coreField.classList.toggle('hidden', !isShell);
    artificialUICache.coreField.style.display = isShell ? '' : 'none';
  }
  if (artificialUICache.starContextField) {
    artificialUICache.starContextField.classList.toggle('hidden', !isShell);
    artificialUICache.starContextField.style.display = isShell ? '' : 'none';
  }
  if (artificialUICache.radiusBox) {
    artificialUICache.radiusBox.classList.toggle('hidden', !isShell);
    artificialUICache.radiusBox.style.display = isShell ? '' : 'none';
  }
  if (artificialUICache.ringStarCoreField) {
    artificialUICache.ringStarCoreField.classList.toggle('hidden', !isRing);
    artificialUICache.ringStarCoreField.style.display = isRing ? '' : 'none';
  }
  if (artificialUICache.ringOrbitBox) {
    artificialUICache.ringOrbitBox.classList.toggle('hidden', !isRing);
    artificialUICache.ringOrbitBox.style.display = isRing ? '' : 'none';
  }
  if (artificialUICache.ringWidthBox) {
    artificialUICache.ringWidthBox.classList.toggle('hidden', !isRing);
    artificialUICache.ringWidthBox.style.display = isRing ? '' : 'none';
  }
  artificialUICache.ringFluxBox.classList.toggle('hidden', !isRing);
  artificialUICache.ringFluxBox.style.display = isRing ? '' : 'none';

  applyStarContextBounds();
  applyRadiusBounds();
  applyRingBounds();
  if (artificialUICache.priority) {
    artificialUICache.priority.checked = manager.getPrioritizeSpaceStorage();
  }

  if (!project) {
    artificialUICache.type.disabled = false;
    if (artificialUICache.core) artificialUICache.core.disabled = !isShell;
    if (artificialUICache.starContext) artificialUICache.starContext.disabled = !isShell;
    if (artificialUICache.radiusRange) artificialUICache.radiusRange.disabled = !isShell;
    if (artificialUICache.radiusInput) artificialUICache.radiusInput.disabled = !isShell;
    if (artificialUICache.radiusAuto) artificialUICache.radiusAuto.disabled = !isShell;
    if (artificialUICache.ringStarCore) artificialUICache.ringStarCore.disabled = !isRing;
    if (artificialUICache.ringOrbitRange) artificialUICache.ringOrbitRange.disabled = !isRing;
    if (artificialUICache.ringOrbitInput) artificialUICache.ringOrbitInput.disabled = !isRing;
    if (artificialUICache.ringWidthRange) artificialUICache.ringWidthRange.disabled = !isRing;
    if (artificialUICache.ringWidthInput) artificialUICache.ringWidthInput.disabled = !isRing;
    artificialUICache.ringFluxRange.disabled = !isRing;
    artificialUICache.ringFluxInput.disabled = !isRing;
    artificialUICache.ringAuto.disabled = !isRing;
    artificialUICache.sector.disabled = false;
    artificialUICache.sectorFilter.disabled = false;
    if (!artificialRadiusEditing) {
      const clamped = getRadiusValue();
      setRadiusFields(clamped);
    }
    if (!artificialRingOrbitEditing) {
      setRingOrbitFields(getRingOrbitRadiusAUValue());
    }
    if (!artificialRingWidthEditing) {
      setRingWidthFields(getRingWidthKmValue());
    }
    if (!artificialRingFluxEditing) {
      setRingFluxFields(getRingFluxWm2Value());
    }
  } else {
    artificialUICache.type.disabled = true;
    if (artificialUICache.core) artificialUICache.core.disabled = true;
    if (artificialUICache.starContext) artificialUICache.starContext.disabled = true;
    if (artificialUICache.radiusRange) artificialUICache.radiusRange.disabled = true;
    if (artificialUICache.radiusInput) artificialUICache.radiusInput.disabled = true;
    if (artificialUICache.radiusAuto) artificialUICache.radiusAuto.disabled = true;
    if (artificialUICache.ringStarCore) artificialUICache.ringStarCore.disabled = true;
    if (artificialUICache.ringOrbitRange) artificialUICache.ringOrbitRange.disabled = true;
    if (artificialUICache.ringOrbitInput) artificialUICache.ringOrbitInput.disabled = true;
    if (artificialUICache.ringWidthRange) artificialUICache.ringWidthRange.disabled = true;
    if (artificialUICache.ringWidthInput) artificialUICache.ringWidthInput.disabled = true;
    artificialUICache.ringFluxRange.disabled = true;
    artificialUICache.ringFluxInput.disabled = true;
    artificialUICache.ringAuto.disabled = true;
    artificialUICache.sector.disabled = true;
    artificialUICache.sectorFilter.disabled = true;
    setRadiusFields(project.radiusEarth, true);
    setRingOrbitFields(project.orbitRadiusAU || project.distanceFromStarAU || 0.1, true);
    setRingWidthFields(project.widthKm || project.ringWidthKm || 10_000, true);
    setRingFluxFields(project.targetFluxWm2 || ARTIFICIAL_RING_FLUX_DEFAULT_WM2, true);
  }

  const selection = project
    ? {
        type: project.type || 'shell',
        radiusEarth: project.radiusEarth,
        orbitRadiusAU: project.orbitRadiusAU || project.distanceFromStarAU,
        widthKm: project.widthKm || project.ringWidthKm,
        starCore: project.starCore || project.core,
        targetFluxWm2: project.targetFluxWm2
      }
    : (() => {
        const type = artificialUICache.type ? artificialUICache.type.value : 'shell';
        if (type === 'ring') {
          const orbitRadiusAU = getRingOrbitRadiusAUValue();
          const widthKm = getRingWidthKmValue();
          const targetFluxWm2 = getRingFluxWm2Value();
          const landHa = manager.calculateRingWorldAreaHectares(orbitRadiusAU, widthKm);
          const radiusEarth = manager.calculateRadiusEarthFromLandHectares(landHa);
          return { type, radiusEarth, orbitRadiusAU, widthKm, targetFluxWm2, starCore: artificialUICache.ringStarCore ? artificialUICache.ringStarCore.value : '' };
        }
        return { type, radiusEarth: getRadiusValue() };
      })();

  const preview = renderCosts(project, selection, manager);
  renderGains(project, selection, manager);
  renderEffects(project, selection);
  renderStartButton(project, manager, preview);
  renderProgress(project);
  renderStash(project, manager);
  renderBailout(project, manager);
  renderArtificialHistory(force);
}

if (typeof window !== 'undefined') {
  window.updateArtificialUI = updateArtificialUI;
  window.renderArtificialHistory = renderArtificialHistory;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cacheArtificialUIElements,
    ensureArtificialLayout,
    toggleArtificialTabVisibility,
    updateArtificialUI,
    renderArtificialHistory,
  };
}
