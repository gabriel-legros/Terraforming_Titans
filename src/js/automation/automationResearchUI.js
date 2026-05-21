const researchAutomationUIState = {
  builderName: '',
  builderShowInSidebar: true,
  builderIsCreatingNewPreset: false
};
let researchPresetSignature = '';

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
    toggleCollapsed,
    'research'
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetSection = document.createElement('div');
  presetSection.classList.add('building-automation-section');

  const presetTitle = document.createElement('div');
  presetTitle.classList.add('building-automation-section-title');
  const presetTitleText = document.createElement('span');
  presetTitleText.textContent = getAutomationCardText('researchAutomationPresetTitle', {}, 'Preset Builder');
  const presetTitleDirty = document.createElement('span');
  presetTitleDirty.classList.add('building-automation-builder-dirty');
  presetTitleDirty.textContent = '*';
  presetTitleDirty.style.display = 'none';
  presetTitle.append(presetTitleText, presetTitleDirty);
  presetSection.appendChild(presetTitle);

  const presetRowParts = buildAutomationPresetBuilderRow({
    rowClasses: ['building-automation-row'],
    selectClasses: ['research-automation-preset-select'],
    moveUpButtonClasses: ['research-automation-preset-move-up'],
    moveDownButtonClasses: ['research-automation-preset-move-down'],
    nameInputClasses: ['research-automation-preset-name'],
    newButtonClasses: ['research-automation-preset-new'],
    saveButtonClasses: ['research-automation-preset-save'],
    duplicateButtonClasses: ['research-automation-preset-duplicate'],
    deleteButtonClasses: ['research-automation-preset-delete'],
    transferKey: 'research-automation-preset',
    applyOnceButtonClasses: ['research-automation-preset-apply-once'],
    showSidebarKey: 'research-automation-preset'
  });
  presetSection.appendChild(presetRowParts.row);

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
  automationElements.researchPresetSelect = presetRowParts.presetSelect;
  automationElements.researchPresetMoveUpButton = presetRowParts.presetMoveUpButton;
  automationElements.researchPresetMoveDownButton = presetRowParts.presetMoveDownButton;
  automationElements.researchPresetNameInput = presetRowParts.presetNameInput;
  automationElements.researchNewPresetButton = presetRowParts.newButton;
  automationElements.researchSavePresetButton = presetRowParts.saveButton;
  automationElements.researchDuplicatePresetButton = presetRowParts.duplicateButton;
  automationElements.researchDeletePresetButton = presetRowParts.deleteButton;
  automationElements.researchImportPresetButton = presetRowParts.importButton;
  automationElements.researchExportPresetButton = presetRowParts.exportButton;
  automationElements.researchApplyOnceButton = presetRowParts.applyOnceButton;
  automationElements.researchShowPresetInSidebarCheckbox = presetRowParts.showInSidebarCheckbox;
  automationElements.researchApplyNextTravelSelect = nextTravelSelect;
  automationElements.researchApplyNextTravelPersistToggle = nextTravelPersistToggle;
  automationElements.researchPresetJsonDetails = presetJsonDetails;
  automationElements.researchBuilderDirty = presetTitleDirty;

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
    researchDuplicatePresetButton,
    researchDeletePresetButton,
    researchImportPresetButton,
    researchExportPresetButton,
    researchApplyOnceButton,
    researchShowPresetInSidebarCheckbox,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
    researchPresetJsonDetails,
    researchBuilderDirty
  } = automationElements;
  const manager = automationManager;
  const automation = manager.researchAutomation;
  const unlocked = manager.hasFeature('automationResearch');
  const presets = automation.presets.slice();
  if (presets.length > 0 && !automation.getSelectedPreset() && !researchAutomationUIState.builderIsCreatingNewPreset) {
    automation.setSelectedPresetId(presets[0].id);
  }
  const selectedPreset = automation.getSelectedPreset();
  const selectedPresetIndex = selectedPreset
    ? presets.findIndex((preset) => preset.id === selectedPreset.id)
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

  const selectedPresetIdForSignature = automation.getSelectedPresetId() || '';
  const presetSignature = `${selectedPresetIdForSignature}|${presets.map((preset) => `${preset.id}:${preset.name || ''}`).join('|')}`;
  if (document.activeElement !== researchPresetSelect && presetSignature !== researchPresetSignature) {
    researchPresetSelect.textContent = '';
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = getDefaultAutomationPresetLabel(preset);
      researchPresetSelect.appendChild(option);
    });
    researchPresetSignature = presetSignature;
    const selectedPresetId = automation.getSelectedPresetId();
    if (selectedPresetId) {
      researchPresetSelect.value = String(selectedPresetId);
    } else {
      researchPresetSelect.selectedIndex = -1;
    }
  }

  if (document.activeElement !== researchPresetNameInput) {
    researchPresetNameInput.value = selectedPreset ? selectedPreset.name || '' : researchAutomationUIState.builderName;
  }
  if (selectedPreset) {
    researchAutomationUIState.builderShowInSidebar = selectedPreset.showInSidebar !== false;
    researchAutomationUIState.builderIsCreatingNewPreset = false;
  }
  researchBuilderDirty.style.display = researchAutomationUIState.builderIsCreatingNewPreset ? '' : 'none';
  researchShowPresetInSidebarCheckbox.checked = selectedPreset
    ? selectedPreset.showInSidebar !== false
    : researchAutomationUIState.builderShowInSidebar;

  researchPresetMoveUpButton.disabled = selectedPresetIndex <= 0;
  researchPresetMoveDownButton.disabled = selectedPresetIndex < 0 || selectedPresetIndex >= presets.length - 1;
  researchDeletePresetButton.disabled = !selectedPreset;
  researchDuplicatePresetButton.disabled = !selectedPreset;
  researchImportPresetButton.disabled = false;
  researchExportPresetButton.disabled = !selectedPreset;
  researchNewPresetButton.disabled = false;
  researchSavePresetButton.disabled = false;
  researchApplyOnceButton.disabled = !selectedPreset;
  updateAutomationNextTravelPresetControls({
    automation,
    presets,
    selectElement: researchApplyNextTravelSelect,
    persistToggleElement: researchApplyNextTravelPersistToggle
  });

  updateAutomationPresetJsonDetails(researchPresetJsonDetails, selectedPreset, {
    rootPath: ['researches'],
    onFieldChange: (fieldPath, nextValue) => {
      if (!selectedPreset) {
        return;
      }
      applyAutomationPresetJsonFieldEdit(selectedPreset, fieldPath, nextValue, {
        onApplied: (appliedPath, appliedValue, rootKey) => {
          if (rootKey === 'showInSidebar') {
            researchAutomationUIState.builderShowInSidebar = appliedValue !== false;
          }
        }
      });
    }
  });
}

