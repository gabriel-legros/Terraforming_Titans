let automationTabVisible = false;
let automationUIInitialized = false;
const automationElements = {
  tab: null,
  content: null,
  shipAssignment: null,
  shipAssignmentStatus: null,
  shipAssignmentDescription: null
};

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
  hideAutomationTab();
  automationUIInitialized = true;
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
  cacheAutomationElements();
  const { shipAssignment, shipAssignmentStatus, shipAssignmentDescription } = automationElements;
  const manager = automationManager;
  if (!manager || !shipAssignment || !shipAssignmentStatus || !shipAssignmentDescription) {
    return;
  }
  const unlocked = manager.hasFeature('automationShipAssignment');
  shipAssignment.classList.toggle('automation-card-locked', !unlocked);
  shipAssignmentStatus.textContent = unlocked ? 'Ready' : 'Locked';
  shipAssignmentDescription.textContent = unlocked
    ? 'Automatically assigns cargo ships based on available routes.'
    : 'Purchase the Solis Ship Assignment upgrade to enable ship automation.';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeAutomationUI, updateAutomationVisibility, updateAutomationUI };
}
