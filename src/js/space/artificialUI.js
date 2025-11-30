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
  durationValue: null,
  durationTooltip: null,
  priority: null,
  startBtn: null,
  cancelBtn: null,
  travelBtn: null,
  discardBtn: null,
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
  storyContent: null
};

let artificialHistoryPage = 0;
const artificialStashMultipliers = {
  metal: 1_000_000_000,
  silicon: 1_000_000_000
};

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

function buildOption(value, label, disabled = false) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
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
  row.appendChild(status);
  return row;
}

function buildHistoryHeader() {
  const header = document.createElement('div');
  header.className = 'artificial-history-row artificial-history-header-row';
  ['Name', 'Type', 'Land', 'Status'].forEach((label) => {
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
  return { min: 2, max: 8 };
}

function clampRadiusValue(value) {
  const bounds = getRadiusBounds();
  return Math.min(Math.max(value, bounds.min), bounds.max);
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
  nameInput.placeholder = 'Shellworld';
  nameLabel.appendChild(nameInput);
  blueprint.appendChild(nameLabel);
  artificialUICache.nameInput = nameInput;

  const typeLabel = document.createElement('label');
  typeLabel.className = 'artificial-field';
  typeLabel.textContent = 'Framework';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'artificial-select';
  typeSelect.appendChild(buildOption('shell', 'Shellworld'));
  typeSelect.appendChild(buildOption('ring', 'Ringworld (coming soon)', true));
  typeSelect.appendChild(buildOption('disk', 'Artificial disk (coming soon)', true));
  typeSelect.value = 'shell';
  typeLabel.appendChild(typeSelect);
  blueprint.appendChild(typeLabel);
  artificialUICache.type = typeSelect;

  const coreLabel = document.createElement('label');
  coreLabel.className = 'artificial-field';
  coreLabel.textContent = 'Core';
  const coreSelect = document.createElement('select');
  coreSelect.className = 'artificial-select';
  coreSelect.appendChild(buildOption('super-earth', 'Super Earth core'));
  coreSelect.appendChild(buildOption('ice-giant', 'Ice giant lattice (Locked)', true));
  coreSelect.appendChild(buildOption('brown-dwarf', 'Brown dwarf anchor (Locked)', true));
  coreSelect.appendChild(buildOption('neutron-star', 'Neutron star beehive (Locked)', true));
  coreSelect.appendChild(buildOption('micro-singularity', 'Micro black hole lattice (Locked)', true));
  coreSelect.appendChild(buildOption('smbh', 'Supermassive black hole vault (Locked)', true));
  coreLabel.appendChild(coreSelect);
  blueprint.appendChild(coreLabel);
  artificialUICache.core = coreSelect;

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

  const radiusRange = document.createElement('input');
  radiusRange.type = 'range';
  radiusRange.min = '2';
  radiusRange.max = '8';
  radiusRange.step = '0.1';
  radiusRange.value = '2';
  radiusRange.className = 'artificial-radius-range';
  artificialUICache.radiusRange = radiusRange;
  radiusLabel.appendChild(radiusRange);

  const radiusInput = document.createElement('input');
  radiusInput.type = 'number';
  radiusInput.min = '2';
  radiusInput.max = '8';
  radiusInput.step = '0.1';
  radiusInput.value = '2';
  radiusInput.className = 'artificial-radius-input';
  artificialUICache.radiusInput = radiusInput;
  radiusLabel.appendChild(radiusInput);

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
  startBtn.textContent = 'Start Shellworld';
  artificialUICache.startBtn = startBtn;
  costs.appendChild(startBtn);

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
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'artificial-secondary';
  cancelBtn.textContent = 'Cancel Construction';
  artificialUICache.cancelBtn = cancelBtn;
  actions.appendChild(cancelBtn);
  const travelBtn = document.createElement('button');
  travelBtn.className = 'artificial-primary';
  travelBtn.textContent = 'Travel to Shellworld';
  artificialUICache.travelBtn = travelBtn;
  actions.appendChild(travelBtn);
  const discardBtn = document.createElement('button');
  discardBtn.className = 'artificial-secondary';
  discardBtn.textContent = 'Discard World';
  artificialUICache.discardBtn = discardBtn;
  actions.appendChild(discardBtn);
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
    const value = parseFloat(radiusInput.value) || 0;
    const clamped = clampRadiusValue(value);
    radiusInput.value = clamped;
    radiusRange.value = clamped;
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
      radiusEarth: parseFloat(radiusRange.value) || 1,
      core: artificialUICache.core.value,
      name: artificialUICache.nameInput ? artificialUICache.nameInput.value : ''
    });
  });
  cancelBtn.addEventListener('click', () => {
    artificialManager?.cancelConstruction();
  });
  discardBtn.addEventListener('click', () => {
    artificialManager?.discardConstructedWorld();
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

  renderArtificialHistory();
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
  return clampRadiusValue(parseFloat(artificialUICache.radiusRange.value) || 1);
}

function renderArtificialHistory() {
  const manager = artificialManager;
  if (!manager || !artificialUICache.historyList || !artificialUICache.historyPage) return;
  const entries = typeof manager.getHistoryEntries === 'function' ? manager.getHistoryEntries() : (manager.history || []);
  const pageSize = 6;
  const maxPage = Math.max(0, Math.ceil(entries.length / pageSize) - 1);
  artificialHistoryPage = Math.min(artificialHistoryPage, maxPage);
  const start = artificialHistoryPage * pageSize;
  const slice = entries.slice(start, start + pageSize);

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
    artificialUICache.cancelBtn.disabled = true;
    artificialUICache.travelBtn.disabled = true;
    artificialUICache.discardBtn.disabled = true;
    return;
  }
  const label = artificialUICache.progressLabel;
  if (project.status === 'building') {
    const pct = Math.max(0, Math.min(100, (1 - project.remainingMs / project.durationMs) * 100));
    artificialUICache.progressFill.style.width = `${pct}%`;
    const remaining = formatDuration(project.remainingMs / 1000);
    label.textContent = `${project.name} — ${remaining} remaining`;
    artificialUICache.cancelBtn.disabled = false;
    artificialUICache.travelBtn.disabled = true;
    artificialUICache.discardBtn.disabled = true;
    return;
  }
  if (project.status === 'completed') {
    artificialUICache.progressFill.style.width = '100%';
    label.textContent = `${project.name} complete. Ready to travel.`;
    artificialUICache.cancelBtn.disabled = true;
    artificialUICache.travelBtn.disabled = false;
    artificialUICache.discardBtn.disabled = false;
    return;
  }
  label.textContent = 'Idle';
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
      controls.stock.textContent = active ? fmt(staged, false, 0) : '—';
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
    artificialUICache.areaLabel.textContent = `${fmt(area, false, 2)} ha plated`;
  }
  if (artificialUICache.costMetal) {
    artificialUICache.costMetal.textContent = `${fmt(cost.metal, false, 2)}`;
  }
  if (artificialUICache.costSuperalloy) {
    artificialUICache.costSuperalloy.textContent = `${fmt(cost.superalloys, false, 2)}`;
  }
  if (artificialUICache.duration) {
    artificialUICache.durationValue.textContent = formatDuration(durationContext.durationMs / 1000);
    if (artificialUICache.durationTooltip) {
      artificialUICache.durationTooltip.title = `Construction time divides by terraformed worlds (currently ${durationContext.worldCount}).`;
    }
  }
  return { cost, durationMs: durationContext.durationMs, worldCount: durationContext.worldCount };
}

