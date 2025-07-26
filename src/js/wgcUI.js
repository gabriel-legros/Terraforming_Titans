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

function generateWGCTeamCards() {
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  return names.map(name => `
    <div class="wgc-team-card">
      <div class="team-header">Team ${name}</div>
      <div class="wgc-team-body">
        <div class="team-slots">
          <div class="team-slot"><button>+</button></div>
          <div class="team-slot"><button>+</button></div>
          <div class="team-slot"><button>+</button></div>
          <div class="team-slot"><button>+</button></div>
        </div>
        <div class="team-controls">
          <button>Start</button>
          <button>Recall</button>
        </div>
      </div>
    </div>
  `).join('');
}

function generateWGCLayout() {
  return `
    <div class="wgc-container">
      <div class="wgc-main">
        <div id="wgc-rd-section">
          <h3>R&amp;D</h3>
          <div id="wgc-rd-menu"></div>
        </div>
        <div id="wgc-teams-section">
          <h3>Teams</h3>
          <div id="wgc-team-cards"></div>
        </div>
      </div>
    </div>
  `;
}

function initializeWGCUI() {
  if (wgcUIInitialized) return;
  hideWGCTab();
  const container = document.getElementById('wgc-hope');
  if (container) {
    container.innerHTML = generateWGCLayout();
    const teamContainer = container.querySelector('#wgc-team-cards');
    if (teamContainer) {
      teamContainer.innerHTML = generateWGCTeamCards();
    }
  }
  wgcUIInitialized = true;
}

function updateWGCUI() {
  // future UI updates
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hideWGCTab,
    showWGCTab,
    updateWGCVisibility,
    initializeWGCUI,
    updateWGCUI,
    generateWGCTeamCards,
    generateWGCLayout,
  };
}
