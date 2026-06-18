let automationTabVisible = false;
let automationUIInitialized = false;
let automationUIStale = true;
let automationPanelWasActive = false;
const automationPresetJsonDraftStore = {};
const AUTOMATION_CARD_ORDER_KEYS = [
  'autoTravel',
  'scripts',
  'ships',
  'life',
  'research',
  'buildings',
  'projects',
  'colony'
];
const automationElements = {
  tab: null,
  content: null,
  container: null,
  autoTravel: null,
  autoTravelStatus: null,
  autoTravelCollapseButton: null,
  autoTravelPanelBody: null,
  autoTravelMasterToggle: null,
  autoTravelPresetSelect: null,
  autoTravelPresetUsage: null,
  autoTravelPresetNameInput: null,
  autoTravelNewPresetButton: null,
  autoTravelDeletePresetButton: null,
  autoTravelImportPresetButton: null,
  autoTravelExportPresetButton: null,
  autoTravelTargetSelect: null,
  autoTravelTypeSelect: null,
  autoTravelOrbitSelect: null,
  autoTravelDominionSelect: null,
  autoTravelHazardsWrap: null,
  autoTravelAutoCompleteToggle: null,
  autoTravelWaitSpecializationToggle: null,
  autoTravelBlockIfNoStoredToggle: null,
  autoTravelSkipEquilibrationToggle: null,
  autoTravelSkipVisualizerToggle: null,
  scriptAutomation: null,
  scriptAutomationStatus: null,
  scriptCollapseButton: null,
  scriptPanelBody: null,
  scriptMasterToggle: null,
  scriptRunButton: null,
  scriptPauseButton: null,
  scriptStepButton: null,
  scriptResetButton: null,
  scriptAutoRestartToggle: null,
  scriptGoToRowOneOnTravelToggle: null,
  scriptStatusLine: null,
  scriptSelect: null,
  scriptNameInput: null,
  scriptNewButton: null,
  scriptDuplicateButton: null,
  scriptDeleteButton: null,
  scriptLinesContainer: null,
  scriptAddLineButton: null,
  scriptImportButton: null,
  scriptExportButton: null,
  shipAssignment: null,
  shipAssignmentStatus: null,
  shipAssignmentDescription: null,
  collapseButton: null,
  panelBody: null,
  presetSelect: null,
  shipPresetUsage: null,
  presetMoveUpButton: null,
  presetMoveDownButton: null,
  presetNameInput: null,
  newPresetButton: null,
  deletePresetButton: null,
  enablePresetCheckbox: null,
  showPresetInSidebarCheckbox: null,
  stepsContainer: null,
  addStepButton: null,
  shipImportPresetButton: null,
  shipExportPresetButton: null,
  lifeDesign: null,
  lifeDesignStatus: null,
  lifeDesignDescription: null,
  lifeCollapseButton: null,
  lifePanelBody: null,
  lifePresetSelect: null,
  lifePresetUsage: null,
  lifePresetMoveUpButton: null,
  lifePresetMoveDownButton: null,
  lifePresetNameInput: null,
  lifeNewPresetButton: null,
  lifeDeletePresetButton: null,
  lifeEnablePresetCheckbox: null,
  lifeShowPresetInSidebarCheckbox: null,
  lifePurchaseContainer: null,
  lifePurchaseEnableCheckbox: null,
  lifeDesignStepsContainer: null,
  lifeAddStepButton: null,
  lifeDeployInput: null,
  lifeSeedRow: null,
  lifeSeedButton: null,
  lifeDesignEnableCheckbox: null,
  lifeDeployNowButton: null,
  lifeImportPresetButton: null,
  lifeExportPresetButton: null,
  globalExportButton: null,
  globalImportButton: null,
  researchAutomation: null,
  researchAutomationStatus: null,
  researchAutomationDescription: null,
  researchCollapseButton: null,
  researchPanelBody: null,
  researchPresetSelect: null,
  researchPresetMoveUpButton: null,
  researchPresetMoveDownButton: null,
  researchPresetNameInput: null,
  researchNewPresetButton: null,
  researchSavePresetButton: null,
  researchDuplicatePresetButton: null,
  researchDeletePresetButton: null,
  researchImportPresetButton: null,
  researchExportPresetButton: null,
  researchApplyOnceButton: null,
  researchShowPresetInSidebarCheckbox: null,
  researchApplyNextTravelSelect: null,
  researchApplyNextTravelPersistToggle: null,
  researchPresetJsonDetails: null,
  researchPresetUsage: null,
  buildingsAutomation: null,
  buildingsAutomationStatus: null,
  buildingsAutomationDescription: null,
  buildingsCollapseButton: null,
  buildingsPanelBody: null,
  buildingsBuilderPresetSelect: null,
  buildingsBuilderMoveUpButton: null,
  buildingsBuilderMoveDownButton: null,
  buildingsBuilderPresetNameInput: null,
  buildingsBuilderNewButton: null,
  buildingsBuilderSaveButton: null,
  buildingsBuilderDuplicateButton: null,
  buildingsBuilderDeleteButton: null,
  buildingsBuilderImportButton: null,
  buildingsBuilderExportButton: null,
  buildingsBuilderApplyOnceButton: null,
  buildingsBuilderShowInSidebarCheckbox: null,
  buildingsBuilderTypeSelect: null,
  buildingsBuilderScopeSelect: null,
  buildingsBuilderCategorySelect: null,
  buildingsBuilderBuildingSelect: null,
  buildingsBuilderAddButton: null,
  buildingsBuilderAddCategoryButton: null,
  buildingsBuilderClearButton: null,
  buildingsBuilderSelectedList: null,
  buildingsPresetJsonDetails: null,
  buildingsPresetUsage: null,
  buildingsApplyList: null,
  buildingsApplyHint: null,
  buildingsApplyCombinationButton: null,
  buildingsApplyNextTravelSelect: null,
  buildingsApplyNextTravelPersistToggle: null,
  buildingsCombinationSelect: null,
  buildingsCombinationMoveUpButton: null,
  buildingsCombinationMoveDownButton: null,
  buildingsCombinationNameInput: null,
  buildingsCombinationNewButton: null,
  buildingsCombinationSaveButton: null,
  buildingsCombinationDeleteButton: null,
  buildingsCombinationShowInSidebarCheckbox: null,
  buildingsAddApplyButton: null,
  projectsAutomation: null,
  projectsAutomationStatus: null,
  projectsAutomationDescription: null,
  projectsCollapseButton: null,
  projectsPanelBody: null,
  projectsBuilderPresetSelect: null,
  projectsBuilderMoveUpButton: null,
  projectsBuilderMoveDownButton: null,
  projectsBuilderPresetNameInput: null,
  projectsBuilderNewButton: null,
  projectsBuilderSaveButton: null,
  projectsBuilderDuplicateButton: null,
  projectsBuilderDeleteButton: null,
  projectsBuilderImportButton: null,
  projectsBuilderExportButton: null,
  projectsBuilderApplyOnceButton: null,
  projectsBuilderShowInSidebarCheckbox: null,
  projectsBuilderScopeSelect: null,
  projectsBuilderCategorySelect: null,
  projectsBuilderProjectSelect: null,
  projectsBuilderAddButton: null,
  projectsBuilderAddCategoryButton: null,
  projectsBuilderClearButton: null,
  projectsBuilderSelectedList: null,
  projectsPresetJsonDetails: null,
  projectsPresetUsage: null,
  projectsApplyList: null,
  projectsApplyHint: null,
  projectsApplyCombinationButton: null,
  projectsApplyNextTravelSelect: null,
  projectsApplyNextTravelPersistToggle: null,
  projectsCombinationSelect: null,
  projectsCombinationMoveUpButton: null,
  projectsCombinationMoveDownButton: null,
  projectsCombinationNameInput: null,
  projectsCombinationNewButton: null,
  projectsCombinationSaveButton: null,
  projectsCombinationDeleteButton: null,
  projectsCombinationShowInSidebarCheckbox: null,
  projectsAddApplyButton: null,
  colonyAutomation: null,
  colonyAutomationStatus: null,
  colonyAutomationDescription: null,
  colonyCollapseButton: null,
  colonyPanelBody: null,
  colonyBuilderPresetSelect: null,
  colonyBuilderMoveUpButton: null,
  colonyBuilderMoveDownButton: null,
  colonyBuilderPresetNameInput: null,
  colonyBuilderNewButton: null,
  colonyBuilderSaveButton: null,
  colonyBuilderDuplicateButton: null,
  colonyBuilderDeleteButton: null,
  colonyBuilderImportButton: null,
  colonyBuilderExportButton: null,
  colonyBuilderApplyOnceButton: null,
  colonyBuilderShowInSidebarCheckbox: null,
  colonyBuilderDirty: null,
  colonyBuilderTypeSelect: null,
  colonyBuilderScopeSelect: null,
  colonyBuilderCategorySelect: null,
  colonyBuilderTargetSelect: null,
  colonyBuilderAddButton: null,
  colonyBuilderAddCategoryButton: null,
  colonyBuilderClearButton: null,
  colonyBuilderSelectedList: null,
  colonyPresetJsonDetails: null,
  colonyPresetUsage: null,
  colonyApplyList: null,
  colonyApplyHint: null,
  colonyApplyCombinationButton: null,
  colonyApplyNextTravelSelect: null,
  colonyApplyNextTravelPersistToggle: null,
  colonyCombinationSelect: null,
  colonyCombinationMoveUpButton: null,
  colonyCombinationMoveDownButton: null,
  colonyCombinationNameInput: null,
  colonyCombinationNewButton: null,
  colonyCombinationSaveButton: null,
  colonyCombinationDeleteButton: null,
  colonyCombinationShowInSidebarCheckbox: null,
  colonyAddApplyButton: null
};

const AUTOMATION_PRESET_TRANSFER_FORMAT = 'terraforming-titans-automation-preset';
const AUTOMATION_PRESET_TRANSFER_VERSION = 1;
let automationPresetImportDialog = null;

function queueAutomationUIRefresh() {
  automationUIStale = true;
}

function getAutomationCardElementByKey(cardKey) {
  if (cardKey === 'autoTravel') {
    return automationElements.autoTravel;
  }
  if (cardKey === 'scripts') {
    return automationElements.scriptAutomation;
  }
  if (cardKey === 'ships') {
    return automationElements.shipAssignment;
  }
  if (cardKey === 'life') {
    return automationElements.lifeDesign;
  }
  if (cardKey === 'research') {
    return automationElements.researchAutomation;
  }
  if (cardKey === 'buildings') {
    return automationElements.buildingsAutomation;
  }
  if (cardKey === 'projects') {
    return automationElements.projectsAutomation;
  }
  if (cardKey === 'colony') {
    return automationElements.colonyAutomation;
  }
  return null;
}