function renderStartButton(project, manager, preview) {
  if (!artificialUICache.startBtn) return;
  const btn = artificialUICache.startBtn;
  if (project) {
    btn.disabled = true;
    btn.textContent = 'Construction locked';
    return;
  }
  const { cost } = preview;
  const canAfford = manager.canCoverCost(cost, manager.prioritizeSpaceStorage);
  btn.disabled = !canAfford || artificialUICache.type.value !== 'shell';
  btn.textContent = canAfford ? 'Start Shellworld' : 'Insufficient materials';
}

function updateArtificialUI() {
  const manager = artificialManager;
  const enabled = !!(manager && manager.enabled);
  toggleArtificialTabVisibility(enabled);
  if (!enabled) return;

  ensureArtificialLayout();
  const project = manager.activeProject || null;

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
        artificialUICache.nameInput.placeholder = `Shellworld ${manager.nextId}`;
      }
    }
  }
  if (artificialUICache.priority) {
    artificialUICache.priority.checked = manager.prioritizeSpaceStorage;
  }

  if (!project) {
    artificialUICache.radiusRange.disabled = false;
    artificialUICache.radiusInput.disabled = false;
    artificialUICache.core.disabled = false;
    artificialUICache.type.disabled = false;
    const clamped = getRadiusValue();
    artificialUICache.radiusRange.value = clamped;
    artificialUICache.radiusInput.value = clamped;
  } else {
    artificialUICache.radiusRange.disabled = true;
    artificialUICache.radiusInput.disabled = true;
    artificialUICache.core.disabled = true;
    artificialUICache.type.disabled = true;
    artificialUICache.radiusRange.value = project.radiusEarth;
    artificialUICache.radiusInput.value = project.radiusEarth;
  }

  const radius = project ? project.radiusEarth : getRadiusValue();
  const preview = renderCosts(project, radius, manager);
  renderStartButton(project, manager, preview);
  renderProgress(project);
  renderStash(project, manager);
  renderArtificialHistory();
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
