let automationTabVisible = false;
let automationUIInitialized = false;
let automationUIStale = true;
const automationElements = {
  tab: null,
  content: null,
  shipAssignment: null,
  shipAssignmentStatus: null,
  shipAssignmentDescription: null,
  collapseButton: null,
  panelBody: null,
  presetSelect: null,
  presetNameInput: null,
  newPresetButton: null,
  deletePresetButton: null,
  enablePresetCheckbox: null,
  stepsContainer: null,
  addStepButton: null
};

function queueAutomationUIRefresh() {
  automationUIStale = true;
}

function cacheAutomationElements() {
  if (typeof document === 'undefined') return;
  if (!automationElements.tab) {
    automationElements.tab = document.querySelector('.hope-subtab[data-subtab="automation-hope"]');
  }
  if (!automationElements.content) {
    automationElements.content = document.getElementById('automation-hope');
  }
  if (!automationElements.shipAssignment) {
    automationElements.shipAssignment = document.getElementById('automation-ship-assignment');
  }
  if (!automationElements.shipAssignmentStatus) {
    automationElements.shipAssignmentStatus = document.getElementById('automation-ship-assignment-status');
  }
  if (!automationElements.shipAssignmentDescription) {
    automationElements.shipAssignmentDescription = document.getElementById('automation-ship-assignment-description');
  }
  if (!automationElements.collapseButton && automationElements.shipAssignment) {
    automationElements.collapseButton = automationElements.shipAssignment.querySelector('.automation-collapse');
  }
  if (!automationElements.panelBody && automationElements.shipAssignment) {
    automationElements.panelBody = automationElements.shipAssignment.querySelector('.automation-body');
  }
  if (!automationElements.presetSelect && automationElements.shipAssignment) {
    automationElements.presetSelect = automationElements.shipAssignment.querySelector('.automation-preset-select');
  }
  if (!automationElements.presetNameInput && automationElements.shipAssignment) {
    automationElements.presetNameInput = automationElements.shipAssignment.querySelector('.automation-preset-name');
  }
  if (!automationElements.newPresetButton && automationElements.shipAssignment) {
    automationElements.newPresetButton = automationElements.shipAssignment.querySelector('.automation-preset-new');
  }
  if (!automationElements.deletePresetButton && automationElements.shipAssignment) {
    automationElements.deletePresetButton = automationElements.shipAssignment.querySelector('.automation-preset-delete');
  }
  if (!automationElements.enablePresetCheckbox && automationElements.shipAssignment) {
    automationElements.enablePresetCheckbox = automationElements.shipAssignment.querySelector('.automation-preset-enable');
  }
  if (!automationElements.stepsContainer && automationElements.shipAssignment) {
    automationElements.stepsContainer = automationElements.shipAssignment.querySelector('.automation-steps');
  }
  if (!automationElements.addStepButton && automationElements.shipAssignment) {
    automationElements.addStepButton = automationElements.shipAssignment.querySelector('.automation-add-step');
  }
}

function showAutomationTab() {
  automationTabVisible = true;
  cacheAutomationElements();
  const { tab, content } = automationElements;
  if (hopeSubtabManager) {
    hopeSubtabManager.show('automation-hope');
  } else {
    if (tab) tab.classList.remove('hidden');
    if (content) content.classList.remove('hidden');
  }
}

function hideAutomationTab() {
  automationTabVisible = false;
  cacheAutomationElements();
  const { tab, content } = automationElements;
  if (hopeSubtabManager) {
    hopeSubtabManager.hide('automation-hope');
  } else {
    if (tab) tab.classList.add('hidden');
    if (content) content.classList.add('hidden');
  }
  if (content && content.classList.contains('active') && typeof activateHopeSubtab === 'function') {
    activateHopeSubtab('awakening-hope');
  }
}

function initializeAutomationUI() {
  if (automationUIInitialized) {
    return;
  }
  cacheAutomationElements();
  buildAutomationShipUI();
  hideAutomationTab();
  automationUIInitialized = true;
  automationUIStale = true;
  updateAutomationUI();
}

function updateAutomationVisibility() {
  cacheAutomationElements();
  const managerEnabled = !!(automationManager && automationManager.enabled);
  if (managerEnabled) {
    if (!automationTabVisible) {
      showAutomationTab();
    }
  } else if (automationTabVisible) {
    hideAutomationTab();
  }
  const { content } = automationElements;
  if (content) {
    content.classList.toggle('hidden', !managerEnabled);
  }
}

function updateAutomationUI() {
  if (!automationUIStale) return;
  automationUIStale = false;
  cacheAutomationElements();
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

  if (panelBody) {
    panelBody.style.display = automation.collapsed ? 'none' : 'flex';
  }
  if (collapseButton) {
    collapseButton.textContent = automation.collapsed ? '▶' : '▼';
  }

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
    enablePresetCheckbox.checked = !!activePreset.enabled;
  } else {
    presetNameInput.value = '';
    enablePresetCheckbox.checked = false;
  }

  stepsContainer.textContent = '';
  if (activePreset) {
    renderAutomationSteps(automation, activePreset, stepsContainer);
  }
  if (addStepButton) {
    addStepButton.disabled = !activePreset || activePreset.steps.length >= 10;
  }
}