function getAutomationCardKeyFromElement(card) {
  if (!card || !card.id) {
    return null;
  }
  if (card.id === 'automation-scripts') {
    return 'scripts';
  }
  if (card.id === 'automation-auto-travel') {
    return 'autoTravel';
  }
  if (card.id === 'automation-ship-assignment') {
    return 'ships';
  }
  if (card.id === 'automation-life-design') {
    return 'life';
  }
  if (card.id === 'automation-research') {
    return 'research';
  }
  if (card.id === 'automation-buildings') {
    return 'buildings';
  }
  if (card.id === 'automation-projects') {
    return 'projects';
  }
  if (card.id === 'automation-colony') {
    return 'colony';
  }
  return null;
}

function isAutomationCardDisplayed(card) {
  if (!card) {
    return false;
  }
  if (card.classList.contains('hidden')) {
    return false;
  }
  return card.style.display !== 'none';
}

function getVisibleAutomationCardKeys() {
  const visibleKeys = [];
  const container = automationElements.container;
  if (container) {
    for (let index = 0; index < container.children.length; index += 1) {
      const card = container.children[index];
      const cardKey = getAutomationCardKeyFromElement(card);
      if (cardKey && isAutomationCardDisplayed(card)) {
        visibleKeys.push(cardKey);
      }
    }
    return visibleKeys;
  }
  const orderedKeys = automationManager
    ? automationManager.getAutomationCardOrder()
    : AUTOMATION_CARD_ORDER_KEYS;
  for (let index = 0; index < orderedKeys.length; index += 1) {
    const cardKey = orderedKeys[index];
    const card = getAutomationCardElementByKey(cardKey);
    if (isAutomationCardDisplayed(card)) {
      visibleKeys.push(cardKey);
    }
  }
  return visibleKeys;
}

function applyAutomationCardOrder() {
  const container = automationElements.container;
  if (!container || !automationManager) {
    return;
  }
  const orderedKeys = automationManager.getAutomationCardOrder();
  const currentKeys = [];
  for (let index = 0; index < container.children.length; index += 1) {
    const cardKey = getAutomationCardKeyFromElement(container.children[index]);
    if (cardKey) {
      currentKeys.push(cardKey);
    }
  }
  let alreadyOrdered = currentKeys.length === orderedKeys.length;
  if (alreadyOrdered) {
    for (let index = 0; index < orderedKeys.length; index += 1) {
      if (currentKeys[index] !== orderedKeys[index]) {
        alreadyOrdered = false;
        break;
      }
    }
  }
  if (alreadyOrdered) {
    return;
  }
  for (let index = 0; index < orderedKeys.length; index += 1) {
    const card = getAutomationCardElementByKey(orderedKeys[index]);
    if (card && card.parentElement === container) {
      container.appendChild(card);
    }
  }
}

function updateAutomationCardOrderControls() {
  if (!automationManager) {
    return;
  }
  const visibleKeys = getVisibleAutomationCardKeys();
  for (let index = 0; index < AUTOMATION_CARD_ORDER_KEYS.length; index += 1) {
    const cardKey = AUTOMATION_CARD_ORDER_KEYS[index];
    const card = getAutomationCardElementByKey(cardKey);
    if (!card || !card._automationMoveUpButton || !card._automationMoveDownButton) {
      continue;
    }
    const visibleIndex = visibleKeys.indexOf(cardKey);
    const isVisible = visibleIndex >= 0;
    card._automationMoveUpButton.disabled = !isVisible || visibleIndex <= 0;
    card._automationMoveDownButton.disabled = !isVisible || visibleIndex >= visibleKeys.length - 1;
  }
}

