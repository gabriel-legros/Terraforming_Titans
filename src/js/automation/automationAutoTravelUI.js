let autoTravelPresetSignature = '';
let autoTravelTypeOptionsSignature = '';
let autoTravelOrbitOptionsSignature = '';
let autoTravelDominionOptionsSignature = '';
let autoTravelScriptOptionsSignature = '';

function getAutoTravelAutomation() {
  return automationManager ? automationManager.autoTravelAutomation : null;
}

function getAutoTravelOptionText(path, fallback, vars) {
  return getAutomationCardText(`autoTravel.${path}`, vars, fallback);
}

function getFastestTerraformRecordText() {
  if (Number(fastestTerraformRealSeconds) > 0) {
    return `${Number(fastestTerraformRealSeconds).toFixed(2)}s`;
  }
  return getAutoTravelOptionText('noRecordYet', 'No record yet');
}

function getSkipEquilibrationTooltipText() {
  const recordText = getFastestTerraformRecordText();
  return getAutoTravelOptionText(
    'skipEquilibrationTooltip',
    'Available once your fastest-terraform record is below 60s.  Pausing and clever usage of galactic market and space storage can make this much easier.\nCurrent Fastest Terraform (real time): {value}.',
    { value: recordText }
  );
}

function buildAutoTravelSelect(parent, className, options) {
  const select = document.createElement('select');
  select.classList.add(className);
  for (let index = 0; index < options.length; index += 1) {
    const entry = options[index];
    const option = document.createElement('option');
    option.value = entry.value;
    option.textContent = entry.label;
    select.appendChild(option);
  }
  parent.appendChild(select);
  return select;
}