function buildAutomationShipUI() {
  const card = document.getElementById('automation-ship-assignment');
  if (!card) return;

  const header = card.querySelector('.automation-card-header');
  if (header) {
    header.textContent = '';
    const titleGroup = document.createElement('div');
    titleGroup.classList.add('automation-title-group');
    const collapse = document.createElement('button');
    collapse.classList.add('automation-collapse');
    collapse.textContent = '▼';
    collapse.title = 'Toggle';
    const title = document.createElement('div');
    title.classList.add('automation-title');
    title.textContent = 'Ship Assignment';
    titleGroup.append(collapse, title);
    header.appendChild(titleGroup);
    const toggleCollapsed = () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      automation.setCollapsed(!automation.collapsed);
      queueAutomationUIRefresh();
      updateAutomationUI();
    };
    titleGroup.addEventListener('click', toggleCollapsed);
    collapse.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCollapsed();
    });
  }

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetRow = document.createElement('div');
  presetRow.classList.add('automation-preset-row');
  body.appendChild(presetRow);

  const presetSelect = document.createElement('select');
  presetSelect.classList.add('automation-preset-select');
  presetRow.appendChild(presetSelect);

  const presetName = document.createElement('input');
  presetName.type = 'text';
  presetName.placeholder = 'Preset name';
  presetName.classList.add('automation-preset-name');
  presetRow.appendChild(presetName);

  const enableWrapper = document.createElement('label');
  enableWrapper.classList.add('automation-enable-wrapper');
  const enableCheckbox = document.createElement('input');
  enableCheckbox.type = 'checkbox';
  enableCheckbox.classList.add('automation-preset-enable');
  enableWrapper.appendChild(enableCheckbox);
  enableWrapper.append(' Enable preset');
  presetRow.appendChild(enableWrapper);

  const presetButtons = document.createElement('div');
  presetButtons.classList.add('automation-preset-buttons');
  const newPreset = document.createElement('button');
  newPreset.textContent = '+ Preset';
  newPreset.classList.add('automation-preset-new');
  const deletePreset = document.createElement('button');
  deletePreset.textContent = 'Delete';
  deletePreset.classList.add('automation-preset-delete');
  presetButtons.append(newPreset, deletePreset);
  presetRow.appendChild(presetButtons);

  const stepsContainer = document.createElement('div');
  stepsContainer.classList.add('automation-steps');
  body.appendChild(stepsContainer);

  const addStepButton = document.createElement('button');
  addStepButton.textContent = '+ Step';
  addStepButton.classList.add('automation-add-step');
  body.appendChild(addStepButton);

  automationElements.collapseButton = card.querySelector('.automation-collapse');
  automationElements.panelBody = body;
  automationElements.presetSelect = presetSelect;
  automationElements.presetNameInput = presetName;
  automationElements.newPresetButton = newPreset;
  automationElements.deletePresetButton = deletePreset;
  automationElements.enablePresetCheckbox = enableCheckbox;
  automationElements.stepsContainer = stepsContainer;
  automationElements.addStepButton = addStepButton;

  attachAutomationHandlers();
}

function attachAutomationHandlers() {
  const {
    collapseButton,
    presetSelect,
    presetNameInput,
    newPresetButton,
    deletePresetButton,
    enablePresetCheckbox,
    addStepButton
  } = automationElements;
  if (collapseButton) {
    collapseButton.addEventListener('click', () => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      automation.setCollapsed(!automation.collapsed);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
  }
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
    enablePresetCheckbox.addEventListener('change', (event) => {
      if (!automationManager || !automationManager.spaceshipAutomation) return;
      const automation = automationManager.spaceshipAutomation;
      const preset = automation.getActivePreset();
      if (!preset) return;
      automation.togglePresetEnabled(preset.id, event.target.checked);
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
  const projects = automation.getSpaceshipProjects();

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

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.min = '0';
      maxInput.placeholder = 'No max';
      if (entry.max !== null && entry.max !== undefined) {
        maxInput.value = entry.max;
      }
      maxInput.addEventListener('change', (event) => {
        automation.updateEntry(preset.id, step.id, entry.projectId, { max: event.target.value });
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(maxInput);

      const projectObject = projects.find(item => item.name === entry.projectId);
      if (projectObject && typeof projectObject.getAutomationDisableAllowed === 'function' ? projectObject.getAutomationDisableAllowed() : true) {
        const excludeWrapper = document.createElement('label');
        excludeWrapper.classList.add('automation-entry-exclude');
        const exclude = document.createElement('input');
        exclude.type = 'checkbox';
        exclude.checked = automation.disabledProjects.has(entry.projectId);
        exclude.addEventListener('change', (event) => {
          automation.toggleProjectDisabled(entry.projectId, event.target.checked);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        excludeWrapper.append(exclude, 'Release if disabled');
        row.appendChild(excludeWrapper);
      }

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeAutomationUI, updateAutomationVisibility, updateAutomationUI, queueAutomationUIRefresh };
}
