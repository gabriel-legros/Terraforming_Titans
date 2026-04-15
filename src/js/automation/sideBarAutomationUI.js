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
  researchSection: null,
  researchStatus: null,
  researchPresetSelect: null,
  researchPresetDeploy: null,
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
  projectsCombinationDeploy: null,
  colonySection: null,
  colonyStatus: null,
  colonyPresetSelect: null,
  colonyPresetDeploy: null,
  colonyCombinationSelect: null,
  colonyCombinationDeploy: null
};

function getSidebarAutomationText(path, vars, fallback) {
  return t(`ui.hope.automationCards.sidebar.${path}`, vars, fallback);
}

function getSidebarPresetLabel(preset) {
  return preset.name || getSidebarAutomationText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function getSidebarCombinationLabel(combination) {
  return combination.name || getSidebarAutomationText('combinationWithId', { id: combination.id }, `Combination ${combination.id}`);
}

function createJournalAutomationToggle(title) {
  if (!title) {
    return null;
  }
  const toggle = document.createElement('span');
  toggle.id = 'journal-automation-toggle';
  toggle.classList.add('journal-automation-toggle', 'hidden');
  toggle.title = t('ui.journal.automationShortcuts', null, 'Automation shortcuts');
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

  const ship = createSidebarSection(getSidebarAutomationText('ships', null, 'Ships'));
  const shipRow = createSidebarRow();
  const shipPresetSelect = document.createElement('select');
  shipPresetSelect.classList.add('journal-automation-select');
  const shipToggle = createToggleButton({
    onLabel: getSidebarAutomationText('on', null, 'On'),
    offLabel: getSidebarAutomationText('off', null, 'Off'),
    isOn: false
  });
  shipToggle.classList.add('journal-automation-switch');
  shipToggle.title = getSidebarAutomationText('toggleShipPreset', null, 'Toggle ship automation preset');
  ship.header.insertBefore(shipToggle, ship.status);
  shipRow.append(shipPresetSelect);
  ship.section.appendChild(shipRow);
  panel.appendChild(ship.section);
  elements.shipSection = ship.section;
  elements.shipStatus = ship.status;
  elements.shipPresetSelect = shipPresetSelect;
  elements.shipPresetToggle = shipToggle;

  const life = createSidebarSection(getSidebarAutomationText('life', null, 'Life'));
  const lifeRow = createSidebarRow();
  const lifePresetSelect = document.createElement('select');
  lifePresetSelect.classList.add('journal-automation-select');
  const lifeToggle = createToggleButton({
    onLabel: getSidebarAutomationText('on', null, 'On'),
    offLabel: getSidebarAutomationText('off', null, 'Off'),
    isOn: false
  });
  lifeToggle.classList.add('journal-automation-switch');
  lifeToggle.title = getSidebarAutomationText('toggleLifePreset', null, 'Toggle life automation preset');
  life.header.insertBefore(lifeToggle, life.status);
  lifeRow.append(lifePresetSelect);
  const lifeToggleRow = createSidebarRow();
  lifeToggleRow.classList.add('journal-automation-row-tight');
  const purchaseToggle = createToggleButton({
    onLabel: getSidebarAutomationText('purchase', null, 'Purchase'),
    offLabel: getSidebarAutomationText('purchase', null, 'Purchase'),
    isOn: false
  });
  purchaseToggle.classList.add('journal-automation-switch');
  purchaseToggle.title = getSidebarAutomationText('toggleAutoPurchase', null, 'Toggle auto purchase');
  const designToggle = createToggleButton({
    onLabel: getSidebarAutomationText('design', null, 'Design'),
    offLabel: getSidebarAutomationText('design', null, 'Design'),
    isOn: false
  });
  designToggle.classList.add('journal-automation-switch');
  designToggle.title = getSidebarAutomationText('toggleAutoDesign', null, 'Toggle auto design');
  lifeToggleRow.append(purchaseToggle, designToggle);
  life.section.append(lifeRow, lifeToggleRow);
  panel.appendChild(life.section);
  elements.lifeSection = life.section;
  elements.lifeStatus = life.status;
  elements.lifePresetSelect = lifePresetSelect;
  elements.lifePresetToggle = lifeToggle;
  elements.lifePurchaseToggle = purchaseToggle;
  elements.lifeDesignToggle = designToggle;

  const buildings = createSidebarSection(getSidebarAutomationText('buildings', null, 'Buildings'));
  const buildingsPresetRow = createSidebarRow();
  buildingsPresetRow.classList.add('journal-automation-row-stacked');
  const buildingsPresetLabel = document.createElement('span');
  buildingsPresetLabel.classList.add('journal-automation-row-label');
  buildingsPresetLabel.textContent = getSidebarAutomationText('preset', null, 'Preset');
  const buildingsPresetControls = createSidebarRow();
  const buildingsPresetSelect = document.createElement('select');
  buildingsPresetSelect.classList.add('journal-automation-select');
  const buildingsPresetDeploy = document.createElement('button');
  buildingsPresetDeploy.type = 'button';
  buildingsPresetDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  buildingsPresetDeploy.classList.add('journal-automation-action');
  buildingsPresetControls.append(buildingsPresetSelect, buildingsPresetDeploy);
  buildingsPresetRow.append(buildingsPresetLabel, buildingsPresetControls);
  const buildingsComboRow = createSidebarRow();
  buildingsComboRow.classList.add('journal-automation-row-stacked');
  const buildingsComboLabel = document.createElement('span');
  buildingsComboLabel.classList.add('journal-automation-row-label');
  buildingsComboLabel.textContent = getSidebarAutomationText('combination', null, 'Combination');
  const buildingsComboControls = createSidebarRow();
  const buildingsComboSelect = document.createElement('select');
  buildingsComboSelect.classList.add('journal-automation-select');
  const buildingsComboDeploy = document.createElement('button');
  buildingsComboDeploy.type = 'button';
  buildingsComboDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
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

  const projects = createSidebarSection(getSidebarAutomationText('projects', null, 'Projects'));
  const projectsPresetRow = createSidebarRow();
  projectsPresetRow.classList.add('journal-automation-row-stacked');
  const projectsPresetLabel = document.createElement('span');
  projectsPresetLabel.classList.add('journal-automation-row-label');
  projectsPresetLabel.textContent = getSidebarAutomationText('preset', null, 'Preset');
  const projectsPresetControls = createSidebarRow();
  const projectsPresetSelect = document.createElement('select');
  projectsPresetSelect.classList.add('journal-automation-select');
  const projectsPresetDeploy = document.createElement('button');
  projectsPresetDeploy.type = 'button';
  projectsPresetDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  projectsPresetDeploy.classList.add('journal-automation-action');
  projectsPresetControls.append(projectsPresetSelect, projectsPresetDeploy);
  projectsPresetRow.append(projectsPresetLabel, projectsPresetControls);
  const projectsComboRow = createSidebarRow();
  projectsComboRow.classList.add('journal-automation-row-stacked');
  const projectsComboLabel = document.createElement('span');
  projectsComboLabel.classList.add('journal-automation-row-label');
  projectsComboLabel.textContent = getSidebarAutomationText('combination', null, 'Combination');
  const projectsComboControls = createSidebarRow();
  const projectsComboSelect = document.createElement('select');
  projectsComboSelect.classList.add('journal-automation-select');
  const projectsComboDeploy = document.createElement('button');
  projectsComboDeploy.type = 'button';
  projectsComboDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
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

  const colony = createSidebarSection(getSidebarAutomationText('colony', null, 'Colony'));
  const colonyPresetRow = createSidebarRow();
  colonyPresetRow.classList.add('journal-automation-row-stacked');
  const colonyPresetLabel = document.createElement('span');
  colonyPresetLabel.classList.add('journal-automation-row-label');
  colonyPresetLabel.textContent = getSidebarAutomationText('preset', null, 'Preset');
  const colonyPresetControls = createSidebarRow();
  const colonyPresetSelect = document.createElement('select');
  colonyPresetSelect.classList.add('journal-automation-select');
  const colonyPresetDeploy = document.createElement('button');
  colonyPresetDeploy.type = 'button';
  colonyPresetDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  colonyPresetDeploy.classList.add('journal-automation-action');
  colonyPresetControls.append(colonyPresetSelect, colonyPresetDeploy);
  colonyPresetRow.append(colonyPresetLabel, colonyPresetControls);
  const colonyComboRow = createSidebarRow();
  colonyComboRow.classList.add('journal-automation-row-stacked');
  const colonyComboLabel = document.createElement('span');
  colonyComboLabel.classList.add('journal-automation-row-label');
  colonyComboLabel.textContent = getSidebarAutomationText('combination', null, 'Combination');
  const colonyComboControls = createSidebarRow();
  const colonyComboSelect = document.createElement('select');
  colonyComboSelect.classList.add('journal-automation-select');
  const colonyComboDeploy = document.createElement('button');
  colonyComboDeploy.type = 'button';
  colonyComboDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  colonyComboDeploy.classList.add('journal-automation-action');
  colonyComboControls.append(colonyComboSelect, colonyComboDeploy);
  colonyComboRow.append(colonyComboLabel, colonyComboControls);
  colony.section.append(colonyPresetRow, colonyComboRow);
  panel.appendChild(colony.section);
  elements.colonySection = colony.section;
  elements.colonyStatus = colony.status;
  elements.colonyPresetSelect = colonyPresetSelect;
  elements.colonyPresetDeploy = colonyPresetDeploy;
  elements.colonyCombinationSelect = colonyComboSelect;
  elements.colonyCombinationDeploy = colonyComboDeploy;

  const research = createSidebarSection(getSidebarAutomationText('research', null, 'Research'));
  const researchRow = createSidebarRow();
  researchRow.classList.add('journal-automation-row-stacked');
  const researchPresetLabel = document.createElement('span');
  researchPresetLabel.classList.add('journal-automation-row-label');
  researchPresetLabel.textContent = getSidebarAutomationText('preset', null, 'Preset');
  const researchPresetControls = createSidebarRow();
  const researchPresetSelect = document.createElement('select');
  researchPresetSelect.classList.add('journal-automation-select');
  const researchPresetDeploy = document.createElement('button');
  researchPresetDeploy.type = 'button';
  researchPresetDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  researchPresetDeploy.classList.add('journal-automation-action');
  researchPresetControls.append(researchPresetSelect, researchPresetDeploy);
  researchRow.append(researchPresetLabel, researchPresetControls);
  research.section.appendChild(researchRow);
  panel.appendChild(research.section);
  elements.researchSection = research.section;
  elements.researchStatus = research.status;
  elements.researchPresetSelect = researchPresetSelect;
  elements.researchPresetDeploy = researchPresetDeploy;
}

function setJournalAutomationMode(enabled) {
  sidebarAutomationMode = !!enabled;
  const elements = sidebarAutomationElements;
  const journal = elements.journal;
  journal.classList.toggle('automation-mode', sidebarAutomationMode);
  elements.panel.classList.toggle('hidden', !sidebarAutomationMode);
  elements.toggle.innerHTML = sidebarAutomationMode ? '&#128214;' : '&#9881;';
  elements.toggle.title = sidebarAutomationMode
    ? t('ui.journal.returnToJournal', null, 'Return to journal')
    : t('ui.journal.automationShortcuts', null, 'Automation shortcuts');
}

function toggleJournalAutomationMode() {
  setJournalAutomationMode(!sidebarAutomationMode);
  if (sidebarAutomationMode) {
    updateSidebarAutomationUI();
  }
}

function updateSidebarAutomationToggleVisibility() {
  cacheSidebarAutomationElements();
  const elements = sidebarAutomationElements;
  if (!elements.toggle) {
    return false;
  }

  const manager = automationManager;
  const hasAnyAutomation = !!(manager
    && (manager.hasFeature('automationShipAssignment')
      || manager.hasFeature('automationLifeDesign')
      || manager.hasFeature('automationResearch')
      || manager.hasFeature('automationBuildings')
      || manager.hasFeature('automationProjects')
      || manager.hasFeature('automationColony')));
  const toggleVisible = !!(manager && manager.enabled && hasAnyAutomation);
  elements.toggle.classList.toggle('hidden', !toggleVisible);
  if (!toggleVisible && sidebarAutomationMode) {
    setJournalAutomationMode(false);
  }
  return toggleVisible;
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
    automationManager.spaceshipAutomation.setSelectedPresetId(id);
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
    automationManager.lifeAutomation.setSelectedPresetId(id);
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

  sidebarAutomationElements.researchPresetSelect.addEventListener('change', (event) => {
    researchManager.setCurrentAutoResearchPreset(Number(event.target.value));
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });
  sidebarAutomationElements.researchPresetDeploy.addEventListener('click', () => {
    const preset = researchManager.getSelectedAutoResearchPreset();
    if (!preset) {
      return;
    }
    researchManager.applyAutoResearchPresetOnce(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
    updateResearchUI();
  });

  sidebarAutomationElements.buildingsPresetSelect.addEventListener('change', (event) => {
    automationManager.buildingsAutomation.setSelectedPresetId(event.target.value || null);
    buildingAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.buildingsPresetDeploy.addEventListener('click', () => {
    const presetId = automationManager.buildingsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.buildingsAutomation.applyPresetOnce(presetId);
    }
  });
  sidebarAutomationElements.buildingsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.buildingsAutomation.setSelectedCombinationId(comboId);
    buildingAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.buildingsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.buildingsCombinationDeploy.addEventListener('click', () => {
    const comboId = automationManager.buildingsAutomation.getSelectedCombinationId();
    automationManager.buildingsAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
  });

  sidebarAutomationElements.projectsPresetSelect.addEventListener('change', (event) => {
    automationManager.projectsAutomation.setSelectedPresetId(event.target.value || null);
    projectAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.projectsPresetDeploy.addEventListener('click', () => {
    const presetId = automationManager.projectsAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.projectsAutomation.applyPresetOnce(presetId);
    }
  });
  sidebarAutomationElements.projectsCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.projectsAutomation.setSelectedCombinationId(comboId);
    projectAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.projectsAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.projectsCombinationDeploy.addEventListener('click', () => {
    const comboId = automationManager.projectsAutomation.getSelectedCombinationId();
    automationManager.projectsAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
  });

  sidebarAutomationElements.colonyPresetSelect.addEventListener('change', (event) => {
    automationManager.colonyAutomation.setSelectedPresetId(event.target.value || null);
    colonyAutomationUIState.syncedPresetId = null;
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.colonyPresetDeploy.addEventListener('click', () => {
    const presetId = automationManager.colonyAutomation.getSelectedPresetId();
    if (presetId) {
      automationManager.colonyAutomation.applyPresetOnce(presetId);
    }
  });
  sidebarAutomationElements.colonyCombinationSelect.addEventListener('change', (event) => {
    const comboId = event.target.value || null;
    automationManager.colonyAutomation.setSelectedCombinationId(comboId);
    colonyAutomationUIState.combinationSyncedId = null;
    if (comboId) {
      automationManager.colonyAutomation.applyCombination(Number(comboId));
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.colonyCombinationDeploy.addEventListener('click', () => {
    const comboId = automationManager.colonyAutomation.getSelectedCombinationId();
    automationManager.colonyAutomation.applyCombinationPresets(comboId ? Number(comboId) : null);
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
  updateSidebarAutomationToggleVisibility();

  const shipAutomation = manager.spaceshipAutomation;
  const shipUnlocked = manager.hasFeature('automationShipAssignment');
  elements.shipSection.style.display = shipUnlocked ? '' : 'none';
  elements.shipSection.classList.toggle('journal-automation-locked', !shipUnlocked);
  elements.shipStatus.textContent = shipUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.shipPresetSelect.disabled = !shipUnlocked;
  elements.shipPresetToggle.disabled = !shipUnlocked;
  if (shipUnlocked) {
    fillSelect(
      elements.shipPresetSelect,
      shipAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      shipAutomation.getSelectedPresetId()
    );
    const activePreset = shipAutomation.getActivePreset();
    setToggleButtonState(elements.shipPresetToggle, !!activePreset.enabled);
  }

  const lifeAutomation = manager.lifeAutomation;
  const lifeUnlocked = manager.hasFeature('automationLifeDesign');
  elements.lifeSection.style.display = lifeUnlocked ? '' : 'none';
  elements.lifeSection.classList.toggle('journal-automation-locked', !lifeUnlocked);
  elements.lifeStatus.textContent = lifeUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.lifePresetSelect.disabled = !lifeUnlocked;
  elements.lifePresetToggle.disabled = !lifeUnlocked;
  elements.lifePurchaseToggle.disabled = !lifeUnlocked;
  elements.lifeDesignToggle.disabled = !lifeUnlocked;
  if (lifeUnlocked) {
    fillSelect(
      elements.lifePresetSelect,
      lifeAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      lifeAutomation.getSelectedPresetId()
    );
    const activePreset = lifeAutomation.getActivePreset();
    setToggleButtonState(elements.lifePresetToggle, !!activePreset.enabled);
    setToggleButtonState(elements.lifePurchaseToggle, activePreset.purchaseEnabled !== false);
    setToggleButtonState(elements.lifeDesignToggle, activePreset.designEnabled !== false);
  }

  const researchUnlocked = manager.hasFeature('automationResearch');
  elements.researchSection.style.display = researchUnlocked ? '' : 'none';
  elements.researchSection.classList.toggle('journal-automation-locked', !researchUnlocked);
  elements.researchStatus.textContent = researchUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.researchPresetSelect.disabled = !researchUnlocked;
  elements.researchPresetDeploy.disabled = !researchUnlocked;
  if (researchUnlocked) {
    fillSelect(
      elements.researchPresetSelect,
      researchManager.autoResearchPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      researchManager.currentAutoResearchPreset
    );
    elements.researchPresetDeploy.disabled = !researchManager.getSelectedAutoResearchPreset();
  }

  const buildingAutomation = manager.buildingsAutomation;
  const buildingsUnlocked = manager.hasFeature('automationBuildings');
  elements.buildingsSection.style.display = buildingsUnlocked ? '' : 'none';
  elements.buildingsSection.classList.toggle('journal-automation-locked', !buildingsUnlocked);
  elements.buildingsStatus.textContent = buildingsUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.buildingsPresetSelect.disabled = !buildingsUnlocked;
  elements.buildingsPresetDeploy.disabled = !buildingsUnlocked;
  elements.buildingsCombinationSelect.disabled = !buildingsUnlocked;
  elements.buildingsCombinationDeploy.disabled = !buildingsUnlocked;
  if (buildingsUnlocked) {
    const buildingCombinations = buildingAutomation.getCombinations();
    fillSelect(
      elements.buildingsPresetSelect,
      buildingAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      buildingAutomation.getSelectedPresetId() || '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.buildingsCombinationSelect,
      buildingCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      buildingAutomation.getSelectedCombinationId() || '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.buildingsPresetDeploy.disabled = !buildingAutomation.getSelectedPresetId();
    elements.buildingsCombinationDeploy.disabled = !buildingAutomation.getSelectedCombinationId() || buildingAutomation.getAssignments().length === 0;
  }

  const projectsAutomation = manager.projectsAutomation;
  const projectsUnlocked = manager.hasFeature('automationProjects');
  elements.projectsSection.style.display = projectsUnlocked ? '' : 'none';
  elements.projectsSection.classList.toggle('journal-automation-locked', !projectsUnlocked);
  elements.projectsStatus.textContent = projectsUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.projectsPresetSelect.disabled = !projectsUnlocked;
  elements.projectsPresetDeploy.disabled = !projectsUnlocked;
  elements.projectsCombinationSelect.disabled = !projectsUnlocked;
  elements.projectsCombinationDeploy.disabled = !projectsUnlocked;
  if (projectsUnlocked) {
    const projectCombinations = projectsAutomation.getCombinations();
    fillSelect(
      elements.projectsPresetSelect,
      projectsAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      projectsAutomation.getSelectedPresetId() || '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.projectsCombinationSelect,
      projectCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      projectsAutomation.getSelectedCombinationId() || '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.projectsPresetDeploy.disabled = !projectsAutomation.getSelectedPresetId();
    elements.projectsCombinationDeploy.disabled = !projectsAutomation.getSelectedCombinationId() || projectsAutomation.getAssignments().length === 0;
  }

  const colonyAutomation = manager.colonyAutomation;
  const colonyUnlocked = manager.hasFeature('automationColony');
  elements.colonySection.style.display = colonyUnlocked ? '' : 'none';
  elements.colonySection.classList.toggle('journal-automation-locked', !colonyUnlocked);
  elements.colonyStatus.textContent = colonyUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.colonyPresetSelect.disabled = !colonyUnlocked;
  elements.colonyPresetDeploy.disabled = !colonyUnlocked;
  elements.colonyCombinationSelect.disabled = !colonyUnlocked;
  elements.colonyCombinationDeploy.disabled = !colonyUnlocked;
  if (colonyUnlocked) {
    const colonyCombinations = colonyAutomation.getCombinations();
    fillSelect(
      elements.colonyPresetSelect,
      colonyAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      colonyAutomation.getSelectedPresetId() || '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.colonyCombinationSelect,
      colonyCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      colonyAutomation.getSelectedCombinationId() || '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.colonyPresetDeploy.disabled = !colonyAutomation.getSelectedPresetId();
    elements.colonyCombinationDeploy.disabled = !colonyAutomation.getSelectedCombinationId() || colonyAutomation.getAssignments().length === 0;
  }

  return true;
}
