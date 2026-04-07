function buildAutomationResearchUI() {
  const card = automationElements.researchAutomation || document.getElementById('automation-research');

  const toggleCollapsed = () => {
    researchManager.setAutoResearchAutomationCollapsed(!researchManager.autoResearchAutomationCollapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('researchAutomationTitle', {}, 'Research Automation'),
    toggleCollapsed
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetSection = document.createElement('div');
  presetSection.classList.add('building-automation-section');

  const presetTitle = document.createElement('div');
  presetTitle.classList.add('building-automation-section-title');
  presetTitle.textContent = getAutomationCardText('researchAutomationPresetTitle', {}, 'Preset Builder');
  presetSection.appendChild(presetTitle);

  const presetRow = document.createElement('div');
  presetRow.classList.add('building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('research-automation-preset-select');
  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  presetMoveUpButton.classList.add('research-automation-preset-move-up');
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  presetMoveDownButton.classList.add('research-automation-preset-move-down');
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetNameInput.classList.add('research-automation-preset-name');
  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  newButton.classList.add('research-automation-preset-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  saveButton.classList.add('research-automation-preset-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deleteButton.classList.add('research-automation-preset-delete');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  applyOnceButton.classList.add('research-automation-preset-apply-once');
  presetRow.append(presetSelect, presetMoveButtons, presetNameInput, newButton, saveButton, deleteButton, applyOnceButton);
  presetSection.appendChild(presetRow);

  const nextTravelRow = document.createElement('div');
  nextTravelRow.classList.add('building-automation-next-travel-row');
  const nextTravelLabel = document.createElement('label');
  nextTravelLabel.classList.add('building-automation-apply-next-travel-label');
  const nextTravelText = document.createElement('span');
  nextTravelText.textContent = getAutomationCardText('researchAutomationNextTravelLabel', {}, 'Preset on Next Travel');
  const nextTravelSelect = document.createElement('select');
  nextTravelSelect.classList.add('research-automation-next-travel-select');
  const nextTravelPersistToggle = document.createElement('input');
  nextTravelPersistToggle.type = 'checkbox';
  nextTravelPersistToggle.classList.add('research-automation-next-travel-persist-toggle');
  const nextTravelPersistText = document.createElement('span');
  nextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  nextTravelPersistText.classList.add('building-automation-next-travel-persist-text');
  nextTravelLabel.append(
    nextTravelText,
    nextTravelSelect,
    nextTravelPersistToggle,
    nextTravelPersistText
  );
  nextTravelRow.append(nextTravelLabel);
  presetSection.appendChild(nextTravelRow);

  const presetJsonDetails = createAutomationPresetJsonDetails('research-automation-preset-json-details');
  presetSection.appendChild(presetJsonDetails);

  body.appendChild(presetSection);

  automationElements.researchCollapseButton = header.collapse;
  automationElements.researchPanelBody = body;
  automationElements.researchPresetSelect = presetSelect;
  automationElements.researchPresetMoveUpButton = presetMoveUpButton;
  automationElements.researchPresetMoveDownButton = presetMoveDownButton;
  automationElements.researchPresetNameInput = presetNameInput;
  automationElements.researchNewPresetButton = newButton;
  automationElements.researchSavePresetButton = saveButton;
  automationElements.researchDeletePresetButton = deleteButton;
  automationElements.researchApplyOnceButton = applyOnceButton;
  automationElements.researchApplyNextTravelSelect = nextTravelSelect;
  automationElements.researchApplyNextTravelPersistToggle = nextTravelPersistToggle;
  automationElements.researchPresetJsonDetails = presetJsonDetails;

  attachResearchAutomationHandlers();
}

function updateResearchAutomationUI() {
  const {
    researchAutomation,
    researchAutomationDescription,
    researchPanelBody,
    researchCollapseButton,
    researchPresetSelect,
    researchPresetMoveUpButton,
    researchPresetMoveDownButton,
    researchPresetNameInput,
    researchNewPresetButton,
    researchSavePresetButton,
    researchDeletePresetButton,
    researchApplyOnceButton,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
    researchPresetJsonDetails,
  } = automationElements;
  const manager = automationManager;
  const unlocked = manager.hasFeature('automationResearch');
  const presets = researchManager.autoResearchPresets.slice();
  const activePreset = researchManager.getSelectedAutoResearchPreset();
  const activePresetIndex = activePreset
    ? presets.findIndex((preset) => preset.id === activePreset.id)
    : -1;

  researchAutomation.style.display = unlocked ? '' : 'none';
  researchAutomation.classList.toggle('automation-card-locked', !unlocked);
  researchAutomationDescription.textContent = unlocked
    ? getAutomationCardText(
      'researchAutomationDescriptionUnlocked',
      {},
      'Store research presets and switch the Research tab between them.'
    )
    : getAutomationCardText(
      'researchAutomationDescriptionLocked',
      {},
      'Purchase the Solis Research Automation upgrade to manage research presets.'
    );
  if (!unlocked) {
    return;
  }

  researchPanelBody.style.display = researchManager.autoResearchAutomationCollapsed ? 'none' : 'flex';
  researchCollapseButton.textContent = researchManager.autoResearchAutomationCollapsed ? '▶' : '▼';

  if (document.activeElement !== researchPresetSelect) {
    researchPresetSelect.textContent = '';
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = preset.name || `Preset ${preset.id}`;
      researchPresetSelect.appendChild(option);
    });
    researchPresetSelect.value = activePreset ? String(activePreset.id) : '';
  }

  if (document.activeElement !== researchPresetNameInput) {
    researchPresetNameInput.value = activePreset ? activePreset.name || '' : '';
  }

  researchPresetMoveUpButton.disabled = activePresetIndex <= 0;
  researchPresetMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  researchDeletePresetButton.disabled = presets.length <= 1 || !activePreset;
  researchNewPresetButton.disabled = false;
  researchSavePresetButton.disabled = !activePreset;
  researchApplyOnceButton.disabled = !activePreset;
  const nextTravelPresetId = researchManager.nextTravelAutoResearchPresetId;
  const nextTravelPreset = nextTravelPresetId
    ? researchManager.getAutoResearchPresetObject(nextTravelPresetId)
    : null;
  if (nextTravelPresetId && !nextTravelPreset) {
    researchManager.nextTravelAutoResearchPresetId = null;
    researchManager.nextTravelAutoResearchPresetPersistent = false;
  }
  researchManager.nextTravelAutoResearchPresetPersistent = researchManager.nextTravelAutoResearchPresetPersistent
    && !!researchManager.nextTravelAutoResearchPresetId;
  if (document.activeElement !== researchApplyNextTravelSelect) {
    researchApplyNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = getAutomationCardText('noneOption', {}, 'None');
    researchApplyNextTravelSelect.appendChild(noneOption);
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = preset.name || `Preset ${preset.id}`;
      researchApplyNextTravelSelect.appendChild(option);
    });
    researchApplyNextTravelSelect.value = researchManager.nextTravelAutoResearchPresetId
      ? String(researchManager.nextTravelAutoResearchPresetId)
      : '';
  }
  researchApplyNextTravelPersistToggle.checked = researchManager.nextTravelAutoResearchPresetPersistent;
  researchApplyNextTravelPersistToggle.disabled = !researchManager.nextTravelAutoResearchPresetId;

  updateAutomationPresetJsonDetails(researchPresetJsonDetails, activePreset);
}

