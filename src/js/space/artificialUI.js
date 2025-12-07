const artificialUICache = {
  button: null,
  content: null,
  status: null,
  state: null,
  type: null,
  core: null,
  radiusRange: null,
  radiusInput: null,
  radiusLabel: null,
  areaLabel: null,
  gravityValue: null,
  nameInput: null,
  costMetal: null,
  costSuperalloy: null,
  starContext: null,
  durationValue: null,
  durationTooltip: null,
  gainEffective: null,
  gainDistinct: null,
  gainFleet: null,
  gainDefense: null,
  gainFleetTooltip: null,
  sector: null,
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
let artificialHistorySig = '';

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
  name.textContent = entry.name;
  name.title = entry.seed || '';
  const type = document.createElement('span');
  const typeLabel = entry.type ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : '—';
  type.textContent = typeLabel;
  const land = document.createElement('span');
  const landValue = entry.landHa !== undefined ? entry.landHa : (entry.radiusEarth && artificialManager ? artificialManager.calculateAreaHectares(entry.radiusEarth) : undefined);
  land.textContent = landValue !== undefined ? (formatNumber ? formatNumber(landValue, false, 2) : landValue) : '—';
  const effective = document.createElement('span');
  const effectiveValue = entry.terraformedValue !== undefined
    ? entry.terraformedValue
    : (landValue !== undefined ? Math.max(1, Math.floor((landValue || 0) / 50_000_000_000)) : undefined);
  effective.textContent = effectiveValue !== undefined ? (formatNumber ? formatNumber(effectiveValue, false, 0) : effectiveValue) : '—';
  effective.title = 'Counts toward terraformed worlds (1 per 50B ha, minimum 1).';
  const status = document.createElement('span');
  const statusKey = entry.status || '';
  const statusLabelMap = {
    building: 'Under construction',
    completed: 'Ready for Terraforming',
    current: 'Current',
    terraformed: 'Terraformed'
  };
  const statusLabel = statusLabelMap[statusKey] || (statusKey ? statusKey.charAt(0).toUpperCase() + statusKey.slice(1) : '');
  status.textContent = statusLabel;
  status.className = `artificial-history-status artificial-history-${statusKey}`;
  row.appendChild(name);
  row.appendChild(type);
  row.appendChild(land);
  row.appendChild(effective);
  row.appendChild(status);
  return row;
}

