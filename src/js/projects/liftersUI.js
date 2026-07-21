function getLiftersUIText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function getProjectLiftersUIText(project, path, fallback, vars) {
  if (project && project.getProjectText) {
    return project.getProjectText(path, vars, fallback);
  }
  return getLiftersUIText(`ui.projects.lifters.${path}`, fallback, vars);
}

function buildStat(label) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('stat-item', 'project-summary-box');
  const labelEl = document.createElement('span');
  labelEl.classList.add('stat-label');
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.classList.add('stat-value');
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
  title.textContent = getProjectLiftersUIText(project, 'title', 'Lifter Controls');
  const titleInfo = document.createElement('span');
  titleInfo.classList.add('info-tooltip-icon');
  titleInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    titleInfo,
    getProjectLiftersUIText(project, 'titleTooltip', 'Assign lifters per recipe. Each recipe runs at (Assigned / Complexity) x unit rate. '
    + 'Gas recipes push output into space storage. Hydrogen, Methane, and Ammonia harvest assignments are capped by accessible gas giant reserves scaled by average Warp Gate Network level. '
    + 'Multi-output recipes add each output separately before normal resource cap handling. '
    + 'Star Lifting also unlocks supercharging, which multiplies throughput linearly and energy use cubically. '
    + 'Strip Atmosphere removes all gases proportionally.')
  );
  header.append(title, titleInfo);
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body');

  const summaryGrid = document.createElement('div');
  summaryGrid.classList.add('stats-grid', 'four-col', 'project-summary-grid');
  const totalStat = buildStat(getProjectLiftersUIText(project, 'totalLifters', 'Total Lifters'));
  const assignedStat = buildStat(getLiftersUIText('ui.projects.common.assigned', 'Assigned'));
  const unassignedStat = buildStat(getLiftersUIText('ui.projects.common.unassigned', 'Unassigned'));
  const expansionRateStat = buildStat(getLiftersUIText('ui.projects.common.expansion', 'Expansion'));
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
  runLabel.textContent = getProjectLiftersUIText(project, 'runLifters', 'Run lifters');
  runField.append(runCheckbox, runLabel);
  controlsGrid.appendChild(runField);

  const statusStat = buildStat(getLiftersUIText('ui.projects.common.status', 'Status'));
  controlsGrid.appendChild(statusStat.wrapper);

  const energyPerLifterStat = buildStat(getProjectLiftersUIText(project, 'energyPerLifter', 'Energy per lifter'));
  const energyPerLifterInfo = document.createElement('span');
  energyPerLifterInfo.classList.add('info-tooltip-icon');
  energyPerLifterInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    energyPerLifterInfo,
    getProjectLiftersUIText(project, 'energyPerLifterTooltip', 'Each assigned lifter uses this much space energy per second, regardless of recipe.')
  );
  energyPerLifterStat.labelEl.appendChild(energyPerLifterInfo);
  controlsGrid.appendChild(energyPerLifterStat.wrapper);

  const energyRateStat = buildStat(getProjectLiftersUIText(project, 'energyUse', 'Energy Use'));
  const energyRateInfo = document.createElement('span');
  energyRateInfo.classList.add('info-tooltip-icon');
  energyRateInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    energyRateInfo,
    getProjectLiftersUIText(project, 'energyUseTooltip', 'Each assigned lifter consumes energy while running. Can only use space energy.')
  );
  energyRateStat.labelEl.appendChild(energyRateInfo);
  controlsGrid.appendChild(energyRateStat.wrapper);

  const superchargeContainer = document.createElement('div');
  superchargeContainer.classList.add('stat-item', 'lifters-supercharge-control');
  const superchargeLabel = document.createElement('div');
  superchargeLabel.classList.add('lifters-supercharge-label');
  const superchargeLabelText = document.createElement('span');
  superchargeLabelText.textContent = getProjectLiftersUIText(project, 'supercharge', 'Supercharge');
  const superchargeValue = document.createElement('span');
  superchargeValue.classList.add('stat-value', 'lifters-supercharge-value');
  superchargeLabel.append(superchargeLabelText, superchargeValue);
  const superchargeSlider = document.createElement('input');
  superchargeSlider.type = 'range';
  superchargeSlider.min = '1';
  superchargeSlider.max = String(project.getEffectiveSuperchargeMaxMultiplier());
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

  const stepButtons = project.createAssignmentStepButtons((key, fallback) => {
    const paths = {
      divideTen: 'ui.projects.common.divideTen',
      timesTen: 'ui.projects.common.timesTen'
    };
    return getLiftersUIText(paths[key], fallback);
  });
  const stepDownButton = stepButtons.stepDownButton;
  const stepUpButton = stepButtons.stepUpButton;

  const headerRow = document.createElement('div');
  headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row', 'nuclear-alchemy-assignment-row');
  const headerName = document.createElement('span');
  headerName.classList.add('stat-label');
  headerName.textContent = getProjectLiftersUIText(project, 'recipe', 'Recipe');
  const headerComplexity = document.createElement('span');
  headerComplexity.classList.add('stat-label');
  headerComplexity.textContent = getProjectLiftersUIText(project, 'complexity', 'Complexity');
  const headerAssigned = document.createElement('span');
  headerAssigned.classList.add('stat-label');
  headerAssigned.textContent = getLiftersUIText('ui.projects.common.assigned', 'Assigned');
  const headerMax = document.createElement('span');
  headerMax.classList.add('stat-label');
  headerMax.textContent = getProjectLiftersUIText(project, 'maxAssignment', 'Max');
  const headerControls = document.createElement('div');
  headerControls.classList.add('hephaestus-assignment-controls');
  const headerButtons = document.createElement('div');
  headerButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
  headerButtons.append(stepDownButton, stepUpButton);
  const weightHeader = document.createElement('span');
  weightHeader.classList.add('stat-label', 'hephaestus-weight-header');
  weightHeader.textContent = getLiftersUIText('ui.projects.common.weight', 'Weight');
  headerControls.append(headerButtons, weightHeader);
  const headerRate = document.createElement('div');
  headerRate.classList.add('stat-label', 'nuclear-alchemy-rate-cell');
  headerRate.textContent = getLiftersUIText('ui.projects.common.rate', 'Rate');
  headerRow.append(headerName, headerComplexity, headerAssigned, headerMax, headerControls, headerRate);
  assignmentGrid.appendChild(headerRow);

  const headerDivider = document.createElement('div');
  headerDivider.classList.add('hephaestus-header-divider');
  assignmentGrid.appendChild(headerDivider);

  const rowElements = {};
  const displayKeys = [project.getUnassignedAssignmentKey()].concat(project.getRecipeKeys());
  displayKeys.forEach((key) => {
    const isUnassigned = project.isUnassignedAssignmentKey(key);
    const recipe = isUnassigned ? null : project.getRecipe(key);
    const row = document.createElement('div');
    row.classList.add('hephaestus-assignment-row', 'nuclear-alchemy-assignment-row');
    if (isUnassigned) {
      row.classList.add('assignment-divider-row');
    }

    const nameWrap = document.createElement('span');
    nameWrap.classList.add('stat-label', 'lifters-recipe-name');
    const nameText = document.createElement('span');
    nameText.textContent = isUnassigned ? project.getUnassignedAssignmentLabelText() : recipe.label;
    nameWrap.appendChild(nameText);
    if (key === 'starLifting') {
      const infoIcon = document.createElement('span');
      infoIcon.classList.add('info-tooltip-icon');
      infoIcon.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        infoIcon,
        getProjectLiftersUIText(project, 'starLiftingTooltip', 'Outputs per base unit: 1 hydrogen, 0.01 oxygen, 0.005 graphite, 0.0015 nitrogen, 0.001 silica, 0.0008 metal.')
      );
      nameWrap.appendChild(infoIcon);
    }

    const complexityEl = document.createElement('span');
    complexityEl.classList.add('stat-value');
    complexityEl.textContent = isUnassigned ? '' : formatNumber(project.getRecipeComplexity(recipe), true);

    const amountEl = document.createElement('span');
    amountEl.classList.add('stat-value');

    const maxWrap = document.createElement('span');
    maxWrap.classList.add('stat-value', 'lifters-max-value');
    const maxEl = document.createElement('span');
    const maxInfo = document.createElement('span');
    maxInfo.classList.add('info-tooltip-icon');
    maxInfo.innerHTML = '&#9432;';
    const maxTooltip = attachDynamicInfoTooltip(maxInfo, '');
    maxWrap.append(maxEl, maxInfo);

    const assignmentControls = project.createAssignmentControls(key, {
      textProvider: (controlKey, fallback) => {
        const paths = {
          zero: 'ui.projects.common.zero',
          max: 'ui.projects.common.max',
          auto: 'ui.projects.common.auto'
        };
        return getLiftersUIText(paths[controlKey], fallback);
      }
    });

    const rateEl = document.createElement('div');
    rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');

    row.append(nameWrap, complexityEl, amountEl, maxWrap, assignmentControls.controls, rateEl);
    assignmentGrid.appendChild(row);

    rowElements[key] = {
      wrapper: row,
      complexity: complexityEl,
      value: amountEl,
      maxWrap,
      maxValue: maxEl,
      maxInfo,
      maxTooltip,
      zeroButton: assignmentControls.zeroButton,
      minusButton: assignmentControls.minusButton,
      plusButton: assignmentControls.plusButton,
      maxButton: assignmentControls.maxButton,
      autoAssign: assignmentControls.autoAssign,
      weightInput: assignmentControls.weightInput,
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
  const assigned = project.getAssignedTotal(true);
  const available = project.getAvailableLifters(true, assigned);
  const totalBigInt = available + assigned;
  const step = project.getAssignmentStep();

  const totalText = formatNumber(totalBigInt, true, 2);
  const assignedText = formatNumber(assigned, true, 2);
  const availableText = formatNumber(available, true, 2);
  const statusText = project.statusText || 'Idle';
  if (elements.totalValue.textContent !== totalText) {
    elements.totalValue.textContent = totalText;
  }
  if (elements.assignedValue.textContent !== assignedText) {
    elements.assignedValue.textContent = assignedText;
  }
  if (elements.unassignedValue.textContent !== availableText) {
    elements.unassignedValue.textContent = availableText;
  }
  if (elements.statusValue.textContent !== statusText) {
    elements.statusValue.textContent = statusText;
  }
  const energyPerLifterDisplay = project.getEnergyPerLifterDisplayValue
    ? project.getEnergyPerLifterDisplayValue()
    : project.getEffectiveEnergyPerUnit();
  const energyRateDisplay = project.getEnergyRateDisplayValue
    ? project.getEnergyRateDisplayValue()
    : project.lastEnergyPerSecond;
  const energyPerLifterText = formatPerSecond(energyPerLifterDisplay);
  const energyRateText = formatPerSecond(energyRateDisplay);
  if (elements.energyPerLifterValue.textContent !== energyPerLifterText) {
    elements.energyPerLifterValue.textContent = energyPerLifterText;
  }
  if (elements.energyRateValue.textContent !== energyRateText) {
    elements.energyRateValue.textContent = energyRateText;
  }
  const expansionRate = project.isActive ? (1000 / project.getEffectiveDuration()) : 0;
  const expansionText = getProjectLiftersUIText(project, 'expansionRate', '{value} lifters/s', {
    value: formatNumber(expansionRate, true, 3)
  });
  if (elements.expansionRateValue.textContent !== expansionText) {
    elements.expansionRateValue.textContent = expansionText;
  }
  const supercharge = project.getEffectiveSuperchargeMultiplier();
  const energyMultiplier = Math.pow(supercharge, project.getEffectiveSuperchargeExponent());
  const superchargeMax = String(project.getEffectiveSuperchargeMaxMultiplier());
  const superchargeUnlocked = project.hasSuperchargeUnlocked();
  const superchargeDisabled = !superchargeUnlocked;
  const superchargeDisplay = superchargeUnlocked ? 'grid' : 'none';
  const superchargeText = `x${formatNumber(supercharge, true, 0)}`;
  const superchargeValue = String(supercharge);
  const superchargeEnergyText = getLiftersProjectText(
    'superchargeEnergy',
    { value: formatNumber(energyMultiplier, false, 2) },
    'Energy x{value}'
  );
  if (elements.superchargeSlider.max !== superchargeMax) {
    elements.superchargeSlider.max = superchargeMax;
  }
  if (elements.superchargeContainer.style.display !== superchargeDisplay) {
    elements.superchargeContainer.style.display = superchargeDisplay;
  }
  if (elements.superchargeValue.textContent !== superchargeText) {
    elements.superchargeValue.textContent = superchargeText;
  }
  if (elements.superchargeSlider.value !== superchargeValue) {
    elements.superchargeSlider.value = superchargeValue;
  }
  if (elements.superchargeSlider.disabled !== superchargeDisabled) {
    elements.superchargeSlider.disabled = superchargeDisabled;
  }
  if (elements.superchargeEnergyValue.textContent !== superchargeEnergyText) {
    elements.superchargeEnergyValue.textContent = superchargeEnergyText;
  }

  const controlsDisabled = totalBigInt <= 0n;
  if (elements.runCheckbox.checked !== project.isRunning) {
    elements.runCheckbox.checked = project.isRunning;
  }
  if (elements.runCheckbox.disabled !== controlsDisabled) {
    elements.runCheckbox.disabled = controlsDisabled;
  }
  if (elements.stepDownButton.disabled !== controlsDisabled) {
    elements.stepDownButton.disabled = controlsDisabled;
  }
  if (elements.stepUpButton.disabled !== controlsDisabled) {
    elements.stepUpButton.disabled = controlsDisabled;
  }
  const displayKeys = [project.getUnassignedAssignmentKey()].concat(project.getRecipeKeys());
  displayKeys.forEach((key) => {
    const isUnassigned = project.isUnassignedAssignmentKey(key);
    const recipe = isUnassigned ? null : project.getRecipe(key);
    const row = elements.rowElements[key];
    if (!row) {
      return;
    }

    const isAvailable = isUnassigned || project.isRecipeAvailable(key, recipe);
    const rowDisplay = isAvailable ? '' : 'none';
    if (row.wrapper.style.display !== rowDisplay) {
      row.wrapper.style.display = rowDisplay;
    }
    if (!isAvailable) {
      return;
    }

    const storedCurrent = project.getStoredAssignmentAmount(key);
    const displayedCurrent = project.getDisplayedAssignmentAmount(key);
    const maxForKey = project.getAssignmentMaxTarget(key);
    const displayedCap = isUnassigned ? null : project.getMaxAssignmentForRecipe(key, recipe);
    const showMaxTooltip = displayedCap !== null && displayedCap > 0n;

    const complexityText = isUnassigned ? '' : formatNumber(project.getRecipeComplexity(recipe), true);
    const valueText = formatNumber(displayedCurrent, true, 2);
    const maxText = displayedCap === null ? '' : formatNumber(displayedCap, true, 2);
    const maxInfoDisplay = showMaxTooltip ? '' : 'none';
    if (row.complexity.textContent !== complexityText) {
      row.complexity.textContent = complexityText;
    }
    if (row.value.textContent !== valueText) {
      row.value.textContent = valueText;
    }
    if (row.maxValue.textContent !== maxText) {
      row.maxValue.textContent = maxText;
    }
    if (row.maxInfo.style.display !== maxInfoDisplay) {
      row.maxInfo.style.display = maxInfoDisplay;
    }
    if (showMaxTooltip) {
      const tooltipText = project.getMaxAssignmentTooltipText(key, recipe);
      if (row.maxTooltip.textContent !== tooltipText) {
        row.maxTooltip.textContent = tooltipText;
      }
      if (row.maxTooltip.style.whiteSpace !== 'pre-line') {
        row.maxTooltip.style.whiteSpace = 'pre-line';
      }
    }
    project.updateAssignmentControls(row, key, totalBigInt, step);

    const rate = isUnassigned ? 0 : (project.lastDisplayedRatesByRecipe?.[key] || 0);
    const rateText = isUnassigned ? '' : formatPerSecond(rate);
    if (row.rate.textContent !== rateText) {
      row.rate.textContent = rateText;
    }
    const productivity = isUnassigned ? 1 : project.getDisplayedRecipeProductivity(key);
    const productivityLimited = !isUnassigned && project.isRunning && storedCurrent > 0n && productivity < 1;
    if (row.rate.classList.contains('project-rate-productivity-limited') !== productivityLimited) {
      row.rate.classList.toggle('project-rate-productivity-limited', productivityLimited);
    }
  });

  if (elements.note) {
    const unitRate = formatNumber(project.getEffectiveUnitRatePerLifter(), true);
    const noteText = getProjectLiftersUIText(
      project,
      'operationNote',
      `Per recipe rate uses (Assigned / Complexity) x ${unitRate} units/s. Max is the current assignment cap after Warp Gate Network access, lifter stripping cap, complexity, throughput, and supercharge.`,
      { value: unitRate }
    );
    if (elements.note.textContent !== noteText) {
      elements.note.textContent = noteText;
    }
  }
}

if (typeof window !== 'undefined') {
  window.renderLiftersUI = renderLiftersUI;
  window.updateLiftersUI = updateLiftersUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderLiftersUI, updateLiftersUI };
}
