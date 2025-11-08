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

function renderLiftersUI(project, container) {
  projectElements[project.name] = projectElements[project.name] || {};

  const card = document.createElement('div');
  card.classList.add('info-card', 'lifters-card');

  const header = document.createElement('div');
  header.classList.add('card-header');
  const title = document.createElement('span');
  title.classList.add('card-title');
  title.textContent = 'Lifter Command';
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

  controlsGrid.append(modeField, runField, energyRateStat.wrapper);
  body.appendChild(controlsGrid);

  const statusGrid = document.createElement('div');
  statusGrid.classList.add('stats-grid', 'two-col', 'lifters-status-grid');
  const statusStat = buildStat('Status');
  statusStat.wrapper.classList.add('lifters-status');
  statusGrid.appendChild(statusStat.wrapper);
  body.appendChild(statusGrid);

  const note = document.createElement('p');
  note.classList.add('project-description', 'lifters-note');
  note.textContent = 'Gas giant harvests feed hydrogen directly into space storage, atmosphere mode peels every gas proportionally, getting rid of it.  Unused Dyson energy is used first.';
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

  projectElements[project.name] = {
    ...projectElements[project.name],
    liftersCard: card,
    liftersCountElement: completedStat.valueEl,
    liftersCapacityElement: capacityStat.valueEl,
    liftersEnergyUnitElement: energyStat.valueEl,
    liftersModeSelect: modeSelect,
    liftersRunCheckbox: runCheckbox,
    liftersEnergyRateElement: energyRateStat.valueEl,
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

  elements.liftersCountElement.textContent = formatNumber(project.repeatCount, false, 0);
  elements.liftersCapacityElement.textContent = formatNumber(project.unitRatePerLifter, true);
  elements.liftersEnergyUnitElement.textContent = formatNumber(project.energyPerUnit, true);

  if (elements.liftersModeSelect.value !== project.mode) {
    elements.liftersModeSelect.value = project.mode;
  }
  elements.liftersRunCheckbox.checked = project.isRunning;
  elements.liftersRunCheckbox.disabled = project.repeatCount === 0;

  elements.liftersEnergyRateElement.textContent = formatPerSecond(project.lastEnergyPerSecond);

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
