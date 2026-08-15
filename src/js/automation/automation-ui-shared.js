const automationUIManagerIds = new WeakMap();
let nextAutomationUIManagerId = 1;

function getAutomationUIManagerId(automation) {
  let id = automationUIManagerIds.get(automation);
  if (!id) {
    id = nextAutomationUIManagerId++;
    automationUIManagerIds.set(automation, id);
  }
  return id;
}

function getAutomationAutoBuildBasisOptions(structure, currentValue) {
  const options = [];
  const seen = new Set();
  const addOption = (value, label) => {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    options.push({ value, label });
  };

  if (structure) {
    if (structure.autoBuildFillEnabled) {
      addOption('fill', getStructuresUIText('ui.structures.autoBuild.basis.fill', '% filled'));
    }
    addOption('population', getStructuresUIText('ui.structures.autoBuild.basis.population', '% of pop'));
    addOption('workers', getStructuresUIText('ui.structures.autoBuild.basis.workers', '% of workers'));
    if (structure.requiresWorker > 0 || structure.autoBuildWorkerShareOption) {
      addOption('workerShare', getStructuresUIText('ui.structures.autoBuild.basis.workerShare', '% worker share'));
    }
    if (structure.requiresLand > 0) {
      addOption('landShare', getStructuresUIText('ui.structures.autoBuild.basis.landShare', '% land share'));
    }
    addOption('geometricLand', getStructuresUIText('ui.structures.autoBuild.basis.geometricLand', '% geometric land'));
    addOption('fixed', getStructuresUIText('ui.structures.autoBuild.basis.fixed', 'Fixed'));
    addOption('building:storageDepot', getStructuresUIText('ui.structures.autoBuild.basis.storageDepots', '% of Storage Depots'));

    if (Array.isArray(structure.automationBuildingsDropDown)) {
      for (let index = 0; index < structure.automationBuildingsDropDown.length; index += 1) {
        const buildingId = structure.automationBuildingsDropDown[index];
        const basisValue = `building:${buildingId}`;
        const displayName = (buildings[buildingId] && buildings[buildingId].displayName) || buildingId;
        addOption(
          basisValue,
          getStructuresUIText('ui.structures.autoBuild.basis.percentOf', '% of {name}', { name: displayName })
        );
      }
    }

    if (Array.isArray(structure.automationCustomBasisOptions)) {
      for (let index = 0; index < structure.automationCustomBasisOptions.length; index += 1) {
        const optionData = structure.automationCustomBasisOptions[index];
        addOption(optionData.value, optionData.label);
      }
    }

    if (structure.autoBuildMaxOption) {
      addOption(
        'max',
        structure.getAutoBuildMaxModeLabel
          ? structure.getAutoBuildMaxModeLabel()
          : getStructuresUIText('ui.common.max', 'Max')
      );
    }
  }

  if (currentValue && !seen.has(currentValue)) {
    addOption(currentValue, currentValue);
  }

  return options;
}

function getDefaultAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getDefaultAutomationCombinationLabel(combination) {
  return combination.name || getAutomationCardText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function getAutomationCombinationAssignmentSnapshot(automation) {
  return automation.getAssignments().map((entry) => ({
    presetId: entry.presetId,
    enabled: entry.enabled !== false
  }));
}

function areAutomationCombinationAssignmentsEqual(leftAssignments, rightAssignments) {
  const left = Array.isArray(leftAssignments) ? leftAssignments : [];
  const right = Array.isArray(rightAssignments) ? rightAssignments : [];
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].presetId !== right[index].presetId
      || (left[index].enabled !== false) !== (right[index].enabled !== false)) {
      return false;
    }
  }
  return true;
}

function isAutomationCombinationDirty(automation, uiState, activeCombination) {
  if (!activeCombination) {
    return uiState.combinationName !== ''
      || uiState.combinationShowInSidebar === false
      || automation.getAssignments().length > 0;
  }
  return uiState.combinationName !== activeCombination.name
    || (uiState.combinationShowInSidebar !== false) !== (activeCombination.showInSidebar !== false)
    || !areAutomationCombinationAssignmentsEqual(
      getAutomationCombinationAssignmentSnapshot(automation),
      activeCombination.assignments
    );
}

function syncAutomationSelectOptions(select, options, selectedValue) {
  const selectedString = selectedValue !== undefined ? String(selectedValue) : null;
  const optionSignature = options.map(optionData => [
    String(optionData.value),
    optionData.label,
    optionData.disabled ? '1' : '0',
    optionData.hidden ? '1' : '0'
  ].join('|')).join('\u001f');
  if (select._automationOptionsSignature === optionSignature
    && select._automationOptionsRenderedCount === select.options.length
    && (selectedString === null || select.value === selectedString)) {
    return;
  }

  const existingOptions = Array.from(select.options);
  const available = new Map();
  const desiredValues = new Set(options.map(optionData => String(optionData.value)));
  existingOptions.forEach((option) => {
    if (!available.has(option.value)) {
      available.set(option.value, []);
    }
    available.get(option.value).push(option);
  });

  const usedOptions = new Set();
  options.forEach((optionData) => {
    const value = String(optionData.value);
    const matching = available.get(value);
    const option = matching && matching.length > 0
      ? matching.shift()
      : document.createElement('option');
    usedOptions.add(option);
    const targetNode = select.options[usedOptions.size - 1] || null;
    if (option.parentNode !== select) {
      select.insertBefore(option, targetNode);
    } else if (option !== targetNode) {
      select.insertBefore(option, targetNode);
    }
    if (option.textContent !== optionData.label) {
      option.textContent = optionData.label;
    }
    if (option.value !== value || option.getAttribute('value') !== value) {
      option.value = value;
    }
    const disabled = !!optionData.disabled;
    const hidden = !!optionData.hidden;
    if (option.disabled !== disabled) {
      option.disabled = disabled;
    }
    if (option.hidden !== hidden) {
      option.hidden = hidden;
    }
  });

  existingOptions.forEach((option) => {
    if (!usedOptions.has(option)) {
      if (option.parentNode !== select) {
        return;
      }
      if (desiredValues.has(option.value) || selectedString === null || option.value !== selectedString) {
        select.removeChild(option);
        return;
      }
      option.disabled = true;
      option.hidden = true;
    }
  });

  select._automationOptionsSignature = optionSignature;
  select._automationOptionsRenderedCount = select.options.length;
  if (selectedString !== null) {
    select.value = selectedString;
  }
}

