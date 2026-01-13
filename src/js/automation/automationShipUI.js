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

  const header = createAutomationCardHeader(card, 'Ship Assignment', toggleCollapsed);

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetRow = createAutomationPresetRow(body);

  const stepsContainer = document.createElement('div');
  stepsContainer.classList.add('automation-steps');
  body.appendChild(stepsContainer);

  const addStepButton = document.createElement('button');
  addStepButton.textContent = '+ Step';
  addStepButton.classList.add('automation-add-step');
  body.appendChild(addStepButton);

  automationElements.collapseButton = header.collapse;
  automationElements.panelBody = body;
  automationElements.presetSelect = presetRow.presetSelect;
  automationElements.presetNameInput = presetRow.presetName;
  automationElements.newPresetButton = presetRow.newPreset;
  automationElements.deletePresetButton = presetRow.deletePreset;
  automationElements.enablePresetCheckbox = presetRow.enableCheckbox;
  automationElements.stepsContainer = stepsContainer;
  automationElements.addStepButton = addStepButton;

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
    presetNameInput,
    newPresetButton,
    deletePresetButton,
    enablePresetCheckbox,
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
    ? 'Automatically assigns cargo ships based on available routes.'
    : 'Purchase the Solis Ship Assignment upgrade to enable ship automation.';

  if (!automation || !panelBody || !collapseButton || !presetSelect || !presetNameInput || !newPresetButton || !deletePresetButton || !enablePresetCheckbox || !stepsContainer || !addStepButton) {
    return;
  }

  panelBody.style.display = automation.collapsed ? 'none' : 'flex';
  collapseButton.textContent = automation.collapsed ? '▶' : '▼';

  while (presetSelect.firstChild) presetSelect.removeChild(presetSelect.firstChild);
  automation.presets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name || `Preset ${preset.id}`;
    if (preset.id === automation.activePresetId) {
      option.selected = true;
    }
    presetSelect.appendChild(option);
  });

  const activePreset = automation.getActivePreset();
  if (activePreset) {
    presetNameInput.value = activePreset.name || '';
    setAutomationToggleState(enablePresetCheckbox, !!activePreset.enabled);
  } else {
    presetNameInput.value = '';
    setAutomationToggleState(enablePresetCheckbox, false);
  }

  stepsContainer.textContent = '';
  if (activePreset) {
    renderAutomationSteps(automation, activePreset, stepsContainer);
  }
  addStepButton.disabled = !activePreset || activePreset.steps.length >= 10;
}

