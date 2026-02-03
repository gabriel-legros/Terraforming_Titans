let automationTabVisible = false;
let automationUIInitialized = false;
let automationUIStale = true;
const automationElements = {
  tab: null,
  content: null,
  shipAssignment: null,
  shipAssignmentStatus: null,
  shipAssignmentDescription: null,
  collapseButton: null,
  panelBody: null,
  presetSelect: null,
  presetNameInput: null,
  newPresetButton: null,
  deletePresetButton: null,
  enablePresetCheckbox: null,
  stepsContainer: null,
  addStepButton: null,
  lifeDesign: null,
  lifeDesignStatus: null,
  lifeDesignDescription: null,
  lifeCollapseButton: null,
  lifePanelBody: null,
  lifePresetSelect: null,
  lifePresetNameInput: null,
  lifeNewPresetButton: null,
  lifeDeletePresetButton: null,
  lifeEnablePresetCheckbox: null,
  lifePurchaseContainer: null,
  lifePurchaseEnableCheckbox: null,
  lifeDesignStepsContainer: null,
  lifeAddStepButton: null,
  lifeDeployInput: null,
  lifeSeedRow: null,
  lifeSeedButton: null,
  lifeDesignEnableCheckbox: null,
  lifeDeployNowButton: null,
  buildingsAutomation: null,
  buildingsAutomationStatus: null,
  buildingsAutomationDescription: null,
  buildingsCollapseButton: null,
  buildingsPanelBody: null,
  buildingsBuilderPresetSelect: null,
  buildingsBuilderPresetNameInput: null,
  buildingsBuilderNewButton: null,
  buildingsBuilderSaveButton: null,
  buildingsBuilderDeleteButton: null,
  buildingsBuilderApplyOnceButton: null,
  buildingsBuilderTypeSelect: null,
  buildingsBuilderScopeSelect: null,
  buildingsBuilderCategorySelect: null,
  buildingsBuilderBuildingSelect: null,
  buildingsBuilderAddButton: null,
  buildingsBuilderAddCategoryButton: null,
  buildingsBuilderClearButton: null,
  buildingsBuilderSelectedList: null,
  buildingsApplyList: null,
  buildingsApplyHint: null,
  buildingsApplyCombinationButton: null,
  buildingsApplyNextTravelSelect: null,
  buildingsCombinationSelect: null,
  buildingsCombinationNameInput: null,
  buildingsCombinationNewButton: null,
  buildingsCombinationSaveButton: null,
  buildingsCombinationDeleteButton: null,
  buildingsAddApplyButton: null
};

function queueAutomationUIRefresh() {
  automationUIStale = true;
}