function getAutomationApplyPresetOptions(presets) {
  if (presets.length) {
    return presets.map(preset => ({
      value: preset.id,
      label: getDefaultAutomationPresetLabel(preset)
    }));
  }
  return [{
    value: '',
    label: getAutomationCardText('noPresetsSaved', {}, 'No presets saved'),
    disabled: true
  }];
}

function createAutomationApplyAssignmentRow(config) {
  const row = document.createElement('div');
  (config.rowClasses || []).forEach(className => row.classList.add(className));
  row._automationGetter = config.getAutomation;

  const primary = document.createElement('div');
  (config.primaryClasses || []).forEach(className => primary.classList.add(className));
  const toggle = createToggleButton({
    onLabel: getAutomationCardText('applyOn', {}, 'Apply On'),
    offLabel: getAutomationCardText('applyOff', {}, 'Apply Off'),
    isOn: false
  });
  (config.toggleClasses || []).forEach(className => toggle.classList.add(className));
  toggle.addEventListener('click', () => {
    const currentAutomation = row._automationGetter();
    const assignmentId = Number(row.dataset.assignmentId);
    const assignment = currentAutomation.getAssignments().find(entry => entry.id === assignmentId);
    if (!assignment) {
      return;
    }
    currentAutomation.setAssignmentEnabled(assignment.id, !assignment.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  const select = document.createElement('select');
  select.addEventListener('change', (event) => {
    const currentAutomation = row._automationGetter();
    const assignmentId = Number(row.dataset.assignmentId);
    const presetId = Number(event.target.value);
    currentAutomation.setAssignmentPreset(assignmentId, presetId);
    const detailText = row._automationApplyDetailText(currentAutomation, presetId);
    if (row._automationApplyRefs.detail.textContent !== detailText) {
      row._automationApplyRefs.detail.textContent = detailText;
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  const detail = document.createElement('span');
  (config.detailClasses || []).forEach(className => detail.classList.add(className));
  const controls = document.createElement('div');
  (config.controlsClasses || []).forEach(className => controls.classList.add(className));
  const moveUp = document.createElement('button');
  moveUp.textContent = '↑';
  moveUp.title = getAutomationCardText('moveApplyUp', {}, 'Move up');
  moveUp.addEventListener('click', () => {
    row._automationGetter().moveAssignment(Number(row.dataset.assignmentId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const moveDown = document.createElement('button');
  moveDown.textContent = '↓';
  moveDown.title = getAutomationCardText('moveApplyDown', {}, 'Move down');
  moveDown.addEventListener('click', () => {
    row._automationGetter().moveAssignment(Number(row.dataset.assignmentId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  const remove = document.createElement('button');
  remove.textContent = '✕';
  remove.title = getAutomationCardText('removePresetFromApply', {}, 'Remove preset');
  remove.addEventListener('click', () => {
    row._automationGetter().removeAssignment(Number(row.dataset.assignmentId));
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  controls.append(moveUp, moveDown, remove);
  primary.append(toggle, select);
  row.append(primary, detail, controls);
  row._automationApplyRefs = { toggle, select, detail, moveUp, moveDown };
  return row;
}

function syncAutomationApplyAssignmentRows(config = {}) {
  const container = config.container;
  const automation = config.automation;
  const presets = config.presets;
  const assignments = config.assignments;
  const presetOptions = getAutomationApplyPresetOptions(presets);
  container._applyRows ||= new Map();

  const prepareSpareRow = (row) => {
    const refs = row._automationApplyRefs;
    if (row.dataset.assignmentId !== '') {
      row.dataset.assignmentId = '';
    }
    if (row.style.display !== 'none') {
      row.style.display = 'none';
    }
    setToggleButtonState(refs.toggle, false);
    syncAutomationSelectOptions(refs.select, presetOptions, presets.length ? presets[0].id : '');
    if (refs.detail.textContent !== '') {
      refs.detail.textContent = '';
    }
    if (!refs.moveUp.disabled) {
      refs.moveUp.disabled = true;
    }
    if (!refs.moveDown.disabled) {
      refs.moveDown.disabled = true;
    }
  };

  const activeIds = new Set(assignments.map(assignment => assignment.id));
  container._applyRows.forEach((row, assignmentId) => {
    row._automationGetter = config.getAutomation;
    row._automationApplyDetailText = config.getDetailText;
    if (activeIds.has(assignmentId)) {
      return;
    }
    if (String(assignmentId).indexOf('spare-') === 0) {
      container._applyRows.delete(assignmentId);
      if (row.parentNode === container) {
        container.removeChild(row);
      }
      return;
    }
    prepareSpareRow(row);
  });

  assignments.forEach((assignment, index) => {
    let row = container._applyRows.get(assignment.id);
    if (!row) {
      let reusableKey = null;
      container._applyRows.forEach((candidate, key) => {
        if (reusableKey === null && candidate.style.display === 'none') {
          reusableKey = key;
          row = candidate;
        }
      });
      if (row) {
        container._applyRows.delete(reusableKey);
      } else {
        row = createAutomationApplyAssignmentRow(config);
      }
      container._applyRows.set(assignment.id, row);
    }

    row._automationGetter = config.getAutomation;
    row._automationApplyDetailText = config.getDetailText;
    const refs = row._automationApplyRefs;
    const assignmentId = String(assignment.id);
    if (row.dataset.assignmentId !== assignmentId) {
      row.dataset.assignmentId = assignmentId;
    }
    if (row.style.display !== '') {
      row.style.display = '';
    }
    setToggleButtonState(refs.toggle, assignment.enabled);
    if (document.activeElement !== refs.select) {
      syncAutomationSelectOptions(
        refs.select,
        presetOptions,
        presets.length ? assignment.presetId : ''
      );
    }
    const detailText = config.getDetailText(automation, assignment.presetId);
    if (refs.detail.textContent !== detailText) {
      refs.detail.textContent = detailText;
    }
    const moveUpDisabled = index === 0;
    const moveDownDisabled = index === assignments.length - 1;
    if (refs.moveUp.disabled !== moveUpDisabled) {
      refs.moveUp.disabled = moveUpDisabled;
    }
    if (refs.moveDown.disabled !== moveDownDisabled) {
      refs.moveDown.disabled = moveDownDisabled;
    }
    if (container.children[index] !== row) {
      container.insertBefore(row, container.children[index] || null);
    }
  });
}

function createAutomationTargetPresetController(config) {
  const state = config.uiState;
  const refs = config.refs;
  let presetSignature = '';
  let syncedAutomationId = 0;

  const refresh = () => {
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const controller = {};

  controller.syncPresetSelection = (presets) => {
    const automation = config.getAutomation();
    const automationId = getAutomationUIManagerId(automation);
    const selectedPresetId = automation.getSelectedPresetId();
    const nextPresetSignature = `${selectedPresetId || ''}|${presets.map((preset) => `${preset.id}:${preset.name || ''}`).join('|')}`;
    if (document.activeElement !== refs.presetSelect && nextPresetSignature !== presetSignature) {
      syncAutomationSelectOptions(
        refs.presetSelect,
        presets.map(preset => ({
          value: preset.id,
          label: getDefaultAutomationPresetLabel(preset)
        })),
        selectedPresetId || ''
      );
      if (!selectedPresetId) {
        refs.presetSelect.selectedIndex = -1;
      }
      presetSignature = nextPresetSignature;
    }

    const activePreset = selectedPresetId
      ? automation.getPresetById(Number(selectedPresetId))
      : null;
    const activePresetIndex = activePreset
      ? presets.findIndex(preset => preset.id === activePreset.id)
      : -1;
    if (activePreset && (state.syncedPresetId !== selectedPresetId || syncedAutomationId !== automationId)) {
      const targetIds = Object.keys(activePreset[config.collectionKey]);
      state.builderScope = activePreset.scopeAll ? 'all' : 'manual';
      state.builderPresetMode = automation.getPresetModeValue(activePreset.presetMode);
      state[config.selectedIdsKey] = targetIds.slice();
      state.builderType = config.getPresetType(activePreset);
      state.builderShowInSidebar = activePreset.showInSidebar !== false;
      state[config.filterIdKey] = '';
      if (config.onPresetSynced) {
        config.onPresetSynced({ automation, activePreset, targetIds, state });
      }
      state.syncedPresetId = selectedPresetId;
      syncedAutomationId = automationId;
    }
    if (!activePreset && state.syncedPresetId) {
      state.syncedPresetId = null;
      state[config.filterIdKey] = '';
      syncedAutomationId = automationId;
    }

    const savedTargetIds = activePreset ? Object.keys(activePreset[config.collectionKey]) : [];
    if (state[config.filterIdKey] && savedTargetIds.indexOf(state[config.filterIdKey]) < 0) {
      state[config.filterIdKey] = '';
    }

    return {
      automation,
      presets,
      activePresetId: selectedPresetId,
      activePreset,
      activePresetIndex,
      savedTargetIds,
      showPresetMode: config.isPresetModeAvailable()
    };
  };

  controller.syncControls = (context) => {
    const {
      automation,
      presets,
      activePreset,
      activePresetIndex,
      showPresetMode
    } = context;
    const targetName = activePreset ? activePreset.name || '' : state.builderName;
    if (document.activeElement !== refs.presetNameInput && refs.presetNameInput.value !== targetName) {
      refs.presetNameInput.value = targetName;
    }

    const showInSidebar = activePreset
      ? activePreset.showInSidebar !== false
      : state.builderShowInSidebar;
    if (refs.showInSidebarCheckbox.checked !== showInSidebar) {
      refs.showInSidebarCheckbox.checked = showInSidebar;
    }
    if (document.activeElement !== refs.typeSelect && refs.typeSelect.value !== state.builderType) {
      refs.typeSelect.value = state.builderType;
    }
    if (document.activeElement !== refs.scopeSelect && refs.scopeSelect.value !== state.builderScope) {
      refs.scopeSelect.value = state.builderScope;
    }

    const presetModeDisplay = showPresetMode ? '' : 'none';
    if (refs.presetModeSelect.style.display !== presetModeDisplay) {
      refs.presetModeSelect.style.display = presetModeDisplay;
    }
    if (!showPresetMode) {
      state.builderPresetMode = 'regular';
    }
    if (document.activeElement !== refs.presetModeSelect
      && refs.presetModeSelect.value !== state.builderPresetMode) {
      refs.presetModeSelect.value = state.builderPresetMode;
    }

    const invalidMessage = (activePreset && showPresetMode
      ? automation.getParameterizedPresetInvalidMessage(activePreset)
      : state.builderPresetModeInvalidMessage) || '';
    if (refs.presetModeMessage.textContent !== invalidMessage) {
      refs.presetModeMessage.textContent = invalidMessage;
    }
    const invalidMessageDisplay = invalidMessage ? '' : 'none';
    if (refs.presetModeMessage.style.display !== invalidMessageDisplay) {
      refs.presetModeMessage.style.display = invalidMessageDisplay;
    }

    const showManual = state.builderScope === 'manual';
    const pickerDisplay = showManual ? 'flex' : 'none';
    const simpleDisplay = showManual ? '' : 'none';
    if (refs.categorySelect.parentElement.style.display !== pickerDisplay) {
      refs.categorySelect.parentElement.style.display = pickerDisplay;
    }
    if (refs.selectedList.style.display !== pickerDisplay) {
      refs.selectedList.style.display = pickerDisplay;
    }
    if (refs.clearButton.style.display !== simpleDisplay) {
      refs.clearButton.style.display = simpleDisplay;
    }
    if (refs.addCategoryButton.style.display !== simpleDisplay) {
      refs.addCategoryButton.style.display = simpleDisplay;
    }

    const hasActivePreset = !!activePreset;
    if (refs.deleteButton.disabled !== !hasActivePreset) {
      refs.deleteButton.disabled = !hasActivePreset;
    }
    if (refs.duplicateButton.disabled !== !hasActivePreset) {
      refs.duplicateButton.disabled = !hasActivePreset;
    }
    if (refs.importButton.disabled) {
      refs.importButton.disabled = false;
    }
    if (refs.exportButton.disabled !== !hasActivePreset) {
      refs.exportButton.disabled = !hasActivePreset;
    }
    if (refs.applyOnceButton.disabled !== !hasActivePreset) {
      refs.applyOnceButton.disabled = !hasActivePreset;
    }
    const moveUpDisabled = activePresetIndex <= 0;
    const moveDownDisabled = activePresetIndex < 0 || activePresetIndex >= presets.length - 1;
    if (refs.moveUpButton.disabled !== moveUpDisabled) {
      refs.moveUpButton.disabled = moveUpDisabled;
    }
    if (refs.moveDownButton.disabled !== moveDownDisabled) {
      refs.moveDownButton.disabled = moveDownDisabled;
    }
    const assignmentsEmpty = automation.getAssignments().length === 0;
    if (refs.applyCombinationButton.disabled !== assignmentsEmpty) {
      refs.applyCombinationButton.disabled = assignmentsEmpty;
    }
    if (refs.combinationSaveButton.disabled !== assignmentsEmpty) {
      refs.combinationSaveButton.disabled = assignmentsEmpty;
    }
  };

  controller.syncSelection = (context) => {
    const { automation, activePreset, showPresetMode } = context;
    const selectedTargetIds = state[config.selectedIdsKey];
    const selectedList = refs.selectedList;
    const selectedHasFocus = selectedList.contains(document.activeElement)
      && document.activeElement.tagName === 'INPUT';

    if (!selectedHasFocus) {
      if (!selectedList._automationPresetPills) {
        selectedList._automationPresetPills = new Map();
        selectedList._automationEmptySelection = document.createElement('span');
        selectedList._automationEmptySelection.classList.add('automation-empty-selection');
      }
      const pillMap = selectedList._automationPresetPills;
      const activeTargetIds = new Set(selectedTargetIds);
      pillMap.forEach((pill, targetId) => {
        if (activeTargetIds.has(targetId)) {
          return;
        }
        pillMap.delete(targetId);
        if (pill.parentNode === selectedList) {
          selectedList.removeChild(pill);
        }
      });

      const emptyState = selectedList._automationEmptySelection;
      if (selectedTargetIds.length === 0) {
        const emptyText = getAutomationCardText('nothingSelected', {}, 'Nothing selected');
        if (emptyState.textContent !== emptyText) {
          emptyState.textContent = emptyText;
        }
        if (emptyState.parentNode !== selectedList) {
          selectedList.appendChild(emptyState);
        }
      } else if (emptyState.parentNode === selectedList) {
        selectedList.removeChild(emptyState);
      }

      selectedTargetIds.forEach((targetId, index) => {
        let pill = pillMap.get(targetId);
        if (!pill) {
          pill = document.createElement('div');
          config.pillClasses.forEach(className => pill.classList.add(className));
          const label = document.createElement('span');
          label.style.cursor = 'pointer';
          label.addEventListener('click', () => {
            state[config.filterIdKey] = pill._automationTargetId;
            refresh();
          });
          const remove = document.createElement('button');
          remove.textContent = '\u2715';
          remove.addEventListener('click', (event) => {
            event.stopPropagation();
            const currentTargetId = pill._automationTargetId;
            state[config.selectedIdsKey] = state[config.selectedIdsKey].filter(id => id !== currentTargetId);
            const currentAutomation = config.getAutomation();
            const presetId = currentAutomation.getSelectedPresetId();
            if (presetId) {
              const preset = currentAutomation.getPresetById(Number(presetId));
              if (preset) {
                const normalizedTargetId = config.normalizeTargetId
                  ? config.normalizeTargetId(currentAutomation, currentTargetId)
                  : currentTargetId;
                delete preset[config.collectionKey][normalizedTargetId];
              }
            }
            refresh();
          });
          pill.append(label, remove);
          pill._automationPresetRefs = { label, remove };
          pillMap.set(targetId, pill);
        }

        pill._automationTargetId = targetId;
        const labelText = config.getTargetLabel(targetId, context);
        const labelTitle = getAutomationCardText('filterSelectionOption', {}, 'Filter selection');
        const removeTitle = config.getRemoveTitle();
        if (pill._automationPresetRefs.label.textContent !== labelText) {
          pill._automationPresetRefs.label.textContent = labelText;
        }
        if (pill._automationPresetRefs.label.title !== labelTitle) {
          pill._automationPresetRefs.label.title = labelTitle;
        }
        if (pill._automationPresetRefs.remove.title !== removeTitle) {
          pill._automationPresetRefs.remove.title = removeTitle;
        }
        if (selectedList.children[index] !== pill) {
          selectedList.insertBefore(pill, selectedList.children[index] || null);
        }
      });
    }

    const savedType = activePreset ? config.getPresetType(activePreset) : 'both';
    const savedScope = activePreset
      ? activePreset.scopeAll
        ? 'all'
        : 'manual'
      : 'all';
    const savedPresetMode = activePreset && showPresetMode
      ? automation.getPresetModeValue(activePreset.presetMode)
      : 'regular';
    const savedTargetIds = activePreset ? Object.keys(activePreset[config.collectionKey]) : [];
    const savedTargetSet = new Set(savedTargetIds);
    const selectionChanged = state.builderScope === 'manual'
      && (selectedTargetIds.length !== savedTargetIds.length
        || selectedTargetIds.some(id => !savedTargetSet.has(id)));
    const dirty = activePreset
      ? state.builderType !== savedType
        || (showPresetMode && state.builderPresetMode !== savedPresetMode)
        || state.builderScope !== savedScope
        || selectionChanged
      : state.builderName.trim() !== ''
        || state.builderType !== 'both'
        || (showPresetMode && state.builderPresetMode !== 'regular')
        || state.builderScope !== 'all'
        || selectedTargetIds.length > 0;
    const dirtyDisplay = dirty ? '' : 'none';
    if (refs.dirtyIndicator.style.display !== dirtyDisplay) {
      refs.dirtyIndicator.style.display = dirtyDisplay;
    }
  };

  controller.attachHandlers = () => {
    refs.presetSelect.addEventListener('change', (event) => {
      config.getAutomation().setSelectedPresetId(event.target.value || null);
      state.syncedPresetId = null;
      refresh();
    });
    refs.moveUpButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        return;
      }
      automation.movePreset(activePreset.id, -1);
      refresh();
    });
    refs.moveDownButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        return;
      }
      automation.movePreset(activePreset.id, 1);
      refresh();
    });
    refs.presetNameInput.addEventListener('input', (event) => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        state.builderName = event.target.value || '';
        refresh();
        return;
      }
      automation.renamePreset(activePreset.id, event.target.value || '');
      refresh();
    });
    refs.newButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const suggestedName = getAutomationCardText(
        'presetWithId',
        { id: automation.nextPresetId },
        `Preset ${automation.nextPresetId}`
      );
      const presetId = config.createEmptyPreset(automation, suggestedName);
      state.syncedPresetId = null;
      state.builderName = '';
      state.builderScope = 'manual';
      state.builderType = 'both';
      state.builderPresetMode = 'regular';
      state.builderShowInSidebar = true;
      state[config.selectedIdsKey] = [];
      state.builderCategoryValue = 'all';
      state[config.pickerValueKey] = '';
      if (config.resetExtraState) {
        config.resetExtraState(state);
      }
      if (presetId) {
        resetAutomationPresetJsonDetailsState(refs.presetJsonDetails, Number(presetId));
      }
      refresh();
    });
    refs.typeSelect.addEventListener('change', (event) => {
      state.builderType = event.target.value || 'both';
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (activePreset && config.presetTypeOptionKeys) {
        const request = config.getSaveRequest(automation, state);
        for (let index = 0; index < config.presetTypeOptionKeys.length; index += 1) {
          const optionKey = config.presetTypeOptionKeys[index];
          activePreset[optionKey] = request.options[optionKey];
        }
      }
      refresh();
    });
    refs.scopeSelect.addEventListener('change', (event) => {
      state.builderScope = event.target.value;
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (activePreset) {
        activePreset.scopeAll = state.builderScope === 'all';
      }
      refresh();
    });
    refs.presetModeSelect.addEventListener('change', (event) => {
      state.builderPresetMode = event.target.value === 'parameterized' ? 'parameterized' : 'regular';
      state.builderPresetModeInvalidMessage = '';
      if (state.builderPresetMode === 'parameterized' && state.builderScope === 'all') {
        state.builderScope = 'manual';
      }
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (activePreset) {
        activePreset.presetMode = state.builderPresetMode;
      }
      refresh();
    });
    refs.showInSidebarCheckbox.addEventListener('change', () => {
      state.builderShowInSidebar = refs.showInSidebarCheckbox.checked;
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (activePreset) {
        automation.setPresetShowInSidebar(activePreset.id, state.builderShowInSidebar);
      }
      refresh();
    });
    refs.saveButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const name = refs.presetNameInput.value || state.builderName || '';
      const presetId = automation.getSelectedPresetId();
      const request = config.getSaveRequest(automation, state);
      if (presetId) {
        resetAutomationPresetJsonDetailsState(refs.presetJsonDetails, Number(presetId));
      }
      const candidatePreset = automation.buildPreset(
        name,
        request.targetIds,
        request.options,
        presetId || automation.nextPresetId
      );
      if (automation.isParameterizedPreset(candidatePreset)
        && !automation.getPresetParameterInfo(candidatePreset).valid) {
        state.builderPresetModeInvalidMessage = automation.getParameterizedPresetInvalidMessage(candidatePreset);
        refresh();
        return;
      }
      if (presetId) {
        automation.updatePreset(Number(presetId), name, request.targetIds, request.options);
      } else {
        automation.addPreset(name, request.targetIds, request.options);
        state.syncedPresetId = null;
        state.builderName = '';
      }
      state.builderPresetModeInvalidMessage = '';
      refresh();
    });
    refs.duplicateButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        return;
      }
      automation.duplicatePreset(activePreset.id);
      state.builderName = '';
      refresh();
    });
    refs.deleteButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        return;
      }
      automation.deletePreset(activePreset.id);
      state.syncedPresetId = null;
      state.builderName = '';
      state[config.selectedIdsKey] = [];
      refresh();
    });
    refs.importButton.addEventListener('click', () => {
      openAutomationPresetImportDialog({
        title: config.getImportTitle(),
        description: getAutomationCardText(
          'importPresetDescription',
          {},
          'Paste an exported preset string below. Import adds it as a new preset.'
        ),
        onImport: (text) => {
          const parsed = parseAutomationPresetTransferPayload(text, config.transferType);
          if (!parsed.ok) {
            return parsed;
          }
          config.getAutomation().importPreset(parsed.preset);
          state.syncedPresetId = null;
          refresh();
          return { ok: true };
        }
      });
    });
    refs.exportButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (!activePreset) {
        return;
      }
      exportAutomationPresetToClipboard(
        config.transferType,
        automation.exportPreset(activePreset.id),
        refs.exportButton
      );
    });
    refs.applyOnceButton.addEventListener('click', () => {
      const automation = config.getAutomation();
      const activePreset = automation.getSelectedPreset();
      if (activePreset) {
        automation.applyPresetOnce(activePreset.id);
      }
    });
  };

  return controller;
}

