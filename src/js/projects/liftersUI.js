function createInfoIcon(title) {
  const icon = document.createElement('span');
  icon.classList.add('info-tooltip-icon');
  icon.innerHTML = '&#9432;';
  icon.title = title;
  return icon;
}

function buildStat(label) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('stat-item');
  const labelEl = document.createElement('span');
  labelEl.classList.add('stat-label');
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  wrapper.append(labelEl, valueEl);
  return { wrapper, valueEl, labelEl };
}

function createModeSelect(project) {
  const select = document.createElement('select');
  select.id = `${project.name}-lifters-mode`;
  project.getModeOptions().forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    select.appendChild(opt);
  });
  return select;
}

function buildSelectOptions(select, options) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    select.appendChild(opt);
  });
}

function createRecipeSelect(project) {
  const select = document.createElement('select');
  select.id = `${project.name}-lifters-recipe`;
  buildSelectOptions(select, project.getHarvestOptions());
  return select;
}

function syncRecipeSelect(select, project) {
  const options = project.getHarvestOptions();
  const matches = options.length === select.options.length
    && options.every((option, index) => select.options[index]?.value === option.value);
  if (!matches) {
    buildSelectOptions(select, options);
  }
  if (select.value !== project.harvestRecipeKey) {
    select.value = project.harvestRecipeKey;
  }
  select.disabled = project.mode !== 'gasHarvest';
}

function renderLiftersUI(project, container) {
  projectElements[project.name] = projectElements[project.name] || {};

  const card = document.createElement('div');
  card.classList.add('info-card', 'lifters-card');

  const header = document.createElement('div');
  header.classList.add('card-header');
  const title = document.createElement('span');
  title.classList.add('card-title');
  title.textContent = 'Lifter Controls';
  header.appendChild(title);
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body');

  const summaryGrid = document.createElement('div');
  summaryGrid.classList.add('stats-grid', 'three-col');
  const completedStat = buildStat('Completed Lifters:');
  const capacityStat = buildStat('Capacity / Lifter:');
  const energyStat = buildStat('Energy / Unit:');
  energyStat.labelEl.appendChild(
    createInfoIcon('Each unit lifted requires 1e7 energy whether drawn from colony grids or spare Dyson collectors.'),
  );
  summaryGrid.append(completedStat.wrapper, capacityStat.wrapper, energyStat.wrapper);
  body.appendChild(summaryGrid);

  const controlsGrid = document.createElement('div');
  controlsGrid.classList.add('stats-grid', 'three-col', 'lifters-controls');

  const modeField = document.createElement('div');
  modeField.classList.add('stat-item', 'lifter-mode-field');
  modeField.style.display = 'flex';
  modeField.style.alignItems = 'center';
  modeField.style.gap = '8px';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = 'Mode';
  modeLabel.htmlFor = `${project.name}-lifters-mode`;
  modeLabel.classList.add('stat-label');
  modeLabel.style.margin = '0';
  modeLabel.style.whiteSpace = 'nowrap';
  const modeSelect = createModeSelect(project);
  modeField.append(modeLabel, modeSelect);

  const recipeField = document.createElement('div');
  recipeField.classList.add('stat-item', 'lifter-recipe-field');
  recipeField.style.display = 'flex';
  recipeField.style.alignItems = 'center';
  recipeField.style.gap = '8px';
  const recipeLabel = document.createElement('label');
  recipeLabel.textContent = 'Harvest';
  recipeLabel.htmlFor = `${project.name}-lifters-recipe`;
  recipeLabel.classList.add('stat-label');
  recipeLabel.style.margin = '0';
  recipeLabel.style.whiteSpace = 'nowrap';
  const recipeSelect = createRecipeSelect(project);
  recipeField.append(recipeLabel, recipeSelect);

  const runField = document.createElement('div');
  runField.classList.add('stat-item', 'lifter-run-toggle');
  const runCheckbox = document.createElement('input');
  runCheckbox.type = 'checkbox';
  runCheckbox.id = `${project.name}-lifters-run`;
  const runLabel = document.createElement('label');
  runLabel.htmlFor = runCheckbox.id;
  runLabel.textContent = 'Run lifters';
  runField.append(runCheckbox, runLabel);

  const energyRateStat = buildStat('Energy Rate');
  energyRateStat.wrapper.classList.add('lifters-energy-rate');

  controlsGrid.append(modeField, recipeField, runField, energyRateStat.wrapper);
  body.appendChild(controlsGrid);

  const statusGrid = document.createElement('div');
  statusGrid.classList.add('stats-grid', 'two-col', 'lifters-status-grid');
  const statusStat = buildStat('Status');
  statusStat.wrapper.classList.add('lifters-status');
  const expansionRateStat = buildStat('Expansion/s');
  expansionRateStat.wrapper.classList.add('lifters-expansion-rate');
  statusGrid.append(statusStat.wrapper, expansionRateStat.wrapper);
  body.appendChild(statusGrid);

  const note = document.createElement('p');
  note.classList.add('project-description', 'lifters-note');
  note.textContent = 'Gas giant harvests feed gases into space storage, atmosphere mode peels every gas proportionally, getting rid of it.  Unused Dyson energy is used first; allow colony usage in automation if overflow is insufficient.';
  body.appendChild(note);

  card.appendChild(body);
  container.appendChild(card);

  const costElement = projectElements[project.name]?.costElement;
  if (costElement) {
    costElement.classList.add('lifters-cost-row');
    container.appendChild(costElement);
  }

  runCheckbox.addEventListener('change', (event) => {
    project.setRunning(event.target.checked);
  });
  modeSelect.addEventListener('change', () => {
    project.setMode(modeSelect.value);
  });
  recipeSelect.addEventListener('change', () => {
    project.setHarvestRecipe(recipeSelect.value);
  });

  projectElements[project.name] = {
    ...projectElements[project.name],
    liftersCard: card,
    liftersCountElement: completedStat.valueEl,
    liftersCapacityElement: capacityStat.valueEl,
    liftersCapacityLabel: capacityStat.labelEl,
    liftersEnergyUnitElement: energyStat.valueEl,
    liftersModeSelect: modeSelect,
    liftersRecipeSelect: recipeSelect,
    liftersRunCheckbox: runCheckbox,
    liftersEnergyRateElement: energyRateStat.valueEl,
    liftersExpansionRateElement: expansionRateStat.valueEl,
    liftersStatusElement: statusStat.valueEl,
    liftersNoteElement: note,
  };

  updateLiftersUI(project);
}