function cacheAutomationElements() {
  if (typeof document === 'undefined') return;
  if (!automationElements.tab) {
    automationElements.tab = document.querySelector('.hope-subtab[data-subtab="automation-hope"]');
  }
  if (!automationElements.content) {
    automationElements.content = document.getElementById('automation-hope');
  }
  if (!automationElements.container && automationElements.content) {
    automationElements.container = automationElements.content.querySelector('.automation-container');
  }
  if (!automationElements.scriptAutomation) {
    automationElements.scriptAutomation = document.getElementById('automation-scripts');
  }
  if (!automationElements.autoTravel) {
    automationElements.autoTravel = document.getElementById('automation-auto-travel');
  }
  if (!automationElements.autoTravelStatus) {
    automationElements.autoTravelStatus = document.getElementById('automation-auto-travel-status');
  }
  if (!automationElements.scriptAutomationStatus) {
    automationElements.scriptAutomationStatus = document.getElementById('automation-scripts-status');
  }
  if (!automationElements.scriptCollapseButton && automationElements.scriptAutomation) {
    automationElements.scriptCollapseButton = automationElements.scriptAutomation.querySelector('.automation-collapse');
  }
  if (!automationElements.scriptPanelBody && automationElements.scriptAutomation) {
    automationElements.scriptPanelBody = automationElements.scriptAutomation.querySelector('.automation-body');
  }
  if (!automationElements.scriptMasterToggle && automationElements.scriptAutomation) {
    automationElements.scriptMasterToggle = automationElements.scriptAutomation.querySelector('.script-automation-master-toggle');
  }
  if (!automationElements.scriptRunButton && automationElements.scriptAutomation) {
    automationElements.scriptRunButton = automationElements.scriptAutomation.querySelector('.script-automation-run');
  }
  if (!automationElements.scriptPauseButton && automationElements.scriptAutomation) {
    automationElements.scriptPauseButton = automationElements.scriptAutomation.querySelector('.script-automation-pause');
  }
  if (!automationElements.scriptStepButton && automationElements.scriptAutomation) {
    automationElements.scriptStepButton = automationElements.scriptAutomation.querySelector('.script-automation-step-once');
  }
  if (!automationElements.scriptResetButton && automationElements.scriptAutomation) {
    automationElements.scriptResetButton = automationElements.scriptAutomation.querySelector('.script-automation-reset');
  }
  if (!automationElements.scriptAutoRestartToggle && automationElements.scriptAutomation) {
    automationElements.scriptAutoRestartToggle = automationElements.scriptAutomation.querySelector('.script-automation-auto-restart-toggle');
  }
  if (!automationElements.scriptGoToRowOneOnTravelToggle && automationElements.scriptAutomation) {
    automationElements.scriptGoToRowOneOnTravelToggle = automationElements.scriptAutomation.querySelector('.script-automation-go-to-row-one-on-travel-toggle');
  }
  if (!automationElements.scriptStatusLine && automationElements.scriptAutomation) {
    automationElements.scriptStatusLine = automationElements.scriptAutomation.querySelector('.script-automation-status-line');
  }
  if (!automationElements.scriptSelect && automationElements.scriptAutomation) {
    automationElements.scriptSelect = automationElements.scriptAutomation.querySelector('.script-automation-select');
  }
  if (!automationElements.scriptNameInput && automationElements.scriptAutomation) {
    automationElements.scriptNameInput = automationElements.scriptAutomation.querySelector('.script-automation-name');
  }
  if (!automationElements.scriptNewButton && automationElements.scriptAutomation) {
    automationElements.scriptNewButton = automationElements.scriptAutomation.querySelector('.script-automation-new');
  }
  if (!automationElements.scriptDuplicateButton && automationElements.scriptAutomation) {
    automationElements.scriptDuplicateButton = automationElements.scriptAutomation.querySelector('.script-automation-duplicate');
  }
  if (!automationElements.scriptDeleteButton && automationElements.scriptAutomation) {
    automationElements.scriptDeleteButton = automationElements.scriptAutomation.querySelector('.script-automation-delete');
  }
  if (!automationElements.scriptLinesContainer && automationElements.scriptAutomation) {
    automationElements.scriptLinesContainer = automationElements.scriptAutomation.querySelector('.script-automation-lines');
  }
  if (!automationElements.scriptAddLineButton && automationElements.scriptAutomation) {
    automationElements.scriptAddLineButton = automationElements.scriptAutomation.querySelector('.script-automation-add-line');
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
  if (!automationElements.presetMoveUpButton && automationElements.shipAssignment) {
    automationElements.presetMoveUpButton = automationElements.shipAssignment.querySelector('.automation-preset-move-up');
  }
  if (!automationElements.presetMoveDownButton && automationElements.shipAssignment) {
    automationElements.presetMoveDownButton = automationElements.shipAssignment.querySelector('.automation-preset-move-down');
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
  if (!automationElements.lifePresetMoveUpButton && automationElements.lifeDesign) {
    automationElements.lifePresetMoveUpButton = automationElements.lifeDesign.querySelector('.automation-preset-move-up');
  }
  if (!automationElements.lifePresetMoveDownButton && automationElements.lifeDesign) {
    automationElements.lifePresetMoveDownButton = automationElements.lifeDesign.querySelector('.automation-preset-move-down');
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
  if (!automationElements.researchAutomation) {
    automationElements.researchAutomation = document.getElementById('automation-research');
  }
  if (!automationElements.researchAutomationStatus) {
    automationElements.researchAutomationStatus = document.getElementById('automation-research-status');
  }
  if (!automationElements.researchAutomationDescription) {
    automationElements.researchAutomationDescription = document.getElementById('automation-research-description');
  }
  if (!automationElements.researchCollapseButton && automationElements.researchAutomation) {
    automationElements.researchCollapseButton = automationElements.researchAutomation.querySelector('.automation-collapse');
  }
  if (!automationElements.researchPanelBody && automationElements.researchAutomation) {
    automationElements.researchPanelBody = automationElements.researchAutomation.querySelector('.automation-body');
  }
  if (!automationElements.researchPresetSelect && automationElements.researchAutomation) {
    automationElements.researchPresetSelect = automationElements.researchAutomation.querySelector('.research-automation-preset-select');
  }
  if (!automationElements.researchPresetMoveUpButton && automationElements.researchAutomation) {
    automationElements.researchPresetMoveUpButton = automationElements.researchAutomation.querySelector('.research-automation-preset-move-up');
  }
  if (!automationElements.researchPresetMoveDownButton && automationElements.researchAutomation) {
    automationElements.researchPresetMoveDownButton = automationElements.researchAutomation.querySelector('.research-automation-preset-move-down');
  }
  if (!automationElements.researchPresetNameInput && automationElements.researchAutomation) {
    automationElements.researchPresetNameInput = automationElements.researchAutomation.querySelector('.research-automation-preset-name');
  }
  if (!automationElements.researchNewPresetButton && automationElements.researchAutomation) {
    automationElements.researchNewPresetButton = automationElements.researchAutomation.querySelector('.research-automation-preset-new');
  }
  if (!automationElements.researchSavePresetButton && automationElements.researchAutomation) {
    automationElements.researchSavePresetButton = automationElements.researchAutomation.querySelector('.research-automation-preset-save');
  }
  if (!automationElements.researchDuplicatePresetButton && automationElements.researchAutomation) {
    automationElements.researchDuplicatePresetButton = automationElements.researchAutomation.querySelector('.research-automation-preset-duplicate');
  }
  if (!automationElements.researchDeletePresetButton && automationElements.researchAutomation) {
    automationElements.researchDeletePresetButton = automationElements.researchAutomation.querySelector('.research-automation-preset-delete');
  }
  if (!automationElements.researchApplyOnceButton && automationElements.researchAutomation) {
    automationElements.researchApplyOnceButton = automationElements.researchAutomation.querySelector('.research-automation-preset-apply-once');
  }
  if (!automationElements.researchApplyNextTravelSelect && automationElements.researchAutomation) {
    automationElements.researchApplyNextTravelSelect = automationElements.researchAutomation.querySelector('.research-automation-next-travel-select');
  }
  if (!automationElements.researchApplyNextTravelPersistToggle && automationElements.researchAutomation) {
    automationElements.researchApplyNextTravelPersistToggle = automationElements.researchAutomation.querySelector('.research-automation-next-travel-persist-toggle');
  }
  if (!automationElements.researchPresetJsonDetails && automationElements.researchAutomation) {
    automationElements.researchPresetJsonDetails = automationElements.researchAutomation.querySelector('.research-automation-preset-json-details');
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
  if (!automationElements.buildingsBuilderMoveUpButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderMoveUpButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-move-up');
  }
  if (!automationElements.buildingsBuilderMoveDownButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderMoveDownButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-move-down');
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
  if (!automationElements.buildingsBuilderDuplicateButton && automationElements.buildingsAutomation) {
    automationElements.buildingsBuilderDuplicateButton = automationElements.buildingsAutomation.querySelector('.building-automation-builder-duplicate');
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
  if (!automationElements.buildingsCombinationMoveUpButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationMoveUpButton = automationElements.buildingsAutomation.querySelector('.building-automation-combination-move-up');
  }
  if (!automationElements.buildingsCombinationMoveDownButton && automationElements.buildingsAutomation) {
    automationElements.buildingsCombinationMoveDownButton = automationElements.buildingsAutomation.querySelector('.building-automation-combination-move-down');
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
  if (!automationElements.projectsAutomation) {
    automationElements.projectsAutomation = document.getElementById('automation-projects');
  }
  if (!automationElements.projectsAutomationStatus) {
    automationElements.projectsAutomationStatus = document.getElementById('automation-projects-status');
  }
  if (!automationElements.projectsAutomationDescription) {
    automationElements.projectsAutomationDescription = document.getElementById('automation-projects-description');
  }
  if (!automationElements.projectsCollapseButton && automationElements.projectsAutomation) {
    automationElements.projectsCollapseButton = automationElements.projectsAutomation.querySelector('.automation-collapse');
  }
  if (!automationElements.projectsPanelBody && automationElements.projectsAutomation) {
    automationElements.projectsPanelBody = automationElements.projectsAutomation.querySelector('.automation-body');
  }
  if (!automationElements.projectsBuilderPresetSelect && automationElements.projectsAutomation) {
    automationElements.projectsBuilderPresetSelect = automationElements.projectsAutomation.querySelector('.project-automation-builder-select');
  }
  if (!automationElements.projectsBuilderMoveUpButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderMoveUpButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-move-up');
  }
  if (!automationElements.projectsBuilderMoveDownButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderMoveDownButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-move-down');
  }
  if (!automationElements.projectsBuilderPresetNameInput && automationElements.projectsAutomation) {
    automationElements.projectsBuilderPresetNameInput = automationElements.projectsAutomation.querySelector('.project-automation-builder-name');
  }
  if (!automationElements.projectsBuilderNewButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderNewButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-new');
  }
  if (!automationElements.projectsBuilderSaveButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderSaveButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-save');
  }
  if (!automationElements.projectsBuilderDuplicateButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderDuplicateButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-duplicate');
  }
  if (!automationElements.projectsBuilderDeleteButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderDeleteButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-delete');
  }
  if (!automationElements.projectsBuilderApplyOnceButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderApplyOnceButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-apply-once');
  }
  if (!automationElements.projectsBuilderScopeSelect && automationElements.projectsAutomation) {
    automationElements.projectsBuilderScopeSelect = automationElements.projectsAutomation.querySelector('.project-automation-builder-scope');
  }
  if (!automationElements.projectsBuilderCategorySelect && automationElements.projectsAutomation) {
    automationElements.projectsBuilderCategorySelect = automationElements.projectsAutomation.querySelector('.project-automation-builder-category');
  }
  if (!automationElements.projectsBuilderProjectSelect && automationElements.projectsAutomation) {
    automationElements.projectsBuilderProjectSelect = automationElements.projectsAutomation.querySelector('.project-automation-builder-project');
  }
  if (!automationElements.projectsBuilderAddButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderAddButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-add');
  }
  if (!automationElements.projectsBuilderAddCategoryButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderAddCategoryButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-add-category');
  }
  if (!automationElements.projectsBuilderClearButton && automationElements.projectsAutomation) {
    automationElements.projectsBuilderClearButton = automationElements.projectsAutomation.querySelector('.project-automation-builder-clear');
  }
  if (!automationElements.projectsBuilderSelectedList && automationElements.projectsAutomation) {
    automationElements.projectsBuilderSelectedList = automationElements.projectsAutomation.querySelector('.project-automation-builder-list');
  }
  if (!automationElements.projectsApplyList && automationElements.projectsAutomation) {
    automationElements.projectsApplyList = automationElements.projectsAutomation.querySelector('.project-automation-apply-list');
  }
  if (!automationElements.projectsApplyHint && automationElements.projectsAutomation) {
    automationElements.projectsApplyHint = automationElements.projectsAutomation.querySelector('.project-automation-apply-hint');
  }
  if (!automationElements.projectsApplyCombinationButton && automationElements.projectsAutomation) {
    automationElements.projectsApplyCombinationButton = automationElements.projectsAutomation.querySelector('.project-automation-apply-combination');
  }
  if (!automationElements.projectsApplyNextTravelSelect && automationElements.projectsAutomation) {
    automationElements.projectsApplyNextTravelSelect = automationElements.projectsAutomation.querySelector('.project-automation-next-travel-select');
  }
  if (!automationElements.projectsApplyNextTravelPersistToggle && automationElements.projectsAutomation) {
    automationElements.projectsApplyNextTravelPersistToggle = automationElements.projectsAutomation.querySelector('.project-automation-next-travel-persist-toggle');
  }
  if (!automationElements.projectsCombinationSelect && automationElements.projectsAutomation) {
    automationElements.projectsCombinationSelect = automationElements.projectsAutomation.querySelector('.project-automation-combination-select');
  }
  if (!automationElements.projectsCombinationMoveUpButton && automationElements.projectsAutomation) {
    automationElements.projectsCombinationMoveUpButton = automationElements.projectsAutomation.querySelector('.project-automation-combination-move-up');
  }
  if (!automationElements.projectsCombinationMoveDownButton && automationElements.projectsAutomation) {
    automationElements.projectsCombinationMoveDownButton = automationElements.projectsAutomation.querySelector('.project-automation-combination-move-down');
  }
  if (!automationElements.projectsCombinationNameInput && automationElements.projectsAutomation) {
    automationElements.projectsCombinationNameInput = automationElements.projectsAutomation.querySelector('.project-automation-combination-name');
  }
  if (!automationElements.projectsCombinationNewButton && automationElements.projectsAutomation) {
    automationElements.projectsCombinationNewButton = automationElements.projectsAutomation.querySelector('.project-automation-combination-new');
  }
  if (!automationElements.projectsCombinationSaveButton && automationElements.projectsAutomation) {
    automationElements.projectsCombinationSaveButton = automationElements.projectsAutomation.querySelector('.project-automation-combination-save');
  }
  if (!automationElements.projectsCombinationDeleteButton && automationElements.projectsAutomation) {
    automationElements.projectsCombinationDeleteButton = automationElements.projectsAutomation.querySelector('.project-automation-combination-delete');
  }
  if (!automationElements.projectsAddApplyButton && automationElements.projectsAutomation) {
    automationElements.projectsAddApplyButton = automationElements.projectsAutomation.querySelector('.project-automation-apply-add');
  }
  if (!automationElements.colonyAutomation) {
    automationElements.colonyAutomation = document.getElementById('automation-colony');
  }
  if (!automationElements.colonyAutomationStatus) {
    automationElements.colonyAutomationStatus = document.getElementById('automation-colony-status');
  }
  if (!automationElements.colonyAutomationDescription) {
    automationElements.colonyAutomationDescription = document.getElementById('automation-colony-description');
  }
  if (!automationElements.colonyCollapseButton && automationElements.colonyAutomation) {
    automationElements.colonyCollapseButton = automationElements.colonyAutomation.querySelector('.automation-collapse');
  }
  if (!automationElements.colonyPanelBody && automationElements.colonyAutomation) {
    automationElements.colonyPanelBody = automationElements.colonyAutomation.querySelector('.automation-body');
  }
  if (!automationElements.colonyBuilderPresetSelect && automationElements.colonyAutomation) {
    automationElements.colonyBuilderPresetSelect = automationElements.colonyAutomation.querySelector('.colony-automation-builder-select');
  }
  if (!automationElements.colonyBuilderMoveUpButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderMoveUpButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-move-up');
  }
  if (!automationElements.colonyBuilderMoveDownButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderMoveDownButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-move-down');
  }
  if (!automationElements.colonyBuilderPresetNameInput && automationElements.colonyAutomation) {
    automationElements.colonyBuilderPresetNameInput = automationElements.colonyAutomation.querySelector('.colony-automation-builder-name');
  }
  if (!automationElements.colonyBuilderNewButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderNewButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-new');
  }
  if (!automationElements.colonyBuilderSaveButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderSaveButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-save');
  }
  if (!automationElements.colonyBuilderDuplicateButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderDuplicateButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-duplicate');
  }
  if (!automationElements.colonyBuilderDeleteButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderDeleteButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-delete');
  }
  if (!automationElements.colonyBuilderApplyOnceButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderApplyOnceButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-apply-once');
  }
  if (!automationElements.colonyBuilderTypeSelect && automationElements.colonyAutomation) {
    automationElements.colonyBuilderTypeSelect = automationElements.colonyAutomation.querySelector('.colony-automation-builder-type');
  }
  if (!automationElements.colonyBuilderScopeSelect && automationElements.colonyAutomation) {
    automationElements.colonyBuilderScopeSelect = automationElements.colonyAutomation.querySelector('.colony-automation-builder-scope');
  }
  if (!automationElements.colonyBuilderCategorySelect && automationElements.colonyAutomation) {
    automationElements.colonyBuilderCategorySelect = automationElements.colonyAutomation.querySelector('.colony-automation-builder-category');
  }
  if (!automationElements.colonyBuilderTargetSelect && automationElements.colonyAutomation) {
    automationElements.colonyBuilderTargetSelect = automationElements.colonyAutomation.querySelector('.colony-automation-builder-target');
  }
  if (!automationElements.colonyBuilderAddButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderAddButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-add');
  }
  if (!automationElements.colonyBuilderAddCategoryButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderAddCategoryButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-add-category');
  }
  if (!automationElements.colonyBuilderClearButton && automationElements.colonyAutomation) {
    automationElements.colonyBuilderClearButton = automationElements.colonyAutomation.querySelector('.colony-automation-builder-clear');
  }
  if (!automationElements.colonyBuilderSelectedList && automationElements.colonyAutomation) {
    automationElements.colonyBuilderSelectedList = automationElements.colonyAutomation.querySelector('.colony-automation-builder-list');
  }
  if (!automationElements.colonyApplyList && automationElements.colonyAutomation) {
    automationElements.colonyApplyList = automationElements.colonyAutomation.querySelector('.colony-automation-apply-list');
  }
  if (!automationElements.colonyApplyHint && automationElements.colonyAutomation) {
    automationElements.colonyApplyHint = automationElements.colonyAutomation.querySelector('.colony-automation-apply-hint');
  }
  if (!automationElements.colonyApplyCombinationButton && automationElements.colonyAutomation) {
    automationElements.colonyApplyCombinationButton = automationElements.colonyAutomation.querySelector('.colony-automation-apply-combination');
  }
  if (!automationElements.colonyApplyNextTravelSelect && automationElements.colonyAutomation) {
    automationElements.colonyApplyNextTravelSelect = automationElements.colonyAutomation.querySelector('.colony-automation-next-travel-select');
  }
  if (!automationElements.colonyApplyNextTravelPersistToggle && automationElements.colonyAutomation) {
    automationElements.colonyApplyNextTravelPersistToggle = automationElements.colonyAutomation.querySelector('.colony-automation-next-travel-persist-toggle');
  }
  if (!automationElements.colonyCombinationSelect && automationElements.colonyAutomation) {
    automationElements.colonyCombinationSelect = automationElements.colonyAutomation.querySelector('.colony-automation-combination-select');
  }
  if (!automationElements.colonyCombinationMoveUpButton && automationElements.colonyAutomation) {
    automationElements.colonyCombinationMoveUpButton = automationElements.colonyAutomation.querySelector('.colony-automation-combination-move-up');
  }
  if (!automationElements.colonyCombinationMoveDownButton && automationElements.colonyAutomation) {
    automationElements.colonyCombinationMoveDownButton = automationElements.colonyAutomation.querySelector('.colony-automation-combination-move-down');
  }
  if (!automationElements.colonyCombinationNameInput && automationElements.colonyAutomation) {
    automationElements.colonyCombinationNameInput = automationElements.colonyAutomation.querySelector('.colony-automation-combination-name');
  }
  if (!automationElements.colonyCombinationNewButton && automationElements.colonyAutomation) {
    automationElements.colonyCombinationNewButton = automationElements.colonyAutomation.querySelector('.colony-automation-combination-new');
  }
  if (!automationElements.colonyCombinationSaveButton && automationElements.colonyAutomation) {
    automationElements.colonyCombinationSaveButton = automationElements.colonyAutomation.querySelector('.colony-automation-combination-save');
  }
  if (!automationElements.colonyCombinationDeleteButton && automationElements.colonyAutomation) {
    automationElements.colonyCombinationDeleteButton = automationElements.colonyAutomation.querySelector('.colony-automation-combination-delete');
  }
  if (!automationElements.colonyAddApplyButton && automationElements.colonyAutomation) {
    automationElements.colonyAddApplyButton = automationElements.colonyAutomation.querySelector('.colony-automation-apply-add');
  }
}

function createAutomationCardHeader(card, titleText, onToggle, orderKey) {
  const header = card.querySelector('.automation-card-header');
  header.textContent = '';
  const titleGroup = document.createElement('div');
  titleGroup.classList.add('automation-title-group');
  const collapse = document.createElement('button');
  collapse.classList.add('automation-collapse');
  collapse.textContent = '▼';
  collapse.title = getAutomationCardText('toggleCard', {}, 'Toggle');
  const title = document.createElement('div');
  title.classList.add('automation-title');
  title.textContent = titleText;
  titleGroup.append(collapse, title);
  const headerRight = document.createElement('div');
  headerRight.classList.add('project-header-right');
  const reorderButtons = document.createElement('div');
  reorderButtons.classList.add('reorder-buttons');
  const moveUpButton = document.createElement('button');
  moveUpButton.innerHTML = '&#9650;';
  moveUpButton.title = getAutomationCardText('moveApplyUp', {}, 'Move up');
  moveUpButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!automationManager || !orderKey) {
      return;
    }
    if (automationManager.moveAutomationCard(orderKey, -1, getVisibleAutomationCardKeys())) {
      queueAutomationUIRefresh();
      updateAutomationUI();
    }
  });
  const moveDownButton = document.createElement('button');
  moveDownButton.innerHTML = '&#9660;';
  moveDownButton.title = getAutomationCardText('moveApplyDown', {}, 'Move down');
  moveDownButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!automationManager || !orderKey) {
      return;
    }
    if (automationManager.moveAutomationCard(orderKey, 1, getVisibleAutomationCardKeys())) {
      queueAutomationUIRefresh();
      updateAutomationUI();
    }
  });
  reorderButtons.append(moveUpButton, moveDownButton);
  headerRight.appendChild(reorderButtons);
  header.append(titleGroup, headerRight);
  titleGroup.addEventListener('click', onToggle);
  collapse.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggle();
  });
  card._automationOrderKey = orderKey || '';
  card._automationMoveUpButton = moveUpButton;
  card._automationMoveDownButton = moveDownButton;
  return { collapse, titleGroup, title, moveUpButton, moveDownButton };
}