function buildAutomationPresetBuilderRow(config = {}) {
  const row = document.createElement('div');
  (config.rowClasses || []).forEach(className => row.classList.add(className));

  const presetSelect = document.createElement('select');
  (config.selectClasses || []).forEach(className => presetSelect.classList.add(className));

  const presetMoveButtons = document.createElement('div');
  presetMoveButtons.classList.add('automation-order-buttons');
  const presetMoveUpButton = document.createElement('button');
  presetMoveUpButton.textContent = '↑';
  presetMoveUpButton.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  (config.moveUpButtonClasses || []).forEach(className => presetMoveUpButton.classList.add(className));
  const presetMoveDownButton = document.createElement('button');
  presetMoveDownButton.textContent = '↓';
  presetMoveDownButton.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  (config.moveDownButtonClasses || []).forEach(className => presetMoveDownButton.classList.add(className));
  presetMoveButtons.append(presetMoveUpButton, presetMoveDownButton);

  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  (config.nameInputClasses || []).forEach(className => presetNameInput.classList.add(className));

  const newButton = document.createElement('button');
  newButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  (config.newButtonClasses || []).forEach(className => newButton.classList.add(className));

  const saveButton = document.createElement('button');
  saveButton.textContent = getAutomationCardText('savePresetButton', {}, 'Save');
  (config.saveButtonClasses || []).forEach(className => saveButton.classList.add(className));

  const deleteButton = document.createElement('button');
  deleteButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  (config.deleteButtonClasses || []).forEach(className => deleteButton.classList.add(className));

  const duplicateButton = document.createElement('button');
  duplicateButton.textContent = getAutomationCardText('duplicatePresetButton', {}, 'Duplicate');
  (config.duplicateButtonClasses || []).forEach(className => duplicateButton.classList.add(className));

  const transferButtons = createAutomationPresetTransferButtons(config.transferKey || 'automation-preset');

  const applyOnceButton = document.createElement('button');
  applyOnceButton.textContent = getAutomationCardText('applyOnceNowButton', {}, 'Apply Once Now');
  (config.applyOnceButtonClasses || []).forEach(className => applyOnceButton.classList.add(className));

  const showSidebar = createAutomationShowInSidebarLabel(config.showSidebarKey || 'automation-preset');

  row.append(
    presetSelect,
    presetMoveButtons,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    duplicateButton,
    transferButtons.importButton,
    transferButtons.exportButton,
    applyOnceButton,
    showSidebar.label
  );

  return {
    row,
    presetSelect,
    presetMoveUpButton,
    presetMoveDownButton,
    presetNameInput,
    newButton,
    saveButton,
    deleteButton,
    duplicateButton,
    importButton: transferButtons.importButton,
    exportButton: transferButtons.exportButton,
    applyOnceButton,
    showInSidebarCheckbox: showSidebar.checkbox
  };
}

