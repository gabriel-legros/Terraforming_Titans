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
  autoTravelSection: null,
  autoTravelStatus: null,
  autoTravelPresetSelect: null,
  autoTravelPresetToggle: null,
  scriptingSection: null,
  scriptingStatus: null,
  scriptingSelect: null,
  scriptingToggle: null,
  scriptingPauseButton: null,
  scriptingPlayButton: null,
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

function createSidebarPresetCombinationControls() {
  const presetRow = createSidebarRow();
  presetRow.classList.add('journal-automation-row-stacked');
  const presetLabel = document.createElement('span');
  presetLabel.classList.add('journal-automation-row-label');
  presetLabel.textContent = getSidebarAutomationText('preset', null, 'Preset');
  const presetControls = createSidebarRow();
  const presetSelect = document.createElement('select');
  presetSelect.classList.add('journal-automation-select');
  const presetDeploy = document.createElement('button');
  presetDeploy.type = 'button';
  presetDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  presetDeploy.classList.add('journal-automation-action');
  presetControls.append(presetSelect, presetDeploy);
  presetRow.append(presetLabel, presetControls);

  const comboRow = createSidebarRow();
  comboRow.classList.add('journal-automation-row-stacked');
  const comboLabel = document.createElement('span');
  comboLabel.classList.add('journal-automation-row-label');
  comboLabel.textContent = getSidebarAutomationText('combination', null, 'Combination');
  const comboControls = createSidebarRow();
  const comboSelect = document.createElement('select');
  comboSelect.classList.add('journal-automation-select');
  const comboDeploy = document.createElement('button');
  comboDeploy.type = 'button';
  comboDeploy.textContent = getSidebarAutomationText('deploy', null, 'Deploy');
  comboDeploy.classList.add('journal-automation-action');
  comboControls.append(comboSelect, comboDeploy);
  comboRow.append(comboLabel, comboControls);

  return {
    presetRow,
    presetSelect,
    presetDeploy,
    comboRow,
    comboSelect,
    comboDeploy
  };
}

