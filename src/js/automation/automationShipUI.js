let forceShipStepsRefresh = false;
let shipPresetOptionsSignature = '';
let shipStepsSignature = '';

function invalidateShipAutomationUI() {
  forceShipStepsRefresh = true;
  shipPresetOptionsSignature = '';
  shipStepsSignature = '';
  queueAutomationUIRefresh();
  updateAutomationUI();
}

function getShipPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getShipPresetOptionsSignature(automation) {
  const parts = [String(automation.getSelectedPresetId() || '')];
  for (let index = 0; index < automation.presets.length; index += 1) {
    const preset = automation.presets[index];
    parts.push(`${preset.id}:${preset.name || ''}`);
  }
  return parts.join('|');
}

function getShipTargetsSignature(targets) {
  const parts = [];
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    parts.push(`${target.name}:${target.displayName || target.name}`);
  }
  return parts.join('|');
}

function getShipStepsSignature(automation, preset, targets) {
  const disabledProjects = Array.from(automation.disabledProjects).sort().join(',');
  if (!preset) {
    return `none|disabled:${disabledProjects}|targets:${getShipTargetsSignature(targets)}`;
  }
  const stepParts = [];
  for (let stepIndex = 0; stepIndex < preset.steps.length; stepIndex += 1) {
    const step = preset.steps[stepIndex];
    const limit = step.limit === null || step.limit === undefined ? '' : step.limit;
    const entryParts = [];
    for (let entryIndex = 0; entryIndex < step.entries.length; entryIndex += 1) {
      const entry = step.entries[entryIndex];
      entryParts.push(
        `${entry.projectId}:${entry.weight}:${entry.maxMode || 'absolute'}:${entry.max === null || entry.max === undefined ? '' : entry.max}:${automation.disabledProjects.has(entry.projectId) ? 1 : 0}`
      );
    }
    stepParts.push(`${step.id}:${step.mode || 'fill'}:${limit}:${entryParts.join(',')}`);
  }
  return `${preset.id}|${stepParts.join(';')}|disabled:${disabledProjects}|targets:${getShipTargetsSignature(targets)}`;
}

function markShipStepsRefreshNeeded() {
  forceShipStepsRefresh = true;
  queueAutomationUIRefresh();
  updateAutomationUI();
}

function getCurrentShipAutomationStep(automation, binding) {
  const currentPreset = automation.getActivePreset();
  if (!currentPreset || !binding || currentPreset.id !== binding.presetId) {
    return null;
  }
  for (let index = 0; index < currentPreset.steps.length; index += 1) {
    const currentStep = currentPreset.steps[index];
    if (currentStep.id === binding.stepId) {
      return { preset: currentPreset, step: currentStep };
    }
  }
  return null;
}

function getCurrentShipAutomationEntry(automation, binding) {
  const current = getCurrentShipAutomationStep(automation, binding);
  if (!current) {
    return null;
  }
  for (let index = 0; index < current.step.entries.length; index += 1) {
    const entry = current.step.entries[index];
    if (entry.projectId === binding.projectId) {
      return { preset: current.preset, step: current.step, entry };
    }
  }
  return null;
}

function updateShipStepSubtitleText(subtitle, step) {
  const usingCappedMin = step.mode === 'cappedMin';
  const usingCappedMax = step.mode === 'cappedMax';
  const usingRemainingPercent = step.mode === 'remainingPercent';
  if (usingCappedMin) {
    subtitle.textContent = getAutomationCardText('shipStepSubtitleSmallestMax', {}, 'Balance ships with the smallest max');
  } else if (usingCappedMax) {
    subtitle.textContent = getAutomationCardText('shipStepSubtitleLargestMax', {}, 'Balance ships with the largest max');
  } else if (usingRemainingPercent) {
    const percentText = Number(step.limit === null || step.limit === undefined ? 100 : step.limit).toLocaleString();
    subtitle.textContent = getAutomationCardText('shipStepSubtitleRemainingPercent', { percent: percentText }, 'Assign {percent}% of remaining ships');
  } else if (step.limit !== null && step.limit !== undefined) {
    const limitText = Number(step.limit || 0).toLocaleString();
    subtitle.textContent = getAutomationCardText('shipStepSubtitleAssignUpTo', { count: limitText }, `Assign up to ${limitText} ships`);
  } else {
    subtitle.textContent = getAutomationCardText('shipStepSubtitleByWeight', {}, 'Distribute ships by weight');
  }
}

