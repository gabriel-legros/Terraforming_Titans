let sidebarAutomationInitialized = false;
let sidebarAutomationMode = false;
const sidebarAutomationElements = {
  journal: null,
  title: null,
  toggle: null,
  panel: null,
  entries: null,
  index: null,
  objective: null,
  nav: null,
  indexIcon: null,
  shipSection: null,
  shipStatus: null,
  shipPresetSelect: null,
  shipPresetToggle: null,
  lifeSection: null,
  lifeStatus: null,
  lifePresetSelect: null,
  lifePresetToggle: null,
  lifePurchaseToggle: null,
  lifeDesignToggle: null,
  buildingsSection: null,
  buildingsStatus: null,
  buildingsPresetSelect: null,
  buildingsPresetDeploy: null,
  buildingsCombinationSelect: null,
  buildingsCombinationDeploy: null,
  projectsSection: null,
  projectsStatus: null,
  projectsPresetSelect: null,
  projectsPresetDeploy: null,
  projectsCombinationSelect: null,
  projectsCombinationDeploy: null
};

function createJournalAutomationToggle(title) {
  if (!title) {
    return null;
  }
  const toggle = document.createElement('span');
  toggle.id = 'journal-automation-toggle';
  toggle.classList.add('journal-automation-toggle', 'hidden');
  toggle.title = 'Automation shortcuts';
  toggle.innerHTML = '&#9881;';
  const indexIcon = document.getElementById('journal-index-icon');
  if (indexIcon && indexIcon.parentElement === title) {
    title.insertBefore(toggle, indexIcon);
  } else {
    title.appendChild(toggle);
  }
  return toggle;
}

function cacheSidebarAutomationElements() {
  const elements = sidebarAutomationElements;
  elements.journal = document.getElementById('journal');
  elements.title = document.getElementById('journal-title');
  elements.toggle = document.getElementById('journal-automation-toggle');
  elements.panel = document.getElementById('journal-automation-panel');
  elements.entries = document.getElementById('journal-entries');
  elements.index = document.getElementById('journal-index');
  elements.objective = document.getElementById('current-objective');
  elements.nav = document.getElementById('journal-nav-container');
  elements.indexIcon = document.getElementById('journal-index-icon');
  if (!elements.toggle) {
    elements.toggle = createJournalAutomationToggle(elements.title);
  }
  if (!elements.panel) {
    const panel = document.createElement('div');
    panel.id = 'journal-automation-panel';
    panel.classList.add('journal-automation-panel', 'hidden');
    elements.panel = panel;
  }
  if (elements.journal && elements.panel && !elements.panel.parentElement) {
    elements.journal.insertBefore(elements.panel, elements.entries);
  }
}

function createSidebarSection(titleText) {
  const section = document.createElement('div');
  section.classList.add('journal-automation-section');
  const header = document.createElement('div');
  header.classList.add('journal-automation-section-header');
  const title = document.createElement('span');
  title.textContent = titleText;
  const status = document.createElement('span');
  status.classList.add('journal-automation-section-status');
  header.append(title, status);
  section.appendChild(header);
  return { section, status, header, title };
}

function createSidebarRow() {
  const row = document.createElement('div');
  row.classList.add('journal-automation-row');
  return row;
}