function buildAutomationCombinationApplySection(config = {}) {
  const section = document.createElement('div');
  (config.sectionClasses || []).forEach(className => section.classList.add(className));

  const header = document.createElement('div');
  (config.headerClasses || []).forEach(className => header.classList.add(className));
  const title = document.createElement('span');
  title.textContent = getAutomationCardText('presetCombinationTitle', {}, 'Preset Combination');
  header.append(title);
  section.appendChild(header);

  const nextTravelRow = document.createElement('div');
  (config.nextTravelRowClasses || []).forEach(className => nextTravelRow.classList.add(className));
  const nextTravelLabel = document.createElement('label');
  (config.nextTravelLabelClasses || []).forEach(className => nextTravelLabel.classList.add(className));
  const nextTravelText = document.createElement('span');
  nextTravelText.textContent = getAutomationCardText('combinationOnNextTravelLabel', {}, 'Combination on Next Travel');
  const nextTravelSelect = document.createElement('select');
  (config.nextTravelSelectClasses || []).forEach(className => nextTravelSelect.classList.add(className));
  const nextTravelPersistToggle = document.createElement('input');
  nextTravelPersistToggle.type = 'checkbox';
  (config.nextTravelPersistToggleClasses || []).forEach(className => nextTravelPersistToggle.classList.add(className));
  const nextTravelPersistText = document.createElement('span');
  nextTravelPersistText.textContent = getAutomationCardText('allFutureTravelsLabel', {}, 'All future travels');
  (config.nextTravelPersistTextClasses || []).forEach(className => nextTravelPersistText.classList.add(className));
  nextTravelLabel.append(
    nextTravelText,
    nextTravelSelect,
    nextTravelPersistToggle,
    nextTravelPersistText
  );
  nextTravelRow.append(nextTravelLabel);
  section.appendChild(nextTravelRow);

  const combinationRow = document.createElement('div');
  (config.rowClasses || []).forEach(className => combinationRow.classList.add(className));
  const applyCombinationButton = document.createElement('button');
  applyCombinationButton.textContent = getAutomationCardText('applyCombinationButton', {}, 'Apply Combination');
  (config.applyCombinationButtonClasses || []).forEach(className => applyCombinationButton.classList.add(className));
  const combinationSelect = document.createElement('select');
  (config.combinationSelectClasses || []).forEach(className => combinationSelect.classList.add(className));
  const combinationMoveButtons = document.createElement('div');
  combinationMoveButtons.classList.add('automation-order-buttons');
  const combinationMoveUpButton = document.createElement('button');
  combinationMoveUpButton.textContent = '↑';
  combinationMoveUpButton.title = getAutomationCardText('moveCombinationUp', {}, 'Move combination up');
  (config.combinationMoveUpButtonClasses || []).forEach(className => combinationMoveUpButton.classList.add(className));
  const combinationMoveDownButton = document.createElement('button');
  combinationMoveDownButton.textContent = '↓';
  combinationMoveDownButton.title = getAutomationCardText('moveCombinationDown', {}, 'Move combination down');
  (config.combinationMoveDownButtonClasses || []).forEach(className => combinationMoveDownButton.classList.add(className));
  combinationMoveButtons.append(combinationMoveUpButton, combinationMoveDownButton);
  const combinationNameInput = document.createElement('input');
  combinationNameInput.type = 'text';
  combinationNameInput.placeholder = getAutomationCardText('combinationNamePlaceholder', {}, 'Combination name');
  (config.combinationNameInputClasses || []).forEach(className => combinationNameInput.classList.add(className));
  const combinationNewButton = document.createElement('button');
  combinationNewButton.textContent = getAutomationCardText('newCombinationButton', {}, 'New');
  (config.combinationNewButtonClasses || []).forEach(className => combinationNewButton.classList.add(className));
  const combinationSaveButton = document.createElement('button');
  (config.combinationSaveButtonClasses || []).forEach(className => combinationSaveButton.classList.add(className));
  const combinationSaveText = document.createElement('span');
  combinationSaveText.textContent = getAutomationCardText('saveCombinationButton', {}, 'Save');
  const combinationDirtyIndicator = document.createElement('span');
  combinationDirtyIndicator.classList.add('automation-combination-dirty-indicator');
  combinationDirtyIndicator.textContent = '*';
  combinationDirtyIndicator.title = getAutomationCardText('combinationUnsavedChanges', {}, 'Pending unsaved changes');
  combinationDirtyIndicator.setAttribute('aria-label', getAutomationCardText('combinationUnsavedChanges', {}, 'Pending unsaved changes'));
  combinationDirtyIndicator.hidden = true;
  combinationSaveButton.append(combinationSaveText, combinationDirtyIndicator);
  const combinationDeleteButton = document.createElement('button');
  combinationDeleteButton.textContent = getAutomationCardText('deleteCombinationButton', {}, 'Delete');
  (config.combinationDeleteButtonClasses || []).forEach(className => combinationDeleteButton.classList.add(className));
  const combinationShowSidebar = createAutomationShowInSidebarLabel(config.combinationShowSidebarKey || 'automation-combination');
  combinationRow.append(
    combinationSelect,
    combinationMoveButtons,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDeleteButton,
    combinationShowSidebar.label,
    applyCombinationButton
  );
  section.appendChild(combinationRow);

  const combinationUsage = createAutomationPresetUsageLine();
  section.appendChild(combinationUsage);

  const applyList = document.createElement('div');
  (config.applyListClasses || []).forEach(className => applyList.classList.add(className));
  section.appendChild(applyList);

  const addApplyButton = document.createElement('button');
  addApplyButton.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  (config.addApplyButtonClasses || []).forEach(className => addApplyButton.classList.add(className));
  section.appendChild(addApplyButton);

  const applyHint = document.createElement('div');
  (config.applyHintClasses || []).forEach(className => applyHint.classList.add(className));
  section.appendChild(applyHint);

  return {
    section,
    applyCombinationButton,
    applyNextTravelSelect: nextTravelSelect,
    applyNextTravelPersistToggle: nextTravelPersistToggle,
    combinationSelect,
    combinationMoveUpButton,
    combinationMoveDownButton,
    combinationNameInput,
    combinationNewButton,
    combinationSaveButton,
    combinationDirtyIndicator,
    combinationDeleteButton,
    combinationShowInSidebarCheckbox: combinationShowSidebar.checkbox,
    combinationUsage,
    applyList,
    addApplyButton,
    applyHint
  };
}