function buildHistoryHeader() {
  const header = document.createElement('div');
  header.className = 'artificial-history-row artificial-history-header-row';
  ['Name', 'Type', 'Land', 'Value', 'Status'].forEach((label) => {
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

function getRadiusBounds() {
  if (typeof getArtificialCoreBounds === 'function' && artificialUICache.core) {
    return getArtificialCoreBounds(artificialUICache.core.value);
  }
  return { min: 2, max: 8 };
}

function clampRadiusValue(value) {
  const bounds = getRadiusBounds();
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

function isRadiusFieldActive() {
  if (typeof document === 'undefined') return false;
  return document.activeElement === artificialUICache.radiusInput
    || document.activeElement === artificialUICache.radiusRange;
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

function applyRadiusBounds() {
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

function applyStarContextBounds() {
  if (!artificialUICache.starContext) return;
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
  applyStarContextBounds();

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
  applyRadiusBounds();

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
    body.appendChild(controls);
    row.appendChild(body);

    artificialUICache.stashControls[resource] = {
      divBtn,
      mulBtn,
      addBtn,
      stock: staged,
      capInfo
    };

    return row;
  };

  stashList.appendChild(createStashRow('metal', 'Metal'));
  stashList.appendChild(createStashRow('silicon', 'Silicon'));

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
  bailoutInfo.title = 'Spend 10 alien artifacts to receive 100M metal and 100M silicon for this world. Bypasses storage cap. Only available on artificial worlds.';
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
  bailoutBtn.textContent = '+100M metal & silicon';
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
  priorityCheckbox.addEventListener('change', () => {
    if (artificialManager) {
      artificialManager.setPrioritizeSpaceStorage(priorityCheckbox.checked);
    }
    updateArtificialUI();
  });
  startBtn.addEventListener('click', () => {
    if (!artificialManager) return;
    if (artificialUICache.type.value !== 'shell') return;
    artificialManager.startShellConstruction({
      radiusEarth: clampRadiusValue(parseFloat(radiusRange.value) || 1),
      core: artificialUICache.core.value,
      starContext: artificialUICache.starContext ? artificialUICache.starContext.value : undefined,
      name: artificialUICache.nameInput ? artificialUICache.nameInput.value : '',
      sector: artificialUICache.sector ? artificialUICache.sector.value : undefined
    });
  });
  coreSelect.addEventListener('change', () => {
    applyRadiusBounds();
    applyStarContextBounds();
    updateArtificialUI();
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
    artificialManager?.travelToConstructedWorld();
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
      entry.status
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
    ? `Stockpiles cap at ${capLabel} based on 1 unit per hectare (${landLabel} ha).`
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
      ? manager.canCoverCost(payload, manager.prioritizeSpaceStorage)
      : false;
    const cappedOut = active && remaining === 0;
    if (controls.capInfo) {
      controls.capInfo.title = capTitle;
    }
    if (controls.stock) {
      controls.stock.textContent = active ? fmt(staged, false, 2) : '—';
      controls.stock.title = active ? `Cap: ${capLabel}` : '';
      controls.stock.classList.toggle('artificial-stash-unaffordable', active && (cappedOut || !canAfford));
    }
    if (controls.addBtn) {
      controls.addBtn.textContent = `+${fmt(planned, false, 0)}`;
      controls.addBtn.disabled = !active || !canAfford || cappedOut || planned <= 0;
      controls.addBtn.classList.toggle('artificial-stash-unaffordable', active && (!canAfford || cappedOut));
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

function renderCosts(project, radius, manager) {
  const r = project ? project.radiusEarth : radius;
  const area = project ? project.areaHa : manager.calculateAreaHectares(r);
  const cost = project ? project.cost : manager.calculateCost(r);
  const durationContext = project
    ? { durationMs: project.durationMs, worldCount: project.worldDivisor || 1 }
    : manager.getDurationContext(r);

  const fmt = formatNumber || ((n) => n);
  if (artificialUICache.radiusLabel) {
    artificialUICache.radiusLabel.textContent = `${r.toFixed(2)} Rₑ`;
  }
  if (artificialUICache.areaLabel) {
    artificialUICache.areaLabel.textContent = `${fmt(area, false, 2)} land`;
  }
  if (artificialUICache.costMetal) {
    artificialUICache.costMetal.textContent = `${fmt(cost.metal, false, 2)}`;
  }
  if (artificialUICache.costSuperalloy) {
    artificialUICache.costSuperalloy.textContent = `${fmt(cost.superalloys, false, 2)}`;
  }
  if (artificialUICache.durationValue) {
    artificialUICache.durationValue.textContent = formatDuration(durationContext.durationMs / 1000);
  }
  if (artificialUICache.durationTooltip) {
    artificialUICache.durationTooltip.title = `Construction time is divided by terraformed worlds (currently ${fmt(durationContext.worldCount, false, 2)}). \nConstruction will progress while on other worlds, so you can use this time to complete other tasks.\nHumanity cannot be convinced to participate in constructing worlds that would take longer than 5 hours.`;
  }
  const exceedsLimit = manager.exceedsDurationLimit(durationContext.durationMs);
  return { cost, durationMs: durationContext.durationMs, worldCount: durationContext.worldCount, exceedsLimit };
}

function renderGains(project, radius, manager) {
  const r = project ? project.radiusEarth : radius;
  const effective = project?.terraformedValue || manager.calculateTerraformWorldValue(r);
  const defense = effective;
  const fleet = manager.calculateFleetCapacityWorldValue ? manager.calculateFleetCapacityWorldValue(r) : 2;
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
  const canAfford = manager.canCoverCost(cost, manager.prioritizeSpaceStorage);
  const durationBlocked = preview.exceedsLimit;
  btn.disabled = durationBlocked || !canAfford || artificialUICache.type.value !== 'shell';
  if (durationBlocked) {
    btn.textContent = 'Exceeds 5-hour limit';
    btn.title = 'Reduce size or gain more terraformed worlds to shorten construction below 5 hours.';
  } else {
    btn.textContent = canAfford ? 'Start Artificial World' : 'Insufficient materials';
    btn.title = '';
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
    const galaxyManager = globalThis?.galaxyManager;
    const sectors = Array.isArray(galaxyManager?.getSectors?.())
      ? galaxyManager.getSectors().filter(sector => {
          const controlValue = sector.getControlValue ? sector.getControlValue('uhf') : 0;
          return controlValue > 0;
        })
      : [];
    const sectorSig = JSON.stringify(sectors.map(s => ({ name: s.getDisplayName ? s.getDisplayName() : `${s.q},${s.r}`, q: s.q, r: s.r })));
    if (artificialUICache.sector.dataset.lastSectorList !== sectorSig) {
      const frag = document.createDocumentFragment();
      const autoOpt = document.createElement('option');
      autoOpt.value = 'auto';
      autoOpt.textContent = 'Sector: Auto';
      frag.appendChild(autoOpt);
      sectors.forEach(sector => {
        const opt = document.createElement('option');
        opt.value = sector.getDisplayName ? sector.getDisplayName() : `${sector.q},${sector.r}`;
        opt.textContent = `Sector: ${sector.getDisplayName ? sector.getDisplayName() : `(${sector.q},${sector.r})`}`;
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
    }
    artificialUICache.sector.disabled = !!project;
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
      artificialUICache.nameInput.value = project.name;
      artificialUICache.nameInput.disabled = true;
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
  applyStarContextBounds();
  applyRadiusBounds();
  if (artificialUICache.priority) {
    artificialUICache.priority.checked = manager.prioritizeSpaceStorage;
  }

  if (!project) {
    artificialUICache.radiusRange.disabled = false;
    artificialUICache.radiusInput.disabled = false;
    artificialUICache.core.disabled = false;
    artificialUICache.type.disabled = false;
    artificialUICache.sector.disabled = false;
    if (!artificialRadiusEditing) {
      const clamped = getRadiusValue();
      setRadiusFields(clamped);
    }
  } else {
    artificialUICache.radiusRange.disabled = true;
    artificialUICache.radiusInput.disabled = true;
    artificialUICache.core.disabled = true;
    artificialUICache.type.disabled = true;
    artificialUICache.sector.disabled = true;
    setRadiusFields(project.radiusEarth, true);
  }

  const radius = project ? project.radiusEarth : getRadiusValue();
  const preview = renderCosts(project, radius, manager);
  renderGains(project, radius, manager);
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