function attachAutomationHandlers() {
  const {
    presetSelect,
    presetNameInput,
    newPresetButton,
    deletePresetButton,
    enablePresetCheckbox,
    addStepButton
  } = automationElements;
  if (presetSelect) {
    presetSelect.addEventListener('change', (event) => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const id = Number(event.target.value);
      automationManager.spaceshipAutomation.setActivePreset(id);
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
  if (newPresetButton) {
    newPresetButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      automationManager.spaceshipAutomation.addPreset('');
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
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.togglePresetEnabled(preset.id, !preset.enabled);
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
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
}

function renderAutomationSteps(automation, preset, container) {
  const projects = automation.getAutomationTargets();

  const formatProjectOption = (option, project) => {
    const label = project.displayName || project.name;
    const disabled = project.isPermanentlyDisabled && project.isPermanentlyDisabled();
    option.textContent = disabled ? `${label} (disabled)` : label;
    if (disabled) {
      option.style.color = 'red';
    }
  };

  for (let stepIndex = 0; stepIndex < preset.steps.length; stepIndex += 1) {
    const step = preset.steps[stepIndex];
    const isLastStep = stepIndex === preset.steps.length - 1;
    const stepCard = document.createElement('div');
    stepCard.classList.add('automation-step');

    const header = document.createElement('div');
    header.classList.add('automation-step-header');
    const heading = document.createElement('div');
    heading.classList.add('automation-step-heading');
    const title = document.createElement('span');
    title.classList.add('automation-step-badge');
    title.textContent = `Step ${stepIndex + 1}`;
    const subtitle = document.createElement('span');
    subtitle.classList.add('automation-step-subtitle');
    const usingAllRemaining = isLastStep && (step.limit === null || step.limit === undefined) && step.mode !== 'cappedMin';
    const usingCapped = step.mode === 'cappedMin';
    if (usingCapped) {
      subtitle.textContent = 'Balance ships with per-route caps';
    } else if (usingAllRemaining) {
      subtitle.textContent = 'Use every remaining ship';
    } else if (step.limit !== null && step.limit !== undefined) {
      const limitText = Number(step.limit || 0).toLocaleString();
      subtitle.textContent = `Assign up to ${limitText} ships`;
    } else {
      subtitle.textContent = 'Distribute ships by weight';
    }
    heading.append(title, subtitle);
    header.appendChild(heading);

    const limitRow = document.createElement('div');
    limitRow.classList.add('automation-limit-row');
    const limitMode = document.createElement('select');
    const fixedOpt = document.createElement('option');
    fixedOpt.value = 'fixed';
    fixedOpt.textContent = 'Assign Amount';
    limitMode.appendChild(fixedOpt);
    const cappedOpt = document.createElement('option');
    cappedOpt.value = 'capped';
    cappedOpt.textContent = 'Capped by smallest max';
    limitMode.appendChild(cappedOpt);
    const remainingOpt = document.createElement('option');
    remainingOpt.value = 'all';
    remainingOpt.textContent = 'All Remaining';
    remainingOpt.disabled = !isLastStep;
    limitMode.appendChild(remainingOpt);
    limitMode.value = usingAllRemaining ? 'all' : usingCapped ? 'capped' : 'fixed';
    const limitInput = document.createElement('input');
    limitInput.type = 'number';
    limitInput.min = '0';
    limitInput.placeholder = 'Amount';
    if (!usingAllRemaining && step.limit !== null && step.limit !== undefined && !usingCapped) {
      limitInput.value = step.limit;
    } else {
      limitInput.value = '';
    }
    limitInput.disabled = limitMode.value === 'all' || limitMode.value === 'capped';
    limitMode.addEventListener('change', (event) => {
      const mode = event.target.value;
      if (mode === 'all') {
        automation.setStepMode(preset.id, step.id, 'fill');
        automation.setStepLimit(preset.id, step.id, null);
        limitInput.disabled = true;
        limitInput.value = '';
      } else if (mode === 'capped') {
        automation.setStepMode(preset.id, step.id, 'cappedMin');
        automation.setStepLimit(preset.id, step.id, null);
        limitInput.disabled = true;
        limitInput.value = '';
      } else {
        automation.setStepMode(preset.id, step.id, 'fill');
        automation.setStepLimit(preset.id, step.id, limitInput.value);
        limitInput.disabled = false;
      }
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    limitInput.addEventListener('change', (event) => {
      automation.setStepLimit(preset.id, step.id, event.target.value);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    if (!isLastStep) {
      limitMode.value = usingCapped ? 'capped' : 'fixed';
      remainingOpt.disabled = true;
    }
    limitRow.append(limitMode, limitInput);
    const controlWrap = document.createElement('div');
    controlWrap.classList.add('automation-step-controls');
    controlWrap.append(limitRow);

    const removeStep = document.createElement('button');
    removeStep.textContent = '✕';
    removeStep.title = 'Remove step';
    removeStep.addEventListener('click', () => {
      automation.removeStep(preset.id, step.id);
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
      const row = document.createElement('div');
      row.classList.add('automation-entry');

      const projectSelect = document.createElement('select');
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
        if (usedIds.includes(newId)) {
          event.target.value = entry.projectId;
          return;
        }
        automation.updateEntry(preset.id, step.id, entry.projectId, { projectId: newId });
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(projectSelect);

      const weightWrapper = document.createElement('div');
      weightWrapper.classList.add('automation-weight');
      const weightLabel = document.createElement('span');
      weightLabel.textContent = 'Weight';
      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '0';
      weightInput.value = entry.weight;
      weightInput.addEventListener('change', (event) => {
        automation.updateEntry(preset.id, step.id, entry.projectId, { weight: event.target.value });
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      weightWrapper.append(weightLabel, weightInput);
      row.appendChild(weightWrapper);

      const maxWrapper = document.createElement('div');
      maxWrapper.classList.add('automation-max-wrapper');

      const maxMode = document.createElement('select');
      const absoluteOpt = document.createElement('option');
      absoluteOpt.value = 'absolute';
      absoluteOpt.textContent = 'Max';
      const populationOpt = document.createElement('option');
      populationOpt.value = 'population';
      populationOpt.textContent = '% Population';
      const workerOpt = document.createElement('option');
      workerOpt.value = 'workers';
      workerOpt.textContent = '% Workers';
      maxMode.append(absoluteOpt, populationOpt, workerOpt);
      maxMode.value = entry.maxMode || 'absolute';
      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.min = '0';
      maxInput.placeholder = 'Max';
      maxInput.value = entry.max === null || entry.max === undefined ? '' : entry.max;
      maxMode.addEventListener('change', (event) => {
        automation.updateEntry(preset.id, step.id, entry.projectId, { maxMode: event.target.value });
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      maxInput.addEventListener('change', (event) => {
        automation.updateEntry(preset.id, step.id, entry.projectId, { max: event.target.value });
        queueAutomationUIRefresh();
        updateAutomationUI();
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
      excludeWrapper.append(exclude, 'Release if disabled');
      if (allowDisable) {
        exclude.addEventListener('change', (event) => {
          automation.toggleProjectDisabled(entry.projectId, event.target.checked);
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
      remove.title = 'Remove project';
      remove.addEventListener('click', () => {
        automation.removeEntry(preset.id, step.id, entry.projectId);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(remove);

      entriesContainer.appendChild(row);
    }

    const addRow = document.createElement('div');
    addRow.classList.add('automation-add-entry-row');
    const addSelect = document.createElement('select');
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
      disabledOption.textContent = 'No projects available';
      addSelect.appendChild(disabledOption);
    }
    const addEntryButton = document.createElement('button');
    addEntryButton.textContent = '+ Project';
    addEntryButton.disabled = availableProjects.length === 0;
    addEntryButton.addEventListener('click', () => {
      const selectedId = addSelect.value;
      if (!selectedId) return;
      automation.addEntry(preset.id, step.id, selectedId);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    addRow.append(addSelect, addEntryButton);

    stepCard.append(entriesContainer, addRow);
    container.appendChild(stepCard);
  }
}