function attachResearchAutomationHandlers() {
  const {
    researchPresetSelect,
    researchPresetMoveUpButton,
    researchPresetMoveDownButton,
    researchPresetNameInput,
    researchNewPresetButton,
    researchSavePresetButton,
    researchDuplicatePresetButton,
    researchDeletePresetButton,
    researchImportPresetButton,
    researchExportPresetButton,
    researchApplyOnceButton,
    researchShowPresetInSidebarCheckbox,
    researchApplyNextTravelSelect,
    researchApplyNextTravelPersistToggle,
  } = automationElements;
  const getAutomation = () => automationManager.researchAutomation;

  researchPresetSelect.addEventListener('change', (event) => {
    const automation = getAutomation();
    automation.setSelectedPresetId(event.target.value || null);
    researchAutomationUIState.builderIsCreatingNewPreset = !event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetNameInput.addEventListener('input', (event) => {
    const automation = getAutomation();
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
    const automation = getAutomation();
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
    const automation = getAutomation();
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.movePreset(preset.id, -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchPresetMoveDownButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.movePreset(preset.id, 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchNewPresetButton.addEventListener('click', () => {
    const automation = getAutomation();
    const suggestedName = getAutomationCardText('presetWithId', { id: automation.nextPresetId }, `Preset ${automation.nextPresetId}`);
    automation.setSelectedPresetId(null);
    researchAutomationUIState.builderName = suggestedName;
    researchAutomationUIState.builderShowInSidebar = true;
    researchAutomationUIState.builderIsCreatingNewPreset = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchSavePresetButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = researchAutomationUIState.builderIsCreatingNewPreset
      ? null
      : automation.getSelectedPreset();
    const name = researchPresetNameInput.value || researchAutomationUIState.builderName || '';
    if (preset) {
      resetAutomationPresetJsonDetailsState(automationElements.researchPresetJsonDetails, preset.id);
      automation.updatePreset(preset.id, name);
      automation.setPresetShowInSidebar(preset.id, researchAutomationUIState.builderShowInSidebar);
    } else {
      const presetId = automation.addPreset(name);
      automation.setPresetShowInSidebar(presetId, researchAutomationUIState.builderShowInSidebar);
      researchAutomationUIState.builderName = '';
    }
    researchAutomationUIState.builderIsCreatingNewPreset = false;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  researchDuplicatePresetButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.duplicatePreset(preset.id);
    researchAutomationUIState.builderName = '';
    researchAutomationUIState.builderIsCreatingNewPreset = false;
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
        const automation = getAutomation();
        automation.importPreset(parsed.preset);
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  researchExportPresetButton.addEventListener('click', () => {
    const automation = getAutomation();
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
    const automation = getAutomation();
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.applyPresetOnce(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  attachAutomationNextTravelPresetHandlers({
    getAutomation,
    selectElement: researchApplyNextTravelSelect,
    persistToggleElement: researchApplyNextTravelPersistToggle
  });

  researchDeletePresetButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = automation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automation.deletePreset(preset.id);
    researchAutomationUIState.builderName = '';
    researchAutomationUIState.builderIsCreatingNewPreset = false;
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });
}
