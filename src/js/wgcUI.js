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
const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const classImages = {
  'Team Leader': 'assets/images/team_leader.png',
  'Soldier': 'assets/images/soldier.png',
  'Natural Scientist': 'assets/images/natural_scientist.png',
  'Social Scientist': 'assets/images/social_scientist.png'
};
let activeDialog = null;

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
  return teamNames.map((name, tIdx) => {
    const slots = (typeof warpGateCommand !== 'undefined' && warpGateCommand.teams[tIdx]) ? warpGateCommand.teams[tIdx] : [null, null, null, null];
    const slotMarkup = slots.map((m, sIdx) => {
      if (m) {
        const img = classImages[m.classType] || '';
        return `<div class="team-slot" data-team="${tIdx}" data-slot="${sIdx}">
          <img src="${img}" class="team-icon">
          <span class="edit-icon" data-team="${tIdx}" data-slot="${sIdx}">✎</span>
        </div>`;
      }
      return `<div class="team-slot" data-team="${tIdx}" data-slot="${sIdx}"><button>+</button></div>`;
    }).join('');
    return `
      <div class="wgc-team-card">
        <div class="team-header">Team ${name}</div>
        <div class="wgc-team-body">
          <div class="team-slots">${slotMarkup}</div>
          <div class="team-controls">
            <button>Start</button>
            <button>Recall</button>
          </div>
        </div>
      </div>`;
  }).join('');
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

function createRDHeader() {
  const div = document.createElement('div');
  div.classList.add('wgc-rd-item', 'wgc-rd-header');

  const label = document.createElement('span');
  label.classList.add('wgc-rd-label');
  label.textContent = 'Upgrade';
  div.appendChild(label);

  div.appendChild(document.createElement('span'));

  const spacer = document.createElement('span');
  spacer.style.marginLeft = 'auto';
  div.appendChild(spacer);

  const cost = document.createElement('span');
  cost.textContent = 'Cost (Alien Artifacts)';
  div.appendChild(cost);

  div.appendChild(document.createElement('span'));

  return div;
}

function populateRDMenu() {
  const menu = document.getElementById('wgc-rd-menu');
  if (!menu) return;
  menu.innerHTML = '';
  menu.appendChild(createRDHeader());
  for (const key in rdItems) {
    menu.appendChild(createRDItem(key, rdItems[key]));
  }
}

function closeRecruitDialog() {
  if (activeDialog && activeDialog.parentElement) {
    document.body.removeChild(activeDialog);
    activeDialog = null;
  }
}

function openRecruitDialog(teamIndex, slotIndex, member) {
  closeRecruitDialog();
  const overlay = document.createElement('div');
  overlay.classList.add('popup-overlay');

  const win = document.createElement('div');
  win.classList.add('popup-window');

  const title = document.createElement('h2');
  title.textContent = member ? 'Edit Member' : 'Recruit Member';
  win.appendChild(title);

  const nameField = document.createElement('input');
  nameField.type = 'text';
  nameField.placeholder = 'Name';
  nameField.value = member ? member.name : '';
  win.appendChild(nameField);

  const classSelect = document.createElement('select');
  ['Team Leader', 'Soldier', 'Natural Scientist', 'Social Scientist'].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });
  if (member) classSelect.value = member.classType;
  if (slotIndex === 0) {
    classSelect.value = 'Team Leader';
    classSelect.disabled = true;
  }
  win.appendChild(classSelect);

  const level = document.createElement('div');
  level.textContent = 'Level: 1';
  win.appendChild(level);

  const alloc = { power: 0, stamina: 0, wit: 0 };
  const remainingSpan = document.createElement('div');
  remainingSpan.textContent = 'Points left: 5';

  const statsDiv = document.createElement('div');
  ['power','stamina','wit'].forEach(stat => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.max = 5;
    input.value = member ? member[stat] - WGCTeamMember.getBaseStats(member.classType)[stat] : 0;
    label.textContent = stat.charAt(0).toUpperCase() + stat.slice(1) + ': ';
    label.appendChild(input);
    input.addEventListener('input', () => {
      alloc[stat] = parseInt(input.value) || 0;
      const total = alloc.power + alloc.stamina + alloc.wit;
      if (total > 5) {
        alloc[stat] -= (total - 5);
        input.value = alloc[stat];
      }
      remainingSpan.textContent = `Points left: ${5 - (alloc.power + alloc.stamina + alloc.wit)}`;
    });
    if (member) input.disabled = true;
    statsDiv.appendChild(label);
  });
  win.appendChild(statsDiv);
  win.appendChild(remainingSpan);

  const confirm = document.createElement('button');
  confirm.textContent = 'Confirm';
  confirm.addEventListener('click', () => {
    if (!nameField.value.trim()) return;
    if (member) {
      warpGateCommand.renameMember(teamIndex, slotIndex, nameField.value.trim());
    } else {
      const m = WGCTeamMember.create(nameField.value.trim(), classSelect.value, alloc);
      warpGateCommand.recruitMember(teamIndex, slotIndex, m);
    }
    closeRecruitDialog();
    updateWGCUI();
  });
  win.appendChild(confirm);

  if (member) {
    const dismiss = document.createElement('button');
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => {
      warpGateCommand.dismissMember(teamIndex, slotIndex);
      closeRecruitDialog();
      updateWGCUI();
    });
    win.appendChild(dismiss);
  }

  overlay.appendChild(win);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeRecruitDialog(); });
  document.body.appendChild(overlay);
  activeDialog = overlay;
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
      teamContainer.addEventListener('click', e => {
        const target = e.target instanceof Element ? e.target : e.target.parentElement;
        const btn = target && target.closest ? target.closest('button') : null;
        const edit = e.target.classList.contains('edit-icon');
        if (btn && btn.parentElement.classList.contains('team-slot')) {
          const slot = btn.parentElement;
          const t = parseInt(slot.dataset.team, 10);
          const s = parseInt(slot.dataset.slot, 10);
          openRecruitDialog(t, s, null);
        } else if (edit) {
          const t = parseInt(e.target.dataset.team, 10);
          const s = parseInt(e.target.dataset.slot, 10);
          const member = warpGateCommand.teams[t][s];
          openRecruitDialog(t, s, member);
        }
      });
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
  const teamContainer = document.getElementById('wgc-team-cards');
  if (teamContainer) {
    teamContainer.innerHTML = generateWGCTeamCards();
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