function attachResearchAutomationHandlers() {
  const {
    researchPresetSelect,
    researchPresetMoveUpButton,
    researchPresetMoveDownButton,
    researchPresetNameInput,
    researchNewPresetButton,
    researchSavePresetButton,
    researchDeletePresetButton,
    researchApplyOnceButton,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
  } = automationElements;

  researchPresetSelect.addEventListener('change', (event) => {
    researchManager.setCurrentAutoResearchPreset(Number(event.target.value));
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  researchPresetNameInput.addEventListener('input', (event) => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.renameAutoResearchPreset(preset.id, event.target.value || '');
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetMoveUpButton.addEventListener('click', () => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.moveAutoResearchPreset(preset.id, -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetMoveDownButton.addEventListener('click', () => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.moveAutoResearchPreset(preset.id, 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchNewPresetButton.addEventListener('click', () => {
    researchManager.createAutoResearchPreset('');
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  researchSavePresetButton.addEventListener('click', () => {
    researchManager.saveCurrentAutoResearchPreset();
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchApplyOnceButton.addEventListener('click', () => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.applyAutoResearchPresetOnce(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  researchApplyNextTravelSelect.addEventListener('change', (event) => {
    const presetId = event.target.value;
    researchManager.nextTravelAutoResearchPresetId = presetId ? Number(presetId) : null;
    researchManager.nextTravelAutoResearchPresetPersistent = researchManager.nextTravelAutoResearchPresetPersistent
      && !!researchManager.nextTravelAutoResearchPresetId;
    researchApplyNextTravelPersistToggle.checked = researchManager.nextTravelAutoResearchPresetPersistent;
    researchApplyNextTravelPersistToggle.disabled = !researchManager.nextTravelAutoResearchPresetId;
  });

  researchApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    researchManager.nextTravelAutoResearchPresetPersistent = event.target.checked
      && !!researchManager.nextTravelAutoResearchPresetId;
  });

  researchDeletePresetButton.addEventListener('click', () => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.deleteAutoResearchPreset(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });
}