function setCurrentShipStepLimit(automation, binding, value) {
  const current = getCurrentShipAutomationStep(automation, binding);
  if (!current) {
    markShipStepsRefreshNeeded();
    return false;
  }
  automation.setStepLimit(current.preset.id, current.step.id, value);
  return true;
}

function buildAutomationShipUI() {
  const card = automationElements.shipAssignment || document.getElementById('automation-ship-assignment');
  if (!card) return;

  const toggleCollapsed = () => {
    if (!automationManager || !automationManager.spaceshipAutomation) return;
    const automation = automationManager.spaceshipAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('shipAssignmentTitle', {}, 'Ship Assignment'),
    toggleCollapsed,
    'ships'
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetRow = createAutomationPresetRow(body);
  const shipTransferButtons = createAutomationPresetTransferButtons('ship-automation-preset');
  presetRow.presetRow.appendChild(shipTransferButtons.importButton);
  presetRow.presetRow.appendChild(shipTransferButtons.exportButton);

  const stepsContainer = document.createElement('div');
  stepsContainer.classList.add('automation-steps');
  body.appendChild(stepsContainer);

  const addStepButton = document.createElement('button');
  addStepButton.textContent = getAutomationCardText('addStepButton', {}, '+ Step');
  addStepButton.classList.add('automation-add-step');
  body.appendChild(addStepButton);

  automationElements.collapseButton = header.collapse;
  automationElements.panelBody = body;
  automationElements.presetSelect = presetRow.presetSelect;
  automationElements.shipPresetUsage = presetRow.presetUsage;
  automationElements.presetMoveUpButton = presetRow.presetMoveUp;
  automationElements.presetMoveDownButton = presetRow.presetMoveDown;
  automationElements.presetNameInput = presetRow.presetName;
  automationElements.newPresetButton = presetRow.newPreset;
  automationElements.duplicatePresetButton = presetRow.duplicatePreset;
  automationElements.deletePresetButton = presetRow.deletePreset;
  automationElements.enablePresetCheckbox = presetRow.enableCheckbox;
  automationElements.showPresetInSidebarCheckbox = presetRow.showInSidebarCheckbox;
  automationElements.stepsContainer = stepsContainer;
  automationElements.addStepButton = addStepButton;
  automationElements.shipImportPresetButton = shipTransferButtons.importButton;
  automationElements.shipExportPresetButton = shipTransferButtons.exportButton;

  attachAutomationHandlers();
}

function updateShipAutomationUI() {
  const {
    shipAssignment,
    shipAssignmentStatus,
    shipAssignmentDescription,
    panelBody,
    collapseButton,
    presetSelect,
    presetMoveUpButton,
    presetMoveDownButton,
    presetNameInput,
    newPresetButton,
    duplicatePresetButton,
    deletePresetButton,
    enablePresetCheckbox,
    showPresetInSidebarCheckbox,
    stepsContainer,
    addStepButton
  } = automationElements;
  const manager = automationManager;
  if (!manager || !shipAssignment || !shipAssignmentStatus || !shipAssignmentDescription) {
    return;
  }
  const automation = manager.spaceshipAutomation;
  const unlocked = manager.hasFeature('automationShipAssignment');
  shipAssignment.classList.toggle('automation-card-locked', !unlocked);
  shipAssignmentStatus.style.display = 'none';
  shipAssignmentDescription.textContent = unlocked
    ? getAutomationCardText('shipAssignmentDescriptionUnlocked', {}, 'Automatically assigns cargo ships based on available routes.')
    : getAutomationCardText('shipAssignmentDescriptionLocked', {}, 'Purchase the Solis Ship Assignment upgrade to enable ship automation.');

  if (!automation || !panelBody || !collapseButton || !presetSelect || !presetMoveUpButton || !presetMoveDownButton || !presetNameInput || !newPresetButton || !duplicatePresetButton || !deletePresetButton || !enablePresetCheckbox || !showPresetInSidebarCheckbox || !stepsContainer || !addStepButton) {
    return;
  }

  panelBody.style.display = automation.collapsed ? 'none' : 'flex';
  collapseButton.textContent = automation.collapsed ? '▶' : '▼';

  // Only rebuild preset dropdown if not currently focused
  const presetSignature = getShipPresetOptionsSignature(automation);
  if (document.activeElement !== presetSelect && presetSignature !== shipPresetOptionsSignature) {
    while (presetSelect.firstChild) presetSelect.removeChild(presetSelect.firstChild);
    automation.presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = getShipPresetLabel(preset);
      if (preset.id === automation.getSelectedPresetId()) {
        option.selected = true;
      }
      presetSelect.appendChild(option);
    });
    shipPresetOptionsSignature = presetSignature;
  }

  const activePreset = automation.getActivePreset();
  updateAutomationPresetUsageLine(automationElements.shipPresetUsage, 'ship', activePreset);
  if (activePreset) {
    if (document.activeElement !== presetNameInput) {
      presetNameInput.value = activePreset.name || '';
    }
    setAutomationToggleState(enablePresetCheckbox, !!automation.enabled);
    showPresetInSidebarCheckbox.checked = activePreset.showInSidebar !== false;
  } else {
    presetNameInput.value = '';
    setAutomationToggleState(enablePresetCheckbox, false);
    showPresetInSidebarCheckbox.checked = true;
  }
  const activePresetIndex = activePreset
    ? automation.presets.findIndex(preset => preset.id === activePreset.id)
    : -1;
  presetMoveUpButton.disabled = activePresetIndex <= 0;
  presetMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= automation.presets.length - 1;
  duplicatePresetButton.disabled = !activePreset;

  // Only rebuild steps if no dropdown/input within is focused
  const hasFocusedChild = stepsContainer.contains(document.activeElement) &&
    (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'INPUT');
  const targets = automation.getAutomationTargets();
  const nextStepsSignature = getShipStepsSignature(automation, activePreset, targets);
  const needsStepsRefresh = forceShipStepsRefresh || nextStepsSignature !== shipStepsSignature;
  if (needsStepsRefresh && (!hasFocusedChild || forceShipStepsRefresh)) {
    cleanupTrackedUIListeners(stepsContainer);
    cleanupDynamicTooltipsIn(stepsContainer);
    stepsContainer.textContent = '';
    if (activePreset) {
      runWithTrackedUIListeners(stepsContainer, () => {
        renderAutomationSteps(automation, activePreset, stepsContainer, targets);
      });
    }
    shipStepsSignature = nextStepsSignature;
    forceShipStepsRefresh = false;
  }
  addStepButton.disabled = !activePreset || activePreset.steps.length >= 10;
  if (automationElements.shipImportPresetButton) {
    automationElements.shipImportPresetButton.disabled = false;
  }
  if (automationElements.shipExportPresetButton) {
    automationElements.shipExportPresetButton.disabled = !activePreset;
  }
}