function cacheAutomationElements() {
  if (typeof document === 'undefined') return;
  if (!automationElements.tab) {
    automationElements.tab = document.querySelector('.hope-subtab[data-subtab="automation-hope"]');
  }
  if (!automationElements.content) {
    automationElements.content = document.getElementById('automation-hope');
  }
  if (!automationElements.shipAssignment) {
    automationElements.shipAssignment = document.getElementById('automation-ship-assignment');
  }
  if (!automationElements.shipAssignmentStatus) {
    automationElements.shipAssignmentStatus = document.getElementById('automation-ship-assignment-status');
  }
  if (!automationElements.shipAssignmentDescription) {
    automationElements.shipAssignmentDescription = document.getElementById('automation-ship-assignment-description');
  }
  if (!automationElements.collapseButton && automationElements.shipAssignment) {
    automationElements.collapseButton = automationElements.shipAssignment.querySelector('.automation-collapse');
  }
  if (!automationElements.panelBody && automationElements.shipAssignment) {
    automationElements.panelBody = automationElements.shipAssignment.querySelector('.automation-body');
  }
  if (!automationElements.presetSelect && automationElements.shipAssignment) {
    automationElements.presetSelect = automationElements.shipAssignment.querySelector('.automation-preset-select');
  }
  if (!automationElements.presetNameInput && automationElements.shipAssignment) {
    automationElements.presetNameInput = automationElements.shipAssignment.querySelector('.automation-preset-name');
  }
  if (!automationElements.newPresetButton && automationElements.shipAssignment) {
    automationElements.newPresetButton = automationElements.shipAssignment.querySelector('.automation-preset-new');
  }
  if (!automationElements.deletePresetButton && automationElements.shipAssignment) {
    automationElements.deletePresetButton = automationElements.shipAssignment.querySelector('.automation-preset-delete');
  }
  if (!automationElements.enablePresetCheckbox && automationElements.shipAssignment) {
    automationElements.enablePresetCheckbox = automationElements.shipAssignment.querySelector('.automation-preset-toggle');
  }
  if (!automationElements.stepsContainer && automationElements.shipAssignment) {
    automationElements.stepsContainer = automationElements.shipAssignment.querySelector('.automation-steps');
  }
  if (!automationElements.addStepButton && automationElements.shipAssignment) {
    automationElements.addStepButton = automationElements.shipAssignment.querySelector('.automation-add-step');
  }
  if (!automationElements.lifeDesign) {
    automationElements.lifeDesign = document.getElementById('automation-life-design');
  }
  if (!automationElements.lifeDesignStatus) {
    automationElements.lifeDesignStatus = document.getElementById('automation-life-design-status');
  }
  if (!automationElements.lifeDesignDescription) {
    automationElements.lifeDesignDescription = document.getElementById('automation-life-design-description');
  }
  if (!automationElements.lifeCollapseButton && automationElements.lifeDesign) {
    automationElements.lifeCollapseButton = automationElements.lifeDesign.querySelector('.automation-collapse');
  }
  if (!automationElements.lifePanelBody && automationElements.lifeDesign) {
    automationElements.lifePanelBody = automationElements.lifeDesign.querySelector('.automation-body');
  }
  if (!automationElements.lifePresetSelect && automationElements.lifeDesign) {
    automationElements.lifePresetSelect = automationElements.lifeDesign.querySelector('.automation-preset-select');
  }
  if (!automationElements.lifePresetNameInput && automationElements.lifeDesign) {
    automationElements.lifePresetNameInput = automationElements.lifeDesign.querySelector('.automation-preset-name');
  }
  if (!automationElements.lifeNewPresetButton && automationElements.lifeDesign) {
    automationElements.lifeNewPresetButton = automationElements.lifeDesign.querySelector('.automation-preset-new');
  }
  if (!automationElements.lifeDeletePresetButton && automationElements.lifeDesign) {
    automationElements.lifeDeletePresetButton = automationElements.lifeDesign.querySelector('.automation-preset-delete');
  }
  if (!automationElements.lifeEnablePresetCheckbox && automationElements.lifeDesign) {
    automationElements.lifeEnablePresetCheckbox = automationElements.lifeDesign.querySelector('.automation-preset-toggle');
  }
  if (!automationElements.lifePurchaseContainer && automationElements.lifeDesign) {
    automationElements.lifePurchaseContainer = automationElements.lifeDesign.querySelector('.life-automation-purchase-list');
  }
  if (!automationElements.lifePurchaseEnableCheckbox && automationElements.lifeDesign) {
    automationElements.lifePurchaseEnableCheckbox = automationElements.lifeDesign.querySelector('.life-automation-purchase-toggle');
  }
  if (!automationElements.lifeDesignStepsContainer && automationElements.lifeDesign) {
    automationElements.lifeDesignStepsContainer = automationElements.lifeDesign.querySelector('.life-automation-steps');
  }
  if (!automationElements.lifeAddStepButton && automationElements.lifeDesign) {
    automationElements.lifeAddStepButton = automationElements.lifeDesign.querySelector('.automation-add-step');
  }
  if (!automationElements.lifeDeployInput && automationElements.lifeDesign) {
    automationElements.lifeDeployInput = automationElements.lifeDesign.querySelector('.life-automation-deploy-input');
  }
  if (!automationElements.lifeSeedRow && automationElements.lifeDesign) {
    automationElements.lifeSeedRow = automationElements.lifeDesign.querySelector('.life-automation-seed-row');
  }
  if (!automationElements.lifeSeedButton && automationElements.lifeDesign) {
    automationElements.lifeSeedButton = automationElements.lifeDesign.querySelector('.life-automation-seed-button');
  }
  if (!automationElements.lifeDesignEnableCheckbox && automationElements.lifeDesign) {
    automationElements.lifeDesignEnableCheckbox = automationElements.lifeDesign.querySelector('.life-automation-design-toggle');
  }
  if (!automationElements.lifeDeployNowButton && automationElements.lifeDesign) {
    automationElements.lifeDeployNowButton = automationElements.lifeDesign.querySelector('.life-automation-deploy-now');
  }
  if (!automationElements.buildingsAutomation) {
    automationElements.buildingsAutomation = document.getElementById('automation-buildings');
  }
  if (!automationElements.buildingsAutomationStatus) {
    automationElements.buildingsAutomationStatus = document.getElementById('automation-buildings-status');
  }
  if (!automationElements.buildingsAutomationDescription) {
    automationElements.buildingsAutomationDescription = document.getElementById('automation-buildings-description');
  }
  if (!automationElements.buildingsCollapseButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCollapseButton = automationElements.buildingsAutomation.querySelector('.automation-collapse');
  }
  if (!automationElements.buildingsPanelBody && automationElements.buildingsAutomation) {
    automationElements.buildingsPanelBody = automationElements.buildingsAutomation.querySelector('.automation-body');
  }
  if (!automationElements.buildingsBuilderPresetSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderPresetSelect = automationElements.buildingsAutomation.querySelector('.building-automation-builder-select');
  }
  if (!automationElements.buildingsBuilderPresetNameInput && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderPresetNameInput = automationElements.buildingsAutomation.querySelector('.building-automation-builder-name');
  }
  if (!automationElements.buildingsBuilderNewButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderNewButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-new');
  }
  if (!automationElements.buildingsBuilderSaveButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderSaveButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-save');
  }
  if (!automationElements.buildingsBuilderDeleteButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderDeleteButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-delete');
  }
  if (!automationElements.buildingsBuilderApplyOnceButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderApplyOnceButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-apply-once');
  }
  if (!automationElements.buildingsBuilderTypeSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderTypeSelect = automationElements.buildingsAutomation.querySelector('.building-automation-builder-type');
  }
  if (!automationElements.buildingsBuilderScopeSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderScopeSelect = automationElements.buildingsAutomation.querySelector('.building-automation-builder-scope');
  }
  if (!automationElements.buildingsBuilderCategorySelect && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderCategorySelect = automationElements.buildingsAutomation.querySelector('.building-automation-builder-category');
  }
  if (!automationElements.buildingsBuilderBuildingSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderBuildingSelect = automationElements.buildingsAutomation.querySelector('.building-automation-builder-building');
  }
  if (!automationElements.buildingsBuilderAddButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderAddButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-add');
  }
  if (!automationElements.buildingsBuilderAddCategoryButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderAddCategoryButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-add-category');
  }
  if (!automationElements.buildingsBuilderClearButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderClearButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-clear');
  }
  if (!automationElements.buildingsBuilderSelectedList && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderSelectedList = automationElements.buildingsAutomation.querySelector('.building-automation-builder-list');
  }
  if (!automationElements.buildingsApplyList && automationElements.buildingsAutomation) {
    automationElements.buildingsApplyList = automationElements.buildingsAutomation.querySelector('.building-automation-apply-list');
  }
  if (!automationElements.buildingsApplyHint && automationElements.buildingsAutomation) {
    automationElements.buildingsApplyHint = automationElements.buildingsAutomation.querySelector('.building-automation-apply-hint');
  }
  if (!automationElements.buildingsApplyCombinationButton && automationElements.buildingsAutomation) {
    automationElements.buildingsApplyCombinationButton = automationElements.buildingsAutomation.querySelector('.building-automation-apply-combination');
  }
  if (!automationElements.buildingsApplyNextTravelSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsApplyNextTravelSelect = automationElements.buildingsAutomation.querySelector('.building-automation-next-travel-select');
  }
  if (!automationElements.buildingsCombinationSelect && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationSelect = automationElements.buildingsAutomation.querySelector('.building-automation-combination-select');
  }
  if (!automationElements.buildingsCombinationNameInput && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationNameInput = automationElements.buildingsAutomation.querySelector('.building-automation-combination-name');
  }
  if (!automationElements.buildingsCombinationNewButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationNewButton = automationElements.buildingsAutomation.querySelector('.building-automation-combination-new');
  }
  if (!automationElements.buildingsCombinationSaveButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationSaveButton = automationElements.buildingsAutomation.querySelector('.building-automation-combination-save');
  }
  if (!automationElements.buildingsCombinationDeleteButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationDeleteButton = automationElements.buildingsAutomation.querySelector('.building-automation-combination-delete');
  }
  if (!automationElements.buildingsAddApplyButton && automationElements.buildingsAutomation) {
    automationElements.buildingsAddApplyButton = automationElements.buildingsAutomation.querySelector('.building-automation-apply-add');
  }
}

