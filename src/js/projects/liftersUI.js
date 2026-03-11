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

function formatPerSecond(value) {
  if (!value) {
    return '0';
  }
  return `${formatNumber(value, true, 3)}/s`;
}

function renderLiftersUI(project, container) {
  projectElements[project.name] = projectElements[project.name] || {};

  const card = document.createElement('div');
  card.classList.add('info-card', 'lifters-card', 'nuclear-alchemy-card');

  const header = document.createElement('div');
  header.classList.add('card-header');
  const title = document.createElement('span');
  title.classList.add('card-title');
  title.textContent = 'Lifter Controls';
  const titleInfo = document.createElement('span');
  titleInfo.classList.add('info-tooltip-icon');
  titleInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    titleInfo,
    'Assign lifters per recipe. Each recipe runs at (Assigned / Complexity) x unit rate. '
    + 'Gas recipes push output into space storage. Multi-output recipes add each output separately before normal resource cap handling. '
    + 'Star Lifting also unlocks supercharging, which multiplies throughput linearly and energy use cubically. '
    + 'Strip Atmosphere removes all gases proportionally.'
  );
  header.append(title, titleInfo);
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body');

  const summaryGrid = document.createElement('div');
  summaryGrid.classList.add('stats-grid', 'four-col', 'project-summary-grid');
  const totalStat = buildStat('Total Lifters');
  const assignedStat = buildStat('Assigned');
  const unassignedStat = buildStat('Unassigned');
  const expansionRateStat = buildStat('Expansion');
  summaryGrid.append(totalStat.wrapper, assignedStat.wrapper, unassignedStat.wrapper, expansionRateStat.wrapper);
  body.appendChild(summaryGrid);

  const controlsGrid = document.createElement('div');
  controlsGrid.classList.add('stats-grid', 'four-col', 'nuclear-alchemy-controls-grid', 'lifters-controls-grid');

  const runField = document.createElement('div');
  runField.classList.add('stat-item');
  const runCheckbox = document.createElement('input');
  runCheckbox.type = 'checkbox';
  runCheckbox.id = `${project.name}-lifters-run`;
  const runLabel = document.createElement('label');
  runLabel.htmlFor = runCheckbox.id;
  runLabel.textContent = 'Run lifters';
  runField.append(runCheckbox, runLabel);
  controlsGrid.appendChild(runField);

  const statusStat = buildStat('Status');
  controlsGrid.appendChild(statusStat.wrapper);

  const energyPerLifterStat = buildStat('Energy per lifter');
  const energyPerLifterInfo = document.createElement('span');
  energyPerLifterInfo.classList.add('info-tooltip-icon');
  energyPerLifterInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    energyPerLifterInfo,
    'Each assigned lifter uses this much space energy per second, regardless of recipe.'
  );
  energyPerLifterStat.labelEl.appendChild(energyPerLifterInfo);
  controlsGrid.appendChild(energyPerLifterStat.wrapper);

  const energyRateStat = buildStat('Energy Use');
  const energyRateInfo = document.createElement('span');
  energyRateInfo.classList.add('info-tooltip-icon');
  energyRateInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    energyRateInfo,
    'Each assigned lifter consumes energy while running. Can only use space energy.'
  );
  energyRateStat.labelEl.appendChild(energyRateInfo);
  controlsGrid.appendChild(energyRateStat.wrapper);

  const superchargeContainer = document.createElement('div');
  superchargeContainer.classList.add('stat-item', 'lifters-supercharge-control');
  const superchargeLabel = document.createElement('div');
  superchargeLabel.classList.add('lifters-supercharge-label');
  const superchargeLabelText = document.createElement('span');
  superchargeLabelText.textContent = 'Supercharge';
  const superchargeValue = document.createElement('span');
  superchargeValue.classList.add('stat-value', 'lifters-supercharge-value');
  superchargeLabel.append(superchargeLabelText, superchargeValue);
  const superchargeSlider = document.createElement('input');
  superchargeSlider.type = 'range';
  superchargeSlider.min = '1';
  superchargeSlider.max = '10';
  superchargeSlider.step = '1';
  superchargeSlider.classList.add('lifters-supercharge-slider');
  superchargeSlider.addEventListener('input', () => {
    project.setSuperchargeMultiplier(superchargeSlider.value);
  });
  const superchargeEnergyValue = document.createElement('span');
  superchargeEnergyValue.classList.add('stat-value', 'lifters-supercharge-energy');
  superchargeContainer.append(superchargeLabel, superchargeSlider, superchargeEnergyValue);

  body.appendChild(controlsGrid);
  body.appendChild(superchargeContainer);

  const assignmentGrid = document.createElement('div');
  assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list', 'lifters-assignment-list');

  const stepDownButton = document.createElement('button');
  stepDownButton.textContent = '/10';
  stepDownButton.addEventListener('click', () => {
    project.setAssignmentStep(project.assignmentStep / 10);
    project.updateUI();
  });

  const stepUpButton = document.createElement('button');
  stepUpButton.textContent = 'x10';
  stepUpButton.addEventListener('click', () => {
    project.setAssignmentStep(project.assignmentStep * 10);
    project.updateUI();
  });

  const headerRow = document.createElement('div');
  headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row', 'nuclear-alchemy-assignment-row');
  const headerName = document.createElement('span');
  headerName.classList.add('stat-label');
  headerName.textContent = 'Recipe';
  const headerComplexity = document.createElement('span');
  headerComplexity.classList.add('stat-label');
  headerComplexity.textContent = 'Complexity';
  const headerAssigned = document.createElement('span');
  headerAssigned.classList.add('stat-label');
  headerAssigned.textContent = 'Assigned';
  const headerControls = document.createElement('div');
  headerControls.classList.add('hephaestus-assignment-controls');
  const headerButtons = document.createElement('div');
  headerButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
  headerButtons.append(stepDownButton, stepUpButton);
  const weightHeader = document.createElement('span');
  weightHeader.classList.add('stat-label', 'hephaestus-weight-header');
  weightHeader.textContent = 'Weight';
  headerControls.append(headerButtons, weightHeader);
  const headerRate = document.createElement('div');
  headerRate.classList.add('stat-label', 'nuclear-alchemy-rate-cell');
  headerRate.textContent = 'Rate';
  headerRow.append(headerName, headerComplexity, headerAssigned, headerControls, headerRate);
  assignmentGrid.appendChild(headerRow);

  const headerDivider = document.createElement('div');
  headerDivider.classList.add('hephaestus-header-divider');
  assignmentGrid.appendChild(headerDivider);

  const rowElements = {};
  project.getRecipeKeys().forEach((key) => {
    const recipe = project.getRecipe(key);
    const row = document.createElement('div');
    row.classList.add('hephaestus-assignment-row', 'nuclear-alchemy-assignment-row');

    const nameWrap = document.createElement('span');
    nameWrap.classList.add('stat-label', 'lifters-recipe-name');
    const nameText = document.createElement('span');
    nameText.textContent = recipe.label;
    nameWrap.appendChild(nameText);
    if (key === 'starLifting') {
      const infoIcon = document.createElement('span');
      infoIcon.classList.add('info-tooltip-icon');
      infoIcon.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        infoIcon,
        'Outputs per base unit: 1 hydrogen, 0.01 oxygen, 0.005 graphite, 0.001 nitrogen, 0.001 silica, 0.001 metal.'
      );
      nameWrap.appendChild(infoIcon);
    }

    const complexityEl = document.createElement('span');
    complexityEl.classList.add('stat-value');

    const amountEl = document.createElement('span');
    amountEl.classList.add('stat-value');

    const zeroButton = document.createElement('button');
    zeroButton.textContent = '0';
    zeroButton.addEventListener('click', () => {
      project.clearAssignment(key);
    });

    const minusButton = document.createElement('button');
    minusButton.addEventListener('click', () => project.adjustAssignment(key, -project.assignmentStep));

    const plusButton = document.createElement('button');
    plusButton.addEventListener('click', () => project.adjustAssignment(key, project.assignmentStep));

    const maxButton = document.createElement('button');
    maxButton.textContent = 'Max';
    maxButton.addEventListener('click', () => {
      project.maximizeAssignment(key);
    });

    const autoAssignContainer = document.createElement('div');
    autoAssignContainer.classList.add('hephaestus-auto-assign');
    const autoAssign = document.createElement('input');
    autoAssign.type = 'checkbox';
    autoAssign.addEventListener('change', () => {
      project.setAutoAssignTarget(key, autoAssign.checked);
    });
    const autoAssignLabel = document.createElement('span');
    autoAssignLabel.textContent = 'Auto';
    autoAssignLabel.addEventListener('click', () => {
      autoAssign.checked = !autoAssign.checked;
      project.setAutoAssignTarget(key, autoAssign.checked);
    });
    autoAssignContainer.append(autoAssign, autoAssignLabel);

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.step = '0.1';
    weightInput.value = String(project.autoAssignWeights[key] || 1);
    weightInput.classList.add('hephaestus-weight-input');
    weightInput.addEventListener('input', () => {
      const value = Number(weightInput.value);
      project.autoAssignWeights[key] = Number.isFinite(value) && value > 0 ? value : 1;
      project.normalizeAssignments();
      project.updateUI();
    });

    const controls = document.createElement('div');
    controls.classList.add('hephaestus-assignment-controls');
    const controlButtons = document.createElement('div');
    controlButtons.classList.add('hephaestus-control-buttons');
    controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
    controls.append(controlButtons, weightInput);

    const rateEl = document.createElement('div');
    rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');

    row.append(nameWrap, complexityEl, amountEl, controls, rateEl);
    assignmentGrid.appendChild(row);

    rowElements[key] = {
      wrapper: row,
      complexity: complexityEl,
      value: amountEl,
      zeroButton,
      minusButton,
      plusButton,
      maxButton,
      autoAssign,
      weightInput,
      rate: rateEl,
    };
  });

  body.appendChild(assignmentGrid);

  const note = document.createElement('p');
  note.classList.add('project-description', 'lifters-note');
  note.textContent = '';
  body.appendChild(note);

  runCheckbox.addEventListener('change', (event) => {
    project.setRunning(event.target.checked);
  });

  card.appendChild(body);
  container.appendChild(card);

  const costElement = projectElements[project.name]?.costElement;
  if (costElement) {
    costElement.classList.add('lifters-cost-row');
    container.appendChild(costElement);
  }

  projectElements[project.name] = {
    ...projectElements[project.name],
    liftersCard: card,
    totalValue: totalStat.valueEl,
    assignedValue: assignedStat.valueEl,
    unassignedValue: unassignedStat.valueEl,
    runCheckbox,
    statusValue: statusStat.valueEl,
    energyPerLifterValue: energyPerLifterStat.valueEl,
    energyRateValue: energyRateStat.valueEl,
    expansionRateValue: expansionRateStat.valueEl,
    superchargeContainer,
    superchargeValue,
    superchargeSlider,
    superchargeEnergyValue,
    stepDownButton,
    stepUpButton,
    rowElements,
    note,
  };

  updateLiftersUI(project);
}