function updateAutomationNextTravelCombinationControls(config = {}) {
  const automation = config.automation;
  const combinations = Array.isArray(config.combinations) ? config.combinations : [];
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!automation || !select || !persistToggle) {
    return;
  }

  const nextTravelComboId = automation.nextTravelCombinationId;
  const nextTravelCombo = nextTravelComboId ? automation.getCombinationById(nextTravelComboId) : null;
  if (nextTravelComboId && !nextTravelCombo) {
    automation.nextTravelCombinationId = null;
    automation.nextTravelCombinationPersistent = false;
  }
  automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent && !!automation.nextTravelCombinationId;

  const combinationOptions = [{ value: '', label: getAutomationCardText('noneOption', {}, 'None') }];
  combinations.forEach(combo => combinationOptions.push({
    value: combo.id,
    label: getDefaultAutomationCombinationLabel(combo)
  }));
  if (document.activeElement !== select) {
    syncAutomationSelectOptions(select, combinationOptions, automation.nextTravelCombinationId || '');
  }
  if (persistToggle.checked !== automation.nextTravelCombinationPersistent) {
    persistToggle.checked = automation.nextTravelCombinationPersistent;
  }
  const persistDisabled = !automation.nextTravelCombinationId;
  if (persistToggle.disabled !== persistDisabled) {
    persistToggle.disabled = persistDisabled;
  }
}