function buildAutoTravelUI() {
  const card = automationElements.autoTravel || document.getElementById('automation-auto-travel');
  if (!card) return;

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('autoTravelTitle', {}, 'Auto Travel'),
    () => {
      const automation = getAutoTravelAutomation();
      if (!automation) return;
      automation.setCollapsed(!automation.collapsed);
      queueAutomationUIRefresh();
    },
    'autoTravel'
  );

  const body = document.createElement('div');
  body.classList.add('automation-body', 'auto-travel-automation-body');
  card.appendChild(body);

  function createSection(titleText, extraClass = '') {
    const section = document.createElement('section');
    section.classList.add('auto-travel-section');
    if (extraClass) {
      section.classList.add(extraClass);
    }
    const title = document.createElement('h4');
    title.classList.add('auto-travel-section-title');
    title.textContent = titleText;
    section.appendChild(title);
    body.appendChild(section);
    return section;
  }

  const topControls = document.createElement('div');
  topControls.classList.add('script-automation-controls', 'auto-travel-top-controls');
  const toggle = createAutomationToggle(
    getAutoTravelOptionText('enabledOn', 'Auto Travel On'),
    getAutoTravelOptionText('enabledOff', 'Auto Travel Off')
  );
  toggle.classList.add('auto-travel-master-toggle');
  topControls.appendChild(toggle);
  body.appendChild(topControls);

  const presetSection = createSection(getAutoTravelOptionText('presetSection', 'Preset'), 'auto-travel-preset-section');
  const presetRow = document.createElement('div');
  presetRow.classList.add('script-automation-script-row', 'auto-travel-row', 'auto-travel-preset-row');
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('auto-travel-preset-select');
  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.classList.add('auto-travel-preset-name');
  presetNameInput.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetRow.append(presetSelect, presetNameInput);
  const transferButtons = document.createElement('div');
  transferButtons.classList.add('automation-preset-buttons');
  const newPresetButton = document.createElement('button');
  newPresetButton.classList.add('auto-travel-preset-new');
  newPresetButton.textContent = getAutomationCardText('newPresetButton', {}, 'New');
  const deletePresetButton = document.createElement('button');
  deletePresetButton.classList.add('auto-travel-preset-delete');
  deletePresetButton.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  const transfer = createAutomationPresetTransferButtons('auto-travel-preset');
  transferButtons.append(newPresetButton, deletePresetButton, transfer.importButton, transfer.exportButton);
  presetRow.appendChild(transferButtons);
  presetSection.appendChild(presetRow);

  const destinationSection = createSection(getAutoTravelOptionText('destinationSection', 'Destination'), 'auto-travel-destination-section');
  const selectionRow = document.createElement('div');
  selectionRow.classList.add('script-automation-script-row', 'auto-travel-row', 'auto-travel-selection-row');
  const targetSelect = buildAutoTravelSelect(selectionRow, 'auto-travel-target-select', [
    { value: 'random', label: getAutoTravelOptionText('target.random', 'Target: Random') },
    { value: 'storedArtificial', label: getAutoTravelOptionText('target.storedArtificial', 'Target: Stored Artificial World') },
    { value: 'planet', label: getAutoTravelOptionText('target.planet', 'Target: Planet') },
    { value: 'moon', label: getAutoTravelOptionText('target.moon', 'Target: Moon') }
  ]);
  const typeSelect = buildAutoTravelSelect(selectionRow, 'auto-travel-type-select', [{ value: 'random', label: getAutoTravelOptionText('type.random', 'Type: Random') }]);
  const orbitSelect = buildAutoTravelSelect(selectionRow, 'auto-travel-orbit-select', [{ value: 'random', label: getAutoTravelOptionText('orbit.random', 'Orbit: Random') }]);
  const dominionSelect = buildAutoTravelSelect(selectionRow, 'auto-travel-dominion-select', [{ value: 'random', label: getAutoTravelOptionText('dominion.random', 'Dominion: Random') }]);
  destinationSection.appendChild(selectionRow);

  const scriptAfterTravelRow = document.createElement('div');
  scriptAfterTravelRow.classList.add('auto-travel-script-after-travel-row');
  const scriptAfterTravelToggle = document.createElement('input');
  scriptAfterTravelToggle.type = 'checkbox';
  scriptAfterTravelToggle.classList.add('auto-travel-script-after-travel-toggle');
  const scriptAfterTravelText = document.createElement('span');
  scriptAfterTravelText.textContent = getAutoTravelOptionText('runScriptAfterTravel', 'Run following automation script after travel');
  const scriptAfterTravelSelect = document.createElement('select');
  scriptAfterTravelSelect.classList.add('auto-travel-script-after-travel-select');
  scriptAfterTravelRow.append(scriptAfterTravelToggle, scriptAfterTravelText, scriptAfterTravelSelect);
  destinationSection.appendChild(scriptAfterTravelRow);

  const hazardsSection = createSection(getAutoTravelOptionText('hazardsSection', 'Hazards'), 'auto-travel-hazards-section');
  const hazardsRow = document.createElement('div');
  hazardsRow.classList.add('auto-travel-hazards-row');
  const hazardsWrap = document.createElement('div');
  hazardsWrap.classList.add('auto-travel-hazards');
  hazardsRow.appendChild(hazardsWrap);
  hazardsSection.appendChild(hazardsRow);

  const behaviorSection = createSection(getAutoTravelOptionText('behaviorSection', 'Behavior'), 'auto-travel-behavior-section');
  const checkboxWrap = document.createElement('div');
  checkboxWrap.classList.add('auto-travel-checkboxes');
  behaviorSection.appendChild(checkboxWrap);

  function addCheckboxRow(key, labelText, parent = checkboxWrap) {
    const label = document.createElement('label');
    label.classList.add('auto-travel-checkbox-row');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.classList.add(`auto-travel-${key}`);
    const text = document.createElement('span');
    text.textContent = labelText;
    label.append(input, text);
    parent.appendChild(label);
    return input;
  }

  const autoCompleteToggle = addCheckboxRow('auto-complete', getAutoTravelOptionText('autoCompleteTerraforming', 'Automatically complete terraforming when possible'));
  const waitSpecializationToggle = addCheckboxRow('wait-specialization', getAutoTravelOptionText('waitForSpecialization', 'Wait on complete specialization'));
  const blockIfNoStoredToggle = addCheckboxRow('block-no-stored', getAutoTravelOptionText('blockIfNoStoredFromArtificial', "Don't travel out of current artificial world if none is stored"));
  const turnOffAfterTravelToggle = addCheckboxRow('turn-off-after-travel', getAutoTravelOptionText('turnOffAfterTravel', 'Turn off auto-travel after travel'));
  const skipEquilibrationToggle = addCheckboxRow('skip-equilibration', getAutoTravelOptionText('skipEquilibration', 'Skip equilibration'));
  if (skipEquilibrationToggle?.parentElement) {
    const skipLabelText = skipEquilibrationToggle.parentElement.querySelector('span');
    if (skipLabelText) {
      const skipInfoIcon = document.createElement('span');
      skipInfoIcon.className = 'info-tooltip-icon';
      skipInfoIcon.innerHTML = '&#9432;';
      skipLabelText.appendChild(document.createTextNode(' '));
      skipLabelText.appendChild(skipInfoIcon);
      automationElements.autoTravelSkipEquilibrationInfoTooltipContent = attachDynamicInfoTooltip(
        skipInfoIcon,
        getSkipEquilibrationTooltipText()
      );
    }
  }
  const skipVisualizerToggle = addCheckboxRow('skip-visualizer', getAutoTravelOptionText('skipVisualizer', 'Skip world visualizer initialization'));

  automationElements.autoTravelCollapseButton = header.collapse;
  automationElements.autoTravelPanelBody = body;
  automationElements.autoTravelMasterToggle = toggle;
  automationElements.autoTravelPresetSelect = presetSelect;
  automationElements.autoTravelPresetNameInput = presetNameInput;
  automationElements.autoTravelNewPresetButton = newPresetButton;
  automationElements.autoTravelDeletePresetButton = deletePresetButton;
  automationElements.autoTravelImportPresetButton = transfer.importButton;
  automationElements.autoTravelExportPresetButton = transfer.exportButton;
  automationElements.autoTravelTargetSelect = targetSelect;
  automationElements.autoTravelTypeSelect = typeSelect;
  automationElements.autoTravelOrbitSelect = orbitSelect;
  automationElements.autoTravelDominionSelect = dominionSelect;
  automationElements.autoTravelScriptAfterTravelToggle = scriptAfterTravelToggle;
  automationElements.autoTravelScriptAfterTravelSelect = scriptAfterTravelSelect;
  automationElements.autoTravelSelectionRow = selectionRow;
  automationElements.autoTravelHazardsSection = hazardsSection;
  automationElements.autoTravelHazardsWrap = hazardsWrap;
  automationElements.autoTravelAutoCompleteToggle = autoCompleteToggle;
  automationElements.autoTravelWaitSpecializationToggle = waitSpecializationToggle;
  automationElements.autoTravelBlockIfNoStoredToggle = blockIfNoStoredToggle;
  automationElements.autoTravelTurnOffAfterTravelToggle = turnOffAfterTravelToggle;
  automationElements.autoTravelSkipEquilibrationToggle = skipEquilibrationToggle;
  automationElements.autoTravelSkipVisualizerToggle = skipVisualizerToggle;

  wireAutoTravelEvents();
}