function updateLiftersUI(project) {
  const elements = projectElements[project.name];
  if (!elements || !elements.liftersCard) {
    return;
  }

  project.normalizeAssignments();
  const total = project.repeatCount;
  const assigned = project.getAssignedTotal();
  const available = Math.max(0, total - assigned);
  const step = project.assignmentStep;
  const activeKeys = project.getAssignmentKeys();

  elements.totalValue.textContent = formatNumber(total, true, 2);
  elements.assignedValue.textContent = formatNumber(assigned, true, 2);
  elements.unassignedValue.textContent = formatNumber(available, true, 2);
  elements.statusValue.textContent = project.statusText || 'Idle';
  elements.energyPerLifterValue.textContent = formatPerSecond(project.getEffectiveEnergyPerUnit());
  elements.energyRateValue.textContent = formatPerSecond(project.lastEnergyPerSecond);
  const expansionRate = project.isActive ? (1000 / project.getEffectiveDuration()) : 0;
  elements.expansionRateValue.textContent = `${formatNumber(expansionRate, true, 3)} lifters/s`;
  const supercharge = project.getEffectiveSuperchargeMultiplier();
  const energyMultiplier = supercharge * supercharge * supercharge;
  elements.superchargeContainer.style.display = project.hasSuperchargeUnlocked() ? 'grid' : 'none';
  elements.superchargeValue.textContent = `x${formatNumber(project.getEffectiveSuperchargeMultiplier(), true, 0)}`;
  elements.superchargeSlider.value = String(project.getEffectiveSuperchargeMultiplier());
  elements.superchargeSlider.disabled = !project.hasSuperchargeUnlocked();
  elements.superchargeEnergyValue.textContent = `Energy x${formatNumber(energyMultiplier, true, 0)}`;

  elements.runCheckbox.checked = project.isRunning;
  elements.runCheckbox.disabled = total <= 0;
  elements.stepDownButton.disabled = total <= 0;
  elements.stepUpButton.disabled = total <= 0;

  project.getRecipeKeys().forEach((key) => {
    const recipe = project.getRecipe(key);
    const row = elements.rowElements[key];
    if (!row || !recipe) {
      return;
    }

    const isAvailable = project.isRecipeAvailable(key, recipe);
    row.wrapper.style.display = isAvailable ? '' : 'none';
    if (!isAvailable) {
      return;
    }

    const current = project.lifterAssignments[key] || 0;
    const usedOther = activeKeys.reduce((sum, otherKey) => {
      if (otherKey === key) {
        return sum;
      }
      if (project.autoAssignFlags[otherKey]) {
        return sum;
      }
      return sum + (project.lifterAssignments[otherKey] || 0);
    }, 0);
    const maxForKey = Math.max(0, total - usedOther);

    row.complexity.textContent = formatNumber(project.getRecipeComplexity(recipe), true);
    row.value.textContent = formatNumber(current, true);
    row.minusButton.textContent = `-${formatNumber(step, true)}`;
    row.plusButton.textContent = `+${formatNumber(step, true)}`;
    row.autoAssign.checked = project.autoAssignFlags[key] === true;
    row.autoAssign.disabled = total <= 0;
    row.weightInput.value = String(project.autoAssignWeights[key] || 1);
    row.weightInput.disabled = total <= 0;
    row.zeroButton.disabled = current <= 0 || project.autoAssignFlags[key];
    row.maxButton.disabled = current >= maxForKey || total <= 0 || project.autoAssignFlags[key];
    row.minusButton.disabled = current <= 0 || project.autoAssignFlags[key];
    row.plusButton.disabled = current >= maxForKey || total <= 0 || project.autoAssignFlags[key];

    const rate = project.lastDisplayedRatesByRecipe?.[key] || 0;
    row.rate.textContent = formatPerSecond(rate);
    const productivity = project.getDisplayedRecipeProductivity(key);
    const productivityLimited = project.isRunning && current > 0 && productivity < 1;
    row.rate.classList.toggle('project-rate-productivity-limited', productivityLimited);
  });

  if (elements.note) {
    const unitRate = formatNumber(project.getEffectiveUnitRatePerLifter(), true);
    elements.note.textContent = `Per recipe rate uses (Assigned / Complexity) x ${unitRate} units/s.`;
  }
}

if (typeof window !== 'undefined') {
  window.renderLiftersUI = renderLiftersUI;
  window.updateLiftersUI = updateLiftersUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLiftersUI, updateLiftersUI };
}