function getAutomationCardText(path, vars, fallback) {
  return t(`ui.hope.automationCards.${path}`, vars, fallback);
}

function createAutomationPresetJsonDetails(extraClassName) {
  const details = document.createElement('details');
  details.classList.add('automation-preset-json-details');
  if (extraClassName) {
    details.classList.add(extraClassName);
  }

  const summary = document.createElement('summary');
  summary.classList.add('automation-preset-json-summary');
  const summaryText = document.createElement('span');
  summary.appendChild(summaryText);
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  const saveButtonText = document.createElement('span');
  saveButtonText.textContent = getAutomationCardText('savePresetJsonButton', {}, 'Save');
  const saveButtonStar = document.createElement('span');
  saveButtonStar.textContent = ' *';
  saveButtonStar.style.color = '#d02b2b';
  saveButtonStar.style.display = 'none';
  saveButton.append(saveButtonText, saveButtonStar);
  saveButton.classList.add('automation-preset-json-save');
  saveButton.style.marginLeft = '8px';
  saveButton.style.display = 'none';
  saveButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  const filterRow = document.createElement('div');
  filterRow.classList.add('automation-preset-json-filter-row');
  filterRow.style.display = 'none';
  const filterSelect = document.createElement('select');
  filterSelect.classList.add('automation-preset-json-filter-select');
  filterSelect.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  const filterClearButton = document.createElement('button');
  filterClearButton.type = 'button';
  filterClearButton.classList.add('automation-preset-json-filter-clear');
  filterClearButton.textContent = getAutomationCardText('clearFilterButton', {}, 'Clear filter');
  filterClearButton.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  filterRow.append(filterSelect, filterClearButton);

  summary.append(summaryText, filterRow, saveButton);
  details.appendChild(summary);
  details.addEventListener('toggle', () => {
    saveButton.style.display = details.open ? '' : 'none';
    filterRow.style.display = details.open && filterRow._hasFilters ? 'inline-flex' : 'none';
  });

  const pre = document.createElement('pre');
  pre.classList.add('automation-preset-json-content');
  details.appendChild(pre);

  details._summaryNode = summary;
  details._summaryTextNode = summaryText;
  details._saveButton = saveButton;
  details._saveButtonTextNode = saveButtonText;
  details._saveButtonStarNode = saveButtonStar;
  details._contentNode = pre;
  details._filterRowNode = filterRow;
  details._filterSelectNode = filterSelect;
  details._filterClearButtonNode = filterClearButton;
  details._renderedSummaryText = '';
  details._renderedPresetJson = '';
  details._renderedFieldKeySignature = '';
  details._jsonInputMap = {};
  details._jsonDraftMap = {};
  details._jsonDirty = false;
  details._draftStorageKey = extraClassName || 'automation-preset-json';
  details._basePresetSignature = '';
  details._boundPresetId = null;
  details._activePresetRef = null;
  details._activeOnFieldChange = null;
  details._filterOptionSignature = '';
  details.style.display = 'none';
  return details;
}

function getAutomationPresetJsonDraftStoreKey(details, presetId) {
  return `${details._draftStorageKey}:${presetId}`;
}

function clearAutomationPresetJsonDraftStore(details, presetId) {
  const storeKey = getAutomationPresetJsonDraftStoreKey(details, presetId);
  delete automationPresetJsonDraftStore[storeKey];
}

function saveAutomationPresetJsonDraftStore(details, presetId) {
  const storeKey = getAutomationPresetJsonDraftStoreKey(details, presetId);
  automationPresetJsonDraftStore[storeKey] = {
    baseSignature: details._basePresetSignature,
    drafts: details._jsonDraftMap
  };
}

function loadAutomationPresetJsonDraftStore(details, presetId) {
  const storeKey = getAutomationPresetJsonDraftStoreKey(details, presetId);
  return automationPresetJsonDraftStore[storeKey] || null;
}

function resetAutomationPresetJsonDetailsState(details, presetId) {
  if (!details) {
    return;
  }
  if (presetId !== undefined && presetId !== null && presetId !== '') {
    clearAutomationPresetJsonDraftStore(details, Number(presetId));
  }
  details._jsonDraftMap = {};
  details._jsonDirty = false;
  details._basePresetSignature = '';
  details._boundPresetId = null;
  details._renderedFieldKeySignature = '';
  details._renderedPresetJson = '';
  if (details._saveButton) {
    details._saveButton.disabled = true;
  }
  if (details._saveButtonStarNode) {
    details._saveButtonStarNode.style.display = 'none';
  }
  if (details._onDirtyChange) {
    details._onDirtyChange(false);
  }
}

