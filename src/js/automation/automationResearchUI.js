const researchAutomationUIState = {
  builderName: '',
  builderShowInSidebar: true
};

function buildAutomationResearchUI() {
  const card = automationElements.researchAutomation || document.getElementById('automation-research');

  const toggleCollapsed = () => {
    automationManager.researchAutomation.setCollapsed(!automationManager.researchAutomation.collapsed);
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
  const transferButtons = createAutomationPresetTransferButtons('research-automation-preset');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  applyOnceButton.classList.add('research-automation-preset-apply-once');
  const showSidebar = createAutomationShowInSidebarLabel('research-automation-preset');
  presetRow.append(
    presetSelect,
    presetMoveButtons,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    transferButtons.importButton,
    transferButtons.exportButton,
    applyOnceButton,
    showSidebar.label
  );
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
  automationElements.researchImportPresetButton = transferButtons.importButton;
  automationElements.researchExportPresetButton = transferButtons.exportButton;
  automationElements.researchApplyOnceButton = applyOnceButton;
  automationElements.researchShowPresetInSidebarCheckbox = showSidebar.checkbox;
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
    researchImportPresetButton,
    researchExportPresetButton,
    researchApplyOnceButton,
    researchShowPresetInSidebarCheckbox,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
    researchPresetJsonDetails,
  } = automationElements;
  const manager = automationManager;
  const automation = manager.researchAutomation;
  const unlocked = manager.hasFeature('automationResearch');
  const presets = automation.presets.slice();
  const activePreset = automation.getSelectedPreset();
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

  researchPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  researchCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  if (document.activeElement !== researchPresetSelect) {
    researchPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = getAutomationCardText('newPresetOption', {}, 'New preset');
    researchPresetSelect.appendChild(newOption);
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = preset.name || `Preset ${preset.id}`;
      researchPresetSelect.appendChild(option);
    });
    researchPresetSelect.value = automation.getSelectedPresetId() || '';
  }

  if (document.activeElement !== researchPresetNameInput) {
    researchPresetNameInput.value = activePreset ? activePreset.name || '' : researchAutomationUIState.builderName;
  }
  if (activePreset) {
    researchAutomationUIState.builderShowInSidebar = activePreset.showInSidebar !== false;
  }
  researchShowPresetInSidebarCheckbox.checked = activePreset
    ? activePreset.showInSidebar !== false
    : researchAutomationUIState.builderShowInSidebar;

  researchPresetMoveUpButton.disabled = activePresetIndex <= 0;
  researchPresetMoveDownButton.disabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
  researchDeletePresetButton.disabled = presets.length <= 1 || !activePreset;
  researchImportPresetButton.disabled = false;
  researchExportPresetButton.disabled = !activePreset;
  researchNewPresetButton.disabled = false;
  researchSavePresetButton.disabled = false;
  researchApplyOnceButton.disabled = !activePreset;
  const nextTravelPresetId = automation.nextTravelPresetId;
  const nextTravelPreset = nextTravelPresetId ? automation.getPresetById(nextTravelPresetId) : null;
  if (nextTravelPresetId && !nextTravelPreset) {
    automation.nextTravelPresetId = null;
    automation.nextTravelPersistent = false;
  }
  automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;
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
    researchApplyNextTravelSelect.value = automation.nextTravelPresetId
      ? String(automation.nextTravelPresetId)
      : '';
  }
  researchApplyNextTravelPersistToggle.checked = automation.nextTravelPersistent;
  researchApplyNextTravelPersistToggle.disabled = !automation.nextTravelPresetId;

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
    researchImportPresetButton,
    researchExportPresetButton,
    researchApplyOnceButton,
    researchShowPresetInSidebarCheckbox,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
  } = automationElements;
  const automation = automationManager.researchAutomation;

  researchPresetSelect.addEventListener('change', (event) => {
    automation.setSelectedPresetId(event.target.value || null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetNameInput.addEventListener('input', (event) => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      researchAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    if (!automation.renamePreset(preset.id, event.target.value || '')) {
      return;
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchShowPresetInSidebarCheckbox.addEventListener('change', (event) => {
    researchAutomationUIState.builderShowInSidebar = event.target.checked;
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.setPresetShowInSidebar(preset.id, researchAutomationUIState.builderShowInSidebar);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetMoveUpButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.movePreset(preset.id, -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetMoveDownButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.movePreset(preset.id, 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchNewPresetButton.addEventListener('click', () => {
    automation.setSelectedPresetId(null);
    researchAutomationUIState.builderName = '';
    researchAutomationUIState.builderShowInSidebar = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchSavePresetButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    const name = researchPresetNameInput.value || researchAutomationUIState.builderName || '';
    if (preset) {
      automation.updatePreset(preset.id, name);
      automation.setPresetShowInSidebar(preset.id, researchAutomationUIState.builderShowInSidebar);
    } else {
      const presetId = automation.addPreset(name);
      automation.setPresetShowInSidebar(presetId, researchAutomationUIState.builderShowInSidebar);
      researchAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchImportPresetButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importResearchPresetTitle', {}, 'Import Research Preset'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'research');
        if (!parsed.ok) {
          return parsed;
        }
        automation.importPreset(parsed.preset);
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  researchExportPresetButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    exportAutomationPresetToClipboard(
      'research',
      automation.exportPreset(preset.id),
      researchExportPresetButton
    );
  });

  researchApplyOnceButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.applyPresetOnce(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  researchApplyNextTravelSelect.addEventListener('change', (event) => {
    const presetId = event.target.value;
    automation.nextTravelPresetId = presetId ? Number(presetId) : null;
    automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;
    researchApplyNextTravelPersistToggle.checked = automation.nextTravelPersistent;
    researchApplyNextTravelPersistToggle.disabled = !automation.nextTravelPresetId;
  });

  researchApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    automation.nextTravelPersistent = event.target.checked && !!automation.nextTravelPresetId;
  });

  researchDeletePresetButton.addEventListener('click', () => {
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.deletePreset(preset.id);
    researchAutomationUIState.builderName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });
}
