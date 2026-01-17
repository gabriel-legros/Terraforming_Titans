const buildingAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderType: 'both',
  builderSelectedBuildings: [],
  builderCategoryValue: 'all',
  builderBuildingValue: ''
};

function buildAutomationBuildingsUI() {
  const card = automationElements.buildingsAutomation || document.getElementById('automation-buildings');

  const toggleCollapsed = () => {
    const automation = automationManager.buildingsAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(card, 'Buildings Automation', toggleCollapsed);

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const builderSection = document.createElement('div');
  builderSection.classList.add('building-automation-section');
  const builderHeader = document.createElement('div');
  builderHeader.classList.add('building-automation-section-title');
  const builderTitle = document.createElement('span');
  builderTitle.textContent = 'Preset Builder';
  const builderDirty = document.createElement('span');
  builderDirty.classList.add('building-automation-builder-dirty');
  builderDirty.textContent = '*';
  builderDirty.style.display = 'none';
  builderHeader.append(builderTitle, builderDirty);
  builderSection.appendChild(builderHeader);

  const builderRow = document.createElement('div');
  builderRow.classList.add('building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('building-automation-builder-select');
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = 'Preset name';
  presetNameInput.classList.add('building-automation-builder-name');
  const newButton = document.createElement('button');
  newButton.textContent = 'New';
  newButton.classList.add('building-automation-builder-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.classList.add('building-automation-builder-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.classList.add('building-automation-builder-delete');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = 'Apply Once Now';
  applyOnceButton.classList.add('building-automation-builder-apply-once');
  builderRow.append(presetSelect, presetNameInput, newButton, saveButton, deleteButton, applyOnceButton);
  builderSection.appendChild(builderRow);

  const builderModeRow = document.createElement('div');
  builderModeRow.classList.add('building-automation-row');
  const typeSelect = document.createElement('select');
  typeSelect.classList.add('building-automation-builder-type');
  const controlOpt = document.createElement('option');
  controlOpt.value = 'control';
  controlOpt.textContent = 'Control only';
  const automationOpt = document.createElement('option');
  automationOpt.value = 'automation';
  automationOpt.textContent = 'Autobuild only';
  const bothOpt = document.createElement('option');
  bothOpt.value = 'both';
  bothOpt.textContent = 'Control + Autobuild';
  typeSelect.append(controlOpt, automationOpt, bothOpt);
  const scopeSelect = document.createElement('select');
  scopeSelect.classList.add('building-automation-builder-scope');
  const allScope = document.createElement('option');
  allScope.value = 'all';
  allScope.textContent = 'All unlocked buildings';
  const manualScope = document.createElement('option');
  manualScope.value = 'manual';
  manualScope.textContent = 'Choose buildings';
  scopeSelect.append(allScope, manualScope);
  builderModeRow.append(typeSelect, scopeSelect);
  builderSection.appendChild(builderModeRow);

  const builderHint = document.createElement('div');
  builderHint.classList.add('building-automation-hint');
  builderHint.textContent = 'Control saves recipe selections and building controls (Disable if / Target albedo). Autobuild saves auto-build mode, target value, Auto-build toggle, Prioritize, Set active to target, and fill filters.';
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('building-automation-builder-category');
  const buildingSelect = document.createElement('select');
  buildingSelect.classList.add('building-automation-builder-building');
  const addButton = document.createElement('button');
  addButton.textContent = '+ Building';
  addButton.classList.add('building-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = '+ Category';
  addCategoryButton.classList.add('building-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = '- All';
  clearButton.classList.add('building-automation-builder-clear');
  pickerRow.append(categorySelect, buildingSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('building-automation-builder-list');
  builderSection.appendChild(selectedList);

  body.appendChild(builderSection);

  const applySection = document.createElement('div');
  applySection.classList.add('building-automation-section');
  const applyHeader = document.createElement('div');
  applyHeader.classList.add('building-automation-section-title');
  const applyTitle = document.createElement('span');
  applyTitle.textContent = 'Preset Combination';
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = 'Apply Combination';
  applyCombinationButton.classList.add('building-automation-apply-combination');
  applyHeader.append(applyTitle, applyCombinationButton);
  applySection.appendChild(applyHeader);

  const applyList = document.createElement('div');
  applyList.classList.add('building-automation-apply-list');
  applySection.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = '+ Preset';
  addApplyButton.classList.add('building-automation-apply-add');
  applySection.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  applyHint.classList.add('building-automation-apply-hint');
  applySection.appendChild(applyHint);

  body.appendChild(applySection);

  automationElements.buildingsCollapseButton = header.collapse;
  automationElements.buildingsPanelBody = body;
  automationElements.buildingsBuilderPresetSelect = presetSelect;
  automationElements.buildingsBuilderPresetNameInput = presetNameInput;
  automationElements.buildingsBuilderNewButton = newButton;
  automationElements.buildingsBuilderSaveButton = saveButton;
  automationElements.buildingsBuilderDeleteButton = deleteButton;
  automationElements.buildingsBuilderApplyOnceButton = applyOnceButton;
  automationElements.buildingsBuilderDirty = builderDirty;
  automationElements.buildingsBuilderTypeSelect = typeSelect;
  automationElements.buildingsBuilderScopeSelect = scopeSelect;
  automationElements.buildingsBuilderCategorySelect = categorySelect;
  automationElements.buildingsBuilderBuildingSelect = buildingSelect;
  automationElements.buildingsBuilderAddButton = addButton;
  automationElements.buildingsBuilderAddCategoryButton = addCategoryButton;
  automationElements.buildingsBuilderClearButton = clearButton;
  automationElements.buildingsBuilderSelectedList = selectedList;
  automationElements.buildingsApplyCombinationButton = applyCombinationButton;
  automationElements.buildingsApplyList = applyList;
  automationElements.buildingsApplyHint = applyHint;
  automationElements.buildingsAddApplyButton = addApplyButton;

  attachBuildingsAutomationHandlers();
}

function updateBuildingsAutomationUI() {
  const {
    buildingsAutomation,
    buildingsAutomationDescription,
    buildingsPanelBody,
    buildingsCollapseButton,
    buildingsBuilderPresetSelect,
    buildingsBuilderPresetNameInput,
    buildingsBuilderNewButton,
    buildingsBuilderSaveButton,
    buildingsBuilderDeleteButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderDirty,
    buildingsBuilderTypeSelect,
    buildingsBuilderScopeSelect,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderAddCategoryButton,
    buildingsBuilderClearButton,
    buildingsBuilderSelectedList,
    buildingsApplyList,
    buildingsApplyHint,
    buildingsApplyCombinationButton,
    buildingsAddApplyButton
  } = automationElements;
  const manager = automationManager;
  const automation = manager.buildingsAutomation;
  const unlocked = manager.hasFeature('automationBuildings');
  buildingsAutomation.style.display = unlocked ? '' : 'none';
  buildingsAutomation.classList.toggle('automation-card-locked', !unlocked);
  buildingsAutomationDescription.textContent = unlocked
    ? 'Capture building control/autobuild settings and apply them in ordered presets.'
    : 'Purchase the Solis Buildings Automation upgrade to enable building presets.';
  if (!unlocked) {
    return;
  }

  buildingsPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  buildingsCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  const presets = automation.presets.slice();
  const unlockedBuildings = getUnlockedBuildings();

  if (document.activeElement !== buildingsBuilderPresetSelect) {
    buildingsBuilderPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = 'New preset';
    buildingsBuilderPresetSelect.appendChild(newOption);
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = preset.name || `Preset ${preset.id}`;
      buildingsBuilderPresetSelect.appendChild(option);
    });
    buildingsBuilderPresetSelect.value = buildingAutomationUIState.builderPresetId || '';
  }

  const activePresetId = buildingAutomationUIState.builderPresetId;
  const activePreset = activePresetId ? automation.getPresetById(Number(activePresetId)) : null;
  if (activePreset && buildingAutomationUIState.syncedPresetId !== activePresetId) {
    const names = Object.keys(activePreset.buildings);
    buildingAutomationUIState.builderScope = activePreset.scopeAll ? 'all' : 'manual';
    buildingAutomationUIState.builderSelectedBuildings = names.slice();
    buildingAutomationUIState.builderType = activePreset.includeControl && activePreset.includeAutomation
        ? 'both'
        : activePreset.includeControl
          ? 'control'
          : 'automation';
    buildingAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && buildingAutomationUIState.syncedPresetId) {
    buildingAutomationUIState.syncedPresetId = null;
  }

  if (document.activeElement !== buildingsBuilderPresetNameInput) {
    buildingsBuilderPresetNameInput.value = activePreset ? activePreset.name : buildingAutomationUIState.builderName;
  }
  if (document.activeElement !== buildingsBuilderTypeSelect) {
    buildingsBuilderTypeSelect.value = buildingAutomationUIState.builderType;
  }
  if (document.activeElement !== buildingsBuilderScopeSelect) {
    buildingsBuilderScopeSelect.value = buildingAutomationUIState.builderScope;
  }

  const showManual = buildingAutomationUIState.builderScope === 'manual';
  buildingsBuilderCategorySelect.parentElement.style.display = showManual ? 'flex' : 'none';
  buildingsBuilderSelectedList.style.display = showManual ? 'flex' : 'none';
  buildingsBuilderClearButton.style.display = showManual ? '' : 'none';
  buildingsBuilderAddCategoryButton.style.display = showManual ? '' : 'none';

  const categories = getBuildingCategories();
  if (document.activeElement !== buildingsBuilderCategorySelect) {
    buildingsBuilderCategorySelect.textContent = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    buildingsBuilderCategorySelect.appendChild(allOption);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      buildingsBuilderCategorySelect.appendChild(option);
    });
    buildingsBuilderCategorySelect.value = buildingAutomationUIState.builderCategoryValue || 'all';
    if (!buildingsBuilderCategorySelect.value) {
      buildingsBuilderCategorySelect.value = 'all';
    }
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value;
  }

  const selectedCategory = buildingsBuilderCategorySelect.value || buildingAutomationUIState.builderCategoryValue || 'all';
  if (document.activeElement !== buildingsBuilderBuildingSelect) {
    const available = unlockedBuildings.filter(building => (
      selectedCategory === 'all' || building.category === selectedCategory
    ));
    buildingsBuilderBuildingSelect.textContent = '';
    if (available.length === 0) {
      const empty = document.createElement('option');
      empty.textContent = 'No unlocked buildings';
      empty.disabled = true;
      empty.selected = true;
      buildingsBuilderBuildingSelect.appendChild(empty);
    } else {
      available.forEach(building => {
        const option = document.createElement('option');
        option.value = building.name;
        option.textContent = building.displayName || building.name;
        buildingsBuilderBuildingSelect.appendChild(option);
      });
      if (buildingAutomationUIState.builderBuildingValue) {
        buildingsBuilderBuildingSelect.value = buildingAutomationUIState.builderBuildingValue;
      }
      if (!buildingsBuilderBuildingSelect.value) {
        buildingsBuilderBuildingSelect.value = available[0].name;
      }
    }
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
  }

  buildingsBuilderAddButton.disabled = buildingsBuilderBuildingSelect.options.length === 0
    || buildingsBuilderBuildingSelect.options[0].disabled;
  buildingsBuilderAddCategoryButton.disabled = buildingsBuilderCategorySelect.options.length === 0
    || !getUnlockedBuildings().length;
  buildingsBuilderClearButton.disabled = buildingAutomationUIState.builderSelectedBuildings.length === 0;
  buildingsBuilderDeleteButton.disabled = !activePreset;
  buildingsBuilderApplyOnceButton.disabled = !activePreset;
  buildingsApplyCombinationButton.disabled = automation.getAssignments().length === 0;

  const selectedHasFocus = buildingsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  if (!selectedHasFocus) {
    buildingsBuilderSelectedList.textContent = '';
    buildingAutomationUIState.builderSelectedBuildings.forEach(name => {
      const building = buildings[name];
      const pill = document.createElement('div');
      pill.classList.add('building-automation-builder-pill');
      const label = document.createElement('span');
      label.textContent = building.displayName || name;
      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = 'Remove building';
      remove.addEventListener('click', () => {
        buildingAutomationUIState.builderSelectedBuildings = buildingAutomationUIState.builderSelectedBuildings.filter(id => id !== name);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      buildingsBuilderSelectedList.appendChild(pill);
    });
  }

  const savedType = activePreset
    ? activePreset.includeControl && activePreset.includeAutomation
      ? 'both'
      : activePreset.includeControl
        ? 'control'
        : 'automation'
    : 'both';
  const savedScope = activePreset
    ? activePreset.scopeAll
      ? 'all'
      : 'manual'
    : 'all';
  const savedBuildingIds = activePreset ? Object.keys(activePreset.buildings) : [];
  const savedBuildingSet = new Set(savedBuildingIds);
  const manualSelection = buildingAutomationUIState.builderScope === 'manual';
  const selectionChanged = manualSelection
    && (buildingAutomationUIState.builderSelectedBuildings.length !== savedBuildingIds.length
      || buildingAutomationUIState.builderSelectedBuildings.some(id => !savedBuildingSet.has(id)));
  const newDirty = !activePreset
    && (
      buildingAutomationUIState.builderName.trim() !== ''
      || buildingAutomationUIState.builderType !== 'both'
      || buildingAutomationUIState.builderScope !== 'all'
      || buildingAutomationUIState.builderSelectedBuildings.length > 0
    );
  const existingDirty = !!activePreset
    && (
      buildingAutomationUIState.builderType !== savedType
      || buildingAutomationUIState.builderScope !== savedScope
      || selectionChanged
    );
  buildingsBuilderDirty.style.display = newDirty || existingDirty ? '' : 'none';

  const applyHasFocus = buildingsApplyList.contains(document.activeElement)
    && document.activeElement.tagName === 'SELECT';
  if (!applyHasFocus) {
    buildingsApplyList.textContent = '';
    const assignments = automation.getAssignments();
    assignments.forEach((assignment, index) => {
      const row = document.createElement('div');
      row.classList.add('building-automation-apply-row');
      const primary = document.createElement('div');
      primary.classList.add('building-automation-apply-primary');
      const toggle = createToggleButton({ onLabel: 'Apply On', offLabel: 'Apply Off', isOn: assignment.enabled });
      toggle.classList.add('building-automation-apply-toggle');
      toggle.addEventListener('click', () => {
        automation.setAssignmentEnabled(assignment.id, !assignment.enabled);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      const select = document.createElement('select');
      presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = String(preset.id);
        option.textContent = preset.name || `Preset ${preset.id}`;
        if (assignment.presetId === preset.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      if (!presets.length) {
        const empty = document.createElement('option');
        empty.textContent = 'No presets saved';
        empty.disabled = true;
        empty.selected = true;
        select.appendChild(empty);
      }
      const detail = document.createElement('span');
      detail.classList.add('building-automation-apply-detail');
      const updateDetail = (presetId) => {
        const preset = automation.getPresetById(presetId);
        const detailText = preset
          ? preset.includeControl && preset.includeAutomation
            ? 'Control + Autobuild'
            : preset.includeControl
              ? 'Control only'
              : 'Autobuild only'
          : 'Select a preset';
        const buildingList = preset
          ? preset.scopeAll
            ? 'All unlocked buildings'
            : Object.keys(preset.buildings).map(id => {
                const building = buildings[id];
                return building.displayName || id;
              }).join(', ')
          : '';
        detail.textContent = buildingList ? `${detailText} / ${buildingList}` : detailText;
      };
      updateDetail(assignment.presetId);
      select.addEventListener('change', (event) => {
        const presetId = Number(event.target.value);
        automation.setAssignmentPreset(assignment.id, presetId);
        updateDetail(presetId);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });

      const controls = document.createElement('div');
      controls.classList.add('building-automation-apply-controls');
      const moveUp = document.createElement('button');
      moveUp.textContent = '↑';
      moveUp.title = 'Move up';
      moveUp.disabled = index === 0;
      moveUp.addEventListener('click', () => {
        automation.moveAssignment(assignment.id, -1);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      const moveDown = document.createElement('button');
      moveDown.textContent = '↓';
      moveDown.title = 'Move down';
      moveDown.disabled = index === assignments.length - 1;
      moveDown.addEventListener('click', () => {
        automation.moveAssignment(assignment.id, 1);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = 'Remove preset';
      remove.addEventListener('click', () => {
        automation.removeAssignment(assignment.id);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      controls.append(moveUp, moveDown, remove);
      primary.append(toggle, select);
      row.append(primary, detail, controls);
      buildingsApplyList.appendChild(row);
    });
  }

  buildingsAddApplyButton.disabled = presets.length === 0;
  buildingsApplyHint.textContent = presets.length === 0
    ? 'Save a preset above to enable the Apply list.'
    : 'Lower presets override higher presets when they target the same building and setting type.';
}

function attachBuildingsAutomationHandlers() {
  const {
    buildingsBuilderPresetSelect,
    buildingsBuilderPresetNameInput,
    buildingsBuilderNewButton,
    buildingsBuilderSaveButton,
    buildingsBuilderDeleteButton,
    buildingsBuilderTypeSelect,
    buildingsBuilderScopeSelect,
    buildingsBuilderCategorySelect,
    buildingsBuilderBuildingSelect,
    buildingsBuilderAddButton,
    buildingsBuilderApplyOnceButton,
    buildingsBuilderAddCategoryButton,
    buildingsBuilderClearButton,
    buildingsApplyCombinationButton,
    buildingsAddApplyButton
  } = automationElements;

  buildingsBuilderPresetSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderPresetId = event.target.value || null;
    buildingAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderPresetNameInput.addEventListener('input', (event) => {
    const presetId = buildingAutomationUIState.builderPresetId;
    if (!presetId) {
      buildingAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const preset = automationManager.buildingsAutomation.getPresetById(Number(presetId));
    if (!preset) {
      return;
    }
    automationManager.buildingsAutomation.renamePreset(preset.id, event.target.value || '');
  });

  buildingsBuilderNewButton.addEventListener('click', () => {
    buildingAutomationUIState.builderPresetId = null;
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.builderName = '';
    buildingAutomationUIState.builderScope = 'all';
    buildingAutomationUIState.builderType = 'both';
    buildingAutomationUIState.builderSelectedBuildings = [];
    buildingAutomationUIState.builderCategoryValue = 'all';
    buildingAutomationUIState.builderBuildingValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderTypeSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderType = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderScopeSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderScope = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderCategorySelect.addEventListener('change', () => {
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value || 'all';
    buildingAutomationUIState.builderBuildingValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderBuildingSelect.addEventListener('change', () => {
    buildingAutomationUIState.builderBuildingValue = buildingsBuilderBuildingSelect.value || '';
  });

  buildingsBuilderAddButton.addEventListener('click', () => {
    const buildingId = buildingsBuilderBuildingSelect.value;
    if (!buildingId) {
      return;
    }
    buildingAutomationUIState.builderCategoryValue = buildingsBuilderCategorySelect.value || 'all';
    buildingAutomationUIState.builderBuildingValue = buildingId;
    if (!buildingAutomationUIState.builderSelectedBuildings.includes(buildingId)) {
      buildingAutomationUIState.builderSelectedBuildings.push(buildingId);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = buildingsBuilderCategorySelect.value || 'all';
    const unlockedBuildings = getUnlockedBuildings();
    const additions = unlockedBuildings.filter(building => (
      selectedCategory === 'all' || building.category === selectedCategory
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(building => {
      if (!buildingAutomationUIState.builderSelectedBuildings.includes(building.name)) {
        buildingAutomationUIState.builderSelectedBuildings.push(building.name);
      }
    });
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderClearButton.addEventListener('click', () => {
    buildingAutomationUIState.builderSelectedBuildings = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderSaveButton.addEventListener('click', () => {
    const automation = automationManager.buildingsAutomation;
    const name = buildingsBuilderPresetNameInput.value || buildingAutomationUIState.builderName || '';
    const type = buildingAutomationUIState.builderType;
    const includeControl = type === 'control' || type === 'both';
    const includeAutomation = type === 'automation' || type === 'both';
    const scopeAll = buildingAutomationUIState.builderScope === 'all';
    const buildingIds = buildingAutomationUIState.builderScope === 'all'
      ? getUnlockedBuildings().map(building => building.name)
      : buildingAutomationUIState.builderSelectedBuildings.slice();
    const presetId = buildingAutomationUIState.builderPresetId;
    if (presetId) {
      automation.updatePreset(Number(presetId), name, buildingIds, { includeControl, includeAutomation, scopeAll });
    } else {
      const newId = automation.addPreset(name, buildingIds, { includeControl, includeAutomation, scopeAll });
      buildingAutomationUIState.builderPresetId = String(newId);
      buildingAutomationUIState.syncedPresetId = null;
      buildingAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderDeleteButton.addEventListener('click', () => {
    const presetId = buildingAutomationUIState.builderPresetId;
    if (!presetId) {
      return;
    }
    automationManager.buildingsAutomation.deletePreset(Number(presetId));
    buildingAutomationUIState.builderPresetId = null;
    buildingAutomationUIState.syncedPresetId = null;
    buildingAutomationUIState.builderName = '';
    buildingAutomationUIState.builderSelectedBuildings = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  buildingsBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = Number(buildingsBuilderPresetSelect.value);
    automationManager.buildingsAutomation.applyPresetOnce(presetId);
  });

  buildingsApplyCombinationButton.addEventListener('click', () => {
    automationManager.buildingsAutomation.applyPresets();
  });

  buildingsAddApplyButton.addEventListener('click', () => {
    const automation = automationManager.buildingsAutomation;
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getUnlockedBuildings() {
  return Object.values(buildings).filter(building => building.unlocked);
}