function parseAutomationPresetJsonFieldValue(rawValue) {
  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (trimmed === 'null') {
    return null;
  }
  const compactNumberText = trimmed.replace(/[,_\s]/g, '');
  if (/^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:e[+-]?\d+)?(?:Dd|dd|Ud|ud|De|de|Dc|dc|No|no|Oc|oc|Sp|sp|Sx|sx|Qi|qi|Q|q|T|t|B|b|M|K|k|m|µ|u|U|n|N|p|P|f|F)?$/i.test(compactNumberText)) {
    const numeric = parseFlexibleNumber(compactNumberText);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return JSON.parse(trimmed);
  }
  return rawValue;
}

function formatAutomationPresetJsonFieldValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatNumber(value, false, 3, true);
  }
  if (value && value.constructor === Object) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return '';
  }
  return String(value);
}

function buildAutomationPresetLeafPathKey(path) {
  return path.map((segment) => `[${segment}]`).join('');
}

function formatAutomationPresetLeafPathLabel(path) {
  let label = '';
  for (let index = 0; index < path.length; index += 1) {
    const segment = path[index];
    if (Number.isInteger(segment)) {
      label += `[${segment}]`;
    } else {
      label += label ? `.${segment}` : segment;
    }
  }
  return label;
}

function collectAutomationPresetLeafPaths(target, path, outPaths) {
  if (Array.isArray(target)) {
    for (let index = 0; index < target.length; index += 1) {
      collectAutomationPresetLeafPaths(target[index], path.concat(index), outPaths);
    }
    return;
  }
  if (target && target.constructor === Object) {
    const keys = Object.keys(target);
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      collectAutomationPresetLeafPaths(target[key], path.concat(key), outPaths);
    }
    return;
  }
  outPaths.push(path);
}

function getAutomationPresetValueAtPath(target, path) {
  let current = target;
  for (let index = 0; index < path.length; index += 1) {
    current = current[path[index]];
  }
  return current;
}

function setAutomationPresetValueAtPath(target, path, value) {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return;
  }
  let current = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    current = current[path[index]];
  }
  current[path[path.length - 1]] = value;
}

function removeAutomationPresetValueAtPath(target, path) {
  if (!target || !Array.isArray(path) || path.length === 0) {
    return false;
  }
  let parent = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    parent = parent[path[index]];
  }
  const leafKey = path[path.length - 1];
  if (Array.isArray(parent)) {
    const numericIndex = Number(leafKey);
    if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= parent.length) {
      return false;
    }
    parent.splice(numericIndex, 1);
    return true;
  }
  if (!parent || parent.constructor !== Object || !Object.prototype.hasOwnProperty.call(parent, leafKey)) {
    return false;
  }
  delete parent[leafKey];
  return true;
}

function buildAutomationPresetVisibleRenderTree(sourcePreset, visibleLeafPaths) {
  const root = {};
  const ensureContainer = (parent, key, nextSegment) => {
    if (parent[key] !== undefined) {
      return parent[key];
    }
    parent[key] = Number.isInteger(nextSegment) ? [] : {};
    return parent[key];
  };
  for (let pathIndex = 0; pathIndex < visibleLeafPaths.length; pathIndex += 1) {
    const path = visibleLeafPaths[pathIndex];
    if (!path.length) {
      continue;
    }
    let current = root;
    for (let segmentIndex = 0; segmentIndex < path.length - 1; segmentIndex += 1) {
      const segment = path[segmentIndex];
      const nextSegment = path[segmentIndex + 1];
      current = ensureContainer(current, segment, nextSegment);
    }
    const leafKey = path[path.length - 1];
    current[leafKey] = getAutomationPresetValueAtPath(sourcePreset, path);
  }
  return root;
}

