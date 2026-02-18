const projectAutomationUIState = {
  builderPresetId: null,
  syncedPresetId: null,
  builderName: '',
  builderScope: 'all',
  builderSelectedProjects: [],
  builderCategoryValue: 'all',
  builderProjectValue: '',
  combinationId: null,
  combinationSyncedId: null,
  combinationName: ''
};

function buildAutomationProjectsUI() {
  const card = automationElements.projectsAutomation || document.getElementById('automation-projects');

  const toggleCollapsed = () => {
    const automation = automationManager.projectsAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(card, 'Projects Automation', toggleCollapsed);

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const builderSection = document.createElement('div');
  builderSection.classList.add('project-automation-section', 'building-automation-section');
  const builderHeader = document.createElement('div');
  builderHeader.classList.add('project-automation-section-title', 'building-automation-section-title');
  const builderTitle = document.createElement('span');
  builderTitle.textContent = 'Preset Builder';
  const builderDirty = document.createElement('span');
  builderDirty.classList.add('project-automation-builder-dirty', 'building-automation-builder-dirty');
  builderDirty.textContent = '*';
  builderDirty.style.display = 'none';
  builderHeader.append(builderTitle, builderDirty);
  builderSection.appendChild(builderHeader);

  const builderRow = document.createElement('div');
  builderRow.classList.add('project-automation-row', 'building-automation-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('project-automation-builder-select');
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = 'Preset name';
  presetNameInput.classList.add('project-automation-builder-name');
  const newButton = document.createElement('button');
  newButton.textContent = 'New';
  newButton.classList.add('project-automation-builder-new');
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.classList.add('project-automation-builder-save', 'building-automation-builder-save');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.classList.add('project-automation-builder-delete');
  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = 'Apply Once Now';
  applyOnceButton.classList.add('project-automation-builder-apply-once');
  builderRow.append(presetSelect, presetNameInput, newButton, saveButton, deleteButton, applyOnceButton);
  builderSection.appendChild(builderRow);

  const builderModeRow = document.createElement('div');
  builderModeRow.classList.add('project-automation-row', 'building-automation-row');
  const scopeSelect = document.createElement('select');
  scopeSelect.classList.add('project-automation-builder-scope');
  const allScope = document.createElement('option');
  allScope.value = 'all';
  allScope.textContent = 'All non-story projects';
  const manualScope = document.createElement('option');
  manualScope.value = 'manual';
  manualScope.textContent = 'Choose projects';
  scopeSelect.append(allScope, manualScope);
  builderModeRow.append(scopeSelect);
  builderSection.appendChild(builderModeRow);

  const builderHint = document.createElement('div');
  builderHint.classList.add('project-automation-hint', 'building-automation-hint');
  builderHint.textContent = 'Presets save only player-configurable project controls, not in-progress runtime state.';
  builderSection.appendChild(builderHint);

  const pickerRow = document.createElement('div');
  pickerRow.classList.add('project-automation-row', 'building-automation-row');
  const categorySelect = document.createElement('select');
  categorySelect.classList.add('project-automation-builder-category');
  const projectSelect = document.createElement('select');
  projectSelect.classList.add('project-automation-builder-project');
  const addButton = document.createElement('button');
  addButton.textContent = '+ Project';
  addButton.classList.add('project-automation-builder-add');
  const addCategoryButton = document.createElement('button');
  addCategoryButton.textContent = '+ Category';
  addCategoryButton.classList.add('project-automation-builder-add-category');
  const clearButton = document.createElement('button');
  clearButton.textContent = '- All';
  clearButton.classList.add('project-automation-builder-clear');
  pickerRow.append(categorySelect, projectSelect, addButton, addCategoryButton, clearButton);
  builderSection.appendChild(pickerRow);

  const selectedList = document.createElement('div');
  selectedList.classList.add('project-automation-builder-list', 'building-automation-builder-list');
  builderSection.appendChild(selectedList);

  body.appendChild(builderSection);

  const applySection = document.createElement('div');
  applySection.classList.add('project-automation-section', 'building-automation-section');
  const applyHeader = document.createElement('div');
  applyHeader.classList.add('project-automation-section-title', 'building-automation-section-title');
  const applyTitle = document.createElement('span');
  applyTitle.textContent = 'Preset Combination';
  const applyNextTravelLabel = document.createElement('label');
  applyNextTravelLabel.classList.add('project-automation-apply-next-travel-label', 'building-automation-apply-next-travel-label');
  const applyNextTravelText = document.createElement('span');
  applyNextTravelText.textContent = 'Combination on Next Travel';
  const applyNextTravelSelect = document.createElement('select');
  applyNextTravelSelect.classList.add('project-automation-next-travel-select', 'building-automation-next-travel-select');
  const applyNextTravelPersistToggle = document.createElement('input');
  applyNextTravelPersistToggle.type = 'checkbox';
  applyNextTravelPersistToggle.classList.add('project-automation-next-travel-persist-toggle');
  const applyNextTravelPersistText = document.createElement('span');
  applyNextTravelPersistText.textContent = 'All future travels';
  applyNextTravelPersistText.classList.add('project-automation-next-travel-persist-text', 'building-automation-next-travel-persist-text');
  applyNextTravelLabel.append(
    applyNextTravelText,
    applyNextTravelSelect,
    applyNextTravelPersistToggle,
    applyNextTravelPersistText
  );
  applyHeader.append(applyTitle);
  applySection.appendChild(applyHeader);
  const applyNextTravelRow = document.createElement('div');
  applyNextTravelRow.classList.add('project-automation-next-travel-row', 'building-automation-next-travel-row');
  applyNextTravelRow.append(applyNextTravelLabel);
  applySection.appendChild(applyNextTravelRow);

  const combinationRow = document.createElement('div');
  combinationRow.classList.add('project-automation-row', 'building-automation-row');
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = 'Apply Combination';
  applyCombinationButton.classList.add('project-automation-apply-combination', 'building-automation-apply-combination');
  const combinationSelect = document.createElement('select');
  combinationSelect.classList.add('project-automation-combination-select');
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = 'Combination name';
  combinationNameInput.classList.add('project-automation-combination-name');
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = 'New';
  combinationNewButton.classList.add('project-automation-combination-new');
  const combinationSaveButton = document.createElement('button');
  combinationSaveButton.textContent = 'Save';
  combinationSaveButton.classList.add('project-automation-combination-save', 'building-automation-combination-save');
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = 'Delete';
  combinationDeleteButton.classList.add('project-automation-combination-delete');
  combinationRow.append(
    combinationSelect,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDeleteButton,
    applyCombinationButton
  );
  applySection.appendChild(combinationRow);

  const applyList = document.createElement('div');
  applyList.classList.add('project-automation-apply-list', 'building-automation-apply-list');
  applySection.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = '+ Preset';
  addApplyButton.classList.add('project-automation-apply-add', 'building-automation-apply-add');
  applySection.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  applyHint.classList.add('project-automation-apply-hint', 'building-automation-apply-hint');
  applySection.appendChild(applyHint);

  body.appendChild(applySection);

  automationElements.projectsCollapseButton = header.collapse;
  automationElements.projectsPanelBody = body;
  automationElements.projectsBuilderPresetSelect = presetSelect;
  automationElements.projectsBuilderPresetNameInput = presetNameInput;
  automationElements.projectsBuilderNewButton = newButton;
  automationElements.projectsBuilderSaveButton = saveButton;
  automationElements.projectsBuilderDeleteButton = deleteButton;
  automationElements.projectsBuilderApplyOnceButton = applyOnceButton;
  automationElements.projectsBuilderDirty = builderDirty;
  automationElements.projectsBuilderScopeSelect = scopeSelect;
  automationElements.projectsBuilderCategorySelect = categorySelect;
  automationElements.projectsBuilderProjectSelect = projectSelect;
  automationElements.projectsBuilderAddButton = addButton;
  automationElements.projectsBuilderAddCategoryButton = addCategoryButton;
  automationElements.projectsBuilderClearButton = clearButton;
  automationElements.projectsBuilderSelectedList = selectedList;
  automationElements.projectsApplyCombinationButton = applyCombinationButton;
  automationElements.projectsApplyNextTravelSelect = applyNextTravelSelect;
  automationElements.projectsApplyNextTravelPersistToggle = applyNextTravelPersistToggle;
  automationElements.projectsCombinationSelect = combinationSelect;
  automationElements.projectsCombinationNameInput = combinationNameInput;
  automationElements.projectsCombinationNewButton = combinationNewButton;
  automationElements.projectsCombinationSaveButton = combinationSaveButton;
  automationElements.projectsCombinationDeleteButton = combinationDeleteButton;
  automationElements.projectsApplyList = applyList;
  automationElements.projectsApplyHint = applyHint;
  automationElements.projectsAddApplyButton = addApplyButton;

  attachProjectsAutomationHandlers();
}

function updateProjectsAutomationUI() {
  const {
    projectsAutomation,
    projectsAutomationDescription,
    projectsPanelBody,
    projectsCollapseButton,
    projectsBuilderPresetSelect,
    projectsBuilderPresetNameInput,
    projectsBuilderNewButton,
    projectsBuilderSaveButton,
    projectsBuilderDeleteButton,
    projectsBuilderApplyOnceButton,
    projectsBuilderDirty,
    projectsBuilderScopeSelect,
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderAddButton,
    projectsBuilderAddCategoryButton,
    projectsBuilderClearButton,
    projectsBuilderSelectedList,
    projectsApplyList,
    projectsApplyHint,
    projectsApplyCombinationButton,
    projectsApplyNextTravelSelect,
    projectsApplyNextTravelPersistToggle,
    projectsAddApplyButton,
    projectsCombinationSelect,
    projectsCombinationNameInput,
    projectsCombinationNewButton,
    projectsCombinationSaveButton,
    projectsCombinationDeleteButton
  } = automationElements;
  const manager = automationManager;
  const automation = manager.projectsAutomation;
  const unlocked = manager.hasFeature('automationProjects');
  projectsAutomation.style.display = unlocked ? '' : 'none';
  projectsAutomation.classList.toggle('automation-card-locked', !unlocked);
  projectsAutomationDescription.textContent = unlocked
    ? 'Capture project control settings and apply them in ordered presets.'
    : 'Purchase the Solis Projects Automation upgrade to enable project presets.';
  if (!unlocked) {
    return;
  }

  projectsPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  projectsCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  const presets = automation.presets.slice();
  const combinations = automation.getCombinations();
  const automatableProjects = getAutomatableProjects();

  if (document.activeElement !== projectsBuilderPresetSelect) {
    projectsBuilderPresetSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = 'New preset';
    projectsBuilderPresetSelect.appendChild(newOption);
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = String(preset.id);
      option.textContent = preset.name || `Preset ${preset.id}`;
      projectsBuilderPresetSelect.appendChild(option);
    });
    projectsBuilderPresetSelect.value = projectAutomationUIState.builderPresetId || '';
  }

  const activePresetId = projectAutomationUIState.builderPresetId;
  const activePreset = activePresetId ? automation.getPresetById(Number(activePresetId)) : null;
  if (activePreset && projectAutomationUIState.syncedPresetId !== activePresetId) {
    const names = Object.keys(activePreset.projects);
    projectAutomationUIState.builderScope = activePreset.scopeAll ? 'all' : 'manual';
    projectAutomationUIState.builderSelectedProjects = names.slice();
    projectAutomationUIState.syncedPresetId = activePresetId;
  }
  if (!activePreset && projectAutomationUIState.syncedPresetId) {
    projectAutomationUIState.syncedPresetId = null;
  }

  if (document.activeElement !== projectsBuilderPresetNameInput) {
    projectsBuilderPresetNameInput.value = activePreset ? activePreset.name : projectAutomationUIState.builderName;
  }
  if (document.activeElement !== projectsBuilderScopeSelect) {
    projectsBuilderScopeSelect.value = projectAutomationUIState.builderScope;
  }

  const showManual = projectAutomationUIState.builderScope === 'manual';
  projectsBuilderCategorySelect.parentElement.style.display = showManual ? 'flex' : 'none';
  projectsBuilderSelectedList.style.display = showManual ? 'flex' : 'none';
  projectsBuilderClearButton.style.display = showManual ? '' : 'none';
  projectsBuilderAddCategoryButton.style.display = showManual ? '' : 'none';

  const categories = getProjectAutomationCategories(automatableProjects);
  if (document.activeElement !== projectsBuilderCategorySelect) {
    projectsBuilderCategorySelect.textContent = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    projectsBuilderCategorySelect.appendChild(allOption);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      projectsBuilderCategorySelect.appendChild(option);
    });
    projectsBuilderCategorySelect.value = projectAutomationUIState.builderCategoryValue || 'all';
    if (!projectsBuilderCategorySelect.value) {
      projectsBuilderCategorySelect.value = 'all';
    }
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value;
  }

  const selectedCategory = projectsBuilderCategorySelect.value || projectAutomationUIState.builderCategoryValue || 'all';
  if (document.activeElement !== projectsBuilderProjectSelect) {
    const available = automatableProjects.filter(project => (
      selectedCategory === 'all' || (project.category || 'general') === selectedCategory
    ));
    projectsBuilderProjectSelect.textContent = '';
    if (available.length === 0) {
      const empty = document.createElement('option');
      empty.textContent = 'No projects available';
      empty.disabled = true;
      empty.selected = true;
      projectsBuilderProjectSelect.appendChild(empty);
    } else {
      available.forEach(project => {
        const option = document.createElement('option');
        option.value = project.name;
        option.textContent = project.displayName || project.name;
        projectsBuilderProjectSelect.appendChild(option);
      });
      if (projectAutomationUIState.builderProjectValue) {
        projectsBuilderProjectSelect.value = projectAutomationUIState.builderProjectValue;
      }
      if (!projectsBuilderProjectSelect.value) {
        projectsBuilderProjectSelect.value = available[0].name;
      }
    }
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
  }

  projectsBuilderAddButton.disabled = projectsBuilderProjectSelect.options.length === 0
    || projectsBuilderProjectSelect.options[0].disabled;
  projectsBuilderAddCategoryButton.disabled = projectsBuilderCategorySelect.options.length === 0
    || !automatableProjects.length;
  projectsBuilderClearButton.disabled = projectAutomationUIState.builderSelectedProjects.length === 0;
  projectsBuilderDeleteButton.disabled = !activePreset;
  projectsBuilderApplyOnceButton.disabled = !activePreset;
  projectsApplyCombinationButton.disabled = automation.getAssignments().length === 0;
  projectsCombinationSaveButton.disabled = automation.getAssignments().length === 0;

  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;

  if (document.activeElement !== projectsApplyNextTravelSelect) {
    projectsApplyNextTravelSelect.textContent = '';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = 'None';
    projectsApplyNextTravelSelect.appendChild(noneOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = combo.name || `Combination ${combo.id}`;
      projectsApplyNextTravelSelect.appendChild(option);
    });
    projectsApplyNextTravelSelect.value = automation.nextTravelCombinationId
      ? String(automation.nextTravelCombinationId)
      : '';
  }
  projectsApplyNextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
  projectsApplyNextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;

  if (document.activeElement !== projectsCombinationSelect) {
    projectsCombinationSelect.textContent = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = 'New combination';
    projectsCombinationSelect.appendChild(newOption);
    combinations.forEach(combo => {
      const option = document.createElement('option');
      option.value = String(combo.id);
      option.textContent = combo.name || `Combination ${combo.id}`;
      projectsCombinationSelect.appendChild(option);
    });
    projectsCombinationSelect.value = projectAutomationUIState.combinationId || '';
  }

  const activeCombinationId = projectAutomationUIState.combinationId;
  const activeCombination = activeCombinationId
    ? automation.getCombinationById(Number(activeCombinationId))
    : null;
  if (activeCombination && projectAutomationUIState.combinationSyncedId !== activeCombinationId) {
    projectAutomationUIState.combinationName = activeCombination.name;
    projectAutomationUIState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && projectAutomationUIState.combinationSyncedId) {
    projectAutomationUIState.combinationSyncedId = null;
  }

  if (document.activeElement !== projectsCombinationNameInput) {
    projectsCombinationNameInput.value = activeCombination
      ? activeCombination.name
      : projectAutomationUIState.combinationName;
  }

  projectsCombinationDeleteButton.disabled = !activeCombination;

  const selectedHasFocus = projectsBuilderSelectedList.contains(document.activeElement)
    && document.activeElement.tagName === 'INPUT';
  if (!selectedHasFocus) {
    projectsBuilderSelectedList.textContent = '';
    projectAutomationUIState.builderSelectedProjects.forEach(name => {
      const project = projectManager.projects[name];
      const pill = document.createElement('div');
      pill.classList.add('project-automation-builder-pill', 'building-automation-builder-pill');
      const label = document.createElement('span');
      label.textContent = project?.displayName || name;
      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = 'Remove project';
      remove.addEventListener('click', () => {
        projectAutomationUIState.builderSelectedProjects = projectAutomationUIState.builderSelectedProjects.filter(id => id !== name);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      pill.append(label, remove);
      projectsBuilderSelectedList.appendChild(pill);
    });
  }

  const savedScope = activePreset
    ? activePreset.scopeAll
      ? 'all'
      : 'manual'
    : 'all';
  const savedProjectIds = activePreset ? Object.keys(activePreset.projects) : [];
  const savedProjectSet = new Set(savedProjectIds);
  const manualSelection = projectAutomationUIState.builderScope === 'manual';
  const selectionChanged = manualSelection
    && (projectAutomationUIState.builderSelectedProjects.length !== savedProjectIds.length
      || projectAutomationUIState.builderSelectedProjects.some(id => !savedProjectSet.has(id)));
  const newDirty = !activePreset
    && (
      projectAutomationUIState.builderName.trim() !== ''
      || projectAutomationUIState.builderScope !== 'all'
      || projectAutomationUIState.builderSelectedProjects.length > 0
    );
  const existingDirty = !!activePreset
    && (
      projectAutomationUIState.builderScope !== savedScope
      || selectionChanged
    );
  projectsBuilderDirty.style.display = newDirty || existingDirty ? '' : 'none';

  const applyHasFocus = projectsApplyList.contains(document.activeElement)
    && document.activeElement.tagName === 'SELECT';
  if (!applyHasFocus) {
    projectsApplyList.textContent = '';
    const assignments = automation.getAssignments();
    assignments.forEach((assignment, index) => {
      const row = document.createElement('div');
      row.classList.add('project-automation-apply-row', 'building-automation-apply-row');
      const primary = document.createElement('div');
      primary.classList.add('project-automation-apply-primary', 'building-automation-apply-primary');
      const toggle = createToggleButton({ onLabel: 'Apply On', offLabel: 'Apply Off', isOn: assignment.enabled });
      toggle.classList.add('project-automation-apply-toggle', 'building-automation-apply-toggle');
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
      detail.classList.add('project-automation-apply-detail', 'building-automation-apply-detail');
      const updateDetail = (presetId) => {
        const preset = automation.getPresetById(presetId);
        const detailText = preset
          ? (preset.scopeAll
            ? 'All non-story projects'
            : Object.keys(preset.projects).map(id => {
                const project = projectManager.projects[id];
                return project?.displayName || id;
              }).join(', '))
          : 'Select a preset';
        detail.textContent = detailText;
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
      controls.classList.add('project-automation-apply-controls', 'building-automation-apply-controls');
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
      projectsApplyList.appendChild(row);
    });
  }

  projectsAddApplyButton.disabled = presets.length === 0;
  projectsApplyHint.textContent = presets.length === 0
    ? 'Save a preset above to enable the Apply list.'
    : 'Lower presets override higher presets when they target the same project and setting.';
}

function attachProjectsAutomationHandlers() {
  const {
    projectsBuilderPresetSelect,
    projectsBuilderPresetNameInput,
    projectsBuilderNewButton,
    projectsBuilderSaveButton,
    projectsBuilderDeleteButton,
    projectsBuilderScopeSelect,
    projectsBuilderCategorySelect,
    projectsBuilderProjectSelect,
    projectsBuilderAddButton,
    projectsBuilderApplyOnceButton,
    projectsBuilderAddCategoryButton,
    projectsBuilderClearButton,
    projectsApplyCombinationButton,
    projectsApplyNextTravelSelect,
    projectsApplyNextTravelPersistToggle,
    projectsCombinationSelect,
    projectsCombinationNameInput,
    projectsCombinationNewButton,
    projectsCombinationSaveButton,
    projectsCombinationDeleteButton,
    projectsAddApplyButton
  } = automationElements;

  projectsBuilderPresetSelect.addEventListener('change', (event) => {
    projectAutomationUIState.builderPresetId = event.target.value || null;
    projectAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderPresetNameInput.addEventListener('input', (event) => {
    const presetId = projectAutomationUIState.builderPresetId;
    if (!presetId) {
      projectAutomationUIState.builderName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const preset = automationManager.projectsAutomation.getPresetById(Number(presetId));
    if (!preset) {
      return;
    }
    automationManager.projectsAutomation.renamePreset(preset.id, event.target.value || '');
  });

  projectsBuilderNewButton.addEventListener('click', () => {
    projectAutomationUIState.builderPresetId = null;
    projectAutomationUIState.syncedPresetId = null;
    projectAutomationUIState.builderName = '';
    projectAutomationUIState.builderScope = 'all';
    projectAutomationUIState.builderSelectedProjects = [];
    projectAutomationUIState.builderCategoryValue = 'all';
    projectAutomationUIState.builderProjectValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderScopeSelect.addEventListener('change', (event) => {
    projectAutomationUIState.builderScope = event.target.value;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderCategorySelect.addEventListener('change', () => {
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderProjectSelect.addEventListener('change', () => {
    projectAutomationUIState.builderProjectValue = projectsBuilderProjectSelect.value || '';
  });

  projectsBuilderAddButton.addEventListener('click', () => {
    const projectId = projectsBuilderProjectSelect.value;
    if (!projectId) {
      return;
    }
    projectAutomationUIState.builderCategoryValue = projectsBuilderCategorySelect.value || 'all';
    projectAutomationUIState.builderProjectValue = projectId;
    if (!projectAutomationUIState.builderSelectedProjects.includes(projectId)) {
      projectAutomationUIState.builderSelectedProjects.push(projectId);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderAddCategoryButton.addEventListener('click', () => {
    const selectedCategory = projectsBuilderCategorySelect.value || 'all';
    const projects = getAutomatableProjects();
    const additions = projects.filter(project => (
      selectedCategory === 'all' || (project.category || 'general') === selectedCategory
    ));
    if (!additions.length) {
      return;
    }
    additions.forEach(project => {
      if (!projectAutomationUIState.builderSelectedProjects.includes(project.name)) {
        projectAutomationUIState.builderSelectedProjects.push(project.name);
      }
    });
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderClearButton.addEventListener('click', () => {
    projectAutomationUIState.builderSelectedProjects = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderSaveButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const name = projectsBuilderPresetNameInput.value || projectAutomationUIState.builderName || '';
    const scopeAll = projectAutomationUIState.builderScope === 'all';
    const projectIds = scopeAll
      ? getAutomatableProjects().map(project => project.name)
      : projectAutomationUIState.builderSelectedProjects.slice();
    const presetId = projectAutomationUIState.builderPresetId;
    if (presetId) {
      automation.updatePreset(Number(presetId), name, projectIds, { scopeAll });
    } else {
      const newId = automation.addPreset(name, projectIds, { scopeAll });
      projectAutomationUIState.builderPresetId = String(newId);
      projectAutomationUIState.syncedPresetId = null;
      projectAutomationUIState.builderName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderDeleteButton.addEventListener('click', () => {
    const presetId = projectAutomationUIState.builderPresetId;
    if (!presetId) {
      return;
    }
    automationManager.projectsAutomation.deletePreset(Number(presetId));
    projectAutomationUIState.builderPresetId = null;
    projectAutomationUIState.syncedPresetId = null;
    projectAutomationUIState.builderName = '';
    projectAutomationUIState.builderSelectedProjects = [];
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsBuilderApplyOnceButton.addEventListener('click', () => {
    const presetId = Number(projectsBuilderPresetSelect.value);
    automationManager.projectsAutomation.applyPresetOnce(presetId);
  });

  projectsApplyCombinationButton.addEventListener('click', () => {
    automationManager.projectsAutomation.applyPresets();
  });

  projectsApplyNextTravelSelect.addEventListener('change', (event) => {
    const comboId = event.target.value;
    automationManager.projectsAutomation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automationManager.projectsAutomation.nextTravelCombinationPersistent = automationManager.projectsAutomation.nextTravelCombinationPersistent
      && !!automationManager.projectsAutomation.nextTravelCombinationId;
    projectsApplyNextTravelPersistToggle.checked = automationManager.projectsAutomation.nextTravelCombinationPersistent;
    projectsApplyNextTravelPersistToggle.disabled = !automationManager.projectsAutomation.nextTravelCombinationId;
  });

  projectsApplyNextTravelPersistToggle.addEventListener('change', (event) => {
    automationManager.projectsAutomation.nextTravelCombinationPersistent = event.target.checked
      && !!automationManager.projectsAutomation.nextTravelCombinationId;
  });

  projectsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    projectAutomationUIState.combinationId = comboId;
    projectAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.projectsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationNameInput.addEventListener('input', (event) => {
    const comboId = projectAutomationUIState.combinationId;
    if (!comboId) {
      projectAutomationUIState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    const combo = automationManager.projectsAutomation.getCombinationById(Number(comboId));
    combo.name = event.target.value || '';
  });

  projectsCombinationNewButton.addEventListener('click', () => {
    projectAutomationUIState.combinationId = null;
    projectAutomationUIState.combinationSyncedId = null;
    projectAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationSaveButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const name = projectsCombinationNameInput.value || projectAutomationUIState.combinationName || '';
    const snapshot = automation.getAssignments().map(entry => ({
      presetId: entry.presetId,
      enabled: entry.enabled !== false
    }));
    const comboId = projectAutomationUIState.combinationId;
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
    } else {
      const newId = automation.addCombination(name, snapshot);
      projectAutomationUIState.combinationId = String(newId);
      projectAutomationUIState.combinationSyncedId = null;
      projectAutomationUIState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsCombinationDeleteButton.addEventListener('click', () => {
    const comboId = projectAutomationUIState.combinationId;
    if (!comboId) {
      return;
    }
    automationManager.projectsAutomation.deleteCombination(Number(comboId));
    projectAutomationUIState.combinationId = null;
    projectAutomationUIState.combinationSyncedId = null;
    projectAutomationUIState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  projectsAddApplyButton.addEventListener('click', () => {
    const automation = automationManager.projectsAutomation;
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getAutomatableProjects() {
  const projects = [];
  const seen = {};
  const order = Array.isArray(projectManager.projectOrder)
    ? projectManager.projectOrder
    : Object.keys(projectManager.projects || {});

  order.forEach((projectId) => {
    const project = projectManager.projects[projectId];
    if (!project || project.category === 'story') {
      return;
    }
    seen[project.name] = true;
    projects.push(project);
  });

  for (const projectId in projectManager.projects) {
    const project = projectManager.projects[projectId];
    if (!project || project.category === 'story' || seen[project.name]) {
      continue;
    }
    seen[project.name] = true;
    projects.push(project);
  }

  return projects;
}

function getProjectAutomationCategories(projects) {
  const categorySet = new Set();
  projects.forEach(project => {
    categorySet.add(project.category || 'general');
  });
  return Array.from(categorySet);
}
