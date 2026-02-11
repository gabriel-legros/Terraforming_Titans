const followersUICache = {
  host: null,
  initialized: false,
  root: null,
  summary: null,
  modeToggle: null,
  stepValue: null,
  divideStepButton: null,
  multiplyStepButton: null,
  rowsById: {},
};

function cacheFollowersUIElements() {
  if (!followersUICache.host || !followersUICache.host.isConnected) {
    followersUICache.host = document.getElementById('followers-colonies-content');
  }
}

function createFollowersCard(titleText, cardClass, tooltipText) {
  const card = document.createElement('div');
  card.classList.add('project-card', 'followers-card');
  if (cardClass) {
    card.classList.add(cardClass);
  }

  const header = document.createElement('div');
  header.classList.add('card-header', 'followers-card-header');

  const title = document.createElement('span');
  title.classList.add('card-title', 'followers-card-title');
  title.textContent = titleText;

  header.appendChild(title);
  if (tooltipText) {
    const icon = document.createElement('span');
    icon.classList.add('info-tooltip-icon');
    icon.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(icon, tooltipText);
    header.appendChild(icon);
  }
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body', 'followers-card-body');
  card.appendChild(body);

  return { card, body };
}

function buildFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  followersUICache.host.innerHTML = '';
  followersUICache.rowsById = {};

  const root = document.createElement('div');
  root.id = 'followers-layout';
  root.classList.add('followers-layout');

  const orbitalsTooltipText = [
    'Assign orbitals to produce resources automatically.',
    'You can assign up to your effective terraformed world count.',
    'Manual mode sets exact assignments with the current step size.',
    'Weight mode distributes assignments by integer weights among unlocked resources.',
    'Each orbital produces the mapped source output with its multiplier, without consumption or productivity scaling.',
    'Orbitals only produce if the target resource is unlocked.'
  ].join('\n');
  const orbitals = createFollowersCard('Orbitals', 'followers-orbitals-card', orbitalsTooltipText);

  const summary = document.createElement('div');
  summary.id = 'followers-orbitals-summary';
  summary.classList.add('followers-orbitals-summary');
  summary.textContent = 'Orbitals Assigned: 0 / 0 | Unassigned: 0';
  orbitals.body.appendChild(summary);

  const modeRow = document.createElement('div');
  modeRow.classList.add('followers-mode-row');

  const modeLabel = document.createElement('span');
  modeLabel.classList.add('followers-inline-label');
  modeLabel.textContent = 'Mode';

  const modeToggle = createToggleButton({ onLabel: 'Weight', offLabel: 'Manual', isOn: false });
  modeToggle.classList.add('followers-mode-toggle');

  const stepControls = document.createElement('div');
  stepControls.classList.add('followers-step-controls');

  const stepLabel = document.createElement('span');
  stepLabel.classList.add('followers-inline-label');
  stepLabel.textContent = 'Step';

  const stepValue = document.createElement('span');
  stepValue.id = 'followers-assignment-step';
  stepValue.classList.add('followers-step-value');
  stepValue.textContent = '1';

  const divideStepButton = document.createElement('button');
  divideStepButton.type = 'button';
  divideStepButton.classList.add('followers-action-button', 'followers-step-button');
  divideStepButton.textContent = '/10';

  const multiplyStepButton = document.createElement('button');
  multiplyStepButton.type = 'button';
  multiplyStepButton.classList.add('followers-action-button', 'followers-step-button');
  multiplyStepButton.textContent = 'x10';

  stepControls.append(stepLabel, stepValue, divideStepButton, multiplyStepButton);
  modeRow.append(modeLabel, modeToggle, stepControls);
  orbitals.body.appendChild(modeRow);

  const rowsContainer = document.createElement('div');
  rowsContainer.classList.add('followers-orbitals-grid');

  const configs = followersOrbitalParameters.orbitals;
  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i];

    const row = document.createElement('div');
    row.classList.add('followers-orbital-card');

    const top = document.createElement('div');
    top.classList.add('followers-orbital-top');

    const title = document.createElement('span');
    title.classList.add('followers-orbital-title');
    title.textContent = config.label;

    const assigned = document.createElement('span');
    assigned.classList.add('followers-orbital-assigned');
    assigned.textContent = 'Assigned: 0';

    const assignedBlock = document.createElement('div');
    assignedBlock.classList.add('followers-orbital-assigned-block');

    const autoAssignRow = document.createElement('label');
    autoAssignRow.classList.add('followers-auto-assign-row');

    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.classList.add('followers-auto-assign-checkbox');

    const autoAssignText = document.createElement('span');
    autoAssignText.classList.add('followers-auto-assign-text');
    autoAssignText.textContent = 'Auto assign';

    autoAssignRow.append(autoAssignCheckbox, autoAssignText);
    assignedBlock.append(assigned, autoAssignRow);

    top.append(title, assignedBlock);

    const stats = document.createElement('div');
    stats.classList.add('followers-orbital-stats');

    const perOrbitalRate = document.createElement('span');
    perOrbitalRate.classList.add('followers-orbital-rate');
    perOrbitalRate.textContent = 'Per orbital: +0/s';

    const totalRate = document.createElement('span');
    totalRate.classList.add('followers-orbital-rate', 'followers-orbital-rate-total');
    totalRate.textContent = 'Total: +0/s';

    stats.append(perOrbitalRate, totalRate);

    const manualControls = document.createElement('div');
    manualControls.classList.add('followers-manual-controls');

    const manualZero = document.createElement('button');
    manualZero.type = 'button';
    manualZero.classList.add('followers-action-button', 'followers-manual-button');
    manualZero.textContent = '0';

    const manualMinus = document.createElement('button');
    manualMinus.type = 'button';
    manualMinus.classList.add('followers-action-button', 'followers-manual-button');
    manualMinus.textContent = '-1';

    const manualPlus = document.createElement('button');
    manualPlus.type = 'button';
    manualPlus.classList.add('followers-action-button', 'followers-manual-button');
    manualPlus.textContent = '+1';

    const manualMax = document.createElement('button');
    manualMax.type = 'button';
    manualMax.classList.add('followers-action-button', 'followers-manual-button', 'followers-manual-button-max');
    manualMax.textContent = 'Max';

    manualControls.append(manualZero, manualMinus, manualPlus, manualMax);

    const weightControls = document.createElement('div');
    weightControls.classList.add('followers-weight-controls');
    weightControls.style.display = 'none';

    const weightLabel = document.createElement('span');
    weightLabel.classList.add('followers-inline-label');
    weightLabel.textContent = 'Weight';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.step = '1';
    weightInput.value = '0';
    weightInput.classList.add('followers-weight-input');

    weightControls.append(weightLabel, weightInput);

    row.append(top, stats, manualControls, weightControls);
    rowsContainer.appendChild(row);

    followersUICache.rowsById[config.id] = {
      assigned,
      perOrbitalRate,
      totalRate,
      manualControls,
      manualZero,
      manualMinus,
      manualPlus,
      manualMax,
      autoAssignRow,
      autoAssignCheckbox,
      weightControls,
      weightInput,
      weightWire: null,
    };

    manualZero.addEventListener('click', () => {
      followersManager.setManualAssignment(config.id, 0);
    });
    manualMinus.addEventListener('click', () => {
      followersManager.adjustManualAssignment(config.id, -followersManager.getAssignmentStep());
    });
    manualPlus.addEventListener('click', () => {
      followersManager.adjustManualAssignment(config.id, followersManager.getAssignmentStep());
    });
    manualMax.addEventListener('click', () => {
      followersManager.setManualAssignmentToMax(config.id);
    });
    autoAssignCheckbox.addEventListener('change', () => {
      followersManager.setAutoAssign(config.id, autoAssignCheckbox.checked);
    });

    const wire = wireStringNumberInput(weightInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        if (!Number.isFinite(parsed)) {
          return 0;
        }
        return Math.max(0, Math.floor(parsed));
      },
      formatValue: (value) => String(Math.max(0, Math.floor(value))),
      datasetKey: 'weight',
      onValue: (parsed) => {
        followersManager.setWeight(config.id, parsed);
      }
    });
    followersUICache.rowsById[config.id].weightWire = wire;
  }

  orbitals.body.appendChild(rowsContainer);

  const bottomRow = document.createElement('div');
  bottomRow.classList.add('followers-secondary-row');

  const faith = createFollowersCard('Faith', 'followers-feature-card');
  const faithPlaceholder = document.createElement('div');
  faithPlaceholder.classList.add('followers-placeholder-text');
  faithPlaceholder.textContent = 'Faith systems will be added in a future update.';
  faith.body.appendChild(faithPlaceholder);

  const holyWorld = createFollowersCard('Holy World', 'followers-feature-card');
  const holyWorldPlaceholder = document.createElement('div');
  holyWorldPlaceholder.classList.add('followers-placeholder-text');
  holyWorldPlaceholder.textContent = 'Holy World systems will be added in a future update.';
  holyWorld.body.appendChild(holyWorldPlaceholder);

  bottomRow.append(faith.card, holyWorld.card);

  root.append(orbitals.card, bottomRow);
  followersUICache.host.appendChild(root);

  modeToggle.addEventListener('click', () => {
    const next = followersManager.getAssignmentMode() === 'manual' ? 'weight' : 'manual';
    followersManager.setAssignmentMode(next);
  });

  divideStepButton.addEventListener('click', () => {
    followersManager.divideAssignmentStep();
  });

  multiplyStepButton.addEventListener('click', () => {
    followersManager.multiplyAssignmentStep();
  });

  followersUICache.initialized = true;
  followersUICache.root = root;
  followersUICache.summary = summary;
  followersUICache.modeToggle = modeToggle;
  followersUICache.stepValue = stepValue;
  followersUICache.divideStepButton = divideStepButton;
  followersUICache.multiplyStepButton = multiplyStepButton;
}

function initializeFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.initialized || !followersUICache.root || !followersUICache.root.isConnected) {
    buildFollowersUI();
  }

  updateFollowersUI();
}

function updateFollowersUI() {
  cacheFollowersUIElements();
  if (!followersUICache.host) {
    return;
  }

  if (!followersUICache.initialized || !followersUICache.root || !followersUICache.root.isConnected) {
    buildFollowersUI();
    if (!followersUICache.initialized) {
      return;
    }
  }

  const snapshot = followersManager.getAssignmentsSnapshot();
  const mode = snapshot.mode;
  const step = followersManager.getAssignmentStep();
  const manualMode = mode === 'manual';
  const autoAssignId = followersManager.getAutoAssignId();

  followersUICache.root.dataset.mode = mode;

  setToggleButtonState(followersUICache.modeToggle, mode === 'weight');

  followersUICache.summary.textContent = `Orbitals Assigned: ${formatNumber(snapshot.assigned, true)} / ${formatNumber(snapshot.availableOrbitals, true)} | Unassigned: ${formatNumber(snapshot.unassigned, true)}`;
  followersUICache.stepValue.textContent = formatNumber(step, true);
  followersUICache.divideStepButton.disabled = !manualMode;
  followersUICache.multiplyStepButton.disabled = !manualMode;

  const configs = followersOrbitalParameters.orbitals;
  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i];
    const row = followersUICache.rowsById[config.id];
    if (!row) {
      continue;
    }

    const assigned = snapshot.assignments[config.id] || 0;
    const perOrbital = followersManager.getPerOrbitalRateById(config.id);
    const totalRate = perOrbital * assigned;
    const weight = followersManager.getWeight(config.id);
    const isAutoAssignTarget = autoAssignId === config.id;

    row.assigned.textContent = `Assigned: ${formatNumber(assigned, true)}`;
    row.perOrbitalRate.textContent = `Per orbital: +${formatNumber(perOrbital, false, 2)}/s`;
    row.totalRate.textContent = `Total: +${formatNumber(totalRate, false, 2)}/s`;

    row.manualMinus.textContent = `-${formatNumber(step, true)}`;
    row.manualPlus.textContent = `+${formatNumber(step, true)}`;

    row.manualControls.style.display = manualMode ? 'grid' : 'none';
    row.weightControls.style.display = manualMode ? 'none' : 'flex';
    row.autoAssignRow.style.display = manualMode ? 'inline-flex' : 'none';

    const maxForThis = followersManager.getManualMaxFor(config.id);
    row.manualZero.disabled = isAutoAssignTarget || assigned <= 0;
    row.manualMinus.disabled = isAutoAssignTarget || assigned <= 0;
    row.manualPlus.disabled = isAutoAssignTarget || assigned >= maxForThis;
    row.manualMax.disabled = isAutoAssignTarget || assigned >= maxForThis;
    row.autoAssignCheckbox.disabled = !manualMode;
    row.autoAssignCheckbox.checked = isAutoAssignTarget;

    const weightInput = row.weightInput;
    if (weightInput) {
      weightInput.dataset.weight = String(weight);
      if (document.activeElement !== weightInput) {
        weightInput.value = String(weight);
      }
    }
  }
}
