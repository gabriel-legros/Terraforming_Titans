let automationTabVisible = false;
let automationUIInitialized = false;
let automationUIStale = true;
const automationElements = {
  tab: null,
  content: null,
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
  scriptStatusLine: null,
  scriptSelect: null,
  scriptNameInput: null,
  scriptNewButton: null,
  scriptDuplicateButton: null,
  scriptDeleteButton: null,
  scriptLinesContainer: null,
  scriptAddLineButton: null,
  shipAssignment: null,
  shipAssignmentStatus: null,
  shipAssignmentDescription: null,
  collapseButton: null,
  panelBody: null,
  presetSelect: null,
  presetMoveUpButton: null,
  presetMoveDownButton: null,
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
  lifePresetMoveUpButton: null,
  lifePresetMoveDownButton: null,
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
  researchDeletePresetButton: null,
  researchImportPresetButton: null,
  researchExportPresetButton: null,
  researchApplyOnceButton: null,
  researchApplyNextTravelSelect: null,
  researchApplyNextTravelPersistToggle: null,
  researchPresetJsonDetails: null,
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
  buildingsBuilderDeleteButton: null,
  buildingsBuilderImportButton: null,
  buildingsBuilderExportButton: null,
  buildingsBuilderApplyOnceButton: null,
  buildingsBuilderTypeSelect: null,
  buildingsBuilderScopeSelect: null,
  buildingsBuilderCategorySelect: null,
  buildingsBuilderBuildingSelect: null,
  buildingsBuilderAddButton: null,
  buildingsBuilderAddCategoryButton: null,
  buildingsBuilderClearButton: null,
  buildingsBuilderSelectedList: null,
  buildingsPresetJsonDetails: null,
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
  projectsBuilderDeleteButton: null,
  projectsBuilderImportButton: null,
  projectsBuilderExportButton: null,
  projectsBuilderApplyOnceButton: null,
  projectsBuilderScopeSelect: null,
  projectsBuilderCategorySelect: null,
  projectsBuilderProjectSelect: null,
  projectsBuilderAddButton: null,
  projectsBuilderAddCategoryButton: null,
  projectsBuilderClearButton: null,
  projectsBuilderSelectedList: null,
  projectsPresetJsonDetails: null,
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
  colonyBuilderDeleteButton: null,
  colonyBuilderImportButton: null,
  colonyBuilderExportButton: null,
  colonyBuilderApplyOnceButton: null,
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
  colonyAddApplyButton: null
};

const AUTOMATION_PRESET_TRANSFER_FORMAT = 'terraforming-titans-automation-preset';
const AUTOMATION_PRESET_TRANSFER_VERSION = 1;
let automationPresetImportDialog = null;

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
  if (!automationElements.scriptAutomation) {
    automationElements.scriptAutomation = document.getElementById('automation-scripts');
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
  return { collapse, titleGroup, title };
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
  details.appendChild(summary);

  const pre = document.createElement('pre');
  pre.classList.add('automation-preset-json-content');
  details.appendChild(pre);

  details._summaryNode = summary;
  details._contentNode = pre;
  details._renderedSummaryText = '';
  details._renderedPresetJson = '';
  details.style.display = 'none';
  return details;
}

function updateAutomationPresetJsonDetails(details, preset) {
  if (!details) {
    return;
  }

  if (!preset) {
    details.open = false;
    details.style.display = 'none';
    if (details._renderedSummaryText) {
      details._summaryNode.textContent = '';
      details._renderedSummaryText = '';
    }
    if (details._renderedPresetJson) {
      details._contentNode.textContent = '';
      details._renderedPresetJson = '';
    }
    return;
  }

  details.style.display = '';
  const summaryText = getAutomationCardText(
    'selectedPresetJsonSummary',
    { name: preset.name || `Preset ${preset.id}` },
    'Selected preset JSON'
  );
  if (details._renderedSummaryText !== summaryText) {
    details._summaryNode.textContent = summaryText;
    details._renderedSummaryText = summaryText;
  }

  const presetJson = JSON.stringify(preset, null, 2);
  if (details._renderedPresetJson !== presetJson) {
    details._contentNode.textContent = presetJson;
    details._renderedPresetJson = presetJson;
  }
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
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0, 0, 0, 0.6)';
  overlay.style.display = 'none';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '6000';

  const windowEl = document.createElement('div');
  windowEl.style.width = 'min(720px, calc(100vw - 32px))';
  windowEl.style.maxHeight = 'calc(100vh - 32px)';
  windowEl.style.overflow = 'auto';
  windowEl.style.background = '#1f1f1f';
  windowEl.style.color = '#f0f0f0';
  windowEl.style.border = '1px solid rgba(255, 255, 255, 0.18)';
  windowEl.style.borderRadius = '10px';
  windowEl.style.padding = '16px';
  windowEl.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.45)';

  const title = document.createElement('h3');
  title.style.margin = '0 0 8px';
  title.style.fontSize = '18px';

  const description = document.createElement('p');
  description.style.margin = '0 0 12px';
  description.style.whiteSpace = 'pre-line';

  const textarea = document.createElement('textarea');
  textarea.style.width = '100%';
  textarea.style.minHeight = '240px';
  textarea.style.resize = 'vertical';
  textarea.style.boxSizing = 'border-box';
  textarea.style.marginBottom = '8px';

  const message = document.createElement('div');
  message.style.minHeight = '20px';
  message.style.marginBottom = '12px';
  message.style.color = '#ff9a9a';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';

  const cancelButton = document.createElement('button');
  cancelButton.textContent = getAutomationCardText('cancelButton', {}, 'Cancel');

  const importButton = document.createElement('button');
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
    overlay.style.display = 'none';
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
  dialog.overlay.style.display = 'flex';
  dialog.textarea.focus();
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

  const presetButtons = document.createElement('div');
  presetButtons.classList.add('automation-preset-buttons');
  const newPreset = document.createElement('button');
  newPreset.textContent = getAutomationCardText('addPresetButton', {}, '+ Preset');
  newPreset.classList.add('automation-preset-new');
  const deletePreset = document.createElement('button');
  deletePreset.textContent = getAutomationCardText('deletePresetButton', {}, 'Delete');
  deletePreset.classList.add('automation-preset-delete');
  presetButtons.append(newPreset, deletePreset);
  presetRow.appendChild(presetButtons);

  return {
    presetRow,
    presetSelect,
    presetMoveUp,
    presetMoveDown,
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
  if (!automationUIStale) return;
  cacheAutomationElements();
  const panelActive = !!(automationElements.content && automationElements.content.classList.contains('active'));
  const sidebarActive = typeof sidebarAutomationMode !== 'undefined' && sidebarAutomationMode === true;
  if (!panelActive && !sidebarActive) {
    return;
  }
  automationUIStale = false;
  if (panelActive) {
    updateScriptAutomationUI();
    updateShipAutomationUI();
    updateLifeAutomationUI();
    updateResearchAutomationUI();
    updateBuildingsAutomationUI();
    updateProjectsAutomationUI();
    updateColonyAutomationUI();
  }
  if (sidebarActive && !updateSidebarAutomationUI()) {
    automationUIStale = true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeAutomationUI, updateAutomationVisibility, updateAutomationUI, queueAutomationUIRefresh };
}