function updateAutomationCombinationControls(config = {}) {
  const automation = config.automation;
  const combinations = Array.isArray(config.combinations) ? config.combinations : [];
  const uiState = config.uiState;
  const select = config.selectElement;
  const nameInput = config.nameInputElement;
  const showCheckbox = config.showCheckboxElement;
  const moveUpButton = config.moveUpButtonElement;
  const moveDownButton = config.moveDownButtonElement;
  const deleteButton = config.deleteButtonElement;
  const dirtyIndicator = config.dirtyIndicatorElement;
  if (!automation || !uiState || !select || !nameInput || !showCheckbox || !moveUpButton || !moveDownButton || !deleteButton) {
    return null;
  }

  const combinationOptions = [{ value: '', label: getAutomationCardText('newCombinationOption', {}, 'New combination') }];
  combinations.forEach(combo => combinationOptions.push({
    value: combo.id,
    label: getDefaultAutomationCombinationLabel(combo)
  }));
  if (document.activeElement !== select) {
    syncAutomationSelectOptions(select, combinationOptions, automation.getSelectedCombinationId() || '');
  }

  const activeCombinationId = automation.getSelectedCombinationId();
  const activeCombination = activeCombinationId ? automation.getCombinationById(Number(activeCombinationId)) : null;
  const activeCombinationIndex = activeCombination
    ? combinations.findIndex((combo) => combo.id === activeCombination.id)
    : -1;
  const automationId = getAutomationUIManagerId(automation);
  const managerChanged = uiState.combinationSyncedAutomationId !== automationId;
  if (activeCombination && (uiState.combinationSyncedId !== activeCombinationId || managerChanged)) {
    uiState.combinationName = activeCombination.name;
    uiState.combinationShowInSidebar = activeCombination.showInSidebar !== false;
    uiState.combinationSyncedId = activeCombinationId;
  }
  if (!activeCombination && (uiState.combinationSyncedId || managerChanged)) {
    uiState.combinationSyncedId = null;
    if (managerChanged) {
      uiState.combinationName = '';
      uiState.combinationShowInSidebar = true;
    }
  }
  uiState.combinationSyncedAutomationId = automationId;

  if (document.activeElement !== nameInput && nameInput.value !== uiState.combinationName) {
    nameInput.value = uiState.combinationName;
  }
  if (showCheckbox.checked !== uiState.combinationShowInSidebar) {
    showCheckbox.checked = uiState.combinationShowInSidebar;
  }

  const isDirty = isAutomationCombinationDirty(automation, uiState, activeCombination);
  if (dirtyIndicator && dirtyIndicator.hidden === isDirty) {
    dirtyIndicator.hidden = !isDirty;
  }

  const deleteDisabled = !activeCombination;
  const moveUpDisabled = activeCombinationIndex <= 0;
  const moveDownDisabled = activeCombinationIndex < 0 || activeCombinationIndex >= combinations.length - 1;
  if (deleteButton.disabled !== deleteDisabled) {
    deleteButton.disabled = deleteDisabled;
  }
  if (moveUpButton.disabled !== moveUpDisabled) {
    moveUpButton.disabled = moveUpDisabled;
  }
  if (moveDownButton.disabled !== moveDownDisabled) {
    moveDownButton.disabled = moveDownDisabled;
  }

  return {
    activeCombinationId,
    activeCombination,
    activeCombinationIndex,
    isDirty
  };
}