function formatPerSecond(value) {
  if (!value) {
    return '0';
  }
  return `${formatNumber(value, true)}/s`;
}

function updateLiftersUI(project) {
  const elements = projectElements[project.name];
  if (!elements || !elements.liftersCard) {
    return;
  }

  elements.liftersCountElement.textContent = formatNumber(project.repeatCount, false, 2);
  elements.liftersCapacityLabel.textContent = project.getCapacityLabel();
  elements.liftersCapacityElement.textContent = formatNumber(project.getCapacityPerLifter(), true);
  elements.liftersEnergyUnitElement.textContent = formatNumber(project.energyPerUnit, true);

  if (elements.liftersModeSelect.value !== project.mode) {
    elements.liftersModeSelect.value = project.mode;
  }
  syncRecipeSelect(elements.liftersRecipeSelect, project);
  elements.liftersRunCheckbox.checked = project.isRunning;
  elements.liftersRunCheckbox.disabled = project.repeatCount === 0;

  elements.liftersEnergyRateElement.textContent = formatPerSecond(project.lastEnergyPerSecond);
  if (elements.liftersExpansionRateElement) {
    const rate = project.isActive ? (1000 / project.getEffectiveDuration()) : 0;
    elements.liftersExpansionRateElement.textContent = `${formatNumber(rate, true, 3)} expansions/s`;
  }

  const status = project.statusText || 'Idle';
  elements.liftersStatusElement.textContent = status;
  elements.liftersStatusElement.parentElement.classList.toggle('active', status === 'Running');
}

if (typeof window !== 'undefined') {
  window.renderLiftersUI = renderLiftersUI;
  window.updateLiftersUI = updateLiftersUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLiftersUI, updateLiftersUI };
}