function createAutomationCardHeader(card, titleText, onToggle) {
  const header = card.querySelector('.automation-card-header');
  header.textContent = '';
  const titleGroup = document.createElement('div');
  titleGroup.classList.add('automation-title-group');
  const collapse = document.createElement('button');
  collapse.classList.add('automation-collapse');
  collapse.textContent = '▼';
  collapse.title = 'Toggle';
  const title = document.createElement('div');
  title.classList.add('automation-title');
  title.textContent = titleText;
  titleGroup.append(collapse, title);
  header.appendChild(titleGroup);
  titleGroup.addEventListener('click', onToggle);
  collapse.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggle();
  });
  return { collapse, titleGroup };
}

function createAutomationPresetRow(body) {
  const presetRow = document.createElement('div');
  presetRow.classList.add('automation-preset-row');
  body.appendChild(presetRow);

  const presetSelect = document.createElement('select');
  presetSelect.classList.add('automation-preset-select');
  presetRow.appendChild(presetSelect);

  const presetName = document.createElement('input');
  presetName.type = 'text';
  presetName.placeholder = 'Preset name';
  presetName.classList.add('automation-preset-name');
  presetRow.appendChild(presetName);

  const enableToggle = createAutomationToggle('Preset On', 'Preset Off');
  enableToggle.classList.add('automation-preset-toggle');
  presetRow.appendChild(enableToggle);

  const presetButtons = document.createElement('div');
  presetButtons.classList.add('automation-preset-buttons');
  const newPreset = document.createElement('button');
  newPreset.textContent = '+ Preset';
  newPreset.classList.add('automation-preset-new');
  const deletePreset = document.createElement('button');
  deletePreset.textContent = 'Delete';
  deletePreset.classList.add('automation-preset-delete');
  presetButtons.append(newPreset, deletePreset);
  presetRow.appendChild(presetButtons);

  return {
    presetRow,
    presetSelect,
    presetName,
    enableCheckbox: enableToggle,
    newPreset,
    deletePreset
  };
}