function buildSidebarAutomationUI() {
  const elements = sidebarAutomationElements;
  const panel = elements.panel;
  if (!panel) {
    return;
  }

  const autoTravel = createSidebarSection(getSidebarAutomationText('autoTravel', null, 'Auto-travel'));
  const autoTravelRow = createSidebarRow();
  const autoTravelPresetSelect = document.createElement('select');
  autoTravelPresetSelect.classList.add('journal-automation-select');
  const autoTravelToggle = createToggleButton({
    onLabel: getSidebarAutomationText('on', null, 'On'),
    offLabel: getSidebarAutomationText('off', null, 'Off'),
    isOn: false
  });
  autoTravelToggle.classList.add('journal-automation-switch');
  autoTravelToggle.title = getSidebarAutomationText('toggleAutoTravelPreset', null, 'Toggle auto-travel preset');
  autoTravel.header.insertBefore(autoTravelToggle, autoTravel.status);
  autoTravelRow.append(autoTravelPresetSelect);
  autoTravel.section.appendChild(autoTravelRow);
  panel.appendChild(autoTravel.section);
  elements.autoTravelSection = autoTravel.section;
  elements.autoTravelStatus = autoTravel.status;
  elements.autoTravelPresetSelect = autoTravelPresetSelect;
  elements.autoTravelPresetToggle = autoTravelToggle;

  const scripting = createSidebarSection(getSidebarAutomationText('scripting', null, 'Scripting'));
  scripting.header.classList.add('journal-scripting-header');
  scripting.title.classList.add('journal-scripting-title');
  const scriptingRow = createSidebarRow();
  const scriptingSelect = document.createElement('select');
  scriptingSelect.classList.add('journal-automation-select');
  const scriptingToggle = createToggleButton({
    onLabel: getSidebarAutomationText('on', null, 'On'),
    offLabel: getSidebarAutomationText('off', null, 'Off'),
    isOn: false
  });
  scriptingToggle.classList.add('journal-automation-switch', 'journal-scripting-master-toggle');
  scriptingToggle.title = getSidebarAutomationText('toggleScripting', null, 'Toggle script automation');
  scripting.header.insertBefore(scriptingToggle, scripting.status);
  const scriptingControls = document.createElement('span');
  scriptingControls.classList.add('journal-scripting-controls', 'worker-priority-container');
  const scriptingPauseButton = document.createElement('span');
  scriptingPauseButton.classList.add('journal-scripting-control-button', 'worker-priority-btn');
  scriptingPauseButton.textContent = '⏸';
  scriptingPauseButton.title = getSidebarAutomationText('pauseScripting', null, 'Pause scripting');
  const scriptingPlayButton = document.createElement('span');
  scriptingPlayButton.classList.add('journal-scripting-control-button', 'worker-priority-btn');
  scriptingPlayButton.textContent = '▶';
  scriptingPlayButton.title = getSidebarAutomationText('playScripting', null, 'Play scripting');
  scriptingControls.append(scriptingPauseButton, scriptingPlayButton);
  scripting.header.insertBefore(scriptingControls, scripting.status);
  scriptingRow.append(scriptingSelect);
  scripting.section.appendChild(scriptingRow);
  panel.appendChild(scripting.section);
  elements.scriptingSection = scripting.section;
  elements.scriptingStatus = scripting.status;
  elements.scriptingSelect = scriptingSelect;
  elements.scriptingToggle = scriptingToggle;
  elements.scriptingPauseButton = scriptingPauseButton;
  elements.scriptingPlayButton = scriptingPlayButton;

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
  const buildingsControls = createSidebarPresetCombinationControls();
  buildings.section.append(buildingsControls.presetRow, buildingsControls.comboRow);
  panel.appendChild(buildings.section);
  elements.buildingsSection = buildings.section;
  elements.buildingsStatus = buildings.status;
  elements.buildingsPresetSelect = buildingsControls.presetSelect;
  elements.buildingsPresetDeploy = buildingsControls.presetDeploy;
  elements.buildingsCombinationSelect = buildingsControls.comboSelect;
  elements.buildingsCombinationDeploy = buildingsControls.comboDeploy;

  const projects = createSidebarSection(getSidebarAutomationText('projects', null, 'Projects'));
  const projectsControls = createSidebarPresetCombinationControls();
  projects.section.append(projectsControls.presetRow, projectsControls.comboRow);
  panel.appendChild(projects.section);
  elements.projectsSection = projects.section;
  elements.projectsStatus = projects.status;
  elements.projectsPresetSelect = projectsControls.presetSelect;
  elements.projectsPresetDeploy = projectsControls.presetDeploy;
  elements.projectsCombinationSelect = projectsControls.comboSelect;
  elements.projectsCombinationDeploy = projectsControls.comboDeploy;

  const colony = createSidebarSection(getSidebarAutomationText('colony', null, 'Colony'));
  const colonyControls = createSidebarPresetCombinationControls();
  colony.section.append(colonyControls.presetRow, colonyControls.comboRow);
  panel.appendChild(colony.section);
  elements.colonySection = colony.section;
  elements.colonyStatus = colony.status;
  elements.colonyPresetSelect = colonyControls.presetSelect;
  elements.colonyPresetDeploy = colonyControls.presetDeploy;
  elements.colonyCombinationSelect = colonyControls.comboSelect;
  elements.colonyCombinationDeploy = colonyControls.comboDeploy;

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
    && (manager.hasFeature('automationAutoTravel')
      || manager.hasFeature('automationShipAssignment')
      || manager.hasFeature('automationLifeDesign')
      || manager.hasFeature('automationResearch')
      || manager.hasFeature('automationBuildings')
      || manager.hasFeature('automationProjects')
      || manager.hasFeature('automationColony')
      || manager.hasFeature('automationScripts')));
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

  sidebarAutomationElements.autoTravelPresetSelect.addEventListener('change', (event) => {
    if (!event.target.value) {
      return;
    }
    automationManager.autoTravelAutomation.setSelectedPresetId(Number(event.target.value));
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.autoTravelPresetToggle.addEventListener('click', () => {
    const automation = automationManager.autoTravelAutomation;
    automation.setEnabled(!automation.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.scriptingSelect.addEventListener('change', (event) => {
    if (!event.target.value) {
      return;
    }
    automationManager.scriptAutomation.setSelectedScriptId(Number(event.target.value));
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.scriptingToggle.addEventListener('click', () => {
    const automation = automationManager.scriptAutomation;
    if (automation.enabled) {
      automation.disable();
    } else {
      automation.enable();
      automationManager.setFeature('automationScripts', true);
    }
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.scriptingPauseButton.addEventListener('click', () => {
    const automation = automationManager.scriptAutomation;
    automation.pause();
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.scriptingPlayButton.addEventListener('click', () => {
    const automation = automationManager.scriptAutomation;
    const script = automation.getSelectedScript();
    if (!script) {
      return;
    }
    if (!automation.enabled) {
      automation.enable();
      automationManager.setFeature('automationScripts', true);
    }
    automation.runScript(script.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.shipPresetSelect.addEventListener('change', (event) => {
    if (!event.target.value) {
      return;
    }
    const id = Number(event.target.value);
    automationManager.spaceshipAutomation.setSelectedPresetId(id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.shipPresetToggle.addEventListener('click', () => {
    const preset = automationManager.spaceshipAutomation.getActivePreset();
    if (!automationItemShowsInSidebar(preset)) {
      return;
    }
    const automation = automationManager.spaceshipAutomation;
    automation.setEnabled(!automation.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.lifePresetSelect.addEventListener('change', (event) => {
    if (!event.target.value) {
      return;
    }
    const id = Number(event.target.value);
    automationManager.lifeAutomation.setSelectedPresetId(id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifePresetToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    if (!automationItemShowsInSidebar(preset)) {
      return;
    }
    const automation = automationManager.lifeAutomation;
    automation.setEnabled(!automation.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifePurchaseToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    if (!automationItemShowsInSidebar(preset)) {
      return;
    }
    automationManager.lifeAutomation.setPurchaseAutomationEnabled(preset.id, !preset.purchaseEnabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.lifeDesignToggle.addEventListener('click', () => {
    const preset = automationManager.lifeAutomation.getActivePreset();
    if (!automationItemShowsInSidebar(preset)) {
      return;
    }
    automationManager.lifeAutomation.setDesignAutomationEnabled(preset.id, !preset.designEnabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });

  sidebarAutomationElements.researchPresetSelect.addEventListener('change', (event) => {
    automationManager.researchAutomation.setSelectedPresetId(event.target.value || null);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  sidebarAutomationElements.researchPresetDeploy.addEventListener('click', () => {
    const preset = automationManager.researchAutomation.getSelectedPreset();
    if (!preset) {
      return;
    }
    automationManager.researchAutomation.applyPresetOnce(preset.id);
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

  const autoTravelAutomation = manager.autoTravelAutomation;
  const autoTravelUnlocked = manager.hasFeature('automationAutoTravel');
  elements.autoTravelSection.style.display = autoTravelUnlocked ? '' : 'none';
  elements.autoTravelSection.classList.toggle('journal-automation-locked', !autoTravelUnlocked);
  elements.autoTravelStatus.textContent = autoTravelUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.autoTravelPresetSelect.disabled = !autoTravelUnlocked;
  elements.autoTravelPresetToggle.disabled = !autoTravelUnlocked;
  if (autoTravelUnlocked) {
    fillSelect(
      elements.autoTravelPresetSelect,
      autoTravelAutomation.presets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      autoTravelAutomation.selectedPresetId || '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    setToggleButtonState(elements.autoTravelPresetToggle, !!autoTravelAutomation.enabled);
  }

  const scriptAutomation = manager.scriptAutomation;
  const scriptingUnlocked = manager.hasFeature('automationScripts') || scriptAutomation.enabled;
  elements.scriptingSection.style.display = scriptingUnlocked ? '' : 'none';
  elements.scriptingSection.classList.toggle('journal-automation-locked', !scriptingUnlocked);
  elements.scriptingStatus.textContent = scriptingUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.scriptingSelect.disabled = !scriptingUnlocked;
  elements.scriptingToggle.disabled = !scriptingUnlocked;
  elements.scriptingPauseButton.classList.toggle('disabled', !scriptingUnlocked);
  elements.scriptingPlayButton.classList.toggle('disabled', !scriptingUnlocked);
  if (scriptingUnlocked) {
    fillSelect(
      elements.scriptingSelect,
      scriptAutomation.scripts.map(script => ({
        value: script.id,
        label: script.name || getSidebarAutomationText('scriptWithId', { id: script.id }, `Script ${script.id}`)
      })),
      scriptAutomation.selectedScriptId || '',
      getSidebarAutomationText('selectScript', null, 'Select script')
    );
    setToggleButtonState(elements.scriptingToggle, !!scriptAutomation.enabled);
    const scriptRunning = scriptAutomation.enabled && scriptAutomation.running;
    elements.scriptingPauseButton.classList.toggle('active', !scriptRunning);
    elements.scriptingPlayButton.classList.toggle('active', scriptRunning);
  } else {
    elements.scriptingPauseButton.classList.remove('active');
    elements.scriptingPlayButton.classList.remove('active');
  }

  const shipAutomation = manager.spaceshipAutomation;
  const shipUnlocked = manager.hasFeature('automationShipAssignment');
  elements.shipSection.style.display = shipUnlocked ? '' : 'none';
  elements.shipSection.classList.toggle('journal-automation-locked', !shipUnlocked);
  elements.shipStatus.textContent = shipUnlocked ? '' : t('ui.common.locked', null, 'Locked');
  elements.shipPresetSelect.disabled = !shipUnlocked;
  elements.shipPresetToggle.disabled = !shipUnlocked;
  if (shipUnlocked) {
    const visibleShipPresets = shipAutomation.presets.filter(automationItemShowsInSidebar);
    const selectedShipPreset = shipAutomation.getSelectedPreset();
    fillSelect(
      elements.shipPresetSelect,
      visibleShipPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedShipPreset) ? shipAutomation.getSelectedPresetId() : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    const activePreset = shipAutomation.getActivePreset();
    elements.shipPresetToggle.disabled = !automationItemShowsInSidebar(activePreset);
    setToggleButtonState(elements.shipPresetToggle, !!shipAutomation.enabled);
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
    const visibleLifePresets = lifeAutomation.presets.filter(automationItemShowsInSidebar);
    const selectedLifePreset = lifeAutomation.getSelectedPreset();
    fillSelect(
      elements.lifePresetSelect,
      visibleLifePresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedLifePreset) ? lifeAutomation.getSelectedPresetId() : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    const activePreset = lifeAutomation.getActivePreset();
    const activeLifePresetVisible = automationItemShowsInSidebar(activePreset);
    elements.lifePresetToggle.disabled = !activeLifePresetVisible;
    elements.lifePurchaseToggle.disabled = !activeLifePresetVisible;
    elements.lifeDesignToggle.disabled = !activeLifePresetVisible;
    setToggleButtonState(elements.lifePresetToggle, !!lifeAutomation.enabled);
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
    const researchAutomation = manager.researchAutomation;
    const visibleResearchPresets = researchAutomation.presets.filter(automationItemShowsInSidebar);
    const selectedResearchPreset = researchAutomation.getSelectedPreset();
    fillSelect(
      elements.researchPresetSelect,
      visibleResearchPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedResearchPreset) ? researchAutomation.getSelectedPresetId() : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    elements.researchPresetDeploy.disabled = !automationItemShowsInSidebar(selectedResearchPreset);
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
    const visibleBuildingPresets = buildingAutomation.presets.filter(automationItemShowsInSidebar);
    const buildingCombinations = buildingAutomation.getCombinations().filter(automationItemShowsInSidebar);
    const selectedBuildingPreset = buildingAutomation.getSelectedPreset();
    const selectedBuildingCombination = buildingAutomation.getSelectedCombination();
    fillSelect(
      elements.buildingsPresetSelect,
      visibleBuildingPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedBuildingPreset) ? buildingAutomation.getSelectedPresetId() || '' : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.buildingsCombinationSelect,
      buildingCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      automationItemShowsInSidebar(selectedBuildingCombination) ? buildingAutomation.getSelectedCombinationId() || '' : '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.buildingsPresetDeploy.disabled = !automationItemShowsInSidebar(selectedBuildingPreset);
    elements.buildingsCombinationDeploy.disabled = !automationItemShowsInSidebar(selectedBuildingCombination) || buildingAutomation.getAssignments().length === 0;
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
    const visibleProjectPresets = projectsAutomation.presets.filter(automationItemShowsInSidebar);
    const projectCombinations = projectsAutomation.getCombinations().filter(automationItemShowsInSidebar);
    const selectedProjectPreset = projectsAutomation.getSelectedPreset();
    const selectedProjectCombination = projectsAutomation.getSelectedCombination();
    fillSelect(
      elements.projectsPresetSelect,
      visibleProjectPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedProjectPreset) ? projectsAutomation.getSelectedPresetId() || '' : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.projectsCombinationSelect,
      projectCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      automationItemShowsInSidebar(selectedProjectCombination) ? projectsAutomation.getSelectedCombinationId() || '' : '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.projectsPresetDeploy.disabled = !automationItemShowsInSidebar(selectedProjectPreset);
    elements.projectsCombinationDeploy.disabled = !automationItemShowsInSidebar(selectedProjectCombination) || projectsAutomation.getAssignments().length === 0;
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
    const visibleColonyPresets = colonyAutomation.presets.filter(automationItemShowsInSidebar);
    const colonyCombinations = colonyAutomation.getCombinations().filter(automationItemShowsInSidebar);
    const selectedColonyPreset = colonyAutomation.getSelectedPreset();
    const selectedColonyCombination = colonyAutomation.getSelectedCombination();
    fillSelect(
      elements.colonyPresetSelect,
      visibleColonyPresets.map(preset => ({ value: preset.id, label: getSidebarPresetLabel(preset) })),
      automationItemShowsInSidebar(selectedColonyPreset) ? colonyAutomation.getSelectedPresetId() || '' : '',
      getSidebarAutomationText('selectPreset', null, 'Select preset')
    );
    fillSelect(
      elements.colonyCombinationSelect,
      colonyCombinations.map(combo => ({ value: combo.id, label: getSidebarCombinationLabel(combo) })),
      automationItemShowsInSidebar(selectedColonyCombination) ? colonyAutomation.getSelectedCombinationId() || '' : '',
      getSidebarAutomationText('selectCombination', null, 'Select combination')
    );
    elements.colonyPresetDeploy.disabled = !automationItemShowsInSidebar(selectedColonyPreset);
    elements.colonyCombinationDeploy.disabled = !automationItemShowsInSidebar(selectedColonyCombination) || colonyAutomation.getAssignments().length === 0;
  }

  return true;
}