function attachAutomationHandlers() {
  const {
    presetSelect,
    presetMoveUpButton,
    presetMoveDownButton,
    presetNameInput,
    newPresetButton,
    duplicatePresetButton,
    deletePresetButton,
    enablePresetCheckbox,
    showPresetInSidebarCheckbox,
    addStepButton
  } = automationElements;
  if (presetSelect) {
    presetSelect.addEventListener('change', (event) => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const id = Number(event.target.value);
      automationManager.spaceshipAutomation.setSelectedPresetId(id);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (presetNameInput) {
    presetNameInput.addEventListener('input', (event) => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.renamePreset(preset.id, event.target.value || '');
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (presetMoveUpButton) {
    presetMoveUpButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.movePreset(preset.id, -1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (presetMoveDownButton) {
    presetMoveDownButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.movePreset(preset.id, 1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (newPresetButton) {
    newPresetButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      automationManager.spaceshipAutomation.addPreset('');
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (duplicatePresetButton) {
    duplicatePresetButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.duplicatePreset(preset.id);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (deletePresetButton) {
    deletePresetButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.deletePreset(preset.id);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (enablePresetCheckbox) {
    enablePresetCheckbox.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      automation.setEnabled(!automation.enabled);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (showPresetInSidebarCheckbox) {
    showPresetInSidebarCheckbox.addEventListener('change', (event) => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.setPresetShowInSidebar(preset.id, event.target.checked);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
  if (addStepButton) {
    addStepButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.addStep(preset.id);
      forceShipStepsRefresh = true;
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }

  const { shipExportPresetButton, shipImportPresetButton } = automationElements;
  if (shipExportPresetButton) {
    shipExportPresetButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      exportAutomationPresetToClipboard('ship', automation.exportPreset(preset.id), shipExportPresetButton);
    });
  }
  if (shipImportPresetButton) {
    shipImportPresetButton.addEventListener('click', () => {
      openAutomationPresetImportDialog({
        title: getAutomationCardText('importShipPresetTitle', {}, 'Import Ship Preset'),
        description: getAutomationCardText(
          'importPresetDescription',
          {},
          'Paste an exported preset string below. Import adds it as a new preset.'
        ),
        onImport: (text) => {
          const parsed = parseAutomationPresetTransferPayload(text, 'ship');
          if (!parsed.ok) {
            return parsed;
          }
          if (!automationManager || !automationManager.spaceshipAutomation) {
            return { ok: false, error: getAutomationCardText('importPresetFailed', {}, 'Could not import that preset.') };
          }
          automationManager.spaceshipAutomation.importPreset(parsed.preset);
          forceShipStepsRefresh = true;
          queueAutomationUIRefresh();
          updateAutomationUI();
          return { ok: true };
        }
      });
    });
  }
}

function renderAutomationSteps(automation, preset, container, projectsOverride) {
  const projects = projectsOverride || automation.getAutomationTargets();
  const updateAllStepWeights = (binding, multiplier) => {
    const current = getCurrentShipAutomationStep(automation, binding);
    if (!current) {
      markShipStepsRefreshNeeded();
      return;
    }
    for (let index = 0; index < current.step.entries.length; index += 1) {
      const stepEntry = current.step.entries[index];
      const nextWeight = Math.max(0, Math.floor((stepEntry.weight || 0) * multiplier));
      automation.updateEntry(current.preset.id, current.step.id, stepEntry.projectId, { weight: nextWeight });
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const formatProjectOption = (option, project) => {
    const label = project.displayName || project.name;
    const disabled = project.isPermanentlyDisabled && project.isPermanentlyDisabled();
    const disabledLabel = getAutomationCardText('shipProjectDisabledSuffix', {}, 'disabled');
    option.textContent = disabled ? `${label} (${disabledLabel})` : label;
    if (disabled) {
      option.style.color = 'red';
    }
  };

  for (let stepIndex = 0; stepIndex < preset.steps.length; stepIndex += 1) {
    const step = preset.steps[stepIndex];
    const stepBinding = {
      presetId: preset.id,
      stepId: step.id,
      refs: {}
    };
    const stepCard = document.createElement('div');
    stepCard.classList.add('automation-step');
    stepCard._shipStepBinding = stepBinding;

    const header = document.createElement('div');
    header.classList.add('automation-step-header');
    const heading = document.createElement('div');
    heading.classList.add('automation-step-heading');
    const title = document.createElement('span');
    title.classList.add('automation-step-badge');
    title.textContent = getAutomationCardText('stepWithIndex', { index: stepIndex + 1 }, `Step ${stepIndex + 1}`);
    const subtitle = document.createElement('span');
    subtitle.classList.add('automation-step-subtitle');
    stepBinding.refs.subtitle = subtitle;
    const usingCappedMin = step.mode === 'cappedMin';
    const usingCappedMax = step.mode === 'cappedMax';
    const usingRemainingPercent = step.mode === 'remainingPercent';
    const usingCapped = usingCappedMin || usingCappedMax;
    updateShipStepSubtitleText(subtitle, step);
    heading.append(title, subtitle);
    header.appendChild(heading);

    const limitRow = document.createElement('div');
    limitRow.classList.add('automation-limit-row');
    const limitInfo = document.createElement('span');
    limitInfo.className = 'info-tooltip-icon';
    limitInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      limitInfo,
      getAutomationCardText('shipLimitTooltip', {}, 'Assign Amount:\n- Distributes up to the entered amount by weight.\n\nModes:\n- Capped by smallest max: balance by weight until the smallest max is reached.\n- Capped by largest max: balance by weight until the largest max is reached. If no largest max is reached (infinite/unset caps), it uses every remaining ship.\n- % of remaining ships: distributes up to that percent of ships still unassigned when this step starts.\n\nMass Drivers:\n- Each Mass Driver counts as 10 ships.\n- Counts toward assign amount limits.\n- Can only be assigned through "Resource Disposal (mass drivers included)".')
    );
    const limitMode = document.createElement('select');
    limitMode._shipStepBinding = stepBinding;
    const fixedOpt = document.createElement('option');
    fixedOpt.value = 'fixed';
    fixedOpt.textContent = getAutomationCardText('shipAssignAmount', {}, 'Assign Amount');
    limitMode.appendChild(fixedOpt);
    const cappedMinOpt = document.createElement('option');
    cappedMinOpt.value = 'cappedMin';
    cappedMinOpt.textContent = getAutomationCardText('shipCappedBySmallestMax', {}, 'Capped by smallest max');
    limitMode.appendChild(cappedMinOpt);
    const cappedMaxOpt = document.createElement('option');
    cappedMaxOpt.value = 'cappedMax';
    cappedMaxOpt.textContent = getAutomationCardText('shipCappedByLargestMax', {}, 'Capped by largest max');
    limitMode.appendChild(cappedMaxOpt);
    const remainingPercentOpt = document.createElement('option');
    remainingPercentOpt.value = 'remainingPercent';
    remainingPercentOpt.textContent = getAutomationCardText('shipPercentRemainingShips', {}, '% of remaining ships');
    limitMode.appendChild(remainingPercentOpt);
    limitMode.value = usingCappedMin ? 'cappedMin' : usingCappedMax ? 'cappedMax' : usingRemainingPercent ? 'remainingPercent' : 'fixed';
    const limitInput = document.createElement('input');
    limitInput.type = 'text';
    limitInput.min = '0';
    limitInput._shipStepBinding = stepBinding;
    limitInput.placeholder = getAutomationCardText('shipAmountPlaceholder', {}, 'Amount');
    if (step.limit !== null && step.limit !== undefined && !usingCapped) {
      limitInput.value = formatNumber(step.limit, true, 3);
    } else {
      limitInput.value = '';
    }
    limitInput.disabled = limitMode.value === 'cappedMin' || limitMode.value === 'cappedMax';
    stepBinding.refs.limitMode = limitMode;
    stepBinding.refs.limitInput = limitInput;
    limitMode.addEventListener('change', (event) => {
      const mode = event.target.value;
      const current = getCurrentShipAutomationStep(automation, event.target._shipStepBinding);
      if (!current) {
        markShipStepsRefreshNeeded();
        return;
      }
      if (mode === 'cappedMin' || mode === 'cappedMax') {
        automation.setStepMode(current.preset.id, current.step.id, mode);
        automation.setStepLimit(current.preset.id, current.step.id, null);
        limitInput.disabled = true;
        limitInput.value = '';
      } else if (mode === 'remainingPercent') {
        automation.setStepMode(current.preset.id, current.step.id, mode);
        const parsed = parseFlexibleNumber(limitInput.value);
        const percent = Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 0), 100) : 100;
        automation.setStepLimit(current.preset.id, current.step.id, percent);
        limitInput.disabled = false;
        limitInput.value = formatNumber(percent, true, 3);
      } else {
        automation.setStepMode(current.preset.id, current.step.id, 'fill');
        const parsed = parseFlexibleNumber(limitInput.value);
        automation.setStepLimit(current.preset.id, current.step.id, Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0);
        limitInput.disabled = false;
      }
      updateShipStepSubtitleText(subtitle, current.step);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    wireStringNumberInput(limitInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return 0;
        }
        if (limitMode.value === 'remainingPercent') {
          return Math.min(Math.max(Math.floor(parsed), 0), 100);
        }
        return Math.floor(parsed);
      },
      formatValue: (value) => {
        return value > 0 ? formatNumber(value, true, 3) : '';
      },
      onValue: (parsed) => {
        const current = getCurrentShipAutomationStep(automation, limitInput._shipStepBinding);
        if (limitMode.value === 'remainingPercent') {
          setCurrentShipStepLimit(
            automation,
            limitInput._shipStepBinding,
            Math.min(Math.max(Math.floor(parsed), 0), 100)
          );
        } else {
          setCurrentShipStepLimit(
            automation,
            limitInput._shipStepBinding,
            parsed > 0 ? parsed : null
          );
        }
        if (current) {
          updateShipStepSubtitleText(subtitle, current.step);
        }
        queueAutomationUIRefresh();
      }
    });
    limitRow.append(limitInfo, limitMode, limitInput);
    const controlWrap = document.createElement('div');
    controlWrap.classList.add('automation-step-controls');
    controlWrap.append(limitRow);
    const weightScaleControls = document.createElement('div');
    weightScaleControls.classList.add('automation-entry-scale-controls');
    const divideWeightsButton = document.createElement('button');
    divideWeightsButton.type = 'button';
    divideWeightsButton.textContent = getAutomationCardText('shipWeightScaleDownButton', {}, '/10');
    divideWeightsButton.title = getAutomationCardText('shipWeightScaleDownTitle', {}, 'Divide all step weights by 10');
    divideWeightsButton.addEventListener('click', () => {
      updateAllStepWeights(stepBinding, 0.1);
    });
    const multiplyWeightsButton = document.createElement('button');
    multiplyWeightsButton.type = 'button';
    multiplyWeightsButton.textContent = getAutomationCardText('shipWeightScaleUpButton', {}, 'x10');
    multiplyWeightsButton.title = getAutomationCardText('shipWeightScaleUpTitle', {}, 'Multiply all step weights by 10');
    multiplyWeightsButton.addEventListener('click', () => {
      updateAllStepWeights(stepBinding, 10);
    });
    weightScaleControls.append(divideWeightsButton, multiplyWeightsButton);
    controlWrap.appendChild(weightScaleControls);
    const orderWrap = document.createElement('div');
    orderWrap.classList.add('automation-step-order');
    const moveUp = document.createElement('button');
    moveUp.textContent = '↑';
    moveUp.title = getAutomationCardText('moveStepUp', {}, 'Move step up');
    moveUp.disabled = stepIndex === 0;
    moveUp.addEventListener('click', () => {
      const current = getCurrentShipAutomationStep(automation, stepBinding);
      if (!current) {
        markShipStepsRefreshNeeded();
        return;
      }
      automation.moveStep(current.preset.id, current.step.id, -1);
      forceShipStepsRefresh = true;
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const moveDown = document.createElement('button');
    moveDown.textContent = '↓';
    moveDown.title = getAutomationCardText('moveStepDown', {}, 'Move step down');
    moveDown.disabled = stepIndex === preset.steps.length - 1;
    moveDown.addEventListener('click', () => {
      const current = getCurrentShipAutomationStep(automation, stepBinding);
      if (!current) {
        markShipStepsRefreshNeeded();
        return;
      }
      automation.moveStep(current.preset.id, current.step.id, 1);
      forceShipStepsRefresh = true;
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    orderWrap.append(moveUp, moveDown);
    controlWrap.appendChild(orderWrap);

    const removeStep = document.createElement('button');
    removeStep.textContent = '✕';
    removeStep.title = getAutomationCardText('removeStep', {}, 'Remove step');
    removeStep.addEventListener('click', () => {
      const current = getCurrentShipAutomationStep(automation, stepBinding);
      if (!current) {
        markShipStepsRefreshNeeded();
        return;
      }
      automation.removeStep(current.preset.id, current.step.id);
      forceShipStepsRefresh = true;
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    controlWrap.append(removeStep);
    header.append(controlWrap);

    stepCard.appendChild(header);

    const entriesContainer = document.createElement('div');
    entriesContainer.classList.add('automation-step-entries');

    for (let entryIndex = 0; entryIndex < step.entries.length; entryIndex += 1) {
      const entry = step.entries[entryIndex];
      const entryBinding = {
        presetId: preset.id,
        stepId: step.id,
        projectId: entry.projectId,
        refs: {}
      };
      const row = document.createElement('div');
      row.classList.add('automation-entry');
      row._shipEntryBinding = entryBinding;
      row._refs = {};

      const projectSelect = document.createElement('select');
      projectSelect._shipEntryBinding = entryBinding;
      row._refs.projectSelect = projectSelect;
      const usedIds = step.entries.filter(item => item !== entry).map(item => item.projectId);
      for (let projectIndex = 0; projectIndex < projects.length; projectIndex += 1) {
        const project = projects[projectIndex];
        const option = document.createElement('option');
        option.value = project.name;
        formatProjectOption(option, project);
        if (project.name === entry.projectId) {
          option.selected = true;
        }
        if (usedIds.includes(project.name)) {
          option.disabled = project.name !== entry.projectId;
        }
        projectSelect.appendChild(option);
      }
      projectSelect.addEventListener('change', (event) => {
        const newId = event.target.value;
        const current = getCurrentShipAutomationEntry(automation, event.target._shipEntryBinding);
        if (!current) {
          markShipStepsRefreshNeeded();
          return;
        }
        const currentUsedIds = current.step.entries
          .filter(item => item !== current.entry)
          .map(item => item.projectId);
        if (currentUsedIds.includes(newId)) {
          event.target.value = current.entry.projectId;
          return;
        }
        automation.updateEntry(current.preset.id, current.step.id, current.entry.projectId, { projectId: newId });
        event.target._shipEntryBinding.projectId = newId;
        forceShipStepsRefresh = true;
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(projectSelect);

      const weightWrapper = document.createElement('div');
      weightWrapper.classList.add('automation-weight');
      const weightLabel = document.createElement('span');
      weightLabel.textContent = getAutomationCardText('shipWeightLabel', {}, 'Weight');
      const weightInput = document.createElement('input');
      weightInput.type = 'text';
      weightInput.min = '0';
      weightInput.value = formatNumber(entry.weight, true, 3);
      weightInput._shipEntryBinding = entryBinding;
      row._refs.weightInput = weightInput;
      wireStringNumberInput(weightInput, {
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
        },
        formatValue: (value) => {
          return value > 0 ? formatNumber(value, true, 3) : '0';
        },
        onValue: (parsed) => {
          const current = getCurrentShipAutomationEntry(automation, weightInput._shipEntryBinding);
          if (!current) {
            markShipStepsRefreshNeeded();
            return;
          }
          automation.updateEntry(current.preset.id, current.step.id, current.entry.projectId, { weight: parsed });
          queueAutomationUIRefresh();
        }
      });
      weightWrapper.append(weightLabel, weightInput);
      row.appendChild(weightWrapper);

      const maxWrapper = document.createElement('div');
      maxWrapper.classList.add('automation-max-wrapper');

      const maxMode = document.createElement('select');
      maxMode._shipEntryBinding = entryBinding;
      row._refs.maxMode = maxMode;
      const absoluteOpt = document.createElement('option');
      absoluteOpt.value = 'absolute';
      absoluteOpt.textContent = getAutomationCardText('shipMaxLabel', {}, 'Max');
      const populationOpt = document.createElement('option');
      populationOpt.value = 'population';
      populationOpt.textContent = getAutomationCardText('shipPercentPopulation', {}, '% Population');
      const workerOpt = document.createElement('option');
      workerOpt.value = 'workers';
      workerOpt.textContent = getAutomationCardText('shipPercentWorkers', {}, '% Workers');
      const geometricLandOpt = document.createElement('option');
      geometricLandOpt.value = 'geometricLand';
      geometricLandOpt.textContent = getAutomationCardText('shipPercentGeometricLand', {}, '% Geometric Land');
      maxMode.append(absoluteOpt, populationOpt, workerOpt, geometricLandOpt);
      maxMode.value = entry.maxMode || 'absolute';
      const getMaxPrecision = () => (
        maxMode.value === 'population' || maxMode.value === 'workers' || maxMode.value === 'geometricLand' ? 5 : 3
      );
      const maxInput = document.createElement('input');
      maxInput.type = 'text';
      maxInput.min = '0';
      maxInput.placeholder = getAutomationCardText('shipMaxLabel', {}, 'Max');
      maxInput.value = entry.max === null || entry.max === undefined ? '' : formatNumber(entry.max, true, getMaxPrecision());
      maxInput._shipEntryBinding = entryBinding;
      row._refs.maxInput = maxInput;
      maxMode.addEventListener('change', (event) => {
        const current = getCurrentShipAutomationEntry(automation, event.target._shipEntryBinding);
        if (!current) {
          markShipStepsRefreshNeeded();
          return;
        }
        automation.updateEntry(current.preset.id, current.step.id, current.entry.projectId, { maxMode: event.target.value });
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      wireStringNumberInput(maxInput, {
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          const precision = getMaxPrecision();
          const scale = Math.pow(10, precision);
          return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * scale) / scale : 0;
        },
        formatValue: (value) => {
          return value > 0 ? formatNumber(value, true, getMaxPrecision()) : '';
        },
        onValue: (parsed) => {
          const current = getCurrentShipAutomationEntry(automation, maxInput._shipEntryBinding);
          if (!current) {
            markShipStepsRefreshNeeded();
            return;
          }
          automation.updateEntry(current.preset.id, current.step.id, current.entry.projectId, { max: parsed > 0 ? parsed : null });
          queueAutomationUIRefresh();
        }
      });

      maxWrapper.append(maxMode, maxInput);
      row.appendChild(maxWrapper);

      const projectObject = projects.find(item => item.name === entry.projectId);
      const excludeWrapper = document.createElement('label');
      excludeWrapper.classList.add('automation-entry-exclude');
      const allowDisable = projectObject && (projectObject.getAutomationDisableAllowed ? projectObject.getAutomationDisableAllowed() : true);
      const exclude = document.createElement('input');
      exclude.type = 'checkbox';
      exclude.checked = automation.disabledProjects.has(entry.projectId);
      exclude._shipEntryBinding = entryBinding;
      row._refs.exclude = exclude;
      excludeWrapper.append(exclude, getAutomationCardText('shipReleaseIfDisabled', {}, 'Release if disabled'));
      if (allowDisable) {
        exclude.addEventListener('change', (event) => {
          const current = getCurrentShipAutomationEntry(automation, event.target._shipEntryBinding);
          if (!current) {
            markShipStepsRefreshNeeded();
            return;
          }
          automation.toggleProjectDisabled(current.entry.projectId, event.target.checked);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
      } else {
        exclude.disabled = true;
        excludeWrapper.style.visibility = 'hidden';
      }
      row.appendChild(excludeWrapper);

      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = getAutomationCardText('removeProject', {}, 'Remove project');
      remove._shipEntryBinding = entryBinding;
      row._refs.remove = remove;
      remove.addEventListener('click', () => {
        const current = getCurrentShipAutomationEntry(automation, remove._shipEntryBinding);
        if (!current) {
          markShipStepsRefreshNeeded();
          return;
        }
        automation.removeEntry(current.preset.id, current.step.id, current.entry.projectId);
        forceShipStepsRefresh = true;
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(remove);

      entriesContainer.appendChild(row);
    }

    const addRow = document.createElement('div');
    addRow.classList.add('automation-add-entry-row');
    addRow._shipStepBinding = stepBinding;
    const addSelect = document.createElement('select');
    addSelect._shipStepBinding = stepBinding;
    const availableProjects = projects.filter(project => !step.entries.some(entry => entry.projectId === project.name));
    availableProjects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.name;
      formatProjectOption(option, project);
      addSelect.appendChild(option);
    });
    if (availableProjects.length === 0) {
      const disabledOption = document.createElement('option');
      disabledOption.disabled = true;
      disabledOption.selected = true;
      disabledOption.textContent = getAutomationCardText('shipNoProjectsAvailable', {}, 'No projects available');
      addSelect.appendChild(disabledOption);
    }
    const addEntryButton = document.createElement('button');
    addEntryButton.textContent = getAutomationCardText('addProjectButton', {}, '+ Project');
    addEntryButton.disabled = availableProjects.length === 0;
    addEntryButton._shipStepBinding = stepBinding;
    addEntryButton.addEventListener('click', () => {
      const current = getCurrentShipAutomationStep(automation, addEntryButton._shipStepBinding);
      if (!current) {
        markShipStepsRefreshNeeded();
        return;
      }
      const selectedId = addSelect.value;
      if (!selectedId) return;
      for (let index = 0; index < current.step.entries.length; index += 1) {
        if (current.step.entries[index].projectId === selectedId) {
          markShipStepsRefreshNeeded();
          return;
        }
      }
      automation.addEntry(current.preset.id, current.step.id, selectedId);
      forceShipStepsRefresh = true;
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    addRow.append(addSelect, addEntryButton);

    stepCard.append(entriesContainer, addRow);
    container.appendChild(stepCard);
  }
}