function wireAutoTravelEvents() {
  const els = automationElements;
  els.autoTravelMasterToggle.addEventListener('click', () => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    automation.setEnabled(!automation.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  els.autoTravelPresetSelect.addEventListener('change', (event) => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    automation.setSelectedPresetId(Number(event.target.value));
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  els.autoTravelPresetNameInput.addEventListener('input', (event) => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    automation.renameSelectedPreset(event.target.value);
    queueAutomationUIRefresh();
  });

  els.autoTravelNewPresetButton.addEventListener('click', () => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    automation.addPreset('');
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  els.autoTravelDeletePresetButton.addEventListener('click', () => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    const preset = automation.getSelectedPreset();
    if (!preset) return;
    automation.deletePreset(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  els.autoTravelExportPresetButton.addEventListener('click', () => {
    const automation = getAutoTravelAutomation();
    if (!automation) return;
    const preset = automation.getSelectedPreset();
    if (!preset) return;
    exportAutomationPresetToClipboard('autoTravel', automation.exportPreset(preset.id), els.autoTravelExportPresetButton);
  });

  els.autoTravelImportPresetButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importPresetTitle', {}, 'Import Preset'),
      description: getAutomationCardText(
        'importPresetDescription',
        {},
        'Paste an exported preset string below. Import adds it as a new preset.'
      ),
      onImport: (text) => {
        const parsed = parseAutomationPresetTransferPayload(text, 'autoTravel');
        if (!parsed.ok) {
          return parsed;
        }
        const automation = getAutoTravelAutomation();
        if (!automation) {
          return { ok: false, error: getAutomationCardText('importPresetFailed', {}, 'Could not import that preset.') };
        }
        automation.importPreset(parsed.preset);
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  function setPresetField(field, value) {
    const preset = getAutoTravelAutomation()?.getSelectedPreset();
    if (!preset) return;
    preset[field] = value;
    queueAutomationUIRefresh();
  }

  els.autoTravelTargetSelect.addEventListener('change', (event) => setPresetField('target', event.target.value));
  els.autoTravelTypeSelect.addEventListener('change', (event) => setPresetField('type', event.target.value));
  els.autoTravelOrbitSelect.addEventListener('change', (event) => setPresetField('orbitPreset', event.target.value));
  els.autoTravelDominionSelect.addEventListener('change', (event) => setPresetField('dominion', event.target.value));
  els.autoTravelScriptAfterTravelSelect.addEventListener('change', (event) => {
    const value = event.target.value;
    setPresetField('runScriptAfterTravelScriptId', value ? Number(value) : null);
  });

  function setPresetFlag(field, checked) {
    const preset = getAutoTravelAutomation()?.getSelectedPreset();
    if (!preset) return;
    preset[field] = !!checked;
    queueAutomationUIRefresh();
  }

  els.autoTravelAutoCompleteToggle.addEventListener('change', (event) => setPresetFlag('autoCompleteTerraforming', event.target.checked));
  els.autoTravelWaitSpecializationToggle.addEventListener('change', (event) => setPresetFlag('waitForSpecialization', event.target.checked));
  els.autoTravelBlockIfNoStoredToggle.addEventListener('change', (event) => setPresetFlag('blockIfNoStoredFromArtificial', event.target.checked));
  els.autoTravelTurnOffAfterTravelToggle.addEventListener('change', (event) => setPresetFlag('turnOffAfterTravel', event.target.checked));
  els.autoTravelSkipEquilibrationToggle.addEventListener('change', (event) => setPresetFlag('skipEquilibration', event.target.checked));
  els.autoTravelSkipVisualizerToggle.addEventListener('change', (event) => setPresetFlag('skipWorldVisualizerInitialization', event.target.checked));
  els.autoTravelScriptAfterTravelToggle.addEventListener('change', (event) => setPresetFlag('runScriptAfterTravelEnabled', event.target.checked));
}

function populateAutoTravelScriptOptions(select) {
  if (!select) return;
  const scriptAutomation = automationManager?.scriptAutomation;
  const scripts = scriptAutomation?.scripts || [];
  const options = [
    { value: '', label: getAutoTravelOptionText('runScriptAfterTravelNone', 'Select script') }
  ];
  for (let index = 0; index < scripts.length; index += 1) {
    const script = scripts[index];
    options.push({
      value: String(script.id),
      label: script.name || getAutomationCardText('presetWithId', { id: script.id }, `Script ${script.id}`)
    });
  }
  const signature = JSON.stringify(options);
  if (signature !== autoTravelScriptOptionsSignature && document.activeElement !== select) {
    select.innerHTML = '';
    for (let index = 0; index < options.length; index += 1) {
      const option = document.createElement('option');
      option.value = options[index].value;
      option.textContent = options[index].label;
      select.appendChild(option);
    }
    autoTravelScriptOptionsSignature = signature;
  }
}

function populateAutoTravelTypeOptions(select) {
  if (!select) return;
  const options = [{ value: 'random', label: getAutoTravelOptionText('type.random', 'Type: Random') }];
  const types = RWG_WORLD_TYPES ? Object.keys(RWG_WORLD_TYPES) : [];
  for (let index = 0; index < types.length; index += 1) {
    const typeId = types[index];
    const label = RWG_WORLD_TYPES[typeId]?.displayName || typeId;
    options.push({ value: typeId, label: getAutoTravelOptionText('type.named', '{name}', { name: label }) });
  }
  const signature = JSON.stringify(options);
  if (signature !== autoTravelTypeOptionsSignature && document.activeElement !== select) {
    select.innerHTML = '';
    for (let index = 0; index < options.length; index += 1) {
      const option = document.createElement('option');
      option.value = options[index].value;
      option.textContent = options[index].label;
      select.appendChild(option);
    }
    autoTravelTypeOptionsSignature = signature;
  }
}

function getAutoTravelTypeOrbitLockState(typeId) {
  const rawEntry = rwgManager?.params?.orbit?.typeOrbitLocks?.[typeId];
  const normalizedEntry = Array.isArray(rawEntry) ? { presets: rawEntry } : rawEntry || {};
  return {
    presets: Array.isArray(normalizedEntry.presets) ? normalizedEntry.presets.filter(Boolean) : [],
    excludedPresets: Array.isArray(normalizedEntry.excludedPresets) ? normalizedEntry.excludedPresets.filter(Boolean) : []
  };
}

function populateAutoTravelOrbitOptions(select, selectedType = 'random') {
  if (!select) return;
  const typeOrbitLock = selectedType && selectedType !== 'random'
    ? getAutoTravelTypeOrbitLockState(selectedType)
    : { presets: [], excludedPresets: [] };
  const allowedByType = typeOrbitLock.presets.length ? typeOrbitLock.presets : null;
  const allOptions = [
    { value: 'random', label: getAutoTravelOptionText('orbit.random', 'Orbit: Random') },
    { value: 'very-hot', label: getAutoTravelOptionText('orbit.veryHot', 'Orbit: Very Hot') },
    { value: 'hot', label: getAutoTravelOptionText('orbit.hot', 'Orbit: Hot') },
    { value: 'hz-inner', label: getAutoTravelOptionText('orbit.hzInner', 'Orbit: HZ Inner') },
    { value: 'hz-mid', label: getAutoTravelOptionText('orbit.hzMid', 'Orbit: HZ Mid') },
    { value: 'hz-outer', label: getAutoTravelOptionText('orbit.hzOuter', 'Orbit: HZ Outer') },
    { value: 'cold', label: getAutoTravelOptionText('orbit.cold', 'Orbit: Cold') },
    { value: 'very-cold', label: getAutoTravelOptionText('orbit.veryCold', 'Orbit: Very Cold') }
  ];
  const options = [];
  for (let index = 0; index < allOptions.length; index += 1) {
    const option = allOptions[index];
    if (option.value === 'random') {
      options.push(option);
      continue;
    }
    if (rwgManager?.isOrbitLocked(option.value)) {
      continue;
    }
    const typeLocked = allowedByType
      ? !allowedByType.includes(option.value)
      : typeOrbitLock.excludedPresets.includes(option.value);
    if (typeLocked) {
      continue;
    }
    options.push(option);
  }
  const signature = JSON.stringify(options);
  if (signature !== autoTravelOrbitOptionsSignature && document.activeElement !== select) {
    select.innerHTML = '';
    for (let index = 0; index < options.length; index += 1) {
      const option = document.createElement('option');
      option.value = options[index].value;
      option.textContent = options[index].label;
      select.appendChild(option);
    }
    autoTravelOrbitOptionsSignature = signature;
  }
}

function populateAutoTravelDominionOptions(select) {
  if (!select) return;
  const entries = [{ value: 'random', label: getAutoTravelOptionText('dominion.random', 'Dominion: Random') }];
  const dominionOrder = rwgManager && rwgManager.getDominionOrder ? rwgManager.getDominionOrder() : [];
  for (let index = 0; index < dominionOrder.length; index += 1) {
    const id = dominionOrder[index];
    const unlocked = rwgManager.isDominionUnlocked(id);
    if (!unlocked) {
      continue;
    }
    entries.push({ value: id, label: getAutoTravelOptionText('dominion.named', '{name}', { name: getRwgUiText(`dominions.${id}`, id) }) });
  }
  const signature = JSON.stringify(entries);
  if (signature !== autoTravelDominionOptionsSignature && document.activeElement !== select) {
    select.innerHTML = '';
    for (let index = 0; index < entries.length; index += 1) {
      const option = document.createElement('option');
      option.value = entries[index].value;
      option.textContent = entries[index].label;
      select.appendChild(option);
    }
    autoTravelDominionOptionsSignature = signature;
  }
}

function updateAutoTravelHazards(preset) {
  const wrap = automationElements.autoTravelHazardsWrap;
  if (!wrap) return;
  const hazardIds = ['hazardousBiomass', 'garbage', 'kessler', 'pulsar', 'hazardousMachinery'];
  const selected = new Set(Array.isArray(preset?.hazards) ? preset.hazards : []);
  const signature = hazardIds.map((id) => `${id}:${selected.has(id) ? 1 : 0}`).join('|');
  if (wrap.dataset.signature === signature) {
    return;
  }
  wrap.dataset.signature = signature;
  wrap.innerHTML = '';
  hazardIds.forEach((hazardId) => {
    const row = document.createElement('label');
    row.classList.add('auto-travel-hazard-row');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selected.has(hazardId);
    input.addEventListener('change', (event) => {
      const currentPreset = getAutoTravelAutomation()?.getSelectedPreset();
      if (!currentPreset) return;
      const next = new Set(Array.isArray(currentPreset.hazards) ? currentPreset.hazards : []);
      if (event.target.checked) next.add(hazardId);
      else next.delete(hazardId);
      currentPreset.hazards = Array.from(next);
      queueAutomationUIRefresh();
    });
    const text = document.createElement('span');
    text.textContent = getRwgUiText(`hazards.names.${hazardId}`, hazardId);
    row.append(input, text);
    wrap.appendChild(row);
  });
}

function updateAutoTravelUI() {
  const card = automationElements.autoTravel || document.getElementById('automation-auto-travel');
  if (!card || !automationManager || !automationManager.autoTravelAutomation) {
    return;
  }
  const automation = automationManager.autoTravelAutomation;
  const unlocked = automationManager.hasFeature('automationAutoTravel');
  const visible = unlocked || automation.enabled;
  card.classList.toggle('hidden', !visible);
  card.style.display = visible ? '' : 'none';
  card.classList.toggle('collapsed', !!automation.collapsed);
  card.classList.toggle('locked', !unlocked);
  if (automationElements.autoTravelPanelBody) {
    automationElements.autoTravelPanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  }
  if (automationElements.autoTravelCollapseButton) {
    automationElements.autoTravelCollapseButton.textContent = automation.collapsed ? '▶' : '▼';
  }
  if (automationElements.autoTravelStatus) {
    automationElements.autoTravelStatus.textContent = unlocked
      ? getAutomationCardText('unlocked', {}, 'Unlocked')
      : getAutomationCardText('locked', {}, 'Locked');
  }
  if (!visible) {
    return;
  }

  const disabled = !unlocked;
  setAutomationToggleState(automationElements.autoTravelMasterToggle, automation.enabled);
  const preset = automation.getSelectedPreset();
  const presetSignature = JSON.stringify(automation.presets.map((entry) => [entry.id, entry.name]));
  if (presetSignature !== autoTravelPresetSignature && document.activeElement !== automationElements.autoTravelPresetSelect) {
    autoTravelPresetSignature = presetSignature;
    const select = automationElements.autoTravelPresetSelect;
    select.innerHTML = '';
    automation.presets.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name || getAutomationCardText('presetWithId', { id: entry.id }, `Preset ${entry.id}`);
      select.appendChild(option);
    });
  }
  if (preset) {
    if (document.activeElement !== automationElements.autoTravelPresetSelect) {
      automationElements.autoTravelPresetSelect.value = String(preset.id);
    }
    if (document.activeElement !== automationElements.autoTravelPresetNameInput) {
      automationElements.autoTravelPresetNameInput.value = preset.name || '';
    }
    populateAutoTravelTypeOptions(automationElements.autoTravelTypeSelect);
    populateAutoTravelOrbitOptions(automationElements.autoTravelOrbitSelect, preset.type || 'random');
    populateAutoTravelDominionOptions(automationElements.autoTravelDominionSelect);
    populateAutoTravelScriptOptions(automationElements.autoTravelScriptAfterTravelSelect);
    if (document.activeElement !== automationElements.autoTravelTargetSelect) {
    automationElements.autoTravelTargetSelect.value = preset.target || 'random';
    }
    if (document.activeElement !== automationElements.autoTravelTypeSelect) {
      automationElements.autoTravelTypeSelect.value = preset.type || 'random';
    }
    if (document.activeElement !== automationElements.autoTravelOrbitSelect) {
      automationElements.autoTravelOrbitSelect.value = preset.orbitPreset || 'random';
      if (automationElements.autoTravelOrbitSelect.value !== (preset.orbitPreset || 'random')) {
        preset.orbitPreset = 'random';
        automationElements.autoTravelOrbitSelect.value = 'random';
      }
    }
    if (document.activeElement !== automationElements.autoTravelDominionSelect) {
      automationElements.autoTravelDominionSelect.value = preset.dominion || 'random';
    }
    if (document.activeElement !== automationElements.autoTravelScriptAfterTravelSelect) {
      const selectedScriptId = preset.runScriptAfterTravelScriptId ? String(preset.runScriptAfterTravelScriptId) : '';
      automationElements.autoTravelScriptAfterTravelSelect.value = selectedScriptId;
      if (automationElements.autoTravelScriptAfterTravelSelect.value !== selectedScriptId) {
        preset.runScriptAfterTravelScriptId = null;
        automationElements.autoTravelScriptAfterTravelSelect.value = '';
      }
    }
    automationElements.autoTravelScriptAfterTravelToggle.checked = !!preset.runScriptAfterTravelEnabled;
    automationElements.autoTravelAutoCompleteToggle.checked = preset.autoCompleteTerraforming !== false;
    automationElements.autoTravelWaitSpecializationToggle.checked = !!preset.waitForSpecialization;
    automationElements.autoTravelBlockIfNoStoredToggle.checked = preset.blockIfNoStoredFromArtificial !== false;
    automationElements.autoTravelTurnOffAfterTravelToggle.checked = !!preset.turnOffAfterTravel;
    const canSkipEquilibration = Number(fastestTerraformRealSeconds) > 0 && Number(fastestTerraformRealSeconds) < 60;
    automationElements.autoTravelSkipEquilibrationToggle.checked = !!preset.skipEquilibration;
    automationElements.autoTravelSkipEquilibrationToggle.disabled = !canSkipEquilibration;
    setTooltipText(
      automationElements.autoTravelSkipEquilibrationInfoTooltipContent,
      getSkipEquilibrationTooltipText()
    );
    automationElements.autoTravelSkipVisualizerToggle.checked = !!preset.skipWorldVisualizerInitialization;
    updateAutoTravelHazards(preset);

    const storedOnlyTarget = (preset.target === 'storedArtificial');
    const disableWhenStoredOnly = [
      automationElements.autoTravelTypeSelect,
      automationElements.autoTravelOrbitSelect,
      automationElements.autoTravelDominionSelect
    ];
    disableWhenStoredOnly.forEach((control) => {
      if (!control) return;
      control.disabled = disabled || storedOnlyTarget;
    });
    const scriptSelectDisabled = disabled || !preset.runScriptAfterTravelEnabled;
    automationElements.autoTravelScriptAfterTravelSelect.disabled = scriptSelectDisabled;
    if (automationElements.autoTravelHazardsSection) {
      automationElements.autoTravelHazardsSection.classList.toggle('hidden', storedOnlyTarget);
    }
  }

  const controls = [
    automationElements.autoTravelMasterToggle,
    automationElements.autoTravelPresetSelect,
    automationElements.autoTravelPresetNameInput,
    automationElements.autoTravelTargetSelect,
    automationElements.autoTravelScriptAfterTravelToggle,
    automationElements.autoTravelAutoCompleteToggle,
    automationElements.autoTravelWaitSpecializationToggle,
    automationElements.autoTravelBlockIfNoStoredToggle,
    automationElements.autoTravelTurnOffAfterTravelToggle,
    automationElements.autoTravelSkipVisualizerToggle,
    automationElements.autoTravelNewPresetButton,
    automationElements.autoTravelDeletePresetButton,
    automationElements.autoTravelImportPresetButton,
    automationElements.autoTravelExportPresetButton
  ];
  controls.forEach((control) => {
    if (!control) return;
    control.disabled = disabled;
  });
  if (disabled) {
    automationElements.autoTravelSkipEquilibrationToggle.disabled = true;
  }
}