function createAutomationToggle(onLabel, offLabel) {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('automation-toggle');
  toggle.dataset.onLabel = onLabel;
  toggle.dataset.offLabel = offLabel;
  const track = document.createElement('span');
  track.classList.add('automation-toggle__track');
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  thumb.classList.add('automation-toggle__thumb');
  track.appendChild(thumb);
  const label = document.createElement('span');
  label.classList.add('automation-toggle__label');
  toggle.append(track, label);
  setAutomationToggleState(toggle, false);
  return toggle;
}

function setAutomationToggleState(toggle, enabled) {
  toggle.classList.toggle('is-on', !!enabled);
  toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  const label = toggle.querySelector('.automation-toggle__label');
  const onLabel = toggle.dataset.onLabel || 'On';
  const offLabel = toggle.dataset.offLabel || 'Off';
  if (label) {
    label.textContent = enabled ? onLabel : offLabel;
  }
}

function showAutomationTab() {
  automationTabVisible = true;
  cacheAutomationElements();
  const { tab, content } = automationElements;
  if (hopeSubtabManager) {
    hopeSubtabManager.show('automation-hope');
  } else {
    if (tab) tab.classList.remove('hidden');
    if (content) content.classList.remove('hidden');
  }
}

function hideAutomationTab() {
  automationTabVisible = false;
  cacheAutomationElements();
  const { tab, content } = automationElements;
  if (hopeSubtabManager) {
    hopeSubtabManager.hide('automation-hope');
  } else {
    if (tab) tab.classList.add('hidden');
    if (content) content.classList.add('hidden');
  }
  if (content && content.classList.contains('active') && typeof activateHopeSubtab === 'function') {
    activateHopeSubtab('awakening-hope');
  }
}

function initializeAutomationUI() {
  if (automationUIInitialized) {
    return;
  }
  cacheAutomationElements();
  buildAutomationShipUI();
  buildAutomationLifeUI();
  buildAutomationBuildingsUI();
  hideAutomationTab();
  automationUIInitialized = true;
  automationUIStale = true;
  updateAutomationUI();
}

function updateAutomationVisibility() {
  cacheAutomationElements();
  const managerEnabled = !!(automationManager && automationManager.enabled);
  if (managerEnabled) {
    if (!automationTabVisible) {
      showAutomationTab();
    }
  } else if (automationTabVisible) {
    hideAutomationTab();
  }
  const { content } = automationElements;
  if (content) {
    content.classList.toggle('hidden', !managerEnabled);
  }
}

function updateAutomationUI() {
  if (!automationUIStale) return;
  automationUIStale = false;
  cacheAutomationElements();
  updateShipAutomationUI();
  updateLifeAutomationUI();
  updateBuildingsAutomationUI();
  updateSidebarAutomationUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeAutomationUI, updateAutomationVisibility, updateAutomationUI, queueAutomationUIRefresh };
}