function buildSidebarAutomationUI() {
  const elements = sidebarAutomationElements;
  const panel = elements.panel;
  if (!panel) {
    return;
  }

  const ship = createSidebarSection('Ships');
  const shipRow = createSidebarRow();
  const shipPresetSelect = document.createElement('select');
  shipPresetSelect.classList.add('journal-automation-select');
  const shipToggle = createToggleButton({ onLabel: 'On', offLabel: 'Off', isOn: false });
  shipToggle.classList.add('journal-automation-switch');
  shipToggle.title = 'Toggle ship automation preset';
  ship.header.insertBefore(shipToggle, ship.status);
  shipRow.append(shipPresetSelect);
  ship.section.appendChild(shipRow);
  panel.appendChild(ship.section);
  elements.shipSection = ship.section;
  elements.shipStatus = ship.status;
  elements.shipPresetSelect = shipPresetSelect;
  elements.shipPresetToggle = shipToggle;

  const life = createSidebarSection('Life');
  const lifeRow = createSidebarRow();
  const lifePresetSelect = document.createElement('select');
  lifePresetSelect.classList.add('journal-automation-select');
  const lifeToggle = createToggleButton({ onLabel: 'On', offLabel: 'Off', isOn: false });
  lifeToggle.classList.add('journal-automation-switch');
  lifeToggle.title = 'Toggle life automation preset';
  life.header.insertBefore(lifeToggle, life.status);
  lifeRow.append(lifePresetSelect);
  const lifeToggleRow = createSidebarRow();
  lifeToggleRow.classList.add('journal-automation-row-tight');
  const purchaseToggle = createToggleButton({ onLabel: 'Purchase', offLabel: 'Purchase', isOn: false });
  purchaseToggle.classList.add('journal-automation-switch');
  purchaseToggle.title = 'Toggle auto purchase';
  const designToggle = createToggleButton({ onLabel: 'Design', offLabel: 'Design', isOn: false });
  designToggle.classList.add('journal-automation-switch');
  designToggle.title = 'Toggle auto design';
  lifeToggleRow.append(purchaseToggle, designToggle);
  life.section.append(lifeRow, lifeToggleRow);
  panel.appendChild(life.section);
  elements.lifeSection = life.section;
  elements.lifeStatus = life.status;
  elements.lifePresetSelect = lifePresetSelect;
  elements.lifePresetToggle = lifeToggle;
  elements.lifePurchaseToggle = purchaseToggle;
  elements.lifeDesignToggle = designToggle;

  const buildings = createSidebarSection('Buildings');
  const buildingsPresetRow = createSidebarRow();
  buildingsPresetRow.classList.add('journal-automation-row-stacked');
  const buildingsPresetLabel = document.createElement('span');
  buildingsPresetLabel.classList.add('journal-automation-row-label');
  buildingsPresetLabel.textContent = 'Preset';
  const buildingsPresetControls = createSidebarRow();
  const buildingsPresetSelect = document.createElement('select');
  buildingsPresetSelect.classList.add('journal-automation-select');
  const buildingsPresetDeploy = document.createElement('button');
  buildingsPresetDeploy.type = 'button';
  buildingsPresetDeploy.textContent = 'Deploy';
  buildingsPresetDeploy.classList.add('journal-automation-action');
  buildingsPresetControls.append(buildingsPresetSelect, buildingsPresetDeploy);
  buildingsPresetRow.append(buildingsPresetLabel, buildingsPresetControls);
  const buildingsComboRow = createSidebarRow();
  buildingsComboRow.classList.add('journal-automation-row-stacked');
  const buildingsComboLabel = document.createElement('span');
  buildingsComboLabel.classList.add('journal-automation-row-label');
  buildingsComboLabel.textContent = 'Combination';
  const buildingsComboControls = createSidebarRow();
  const buildingsComboSelect = document.createElement('select');
  buildingsComboSelect.classList.add('journal-automation-select');
  const buildingsComboDeploy = document.createElement('button');
  buildingsComboDeploy.type = 'button';
  buildingsComboDeploy.textContent = 'Deploy';
  buildingsComboDeploy.classList.add('journal-automation-action');
  buildingsComboControls.append(buildingsComboSelect, buildingsComboDeploy);
  buildingsComboRow.append(buildingsComboLabel, buildingsComboControls);
  buildings.section.append(buildingsPresetRow, buildingsComboRow);
  panel.appendChild(buildings.section);
  elements.buildingsSection = buildings.section;
  elements.buildingsStatus = buildings.status;
  elements.buildingsPresetSelect = buildingsPresetSelect;
  elements.buildingsPresetDeploy = buildingsPresetDeploy;
  elements.buildingsCombinationSelect = buildingsComboSelect;
  elements.buildingsCombinationDeploy = buildingsComboDeploy;

  const projects = createSidebarSection('Projects');
  const projectsPresetRow = createSidebarRow();
  projectsPresetRow.classList.add('journal-automation-row-stacked');
  const projectsPresetLabel = document.createElement('span');
  projectsPresetLabel.classList.add('journal-automation-row-label');
  projectsPresetLabel.textContent = 'Preset';
  const projectsPresetControls = createSidebarRow();
  const projectsPresetSelect = document.createElement('select');
  projectsPresetSelect.classList.add('journal-automation-select');
  const projectsPresetDeploy = document.createElement('button');
  projectsPresetDeploy.type = 'button';
  projectsPresetDeploy.textContent = 'Deploy';
  projectsPresetDeploy.classList.add('journal-automation-action');
  projectsPresetControls.append(projectsPresetSelect, projectsPresetDeploy);
  projectsPresetRow.append(projectsPresetLabel, projectsPresetControls);
  const projectsComboRow = createSidebarRow();
  projectsComboRow.classList.add('journal-automation-row-stacked');
  const projectsComboLabel = document.createElement('span');
  projectsComboLabel.classList.add('journal-automation-row-label');
  projectsComboLabel.textContent = 'Combination';
  const projectsComboControls = createSidebarRow();
  const projectsComboSelect = document.createElement('select');
  projectsComboSelect.classList.add('journal-automation-select');
  const projectsComboDeploy = document.createElement('button');
  projectsComboDeploy.type = 'button';
  projectsComboDeploy.textContent = 'Deploy';
  projectsComboDeploy.classList.add('journal-automation-action');
  projectsComboControls.append(projectsComboSelect, projectsComboDeploy);
  projectsComboRow.append(projectsComboLabel, projectsComboControls);
  projects.section.append(projectsPresetRow, projectsComboRow);
  panel.appendChild(projects.section);
  elements.projectsSection = projects.section;
  elements.projectsStatus = projects.status;
  elements.projectsPresetSelect = projectsPresetSelect;
  elements.projectsPresetDeploy = projectsPresetDeploy;
  elements.projectsCombinationSelect = projectsComboSelect;
  elements.projectsCombinationDeploy = projectsComboDeploy;
}

