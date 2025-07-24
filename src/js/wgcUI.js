let wgcTabVisible = false;
let wgcUIInitialized = false;

function showWGCTab() {
  wgcTabVisible = true;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.remove('hidden');
  if (content) content.classList.remove('hidden');
}

function hideWGCTab() {
  wgcTabVisible = false;
  const tab = document.querySelector('.hope-subtab[data-subtab="wgc-hope"]');
  const content = document.getElementById('wgc-hope');
  if (tab) tab.classList.add('hidden');
  if (content) content.classList.add('hidden');
}

function updateWGCVisibility() {
  if (typeof warpGateCommand === 'undefined') return;
  if (warpGateCommand.enabled) {
    if (!wgcTabVisible) showWGCTab();
  } else if (wgcTabVisible) {
    hideWGCTab();
  }
}

function initializeWGCUI() {
  if (wgcUIInitialized) return;
  hideWGCTab();
  wgcUIInitialized = true;
}

function updateWGCUI() {
  // future UI updates
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideWGCTab, showWGCTab, updateWGCVisibility };
}