function renderAutomationPresetEditableJson(details, preset, leafPaths, onFieldChange, fieldOptionsResolver, renderRootPath = null) {
  const content = details._contentNode;
  content.textContent = '';
  details._jsonInputMap = {};

  const writeText = (text) => {
    content.appendChild(document.createTextNode(text));
  };

  const appendLeafInput = (path, value, isString, keyPrefix) => {
    const pathKey = buildAutomationPresetLeafPathKey(path);
    const draftEntry = details._jsonDraftMap[pathKey];
    const isIncluded = !draftEntry || draftEntry.included !== false;
    const valueToRender = draftEntry ? draftEntry.value : value;
    const fieldOptions = fieldOptionsResolver ? fieldOptionsResolver(path, value, preset) : null;
    const hasCustomSelectOptions = !!(fieldOptions && Array.isArray(fieldOptions.selectOptions) && fieldOptions.selectOptions.length);
    const isBooleanLeaf = typeof value === 'boolean';
    const useSelect = isBooleanLeaf || hasCustomSelectOptions;
    const input = useSelect ? document.createElement('select') : document.createElement('input');
    input.classList.add('automation-preset-json-field-input');
    input.dataset.fieldKey = pathKey;
    if (hasCustomSelectOptions) {
      for (let optionIndex = 0; optionIndex < fieldOptions.selectOptions.length; optionIndex += 1) {
        const optionData = fieldOptions.selectOptions[optionIndex];
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        input.appendChild(option);
      }
      input.value = String(valueToRender);
    } else if (isBooleanLeaf) {
      const optionTrue = document.createElement('option');
      optionTrue.value = 'true';
      optionTrue.textContent = getAutomationCardText('booleanTrue', {}, 'true');
      const optionFalse = document.createElement('option');
      optionFalse.value = 'false';
      optionFalse.textContent = getAutomationCardText('booleanFalse', {}, 'false');
      input.append(optionTrue, optionFalse);
      input.value = valueToRender ? 'true' : 'false';
    } else {
      input.type = 'text';
      input.value = formatAutomationPresetJsonFieldValue(valueToRender);
      input.size = Math.max(1, input.value.length);
      input.addEventListener('input', () => {
        input.size = Math.max(1, input.value.length);
      });
    }
    input.style.fontFamily = 'inherit';
    input.style.fontSize = 'inherit';
    input.style.lineHeight = 'inherit';
    input.style.padding = '0 2px';
    input.style.margin = '0';
    input.disabled = path.length === 1 && path[0] === 'id';
    if (input.disabled) {
      input.classList.add('automation-preset-json-field-input-disabled');
    }
    if (!isIncluded && !input.disabled) {
      input.disabled = true;
      input.classList.add('automation-preset-json-field-input-disabled');
    }

    let includeCheckbox = null;
    if (path.length !== 1 || path[0] !== 'id') {
      includeCheckbox = document.createElement('input');
      includeCheckbox.type = 'checkbox';
      includeCheckbox.checked = isIncluded;
      includeCheckbox.classList.add('automation-preset-json-field-include-checkbox');
      includeCheckbox.title = getAutomationCardText('presetJsonIncludeFieldLabel', {}, 'Include this field in saved preset');
      includeCheckbox.addEventListener('change', (event) => {
        const nextIncluded = !!event.target.checked;
        const basePreset = details._activePresetRef || preset;
        const baseValue = getAutomationPresetValueAtPath(basePreset, path);
        const nextValue = hasCustomSelectOptions
          ? parseAutomationPresetJsonFieldValue(input.value)
          : isBooleanLeaf
            ? input.value === 'true'
            : isString
              ? input.value
              : parseAutomationPresetJsonFieldValue(input.value);
        const baseMatches = JSON.stringify(baseValue) === JSON.stringify(nextValue);
        if (nextIncluded && baseMatches) {
          delete details._jsonDraftMap[pathKey];
        } else {
          details._jsonDraftMap[pathKey] = { path: path.slice(), value: nextValue, included: nextIncluded };
        }
        input.disabled = !nextIncluded;
        if (!nextIncluded) {
          input.classList.add('automation-preset-json-field-input-disabled');
        } else if (!(path.length === 1 && path[0] === 'id')) {
          input.classList.remove('automation-preset-json-field-input-disabled');
        }
        details._jsonDirty = Object.keys(details._jsonDraftMap).length > 0;
        if (details._jsonDirty) {
          saveAutomationPresetJsonDraftStore(details, preset.id);
        } else {
          clearAutomationPresetJsonDraftStore(details, preset.id);
        }
        if (details._onDirtyChange) {
          details._onDirtyChange(details._jsonDirty);
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
    }

    input.addEventListener('change', (event) => {
      try {
        const nextValue = hasCustomSelectOptions
          ? parseAutomationPresetJsonFieldValue(event.target.value)
          : isBooleanLeaf
            ? event.target.value === 'true'
            : isString
              ? event.target.value
              : parseAutomationPresetJsonFieldValue(event.target.value);
        const basePreset = details._activePresetRef || preset;
        const baseValue = getAutomationPresetValueAtPath(basePreset, path);
        const nextIncluded = includeCheckbox ? includeCheckbox.checked : true;
        if (nextIncluded && JSON.stringify(baseValue) === JSON.stringify(nextValue)) {
          delete details._jsonDraftMap[pathKey];
        } else {
          details._jsonDraftMap[pathKey] = { path: path.slice(), value: nextValue, included: nextIncluded };
        }
        details._jsonDirty = Object.keys(details._jsonDraftMap).length > 0;
        if (details._jsonDirty) {
          saveAutomationPresetJsonDraftStore(details, preset.id);
        } else {
          clearAutomationPresetJsonDraftStore(details, preset.id);
        }
        if (details._onDirtyChange) {
          details._onDirtyChange(details._jsonDirty);
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
      } catch (error) {
        if (details._showStatus) {
          details._showStatus(
            getAutomationCardText('importPresetInvalidJsonError', {}, 'That preset string is not valid JSON.'),
            true
          );
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
      }
    });
    details._jsonInputMap[pathKey] = input;
    if (includeCheckbox) {
      content.appendChild(includeCheckbox);
      writeText(' ');
    }
    if (keyPrefix) {
      writeText(keyPrefix);
    }
    if (isString && !hasCustomSelectOptions) {
      writeText('"');
      content.appendChild(input);
      writeText('"');
      return;
    }
    content.appendChild(input);
  };

  const renderValue = (value, path, indent, keyName, isLast) => {
    const indentText = '  '.repeat(indent);
    const keyPrefix = keyName === null ? '' : `${JSON.stringify(keyName)}: `;
    if (Array.isArray(value)) {
      writeText(`${indentText}${keyPrefix}[\n`);
      for (let index = 0; index < value.length; index += 1) {
        renderValue(value[index], path.concat(index), indent + 1, null, index === value.length - 1);
      }
      writeText(`${indentText}]${isLast ? '' : ','}\n`);
      return;
    }
    if (value && value.constructor === Object) {
      const keys = Object.keys(value);
      writeText(`${indentText}${keyPrefix}{\n`);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const childKey = keys[keyIndex];
        renderValue(value[childKey], path.concat(childKey), indent + 1, childKey, keyIndex === keys.length - 1);
      }
      writeText(`${indentText}}${isLast ? '' : ','}\n`);
      return;
    }
    writeText(indentText);
    appendLeafInput(path, value, typeof value === 'string', keyPrefix);
    writeText(`${isLast ? '' : ','}\n`);
  };

  const renderTree = buildAutomationPresetVisibleRenderTree(preset, leafPaths);
  const renderRootValue = renderRootPath && renderRootPath.length
    ? getAutomationPresetValueAtPath(renderTree, renderRootPath)
    : renderTree;
  const renderPath = renderRootPath && renderRootPath.length ? renderRootPath.slice() : [];
  renderValue(renderRootValue, renderPath, 0, null, true);
}

function applyAutomationPresetJsonFieldEdit(preset, path, nextValue, options = {}) {
  if (!preset || !Array.isArray(path) || path.length === 0) {
    return false;
  }
  if (path.length === 1 && path[0] === 'id') {
    return false;
  }
  const rootKey = path[0];
  const parentPath = path.slice(0, path.length - 1);
  const leafKey = path[path.length - 1];
  let parent = preset;
  for (let index = 0; index < parentPath.length; index += 1) {
    parent = parent[parentPath[index]];
  }
  const previousValue = parent[leafKey];
  const normalizeValue = options.normalizeValue;
  const finalValue = normalizeValue ? normalizeValue(path, nextValue) : nextValue;
  const valueChanged = JSON.stringify(previousValue) !== JSON.stringify(finalValue);
  if (!valueChanged) {
    return false;
  }
  parent[leafKey] = finalValue;
  if (options.onApplied) {
    options.onApplied(path, finalValue, rootKey);
  }
  return true;
}

function applyAutomationPresetJsonFieldRemoval(preset, path, options = {}) {
  if (!preset || !Array.isArray(path) || path.length === 0) {
    return false;
  }
  if (path.length === 1 && path[0] === 'id') {
    return false;
  }
  const rootKey = path[0];
  if (!removeAutomationPresetValueAtPath(preset, path)) {
    return false;
  }
  if (options.onApplied) {
    options.onApplied(path, undefined, rootKey);
  }
  return true;
}

function isValidAutomationPresetLeafReplacement(baseValue, nextValue) {
  if (baseValue === null) {
    return nextValue === null;
  }
  const baseType = typeof baseValue;
  if (baseType === 'number') {
    return typeof nextValue === 'number' && Number.isFinite(nextValue);
  }
  if (baseType === 'string') {
    return typeof nextValue === 'string';
  }
  if (baseType === 'boolean') {
    return typeof nextValue === 'boolean';
  }
  if (baseType === 'undefined') {
    return false;
  }
  if (Array.isArray(baseValue)) {
    return Array.isArray(nextValue);
  }
  if (baseValue && baseValue.constructor === Object) {
    return nextValue && nextValue.constructor === Object;
  }
  return false;
}

function showAutomationPresetJsonStatus(statusElement, text, isError) {
  statusElement.textContent = text;
  statusElement.style.display = '';
  statusElement.classList.toggle('automation-status-error', !!isError);
}

function createAutomationPresetUsageLine() {
  const line = document.createElement('div');
  line.classList.add('automation-preset-script-usage');
  return line;
}

function updateAutomationPresetUsageLine(line, automationType, preset) {
  if (!line) {
    return;
  }
  if (!preset) {
    line.textContent = '';
    line.style.display = 'none';
    line._usageSignature = '';
    return;
  }

  const scriptAutomation = automationManager.scriptAutomation;
  const references = scriptAutomation.getPresetUsageReferences(automationType, preset.id);
  const signature = JSON.stringify(references);
  if (line._usageSignature === signature && line.style.display !== 'none') {
    return;
  }
  line._usageSignature = signature;
  if (references.length === 0) {
    line.textContent = '';
    line.style.display = 'none';
    return;
  }

  line.style.display = '';
  const usageText = references.map(reference => {
    const lineLabel = reference.lineName
      ? getAutomationCardText(
          'presetScriptUsageLineNamed',
          { line: reference.lineNumber, name: reference.lineName },
          `line ${reference.lineNumber} (${reference.lineName})`
        )
      : getAutomationCardText(
          'presetScriptUsageLine',
          { line: reference.lineNumber },
          `line ${reference.lineNumber}`
        );
    if (reference.viaCombinationName) {
      return getAutomationCardText(
        'presetScriptUsageReferenceViaCombination',
        { script: reference.scriptName, line: lineLabel, combination: reference.viaCombinationName },
        `${reference.scriptName} ${lineLabel} via ${reference.viaCombinationName}`
      );
    }
    return getAutomationCardText(
      'presetScriptUsageReference',
      { script: reference.scriptName, line: lineLabel },
      `${reference.scriptName} ${lineLabel}`
    );
  }).join('; ');
  line.textContent = getAutomationCardText(
    'presetScriptUsageUsed',
    { usage: usageText },
    `Script usage: ${usageText}`
  );
}

function updateAutomationPresetJsonDetails(details, preset, options = {}) {
  if (!details) {
    return;
  }
  const onFieldChange = options.onFieldChange;
  const onDirtyChange = options.onDirtyChange;
  const isLeafVisible = options.isLeafVisible;
  const fieldOptionsResolver = options.getFieldOptions;
  const filterOptionsResolver = options.getFilterOptions;
  const rootPath = Array.isArray(options.rootPath) && options.rootPath.length
    ? options.rootPath.slice()
    : null;
  const selectedFilterValue = options.selectedFilterValue || '';
  const onFilterChange = options.onFilterChange;
  const onClearFilter = options.onClearFilter;
  const showStatus = options.showStatus || null;
  const toFullPath = (path) => (rootPath ? rootPath.concat(path) : path.slice());
  details._onDirtyChange = onDirtyChange || null;
  details._activePresetRef = preset || null;
  details._activeOnFieldChange = onFieldChange || null;
  details._showStatus = showStatus;

  if (!preset) {
    details.open = false;
    details.style.display = 'none';
    details._boundPresetId = null;
    if (details._renderedSummaryText) {
      details._summaryTextNode.textContent = '';
      details._renderedSummaryText = '';
    }
    details._renderedFieldKeySignature = '';
    details._jsonInputMap = {};
    details._jsonDraftMap = {};
    details._jsonDirty = false;
    details._basePresetSignature = '';
    details._filterOptionSignature = '';
    if (details._saveButton) {
      details._saveButton.style.display = 'none';
      details._saveButton.disabled = true;
      if (details._saveButtonStarNode) {
        details._saveButtonStarNode.style.display = 'none';
      }
    }
    if (details._renderedPresetJson) {
      details._contentNode.textContent = '';
      details._renderedPresetJson = '';
    }
    if (details._filterRowNode) {
      details._filterRowNode.style.display = 'none';
    }
    return;
  }

  details.style.display = '';
  const presetSignature = JSON.stringify(preset);
  const summaryText = getAutomationCardText(
    'selectedPresetJsonSummary',
    { name: preset.name || `Preset ${preset.id}` },
    'Selected preset JSON'
  );
  if (details._renderedSummaryText !== summaryText) {
    details._summaryTextNode.textContent = summaryText;
    details._renderedSummaryText = summaryText;
  }
  details._saveButton.style.display = details.open ? '' : 'none';
  const filterOptions = filterOptionsResolver ? filterOptionsResolver(preset) : [];
  if (details._filterRowNode && details._filterSelectNode && details._filterClearButtonNode) {
    const hasFilters = Array.isArray(filterOptions) && filterOptions.length > 0;
    details._filterRowNode._hasFilters = hasFilters;
    details._filterRowNode.style.display = hasFilters && details.open ? 'inline-flex' : 'none';
    if (hasFilters) {
      const selectOptions = [{
        value: '',
        label: getAutomationCardText('filterAllOption', {}, 'All selected items')
      }].concat(filterOptions);
      syncAutomationSelectOptions(details._filterSelectNode, selectOptions, selectedFilterValue || '');
      if (!selectedFilterValue) {
        details._filterSelectNode.value = '';
        if (details._filterSelectNode.selectedIndex < 0 && details._filterSelectNode.options.length > 0) {
          details._filterSelectNode.selectedIndex = 0;
        }
      }
      details._filterClearButtonNode.disabled = !selectedFilterValue;
      if (!details._filterSelectNode._boundFilterChange) {
        details._filterSelectNode.addEventListener('change', (event) => {
          if (onFilterChange) {
            onFilterChange(event.target.value || '');
          }
        });
        details._filterSelectNode._boundFilterChange = true;
      }
      if (!details._filterClearButtonNode._boundFilterClick) {
        details._filterClearButtonNode.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onClearFilter) {
            onClearFilter();
          }
        });
        details._filterClearButtonNode._boundFilterClick = true;
      }
    }
  }

  if (details._boundPresetId !== preset.id) {
    const storedDraft = loadAutomationPresetJsonDraftStore(details, preset.id);
    if (storedDraft && storedDraft.baseSignature === presetSignature) {
      details._jsonDraftMap = storedDraft.drafts;
      details._basePresetSignature = storedDraft.baseSignature;
    } else {
      details._jsonDraftMap = {};
      details._basePresetSignature = presetSignature;
    }
    if (storedDraft && storedDraft.baseSignature !== presetSignature) {
      clearAutomationPresetJsonDraftStore(details, preset.id);
    }
    details._jsonDirty = false;
    if (details._onDirtyChange) {
      details._onDirtyChange(false);
    }
  }
  if (details._jsonDirty && details._basePresetSignature !== presetSignature) {
    details._jsonDraftMap = {};
    details._jsonDirty = false;
    details._basePresetSignature = presetSignature;
    clearAutomationPresetJsonDraftStore(details, preset.id);
    if (details._onDirtyChange) {
      details._onDirtyChange(false);
    }
  }

  const scopedPreset = rootPath ? getAutomationPresetValueAtPath(preset, rootPath) : preset;
  if (!scopedPreset || (scopedPreset.constructor !== Object && !Array.isArray(scopedPreset))) {
    details._contentNode.textContent = '';
    details._renderedFieldKeySignature = '';
    details._renderedPresetJson = presetSignature;
    details._saveButton.disabled = true;
    if (details._saveButtonStarNode) {
      details._saveButtonStarNode.style.display = 'none';
    }
    return;
  }

  const scopedLeafPaths = [];
  collectAutomationPresetLeafPaths(scopedPreset, [], scopedLeafPaths);
  const leafPaths = scopedLeafPaths.map(toFullPath);
  const effectivePreset = JSON.parse(JSON.stringify(preset));
  const draftEntries = Object.values(details._jsonDraftMap);
  for (let draftIndex = 0; draftIndex < draftEntries.length; draftIndex += 1) {
    const draftEntry = draftEntries[draftIndex];
    if (!draftEntry || !Array.isArray(draftEntry.path) || draftEntry.path.length === 0) {
      continue;
    }
    setAutomationPresetValueAtPath(effectivePreset, draftEntry.path, draftEntry.value);
  }
  const visibleLeafPaths = isLeafVisible
    ? leafPaths.filter((path) => isLeafVisible(path, effectivePreset))
    : leafPaths;
  const visiblePathSet = new Set(visibleLeafPaths.map((path) => buildAutomationPresetLeafPathKey(path)));
  const draftKeys = Object.keys(details._jsonDraftMap);
  for (let draftIndex = 0; draftIndex < draftKeys.length; draftIndex += 1) {
    const draftKey = draftKeys[draftIndex];
    if (!visiblePathSet.has(draftKey)) {
      delete details._jsonDraftMap[draftKey];
    }
  }
  const nextFieldKeySignature = visibleLeafPaths.map((path) => buildAutomationPresetLeafPathKey(path)).join('|');
  for (let pathIndex = 0; pathIndex < visibleLeafPaths.length; pathIndex += 1) {
    const path = visibleLeafPaths[pathIndex];
    const pathKey = buildAutomationPresetLeafPathKey(path);
    const draftEntry = details._jsonDraftMap[pathKey];
    if (!draftEntry) {
      continue;
    }
    if (draftEntry.included === false) {
      continue;
    }
    const baseValue = getAutomationPresetValueAtPath(preset, path);
    if (JSON.stringify(baseValue) === JSON.stringify(draftEntry.value)) {
      delete details._jsonDraftMap[pathKey];
    }
  }
  details._jsonDirty = Object.keys(details._jsonDraftMap).length > 0;
  if (!details._jsonDirty) {
    details._basePresetSignature = presetSignature;
  }
  if (details._jsonDirty) {
    saveAutomationPresetJsonDraftStore(details, preset.id);
  } else {
    clearAutomationPresetJsonDraftStore(details, preset.id);
  }
  details._saveButton.disabled = !details._jsonDirty;
  if (details._saveButtonStarNode) {
    details._saveButtonStarNode.style.display = details._jsonDirty ? '' : 'none';
  }
  if (details._onDirtyChange) {
    details._onDirtyChange(details._jsonDirty);
  }

  if (!details._saveButton._boundClick) {
    details._saveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentPreset = details._activePresetRef;
      const currentOnFieldChange = details._activeOnFieldChange;
      if (!currentOnFieldChange || !currentPreset) {
        return;
      }
      const draftEntries = Object.values(details._jsonDraftMap);
      for (let index = 0; index < draftEntries.length; index += 1) {
        const draftEntry = draftEntries[index];
        if (draftEntry.included === false) {
          continue;
        }
        const baseValue = getAutomationPresetValueAtPath(currentPreset, draftEntry.path);
        const fieldOptions = fieldOptionsResolver
          ? fieldOptionsResolver(draftEntry.path, baseValue, currentPreset)
          : null;
        const hasCustomSelectOptions = !!(fieldOptions
          && Array.isArray(fieldOptions.selectOptions)
          && fieldOptions.selectOptions.length);
        if (!hasCustomSelectOptions && !isValidAutomationPresetLeafReplacement(baseValue, draftEntry.value)) {
          if (showStatus) {
            showStatus(
              getAutomationCardText(
                'importPresetInvalidJsonError',
                {},
                'That preset string is not valid JSON.'
              ),
              true
            );
          }
          queueAutomationUIRefresh();
          updateAutomationUI();
          return;
        }
      }
      for (let index = 0; index < draftEntries.length; index += 1) {
        const draftEntry = draftEntries[index];
        if (draftEntry.included === false) {
          currentOnFieldChange(draftEntry.path, undefined, { remove: true });
        } else {
          currentOnFieldChange(draftEntry.path, draftEntry.value);
        }
      }
      details._jsonDraftMap = {};
      details._jsonDirty = false;
      details._basePresetSignature = JSON.stringify(currentPreset);
      details._boundPresetId = null;
      details._renderedFieldKeySignature = '';
      details._renderedPresetJson = '';
      clearAutomationPresetJsonDraftStore(details, currentPreset.id);
      details._saveButton.disabled = true;
      if (details._saveButtonStarNode) {
        details._saveButtonStarNode.style.display = 'none';
      }
      if (details._onDirtyChange) {
        details._onDirtyChange(false);
      }
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    details._saveButton._boundClick = true;
  }

  const shouldRebuildJson = details._renderedFieldKeySignature !== nextFieldKeySignature || details._boundPresetId !== preset.id;
  if (shouldRebuildJson) {
    renderAutomationPresetEditableJson(
      details,
      effectivePreset,
      visibleLeafPaths,
      onFieldChange,
      fieldOptionsResolver,
      rootPath
    );
    details._renderedFieldKeySignature = nextFieldKeySignature;
    details._boundPresetId = preset.id;
  } else {
    for (let keyIndex = 0; keyIndex < visibleLeafPaths.length; keyIndex += 1) {
      const leafPath = visibleLeafPaths[keyIndex];
      const pathKey = buildAutomationPresetLeafPathKey(leafPath);
      const input = details._jsonInputMap[pathKey];
      if (!input || document.activeElement === input) {
        continue;
      }
      const draftEntry = details._jsonDraftMap[pathKey];
      const valueToRender = draftEntry
        ? draftEntry.value
        : getAutomationPresetValueAtPath(preset, leafPath);
      const nextIncluded = !draftEntry || draftEntry.included !== false;
      if (input.disabled !== !nextIncluded) {
        input.disabled = !nextIncluded;
      }
      if (nextIncluded) {
        input.classList.remove('automation-preset-json-field-input-disabled');
      } else {
        input.classList.add('automation-preset-json-field-input-disabled');
      }
      if (input.tagName === 'SELECT') {
        const fieldOptions = fieldOptionsResolver ? fieldOptionsResolver(leafPath, valueToRender, effectivePreset) : null;
        if (fieldOptions && Array.isArray(fieldOptions.selectOptions) && fieldOptions.selectOptions.length) {
          syncAutomationSelectOptions(input, fieldOptions.selectOptions, String(valueToRender));
        } else {
          input.value = valueToRender ? 'true' : 'false';
        }
      } else {
        input.value = formatAutomationPresetJsonFieldValue(valueToRender);
        input.size = Math.max(1, input.value.length);
      }
    }
  }

  details._renderedPresetJson = presetSignature;
}

function createAutomationPresetTransferButtons(baseClassName) {
  const importButton = document.createElement('button');
  importButton.textContent = getAutomationCardText('importPresetButton', {}, 'Import');
  importButton.classList.add(`${baseClassName}-import`);

  const exportButton = document.createElement('button');
  exportButton.textContent = getAutomationCardText('exportPresetButton', {}, 'Export to clipboard');
  exportButton.classList.add(`${baseClassName}-export`);

  return { importButton, exportButton };
}

function automationItemShowsInSidebar(item) {
  return !!item && item.showInSidebar !== false;
}

function createAutomationShowInSidebarLabel(baseClassName) {
  const label = document.createElement('label');
  label.classList.add('automation-show-sidebar-label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.classList.add(`${baseClassName}-show-sidebar`);
  const text = document.createElement('span');
  text.textContent = getAutomationCardText('showInSidebarLabel', {}, 'Show in sidebar');
  label.append(checkbox, text);
  return { label, checkbox };
}

function buildAutomationPresetTransferPayload(automationType, preset) {
  return JSON.stringify({
    format: AUTOMATION_PRESET_TRANSFER_FORMAT,
    version: AUTOMATION_PRESET_TRANSFER_VERSION,
    automationType,
    preset
  }, null, 2);
}

function parseAutomationPresetTransferPayload(text, expectedType) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      error: getAutomationCardText('importPresetEmptyError', {}, 'Paste a preset string first.')
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      error: getAutomationCardText('importPresetInvalidJsonError', {}, 'That preset string is not valid JSON.')
    };
  }

  if (parsed && parsed.format === AUTOMATION_PRESET_TRANSFER_FORMAT) {
    if (parsed.automationType !== expectedType) {
      return {
        ok: false,
        error: getAutomationCardText('importPresetWrongTypeError', {}, 'That preset belongs to a different automation system.')
      };
    }
    return { ok: true, preset: parsed.preset || {} };
  }

  if (parsed && parsed.automationType && parsed.automationType !== expectedType) {
    return {
      ok: false,
      error: getAutomationCardText('importPresetWrongTypeError', {}, 'That preset belongs to a different automation system.')
    };
  }

  if (parsed && parsed.preset) {
    return { ok: true, preset: parsed.preset };
  }

  return { ok: true, preset: parsed };
}

