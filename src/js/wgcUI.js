let wgcTabVisible = false;
let wgcUIInitialized = false;
const rdItems = {
  wgtEquipment: 'Warpgate Teams Equipment',
  componentsEfficiency: 'Components production efficiency',
  electronicsEfficiency: 'Electronics production efficiency',
  superconductorEfficiency: 'Superconductor production efficiency',
  androidsEfficiency: 'Androids production efficiency'
};
const rdElements = {};

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

function createRDItem(key, label) {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item');

  const nameSpan = document.createElement('span');
  nameSpan.classList.add('wgc-rd-label');
  nameSpan.textContent = label;
  div.appendChild(nameSpan);

  const multSpan = document.createElement('span');
  multSpan.id = `wgc-${key}-mult`;
  div.appendChild(multSpan);

  const button = document.createElement('button');
  button.id = `wgc-${key}-button`;
  button.textContent = 'Buy';
  button.addEventListener('click', () => {
    warpGateCommand.purchaseUpgrade(key);
    updateWGCUI();
  });
  div.appendChild(button);

  const costSpan = document.createElement('span');
  costSpan.id = `wgc-${key}-cost`;
  div.appendChild(costSpan);

  const countSpan = document.createElement('span');
  countSpan.id = `wgc-${key}-count`;
  div.appendChild(countSpan);

  rdElements[key] = { button, cost: costSpan, count: countSpan, mult: multSpan };
  return div;
}

function populateRDMenu() {
  const menu = document.getElementById('wgc-rd-menu');
  if (!menu) return;
  menu.innerHTML = '';
  for (const key in rdItems) {
    menu.appendChild(createRDItem(key, rdItems[key]));
  }
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
    populateRDMenu();
  }
  wgcUIInitialized = true;
}

function updateWGCUI() {
  for (const key in rdElements) {
    const el = rdElements[key];
    if (!el) continue;
    if (el.cost) el.cost.textContent = warpGateCommand.getUpgradeCost(key);
    if (el.count) el.count.textContent = warpGateCommand.rdUpgrades[key].purchases;
    if (el.mult && key !== 'wgtEquipment') {
      el.mult.textContent = `x${warpGateCommand.getMultiplier(key).toFixed(2)}`;
    } else if (el.mult) {
      el.mult.textContent = '';
    }
    if (el.button) {
      const art = (typeof resources !== 'undefined' && resources.special && resources.special.alienArtifact) ? resources.special.alienArtifact.value : 0;
      el.button.disabled = warpGateCommand.getUpgradeCost(key) > art ||
        (warpGateCommand.rdUpgrades[key].max && warpGateCommand.rdUpgrades[key].purchases >= warpGateCommand.rdUpgrades[key].max);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hideWGCTab,
    showWGCTab,
    updateWGCVisibility,
    initializeWGCUI,
    updateWGCUI,
    populateRDMenu,
    generateWGCTeamCards,
    generateWGCLayout,
  };
}