function setJournalAutomationMode(enabled) {
  sidebarAutomationMode = !!enabled;
  const elements = sidebarAutomationElements;
  const journal = elements.journal;
  journal.classList.toggle('automation-mode', sidebarAutomationMode);
  elements.panel.classList.toggle('hidden', !sidebarAutomationMode);
  elements.toggle.innerHTML = sidebarAutomationMode ? '&#128214;' : '&#9881;';
  elements.toggle.title = sidebarAutomationMode ? 'Return to journal' : 'Automation shortcuts';
}

function toggleJournalAutomationMode() {
  setJournalAutomationMode(!sidebarAutomationMode);
}

function fillSelect(select, options, selectedValue, emptyLabel) {
  if (document.activeElement === select) {
    return;
  }
  select.textContent = '';
  if (emptyLabel) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = emptyLabel;
    select.appendChild(empty);
  }
  options.forEach(optionData => {
    const option = document.createElement('option');
    option.value = String(optionData.value);
    option.textContent = optionData.label;
    select.appendChild(option);
  });
  select.value = String(selectedValue ?? '');
}

function initializeSidebarAutomationUI() {
  if (sidebarAutomationInitialized) {
    return;
  }
  cacheSidebarAutomationElements();
  if (!sidebarAutomationElements.toggle || !sidebarAutomationElements.panel) {
    return;
  }
  buildSidebarAutomationUI();
  sidebarAutomationElements.toggle.addEventListener('click', toggleJournalAutomationMode);

  sidebarAutomationElements.shipPresetSelect.addEventListener('change', (event) => {
    const id = Number(event.target.value);
    automationManager.spaceshipAutomation.setActivePreset(id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.shipPresetToggle.addEventListener('click', () => {
    const preset = automationManager.spaceshipAutomation.getActivePreset();
    automationManager.spaceshipAutomation.togglePresetEnabled(preset.id, !preset.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.lifePresetSelect.addEventListener('change', (event) => {
    const id = Number(event.target.value);
    automationManager.lifeAutomation.setActivePreset(id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifePresetToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    automationManager.lifeAutomation.togglePresetEnabled(preset.id, !preset.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifePurchaseToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    automationManager.lifeAutomation.setPurchaseAutomationEnabled(preset.id, !preset.purchaseEnabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifeDesignToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    automationManager.lifeAutomation.setDesignAutomationEnabled(preset.id, !preset.designEnabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.buildingsPresetSelect.addEventListener('change', (event) => {
    buildingAutomationUIState.builderPresetId = event.target.value || null;
    buildingAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.buildingsPresetDeploy.addEventListener('click', () => {
    const presetId = Number(sidebarAutomationElements.buildingsPresetSelect.value);
    automationManager.buildingsAutomation.applyPresetOnce(presetId);
  });
  sidebarAutomationElements.buildingsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    buildingAutomationUIState.combinationId = comboId;
    buildingAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.buildingsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.buildingsCombinationDeploy.addEventListener('click', () => {
    automationManager.buildingsAutomation.applyPresets();
  });

  sidebarAutomationElements.projectsPresetSelect.addEventListener('change', (event) => {
    projectAutomationUIState.builderPresetId = event.target.value || null;
    projectAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.projectsPresetDeploy.addEventListener('click', () => {
    const presetId = Number(sidebarAutomationElements.projectsPresetSelect.value);
    automationManager.projectsAutomation.applyPresetOnce(presetId);
  });
  sidebarAutomationElements.projectsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    projectAutomationUIState.combinationId = comboId;
    projectAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.projectsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.projectsCombinationDeploy.addEventListener('click', () => {
    automationManager.projectsAutomation.applyPresets();
  });

  setJournalAutomationMode(false);
  sidebarAutomationInitialized = true;
}

function updateSidebarAutomationUI() {
  if (!sidebarAutomationInitialized) {
    initializeSidebarAutomationUI();
  }
  if (!sidebarAutomationInitialized) {
    return false;
  }

  const elements = sidebarAutomationElements;
  const manager = automationManager;
  const hasAnyAutomation = manager.hasFeature('automationShipAssignment')
    || manager.hasFeature('automationLifeDesign')
    || manager.hasFeature('automationBuildings')
    || manager.hasFeature('automationProjects');
  const toggleVisible = manager.enabled && hasAnyAutomation;
  elements.toggle.classList.toggle('hidden', !toggleVisible);
  if (!toggleVisible && sidebarAutomationMode) {
    setJournalAutomationMode(false);
  }

  const shipAutomation = manager.spaceshipAutomation;
  const shipUnlocked = manager.hasFeature('automationShipAssignment');
  elements.shipSection.style.display = shipUnlocked ? '' : 'none';
  elements.shipSection.classList.toggle('journal-automation-locked', !shipUnlocked);
  elements.shipStatus.textContent = shipUnlocked ? '' : 'Locked';
  elements.shipPresetSelect.disabled = !shipUnlocked;
  elements.shipPresetToggle.disabled = !shipUnlocked;
  if (shipUnlocked) {
    fillSelect(
      elements.shipPresetSelect,
      shipAutomation.presets.map(preset => ({ value: preset.id, label: preset.name || `Preset ${preset.id}` })),
      shipAutomation.activePresetId
    );
    const activePreset = shipAutomation.getActivePreset();
    setToggleButtonState(elements.shipPresetToggle, !!activePreset.enabled);
  }

  const lifeAutomation = manager.lifeAutomation;
  const lifeUnlocked = manager.hasFeature('automationLifeDesign');
  elements.lifeSection.style.display = lifeUnlocked ? '' : 'none';
  elements.lifeSection.classList.toggle('journal-automation-locked', !lifeUnlocked);
  elements.lifeStatus.textContent = lifeUnlocked ? '' : 'Locked';
  elements.lifePresetSelect.disabled = !lifeUnlocked;
  elements.lifePresetToggle.disabled = !lifeUnlocked;
  elements.lifePurchaseToggle.disabled = !lifeUnlocked;
  elements.lifeDesignToggle.disabled = !lifeUnlocked;
  if (lifeUnlocked) {
    fillSelect(
      elements.lifePresetSelect,
      lifeAutomation.presets.map(preset => ({ value: preset.id, label: preset.name || `Preset ${preset.id}` })),
      lifeAutomation.activePresetId
    );
    const activePreset = lifeAutomation.getActivePreset();
    setToggleButtonState(elements.lifePresetToggle, !!activePreset.enabled);
    setToggleButtonState(elements.lifePurchaseToggle, activePreset.purchaseEnabled !== false);
    setToggleButtonState(elements.lifeDesignToggle, activePreset.designEnabled !== false);
  }

  const buildingAutomation = manager.buildingsAutomation;
  const buildingsUnlocked = manager.hasFeature('automationBuildings');
  elements.buildingsSection.style.display = buildingsUnlocked ? '' : 'none';
  elements.buildingsSection.classList.toggle('journal-automation-locked', !buildingsUnlocked);
  elements.buildingsStatus.textContent = buildingsUnlocked ? '' : 'Locked';
  elements.buildingsPresetSelect.disabled = !buildingsUnlocked;
  elements.buildingsPresetDeploy.disabled = !buildingsUnlocked;
  elements.buildingsCombinationSelect.disabled = !buildingsUnlocked;
  elements.buildingsCombinationDeploy.disabled = !buildingsUnlocked;
  if (buildingsUnlocked) {
    fillSelect(
      elements.buildingsPresetSelect,
      buildingAutomation.presets.map(preset => ({ value: preset.id, label: preset.name || `Preset ${preset.id}` })),
      buildingAutomationUIState.builderPresetId || ''
    );
    fillSelect(
      elements.buildingsCombinationSelect,
      buildingAutomation.getCombinations().map(combo => ({ value: combo.id, label: combo.name || `Combination ${combo.id}` })),
      buildingAutomationUIState.combinationId || ''
    );
    elements.buildingsPresetDeploy.disabled = !elements.buildingsPresetSelect.value;
    elements.buildingsCombinationDeploy.disabled = buildingAutomation.getAssignments().length === 0;
  }

  const projectsAutomation = manager.projectsAutomation;
  const projectsUnlocked = manager.hasFeature('automationProjects');
  elements.projectsSection.style.display = projectsUnlocked ? '' : 'none';
  elements.projectsSection.classList.toggle('journal-automation-locked', !projectsUnlocked);
  elements.projectsStatus.textContent = projectsUnlocked ? '' : 'Locked';
  elements.projectsPresetSelect.disabled = !projectsUnlocked;
  elements.projectsPresetDeploy.disabled = !projectsUnlocked;
  elements.projectsCombinationSelect.disabled = !projectsUnlocked;
  elements.projectsCombinationDeploy.disabled = !projectsUnlocked;
  if (projectsUnlocked) {
    fillSelect(
      elements.projectsPresetSelect,
      projectsAutomation.presets.map(preset => ({ value: preset.id, label: preset.name || `Preset ${preset.id}` })),
      projectAutomationUIState.builderPresetId || ''
    );
    fillSelect(
      elements.projectsCombinationSelect,
      projectsAutomation.getCombinations().map(combo => ({ value: combo.id, label: combo.name || `Combination ${combo.id}` })),
      projectAutomationUIState.combinationId || ''
    );
    elements.projectsPresetDeploy.disabled = !elements.projectsPresetSelect.value;
    elements.projectsCombinationDeploy.disabled = projectsAutomation.getAssignments().length === 0;
  }

  return true;
}