function setAutomationTransferButtonFeedback(button, text) {
  if (!button) {
    return;
  }
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent || '';
  }
  button.textContent = text;
  if (button._feedbackTimeoutId) {
    window.clearTimeout(button._feedbackTimeoutId);
  }
  button._feedbackTimeoutId = window.setTimeout(() => {
    button.textContent = button.dataset.defaultText || '';
    button._feedbackTimeoutId = null;
  }, 1500);
}

function exportAutomationPresetToClipboard(automationType, preset, button) {
  if (!preset) {
    return;
  }
  const payload = buildAutomationPresetTransferPayload(automationType, preset);
  copyTextToClipboard(payload, {
    promptLabel: getAutomationCardText('exportPresetPrompt', {}, 'Copy preset string:'),
    onSuccess: () => {
      setAutomationTransferButtonFeedback(
        button,
        getAutomationCardText('exportPresetCopied', {}, 'Copied')
      );
    }
  });
}

function ensureAutomationPresetImportDialog() {
  if (automationPresetImportDialog) {
    return automationPresetImportDialog;
  }

  const overlay = document.createElement('div');
  overlay.classList.add('automation-import-dialog-overlay');

  const windowEl = document.createElement('div');
  windowEl.classList.add('automation-import-dialog-window');

  const title = document.createElement('h3');
  title.classList.add('automation-import-dialog-title');

  const description = document.createElement('p');
  description.classList.add('automation-import-dialog-description');

  const textarea = document.createElement('textarea');
  textarea.classList.add('automation-import-dialog-textarea');

  const message = document.createElement('div');
  message.classList.add('automation-import-dialog-message');

  const actions = document.createElement('div');
  actions.classList.add('automation-import-dialog-actions');

  const cancelButton = document.createElement('button');
  cancelButton.classList.add('automation-import-dialog-cancel');
  cancelButton.textContent = getAutomationCardText('cancelButton', {}, 'Cancel');

  const importButton = document.createElement('button');
  importButton.classList.add('automation-import-dialog-confirm');
  importButton.textContent = getAutomationCardText('importPresetButton', {}, 'Import');

  actions.append(cancelButton, importButton);
  windowEl.append(title, description, textarea, message, actions);
  overlay.appendChild(windowEl);
  document.body.appendChild(overlay);

  automationPresetImportDialog = {
    overlay,
    title,
    description,
    textarea,
    message,
    importButton,
    cancelButton,
    onImport: null
  };

  const closeDialog = () => {
    overlay.classList.remove('is-visible');
    message.textContent = '';
    textarea.value = '';
    automationPresetImportDialog.onImport = null;
  };

  cancelButton.addEventListener('click', closeDialog);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeDialog();
    }
  });
  importButton.addEventListener('click', () => {
    if (!automationPresetImportDialog.onImport) {
      return;
    }
    const result = automationPresetImportDialog.onImport(textarea.value);
    if (!result || result.ok === false) {
      message.textContent = result && result.error
        ? result.error
        : getAutomationCardText('importPresetFailed', {}, 'Could not import that preset.');
      return;
    }
    closeDialog();
  });

  return automationPresetImportDialog;
}