function attachAutomationCombinationHandlers(config = {}) {
  const getAutomation = config.getAutomation;
  const uiState = config.uiState;
  if (!getAutomation || !uiState) {
    return;
  }

  const applyCombinationButton = config.applyCombinationButton;
  const nextTravelSelect = config.nextTravelSelect;
  const nextTravelPersistToggle = config.nextTravelPersistToggle;
  const combinationSelect = config.combinationSelect;
  const combinationMoveUpButton = config.combinationMoveUpButton;
  const combinationMoveDownButton = config.combinationMoveDownButton;
  const combinationNameInput = config.combinationNameInput;
  const combinationNewButton = config.combinationNewButton;
  const combinationShowInSidebarCheckbox = config.combinationShowInSidebarCheckbox;
  const combinationSaveButton = config.combinationSaveButton;
  const combinationDeleteButton = config.combinationDeleteButton;
  const addApplyButton = config.addApplyButton;

  applyCombinationButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    automation.applyCombinationPresets(comboId ? Number(comboId) : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  nextTravelSelect.addEventListener('change', (event) => {
    const automation = getAutomation();
    const comboId = event.target.value;
    automation.nextTravelCombinationId = comboId ? Number(comboId) : null;
    automation.nextTravelCombinationPersistent = automation.nextTravelCombinationPersistent
      && !!automation.nextTravelCombinationId;
    nextTravelPersistToggle.checked = automation.nextTravelCombinationPersistent;
    nextTravelPersistToggle.disabled = !automation.nextTravelCombinationId;
  });

  nextTravelPersistToggle.addEventListener('change', (event) => {
    const automation = getAutomation();
    automation.nextTravelCombinationPersistent = event.target.checked
      && !!automation.nextTravelCombinationId;
  });

  combinationSelect.addEventListener('change', (event) => {
    const automation = getAutomation();
    const comboId = event.target.value;
    uiState.combinationSyncedId = null;
    if (comboId) {
      automation.applyCombination(Number(comboId));
    } else {
      automation.setSelectedCombinationId(null);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationMoveUpButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.moveCombination(Number(comboId), -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationMoveDownButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.moveCombination(Number(comboId), 1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationNameInput.addEventListener('input', (event) => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      uiState.combinationName = event.target.value || '';
      queueAutomationUIRefresh();
      updateAutomationUI();
      return;
    }
    uiState.combinationName = event.target.value || '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationNewButton.addEventListener('click', () => {
    const automation = getAutomation();
    automation.setSelectedCombinationId(null);
    uiState.combinationSyncedId = null;
    uiState.combinationName = '';
    uiState.combinationShowInSidebar = true;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationShowInSidebarCheckbox.addEventListener('change', () => {
    const automation = getAutomation();
    uiState.combinationShowInSidebar = combinationShowInSidebarCheckbox.checked;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationSaveButton.addEventListener('click', () => {
    const automation = getAutomation();
    const name = combinationNameInput.value || uiState.combinationName || '';
    const snapshot = getAutomationCombinationAssignmentSnapshot(automation);
    const comboId = automation.getSelectedCombinationId();
    if (comboId) {
      automation.updateCombination(Number(comboId), name, snapshot);
      automation.setCombinationShowInSidebar(Number(comboId), uiState.combinationShowInSidebar);
      uiState.combinationSyncedId = null;
    } else {
      const newComboId = automation.addCombination(name, snapshot);
      automation.setCombinationShowInSidebar(newComboId, uiState.combinationShowInSidebar);
      uiState.combinationSyncedId = null;
      uiState.combinationName = '';
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  combinationDeleteButton.addEventListener('click', () => {
    const automation = getAutomation();
    const comboId = automation.getSelectedCombinationId();
    if (!comboId) {
      return;
    }
    automation.deleteCombination(Number(comboId));
    uiState.combinationSyncedId = null;
    uiState.combinationName = '';
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  addApplyButton.addEventListener('click', () => {
    const automation = getAutomation();
    const preset = automation.presets[0];
    automation.addAssignment(preset ? preset.id : null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function updateAutomationNextTravelPresetControls(config = {}) {
  const automation = config.automation;
  const presets = Array.isArray(config.presets) ? config.presets : [];
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!automation || !select || !persistToggle) {
    return;
  }

  const nextTravelPresetId = automation.nextTravelPresetId;
  const nextTravelPreset = nextTravelPresetId ? automation.getPresetById(nextTravelPresetId) : null;
  if (nextTravelPresetId && !nextTravelPreset) {
    automation.nextTravelPresetId = null;
    automation.nextTravelPersistent = false;
  }
  automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;

  if (document.activeElement !== select) {
    syncAutomationSelectOptions(
      select,
      [{ value: '', label: getAutomationCardText('noneOption', {}, 'None') }].concat(presets.map((preset) => ({
        value: preset.id,
        label: getDefaultAutomationPresetLabel(preset)
      }))),
      automation.nextTravelPresetId ? String(automation.nextTravelPresetId) : ''
    );
  }

  if (persistToggle.checked !== automation.nextTravelPersistent) {
    persistToggle.checked = automation.nextTravelPersistent;
  }
  const persistDisabled = !automation.nextTravelPresetId;
  if (persistToggle.disabled !== persistDisabled) {
    persistToggle.disabled = persistDisabled;
  }
}

function attachAutomationNextTravelPresetHandlers(config = {}) {
  const getAutomation = config.getAutomation;
  const select = config.selectElement;
  const persistToggle = config.persistToggleElement;
  if (!getAutomation || !select || !persistToggle) {
    return;
  }

  select.addEventListener('change', (event) => {
    const automation = getAutomation();
    const presetId = event.target.value;
    automation.nextTravelPresetId = presetId ? Number(presetId) : null;
    automation.nextTravelPersistent = automation.nextTravelPersistent && !!automation.nextTravelPresetId;
    persistToggle.checked = automation.nextTravelPersistent;
    persistToggle.disabled = !automation.nextTravelPresetId;
  });

  persistToggle.addEventListener('change', (event) => {
    const automation = getAutomation();
    automation.nextTravelPersistent = event.target.checked && !!automation.nextTravelPresetId;
  });
}