function openAutomationPresetImportDialog(options) {
  const dialog = ensureAutomationPresetImportDialog();
  dialog.title.textContent = options.title;
  dialog.description.textContent = options.description;
  dialog.importButton.textContent = options.importButtonText
    || getAutomationCardText('importPresetButton', {}, 'Import');
  dialog.message.textContent = '';
  dialog.textarea.value = '';
  dialog.onImport = options.onImport;
  dialog.overlay.classList.add('is-visible');
  dialog.textarea.focus();
}

function buildAutomationGlobalPayload() {
  const manager = automationManager;
  return JSON.stringify({
    format: 'terraforming-titans-all-automations',
    version: 1,
    autoTravel: manager.autoTravelAutomation ? manager.autoTravelAutomation.saveState() : null,
    lifeAutomation: manager.lifeAutomation ? manager.lifeAutomation.saveState() : null,
    spaceshipAutomation: manager.spaceshipAutomation ? manager.spaceshipAutomation.saveState() : null,
    scriptAutomation: manager.scriptAutomation ? manager.scriptAutomation.saveState() : null,
    buildingsAutomation: manager.buildingsAutomation ? manager.buildingsAutomation.saveState() : null,
    researchAutomation: manager.researchAutomation ? manager.researchAutomation.saveState() : null,
    projectsAutomation: manager.projectsAutomation ? manager.projectsAutomation.saveState() : null,
    colonyAutomation: manager.colonyAutomation ? manager.colonyAutomation.saveState() : null
  }, null, 2);
}

function exportAllAutomationsToClipboard(button) {
  const payload = buildAutomationGlobalPayload();
  copyTextToClipboard(payload, {
    promptLabel: getAutomationCardText('exportAllAutomationsPrompt', {}, 'Copy all automations string:'),
    onSuccess: () => {
      setAutomationTransferButtonFeedback(
        button,
        getAutomationCardText('exportPresetCopied', {}, 'Copied')
      );
    }
  });
}

function importAllAutomationsFromPayload(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      error: getAutomationCardText('importPresetEmptyError', {}, 'Paste a preset string first.')
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      error: getAutomationCardText('importPresetInvalidJsonError', {}, 'That preset string is not valid JSON.')
    };
  }
  if (!parsed || parsed.format !== 'terraforming-titans-all-automations') {
    return {
      ok: false,
      error: getAutomationCardText('importAllWrongFormatError', {}, 'That string is not a valid all-automations export.')
    };
  }
  const manager = automationManager;
  if (parsed.autoTravel && manager.autoTravelAutomation) {
    manager.autoTravelAutomation.loadState(parsed.autoTravel);
  }
  if (parsed.lifeAutomation && manager.lifeAutomation) {
    manager.lifeAutomation.loadState(parsed.lifeAutomation);
  }
  if (parsed.spaceshipAutomation && manager.spaceshipAutomation) {
    manager.spaceshipAutomation.loadState(parsed.spaceshipAutomation);
  }
  if (parsed.scriptAutomation && manager.scriptAutomation) {
    manager.scriptAutomation.loadState(parsed.scriptAutomation);
  }
  if (parsed.buildingsAutomation && manager.buildingsAutomation) {
    manager.buildingsAutomation.loadState(parsed.buildingsAutomation);
  }
  if (parsed.researchAutomation && manager.researchAutomation) {
    manager.researchAutomation.loadState(parsed.researchAutomation);
  }
  if (parsed.projectsAutomation && manager.projectsAutomation) {
    manager.projectsAutomation.loadState(parsed.projectsAutomation);
  }
  if (parsed.colonyAutomation && manager.colonyAutomation) {
    manager.colonyAutomation.loadState(parsed.colonyAutomation);
  }
  return { ok: true };
}

function buildAutomationGlobalToolbar() {
  const container = automationElements.container;
  if (!container) {
    return;
  }
  const toolbar = document.createElement('div');
  toolbar.classList.add('automation-global-toolbar');

  const exportButton = document.createElement('button');
  exportButton.textContent = getAutomationCardText('exportAllAutomationsButton', {}, 'Export All Automations');
  exportButton.classList.add('automation-global-export');
  exportButton.addEventListener('click', () => {
    exportAllAutomationsToClipboard(exportButton);
  });

  const importButton = document.createElement('button');
  importButton.textContent = getAutomationCardText('importAllAutomationsButton', {}, 'Import All Automations');
  importButton.classList.add('automation-global-import');
  importButton.addEventListener('click', () => {
    openAutomationPresetImportDialog({
      title: getAutomationCardText('importAllAutomationsTitle', {}, 'Import All Automations'),
      description: getAutomationCardText(
        'importAllAutomationsDescription',
        {},
        'Paste an exported all-automations string below.\nThis will replace all current automation settings.'
      ),
      importButtonText: getAutomationCardText('importAllAutomationsButton', {}, 'Import All Automations'),
      onImport: (text) => {
        const result = importAllAutomationsFromPayload(text);
        if (!result.ok) {
          return result;
        }
        queueAutomationUIRefresh();
        updateAutomationUI();
        return { ok: true };
      }
    });
  });

  toolbar.append(exportButton, importButton);
  container.insertBefore(toolbar, container.firstChild);
  automationElements.globalExportButton = exportButton;
  automationElements.globalImportButton = importButton;
}

function createAutomationPresetRow(body) {
  const presetRow = document.createElement('div');
  presetRow.classList.add('automation-preset-row');
  body.appendChild(presetRow);

  const presetSelect = document.createElement('select');
  presetSelect.classList.add('automation-preset-select');
  presetRow.appendChild(presetSelect);

  const presetOrderButtons = document.createElement('div');
  presetOrderButtons.classList.add('automation-order-buttons');
  const presetMoveUp = document.createElement('button');
  presetMoveUp.textContent = '↑';
  presetMoveUp.title = getAutomationCardText('movePresetUp', {}, 'Move preset up');
  presetMoveUp.classList.add('automation-preset-move-up');
  const presetMoveDown = document.createElement('button');
  presetMoveDown.textContent = '↓';
  presetMoveDown.title = getAutomationCardText('movePresetDown', {}, 'Move preset down');
  presetMoveDown.classList.add('automation-preset-move-down');
  presetOrderButtons.append(presetMoveUp, presetMoveDown);
  presetRow.appendChild(presetOrderButtons);

  const presetName = document.createElement('input');
  presetName.type = 'text';
  presetName.placeholder = getAutomationCardText('presetNamePlaceholder', {}, 'Preset name');
  presetName.classList.add('automation-preset-name');
  presetRow.appendChild(presetName);

  const enableToggle = createAutomationToggle(
    getAutomationCardText('presetOn', {}, 'Preset On'),
    getAutomationCardText('presetOff', {}, 'Preset Off')
  );
  enableToggle.classList.add('automation-preset-toggle');
  presetRow.appendChild(enableToggle);

  const showSidebar = createAutomationShowInSidebarLabel('automation-preset');
  presetRow.appendChild(showSidebar.label);

  const presetButtons = document.createElement('div');
  presetButtons.classList.add('automation-preset-buttons');
  const newPreset = document.createElement('button');
  newPreset.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  newPreset.classList.add('automation-preset-new');
  const deletePreset = document.createElement('button');
  deletePreset.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deletePreset.classList.add('automation-preset-delete');
  const duplicatePreset = document.createElement('button');
  duplicatePreset.textContent = getAutomationCardText('duplicatePresetButton', {}, 'Duplicate');
  duplicatePreset.classList.add('automation-preset-duplicate');
  presetButtons.append(newPreset, duplicatePreset, deletePreset);
  presetRow.appendChild(presetButtons);

  const presetUsage = createAutomationPresetUsageLine();
  body.appendChild(presetUsage);

  return {
    presetRow,
    presetSelect,
    presetUsage,
    presetMoveUp,
    presetMoveDown,
    presetName,
    enableCheckbox: enableToggle,
    showInSidebarCheckbox: showSidebar.checkbox,
    newPreset,
    duplicatePreset,
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
  if (isCurrentWorldSubtabDisabled('automation-hope')) {
    hideAutomationTab();
    return;
  }
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
  buildAutomationGlobalToolbar();
  buildAutoTravelUI();
  buildScriptAutomationUI();
  buildAutomationShipUI();
  buildAutomationLifeUI();
  buildAutomationResearchUI();
  buildAutomationBuildingsUI();
  buildAutomationProjectsUI();
  buildAutomationColonyUI();
  hideAutomationTab();
  automationUIInitialized = true;
  automationUIStale = true;
  updateAutomationUI();
}

function updateAutomationVisibility() {
  cacheAutomationElements();
  const managerEnabled = !!(automationManager && automationManager.enabled);
  updateSidebarAutomationToggleVisibility();
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
  cacheAutomationElements();
  const panelActive = !!(automationElements.content && automationElements.content.classList.contains('active'));
  const sidebarActive = typeof sidebarAutomationMode !== 'undefined' && sidebarAutomationMode === true;
  const panelJustActivated = panelActive && !automationPanelWasActive;
  automationPanelWasActive = panelActive;
  if (panelJustActivated) {
    automationUIStale = true;
  }
  if (!automationUIStale) {
    if (panelActive) {
      updateScriptAutomationUI();
    }
    return;
  }
  if (!panelActive && !sidebarActive) {
    return;
  }
  automationUIStale = false;
  if (panelActive) {
    updateAutoTravelUI();
    updateScriptAutomationUI();
    updateShipAutomationUI();
    updateLifeAutomationUI();
    updateResearchAutomationUI();
    updateBuildingsAutomationUI();
    updateProjectsAutomationUI();
    updateColonyAutomationUI();
    applyAutomationCardOrder();
    updateAutomationCardOrderControls();
  }
  if (sidebarActive && !updateSidebarAutomationUI()) {
    automationUIStale = true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeAutomationUI, updateAutomationVisibility, updateAutomationUI, queueAutomationUIRefresh };
}
